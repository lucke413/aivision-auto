(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const STORE = { city: 'aivisionAuto.weatherCity', home: 'aivisionAuto.homeDestination' };
  let recognition = null;
  let listening = false;
  let toastTimer = null;

  function showToast(message) {
    const el = $('toast'); el.textContent = message; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3600);
  }
  function say(message) {
    try {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'it-IT'; utterance.rate = 0.96;
      window.speechSynthesis.speak(utterance);
    } catch (_) { /* Speech synthesis is optional */ }
  }
  function updateClock() {
    const now = new Date();
    $('clock').textContent = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
    $('date').textContent = now.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
  }
  function openExternal(url) {
    // Intentional user action: opens a compatible browser/app using a standard HTTPS URL.
    window.location.href = url;
  }
  function navigateTo(destination) {
    const value = (destination || '').trim();
    if (!value) { showToast('Scrivi o pronuncia prima una destinazione.'); $('destination').focus(); return; }
    openExternal('https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(value) + '&travelmode=driving');
  }
  function openSearch(query) {
    const q = (query || '').trim();
    if (!q) { const value = prompt('Che cosa vuoi cercare?'); if (!value || !value.trim()) return openExternal('https://www.google.com/'); return openExternal('https://www.google.com/search?q=' + encodeURIComponent(value.trim())); }
    openExternal('https://www.google.com/search?q=' + encodeURIComponent(q));
  }
  function getWeatherDescription(code) {
    const map = {
      0:['☀️','Sereno'],1:['🌤️','Prevalentemente sereno'],2:['⛅','Parzialmente nuvoloso'],3:['☁️','Nuvoloso'],
      45:['🌫️','Nebbia'],48:['🌫️','Nebbia con brina'],51:['🌦️','Pioviggine leggera'],53:['🌦️','Pioviggine'],55:['🌧️','Pioviggine intensa'],
      56:['🌧️','Pioggia gelata leggera'],57:['🌧️','Pioggia gelata'],61:['🌦️','Pioggia debole'],63:['🌧️','Pioggia'],65:['🌧️','Pioggia intensa'],
      66:['🌧️','Pioggia gelata debole'],67:['🌧️','Pioggia gelata intensa'],71:['🌨️','Neve debole'],73:['🌨️','Nevicata'],75:['❄️','Neve intensa'],77:['🌨️','Granelli di neve'],
      80:['🌦️','Rovesci deboli'],81:['🌧️','Rovesci'],82:['⛈️','Rovesci intensi'],85:['🌨️','Rovesci di neve'],86:['❄️','Rovesci di neve intensi'],
      95:['⛈️','Temporale'],96:['⛈️','Temporale con grandine'],99:['⛈️','Temporale forte']
    };
    return map[code] || ['🌤️','Meteo aggiornato'];
  }
  async function loadWeather(city) {
    const chosen = (city || localStorage.getItem(STORE.city) || '').trim();
    if (!chosen) {
      $('weatherDesc').textContent = 'Imposta una città'; $('weatherExtra').textContent = 'Tocca qui per scegliere';
      return;
    }
    $('weatherDesc').textContent = 'Aggiornamento…';
    try {
      const geoRes = await fetch('https://geocoding-api.open-meteo.com/v1/search?name=' + encodeURIComponent(chosen) + '&count=1&language=it&format=json');
      if (!geoRes.ok) throw new Error('geocoding');
      const geo = await geoRes.json();
      if (!geo.results || !geo.results.length) throw new Error('notfound');
      const place = geo.results[0];
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + place.latitude + '&longitude=' + place.longitude + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&timezone=auto';
      const res = await fetch(url); if (!res.ok) throw new Error('forecast');
      const data = await res.json(); const current = data.current;
      const [icon,desc] = getWeatherDescription(current.weather_code);
      $('weatherIcon').textContent = icon;
      $('temperature').textContent = Math.round(current.temperature_2m) + '°';
      $('weatherDesc').textContent = place.name + (place.admin1 ? ', ' + place.admin1 : '');
      $('weatherExtra').textContent = desc + ' · vento ' + Math.round(current.wind_speed_10m) + ' km/h';
      localStorage.setItem(STORE.city, chosen);
    } catch (err) {
      $('weatherDesc').textContent = err.message === 'notfound' ? 'Città non trovata' : 'Meteo non disponibile';
      $('weatherExtra').textContent = 'Controlla la connessione e riprova';
    }
  }
  function promptWeatherCity() {
    const oldCity = localStorage.getItem(STORE.city) || '';
    const city = prompt('Inserisci la città per il meteo. La preferenza resta salvata solo su questo dispositivo.', oldCity);
    if (city && city.trim()) loadWeather(city.trim());
  }
  function savedHome() { return (localStorage.getItem(STORE.home) || '').trim(); }
  function setListeningState(message) { $('voiceState').textContent = message; }
  function stopListening() {
    listening = false;
    try { if (recognition) recognition.stop(); } catch (_) {}
    $('micButton').textContent = '🎙';
    setListeningState('Assistente pronto');
  }
  function helpCommands() {
    const help = 'Puoi dire: naviga verso Torino; naviga a casa; cerca ristoranti; apri la musica; apri la radio; apri il telefono; che ore sono; meteo; aiuto.';
    showToast(help); say(help);
  }
  function handleVoice(raw) {
    const text = raw.toLowerCase().trim().replace(/[.,!?;:]+$/g, '');
    if (!text) return;
    setListeningState('Hai detto: “' + raw + '”');
    if (/^(che ore sono|dimmi l.?ora|orario|che ora è)$/.test(text)) { const m = new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'}); say('Sono le ' + m); showToast('Sono le ' + m); return; }
    if (/(^|\b)(aiuto|comandi)(\b|$)/.test(text)) return helpCommands();
    if (/(^|\b)(meteo|che tempo fa|previsioni)(\b|$)/.test(text)) { const city = localStorage.getItem(STORE.city); if (city) { loadWeather(city); say('Aggiorno il meteo di ' + city); } else { say('Imposta una città per il meteo'); promptWeatherCity(); } return; }
    const toHome = text.match(/^(naviga|vai|portami)(?:\s+(?:verso|a|fino a))?\s+casa$/);
    if (toHome) { const home = savedHome(); if (home) { say('Apro la navigazione verso casa'); navigateTo(home); } else { say('Non hai ancora salvato la destinazione Casa'); const v = prompt('Inserisci la tua destinazione Casa.'); if (v && v.trim()) { localStorage.setItem(STORE.home,v.trim()); navigateTo(v.trim()); } } return; }
    const nav = text.match(/^(?:naviga(?:\s+(?:verso|a))?|portami\s+(?:verso|a)|vai\s+(?:verso|a))\s+(.+)$/);
    if (nav) { say('Apro il navigatore'); navigateTo(nav[1]); return; }
    const search = text.match(/^(?:cerca|cerca sul web|google)\s+(.+)$/);
    if (search) { say('Apro la ricerca'); openSearch(search[1]); return; }
    if (/(apri|metti|avvia|voglio ascoltare).*(musica|spotify|youtube music)/.test(text)) { say('Apro la musica'); openExternal('https://music.youtube.com/'); return; }
    if (/(apri|metti|avvia).*(radio)/.test(text)) { say('Apro la radio online'); openExternal('https://radio.garden/'); return; }
    if (/(apri|chiama|telefono|tastierino)/.test(text)) { say('Apro il telefono. Controlla il numero prima di chiamare.'); openExternal('tel:'); return; }
    if (/(maps|google maps|navigatore)/.test(text)) { say('Apro Google Maps'); openExternal('https://www.google.com/maps'); return; }
    if (/^(ferma|stop|basta|annulla ascolto)$/.test(text)) { stopListening(); say('Va bene'); return; }
    say('Non ho riconosciuto il comando. Prova a dire aiuto.'); showToast('Comando non riconosciuto · dì “aiuto”');
  }
  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { showToast('Riconoscimento vocale non disponibile in questo browser. Prova Chrome su Android.'); setListeningState('Voce non supportata dal browser'); return; }
    if (listening) { stopListening(); return; }
    recognition = new SpeechRecognition(); recognition.lang = 'it-IT'; recognition.interimResults = false; recognition.maxAlternatives = 1; recognition.continuous = false;
    recognition.onstart = () => { listening = true; $('micButton').textContent = '◉'; setListeningState('Ti ascolto…'); };
    recognition.onresult = event => { const transcript = event.results && event.results[0] && event.results[0][0] ? event.results[0][0].transcript : ''; handleVoice(transcript); };
    recognition.onerror = event => { listening = false; $('micButton').textContent = '🎙'; setListeningState('Assistente pronto'); showToast(event.error === 'not-allowed' ? 'Permetti l’uso del microfono nelle impostazioni del browser.' : 'Non riesco ad ascoltare. Riprova.'); };
    recognition.onend = () => { listening = false; $('micButton').textContent = '🎙'; if ($('voiceState').textContent === 'Ti ascolto…') setListeningState('Assistente pronto'); };
    try { recognition.start(); } catch (_) { showToast('Impossibile avviare il microfono. Riprova.'); }
  }

  $('micButton').addEventListener('click', startListening);
  $('stopVoice').addEventListener('click', stopListening);
  $('weatherCityButton').addEventListener('click', promptWeatherCity);
  $('navButton').addEventListener('click', () => { const val = $('destination').value.trim(); if (val) navigateTo(val); else { const v = prompt('Dove vuoi andare?'); if (v && v.trim()) navigateTo(v); } });
  $('goButton').addEventListener('click', () => navigateTo($('destination').value));
  $('destination').addEventListener('keydown', e => { if (e.key === 'Enter') navigateTo($('destination').value); });
  $('callButton').addEventListener('click', () => { showToast('Si apre il tastierino. La chiamata non parte automaticamente.'); window.location.href = 'tel:'; });
  $('musicButton').addEventListener('click', () => openExternal('https://music.youtube.com/'));
  $('radioButton').addEventListener('click', () => openExternal('https://radio.garden/'));
  $('messageButton').addEventListener('click', () => { const number = prompt('Numero del destinatario (facoltativo). L’SMS sarà solo preparato, non inviato automaticamente.'); if (number === null) return; openExternal('sms:' + encodeURIComponent(number.trim())); });
  $('searchButton').addEventListener('click', () => openSearch(''));
  $('homeSaveButton').addEventListener('click', () => { const old = savedHome(); const place = prompt('Scrivi la destinazione da salvare come Casa. Sarà memorizzata solo in questo browser.', old); if (place && place.trim()) { localStorage.setItem(STORE.home, place.trim()); showToast('Destinazione Casa salvata su questo dispositivo.'); } });
  $('homeNavButton').addEventListener('click', () => { const home = savedHome(); if (home) navigateTo(home); else { showToast('Prima salva la destinazione Casa.'); $('homeSaveButton').click(); } });
  $('readHelpButton').addEventListener('click', helpCommands);

  updateClock(); setInterval(updateClock, 15000);
  const initialCity = localStorage.getItem(STORE.city); if (initialCity) loadWeather(initialCity);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(() => {});
})();