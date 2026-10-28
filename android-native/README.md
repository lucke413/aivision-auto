# AIVision Auto — app Android nativa (fondazione 0.2.0)

Questa cartella contiene il primo progetto Android nativo, separato dalla PWA già pubblicata. La PWA non viene modificata da questa build.

## Funzioni della prima build
- Dashboard scura con orologio e data.
- Meteo Open-Meteo, città scelta dall'utente e cache locale dell'ultimo dato.
- Sintesi vocale italiana tramite motore TTS Android.
- Comandi vocali a pressione singola. Se disponibile, viene preferito il riconoscimento on-device; altrimenti il servizio vocale di sistema potrebbe richiedere Internet.
- Comandi locali per data, ora, meteo, navigazione, casa, distributori, parcheggi, farmacie, traffico e autovelox.
- Destinazione Casa, città e ultima destinazione salvate localmente.
- Nessun account, chiave API o pagamento obbligatorio.

## APK di prova
Il workflow GitHub Actions “Build AIVision Auto Android APK” compila l'app e pubblica l'APK debug come artefatto scaricabile per 14 giorni. È installabile per test, ma non è una release firmata per distribuzione pubblica.

Per trovarlo: aprire Actions nel repository, scegliere il workflow e l'esecuzione più recente riuscita, quindi scaricare l'artefatto aivision-auto-debug-apk.

## Specifiche
- Minimo Android 8.0 (API 26), target SDK 35.
- Kotlin, Android Gradle Plugin 8.7.3, Java 17 e Gradle 8.9.
- La dashboard non tiene il microfono sempre attivo: l'ascolto parte solo dopo un tocco esplicito, per limitare consumi e problemi di privacy.
- Il meteo salvato viene indicato come tale quando non c'è rete; non viene presentato come dato attuale.
- Maps, Waze e ricerca web si aprono come app/servizi esterni. Non vengono inviati messaggi né avviate chiamate autonomamente.

## Roadmap
1. Compilare l'APK e testare microfono, TTS e meteo sul Redmi 15C.
2. Integrare GPS nativo con permesso esplicito e posizione visibile solo quando serve.
3. Misurare memoria, tempi e batteria prima di integrare un modello IA locale.
4. Valutare LiteRT-LM con un modello compatto scaricato solo su richiesta, mai incluso nell'APK e mai scaricato automaticamente senza conferma.
5. Progettare separatamente l'integrazione con Android Auto rispettando le categorie e le regole di Google.

## Sicurezza
È una build sperimentale, non certificata per Android Auto. Configura le destinazioni a veicolo fermo. Durante la guida non digitare né guardare lo schermo. Traffico e avvisi richiedono fonti aggiornate e non sono garantiti offline.
