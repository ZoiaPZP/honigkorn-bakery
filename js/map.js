// Map in "Öffnungszeiten & Anfahrt" with a two-click consent (DSGVO): until the visitor clicks
// "Karte laden" (or ticked "Karte immer laden" before), nothing is requested from OpenStreetMap.
// Leaflet itself is vendored in vendor/leaflet and loaded only then; the tiles come from OSM.
(function () {
  'use strict';

  const App = window.App;
  const root = document.getElementById('map');
  if (!root) return;

  const STORAGE_KEY = 'honigkorn-map';
  // The demo address is made up, so the marker sits in the centre of Kelkheim (Taunus).
  const CENTER = [50.1372, 8.4505];
  const ZOOM = 15;

  const consent = document.getElementById('map-consent');
  const canvas = document.getElementById('map-canvas');
  const loadButton = document.getElementById('map-load');
  const remember = document.getElementById('map-remember');
  const status = document.getElementById('map-status');
  const forget = document.getElementById('map-forget');
  let state = 'idle'; // idle | loading | ready | error
  let map = null;
  let marker = null;

  function stored() {
    try { return localStorage.getItem(STORAGE_KEY) === 'always'; } catch (e) { return false; }
  }
  function store(always) {
    try {
      if (always) localStorage.setItem(STORAGE_KEY, 'always');
      else localStorage.removeItem(STORAGE_KEY);
    } catch (e) { /* storage unavailable: the choice just isn't remembered */ }
  }

  function setStatus(key) {
    status.dataset.key = key || '';
    status.textContent = key ? App.t(key) : '';
  }

  function loadAsset(tag, attrs) {
    return new Promise(function (resolve, reject) {
      const el = document.createElement(tag);
      Object.keys(attrs).forEach(function (k) { el[k] = attrs[k]; });
      el.onload = resolve;
      el.onerror = function () { reject(new Error('Could not load ' + (attrs.src || attrs.href))); };
      document.head.appendChild(el);
    });
  }

  function loadLeaflet() {
    if (window.L) return Promise.resolve(window.L);
    return Promise.all([
      loadAsset('link', { rel: 'stylesheet', href: 'vendor/leaflet/leaflet.css' }),
      loadAsset('script', { src: 'vendor/leaflet/leaflet.js' })
    ]).then(function () { return window.L; });
  }

  // Pin in the site's colours (crust pin, cream dot, honey halo) instead of Leaflet's blue PNG.
  function pinIcon(L) {
    return L.divIcon({
      className: 'map-pin',
      html: '<svg viewBox="0 0 48 60" width="48" height="60" aria-hidden="true">' +
        '<ellipse cx="24" cy="56" rx="10" ry="3" fill="rgba(42,27,17,.25)"/>' +
        '<circle cx="24" cy="22" r="21" fill="#E0A43B" opacity=".28"/>' +
        '<path d="M24 54S8 37.5 8 23a16 16 0 0 1 32 0c0 14.5-16 31-16 31z" fill="#8A5A2B" stroke="#FFFDF9" stroke-width="2.5"/>' +
        '<circle cx="24" cy="23" r="6.5" fill="#FBF6EE"/></svg>',
      iconSize: [48, 60],
      iconAnchor: [24, 56],
      popupAnchor: [0, -50]
    });
  }

  function markerText() {
    return '<strong>Backstube Honigkorn</strong><br>' + App.t('map.markerNote');
  }

  function showMap(L) {
    consent.hidden = true;
    canvas.hidden = false;
    map = L.map(canvas, {
      center: CENTER,
      zoom: ZOOM,
      // The page keeps scrolling with the wheel / one finger; zoom with the buttons or pinch.
      scrollWheelZoom: false,
      dragging: !L.Browser.mobile
    });
    map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
    }).addTo(map);
    marker = L.marker(CENTER, { icon: pinIcon(L), title: 'Backstube Honigkorn', alt: 'Backstube Honigkorn', keyboard: true })
      .addTo(map)
      .bindPopup(markerText());
    state = 'ready';
    forget.hidden = !stored();
  }

  function load(focusMap) {
    if (state === 'loading' || state === 'ready') return;
    state = 'loading';
    loadButton.disabled = true;
    setStatus('map.loading');
    loadLeaflet().then(function (L) {
      setStatus('');
      showMap(L);
      if (focusMap) canvas.focus();
      App.announce(App.t('map.loaded'));
    }).catch(function (err) {
      console.warn('[map]', err.message);
      state = 'error';
      loadButton.disabled = false;
      setStatus('map.error');
    });
  }

  loadButton.addEventListener('click', function () {
    store(remember.checked);
    load(true);
  });

  forget.addEventListener('click', function () {
    store(false);
    remember.checked = false;
    forget.hidden = true;
    App.announce(App.t('map.forgotten'));
  });

  document.addEventListener('app:langchange', function () {
    if (status.dataset.key) status.textContent = App.t(status.dataset.key);
    if (marker) marker.setPopupContent(markerText());
  });

  // "Karte immer laden": load without asking, but only when the section comes near the viewport.
  if (stored()) {
    remember.checked = true;
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting) return;
        observer.disconnect();
        load(false);
      }, { rootMargin: '300px 0px' });
      observer.observe(root);
    } else {
      load(false);
    }
  }
})();
