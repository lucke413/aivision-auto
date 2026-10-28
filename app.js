(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const STORE = { city: 'aivisionAuto.weatherCity', home: 'aivisionAuto.homeDestination' };
  let recognition = null;
  let listening = false;
  let toastTimer = null;

  function showToast(message) {
    const el = $('toast');
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 4200);
  }

  function say(message) {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'it-IT';
      utterance.rate = 0.94;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    } catch (_) { /* Speech synthesis is optional */ }
  }

  function normalizeSpeech(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[’‘]/g, "'")
      .replace(/[.,!?;:]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function showVoiceResponse(message, shouldSpeak = true) {
    const response = $('voiceResponse');
    response.textContent = message;
    response.hidden = false;
    setVoiceState('Risposta pronta', 'ready');
    if (shouldSpeak) say(message);
  }

  function setVoiceState(message, mode = 'ready') {
    $('voiceState').textContent = message;
    $('voiceCard').classList.toggle('is-listening', mode === 'listening');
    $('voiceCard').classList.toggle('is-busy', mode === 'busy');
    $('voiceChip').textContent = mode === 'listening' ? 'ASCOLTO' : mode === 'busy' ? 'ELABORO' : 'PRONTO';
    $('micButton').setAttribute('aria-label', mode === 'listening' ? 'Interrompi ascolto' : 'Avvia assistente vocale');
  }

  function updateClock() {
    const now = new Date();
    $('clock').textContent = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    $('date').textContent = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function openExternal(url) {
    // Intentional user action: opens a compatible app/browser through a standard URL.
    window.location.href = url;
  }

  function navigateTo(destination, avoid = '') {
    const value = (destination || '').trim();
    if (!value) {
      showToast('Pronuncia una destinazione, per esempio: naviga verso Torino.');
      return;
    }
    let url = 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(value) + '&travelmode=driving';
    if (avoid) url += '&avoid=' + encodeURIComponent(avoid);
    openExternal(url);
  }

  function openMapsSearch(query) {
    openExternal('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query));
  }

  function openSearch(query) {
    const q = (query || '').trim();
    if (!q) {
      const value = prompt('Che cosa vuoi cercare?');
      if (!value || !value.trim()) return openExternal('https://www.google.com/');
      return openExternal('https://www.google.com/search?q=' + encodeURIComponent(value.trim()));
    }
    openExternal('https://www.google.com/search?q=' + encodeURIComponent(q));
  }

  function getWeatherDescription(code) {
    const map = {
      0:['☀️','sereno'],1:['🌤️','prevalentemente sereno'],2:['⛅','parzialmente nuvoloso'],3:['☁️','nuvoloso'],
      45:['🌫️','nebbia'],48:['🌫️','nebbia con brina'],51:['🌦️','pioviggine leggera'],53:['🌦️','pioviggine'],55:['🌧️','pioviggine intensa'],
      56:['🌧️','pioggia gelata leggera'],57:['🌧️','pioggia gelata'],61:['🌦️','pioggia debole'],63:['🌧️','pioggia'],65:['🌧️','pioggia intensa'],
      66:['🌧️','pioggia gelata debole'],67:['🌧️','pioggia gelata intensa'],71:['🌨️','neve debole'],73:['🌨️','nevicata'],75:['❄️','neve intensa'],77:['🌨️','granelli di neve'],
      80:['🌦️','rovesci deboli'],81:['🌧️','rovesci'],82:['⛈️','rovesci intensi'],85:['🌨️','rovesci di neve'],86:['❄️','rovesci di neve intensi'],
      95:['⛈️','temporale'],96:['⛈️','temporale con grandine'],99:['⛈️','temporale forte']
    };
    return map[code] || ['🌤️','condizioni variabili'];
  }

  async function loadWeather(city, options = {}) {
    const chosen = (city || localStorage.getItem(STORE.city) || '').trim();
    const speakResult = options.speak === true;
    const dayOffset = Math.max(0, Math.min(2, Number(options.dayOffset) || 0));
    const dayWord = dayOffset === 1 ? 'Domani' : dayOffset === 2 ? 'Dopodomani' : 'Oggi';
    if (!chosen) {
      $('weatherDesc').textContent = 'Imposta una città';
      $('weatherExtra').textContent = 'Tocca qui per scegliere';
      if (speakResult) showVoiceResponse('Per il meteo, dimmi una città. Per esempio: che tempo fa a Novara?', true);
      return null;
    }
    $('weatherDesc').textContent = 'Aggiorno il meteo…';
    if (speakResult) setVoiceState('Cerco il meteo di ' + chosen + '…', 'busy');
    try {
      const geoRes = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(chosen) + '&count=1&language=it&format=json');
      if (!geoRes.ok) throw new Error('geocoding');
      const geo = await geoRes.json();
      if (!geo.results || !geo.results.length) throw new Error('notfound');
      const place = geo.results[0];
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + place.latitude +
        '&longitude=' + place.longitude +
        '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m' +
        '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=3&timezone=auto';
      const res = await fetch(url);
      if (!res.ok) throw new Error('forecast');
      const data = await res.json();
      const label = place.name + (place.admin1 ? ', ' + place.admin1 : '');
      const [currentIcon, currentDesc] = getWeatherDescription(data.current.weather_code);
      localStorage.setItem(STORE.city, chosen);

      if (dayOffset > 0 && data.daily && data.daily.time && data.daily.time[dayOffset]) {
        const daily = data.daily;
        const [forecastIcon, forecastDesc] = getWeatherDescription(daily.weather_code[dayOffset]);
        $('weatherIcon').textContent = forecastIcon;
        $('temperature').textContent = Math.round(daily.temperature_2m_max[dayOffset]) + '°';
        $('weatherDesc').textContent = label;
        const rain = daily.precipitation_probability_max[dayOffset];
        $('weatherExtra').textContent = dayWord + ': ' + forecastDesc + ' · min ' + Math.round(daily.temperature_2m_min[dayOffset]) + '° · pioggia ' + (rain == null ? 'n.d.' : rain + '%');
        const spoken = dayWord + ' a ' + place.name + ' è previsto ' + forecastDesc +
          ', con temperature tra ' + Math.round(daily.temperature_2m_min[dayOffset]) + ' e ' +
          Math.round(daily.temperature_2m_max[dayOffset]) + ' gradi' +
          (rain == null ? '.' : ' e probabilità di pioggia del ' + rain + ' per cento.');
        if (speakResult) showVoiceResponse(spoken, true);
        return { place, description: forecastDesc, temperature: daily.temperature_2m_max[dayOffset], spoken };
      }

      const current = data.current;
      $('weatherIcon').textContent = currentIcon;
      $('temperature').textContent = Math.round(current.temperature_2m) + '°';
      $('weatherDesc').textContent = label;
      $('weatherExtra').textContent = currentDesc.charAt(0).toUpperCase() + currentDesc.slice(1) +
        ' · vento ' + Math.round(current.wind_speed_10m) + ' km/h';
      const spoken = 'A ' + place.name + ' adesso ci sono ' + Math.round(current.temperature_2m) +
        ' gradi e il cielo è ' + currentDesc + '. La temperatura percepita è di ' +
        Math.round(current.apparent_temperature) + ' gradi, il vento è a ' +
        Math.round(current.wind_speed_10m) + ' chilometri orari e l’umidità è al ' +
        Math.round(current.relative_humidity_2m) + ' per cento.' +
        (current.precipitation > 0 ? ' Precipitazioni in corso: ' + current.precipitation + ' millimetri.' : '');
      if (speakResult) showVoiceResponse(spoken, true);
      return { place, description: currentDesc, temperature: current.temperature_2m, spoken };
    } catch (err) {
      const message = err.message === 'notfound'
        ? 'Non trovo la località ' + chosen + '. Prova a pronunciarla di nuovo.'
        : 'Non riesco a recuperare il meteo adesso. Controlla la connessione e riprova.';
      $('weatherDesc').textContent = err.message === 'notfound' ? 'Città non trovata' : 'Meteo non disponibile';
      $('weatherExtra').textContent = 'Controlla la connessione e riprova';
      if (speakResult) showVoiceResponse(message, true);
      return null;
    }
  }

  function promptWeatherCity() {
    const oldCity = localStorage.getItem(STORE.city) || '';
    const city = prompt('Inserisci la città per il meteo. La preferenza resta salvata solo su questo dispositivo.', oldCity);
    if (city && city.trim()) loadWeather(city.trim());
  }

  function savedHome() { return (localStorage.getItem(STORE.home) || '').trim(); }

  function stopListening() {
    listening = false;
    try { if (recognition) recognition.stop(); } catch (_) {}
    $('micButton').textContent = '🎙';
    setVoiceState('Assistente pronto', 'ready');
  }

  function helpCommands() {
    const help = 'Puoi chiedermi: che giorno è oggi; che ore sono; che tempo fa a Novara; che tempo farà domani a Torino; naviga verso casa; trova un benzinaio o un parcheggio vicino; com’è il traffico; cerca ristoranti; apri la musica o la radio.';
    showVoiceResponse(help, true);
  }

  function extractWeatherCity(text) {
    let cleaned = text
      .replace(/\b(?:oggi|domani|dopodomani|adesso|ora|attualmente|per favore|per piacere)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const prep = cleaned.match(/\b(?:a|ad|in|di|per)\s+(.+)$/);
    let candidate = prep ? prep[1] : '';
    if (!candidate) {
      candidate = cleaned.replace(/^(?:dimmi\s+)?(?:per favore\s+)?(?:che\s+tempo(?:\s+(?:fa|fara|ci sara))?|come\s+e\s+il\s+tempo|com'e\s+il\s+tempo|che\s+meteo\s+c'e|meteo|previsioni(?:\s+del\s+tempo)?|che\s+temperatura\s+c'e|quanti\s+gradi\s+ci\s+sono|piove|piovera|nevica|che\s+condizioni\s+ci\s+sono)\s*/i, '').trim();
      candidate = candidate.replace(/^(?:a|ad|in|di|per)\s+/, '').trim();
    }
    candidate = candidate.replace(/\s+(?:oggi|domani|dopodomani|adesso|ora)$/i, '').trim();
    if (/^(tempo|meteo|previsioni|fa|e|ci sono|c'e|oggi|domani)$/i.test(candidate)) candidate = '';
    return candidate;
  }

  async function handleWeatherQuestion(text) {
    const dayOffset = /\bdopodomani\b/.test(text) ? 2 : /\bdomani\b/.test(text) ? 1 : 0;
    const city = extractWeatherCity(text) || localStorage.getItem(STORE.city) || '';
    if (!city) {
      showVoiceResponse('Certo. Dimmi la città, per esempio: “che tempo fa a Novara”, oppure imposta la città nel riquadro Meteo.', true);
      return;
    }
    await loadWeather(city, { speak: true, dayOffset });
  }

  async function answerCurrentLocation() {
    if (!navigator.geolocation) {
      showVoiceResponse('Questo browser non permette di leggere la posizione. Apro Google Maps per mostrartela.', true);
      openExternal('https://www.google.com/maps/search/?api=1&query=My+Location');
      return;
    }
    setVoiceState('Cerco la tua posizione…', 'busy');
    navigator.geolocation.getCurrentPosition(async position => {
      try {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        const url = 'https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' + lat + '&lon=' + lon + '&zoom=10&accept-language=it';
        const response = await fetch(url);
        if (!response.ok) throw new Error('reverse geocode');
        const result = await response.json();
        const addr = result.address || {};
        const locality = addr.city || addr.town || addr.village || addr.municipality || addr.county || 'la tua posizione';
        const region = addr.state ? ', ' + addr.state : '';
        showVoiceResponse('Ti trovi nei pressi di ' + locality + region + '.', true);
      } catch (_) {
        showVoiceResponse('Ho trovato le coordinate della posizione, ma non riesco a leggere il nome del luogo. Apro Maps.', true);
        openMapsSearch('la mia posizione');
      }
    }, () => {
      showVoiceResponse('Non ho il permesso di leggere la posizione. Puoi autorizzare la posizione nel browser oppure aprire Google Maps.', true);
    }, { enableHighAccuracy: false, timeout: 9000, maximumAge: 60000 });
  }

  function handleVoice(raw) {
    const text = normalizeSpeech(raw);
    if (!text) return;
    $('voiceResponse').hidden = false;
    $('voiceResponse').textContent = 'Hai detto: “' + raw + '”';
    setVoiceState('Interpreto la richiesta…', 'busy');

    // Date and time questions.
    if (/^(?:che ore sono|che ora e|che ora abbiamo|dimmi l ora|orario attuale|dimmi che ore sono)$/.test(text)) {
      const now = new Date();
      const time = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
      showVoiceResponse('Sono le ' + time + '.', true);
      return;
    }
    if (/^(?:che giorno e(?: oggi)?|oggi che giorno e|che giorno della settimana e oggi|che data e(?: oggi)?|qual e la data di oggi|qual e la data|dimmi la data|data di oggi|che giorno abbiamo)$/.test(text)) {
      const today = new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      showVoiceResponse('Oggi è ' + today + '.', true);
      return;
    }
    if (/^(?:aiuto|comandi|cosa sai fare|che cosa sai fare)$/.test(text)) return helpCommands();

    // Weather: supports a named place and today's/tomorrow's forecast.
    if (/(?:meteo|previsioni|che tempo|tempo fa|tempo fara|come e il tempo|com e il tempo|che temperatura|quanti gradi|pio(?:ve|vera|vuto)|nevica|pioggia|temporale|condizioni meteo)/.test(text)) {
      handleWeatherQuestion(text);
      return;
    }

    if (/^(?:dove sono|dove mi trovo|qual e la mia posizione|dimmi dove sono)$/.test(text)) {
      answerCurrentLocation();
      return;
    }

    if (/^(?:ferma|stop|basta|annulla ascolto|ferma ascolto)$/.test(text)) {
      stopListening();
      showVoiceResponse('Va bene, mi fermo.', true);
      return;
    }

    // Route requests and route preferences are handed to Google Maps, which provides turn-by-turn speech.
    const toHome = /^(?:naviga|vai|portami|come arrivo)(?:\s+(?:verso|a|fino a))?\s+casa$/.test(text);
    if (toHome) {
      const home = savedHome();
      if (home) {
        showVoiceResponse('Apro Google Maps per guidarti verso casa. Le indicazioni vocali del percorso saranno fornite da Maps.', true);
        setTimeout(() => navigateTo(home), 650);
      } else {
        showVoiceResponse('Non hai ancora salvato la destinazione Casa. Fallo dal pulsante “Salva destinazione Casa” quando sei fermo.', true);
      }
      return;
    }
    const avoidTolls = /(?:evita|evitando|senza)\s+(?:i\s+)?pedaggi|senza\s+autostrade|evita(?:ndo)?\s+(?:le\s+)?autostrade/.test(text);
    const routeMatch = text.match(/^(?:naviga(?:\s+(?:verso|a|al|alla|allo|ai|agli|alle|in|fino a))?|portami\s+(?:verso|a|al|alla|allo|ai|agli|alle|fino a)|vai\s+(?:verso|a|al|alla|allo|ai|agli|alle|in|fino a)|come arrivo a|guidami\s+(?:a|verso)|andiamo a|raggiungi)\s+(.+)$/);
    if (routeMatch) {
      let destination = routeMatch[1].replace(/\s+(?:evitando i pedaggi|senza pedaggi|senza autostrade|evitando le autostrade)$/,'').trim();
      showVoiceResponse('Apro Google Maps per navigare verso ' + destination + '. Le istruzioni di svolta e l’orario di arrivo saranno annunciati da Maps.', true);
      setTimeout(() => navigateTo(destination, avoidTolls ? 'tolls|highways' : ''), 700);
      return;
    }
    if (/(quanto manca|quanto tempo ci vuole|quando arrivo|a che ora arrivo|tempo di arrivo|orario di arrivo|minuti all arrivo|quanto dista)/.test(text)) {
      showVoiceResponse('Il tempo residuo e l’orario di arrivo dipendono dal percorso attivo. Apro Google Maps, che può mostrare queste informazioni aggiornate.', true);
      setTimeout(() => openExternal('https://www.google.com/maps'), 650);
      return;
    }

    // Common driving destinations and quick searches.
    if (/(?:traffico|code in strada|ci sono code|incidente|strada bloccata|strada chiusa|viabilita)/.test(text)) {
      showVoiceResponse('Apro Google Maps per controllare traffico e viabilità nella zona. Le condizioni aggiornate e le deviazioni sono mostrate da Maps.', true);
      setTimeout(() => openMapsSearch('traffico e viabilità vicino a me'), 700);
      return;
    }
    const nearby = text.match(/^(?:trova|cerca|dov e|dov'e|dove trovo|portami al|portami alla|c e|c'e|ci sono|mostrami)\s+(.+)$/);
    if (nearby && /(?:benzinaio|benzina|distributore|carburante|stazione di servizio|parcheggio|parcheggi|area di servizio|autogrill|farmacia|ristorante|bar|supermercato|ospedale|pronto soccorso|officina|gommista|colonnina|ricarica elettrica|toilette|bagno|bancomat|stazione|hotel|albergo)/.test(nearby[1])) {
      const query = nearby[1].replace(/\s+(?:piu vicino|vicino a me|nelle vicinanze|qui vicino)$/,'').trim();
      showVoiceResponse('Cerco ' + query + ' vicino a te su Google Maps.', true);
      setTimeout(() => openMapsSearch(query + ' vicino a me'), 650);
      return;
    }
    if (/^(?:apri maps|apri google maps|apri il navigatore|avvia navigazione|mostra la mappa|mappa)$/.test(text)) {
      showVoiceResponse('Apro Google Maps. Puoi pronunciare la destinazione anche nell’app di navigazione.', true);
      setTimeout(() => openExternal('https://www.google.com/maps'), 650);
      return;
    }
    if (/(apri|metti|avvia|voglio ascoltare|riproduci).*(musica|spotify|youtube music)/.test(text)) {
      showVoiceResponse('Apro YouTube Music.', true);
      setTimeout(() => openExternal('https://music.youtube.com/'), 650);
      return;
    }
    if (/(apri|metti|avvia|ascolta).*(radio)/.test(text)) {
      showVoiceResponse('Apro Radio Garden per ascoltare la radio online.', true);
      setTimeout(() => openExternal('https://radio.garden/'), 650);
      return;
    }
    if (/(apri|chiama|telefono|tastierino)/.test(text)) {
      showVoiceResponse('Apro il telefono. Prima di chiamare, verifica il numero; durante la guida usa i comandi vocali del telefono se disponibili.', true);
      setTimeout(() => openExternal('tel:'), 650);
      return;
    }
    if (/^(?:cerca|cerca sul web|google)\s+(.+)$/.test(text)) {
      const query = text.replace(/^(?:cerca sul web|cerca|google)\s+/, '');
      showVoiceResponse('Cerco ' + query + ' sul Web.', true);
      setTimeout(() => openSearch(query), 650);
      return;
    }

    // Honest fallbacks for questions requiring vehicle sensors or access to another app's live route.
    if (/(velocita attuale|a che velocita sto andando|limite di velocita|limite qui|quanta benzina|livello carburante|pressione gomme|temperatura motore)/.test(text)) {
      showVoiceResponse('Non posso leggere i sensori del veicolo da questa app. Per la velocità e i limiti fai riferimento al cruscotto e alla segnaletica stradale.', true);
      return;
    }

    showVoiceResponse('Non ho capito bene. Puoi chiedermi data, ora, meteo per una città, navigazione, traffico o luoghi vicini. Di’ “aiuto” per gli esempi.', true);
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      showToast('Riconoscimento vocale non disponibile in questo browser. Prova Chrome su Android.');
      setVoiceState('Voce non supportata dal browser', 'ready');
      return;
    }
    if (listening) { stopListening(); return; }
    recognition = new SpeechRecognition();
    recognition.lang = 'it-IT';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;
    recognition.onstart = () => {
      listening = true;
      $('micButton').textContent = '◉';
      $('voiceResponse').hidden = true;
      setVoiceState('Ti ascolto…', 'listening');
    };
    recognition.onresult = event => {
      const transcript = event.results && event.results[0] && event.results[0][0] ? event.results[0][0].transcript : '';
      handleVoice(transcript);
    };
    recognition.onerror = event => {
      listening = false;
      $('micButton').textContent = '🎙';
      const message = event.error === 'not-allowed'
        ? 'Consenti l’uso del microfono nelle impostazioni del browser.'
        : 'Non riesco ad ascoltare. Tocca il microfono e riprova.';
      setVoiceState('Assistente pronto', 'ready');
      showVoiceResponse(message, false);
      showToast(message);
    };
    recognition.onend = () => {
      listening = false;
      $('micButton').textContent = '🎙';
      if ($('voiceState').textContent === 'Ti ascolto…') setVoiceState('Assistente pronto', 'ready');
    };
    try { recognition.start(); }
    catch (_) { showToast('Impossibile avviare il microfono. Riprova.'); }
  }

  $('micButton').addEventListener('click', startListening);
  $('stopVoice').addEventListener('click', stopListening);
  $('weatherCityButton').addEventListener('click', promptWeatherCity);
  $('navButton').addEventListener('click', () => {
    const val = $('destination').value.trim();
    if (val) navigateTo(val);
    else {
      const v = prompt('Dove vuoi andare?');
      if (v && v.trim()) navigateTo(v);
    }
  });
  $('goButton').addEventListener('click', () => navigateTo($('destination').value));
  $('destination').addEventListener('keydown', e => { if (e.key === 'Enter') navigateTo($('destination').value); });
  $('callButton').addEventListener('click', () => {
    showToast('Si apre il tastierino. La chiamata non parte automaticamente.');
    window.location.href = 'tel:';
  });
  $('musicButton').addEventListener('click', () => openExternal('https://music.youtube.com/'));
  $('radioButton').addEventListener('click', () => openExternal('https://radio.garden/'));
  $('messageButton').addEventListener('click', () => {
    const number = prompt('Numero del destinatario (facoltativo). L’SMS sarà solo preparato, non inviato automaticamente.');
    if (number === null) return;
    openExternal('sms:' + encodeURIComponent(number.trim()));
  });
  $('searchButton').addEventListener('click', () => openSearch(''));
  $('homeSaveButton').addEventListener('click', () => {
    const old = savedHome();
    const place = prompt('Scrivi la destinazione da salvare come Casa. Sarà memorizzata solo in questo browser.', old);
    if (place && place.trim()) {
      localStorage.setItem(STORE.home, place.trim());
      showToast('Destinazione Casa salvata su questo dispositivo.');
    }
  });
  $('homeNavButton').addEventListener('click', () => {
    const home = savedHome();
    if (home) navigateTo(home);
    else {
      showToast('Prima salva la destinazione Casa.');
      $('homeSaveButton').click();
    }
  });
  $('readHelpButton').addEventListener('click', helpCommands);

  updateClock();
  setInterval(updateClock, 15000);
  const initialCity = localStorage.getItem(STORE.city);
  if (initialCity) loadWeather(initialCity);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
})();