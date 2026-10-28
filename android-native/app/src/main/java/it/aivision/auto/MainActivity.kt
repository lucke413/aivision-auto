package it.aivision.auto

import android.Manifest
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.app.Activity
import android.app.AlertDialog
import android.content.res.Configuration
import android.content.Intent
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.graphics.Color
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Build
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.view.Gravity
import android.view.View
import android.widget.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors

class MainActivity : Activity(), TextToSpeech.OnInitListener {
    private val bg = Color.rgb(6, 16, 30)
    private val panel = Color.rgb(14, 31, 50)
    private val blue = Color.rgb(75, 156, 255)
    private val white = Color.rgb(243, 247, 252)
    private val muted = Color.rgb(163, 180, 201)
    private val worker = Executors.newSingleThreadExecutor()
    private lateinit var clock: TextView
    private lateinit var date: TextView
    private lateinit var weather: TextView
    private lateinit var response: TextView
    private lateinit var cityLabel: TextView
    private var tts: TextToSpeech? = null
    private var recognizer: SpeechRecognizer? = null
    private var defaultNetworkCallback: ConnectivityManager.NetworkCallback? = null
    @Volatile private var networkWasUnavailable = false
    private val prefs by lazy { getSharedPreferences("aivision-auto", MODE_PRIVATE) }
    private val city get() = prefs.getString("city", "Novara") ?: "Novara"
    private val home get() = prefs.getString("home", "") ?: ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.statusBarColor = bg
        window.navigationBarColor = bg
        tts = TextToSpeech(this, this)

        val scroll = ScrollView(this).apply {
            setBackgroundColor(bg)
            isFillViewport = true
            clipToPadding = false
        }
        val wide = resources.configuration.orientation == Configuration.ORIENTATION_LANDSCAPE &&
            resources.configuration.screenWidthDp >= 600
        val root = LinearLayout(this).apply {
            orientation = if (wide) LinearLayout.HORIZONTAL else LinearLayout.VERTICAL
            setPadding(dp(14), dp(10), dp(14), dp(16))
        }
        scroll.addView(root)
        setContentView(scroll)

        val dashboard = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        val controls = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        if (wide) {
            dashboard.setPadding(0, 0, dp(8), 0)
            controls.setPadding(dp(8), 0, 0, 0)
            root.addView(dashboard, LinearLayout.LayoutParams(0, -2, 0.96f))
            root.addView(controls, LinearLayout.LayoutParams(0, -2, 1.04f))
        } else {
            root.addView(dashboard, LinearLayout.LayoutParams(-1, -2))
            root.addView(controls, LinearLayout.LayoutParams(-1, -2))
        }

