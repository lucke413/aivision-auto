# AIVision Auto — Beta 0.1

Dashboard web installabile (PWA) in italiano, pensata per un telefono Android fissato al cruscotto. Questa è una beta sperimentale: non è un APK nativo e non è un'app certificata per Android Auto.

## Funzioni incluse
- Dashboard ad alto contrasto con orologio e data.
- Meteo gratuito Open-Meteo, con città scelta dall'utente e senza chiave API.
- Comandi vocali in italiano basati sul riconoscimento del browser; sintesi vocale quando supportata.
- Comandi vocali italiani: data e ora (“che giorno è oggi?”, “che ore sono?”); meteo attuale per città (“che tempo fa a Novara?”) e previsione fino a due giorni; navigazione (“naviga verso Torino”, “portami alla stazione”, “vai a casa”), preferenza per evitare pedaggi/autostrade, controllo del traffico tramite Google Maps e ricerche di luoghi vicini (benzinaio, parcheggio, farmacia, ristorante, area di servizio, ospedale e altri).
- Domande sul tempo di arrivo aprono Google Maps, che mantiene le informazioni di percorso e le indicazioni vocali; l'app non legge in modo indipendente la sessione di navigazione di Maps.
- “Dove sono?” può chiedere la posizione del dispositivo e, se autorizzata, usare un servizio di geocodifica per indicare la località.
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


## Personalità e comandi vocali

AIVision Auto usa risposte colloquiali e leggere, con battute occasionali. I dati reali restano prioritari: l'app non dichiara di aver rilevato traffico o autovelox se non dispone di una fonte che lo confermi. I comandi per autovelox aprono Waze, se disponibile, perché questa beta non riceve direttamente il feed live degli avvisi.

## Modalità offline e sensori

- Ora, data, logica dei comandi locali e preferenze già salvate funzionano senza interrogare un servizio remoto.
- Dopo avere caricato il meteo online almeno una volta, la PWA salva l'ultima osservazione e la previsione disponibile per la stessa città. Se manca la rete, mostra e legge il dato salvato indicandone chiaramente l'orario: non lo presenta come dato attuale.
- La PWA non può leggere in modo affidabile tutti i sensori hardware Android. Per accedere in maniera più completa a GPS, bussola, accelerometro e all'eventuale barometro serve una versione nativa Android; i sensori ambientali dipendono dall'hardware del modello di telefono.
- Un barometro può misurare la pressione e aiutare a osservare tendenze, ma da solo non fornisce previsioni meteorologiche affidabili. Per previsioni, radar, traffico e avvisi aggiornati serve una fonte esterna oppure dati locali scaricati in precedenza.
- Per una futura app nativa si può usare il riconoscimento vocale on-device quando Android e la lingua italiana installata lo supportano, insieme a un modello linguistico locale per ragionare senza inviare ogni richiesta a un server. L'effettiva velocità dipende dal telefono e dal modello scelto.
- L'accesso ai parametri della centralina dell'auto (per esempio velocità o temperatura motore, dove disponibile) richiederà un adattatore OBD-II Bluetooth compatibile e autorizzazioni esplicite; non sono dati ottenibili dai normali sensori del telefono.

## Limiti della beta
- Non è ancora un modello IA conversazionale: i comandi vocali sono una lista limitata di frasi.
- Musica e radio si aprono in servizi esterni.
- Le funzioni tel: e sms: dipendono dal browser e dalle app installate.
- Il supporto al riconoscimento vocale varia in base al browser. Chrome Android è il primo browser da provare.
