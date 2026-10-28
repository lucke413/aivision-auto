# AIVision Auto — Beta 0.1

Dashboard web installabile (PWA) in italiano, pensata per un telefono Android fissato al cruscotto. Questa è una beta sperimentale: non è un APK nativo e non è un'app certificata per Android Auto.

## Funzioni incluse
- Dashboard ad alto contrasto con orologio e data.
- Meteo gratuito Open-Meteo, con città scelta dall'utente e senza chiave API.
- Comandi vocali in italiano basati sul riconoscimento del browser; sintesi vocale quando supportata.
- Comandi: “naviga verso Torino”, “naviga a casa”, “cerca ristoranti”, “apri la musica”, “apri la radio”, “apri il telefono”, “che ore sono”, “meteo” e “aiuto”.
- Collegamenti a Google Maps, tastierino telefonico, compositore SMS e servizi audio esterni. Non vengono avviate chiamate né inviati messaggi automaticamente.
- Salvataggio locale facoltativo della città meteo e della destinazione Casa.
- Manifest PWA, icona SVG e service worker per memorizzare le risorse essenziali.
- Workflow GitHub Actions predisposto per la pubblicazione su GitHub Pages.

## Pubblicazione gratuita su GitHub Pages
Il workflow di pubblicazione è già incluso in .github/workflows/pages.yml. Per pubblicare il sito con il piano GitHub Free, il repository deve essere pubblico. Al momento questo repository è privato, quindi non verrà pubblicato su Pages finché non verrà modificata la visibilità o usato un piano che supporti Pages da repository privati. Rendere pubblico il repository rende il codice sorgente visibile a tutti; non pubblicare mai segreti o dati personali in questo progetto.

Dopo aver deciso di rendere pubblico il repository:
1. Apri Settings → General → Change repository visibility e cambia la visibilità in Public.
2. Apri Settings → Pages.
3. In Build and deployment, scegli GitHub Actions come Source.
4. Apri Actions e controlla il workflow “Deploy AIVision Auto to GitHub Pages”. Se non parte da solo, eseguilo con Run workflow.
5. Quando il deploy è concluso, il sito dovrebbe essere disponibile all'indirizzo https://lucke413.github.io/aivision-auto/.
6. Apri l'indirizzo HTTPS con Chrome sul telefono Android. Dal menu di Chrome scegli “Installa app” o “Aggiungi a schermata Home”.

Ogni nuovo commit sul ramo main avvierà il workflow di pubblicazione.

## Gratuità e dati
- Il progetto non richiede account nell'app, chiavi API o pagamenti.
- Le richieste meteo sono inviate a Open-Meteo. Consultare le condizioni e l'attribuzione richieste dal servizio: https://open-meteo.com/.
- Il riconoscimento vocale è fornito dal browser/dispositivo e, su alcuni telefoni, può usare un servizio online.
- Non ci sono analytics, pubblicità o un backend dell'app.
- Le preferenze opzionali sono salvate in localStorage sul dispositivo e si cancellano eliminando i dati del sito nel browser.

## Sicurezza
Configurare la destinazione e testare l'app esclusivamente a veicolo fermo. Durante la marcia evitare di digitare o interagire con lo schermo; dare priorità ai comandi vocali e interrompere l'uso se distrae. Non vengono lette automaticamente notifiche o messaggi. Questa beta non sostituisce il navigatore o i sistemi di sicurezza dell'auto.

## Limiti della beta
- Non è ancora un modello IA conversazionale: i comandi vocali sono una lista limitata di frasi.
- Musica e radio si aprono in servizi esterni.
- Le funzioni tel: e sms: dipendono dal browser e dalle app installate.
- Il supporto al riconoscimento vocale varia in base al browser. Chrome Android è il primo browser da provare.