        val header = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(0, dp(2), 0, dp(4))
        }
        val brand = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        brand.addView(label("✦ AIVISION", 23f, white, true))
        brand.addView(label("IL TUO CO-PILOTA DIGITALE", 10f, muted, true))
        header.addView(brand, LinearLayout.LayoutParams(0, -2, 1f))
        header.addView(label("NATIVE BETA", 10f, blue, true).apply {
            setPadding(dp(10), dp(7), dp(10), dp(7))
            background = roundedBackground(Color.rgb(18, 49, 81), 14)
        })
        dashboard.addView(header)

        val hero = card(dashboard)
        hero.addView(label("LA TUA PLANCIA", 10f, blue, true))
        clock = label("--:--", 58f, white, true).apply {
            includeFontPadding = false
            setPadding(0, dp(2), 0, 0)
        }
        date = label("Preparazione…", 15f, muted)
        hero.addView(clock)
        hero.addView(date)
        hero.addView(space(14))
        val weatherLine = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
        }
        val weatherTexts = LinearLayout(this).apply { orientation = LinearLayout.VERTICAL }
        cityLabel = label("METEO · $city", 11f, muted, true)
        weather = label("Controllo previsioni…", 17f, white, true)
        weatherTexts.addView(cityLabel)
        weatherTexts.addView(weather)
        weatherLine.addView(weatherTexts, LinearLayout.LayoutParams(0, -2, 1f))
        weatherLine.addView(actionButton("↻  Meteo", true) { loadWeather(false) })
        hero.addView(weatherLine)
        hero.addView(actionButton("⚙  Imposta città", true) { chooseCity() })

        val voice = card(controls)
        voice.addView(label("ASSISTENTE VOCALE", 11f, blue, true))
        voice.addView(label("Comanda a voce: navigazione, meteo, ricerche e posizione.", 14f, muted))
        val voiceButton = actionButton("🎙   PARLA CON AIVISION") { startListening() }.apply {
            textSize = 17f
            minHeight = dp(68)
            background = roundedBackground(Color.rgb(23, 99, 170), 18)
        }
        voice.addView(voiceButton)
        response = label("Pronto. Tocca il microfono oppure scegli un comando qui sotto.", 14f, white).apply {
            setPadding(dp(12), dp(12), dp(12), dp(12))
            background = roundedBackground(Color.rgb(9, 24, 40), 14)
        }
        voice.addView(space(5))
        voice.addView(response)

        controls.addView(label("COMANDI RAPIDI", 12f, muted, true).apply {
            setPadding(dp(2), dp(8), 0, dp(4))
        })
        val actions = listOf<Pair<String, () -> Unit>>(
            "🧭  Naviga" to { askDestination() },
            "🏠  Vai a Casa" to { if (home.isBlank()) chooseHome() else navigate(home) },
            "⛽  Carburante" to { mapsSearch("distributore carburante vicino a me") },
            "🅿️  Parcheggi" to { mapsSearch("parcheggio vicino a me") },
            "💊  Farmacie" to { mapsSearch("farmacia vicino a me") },
            "📍  Dove sono" to { locateMe() },
            "🔎  Cerca sul web" to { askSearch() },
            "🏡  Imposta Casa" to { chooseHome() }
        )
        actions.chunked(2).forEach { pair ->
            val line = LinearLayout(this).apply {
                orientation = LinearLayout.HORIZONTAL
                gravity = Gravity.CENTER_VERTICAL
            }
            pair.forEach { item ->
                val button = actionButton(item.first, true, item.second).apply {
                    textSize = 14f
                    minHeight = dp(66)
                    gravity = Gravity.CENTER
                }
                val lp = LinearLayout.LayoutParams(0, dp(70), 1f)
                lp.setMargins(dp(4), dp(4), dp(4), dp(4))
                line.addView(button, lp)
            }
            controls.addView(line)
        }
        controls.addView(label(
            "Offline-first · i dati online si aggiornano quando Internet è disponibile.\nConfigura tutto prima di partire; durante la guida usa soprattutto la voce.",
            10f, muted
        ).apply {
            gravity = Gravity.CENTER
            setPadding(dp(8), dp(18), dp(8), 0)
        })

        updateClock()
        window.decorView.post(object : Runnable {
            override fun run() {
                if (isFinishing) return
                updateClock()
                window.decorView.postDelayed(this, 30_000)
            }
        })
        monitorConnectivity()
        loadWeather(false)
    }

    /** Android selects Wi-Fi or mobile data automatically when that network is enabled by the user. */
    private fun monitorConnectivity() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return
        val manager = getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager
        val active = manager.activeNetwork
        val activeCaps = active?.let { manager.getNetworkCapabilities(it) }
        networkWasUnavailable = activeCaps == null || !activeCaps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onLost(network: Network) {
                val current = manager.activeNetwork
                val caps = current?.let { manager.getNetworkCapabilities(it) }
                if (caps == null || !caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) {
                    networkWasUnavailable = true
                }
            }
            override fun onAvailable(network: Network) {
                val caps = manager.getNetworkCapabilities(network)
                if (caps?.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) == true && networkWasUnavailable) {
                    networkWasUnavailable = false
                    runOnUiThread {
                        if (!isFinishing) {
                            response.text = "Connessione Internet disponibile: aggiorno automaticamente i dati online."
                            loadWeather(false)
                        }
                    }
                }
            }
        }
        defaultNetworkCallback = callback
        try { manager.registerDefaultNetworkCallback(callback) }
        catch (_: Exception) { defaultNetworkCallback = null }
    }

    private fun label(value: String, size: Float, color: Int, bold: Boolean = false) = TextView(this).apply {
        text = value; textSize = size; setTextColor(color); setPadding(0, dp(5), 0, dp(5))
        if (bold) setTypeface(typeface, Typeface.BOLD)
    }
    private fun roundedBackground(color: Int, radiusDp: Int) = GradientDrawable().apply {
        shape = GradientDrawable.RECTANGLE
        setColor(color)
        cornerRadius = dp(radiusDp).toFloat()
    }
    private fun card(root: LinearLayout) = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(16), dp(16), dp(16), dp(16))
        background = roundedBackground(panel, 22)
        elevation = dp(2).toFloat()
        val lp = LinearLayout.LayoutParams(-1, -2)
        lp.setMargins(0, dp(8), 0, dp(8))
        root.addView(this, lp)
    }
    private fun actionButton(value: String, small: Boolean = false, action: () -> Unit) = Button(this).apply {
        text = value
        textSize = if (small) 13f else 15f
        isAllCaps = false
        setTextColor(white)
        setPadding(dp(12), dp(8), dp(12), dp(8))
        minHeight = dp(if (small) 56 else 60)
        background = roundedBackground(
            if (small) Color.rgb(24, 53, 80) else Color.rgb(24, 82, 139),
            if (small) 16 else 18
        )
        setOnClickListener { action() }
    }
    private fun space(height: Int) = View(this).apply { layoutParams = LinearLayout.LayoutParams(1, dp(height)) }
    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
    private fun updateClock() {
        val now = Date()
        clock.text = SimpleDateFormat("HH:mm", Locale.ITALY).format(now)
        date.text = SimpleDateFormat("EEEE d MMMM", Locale.ITALY).format(now).replaceFirstChar { it.uppercase(Locale.ITALY) }
    }
    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val result = tts?.setLanguage(Locale.ITALIAN)
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                if (::response.isInitialized) response.text = "Installa una voce italiana nelle impostazioni vocali Android."
            }
        }
    }
    private fun speak(value: String) { tts?.speak(value, TextToSpeech.QUEUE_FLUSH, null, "aivision-" + System.currentTimeMillis()) }
    private fun respond(value: String, vocal: Boolean = true) {
        runOnUiThread { response.text = value; if (vocal) speak(value) }
    }
    private fun startListening(forceOnline: Boolean = false, allowOnlineFallback: Boolean = true) {
        if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), 41); return
        }
        if (!SpeechRecognizer.isRecognitionAvailable(this)) { respond("Servizio vocale non disponibile. Usa i pulsanti sullo schermo."); return }
        stopListening()
        try {
            val onDevice = !forceOnline && Build.VERSION.SDK_INT >= 31 && SpeechRecognizer.isOnDeviceRecognitionAvailable(this)
            recognizer = if (onDevice) SpeechRecognizer.createOnDeviceSpeechRecognizer(this) else SpeechRecognizer.createSpeechRecognizer(this)
            recognizer?.setRecognitionListener(object : RecognitionListener {
                override fun onReadyForSpeech(params: Bundle?) { respond(if (onDevice) "Ti ascolto. Riconoscimento sul dispositivo." else "Ti ascolto. Il servizio vocale potrebbe richiedere Internet.", false) }
                override fun onBeginningOfSpeech() {}
                override fun onRmsChanged(rmsdB: Float) {}
                override fun onBufferReceived(buffer: ByteArray?) {}
                override fun onEndOfSpeech() {}
                override fun onError(error: Int) {
                    stopListening()
                    if (onDevice && allowOnlineFallback) {
                        respond("Il riconoscimento locale non è riuscito. Provo automaticamente con il servizio vocale online: ripeti la frase.", false)
                        startListening(forceOnline = true, allowOnlineFallback = false)
                    } else {
                        respond("Non sono riuscito a riconoscere la frase. Riprova con una frase breve.", false)
                    }
                }
                override fun onResults(results: Bundle?) {
                    val spoken = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull().orEmpty()
                    stopListening()
                    if (spoken.isBlank()) respond("Non ho ricevuto una frase. Riprova.", false) else handleCommand(spoken)
                }
                override fun onPartialResults(partialResults: Bundle?) {}
                override fun onEvent(eventType: Int, params: Bundle?) {}
            })
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, "it-IT")
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "it-IT")
                putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false)
                putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, !forceOnline)
            }
            recognizer?.startListening(intent)
        } catch (_: Exception) {
            respond("Non riesco ad avviare il microfono. Verifica il servizio vocale Android."); stopListening()
        }
    }
    private fun stopListening() {
        try { recognizer?.cancel() } catch (_: Exception) {}
        try { recognizer?.destroy() } catch (_: Exception) {}
        recognizer = null
    }
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 41 && grantResults.firstOrNull() == PackageManager.PERMISSION_GRANTED) startListening()
        else if (requestCode == 41) respond("Senza il permesso microfono non posso ascoltare.", false)
        else if (requestCode == 42 && grantResults.any { it == PackageManager.PERMISSION_GRANTED }) locateMe()
        else if (requestCode == 42) respond("Senza il permesso posizione non posso localizzarti.", false)
    }
    private fun normalize(value: String) = value.lowercase(Locale.ITALIAN)
        .replace("à", "a").replace("è", "e").replace("é", "e").replace("ì", "i").replace("ò", "o").replace("ù", "u")
        .replace(Regex("[^a-z0-9 ]"), " ").replace(Regex("\\s+"), " ").trim()

    private fun handleCommand(raw: String) {
        val command = normalize(raw)
        when {
            command.contains("che giorno") || command.contains("data di oggi") ->
                respond("Oggi è " + SimpleDateFormat("EEEE d MMMM yyyy", Locale.ITALY).format(Date()) + ".")
            command.contains("che ore") || command == "ora" ->
                respond("Sono le " + SimpleDateFormat("HH:mm", Locale.ITALY).format(Date()) + ".")
            command.contains("meteo") || command.contains("tempo fa") || command.contains("che tempo") -> {
                val found = Regex("(?:a|di|per) ([a-z ]+)$").find(command)?.groupValues?.get(1)?.trim()
                if (!found.isNullOrBlank()) prefs.edit().putString("city", found.replaceFirstChar { it.uppercase(Locale.ITALY) }).apply()
                loadWeather(true)
            }
            command.contains("torna a casa") || command.contains("vai a casa") || command.contains("a casa") ->
                if (home.isBlank()) chooseHome() else { respond("Apro il percorso per casa. Guida con prudenza."); navigate(home) }
            command.startsWith("naviga") || command.startsWith("portami") || command.startsWith("vai a ") -> {
                val destination = raw.replace(Regex("(?i)^(naviga( verso| a)?|portami (a|verso)?|vai a)\\s*"), "").trim()
                if (destination.isBlank()) askDestination() else { respond("Apro il percorso per $destination. Occhi sulla strada."); navigate(destination) }
            }
            command.contains("dove sono") || command.contains("mia posizione") || command.contains("dove mi trovo") -> locateMe()
            command.contains("distributore") || command.contains("benzinaio") || command.contains("fare benzina") -> { respond("Cerco un distributore nelle vicinanze."); mapsSearch("distributore carburante vicino a me") }
            command.contains("parcheggio") -> { respond("Cerco parcheggi nelle vicinanze."); mapsSearch("parcheggio vicino a me") }
            command.contains("farmacia") -> { respond("Cerco una farmacia nelle vicinanze."); mapsSearch("farmacia vicino a me") }
            command.contains("ristorante") || command.contains("mangiare") -> { respond("Cerco posti dove mangiare."); mapsSearch("ristorante vicino a me") }
            command.contains("cerca") -> askSearch()
            command.contains("traffico") -> { respond("Per il traffico aggiornato apro Maps. Offline non posso verificarlo."); mapsSearch("traffico vicino a me") }
            command.contains("autovelox") -> { respond("Per gli avvisi aggiornati apro Waze. Rispetta sempre i limiti."); openUrl("https://waze.com/ul") }
            else -> respond("Ho capito: “$raw”. Per ora gestisco data, ora, meteo, navigazione e ricerche locali. L'IA conversazionale arriverà in una fase successiva.")
        }
    }

    private fun locateMe() {
        val fine = checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val coarse = checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
        if (!fine && !coarse) {
            requestPermissions(arrayOf(Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION), 42)
            return
        }
        try {
            val manager = getSystemService(LOCATION_SERVICE) as LocationManager
            val providers = listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)
            val last = providers.mapNotNull { provider ->
                try { if (manager.isProviderEnabled(provider)) manager.getLastKnownLocation(provider) else null }
                catch (_: SecurityException) { null }
            }.maxByOrNull { it.time }
            if (last != null && System.currentTimeMillis() - last.time < 10 * 60 * 1000) {
                respond("La posizione salvata indica latitudine ${"%.5f".format(Locale.US, last.latitude)} e longitudine ${"%.5f".format(Locale.US, last.longitude)}. Apro la mappa.")
                openUrl("https://www.google.com/maps/search/?api=1&query=${last.latitude},${last.longitude}")
                return
            }
            respond("Sto chiedendo una posizione GPS. Se il segnale non è disponibile, prova all'aperto.", false)
            val listener = object : LocationListener {
                override fun onLocationChanged(location: Location) {
                    try { manager.removeUpdates(this) } catch (_: Exception) {}
                    respond("Posizione trovata. Apro la mappa.")
                    openUrl("https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}")
                }
                @Deprecated("Deprecated by Android")
                override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) {}
                override fun onProviderEnabled(provider: String) {}
                override fun onProviderDisabled(provider: String) {}
            }
            var requested = false
            for (provider in providers) {
                try {
                    if (manager.isProviderEnabled(provider)) {
                        manager.requestSingleUpdate(provider, listener, mainLooper)
                        requested = true
                    }
                } catch (_: Exception) {}
            }
            if (!requested) respond("Posizione non disponibile. Attiva la posizione del telefono e riprova.")
        } catch (_: SecurityException) {
            respond("Permesso posizione non concesso.", false)
        } catch (_: Exception) {
            respond("Non riesco a leggere la posizione. Controlla le impostazioni GPS.", false)
        }
    }

    private fun loadWeather(speakResult: Boolean) {
        val requestedCity = city
        cityLabel.text = "METEO · $requestedCity"
        weather.text = "Aggiorno…"
        worker.execute {
            try {
                val geoUrl = URL("https://geocoding-api.open-meteo.com/v1/search?name=" + enc(requestedCity) + "&count=1&language=it&format=json")
                val geo = JSONObject(readUrl(geoUrl))
                val places = geo.optJSONArray("results")
                if (places == null || places.length() == 0) throw IllegalStateException("Città non trovata")
                val place = places.getJSONObject(0)
                val label = place.optString("name", requestedCity)
                val latitude = place.getDouble("latitude")
                val longitude = place.getDouble("longitude")
                val forecastUrl = URL("https://api.open-meteo.com/v1/forecast?latitude=$latitude&longitude=$longitude&current=temperature_2m,weather_code,wind_speed_10m&timezone=auto")
                val data = JSONObject(readUrl(forecastUrl)).getJSONObject("current")
                val temp = data.optDouble("temperature_2m", Double.NaN).toInt()
                val desc = weatherDescription(data.optInt("weather_code", -1))
                val fetchedAt = System.currentTimeMillis()
                prefs.edit().putString("weather-cache", "$label|$temp|$desc|$fetchedAt").apply()
                runOnUiThread {
                    weather.text = "$temp° · $desc"
                    cityLabel.text = "METEO · $label"
                    if (speakResult) respond("A $label ci sono $temp gradi e il cielo è $desc.")
                }
            } catch (_: Exception) {
                val saved = prefs.getString("weather-cache", null)?.split("|")
                val cachedAt = saved?.getOrNull(3)?.toLongOrNull()
                val age = cachedAt?.let { (System.currentTimeMillis() - it) / 3_600_000 } ?: -1
                runOnUiThread {
                    if (saved != null && saved.size >= 4) {
                        val savedTemp = saved[1]; val savedDesc = saved[2]
                        weather.text = "$savedTemp° · $savedDesc (salvato)"
                        val ageText = if (age < 0) "un momento non noto" else "$age ore fa"
                        val message = "Sono offline. L'ultimo dato meteo salvato risale a $ageText: $savedTemp gradi e $savedDesc. Non è un dato in tempo reale."
                        if (speakResult) respond(message) else response.text = message
                    } else {
                        weather.text = "Meteo non disponibile offline"
                        if (speakResult) respond("Non riesco ad aggiornare il meteo e non ho dati salvati.")
                    }
                }
            }
        }
    }
    private fun weatherDescription(code: Int): String = when (code) {
        0 -> "sereno"; 1 -> "quasi sereno"; 2 -> "parzialmente nuvoloso"; 3 -> "nuvoloso"
        45, 48 -> "nebbia"; 51, 53, 55 -> "pioviggine"; 61, 63, 65 -> "pioggia"
        71, 73, 75, 77 -> "neve"; 80, 81, 82 -> "rovesci"; 95, 96, 99 -> "temporale"
        else -> "condizioni variabili"
    }
    private fun readUrl(url: URL): String {
        val connection = url.openConnection() as HttpURLConnection
        connection.connectTimeout = 6000; connection.readTimeout = 6000
        connection.setRequestProperty("User-Agent", "AIVisionAuto/0.2")
        return try { connection.inputStream.bufferedReader(Charsets.UTF_8).use { it.readText() } }
        finally { connection.disconnect() }
    }
    private fun enc(value: String) = URLEncoder.encode(value, "UTF-8")
    private fun chooseCity() = textDialog("Città per il meteo", city) { value -> prefs.edit().putString("city", value).apply(); loadWeather(false) }
    private fun chooseHome() = textDialog("Indirizzo o luogo di Casa", home) { value -> prefs.edit().putString("home", value).apply(); respond("Casa salvata sul telefono.") }
    private fun askDestination() = textDialog("Dove vuoi andare?", prefs.getString("last-destination", "") ?: "") { navigate(it) }
    private fun askSearch() = textDialog("Che cosa cerco?", "") { openUrl("https://www.google.com/search?q=" + enc(it)) }
    private fun textDialog(title: String, initial: String, onSave: (String) -> Unit) {
        val input = EditText(this).apply { setText(initial); setSingleLine(true); hint = "Scrivi qui" }
        AlertDialog.Builder(this).setTitle(title).setView(input).setNegativeButton("Annulla", null)
            .setPositiveButton("Conferma") { _, _ -> input.text.toString().trim().takeIf { it.isNotBlank() }?.let(onSave) }.show()
    }
    private fun navigate(destination: String) {
        prefs.edit().putString("last-destination", destination).apply()
        openUrl("https://www.google.com/maps/dir/?api=1&destination=" + enc(destination) + "&travelmode=driving&dir_action=navigate")
    }
    private fun mapsSearch(query: String) = openUrl("https://www.google.com/maps/search/?api=1&query=" + enc(query))
    private fun openUrl(url: String) {
        try { startActivity(Intent(Intent.ACTION_VIEW, android.net.Uri.parse(url))) }
        catch (_: Exception) { Toast.makeText(this, "Nessuna app compatibile disponibile.", Toast.LENGTH_LONG).show() }
    }
    override fun onDestroy() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                val manager = getSystemService(CONNECTIVITY_SERVICE) as ConnectivityManager
                defaultNetworkCallback?.let { manager.unregisterNetworkCallback(it) }
            }
        } catch (_: Exception) {}
        defaultNetworkCallback = null
        stopListening(); tts?.stop(); tts?.shutdown(); worker.shutdownNow()
        super.onDestroy()
    }
}
