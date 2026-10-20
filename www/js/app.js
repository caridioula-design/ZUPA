/* ==========================================================================
   ZUPA — interface (Bouge. Trouve. Vis.)
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Données ---------- */
  // Données du réseau : data/bus.js (window.ZUPA_BUS), uniquement les bus SOTRA
  const RAW = (Array.isArray(window.ZUPA_BUS) ? window.ZUPA_BUS : []).filter(l => !l.kind || l.kind === 'bus');
  // Arrêts ajoutés par l'utilisateur (stockés sur l'appareil)
  let customStops = (() => { try { const v = JSON.parse(localStorage.getItem('zupa:customStops') || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; } })();
  let D = Core.build(RAW, customStops);
  function rebuildNetwork() { D = Core.build(RAW, customStops); }

  /* ---------- Icônes ---------- */
  const ICONS = {
    home: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    user: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
    bus: 'M4 16c0 .88.39 1.67 1 2.22V20c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V6c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H6V6h12v5z',
    back: 'M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z',
    walk: 'M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7',
    swap: 'M16 17.01V10h-2v7.01h-3L15 21l4-3.99h-3zM9 3L5 6.99h3V14h2V6.99h3L9 3z',
    sun: 'M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM4 10.5H1v2h3v-2zm9-9.95h-2V3.5h2V.55zm7.45 3.91l-1.41-1.41-1.79 1.79 1.41 1.41 1.79-1.79zm-3.21 13.7l1.79 1.8 1.41-1.41-1.8-1.79-1.4 1.4zM20 10.5v2h3v-2h-3zm-8-5c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm-1 16.95h2V19.5h-2v2.95zm-7.45-3.91l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8z',
    moon: 'M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z',
    pin: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z',
    star: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
    starO: 'M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z',
    close: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    full: 'M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z',
    fullExit: 'M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z',
    locate: 'M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z',
    addPin: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm4 8h-3v3h-2v-3H8V8h3V5h2v3h3v2z',
    edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    cross: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z',
    chevron: 'M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
    search: 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    phone: 'M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z',
    share: 'M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z',
    route: 'M19 15.18V7c0-2.21-1.79-4-4-4s-4 1.79-4 4v10c0 1.1-.9 2-2 2s-2-.9-2-2V8.82C8.16 8.4 9 7.3 9 6c0-1.66-1.34-3-3-3S3 4.34 3 6c0 1.3.84 2.4 2 2.82V17c0 2.21 1.79 4 4 4s4-1.79 4-4V7c0-1.1.9-2 2-2s2 .9 2 2v8.18A2.996 2.996 0 0 0 18 21c1.66 0 3-1.34 3-3 0-1.3-.84-2.4-2-2.82z',
    refresh: 'M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
    info: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
    explore: 'M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z',
    hotel: 'M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z',
    resto: 'M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z',
    wc: 'M5.5 22v-7.5H4V9c0-1.1.9-2 2-2h3c1.1 0 2 .9 2 2v5.5H9.5V22h-4zM18 22v-6h3l-2.54-7.63A2.01 2.01 0 0 0 16.56 7h-.12a2 2 0 0 0-1.9 1.37L12 16h3v6h3zM7.5 6c1.11 0 2-.89 2-2s-.89-2-2-2-2 .89-2 2 .89 2 2 2zm9 0c1.11 0 2-.89 2-2s-.89-2-2-2-2 .89-2 2 .89 2 2 2z',
    shop: 'M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z',
    navigation: 'M12 2 4.5 20.29l.71.71L12 18l6.79 3 .71-.71z',
    plus: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    flag: 'M14.4 6 14 4H5v17h2v-7h5.6l.4 2h7V6z',
    trash: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
    clock: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z'
  };
  const ic = n => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n]}"/></svg>`;

  /* ---------- Utilitaires ---------- */
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  const fmtDist = km => km < 1 ? `${Math.max(10, Math.round(km * 100) * 10)} m` : `${km.toFixed(1).replace('.', ',')} km`;
  const fmtMin = m => { m = Math.max(1, Math.round(m)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, '0')}`; };
  const fmtCost = c => c ? `${c.toLocaleString('fr-FR')} FCFA` : '';
  const dist = (a, b) => Core.haversine(a[0], a[1], b.lat, b.lon);
  const PALETTE = ['#E97234', '#2f6fde', '#16a34a', '#9333ea', '#db2777', '#0891b2', '#b45309', '#dc2626', '#4f46e5', '#0d9488', '#7c3aed', '#c2410c'];
  const lineColor = num => { let h = 0; for (const ch of String(num)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return PALETTE[h % PALETTE.length]; };
  const lineBadge = (num, small) => `<span class="lb${small ? ' sm' : ''}" style="--c:${lineColor(num)}">${esc(num)}</span>`;
  const direction = line => (line.title.split('→').pop() || '').trim();
  const vibrate = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (_) {} };

  const store = {
    get(k, d) { try { const v = localStorage.getItem('zupa:' + k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } },
    set(k, v) { try { localStorage.setItem('zupa:' + k, JSON.stringify(v)); } catch (_) {} },
    clearAll() { try { Object.keys(localStorage).filter(k => k.startsWith('zupa:')).forEach(k => localStorage.removeItem(k)); } catch (_) {} }
  };

  /* ---------- État ---------- */
  const FAV_LIMIT = 6;
  const state = {
    pos: null, posStale: false, geoError: null, placeName: null,
    origin: null,          // {type:'stop', id} — sinon position GPS
    dest: null,            // id d'arrêt
    lastSearch: null, routes: [], selected: 0,
    tracking: null,
    profile: loadProfile(),
    recents: (store.get('recents', []) || []).filter(id => D.byId.has(id)),
    theme: store.get('theme', null) || (() => { try { return localStorage.getItem('themePreference') || 'auto'; } catch (_) { return 'auto'; } })()
  };
  let current = 'screen-home';

  function loadProfile() {
    let p = store.get('profile', null);
    if (!p) { // migration depuis l'ancienne version
      try {
        const old = JSON.parse(localStorage.getItem('userProfile') || 'null');
        if (old) p = { firstname: old.firstname || '', lastname: old.lastname || '',
          favorites: (old.favorites || []).map(n => Core.resolveStop(D, n)).filter(Boolean).map(s => s.id) };
      } catch (_) {}
    }
    p = p || { firstname: '', lastname: '', favorites: [] };
    p.favorites = (Array.isArray(p.favorites) ? p.favorites : []).filter(id => D.byId.has(id));
    return p;
  }
  const saveProfile = () => store.set('profile', state.profile);

  /* ---------- Toasts ---------- */
  function toast(msg, type = 'info', ms = 3500, action) {
    const box = $('toasts');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    el.innerHTML = `<span>${esc(msg)}</span>`;
    let closed = false;
    const close = () => { if (closed) return; closed = true; el.classList.remove('show'); setTimeout(() => el.remove(), 300); };
    if (action) {
      const b = document.createElement('button');
      b.className = 'toast-act'; b.textContent = action.text;
      b.onclick = () => { close(); action.fn(); };
      el.appendChild(b);
    }
    el.querySelector('span').onclick = close;
    box.appendChild(el);
    while (box.children.length > 3) box.firstElementChild.remove();
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
    setTimeout(close, ms);
  }

  /* ---------- Navigation ---------- */
  function show(id) {
    current = id;
    document.querySelectorAll('.screen').forEach(s => {
      const a = s.id === id;
      s.classList.toggle('active', a);
      s.setAttribute('aria-hidden', String(!a));
    });
    const tab = { 'screen-results': 'screen-home', 'screen-addstop': 'screen-home', 'screen-fixpos': 'screen-home', 'screen-addplace': 'screen-paiya', 'screen-pharma-detail': (typeof ph !== 'undefined' && ph.kind === 'paiya') ? 'screen-paiya' : 'screen-pharma' }[id] || id;
    document.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('active', b.dataset.nav === tab));
    $(id).scrollTop = 0;
    closeSuggests();
    if (sheets[id]) sheets[id].snapTo(sheets[id].idx);
    requestAnimationFrame(() => {
      placeLive(id);
      if (id === 'screen-home') renderHome();
      if (id === 'screen-results') ensureResMap();
      if (id === 'screen-track') ensureTrkMap();
      if (id === 'screen-profile') renderProfile();
      if (id === 'screen-addstop') ensureAsMap();
      if (id === 'screen-fixpos') ensureFpMap();
      if (id === 'screen-addplace') ensureApMap();
      if (id === 'screen-pharma') renderPharma();
      if (id === 'screen-paiya') renderPaiya();
      renderLive();
      if (id === 'screen-pharma-detail') ensurePdMap();
      scheduleAutoZoom(id);
    });
  }

  /* 3 s après l'ouverture d'une carte, zoom sur la position de l'utilisateur
     (sauf s'il a touché la carte entre-temps, et sauf sur les cartes où l'on place un repère). */
  const AUTOZOOM = ['screen-results', 'screen-track', 'screen-pharma-detail'];
  let autoZoomT = 0;
  function scheduleAutoZoom(id) {
    clearTimeout(autoZoomT);
    if (!AUTOZOOM.includes(id) || typeof L === 'undefined') return;
    const scr = $(id);
    maps.forEach(m => { if (scr.contains(m.getContainer())) m._touched = false; });
    autoZoomT = setTimeout(() => {
      if (current !== id || !state.pos) return;
      const m = maps.find(x => scr.contains(x.getContainer()));
      if (!m || m._touched) return;
      const z = Math.max(m.getZoom(), 17);
      if (m.getCenter().distanceTo(visibleCenter(m, state.pos, m.getZoom())) < 15 && m.getZoom() >= z) return;
      flyVisible(m, state.pos, z);
      if (id === 'screen-track') { trkFollow = true; syncNavFab(); }
    }, 3000);
  }

  /* ---------- Panneau coulissant sur carte plein écran ---------- */
  const sheets = {};
  function makeSheet(screenId, sheetId, snaps, init) {
    const scr = $(screenId), sh = $(sheetId), grab = sh.querySelector('.sheet-grab'), body = sh.querySelector('.sheet-body');
    const api = { idx: init, snaps };
    const H = () => scr.clientHeight || window.innerHeight;
    const full = () => H() * snaps[snaps.length - 1];
    function apply(off) {
      const f = full();
      off = Math.max(0, Math.min(f - H() * snaps[0], off));
      sh.style.height = f + 'px';
      sh.style.transform = `translateY(${off}px)`;
      scr.style.setProperty('--sheet-vis', Math.round(f - off) + 'px');
      body.style.paddingBottom = Math.round(off + 16) + 'px';
      api.off = off;
    }
    api.snapTo = i => { api.idx = Math.max(0, Math.min(snaps.length - 1, i)); apply(full() - H() * snaps[api.idx]); };
    api.visible = () => full() - (api.off || 0);
    let startY = 0, startOff = 0, lastY = 0, lastT = 0, vel = 0, moved = false, drag = false;
    grab.addEventListener('pointerdown', e => {
      drag = true; moved = false; startY = lastY = e.clientY; startOff = api.off || 0; lastT = performance.now(); vel = 0;
      sh.classList.add('dragging'); grab.setPointerCapture(e.pointerId);
    });
    grab.addEventListener('pointermove', e => {
      if (!drag) return;
      const now = performance.now();
      vel = (e.clientY - lastY) / Math.max(1, now - lastT); lastY = e.clientY; lastT = now;
      if (Math.abs(e.clientY - startY) > 4) moved = true;
      apply(startOff + e.clientY - startY);
    });
    const end = () => {
      if (!drag) return;
      drag = false; sh.classList.remove('dragging');
      if (!moved) { api.snapTo(api.idx >= snaps.length - 1 ? 0 : api.idx + 1); return; }
      const vis = api.visible() / H() - vel * 0.25; // un geste rapide porte plus loin
      let best = 0; snaps.forEach((v, i) => { if (Math.abs(v - vis) < Math.abs(snaps[best] - vis)) best = i; });
      api.snapTo(best);
    };
    grab.addEventListener('pointerup', end);
    grab.addEventListener('pointercancel', end);
    window.addEventListener('resize', () => { if (current === screenId) api.snapTo(api.idx); });
    sheets[screenId] = api;
    return api;
  }
  /* Cadre la carte sur la partie visible (entre la barre du haut et le panneau) */
  function fitVisible(map, pts, maxZoom = 17) {
    const scr = map.getContainer().closest('.screen');
    const top = scr ? (scr.querySelector('.imm-top') || {}).offsetHeight || 0 : 0;
    const sh = scr && sheets[scr.id];
    const bottom = sh ? sh.visible() : 0;
    map.fitBounds(pts, { paddingTopLeft: [28, top + 30], paddingBottomRight: [28, bottom + 24], maxZoom });
  }

  /* Centre la carte sur un point dans la partie visible (entre le bandeau du haut et le panneau du bas),
     en tenant compte de la rotation de la carte. */
  function visibleCenter(map, ll, z) {
    const scr = map.getContainer().closest('.screen');
    const top = scr ? (scr.querySelector('.imm-top') || {}).offsetHeight || 0 : 0;
    const sh = scr && sheets[scr.id];
    const dy = ((sh ? sh.visible() : 0) - top) / 2;
    const t = (map.getBearing ? map.getBearing() : 0) * Math.PI / 180;
    const c = map.project(ll, z).add(L.point(Math.sin(t) * dy, Math.cos(t) * dy));
    return map.unproject(c, z);
  }
  function flyVisible(map, ll, z, opts = { duration: 1.2 }) { map.flyTo(visibleCenter(map, ll, z), z, opts); }
  function panVisible(map, ll, opts) { map.panTo(visibleCenter(map, ll, map.getZoom()), opts); }

  /* ---------- Thème ---------- */
  const mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : { matches: false };
  const isDark = () => state.theme === 'dark' || (state.theme === 'auto' && mq.matches);
  function applyTheme() {
    const dark = isDark();
    document.body.classList.toggle('dark', dark);
    const meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.content = dark ? '#171a20' : '#E97234';
    $('theme-quick').innerHTML = ic(dark ? 'sun' : 'moon');
    $('theme-quick').setAttribute('aria-label', dark ? 'Passer en thème clair' : 'Passer en thème sombre');
    document.querySelectorAll('#theme-seg button').forEach(b => b.classList.toggle('active', b.dataset.theme === state.theme));
    if (typeof L !== 'undefined' && maps.length) refreshMapTheme();
  }
  function setTheme(t) { state.theme = t; store.set('theme', t); applyTheme(); }
  mq.addEventListener && mq.addEventListener('change', () => state.theme === 'auto' && applyTheme());

  /* ---------- Cartes (Leaflet) ---------- */
  const hasL = typeof L !== 'undefined';
  let resMap = null, resLayer = null, resUser = null;
  let trkMap = null, trkLayer = null, trkUser = null, trkCur = null, trkFollow = true, trkRotate = true;
  /* Fonds de carte sans clé API, du plus « Google Maps » au plus simple.
     Si un fond ne répond pas (erreurs de tuiles), on passe automatiquement au suivant. */
  const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
  const OSM_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  const PROVIDERS = {
    light: [
      { url: ESRI + 'World_Street_Map/MapServer/tile/{z}/{y}/{x}', maxNative: 18, attribution: 'Tiles © Esri — ' + OSM_ATTR + ', HERE, Garmin' },
      { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', maxNative: 19, attribution: OSM_ATTR },
      { url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', maxNative: 19, subdomains: 'abc', attribution: OSM_ATTR + ' — HOT' }
    ],
    dark: [
      { url: ESRI + 'Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', maxNative: 16, attribution: 'Tiles © Esri',
        labels: ESRI + 'Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}' },
      { url: ESRI + 'World_Street_Map/MapServer/tile/{z}/{y}/{x}', maxNative: 18, attribution: 'Tiles © Esri — ' + OSM_ATTR, invert: true },
      { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', maxNative: 19, attribution: OSM_ATTR, invert: true }
    ]
  };
  function setTiles(m, idx) {
    const theme = isDark() ? 'dark' : 'light';
    const list = PROVIDERS[theme];
    if (idx >= list.length) return;           // plus rien à essayer : on garde le dernier fond
    m._tileIdx = idx;
    (m._tileLayers || []).forEach(l => m.removeLayer(l));
    const p = list[idx];
    const opts = { maxZoom: 20, maxNativeZoom: p.maxNative, subdomains: p.subdomains || 'abc', attribution: p.attribution, crossOrigin: false };
    const base = L.tileLayer(p.url, opts);
    let errors = 0;
    base.on('tileerror', () => { if (++errors === 4 && m._tileIdx === idx) setTiles(m, idx + 1); });
    base.on('tileload', () => { errors = Math.max(0, errors - 1); });
    m._tileLayers = [base.addTo(m)];
    if (p.labels) {
      if (!m.getPane('labels')) { const pane = m.createPane('labels'); pane.style.zIndex = 350; pane.style.pointerEvents = 'none'; }
      m._tileLayers.push(L.tileLayer(p.labels, { maxZoom: 20, maxNativeZoom: p.maxNative, pane: 'labels' }).addTo(m));
    }
    m.getContainer().classList.toggle('tiles-invert', !!p.invert);
  }
  const maps = [];
  const G = { blue: '#4285F4', blueDark: '#8AB4F8', red: '#EA4335', redDark: '#B31412' };
  const mkIcon = (cls, size, color) => L.divIcon({ className: 'mk ' + cls, html: `<span${color ? ` style="--c:${color}"` : ''}></span>`, iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
  const pinIcon = () => L.divIcon({ className: 'gm-pin', iconSize: [28, 40], iconAnchor: [14, 39], popupAnchor: [0, -34],
    html: `<svg viewBox="0 0 24 34" width="28" height="40"><path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.6 12 34 12 34s12-13.4 12-22.1C24 5.3 18.6 0 12 0z" fill="${G.red}" stroke="${G.redDark}" stroke-width="1"/><circle cx="12" cy="12" r="4.3" fill="${G.redDark}"/></svg>` });

  /* ---------- Carte hors ligne du Grand Abidjan (vectorielle, OpenStreetMap / Protomaps) ----------
     maps/abidjan.pmtiles est intégré à l'APK. Dans la zone couverte, la carte s'affiche sans internet ;
     ailleurs, les fonds en ligne prennent le relais. */
  const OFFLINE = { pm: null, bounds: null, maxZoom: 15 };
  async function loadOfflineMap() {
    if (typeof pmtiles === 'undefined' || typeof protomapsL === 'undefined') return;
    try {
      const r = await fetch('maps/abidjan.pmtiles');
      if (!r.ok) return;
      const blob = await r.blob();
      if (blob.size < 10000) return;
      const pm = new pmtiles.PMTiles(new pmtiles.FileSource(new File([blob], 'abidjan.pmtiles')));
      const h = await pm.getHeader();
      OFFLINE.pm = pm; OFFLINE.maxZoom = h.maxZoom || 15;
      OFFLINE.bounds = L.latLngBounds([h.minLat, h.minLon], [h.maxLat, h.maxLon]);
      maps.forEach(m => setVector(m));
    } catch (e) { console.warn('Carte hors ligne indisponible', e); }
  }
  function setVector(m) {
    if (m._vec) { m.removeLayer(m._vec); m._vec = null; }
    if (!OFFLINE.pm) return;
    if (!m.getPane('vec')) { const pane = m.createPane('vec', m.getPane('rotatePane') || m.getPane('mapPane')); pane.style.zIndex = 250; }
    m._vec = protomapsL.leafletLayer({ url: OFFLINE.pm, flavor: isDark() ? 'dark' : 'light', lang: 'fr', maxDataZoom: OFFLINE.maxZoom,
      pane: 'vec', bounds: OFFLINE.bounds, attribution: '© OpenStreetMap · Protomaps' });
    m._vec.options.bounds = OFFLINE.bounds;
    m._vec.addTo(m);
    // fonds en ligne retirés quand toute la vue est couverte par la carte hors ligne (économie de données)
    if (!m._rasterToggle) {
      m._rasterToggle = () => {
        if (!OFFLINE.bounds || !m._tileLayers) return;
        const inside = OFFLINE.bounds.contains(m.getBounds());
        m._tileLayers.forEach(l => { if (inside && m.hasLayer(l)) m.removeLayer(l); else if (!inside && !m.hasLayer(l)) l.addTo(m); });
      };
      m.on('moveend zoomend', m._rasterToggle);
    }
    m._rasterToggle();
  }

  /* ---------- Orientation (cap) de l'utilisateur ----------
     En marche : boussole du téléphone. En véhicule (vitesse > 1,2 m/s) : direction donnée par le GPS. */
  const nav = { heading: null, gpsT: 0, raf: 0 };
  const headingMarkers = new Set();
  function setHeading(h, src) {
    if (!Number.isFinite(h)) return;
    if (src === 'compass' && Date.now() - nav.gpsT < 4000) return; // le GPS prime quand on roule
    if (nav.heading == null) nav.heading = (h + 360) % 360;
    else { const d = ((h - nav.heading + 540) % 360) - 180; if (Math.abs(d) < 1) return; nav.heading = (nav.heading + d * (src === 'gps' ? 0.6 : 0.25) + 360) % 360; }
    if (!nav.raf) nav.raf = requestAnimationFrame(() => { nav.raf = 0; applyHeading(); });
  }
  function onOrientation(e) {
    let h = null;
    if (typeof e.webkitCompassHeading === 'number') h = e.webkitCompassHeading;
    else if (e.absolute !== false && e.alpha != null) h = 360 - e.alpha;
    if (h == null) return;
    const ang = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
    setHeading((h + ang) % 360, 'compass');
  }
  if ('ondeviceorientationabsolute' in window) window.addEventListener('deviceorientationabsolute', onOrientation);
  else window.addEventListener('deviceorientation', onOrientation);
  function updateHeadingMarkers() {
    headingMarkers.forEach(mk => {
      const el = mk.getElement && mk.getElement(); if (!el) return;
      const map = mk._map, brg = map && map.getBearing ? map.getBearing() : 0;
      el.classList.toggle('has-hd', nav.heading != null);
      if (nav.heading != null) el.style.setProperty('--hd', ((nav.heading + brg) % 360).toFixed(1) + 'deg');
    });
  }
  function applyHeading() {
    updateHeadingMarkers();
    if (LIVE_HOST[current]) updateLiveDir();
    if (trkMap && current === 'screen-track' && trkFollow && trkRotate && nav.heading != null) {
      const target = (360 - nav.heading) % 360, cur = (trkMap.getBearing() + 360) % 360;
      if (Math.abs(((target - cur + 540) % 360) - 180) > 2) trkMap.setBearing(target);
    }
  }

  function baseMap(el, opts = {}) {
    const m = L.map(el, { zoomControl: false, preferCanvas: !!opts.canvas, maxZoom: 20, rotate: true, bearing: 0, rotateControl: false, touchRotate: false }).setView([5.33, -4.01], 13);
    m.attributionControl.setPrefix(false);
    setTiles(m, 0);
    setVector(m);
    // Boussole : visible quand la carte est tournée ; un appui remet le nord en haut
    const Compass = L.Control.extend({
      options: { position: 'topright' },
      onAdd() {
        const b = L.DomUtil.create('button', 'gm-fab gm-compass');
        b.type = 'button'; b.title = 'Nord en haut'; b.setAttribute('aria-label', 'Remettre le nord en haut');
        b.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 2 16 12H8Z" fill="#EA4335"/><path d="M12 22 8 12h8Z" fill="#9aa0a6"/></svg>';
        L.DomEvent.disableClickPropagation(b);
        b.onclick = () => { if (opts.onNorth) opts.onNorth(); m.setBearing(0); };
        m._compass = b;
        return b;
      }
    });
    new Compass().addTo(m);
    const syncCompass = () => {
      const brg = m.getBearing ? m.getBearing() : 0;
      if (m._compass) { m._compass.hidden = Math.abs((((brg % 360) + 540) % 360) - 180) < 2; m._compass.firstChild.style.transform = `rotate(${brg}deg)`; }
      updateHeadingMarkers();
    };
    m.on('rotate', syncCompass);
    syncCompass();
    // Bouton « ma position » rond, comme sur Google Maps
    const Locate = L.Control.extend({
      options: { position: 'bottomright' },
      onAdd() {
        const b = L.DomUtil.create('button', 'gm-fab');
        b.type = 'button'; b.title = 'Ma position'; b.setAttribute('aria-label', 'Centrer sur ma position');
        b.innerHTML = ic('locate');
        L.DomEvent.disableClickPropagation(b);
        m._locate = b;
        b.onclick = () => {
          if (opts.onLocate && opts.onLocate() === false) return;
          if (state.pos) flyVisible(m, state.pos, Math.max(m.getZoom(), 16), { duration: 0.6 });
          else toast('Position inconnue pour le moment.', 'error');
        };
        return b;
      }
    });
    new Locate().addTo(m);
    // toucher la carte annule le zoom automatique sur la position
    ['pointerdown', 'wheel'].forEach(ev => el.addEventListener(ev, () => { m._touched = true; }, { passive: true }));
    // Les petits arrêts n'apparaissent qu'en zoomant : carte plus lisible
    m._gated = [];
    m.on('zoomend', () => gateAll(m));
    maps.push(m);
    return m;
  }
  function gate(map, parent, group, minZoom) {
    map._gated = map._gated.filter(g => g.parent !== parent);
    map._gated.push({ parent, group, minZoom });
    gateAll(map);
  }
  function gateAll(map) {
    const z = map.getZoom();
    map._gated.forEach(({ parent, group, minZoom }) => {
      const on = z >= minZoom;
      if (on && !parent.hasLayer(group)) parent.addLayer(group);
      else if (!on && parent.hasLayer(group)) parent.removeLayer(group);
    });
  }
  function refreshMapTheme() {
    maps.forEach(m => { setTiles(m, 0); setVector(m); });
    if (resMap && state.lastSearch) drawResults(false);
    if (trkMap && state.tracking) drawRoute(trkMap, trkLayer, state.tracking.r, state.tracking.origin.stopId ? null : state.tracking.origin, false, state.tracking.destObj);
  }
  // Point bleu + cercle de précision (comme Google Maps)
  function userMarker(map, cur) {
    if (!map || !state.pos) return cur;
    const r = state.manual ? 0 : Math.min(state.accuracy || 0, 3000);
    if (!cur) {
      cur = L.marker(state.pos, { icon: L.divIcon({ className: 'mk mk-user', html: '<i class="hd-cone"></i><span></span>', iconSize: [18, 18], iconAnchor: [9, 9] }), interactive: false, zIndexOffset: 1000 }).addTo(map);
      headingMarkers.add(cur);
      cur._acc = L.circle(state.pos, { radius: 0, color: G.blue, weight: 1, opacity: .45, fillColor: G.blue, fillOpacity: .12, interactive: false }).addTo(map);
    } else { cur.setLatLng(state.pos); cur._acc.setLatLng(state.pos); }
    cur._acc.setRadius(r > 15 ? r : 0);
    updateHeadingMarkers();
    return cur;
  }
  function mapOff(id) { $(id).innerHTML = '<div class="map-off">Carte indisponible (pas de connexion)</div>'; }

  /* Itinéraire à pied : on interroge deux calculateurs piétons (Valhalla et OSRM avec variantes)
     et on garde le plus court. Si tous proposent un détour absurde, on garde la ligne droite. */
  const walkCache = new Map();
  function decodePolyline(str, precision) {
    const f = Math.pow(10, precision); let i = 0, lat = 0, lon = 0; const out = [];
    while (i < str.length) {
      for (const k of [0, 1]) {
        let b, shift = 0, res = 0;
        do { b = str.charCodeAt(i++) - 63; res |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
        const d = (res & 1) ? ~(res >> 1) : (res >> 1);
        if (k === 0) lat += d; else lon += d;
      }
      out.push([lat / f, lon / f]);
    }
    return out;
  }
  const lineKm = c => { let km = 0; for (let i = 1; i < c.length; i++) km += Core.haversine(c[i - 1][0], c[i - 1][1], c[i][0], c[i][1]); return km; };
  async function getJson(url, ms) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
    try { const r = await fetch(url, { signal: ctl.signal }); return r.ok ? await r.json() : null; } catch (_) { return null; } finally { clearTimeout(t); }
  }
  async function walkOsrm(a, b) {
    const j = await getJson(`https://routing.openstreetmap.de/routed-foot/route/v1/foot/${a.lon},${a.lat};${b.lon},${b.lat}?overview=full&geometries=geojson&alternatives=3`, 7000);
    return (j && j.routes || []).map(r => ({ coords: r.geometry.coordinates.map(([x, y]) => [y, x]), km: r.distance / 1000, src: 'osrm' }));
  }
  async function walkValhalla(a, b) {
    const q = { locations: [{ lat: a.lat, lon: a.lon }, { lat: b.lat, lon: b.lon }], costing: 'pedestrian', directions_options: { language: 'fr-FR', units: 'kilometers' } };
    const j = await getJson('https://valhalla1.openstreetmap.de/route?json=' + encodeURIComponent(JSON.stringify(q)), 7000);
    const leg = j && j.trip && j.trip.legs && j.trip.legs[0];
    if (!leg) return [];
    return [{ coords: decodePolyline(leg.shape, 6), km: j.trip.summary.length, src: 'valhalla', steps: (leg.maneuvers || []).map(m => ({ txt: m.instruction, km: m.length })) }];
  }
  async function fetchWalk(a, b) {
    const k = [a.lat, a.lon, b.lat, b.lon].map(v => (+v).toFixed(4)).join(',');
    if (walkCache.has(k)) return walkCache.get(k);
    const crow = Core.haversine(a.lat, a.lon, b.lat, b.lon);
    const res = await Promise.allSettled([walkValhalla(a, b), walkOsrm(a, b)]);
    const cands = res.flatMap(r => r.status === 'fulfilled' ? r.value : []).filter(c => c.coords.length > 1)
      .map(c => {
        // les deux extrémités sont recollées au point exact (départ réel et arrêt)
        const coords = [[a.lat, a.lon], ...c.coords, [b.lat, b.lon]];
        return Object.assign(c, { coords, km: lineKm(coords) });
      })
      .sort((x, y) => x.km - y.km);
    let best = cands[0] || null;
    // détour absurde (le point a été accroché à une route éloignée) : ligne droite
    if (best && best.km > Math.max(crow * 3, crow + 0.6)) best = null;
    if (best) walkCache.set(k, best);
    return best;
  }

  /* Flèches de direction le long d'un tracé (tous les `every` mètres) */
  function bearing(p, q) {
    const y = Math.sin((q[1] - p[1]) * Math.PI / 180) * Math.cos(q[0] * Math.PI / 180);
    const x = Math.cos(p[0] * Math.PI / 180) * Math.sin(q[0] * Math.PI / 180) - Math.sin(p[0] * Math.PI / 180) * Math.cos(q[0] * Math.PI / 180) * Math.cos((q[1] - p[1]) * Math.PI / 180);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }
  function addArrows(group, ll, color, every, size = 16, stroke = '#fff') {
    if (!ll || ll.length < 2) return;
    let next = every / 2, acc = 0;
    for (let i = 1; i < ll.length; i++) {
      const seg = Core.haversine(ll[i - 1][0], ll[i - 1][1], ll[i][0], ll[i][1]) * 1000;
      if (seg <= 0) continue;
      const brg = bearing(ll[i - 1], ll[i]);
      while (acc + seg >= next) {
        const t = (next - acc) / seg;
        const pos = [ll[i - 1][0] + (ll[i][0] - ll[i - 1][0]) * t, ll[i - 1][1] + (ll[i][1] - ll[i - 1][1]) * t];
        L.marker(pos, { interactive: false, keyboard: false, zIndexOffset: 400, icon: L.divIcon({ className: 'dir-arrow', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
          html: `<svg viewBox="0 0 24 24" style="transform:rotate(${brg.toFixed(0)}deg)"><path d="M12 3 20 19 12 15 4 19Z" fill="${color}" stroke="${stroke}" stroke-width="2" stroke-linejoin="round"/></svg>` }) }).addTo(group);
        next += every;
      }
      acc += seg;
    }
  }
  /* Tronçon à pied : ligne droite immédiate, remplacée par le plus court chemin piéton dès qu'il est connu */
  function drawWalk(layer, a, b, style, arrowColor, onKm) {
    const g = L.layerGroup().addTo(layer);
    const crowKm = Core.haversine(a.lat, a.lon, b.lat, b.lon);
    const paint = (ll, km) => {
      g.clearLayers();
      L.polyline(ll, style).addTo(g);
      addArrows(g, ll, arrowColor, Math.max(35, km * 1000 / 8), 15);
    };
    paint([[a.lat, a.lon], [b.lat, b.lon]], crowKm);
    if (crowKm < 15) fetchWalk(a, b).then(w => {
      if (!w || !layer.hasLayer(g)) return;
      paint(w.coords, w.km);
      if (onKm) onKm(w.km, w);
    });
    return g;
  }

  function drawRoute(map, layer, r, origin, fit, dest) {
    layer.clearLayers();
    if (!r) return;
    const dark = isDark();
    const walkStyle = { color: dark ? G.blueDark : G.blue, weight: 5, dashArray: '0 9', lineCap: 'round', interactive: false };
    const casing = dark ? '#0b0c0f' : '#ffffff';
    const small = L.layerGroup();
    const pts = [];
    const first = r.legs[0].board;
    const walkCol = dark ? G.blueDark : G.blue;
    if (origin && r.walkStartKm > 0.02) {
      drawWalk(layer, origin, first, walkStyle, walkCol);
      pts.push([origin.lat, origin.lon]);
    }
    r.legs.forEach((leg, li) => {
      const ll = leg.stops.map(s => [s.lat, s.lon]);
      const col = lineColor(leg.line.num);
      if (li > 0 && leg.walkBeforeKm > 0.02) {
        const p = r.legs[li - 1].alight;
        drawWalk(layer, p, leg.board, walkStyle, walkCol);
      }
      L.polyline(ll, { color: casing, weight: 10, opacity: dark ? .7 : 1, lineJoin: 'round', interactive: false }).addTo(layer);
      L.polyline(ll, { color: col, weight: 6, lineJoin: 'round', interactive: false }).addTo(layer);
      const legKm = leg.line.cum[leg.to] - leg.line.cum[leg.from];
      addArrows(layer, ll, col, Math.max(220, legKm * 1000 / 10), 18);
      leg.stops.forEach((s, k) => {
        if (k === 0 || k === leg.stops.length - 1) return;
        L.circleMarker([s.lat, s.lon], { radius: 3.5, color: col, weight: 2, fillColor: '#fff', fillOpacity: 1 })
          .bindTooltip(esc(s.name), { direction: 'top', className: 'gm-tip' }).addTo(small);
      });
      pts.push(...ll);
    });
    gate(map, layer, small, 15);
    L.marker([first.lat, first.lon], { icon: mkIcon('mk-stop', 18, lineColor(r.legs[0].line.num)), zIndexOffset: 500 })
      .bindPopup(`<b>Montez ici</b><br>${esc(first.name)}<br>${lineBadge(r.legs[0].line.num, true)} direction ${esc(direction(r.legs[0].line))}`).addTo(layer);
    r.legs.slice(1).forEach(leg => L.marker([leg.board.lat, leg.board.lon], { icon: mkIcon('mk-stop', 18, lineColor(leg.line.num)), zIndexOffset: 500 })
      .bindPopup(`<b>Correspondance</b><br>${esc(leg.board.name)}<br>${lineBadge(leg.line.num, true)} direction ${esc(direction(leg.line))}`).addTo(layer));
    const last = r.legs[r.legs.length - 1].alight;
    const endOnStop = !dest || r.walkEndKm <= 0.02;
    if (endOnStop) {
      L.marker([last.lat, last.lon], { icon: pinIcon(), zIndexOffset: 800 }).bindPopup(`<b>Descendez ici</b><br>${esc(last.name)}`).addTo(layer);
    } else {
      L.marker([last.lat, last.lon], { icon: mkIcon('mk-stop', 18, lineColor(r.legs[r.legs.length - 1].line.num)), zIndexOffset: 500 })
        .bindPopup(`<b>Descendez ici</b><br>${esc(last.name)}`).addTo(layer);
      drawWalk(layer, last, dest, walkStyle, walkCol);
      L.marker([dest.lat, dest.lon], { icon: pinIcon(), zIndexOffset: 800 }).bindPopup(`<b>${esc(dest.label)}</b>`).addTo(layer);
      pts.push([dest.lat, dest.lon]);
    }
    if (fit && pts.length) fitVisible(map, pts);
  }

  /* ---------- Géolocalisation ---------- */
  let geoBusy = false, lastGeo = null;
  async function reverseGeocode(lat, lon) {
    if (geoBusy || (lastGeo && Core.haversine(lastGeo[0], lastGeo[1], lat, lon) < 0.15)) return;
    geoBusy = true;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=fr&zoom=17`);
      if (r.ok) {
        const a = (await r.json()).address || {};
        state.placeName = [a.road || a.pedestrian, a.suburb || a.neighbourhood || a.city_district || a.town || a.city].filter(Boolean).join(', ') || null;
        lastGeo = [lat, lon];
        renderLoc();
      }
    } catch (_) { /* hors ligne : on garde l'arrêt le plus proche */ }
    finally { geoBusy = false; }
  }

  /* Le bandeau se colore en vert à mesure que l'on approche de l'arrêt le plus proche (500 m -> 25 m),
     puis clignote en vert quand on est à l'arrêt. */
  const AT_STOP_KM = 0.03, FAR_KM = 0.5;
  let wasAtStop = false;
  function stopGlow(el, near) {
    const d = near ? near.d : Infinity;
    const k = d >= FAR_KM ? 0 : d <= AT_STOP_KM ? 1 : 1 - (d - AT_STOP_KM) / (FAR_KM - AT_STOP_KM);
    const at = d <= AT_STOP_KM;
    el.classList.toggle('at-stop', at);
    el.classList.toggle('near-stop', k > 0 && !at);
    el.style.setProperty('--near', k.toFixed(3));
    if (at && !wasAtStop) vibrate([120, 80, 120]);
    wasAtStop = at;
  }
  /* ---------- Activité en direct (style « Live Activities » / Dynamic Island) ----------
     Capsule noire en haut de l'onglet Bus : distance jusqu'à l'arrêt, mise à jour à chaque mesure GPS.
     Cible : arrêt de départ ou prochain arrêt pendant un trajet suivi, sinon l'arrêt le plus proche.
     Elle verdit à l'approche (500 m -> 30 m) et clignote en vert à l'arrêt. Un appui l'agrandit. */
  const live = { open: false, shown: null, raf: 0, key: '', dest: store.get('liveDest', null) };
  const CARD = ['le nord', 'le nord-est', "l'est", 'le sud-est', 'le sud', 'le sud-ouest', "l'ouest", 'le nord-ouest'];
  const LIVE_HOST = { 'screen-home': ['loc-chip', 'before'], 'screen-pharma': ['ph-garde', 'after'], 'screen-paiya': ['py-cats', 'after'] };
  function placeLive(id) { // la même bulle passe d'un onglet à l'autre
    const h = LIVE_HOST[id], box = $('live');
    if (!h) return;
    const ref = $(h[0]);
    if (h[1] === 'before') { if (ref.previousElementSibling !== box) ref.before(box); }
    else if (ref.nextElementSibling !== box) ref.after(box);
    live.key = '';
  }
  const DEST_TTL = 3 * 3600e3;
  function placeTarget(kind) {
    const d = live.dest && live.dest.kind === kind && Date.now() - live.dest.t < DEST_TTL ? live.dest : null;
    if (kind === 'pharma') {
      const list = allPharmacies().filter(p => p.d != null && !p.approx).sort((a, b) => a.d - b.d);
      const sel = d && list.find(p => p.id === d.id);
      const g = list.find(p => p.garde), o = list.find(p => p.st === 'open');
      const p = sel || g || o || list[0];
      if (!p) return null;
      return { kind, p, icon: 'cross', color: 'var(--ph)', dest: !!sel, far: FAR_KM, at: 0.04,
        kicker: sel ? 'Votre destination' : p === g ? 'De garde, la plus proche' : p === o ? 'Ouverte, la plus proche' : 'La plus proche',
        tags: `<span class="st ${p.st}">${esc(statusLabel(p, true))}</span>` };
    }
    let p = null;
    if (d) { const p0 = placesBase().find(x => x.id === d.id); if (p0) p = withStatus(p0); }
    const sel = !!p;
    if (!p) {
      let best = null, bd = Infinity;
      for (const x of placesBase()) {
        if (x.cat !== py.cat) continue;
        const k = quickKm(x);
        if (k < bd && (!py.open || withStatus(x).st === 'open')) { bd = k; best = x; }
      }
      if (!best) return null;
      p = withStatus(best);
    }
    const one = { hotel: 'Hôtel le plus proche', resto: 'Restaurant le plus proche', wc: 'Toilettes les plus proches', shop: 'Commerce le plus proche' }[p.cat];
    return { kind, p, icon: PY_ICON[p.cat], color: PY_COLOR[p.cat], dest: sel, far: FAR_KM, at: 0.04,
      kicker: sel ? 'Votre destination' : one,
      tags: `<span class="live-sub">${esc(p.sub || '')}</span>${p.hours ? `<span class="st ${p.st}">${esc(pyStatus(p, true))}</span>` : ''}` };
  }
  function liveTarget() {
    if (current === 'screen-pharma') return placeTarget('pharma');
    if (current === 'screen-paiya') return placeTarget('paiya');
    const t = state.tracking;
    if (t && !t.arrived) {
      if (t.idx < 0) { const p = t.pts[0]; return { kicker: 'Votre arrêt de départ', p, line: p.line, veh: p.veh, act: 'track', far: FAR_KM, at: AT_STOP_KM }; }
      const nx = t.pts[t.idx + 1];
      if (nx) return { kicker: nx.kind === 'alight' ? 'Descente à' : 'Prochain arrêt', p: nx, line: nx.line, veh: nx.veh, act: 'track', far: 1.5, at: 0.06 };
    }
    const near = Core.nearbyStops(D, state.pos[0], state.pos[1], 3, 1)[0];
    if (!near) return null;
    const s = near.stop;
    return { kicker: 'Arrêt le plus proche', p: { name: s.label, lat: s.lat, lon: s.lon }, stop: s, act: 'origin', far: FAR_KM, at: AT_STOP_KM };
  }
  function liveDistParts(km) {
    if (km < 1) return [String(Math.max(0, Math.round(km * 100) * 10)), 'm'];
    return [km.toFixed(km < 10 ? 1 : 0).replace('.', ','), 'km'];
  }
  function tweenDist(el, to) { // le chiffre défile doucement vers la nouvelle valeur
    const from = live.shown == null ? to : live.shown;
    live.shown = to;
    cancelAnimationFrame(live.raf);
    const t0 = performance.now(), dur = Math.abs(to - from) > 2 ? 0 : 450;
    const step = now => {
      const k = dur ? Math.min(1, (now - t0) / dur) : 1, v = from + (to - from) * (1 - Math.pow(1 - k, 3));
      const [n, u] = liveDistParts(v);
      el.textContent = n; $('live-unit').textContent = u;
      if (k < 1) live.raf = requestAnimationFrame(step);
    };
    live.raf = requestAnimationFrame(step);
  }
  function renderLive() {
    const box = $('live');
    if (!LIVE_HOST[current]) return;
    const tg = state.pos ? liveTarget() : null;
    if (!tg) { box.hidden = true; wasAtStop = false; return; }
    box.hidden = false;
    const d = dist(state.pos, tg.p);
    const at = d <= tg.at;
    const k = d >= tg.far ? 0 : at ? 1 : 1 - (d - tg.at) / (tg.far - tg.at);
    box.classList.toggle('at', at);
    box.classList.toggle('near', k > 0 && !at);
    box.classList.toggle('stale', !!state.posStale);
    box.style.setProperty('--near', k.toFixed(3));
    box.style.setProperty('--lc', tg.color || (tg.line ? lineColor(tg.line) : 'var(--brand)'));
    const key = current + tg.kicker + tg.p.name;
    if (key !== live.key) {
      live.key = key; live.shown = null;
      const icn = tg.icon || 'bus';
      $('live-ic').innerHTML = ic(icn); box.querySelector('.live-end').innerHTML = ic(icn);
    }
    $('live-kicker').textContent = at ? (tg.kind ? 'Vous y êtes' : tg.act === 'track' && state.tracking && state.tracking.idx >= 0 ? 'Arrêt atteint' : 'Vous êtes à l’arrêt') : tg.kicker;
    $('live-name').textContent = tg.p.name;
    if (at) { cancelAnimationFrame(live.raf); live.shown = d; $('live-dist').textContent = 'Ici'; $('live-unit').textContent = ''; }
    else tweenDist($('live-dist'), d);
    $('live-fill').style.width = (k * 100).toFixed(1) + '%'; box.style.setProperty('--fill', (k * 100).toFixed(1) + '%');
    const walk = Core.walkMin(d * Core.CFG.DETOUR);
    $('live-walk').textContent = at ? (state.posStale ? 'Position en cours de mise à jour' : 'Vous y êtes')
      : tg.act === 'track' && state.tracking && state.tracking.idx >= 0 ? `${tg.veh || 'Bus'} ${tg.line || ''}`.trim()
      : `~${fmtMin(walk)} à pied`;
    $('live-dir-txt').parentNode.hidden = at;
    updateLiveDir(tg);
    $('live-lines').innerHTML = tg.tags || (tg.stop ? linesHtml(tg.stop) : tg.line ? lineBadge(tg.line, true) : '');
    $('live-act').textContent = tg.kind ? (tg.p.phone ? 'Itinéraire et appel' : 'Itinéraire') : tg.act === 'track' ? 'Ouvrir le suivi du trajet' : 'Partir de cet arrêt';
    $('live-clear').hidden = !tg.dest;
    live.tg = tg;
    if (at && !wasAtStop) vibrate([120, 80, 120]);
    wasAtStop = at;
  }
  function updateLiveDir(tg = live.tg) {
    if (!tg || !state.pos || $('live').hidden) return;
    const b = bearing(state.pos, [tg.p.lat, tg.p.lon]);
    let rot = b, txt;
    if (nav.heading != null) {
      rot = (b - nav.heading + 360) % 360;
      txt = rot < 25 || rot > 335 ? 'Droit devant' : rot < 155 ? 'Sur votre droite' : rot <= 205 ? 'Derrière vous' : 'Sur votre gauche';
    } else txt = 'Vers ' + CARD[Math.round(b / 45) % 8];
    $('live-arrow').style.transform = `rotate(${rot.toFixed(0)}deg)`;
    $('live-dir-txt').textContent = txt;
  }
  $('live-pill').addEventListener('click', () => {
    live.open = !live.open;
    $('live').classList.toggle('open', live.open);
    $('live-pill').setAttribute('aria-expanded', String(live.open));
  });
  $('live-clear').addEventListener('click', () => { live.dest = null; store.set('liveDest', null); renderLive(); });
  $('live-act').addEventListener('click', () => {
    const tg = live.tg;
    if (!tg) return;
    if (tg.kind) { openDetail(tg.p, current, tg.kind); return; }
    if (tg.act === 'track') { show('screen-track'); return; }
    setOriginStop(tg.stop);
    destInput.focus();
    toast(`Départ : ${tg.stop.label}. Où allez-vous ?`);
  });
  function renderLoc() {
    const el = $('loc-chip');
    el.classList.remove('at-stop', 'near-stop'); el.style.removeProperty('--near');
    const actions = `<span class="loc-actions"><button class="link" data-geo="retry">Réessayer</button><button class="link" data-geo="stop">Choisir un arrêt</button><button class="link" data-geo="help">Aide GPS</button></span>`;
    if (!state.pos) {
      renderLive();
      if (state.geoError) {
        el.className = 'loc-chip warn';
        el.innerHTML = `${ic('pin')}<span>${esc(state.geoError)}<br><small>${esc(state.geoHelp || 'Vous pouvez saisir un arrêt de départ ci-dessous.')}</small>${actions}</span>`;
      } else {
        el.className = 'loc-chip';
        el.innerHTML = `<span class="spinner"></span><span>Recherche de votre position…<br><small>Vous pouvez aussi saisir un arrêt de départ.</small></span>`;
      }
      return;
    }
    const near = Core.nearbyStops(D, state.pos[0], state.pos[1], 3, 1)[0];
    const atStop = near && near.d <= AT_STOP_KM;
    // l'arrêt le plus proche, sa distance et la lueur verte sont dans l'activité en direct (#live)
    const nearTxt = !near ? 'Aucun arrêt de bus à moins de 3 km' : '';
    renderLive();
    if (state.manual) {
      el.className = 'loc-chip';
      el.innerHTML = `${ic('pin')}<span>Position <b>choisie sur la carte</b>${nearTxt ? `<br><small>${nearTxt}</small>` : ''}<span class="loc-actions"><button class="link" data-geo="fix">Modifier</button><button class="link" data-geo="gps">Revenir au GPS</button></span></span>`;
      return;
    }
    const acc = state.accuracy || 0;
    const where = state.placeName ? `Vous êtes à <b>${esc(state.placeName)}</b>` : (state.posStale ? 'Dernière position connue' : 'Position trouvée');
    let quality = '';
    if (!state.posStale && acc) {
      const lvl = acc <= 30 ? 'good' : acc <= 150 ? 'mid' : 'bad';
      quality = ` <span class="acc ${lvl}">± ${fmtDist(acc / 1000)}</span>`;
    }
    const warn = state.approx && !state.posStale
      ? `<br><small class="warn-txt">Position approximative : le navigateur n'a pas accès à la « position exacte ».</small>`
      : (!state.posStale && acc > 150 ? `<br><small class="warn-txt">Précision faible : vérifiez votre position ou corrigez-la.</small>` : '');
    el.className = 'loc-chip' + (state.approx || acc > 150 ? ' warn' : '');
    el.innerHTML = `${ic('pin')}<span>${where}${state.posStale ? ' <small>(mise à jour…)</small>' : quality}${nearTxt ? `<br><small>${nearTxt}</small>` : ''}${warn}<span class="loc-actions"><button class="link" data-geo="fix">${acc > 50 || state.posStale ? 'Position inexacte ? Corriger' : 'Corriger'}</button>${state.approx || acc > 150 ? '<button class="link" data-geo="help">Améliorer le GPS</button>' : ''}</span></span>`;
  }
  $('loc-chip').addEventListener('click', e => {
    const b = e.target.closest('[data-geo]');
    if (!b) return;
    const a = b.dataset.geo;
    if (a === 'retry') startGeo(true);
    else if (a === 'stop') originInput.focus();
    else if (a === 'fix') openFixPos();
    else if (a === 'help') openFixPos(null, true);
    else if (a === 'gps') useGps();
  });

  /* Localisation :
     - un suivi GPS précis permanent (jamais abandonné) ;
     - une position réseau rapide au démarrage, puis un suivi réseau de secours tant que le GPS n'a rien donné de bon ;
     - les mesures des dernières secondes sont combinées (pondérées par leur précision) quand on est immobile ;
     - l'utilisateur peut corriger sa position à la main ; elle est conservée tant qu'il ne s'est pas déplacé. */
  let watchHigh = null, watchLow = null, slowTimer = null, gotFix = false, approxCount = 0, bestSeen = Infinity;
  const fixes = [];
  function startGeo(manual) {
    if (!manual) {
      const cached = store.get('lastPos', null);
      if (cached && Array.isArray(cached.p) && Date.now() - cached.t < 3600e3) { state.pos = cached.p; state.posStale = true; }
    }
    state.geoError = null; state.geoHelp = null;
    renderLoc();
    const geo = navigator.geolocation;
    if (!geo) { setGeoError('Géolocalisation non disponible sur cet appareil.'); return; }
    if (!window.isSecureContext && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname) && location.protocol !== 'file:') {
      setGeoError('La localisation exige une adresse sécurisée (https).', 'Hébergez la page en https, ou saisissez un arrêt de départ.');
      return;
    }
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then(st => {
        if (st.state === 'denied') onPosErr({ code: 1 });
        st.onchange = () => { if (st.state === 'granted') startGeo(true); else if (st.state === 'denied') onPosErr({ code: 1 }); };
      }).catch(() => {});
    }
    if (watchHigh != null) geo.clearWatch(watchHigh);
    stopLowWatch();
    fixes.length = 0;
    // position rapide (réseau, au plus 1 min) pour afficher quelque chose tout de suite
    geo.getCurrentPosition(onPos, e => { if (e.code === 1) onPosErr(e); }, { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 });
    // suivi GPS précis, toujours actif
    watchHigh = geo.watchPosition(onPos, onPosErr, { enableHighAccuracy: true, maximumAge: 0 });
    clearTimeout(slowTimer);
    slowTimer = setTimeout(() => {
      if (bestSeen <= 100) return;
      if (watchLow == null) watchLow = geo.watchPosition(onPos, () => {}, { enableHighAccuracy: false, maximumAge: 30000 });
      if (!state.pos) setGeoError('La localisation met du temps à répondre.',
        'Activez la localisation (GPS) du téléphone et autorisez le navigateur, ou saisissez un arrêt de départ.');
    }, 10000);
  }
  function stopLowWatch() { if (watchLow != null) { navigator.geolocation.clearWatch(watchLow); watchLow = null; } }
  function setGeoError(msg, help) { state.geoError = msg; state.geoHelp = help || null; renderLoc(); }

  function fuse(c) {
    const now = Date.now();
    fixes.push({ lat: c.latitude, lon: c.longitude, acc: c.accuracy || 9999, t: now });
    while (fixes.length && now - fixes[0].t > 25000) fixes.shift();
    const last = fixes[fixes.length - 1];
    const moving = (c.speed != null && c.speed > 1.5) || !!state.tracking;
    if (moving || fixes.length < 2) return last;
    const best = Math.min(...fixes.map(f => f.acc));
    const lim = Math.max(25, best * 1.5);
    // on ne garde que les bonnes mesures cohérentes avec la dernière (sinon on s'est déplacé)
    const good = fixes.filter(f => f.acc <= lim && Core.haversine(f.lat, f.lon, last.lat, last.lon) * 1000 <= Math.max(f.acc, last.acc, 20) * 1.5);
    if (good.length < 2) return last.acc <= lim ? last : (good[0] || last);
    let w = 0, la = 0, lo = 0;
    good.forEach(f => { const k = 1 / (f.acc * f.acc); w += k; la += f.lat * k; lo += f.lon * k; });
    return { lat: la / w, lon: lo / w, acc: Math.max(best * 0.7, Math.sqrt(1 / w)) };
  }

  const renderBoardSoon = debounce(() => { if (current === 'screen-home') renderBoard(); if (typeof renderPhTeaser === 'function') { renderPhTeaser(); if (current === 'screen-pharma') renderPharma(); refreshLive(false); } }, 600);
  function onPos(p) {
    const c = p.coords;
    if (c.heading != null && Number.isFinite(c.heading) && (c.speed || 0) > 1.2) { nav.gpsT = Date.now(); setHeading(c.heading, 'gps'); }
    if (!Number.isFinite(c.latitude) || !Number.isFinite(c.longitude)) return;
    bestSeen = Math.min(bestSeen, c.accuracy || 9999);
    if (bestSeen <= 100) stopLowWatch();
    // « position approximative » : plusieurs mesures à ±1 km ou plus, jamais mieux que 500 m
    approxCount = c.accuracy >= 1000 ? approxCount + 1 : 0;
    state.approx = approxCount >= 2 && bestSeen > 500;
    // mesure bien pire que ce qu'on a déjà : ignorée
    if (gotFix && !state.posStale && !state.manual && c.accuracy > 3 * (state.accuracy || Infinity) && c.accuracy > 200) return;
    const f = fuse(c);
    gotFix = true;
    state.gpsLast = [f.lat, f.lon]; state.gpsAcc = f.acc;
    if (typeof asGpsWaiter === 'function') asGpsWaiter(f.lat, f.lon, f.acc);
    if (current === 'screen-fixpos') renderFpInfo();
    if (state.manual) {
      // on compare au GPS du moment de la correction : seul un vrai déplacement annule la correction
      const ref = state.manual.gpsRef || [state.manual.lat, state.manual.lon];
      const d = Core.haversine(ref[0], ref[1], f.lat, f.lon) * 1000;
      const expired = Date.now() - state.manual.t > 30 * 60e3;
      if (expired || (f.acc <= 50 && d > Math.max(200, 3 * f.acc))) { state.manual = null; toast('Vous vous êtes déplacé : position GPS reprise.'); }
      else return;
    }
    setPos(f.lat, f.lon, f.acc);
  }
  function setPos(lat, lon, acc) {
    const np = [lat, lon];
    const moved = state.pos && !state.posStale ? Core.haversine(state.pos[0], state.pos[1], lat, lon) : Infinity;
    const prevAcc = state.accuracy || Infinity;
    state.pos = np; state.posStale = false; state.geoError = null; state.geoHelp = null; state.accuracy = acc;
    resUser = userMarker(resMap, resUser);
    trkUser = userMarker(trkMap, trkUser);
    if (state.tracking) onTrackPos();
    renderLive();
    const accChanged = Math.abs(prevAcc - acc) > Math.max(10, prevAcc * 0.3);
    if (moved < 0.02 && !accChanged) return;
    if (!state.manual) store.set('lastPos', { p: np, t: Date.now() });
    renderLoc();
    if (moved >= 0.02) { reverseGeocode(lat, lon); renderBoardSoon(); }
  }
  function onPosErr(e) {
    if (e.code === 3) return; // délai dépassé : on continue d'attendre
    if (gotFix && !state.posStale) return;
    if (e.code === 1) {
      clearTimeout(slowTimer);
      if (state.geoError !== 'Localisation refusée.') toast('Localisation refusée. Vous pouvez choisir un arrêt de départ.', 'error', 5000);
      setGeoError('Localisation refusée.', 'Autorisez la position pour ce site dans les réglages du navigateur, ou saisissez un arrêt de départ.');
    } else if (!state.pos) {
      setGeoError('Position indisponible.', 'Activez la localisation (GPS) du téléphone, ou saisissez un arrêt de départ.');
    }
  }

  /* ---------- Corriger ma position ---------- */
  let fpMap = null, fpUser = null, fpBack = 'screen-home';
  function openFixPos(from, help) {
    fpBack = from || (current === 'screen-fixpos' ? 'screen-home' : current);
    $('fp-help').open = !!help;
    show('screen-fixpos');
  }
  function ensureFpMap() {
    renderFpInfo();
    if (!hasL) { mapOff('fp-map'); renderFpStops(); return; }
    if (!fpMap) {
      fpMap = baseMap($('fp-map'));
      fpMap.on('moveend', renderFpStops);
    }
    fpMap.invalidateSize();
    fpUser = userMarker(fpMap, fpUser);
    const c = state.manual ? [state.manual.lat, state.manual.lon] : (state.gpsLast || state.pos);
    if (c) fpMap.setView(c, 17); else fpMap.setView([5.33, -4.01], 12);
    renderFpStops();
  }
  function renderFpInfo() {
    $('fp-sub').textContent = state.gpsAcc ? `Signal GPS : précision ± ${fmtDist(state.gpsAcc / 1000)}` : 'Aucun signal GPS pour le moment';
    $('fp-gps').disabled = !state.gpsLast;
  }
  function renderFpStops() {
    const c = fpMap ? fpMap.getCenter() : (state.pos ? { lat: state.pos[0], lng: state.pos[1] } : null);
    const list = c ? Core.nearbyStops(D, c.lat, c.lng, 1, 6) : [];
    $('fp-stops').innerHTML = list.length
      ? list.map(n => `<button class="sg-item" data-fp-stop="${esc(n.stop.id)}"><span class="sg-ic">${ic('bus')}</span><span class="sg-main"><span class="sg-name">${esc(n.stop.label)}</span><span class="sg-lines">${linesHtml(n.stop)}</span></span><span class="sg-extra">${fmtDist(n.d)}</span></button>`).join('')
      : '<p class="muted">Aucun arrêt à proximité du repère.</p>';
  }
  function setManual(lat, lon, msg) {
    state.manual = { lat, lon, t: Date.now(), gpsRef: state.gpsLast && state.gpsAcc <= 300 ? state.gpsLast.slice() : null };
    state.placeName = null; lastGeo = null;
    setPos(lat, lon, 0);
    reverseGeocode(lat, lon);
    toast(msg || 'Position corrigée.', 'success');
    show(fpBack);
  }
  function useGps() {
    state.manual = null;
    if (state.gpsLast) setPos(state.gpsLast[0], state.gpsLast[1], state.gpsAcc);
    else startGeo(true);
    renderLoc();
    toast('Position GPS utilisée.');
  }
  $('fp-ok').onclick = () => {
    if (!fpMap) { toast('Carte indisponible : choisissez un arrêt dans la liste.', 'error'); return; }
    const c = fpMap.getCenter();
    setManual(c.lat, c.lng);
  };
  $('fp-gps').onclick = () => { useGps(); show(fpBack); };
  $('fp-stops').addEventListener('click', e => {
    const b = e.target.closest('[data-fp-stop]');
    if (!b) return;
    const st = D.byId.get(b.dataset.fpStop);
    if (st) setManual(st.lat, st.lon, `Position : arrêt ${st.label}.`);
  });
  $('fp-back').innerHTML = ic('back');
  $('fp-back').onclick = () => show(fpBack);

  /* ---------- Autocomplétion ---------- */
  const suggests = [];
  function closeSuggests() { suggests.forEach(s => s.close()); }
  const linesHtml = s => s.lines.slice(0, 6).map(n => lineBadge(n, true)).join('') + (s.lines.length > 6 ? `<small>+${s.lines.length - 6}</small>` : '');
  function stopItem(s, extra) {
    return { type: 'stop', stop: s, html: `<span class="sg-ic">${ic('bus')}</span><span class="sg-main"><span class="sg-name">${esc(s.label)}${s.custom ? '<span class="utag">ajouté</span>' : ''}</span><span class="sg-lines">${linesHtml(s)}</span></span>${extra ? `<span class="sg-extra">${extra}</span>` : ''}` };
  }
  const withDist = s => stopItem(s, state.pos ? fmtDist(dist(state.pos, s)) : '');

  function makeSuggest(input, box, { onPick, empty, onEnter }) {
    let items = [], active = -1;
    const render = () => {
      if (!items.length) { close(); return; }
      box.innerHTML = items.map((it, i) => it.head
        ? `<div class="sg-head">${esc(it.head)}</div>`
        : `<div class="sg-item${i === active ? ' active' : ''}" role="option" id="${box.id}-${i}" data-i="${i}" aria-selected="${i === active}">${it.html}</div>`).join('');
      box.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      if (active >= 0) { input.setAttribute('aria-activedescendant', `${box.id}-${active}`); const el = $(`${box.id}-${active}`); el && el.scrollIntoView({ block: 'nearest' }); }
      else input.removeAttribute('aria-activedescendant');
    };
    const update = () => {
      const q = input.value.trim();
      items = q ? Core.searchStops(D, q, 8).map(withDist) : (empty ? empty() : []);
      if (q && !items.length) items = [{ head: 'Aucun arrêt ne correspond' }];
      active = q ? items.findIndex(it => !it.head) : -1;
      render();
    };
    function close() { box.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); }
    const move = d => {
      const sel = items.map((it, i) => it.head ? -1 : i).filter(i => i >= 0);
      if (!sel.length) return;
      const pos = sel.indexOf(active);
      active = sel[(pos + d + sel.length) % sel.length] ?? sel[0];
      render();
    };
    const pick = i => { const it = items[i]; if (!it || it.head) return; close(); onPick(it); };
    input.addEventListener('input', debounce(update, 100));
    input.addEventListener('focus', update);
    input.addEventListener('blur', () => setTimeout(close, 150));
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { e.preventDefault(); box.hidden ? update() : move(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); if (!box.hidden) move(-1); }
      else if (e.key === 'Escape') close();
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (!box.hidden && active >= 0) pick(active); else { close(); onEnter && onEnter(); }
      }
    });
    box.addEventListener('pointerdown', e => {
      const el = e.target.closest('.sg-item');
      if (!el) return;
      e.preventDefault();
      pick(+el.dataset.i);
    });
    const api = { close, refresh: update };
    suggests.push(api);
    return api;
  }

  /* ---------- Accueil ---------- */
  const originInput = $('origin-input'), destInput = $('dest-input');
  function setOriginStop(s) { state.origin = s ? { type: 'stop', id: s.id } : null; originInput.value = s ? s.label : ''; syncClear(); }
  function setDest(s) { state.dest = s ? s.id : null; destInput.value = s ? s.label : ''; syncClear(); }
  function syncClear() {
    $('origin-clear').hidden = !originInput.value;
    $('dest-clear').hidden = !destInput.value;
  }

  makeSuggest(originInput, $('suggest-home'), {
    onPick: it => { if (it.type === 'gps') setOriginStop(null); else setOriginStop(it.stop); destInput.value ? runSearch() : destInput.focus(); },
    onEnter: () => destInput.focus(),
    empty: () => {
      const out = [{ type: 'gps', html: `<span class="sg-ic gps">${ic('locate')}</span><span class="sg-main"><span class="sg-name">Ma position actuelle</span></span>` }];
      if (state.pos) {
        const near = Core.nearbyStops(D, state.pos[0], state.pos[1], 1, 6);
        if (near.length) { out.push({ head: 'Arrêts à proximité' }); near.forEach(n => out.push(stopItem(n.stop, fmtDist(n.d)))); }
      }
      return out;
    }
  });
  makeSuggest(destInput, $('suggest-home'), {
    onPick: it => { setDest(it.stop); runSearch(); },
    onEnter: () => runSearch(),
    empty: () => {
      const out = [];
      const favs = state.profile.favorites.map(id => D.byId.get(id)).filter(Boolean);
      if (favs.length) { out.push({ head: 'Favoris' }); favs.forEach(s => out.push(withDist(s))); }
      const rec = state.recents.filter(id => !state.profile.favorites.includes(id)).map(id => D.byId.get(id)).filter(Boolean);
      if (rec.length) { out.push({ head: 'Récents' }); rec.forEach(s => out.push(withDist(s))); }
      return out;
    }
  });
  originInput.addEventListener('input', () => { state.origin = null; syncClear(); });
  destInput.addEventListener('input', () => { state.dest = null; syncClear(); });
  $('origin-clear').innerHTML = ic('close');
  $('dest-clear').innerHTML = ic('close');
  $('origin-clear').onclick = () => { setOriginStop(null); originInput.focus(); };
  $('dest-clear').onclick = () => { setDest(null); destInput.focus(); };
  $('swap-btn').innerHTML = ic('swap');
  $('swap-btn').onclick = () => {
    const o = state.origin ? D.byId.get(state.origin.id) : Core.resolveStop(D, originInput.value);
    const d = state.dest ? D.byId.get(state.dest) : Core.resolveStop(D, destInput.value);
    if (!o) {
      if (!d) { toast('Choisissez d\'abord un départ et une destination.'); return; }
      toast('Le départ est votre position : choisissez un arrêt de départ pour inverser.'); return;
    }
    setOriginStop(d || null); setDest(o);
  };
  $('search-btn').onclick = runSearch;

  function greeting() {
    const h = new Date().getHours();
    const hello = h < 5 || h >= 18 ? 'Bonsoir' : 'Bonjour';
    $('greet').textContent = `${hello}${state.profile.firstname ? ' ' + state.profile.firstname : ''} 👋 Où allez-vous ?`;
  }

  function renderHome() { greeting(); renderLoc(); renderBoard(); renderRecents(); }

  function renderBoard() {
    const el = $('fav-board');
    const favs = state.profile.favorites.filter(id => D.byId.has(id));
    if (!favs.length) {
      el.innerHTML = `<div class="empty"><p>Ajoutez vos destinations habituelles (maison, travail…) pour voir ici le meilleur bus depuis votre position.</p><button class="btn ghost sm" data-go="screen-profile">${ic('starO')}Ajouter un favori</button></div>`;
      return;
    }
    const origin = state.pos ? { lat: state.pos[0], lon: state.pos[1] } : null;
    const rows = favs.map((id, i) => {
      const s = D.byId.get(id);
      const res = origin ? Core.findRoutes(D, origin, id) : null;
      const r = res && res.routes[0];
      const bus = r ? r.legs.map(l => l.line.num).join('›') : res && res.status === 'near' ? 'À pied' : '—';
      const dep = r ? r.legs[0].board.name : !origin ? 'Localisation…' : res.status === 'near' ? 'Vous y êtes presque' : 'Aucun trajet';
      return `<button class="board-row" style="animation-delay:${i * 90}ms" data-fav="${esc(id)}" title="${esc(`Aller à ${s.label}`)}"><span class="b-bus">${esc(bus)}</span><span>${esc(dep)}</span><span>${esc(s.label)}</span><span class="b-time">${r ? fmtMin(r.totalMin) : ''}</span></button>`;
    });
    el.innerHTML = `<div class="board"><div class="board-row head"><span>Ligne</span><span>Départ</span><span>Vers</span><span class="b-time">Durée</span></div>${rows.join('')}</div>`;
  }
  $('fav-board').addEventListener('click', e => {
    const row = e.target.closest('[data-fav]');
    if (!row) return;
    setOriginStop(null); setDest(D.byId.get(row.dataset.fav)); runSearch();
  });
  $('manage-fav').onclick = () => show('screen-profile');

  function renderRecents() {
    const ids = state.recents.filter(id => D.byId.has(id));
    $('recents-section').hidden = !ids.length;
    $('recents').innerHTML = ids.map(id => `<button class="chip" data-recent="${esc(id)}">${ic('clock')}<span>${esc(D.byId.get(id).label)}</span></button>`).join('');
  }
  $('recents').addEventListener('click', e => {
    const c = e.target.closest('[data-recent]');
    if (c) { setDest(D.byId.get(c.dataset.recent)); runSearch(); }
  });
  $('clear-recents').onclick = () => { state.recents = []; store.set('recents', []); renderRecents(); };
  function addRecent(id) {
    state.recents = [id, ...state.recents.filter(x => x !== id)].slice(0, 6);
    store.set('recents', state.recents);
  }

  /* ---------- Recherche ---------- */
  function getOrigin() {
    if (state.origin && D.byId.has(state.origin.id)) {
      const s = D.byId.get(state.origin.id);
      return { lat: s.lat, lon: s.lon, stopId: s.id, label: s.label };
    }
    const txt = originInput.value.trim();
    if (txt) {
      const s = Core.resolveStop(D, txt);
      if (s) { setOriginStop(s); return getOrigin(); }
      return { error: `Arrêt de départ « ${txt} » introuvable : choisissez-le dans la liste.` };
    }
    if (state.pos) return { lat: state.pos[0], lon: state.pos[1], label: 'Ma position' };
    return { error: 'Position inconnue : activez la localisation ou choisissez un arrêt de départ.' };
  }
  function getDest() {
    if (state.dest && D.byId.has(state.dest)) return D.byId.get(state.dest);
    const s = Core.resolveStop(D, destInput.value);
    if (s) setDest(s);
    return s;
  }

  function runSearch() {
    closeSuggests();
    const dest = getDest();
    if (!dest) {
      toast(destInput.value.trim() ? 'Destination introuvable : choisissez un arrêt dans la liste.' : 'Indiquez votre destination.', 'error');
      destInput.focus(); return;
    }
    const origin = getOrigin();
    if (origin.error) { toast(origin.error, 'error', 5000); originInput.focus(); return; }
    searchRoutes(origin, dest, $('search-btn'));
  }

  /* Recherche vers un arrêt (dest.id) ou vers un lieu quelconque (dest.place : pharmacie…) */
  function searchRoutes(origin, dest, btn) {
    if (btn) { btn.classList.add('loading'); btn.disabled = true; }
    setTimeout(() => {
      try {
        const res = Core.findRoutes(D, origin, dest.place ? { lat: dest.lat, lon: dest.lon } : dest.id);
        if (res.status === 'near') {
          toast(res.walkKm < 0.03 ? 'Vous êtes déjà à destination !' :
            `${dest.label} est à ${fmtDist(res.walkKm)} : environ ${fmtMin(Core.walkMin(res.walkKm * Core.CFG.DETOUR))} à pied.`, 'success', 5000);
          return;
        }
        if (res.status === 'noStops') { toast('Aucun arrêt de bus à moins de 2 km de votre point de départ.', 'error', 5000); return; }
        if (res.status === 'noDestStops') { toast(`Aucun arrêt de bus à moins de 800 m de ${dest.label}.`, 'error', 5000); return; }
        state.lastSearch = { origin, dest, res };
        state.routes = res.routes; state.selected = 0;
        if (dest.id) addRecent(dest.id);
        state.resBack = dest.place ? current : 'screen-home';
        renderResults();
        show('screen-results');
      } catch (e) {
        console.error(e);
        toast('Erreur lors du calcul de l\'itinéraire.', 'error');
      } finally { if (btn) { btn.classList.remove('loading'); btn.disabled = false; } }
    }, 20);
  }

  /* ---------- Résultats ---------- */
  function renderResults() {
    const { origin, dest } = state.lastSearch;
    $('res-sub').innerHTML = `${esc(origin.label)} → <b>${esc(dest.label)}</b>`;
    updateFavToggle();
    const list = $('res-list');
    if (!state.routes.length) {
      list.innerHTML = `<div class="empty">${ic('bus')}<p><b>Aucun itinéraire trouvé</b></p><p>Aucune ligne, même avec deux correspondances, ne relie ces arrêts dans nos données. Essayez un arrêt voisin.</p></div>`;
      return;
    }
    let html = '', lastT = -1;
    const titles = ['Trajets directs', 'Avec une correspondance', 'Avec deux correspondances'];
    state.routes.forEach((r, i) => {
      if (r.transfers !== lastT) { html += `<div class="group-title">${titles[r.transfers]}</div>`; lastT = r.transfers; }
      html += routeCard(r, i);
    });
    list.innerHTML = html;
  }

  // Prix : somme des tarifs connus, et mention des trajets dont le tarif est inconnu (gbaka, woro-woro…)
  function costText(r) {
    const unknown = [...new Set(r.legs.filter(l => !l.line.cost).map(l => l.line.veh.toLowerCase()))];
    if (!r.cost && !unknown.length) return '';
    if (!r.cost) return ` · tarif ${unknown.join(' / ')} non renseigné`;
    return ' · ' + fmtCost(r.cost) + (unknown.length ? ` + ${unknown.join(' / ')}` : '');
  }
  function routeCard(r, i) {
    const chain = [];
    if (r.walkStartKm > 0.02) chain.push(`<span class="walk">${ic('walk')}<small>${fmtDist(r.walkStartKm)}</small></span>`);
    r.legs.forEach(l => { if (chain.length) chain.push('<span class="chev">›</span>'); chain.push(lineBadge(l.line.num)); });
    if (r.walkEndKm > 0.02) chain.push(`<span class="chev">›</span><span class="walk">${ic('walk')}<small>${fmtDist(r.walkEndKm)}</small></span>`);
    const steps = r.legs.map((l, k) => {
      const n = l.to - l.from;
      return `<li><span class="lg-dot" style="--c:${lineColor(l.line.num)}"></span><div><b>${k === 0 ? 'Montez' : 'Correspondance'} à ${esc(l.board.name)}</b>${l.walkBeforeKm > 0.02 ? ` <small>(${fmtDist(l.walkBeforeKm)} à pied)</small>` : ''}<br><small>${l.line.veh} ${esc(l.line.num)} direction ${esc(direction(l.line))} · ${n} arrêt${n > 1 ? 's' : ''}</small></div></li>`;
    }).join('') + `<li><span class="lg-dot end"></span><div><b>Descendez à ${esc(r.legs[r.legs.length - 1].alight.name)}</b>${r.walkEndKm > 0.02 ? ` <small>puis ${fmtDist(r.walkEndKm)} à pied</small>` : ''}</div></li>`;
    return `<article class="route-card${i === state.selected ? ' selected' : ''}" data-i="${i}" tabindex="0" aria-label="Itinéraire ${i + 1}, ${fmtMin(r.totalMin)}">
      <div class="rc-top"><div class="chain">${chain.join('')}</div><div class="rc-time"><b>${fmtMin(r.totalMin)}</b><small>estimé</small></div></div>
      <ul class="rc-steps">${steps}</ul>
      <div class="rc-foot"><span>${r.nStops} arrêt${r.nStops > 1 ? 's' : ''}${costText(r)}${i === 0 ? '<span class="tag">Le plus rapide</span>' : ''}</span><button class="btn primary sm" data-track="${i}">Suivre</button></div>
    </article>`;
  }

  function selectRoute(i) {
    state.selected = i;
    document.querySelectorAll('.route-card').forEach(c => c.classList.toggle('selected', +c.dataset.i === i));
    drawResults(true);
  }
  $('res-list').addEventListener('click', e => {
    const t = e.target.closest('[data-track]');
    if (t) { startTracking(+t.dataset.track); return; }
    const c = e.target.closest('.route-card');
    if (c) { selectRoute(+c.dataset.i); sheets['screen-results'] && sheets['screen-results'].snapTo(0); }
  });
  $('res-list').addEventListener('keydown', e => {
    const c = e.target.closest('.route-card');
    if (c && (e.key === 'Enter' || e.key === ' ') && e.target === c) { e.preventDefault(); selectRoute(+c.dataset.i); }
  });

  function ensureResMap() {
    if (!hasL) { mapOff('res-map'); return; }
    if (!resMap) { resMap = baseMap($('res-map')); resLayer = L.layerGroup().addTo(resMap); }
    resMap.invalidateSize();
    resUser = userMarker(resMap, resUser);
    drawResults(true);
  }
  function drawResults(fit) {
    if (!resMap || !state.lastSearch) return;
    const r = state.routes[state.selected];
    if (r) drawRoute(resMap, resLayer, r, state.lastSearch.origin.stopId ? null : state.lastSearch.origin, fit, state.lastSearch.dest);
    else {
      resLayer.clearLayers();
      const d = state.lastSearch.dest;
      L.marker([d.lat, d.lon], { icon: pinIcon() }).bindPopup(esc(d.label)).addTo(resLayer);
      resMap.setView([d.lat, d.lon], 15);
    }
  }

  function updateFavToggle() {
    const id = state.lastSearch && state.lastSearch.dest.id;
    const on = id && state.profile.favorites.includes(id);
    const b = $('fav-toggle');
    b.hidden = !id;
    b.innerHTML = ic(on ? 'star' : 'starO');
    b.classList.toggle('on', !!on);
    b.setAttribute('aria-label', on ? 'Retirer des favoris' : 'Ajouter aux favoris');
  }
  $('fav-toggle').onclick = () => { const id = state.lastSearch && state.lastSearch.dest.id; if (id) toggleFav(id); updateFavToggle(); };
  function toggleFav(id) {
    const f = state.profile.favorites;
    const s = D.byId.get(id);
    if (f.includes(id)) { state.profile.favorites = f.filter(x => x !== id); toast(`${s.label} retiré des favoris.`); }
    else {
      if (f.length >= FAV_LIMIT) { toast(`Maximum ${FAV_LIMIT} favoris. Retirez-en un dans votre profil.`, 'error'); return false; }
      f.push(id); toast(`${s.label} ajouté aux favoris.`, 'success');
    }
    saveProfile();
    return true;
  }

  /* ---------- Suivi du trajet ---------- */
  let wakeLock = null;
  async function requestWakeLock() { try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (_) {} }
  function releaseWakeLock() { try { wakeLock && wakeLock.release(); } catch (_) {} wakeLock = null; }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && state.tracking) requestWakeLock(); });

  function buildTrackPoints(r) {
    const pts = [];
    r.legs.forEach((leg, li) => {
      const last = li === r.legs.length - 1;
      leg.stops.forEach((s, k) => {
        const p = { id: s.id, name: s.name, lat: s.lat, lon: s.lon, line: leg.line.num, veh: leg.line.veh.toLowerCase(), kind: 'stop' };
        if (k === 0) {
          p.kind = li === 0 ? 'board' : 'transfer-on';
          if (li > 0) {
            const prev = pts[pts.length - 1];
            if (prev && prev.id === s.id) { prev.kind = 'transfer'; prev.nextLine = leg.line.num; prev.nextVeh = leg.line.veh.toLowerCase(); return; }
            p.walkKm = leg.walkBeforeKm;
          }
        }
        if (k === leg.stops.length - 1) p.kind = last ? 'alight' : 'transfer-off';
        pts.push(p);
      });
    });
    pts.forEach((p, i) => { if (p.kind === 'transfer-off') p.nextName = pts[i + 1] && pts[i + 1].name; });
    return pts;
  }
  function hint(p) {
    switch (p.kind) {
      case 'board': return `Montez dans le ${p.veh} ${p.line}`;
      case 'transfer': return `Descendez et prenez le ${p.nextVeh} ${p.nextLine}`;
      case 'transfer-off': return `Descendez, puis marchez jusqu'à ${p.nextName}`;
      case 'transfer-on': return `Prenez le ${p.veh} ${p.line}${p.walkKm ? ` (${fmtDist(p.walkKm)} à pied)` : ''}`;
      case 'alight': return 'Descendez ici : vous êtes arrivé';
      default: return `${p.veh.charAt(0).toUpperCase() + p.veh.slice(1)} ${p.line}`;
    }
  }

  function startTracking(i) {
    const r = state.routes[i];
    if (!r) return;
    if (state.tracking && !confirm('Un trajet est déjà suivi. Le remplacer ?')) return;
    state.selected = i;
    state.tracking = { r, pts: buildTrackPoints(r), idx: -1, alerted: new Set(), arrived: false, dest: state.lastSearch.dest.label, destObj: state.lastSearch.dest, origin: state.lastSearch.origin };
    $('nav-badge').hidden = false;
    trkFollow = true; trkRotate = true;
    show('screen-track');
    renderTracking(true);
    requestWakeLock();
    if (state.pos) onTrackPos();
  }

  function setIdx(j, auto) {
    const t = state.tracking;
    if (!t) return;
    j = Math.max(-1, Math.min(t.pts.length - 1, j));
    if (j === t.idx) return;
    t.idx = j;
    const p = t.pts[j];
    if (p && p.kind === 'alight') {
      if (!t.arrived) { t.arrived = true; vibrate([300, 120, 300]); toast(`Vous êtes arrivé à ${p.name} !`, 'success', 7000, { text: 'Terminer', fn: endTracking }); }
    } else if (auto && p && p.kind !== 'stop') { vibrate(200); toast(hint(p), 'info', 5000); }
    renderTracking(false, true);
  }

  function onTrackPos() {
    const t = state.tracking;
    if (!t || !state.pos) return;
    let best = -1, bd = Infinity;
    for (let j = Math.max(0, t.idx); j < t.pts.length; j++) {
      const d = dist(state.pos, t.pts[j]);
      if (d < bd) { bd = d; best = j; }
    }
    if (best >= 0 && bd <= 0.12 && best > t.idx) setIdx(best, true);
    const nx = t.pts[t.idx + 1];
    if (t.idx >= 0 && nx && ['alight', 'transfer', 'transfer-off'].includes(nx.kind) && dist(state.pos, nx) < 0.45 && !t.alerted.has(t.idx + 1)) {
      t.alerted.add(t.idx + 1);
      vibrate([200, 100, 200]);
      toast(`Préparez-vous : descendez au prochain arrêt, ${nx.name}.`, 'info', 6000);
    }
    renderTracking(false);
  }

  function remainingMin(t) {
    const from = Math.max(0, t.idx);
    let km = 0;
    for (let j = from + 1; j < t.pts.length; j++) km += Core.haversine(t.pts[j - 1].lat, t.pts[j - 1].lon, t.pts[j].lat, t.pts[j].lon);
    let m = km / Core.CFG.BUS_KMH * 60 + (t.pts.length - 1 - from) * Core.CFG.DWELL_MIN;
    if (t.idx < 0 && state.pos) m += Core.walkMin(dist(state.pos, t.pts[0]) * Core.CFG.DETOUR);
    return m;
  }

  function renderTracking(fit, scroll) {
    const t = state.tracking;
    if (!t) return;
    const n = t.pts.length;
    renderLive();
    $('trk-sub').textContent = `Vers ${t.dest} · ${t.r.legs.map(l => l.line.veh.toLowerCase() + ' ' + l.line.num).join(' puis ')}`;
    if (t.idx < 0) {
      const p0 = t.pts[0];
      $('trk-label').textContent = 'Rendez-vous à l\'arrêt';
      $('trk-next').textContent = p0.name;
      $('trk-hint').textContent = state.pos ? `À ${fmtDist(dist(state.pos, p0))} · ~${fmtMin(Core.walkMin(dist(state.pos, p0) * Core.CFG.DETOUR))} à pied, puis ${p0.veh} ${p0.line}` : `Puis montez dans le ${p0.veh} ${p0.line}`;
    } else if (t.arrived) {
      $('trk-label').textContent = 'Arrivé';
      $('trk-next').textContent = t.pts[n - 1].name;
      $('trk-hint').textContent = 'Bon trajet avec ZUPA !';
    } else {
      const cur = t.pts[t.idx], nx = t.pts[t.idx + 1];
      $('trk-label').textContent = 'Prochain arrêt';
      $('trk-next').textContent = nx.name;
      $('trk-hint').textContent = nx.kind !== 'stop' ? hint(nx) : (cur.kind !== 'stop' && cur.kind !== 'alight' ? hint(cur) : `${nx.veh.charAt(0).toUpperCase() + nx.veh.slice(1)} ${nx.line} · encore ${n - 1 - t.idx} arrêt${n - 1 - t.idx > 1 ? 's' : ''}`);
    }
    const pct = t.idx < 0 ? 0 : Math.round(t.idx / Math.max(1, n - 1) * 100);
    $('trk-bar').style.width = pct + '%';
    $('trk-progress').setAttribute('aria-valuenow', pct);
    $('trk-count').textContent = `${Math.max(0, t.idx + 1)}/${n} arrêts`;
    $('trk-eta').textContent = t.arrived ? '' : `~${fmtMin(remainingMin(t))} restantes`;
    $('trk-step').disabled = t.idx >= n - 1;
    $('trk-prev').disabled = t.idx < 0;
    $('trk-step').textContent = t.idx < 0 ? 'Je suis à bord' : 'Arrêt suivant';

    $('trk-list').innerHTML = t.pts.map((p, j) => {
      const cls = [j < t.idx ? 'passed' : '', j === t.idx ? 'current' : '', p.kind !== 'stop' ? 'key' : ''].join(' ');
      const sub = p.kind !== 'stop' ? hint(p) : (j === t.idx ? 'Vous êtes ici' : '');
      return `<li class="${cls}" data-j="${j}" style="--c:${lineColor(p.line)}"><span class="tl-dot"></span><div><div class="tl-name">${esc(p.name)}</div>${sub ? `<div class="tl-sub">${esc(sub)}</div>` : ''}</div></li>`;
    }).join('');
    if (scroll && t.idx >= 0) { // défile seulement dans le panneau, pas l'écran
      const li = $('trk-list').children[t.idx], body = $('trk-sheet').querySelector('.sheet-body');
      if (li) body.scrollTo({ top: Math.max(0, li.offsetTop - body.clientHeight / 3), behavior: 'smooth' });
    }

    if (trkMap) {
      if (fit) drawRoute(trkMap, trkLayer, t.r, t.origin.stopId ? null : t.origin, true, t.destObj);
      const p = t.pts[Math.max(0, t.idx)];
      if (trkCur) trkCur.setLatLng([p.lat, p.lon]);
      else trkCur = L.marker([p.lat, p.lon], { icon: mkIcon('mk-current', 22), zIndexOffset: 900, interactive: false }).addTo(trkMap);
      if (!fit && trkFollow) panVisible(trkMap, state.pos && !state.posStale ? state.pos : [p.lat, p.lon], { animate: true, duration: 0.5 });
    }
  }

  function ensureTrkMap() {
    if (!state.tracking) return;
    if (!hasL) { mapOff('trk-map'); return; }
    if (!trkMap) {
      trkMap = baseMap($('trk-map'), {
        // bouton de position : suivre (nord en haut) <-> suivre en tournant dans le sens de la marche
        onLocate: () => {
          if (trkFollow) { trkRotate = !trkRotate; if (!trkRotate) trkMap.setBearing(0); }
          trkFollow = true; syncNavFab(); applyHeading();
          if (state.pos) trkMap.setView(visibleCenter(trkMap, state.pos, Math.max(trkMap.getZoom(), 17)), Math.max(trkMap.getZoom(), 17), { animate: true });
          toast(trkRotate ? 'La carte tourne dans votre sens de marche.' : 'Nord en haut.');
          return false;
        },
        onNorth: () => { trkRotate = false; syncNavFab(); }
      });
      trkLayer = L.layerGroup().addTo(trkMap);
      trkMap.on('dragstart', () => { trkFollow = false; syncNavFab(); });
    }
    trkMap.invalidateSize();
    trkUser = userMarker(trkMap, trkUser);
    renderTracking(true);
    syncNavFab();
    if (trkFollow && state.pos) setTimeout(() => { trkMap.setView(visibleCenter(trkMap, state.pos, Math.max(trkMap.getZoom(), 17)), Math.max(trkMap.getZoom(), 17)); applyHeading(); }, 400);
  }

  function syncNavFab() {
    if (!trkMap || !trkMap._locate) return;
    trkMap._locate.classList.toggle('on', trkFollow);
    trkMap._locate.innerHTML = ic(trkFollow && trkRotate ? 'navigation' : 'locate');
  }
  function endTracking() {
    if (!state.tracking) return;
    state.tracking = null;
    releaseWakeLock();
    $('nav-badge').hidden = true;
    if (trkLayer) trkLayer.clearLayers();
    if (trkCur) { trkCur.remove(); trkCur = null; }
    exitFull();
    toast('Trajet terminé.', 'success');
    show('screen-home');
  }

  $('trk-step').onclick = () => state.tracking && setIdx(state.tracking.idx + 1, false);
  $('trk-prev').onclick = () => { if (!state.tracking) return; state.tracking.arrived = false; setIdx(state.tracking.idx - 1, false); };
  $('trk-list').addEventListener('click', e => { const li = e.target.closest('[data-j]'); if (li && state.tracking) { state.tracking.arrived = false; setIdx(+li.dataset.j, false); } });
  $('trk-stop').onclick = () => { if (confirm('Terminer le suivi de ce trajet ?')) endTracking(); };
  function exitFull() {}

  /* ---------- Profil ---------- */
  function renderProfile() {
    $('pf-first').value = state.profile.firstname || '';
    $('pf-last').value = state.profile.lastname || '';
    const favs = state.profile.favorites.map(id => D.byId.get(id)).filter(Boolean);
    $('fav-list').innerHTML = favs.length
      ? favs.map(s => `<li>${ic('star')}<span>${esc(s.label)}</span><button class="btn ghost sm" data-remove="${esc(s.id)}" aria-label="Retirer ${esc(s.label)}">Retirer</button></li>`).join('')
      : `<li class="muted">Aucun favori pour l'instant (${FAV_LIMIT} maximum).</li>`;
    renderCustomList();
    renderMyPlaces();
    $('data-stats').textContent = `${D.lines.length} trajets de bus et ${D.stops.length} arrêts intégrés à l'application. Vos favoris et réglages restent sur cet appareil.`;
    applyTheme();
  }
  $('profile-form').addEventListener('submit', e => {
    e.preventDefault();
    state.profile.firstname = $('pf-first').value.trim();
    state.profile.lastname = $('pf-last').value.trim();
    saveProfile(); greeting();
    toast('Profil enregistré.', 'success');
  });
  makeSuggest($('fav-input'), $('suggest-fav'), {
    onPick: it => {
      if (state.profile.favorites.includes(it.stop.id)) toast(`${it.stop.label} est déjà dans vos favoris.`);
      else if (toggleFav(it.stop.id) !== false) { $('fav-input').value = ''; renderProfile(); }
    }
  });
  $('fav-list').addEventListener('click', e => {
    const b = e.target.closest('[data-remove]');
    if (b) { toggleFav(b.dataset.remove); renderProfile(); }
  });
  $('theme-seg').addEventListener('click', e => { const b = e.target.closest('[data-theme]'); if (b) setTheme(b.dataset.theme); });
  $('theme-quick').onclick = () => setTheme(isDark() ? 'light' : 'dark');
  $('reset-data').onclick = () => {
    if (!confirm('Effacer votre profil, vos favoris et votre historique sur cet appareil ?')) return;
    store.clearAll(); location.reload();
  };

  /* ---------- Arrêts ajoutés par l'utilisateur ---------- */
  const saveCustom = () => { try { localStorage.setItem('zupa:customStops', JSON.stringify(customStops)); } catch (_) { toast('Stockage plein : arrêt non enregistré.', 'error'); } };
  const lineByName = name => D.lines.find(l => l.name === name);
  const lineNums = () => [...new Set(D.lines.map(l => l.num))].sort((a, b) => (parseInt(a, 10) - parseInt(b, 10)) || a.localeCompare(b));
  let draft = null, asMap = null, asMarker = null, asContext = null, asBackTo = 'screen-profile';

  function openAddStop(editId, from) {
    asBackTo = from || current;
    const ex = editId && customStops.find(c => c.id === editId);
    draft = ex
      ? { id: ex.id, name: ex.name, lat: ex.lat, lon: ex.lon, links: (ex.links || []).filter(n => lineByName(n)), note: ex.note || '', created: ex.created }
      : { id: null, name: '', lat: null, lon: null, links: [], note: '' };
    $('as-title').textContent = ex ? 'Modifier l\'arrêt' : 'Nouvel arrêt';
    $('as-name').value = draft.name;
    $('as-note').value = draft.note;
    $('as-delete').hidden = !ex;
    $('as-name-hint').hidden = true;
    fillBusSelect();
    show('screen-addstop');
    if (!ex && state.pos && !state.posStale) setDraftPos(state.pos[0], state.pos[1], state.accuracy, true);
    else renderDraftPos();
    renderLinks();
    if (!ex) setTimeout(() => $('as-name').focus(), 300);
  }

  function fillBusSelect() {
    const kindOf = n => (D.lines.find(l => l.num === n) || {}).kind;
    const opt = n => `<option value="${esc(n)}">${esc(n)}</option>`;
    const nums = lineNums();
    const gb = nums.filter(n => kindOf(n) !== 'bus');
    $('as-bus').innerHTML = '<option value="">Ligne</option><optgroup label="Bus">' + nums.filter(n => kindOf(n) === 'bus').map(opt).join('') + '</optgroup>'
      + (gb.length ? '<optgroup label="Gbaka / woro-woro">' + gb.map(n => `<option value="${esc(n)}">${esc(n)} · ${esc((D.lines.find(l => l.num === n).title || '').split('→')[0])}</option>`).join('') + '</optgroup>' : '');
    fillDirSelect();
  }
  function fillDirSelect() {
    const num = $('as-bus').value;
    const variants = D.lines.filter(l => l.num === num);
    $('as-dir').disabled = !num;
    $('as-add-link').disabled = !num;
    if (!num) { $('as-dir').innerHTML = '<option value="">Choisissez d\'abord le bus</option>'; return; }
    const opts = variants.map(l => `<option value="${esc(l.name)}">${esc(l.title || l.name)}</option>`);
    if (variants.length > 1) opts.unshift('<option value="*">Les deux sens</option>');
    $('as-dir').innerHTML = opts.join('');
    $('as-dir').value = variants.length > 1 ? '*' : variants[0].name;
  }
  $('as-bus').addEventListener('change', fillDirSelect);

  const isSelf = st => draft && draft.id && D.byId.get(st.id) && D.byId.get(st.id).custom && Core.norm(st.name) === Core.norm(draft.name);

  $('as-add-link').onclick = () => {
    const num = $('as-bus').value, dir = $('as-dir').value;
    if (!num) return;
    const names = dir === '*' ? D.lines.filter(l => l.num === num).map(l => l.name) : [dir];
    let added = 0;
    names.forEach(n => { if (!draft.links.includes(n)) { draft.links.push(n); added++; } });
    if (!added) toast('Ce bus est déjà ajouté.');
    $('as-bus').value = ''; fillDirSelect();
    renderLinks();
  };

  function renderLinks() {
    const ul = $('as-links');
    if (!draft.links.length) { ul.innerHTML = ''; return; }
    ul.innerHTML = draft.links.map((n, i) => {
      const l = lineByName(n);
      if (!l) return '';
      let where = '';
      if (draft.lat != null) {
        const ip = Core.insertionPoint(l.stops.filter(x => !isSelf(x)), draft.lat, draft.lon);
        const pos = ip.prev && ip.next ? `entre ${esc(ip.prev.name)} et ${esc(ip.next.name)}` : ip.prev ? `après ${esc(ip.prev.name)} (terminus)` : `avant ${esc(ip.next.name)} (départ)`;
        where = ip.nearestKm > 1
          ? `<br><small class="warn">Attention : à ${fmtDist(ip.nearestKm)} du tracé connu de ce bus. Vérifiez le bus ou l'emplacement.</small>`
          : `<br><small>Placé ${pos}</small>`;
      }
      return `<li>${lineBadge(l.num)}<div><b>${esc(l.title || l.name)}</b>${where}</div><button type="button" class="x-btn" data-unlink="${i}" aria-label="Retirer ce bus">${ic('close')}</button></li>`;
    }).join('');
  }
  $('as-links').addEventListener('click', e => {
    const b = e.target.closest('[data-unlink]');
    if (b) { draft.links.splice(+b.dataset.unlink, 1); renderLinks(); }
  });

  function setDraftPos(lat, lon, acc, fly) {
    draft.lat = +(+lat).toFixed(6); draft.lon = +(+lon).toFixed(6); draft.acc = acc || null;
    renderDraftPos(fly);
    renderLinks();
    checkName();
  }
  function renderDraftPos(fly) {
    const has = draft && draft.lat != null;
    $('as-coords').innerHTML = has
      ? `Emplacement : <b>${draft.lat.toFixed(5)}, ${draft.lon.toFixed(5)}</b>${draft.acc ? ` · précision ~${fmtDist(draft.acc / 1000)}` : ''}`
      : 'Aucun emplacement choisi';
    $('as-lat').value = has ? draft.lat : '';
    $('as-lon').value = has ? draft.lon : '';
    if (!asMap) return;
    if (has) {
      if (asMarker) asMarker.setLatLng([draft.lat, draft.lon]);
      else {
        asMarker = L.marker([draft.lat, draft.lon], { icon: pinIcon(), draggable: true, zIndexOffset: 1000 }).addTo(asMap);
        asMarker.on('dragend', () => { const p = asMarker.getLatLng(); setDraftPos(p.lat, p.lng, null); });
      }
      if (fly) asMap.setView([draft.lat, draft.lon], 17);
    } else if (asMarker) { asMarker.remove(); asMarker = null; }
  }

  function ensureAsMap() {
    if (!draft) { show('screen-profile'); return; }
    if (!hasL) { mapOff('as-map'); $('as-manual').hidden = false; return; }
    if (!asMap) {
      asMap = baseMap($('as-map'), { canvas: true });
      asContext = L.layerGroup();
      asMap.on('click', e => setDraftPos(e.latlng.lat, e.latlng.lng, null));
    }
    asMap.invalidateSize();
    asContext.clearLayers();
    D.all.forEach(s => L.circleMarker([s.lat, s.lon], { radius: 4, color: '#5f6368', weight: 1.5, fillColor: '#fff', fillOpacity: 1 })
      .bindTooltip(esc(s.label), { direction: 'top', className: 'gm-tip' }).addTo(asContext));
    gate(asMap, asMap, asContext, 15);
    if (asMarker) { asMarker.remove(); asMarker = null; }
    renderDraftPos(true);
    if (draft.lat == null) asMap.setView(state.pos || [5.33, -4.01], state.pos ? 16 : 12);
  }

  let asGpsWaiter = null; // réutilise aussi le suivi de position déjà actif
  $('as-gps').onclick = () => {
    if (!navigator.geolocation) { toast('Géolocalisation non disponible : touchez la carte.', 'error'); return; }
    const b = $('as-gps');
    if (asGpsWaiter) return;
    b.classList.add('loading'); b.disabled = true;
    let finished = false;
    const finish = (p, err) => {
      if (finished) return; finished = true; asGpsWaiter = null; clearTimeout(timer);
      b.classList.remove('loading'); b.disabled = false;
      if (p) {
        setDraftPos(p.lat, p.lon, p.acc, true);
        if (p.acc > 100) toast(`Précision faible (~${fmtDist(p.acc / 1000)}). Ajustez le repère sur la carte si besoin.`, 'info', 5000);
      } else {
        toast(err === 1 ? 'Localisation refusée : touchez la carte pour placer l\'arrêt.' : 'Position introuvable : touchez la carte pour placer l\'arrêt.', 'error', 5000);
        $('as-manual').hidden = hasL;
      }
    };
    asGpsWaiter = (lat, lon, acc) => finish({ lat, lon, acc });
    const timer = setTimeout(() => {
      // pas de nouvelle mesure : on prend la dernière position connue si elle existe
      if (state.pos && !state.posStale) finish({ lat: state.pos[0], lon: state.pos[1], acc: state.accuracy });
      else finish(null, 3);
    }, 15000);
    navigator.geolocation.getCurrentPosition(
      p => finish({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }),
      e => { if (e.code === 1) finish(null, 1); },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 });
  };
  const manualPos = () => {
    const lat = parseFloat($('as-lat').value.replace(',', '.')), lon = parseFloat($('as-lon').value.replace(',', '.'));
    if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) setDraftPos(lat, lon, null, true);
  };
  $('as-lat').addEventListener('change', manualPos);
  $('as-lon').addEventListener('change', manualPos);

  function similarStop() {
    const k = Core.norm(draft.name);
    if (!k || draft.lat == null) return null;
    return D.stops.find(s => s.key === k && !(draft.id && s.custom) && Core.haversine(s.lat, s.lon, draft.lat, draft.lon) <= Core.CFG.CLUSTER_KM) || null;
  }
  function checkName() {
    const h = $('as-name-hint');
    const sim = similarStop();
    if (sim) {
      h.hidden = false; h.className = 'hint';
      h.textContent = `« ${sim.label} » existe déjà à ${fmtDist(Core.haversine(sim.lat, sim.lon, draft.lat, draft.lon))} : les bus que vous ajoutez lui seront rattachés.`;
    } else h.hidden = true;
  }
  $('as-name').addEventListener('input', debounce(() => { draft.name = $('as-name').value; checkName(); }, 200));

  $('as-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('as-name').value.trim().replace(/\s+/g, ' ');
    if (name.length < 2) { toast('Donnez un nom à l\'arrêt.', 'error'); $('as-name').focus(); return; }
    if (draft.lat == null) { toast('Choisissez l\'emplacement : votre position ou un point sur la carte.', 'error'); return; }
    const far = draft.links.map(lineByName).filter(Boolean)
      .filter(l => Core.insertionPoint(l.stops.filter(x => !isSelf(x)), draft.lat, draft.lon).nearestKm > 1);
    if (far.length && !confirm(`L'emplacement est loin du tracé connu du bus ${far.map(l => l.num).join(', ')}. Enregistrer quand même ?`)) return;
    const rec = {
      id: draft.id || 'u-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name, lat: draft.lat, lon: draft.lon, links: draft.links.slice(),
      note: $('as-note').value.trim(), created: draft.created || new Date().toISOString(), updated: new Date().toISOString()
    };
    const i = customStops.findIndex(c => c.id === rec.id);
    if (i >= 0) customStops[i] = rec; else customStops.push(rec);
    saveCustom();
    rebuildNetwork();
    const isNew = i < 0;
    draft = null;
    toast(isNew ? `Arrêt « ${name} » enregistré.` : 'Arrêt modifié.', 'success', 5000, {
      text: 'Y aller', fn: () => { const s = Core.resolveStop(D, name) || Core.nearbyStops(D, rec.lat, rec.lon, 0.1, 1).map(n => n.stop)[0]; if (s) { setOriginStop(null); setDest(s); runSearch(); } }
    });
    show(asBackTo === 'screen-addstop' ? 'screen-profile' : asBackTo);
  });

  $('as-delete').onclick = () => {
    if (!draft || !draft.id || !confirm('Supprimer cet arrêt ?')) return;
    customStops = customStops.filter(c => c.id !== draft.id);
    saveCustom(); rebuildNetwork();
    state.profile.favorites = state.profile.favorites.filter(id => D.byId.has(id)); saveProfile();
    draft = null;
    toast('Arrêt supprimé.');
    show('screen-profile');
  };
  $('as-back').innerHTML = ic('back');
  $('as-back').onclick = () => { draft = null; show(asBackTo === 'screen-addstop' ? 'screen-profile' : asBackTo); };
  $('cta-addstop').onclick = () => openAddStop(null, 'screen-home');
  $('add-stop-btn').onclick = () => openAddStop(null, 'screen-profile');

  function renderCustomList() {
    const ul = $('custom-list');
    if (!customStops.length) { ul.innerHTML = '<li class="muted">Aucun arrêt ajouté pour l\'instant.</li>'; $('export-stops').disabled = true; return; }
    $('export-stops').disabled = false;
    ul.innerHTML = customStops.map(c => {
      const nums = [...new Set((c.links || []).map(n => (lineByName(n) || Core.parseName(n)).num))];
      return `<li>${ic('addPin')}<span>${esc(c.name)}<br><small class="muted">${nums.length ? 'Bus ' + nums.map(esc).join(', ') : 'Sans bus'}${c.note ? ' · ' + esc(c.note) : ''}</small></span><button class="btn ghost sm" data-edit-stop="${esc(c.id)}">Modifier</button></li>`;
    }).join('');
  }
  $('custom-list').addEventListener('click', e => {
    const b = e.target.closest('[data-edit-stop]');
    if (b) openAddStop(b.dataset.editStop, 'screen-profile');
  });

  $('export-stops').onclick = async () => {
    const payload = {
      app: 'ZUPA', version: 1, exported: new Date().toISOString(),
      stops: customStops.map(c => ({ name: c.name, lat: c.lat, lon: c.lon, note: c.note || '', lines: c.links || [], created: c.created }))
    };
    const json = JSON.stringify(payload, null, 2);
    const fname = `zupa-arrets-${new Date().toISOString().slice(0, 10)}.json`;
    try {
      const file = new File([json], fname, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: 'Arrêts ZUPA' }); return; }
    } catch (err) { if (err && err.name === 'AbortError') return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    a.download = fname; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    toast('Fichier exporté.', 'success');
  };
  $('import-stops').onclick = () => $('import-file').click();
  $('import-file').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      const list = Array.isArray(data) ? data : data.stops;
      if (!Array.isArray(list)) throw new Error('format');
      let n = 0;
      list.forEach(s => {
        if (!s || typeof s.name !== 'string' || !Number.isFinite(+s.lat) || !Number.isFinite(+s.lon)) return;
        const dupe = customStops.some(c => Core.norm(c.name) === Core.norm(s.name) && Core.haversine(c.lat, c.lon, +s.lat, +s.lon) < 0.05);
        if (dupe) return;
        customStops.push({ id: 'u-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: s.name.trim().slice(0, 60),
          lat: +s.lat, lon: +s.lon, note: String(s.note || '').slice(0, 120), links: (s.lines || s.links || []).filter(x => typeof x === 'string'),
          created: s.created || new Date().toISOString() });
        n++;
      });
      saveCustom(); rebuildNetwork(); renderProfile();
      toast(n ? `${n} arrêt${n > 1 ? 's' : ''} importé${n > 1 ? 's' : ''}.` : 'Aucun nouvel arrêt dans ce fichier.', n ? 'success' : 'info');
    } catch (_) { toast('Fichier invalide : utilisez un export ZUPA.', 'error'); }
  });


  /* =====================================================================
     PHARMACIES
     ===================================================================== */
  const CONFIG = window.ZUPA_CONFIG || {};
  const PC = PharmaCore;
  PC.setPlaces(window.ZUPA_VILLES || []);
  const PH_EMBED = (window.ZUPA_PHARMA && Array.isArray(window.ZUPA_PHARMA.list)) ? window.ZUPA_PHARMA.list : [];
  const ph = {
    cache: store.get('phCache', null),          // { t, center:[lat,lon], list }
    gardes: store.get('gardes', null),          // dernière liste de garde connue
    filter: store.get('phFilter', null),
    q: '', shown: 20, sel: null, back: 'screen-pharma', loading: false, lastLiveTry: 0,
    checkedAt: store.get('gardesChecked', 0), checking: false, checkFailed: false
  };
  const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  function openExternal(url) { if (isNative()) location.href = url; else window.open(url, '_blank', 'noopener'); }
  const telHref = t => 'tel:' + String(t).replace(/[^\d+]/g, '');
  const fmtPhone = t => {
    const d = String(t).replace(/[^\d+]/g, '').replace(/^\+?225/, '');
    return d.length === 10 ? d.replace(/(\d{2})(?=\d)/g, '$1 ').trim() : t;
  };
  const gardeOn = () => PC.gardeState(ph.gardes) === 'current';
  const week = () => PC.pickWeek(ph.gardes);
  const fmtDay = s => { const d = new Date(s + 'T12:00:00'); return isNaN(d) ? s : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }); };

  function allPharmacies() {
    const base = PC.mergeLists(PH_EMBED, ph.cache && ph.cache.list);
    const list = PC.applyGardes(base, gardeOn() ? ph.gardes : null);
    const now = new Date();
    list.forEach(p => {
      p.d = state.pos && Number.isFinite(p.lat) ? Core.haversine(state.pos[0], state.pos[1], p.lat, p.lon) : null;
      p.os = PC.openingStatus(p.hours, now);
      p.st = p.garde ? 'garde' : p.os.open === true ? 'open' : p.os.open === false ? 'closed' : 'unk';
    });
    return list;
  }
  function nearStop(p) {
    if (p._near !== undefined || !Number.isFinite(p.lat)) return p._near || null;
    const n = Core.nearbyStops(D, p.lat, p.lon, 0.6, 1)[0];
    p._near = n ? { name: n.stop.label, d: n.d } : null;
    return p._near;
  }
  function statusLabel(p, long) {
    if (p.st === 'garde') return 'De garde';
    if (p.st === 'open') {
      if (p.os.allDay) return 'Ouverte 24h/24';
      return long && p.os.next && p.os.next.close != null ? `Ouverte · ferme à ${PC.fmtHM(p.os.next.close)}` : 'Ouverte';
    }
    if (p.st === 'closed') return long && p.os.next && p.os.next.opens != null ? `Fermée · ouvre à ${PC.fmtHM(p.os.next.opens)}` : 'Fermée';
    return 'Horaires inconnus';
  }

  /* Liste de garde : copie intégrée + liste en ligne (la plus récente gagne) */
  async function loadGardes() {
    const fetchJson = async (url, ms) => {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
      try { const r = await fetch(url, { cache: 'no-store', signal: ctl.signal }); return r.ok ? await r.json() : null; }
      catch (_) { return null; } finally { clearTimeout(t); }
    };
    if (ph.checking) return;
    ph.checking = true;
    if (current === 'screen-pharma') renderGardeBanner();
    const cands = [ph.gardes];
    cands.push(await fetchJson('data/gardes.json', 4000));
    if (CONFIG.gardesUrl) {
      const online = await fetchJson(CONFIG.gardesUrl + (CONFIG.gardesUrl.includes('?') ? '&' : '?') + 't=' + Date.now(), 8000);
      ph.checkFailed = !online;
      if (online) { ph.checkedAt = Date.now(); store.set('gardesChecked', ph.checkedAt); }
      cands.push(online);
    }
    ph.checking = false;
    const valid = cands.filter(g => { const w = PC.pickWeek(g); return w && w.du && w.au && Array.isArray(w.pharmacies) && w.pharmacies.length; });
    const rank = g => { const w = PC.pickWeek(g); return (PC.gardeState(g) === 'current' ? '2' : PC.gardeState(g) === 'future' ? '1' : '0') + w.au + (g.maj || ''); };
    const best = valid.sort((a, b) => rank(b).localeCompare(rank(a)))[0] || null;
    if (best && JSON.stringify(best) !== JSON.stringify(ph.gardes)) { ph.gardes = best; store.set('gardes', best); }
    if (!ph.filter) ph.filter = gardeOn() ? 'garde' : 'all';
    refreshPharmaViews();
  }

  /* Pharmacies autour de l'utilisateur, actualisées depuis OpenStreetMap (si internet) */
  async function refreshLive(force) {
    if (!state.pos || ph.loading) return;
    const c = ph.cache;
    const fresh = c && c.center && Date.now() - c.t < 24 * 3600e3 && Core.haversine(c.center[0], c.center[1], state.pos[0], state.pos[1]) < 1.5;
    if (!force && (fresh || Date.now() - ph.lastLiveTry < 60e3)) return;
    ph.loading = true; ph.lastLiveTry = Date.now();
    if (current === 'screen-pharma') $('ph-refresh').classList.add('spin-ic');
    const q = PC.queryAround(state.pos[0], state.pos[1], 5000);
    let got = null;
    for (const url of CONFIG.overpass || []) {
      try {
        const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 25000);
        const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctl.signal });
        clearTimeout(t);
        if (r.ok) { got = PC.fromOsm(await r.json()); break; }
      } catch (_) { /* serveur suivant */ }
    }
    ph.loading = false;
    $('ph-refresh').classList.remove('spin-ic');
    if (got) {
      const keep = (c && c.list || []).filter(p => !got.some(g => g.id === p.id));
      ph.cache = { t: Date.now(), center: state.pos.slice(), list: got.concat(keep).slice(0, 3000) };
      store.set('phCache', ph.cache);
      refreshPharmaViews();
      if (force) toast(`${got.length} pharmacies trouvées autour de vous.`, 'success');
    } else if (force) toast('Actualisation impossible : vérifiez votre connexion internet.', 'error');
  }

  function refreshPharmaViews() {
    renderPhTeaser();
    if (current === 'screen-pharma') renderLive();
    if (current === 'screen-pharma') renderPharma();
  }

  function phFiltered() {
    let list = allPharmacies();
    const f = ph.filter || 'all';
    if (f === 'garde') list = list.filter(p => p.garde);
    else if (f === 'open') list = list.filter(p => p.st === 'garde' || p.st === 'open');
    const q = PC.norm(ph.q);
    if (q) list = list.filter(p => PC.norm([p.name, p.commune, p.street, p.garde && p.garde.commune, (nearStop(p) || {}).name].filter(Boolean).join(' ')).includes(q));
    list.sort((a, b) => (a.d == null) - (b.d == null) || (a.d ?? 0) - (b.d ?? 0) || (b.st === 'garde') - (a.st === 'garde') || a.name.localeCompare(b.name, 'fr'));
    return list;
  }

  // « il y a 5 min », « hier à 08:15 », « le 18 oct. »
  function fmtAgo(t) {
    const s = (Date.now() - t) / 1000, d = new Date(t);
    if (s < 90) return "à l'instant";
    if (s < 3600) return `il y a ${Math.round(s / 60)} min`;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const hm = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (d >= today) return s < 6 * 3600 ? `il y a ${Math.round(s / 3600)} h` : `aujourd'hui à ${hm}`;
    if (d >= today - 864e5) return `hier à ${hm}`;
    return 'le ' + d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
  function freshLine(stt) {
    const g = week();
    const maj = g && g.maj ? fmtDay(g.maj) : null;
    const pill = stt === 'current' ? '<span class="fresh ok"><i></i>À jour</span>' : '<span class="fresh old"><i></i>À actualiser</span>';
    let txt;
    if (ph.checking) txt = 'Vérification en ligne…';
    else if (ph.checkedAt && !ph.checkFailed) txt = `Vérifiée en ligne ${fmtAgo(ph.checkedAt)}`;
    else if (ph.checkedAt) txt = `Hors ligne · dernière vérification ${fmtAgo(ph.checkedAt)}`;
    else txt = `Hors ligne · liste intégrée${maj ? ' du ' + esc(maj) : ''}`;
    return `<span class="fresh-row${ph.checking ? ' checking' : ''}">${pill}<small>${txt}</small></span>`;
  }
  function renderGardeBanner() {
    const el = $('ph-garde');
    const g = week(), stt = PC.gardeState(ph.gardes);
    if (stt === 'current') {
      el.className = 'garde-banner';
      const nInt = g.pharmacies.filter(p => p.interieur).length, villes = new Set(g.pharmacies.filter(p => p.interieur).map(p => p.commune)).size;
      const detail = nInt ? `${g.pharmacies.length - nInt} à Abidjan · ${nInt} dans ${villes} villes de l'intérieur` : `${g.pharmacies.length} pharmacies`;
      el.innerHTML = `${ic('cross')}<span><b>Pharmacies de garde</b> du ${esc(fmtDay(g.du))} au ${esc(fmtDay(g.au))}<small>${detail} · source : UNPPCI</small>${freshLine(stt)}</span>`;
    } else {
      el.className = 'garde-banner warn';
      el.innerHTML = `${ic('info')}<span><b>Liste de garde ${stt === 'expired' ? 'expirée' : stt === 'future' ? 'pas encore en vigueur' : 'indisponible'}</b><small>${stt === 'expired' ? `Dernière liste : semaine du ${esc(fmtDay(g.du))}. ` : ''}Connectez-vous à internet pour recevoir la liste de la semaine. En attendant, les pharmacies ouvertes sont indiquées selon leurs horaires.</small>${freshLine(stt)}</span>`;
    }
  }

  function phCard(p) {
    const ns = p.approx ? null : nearStop(p);
    const meta = [p.garde && p.garde.adresse || p.street, p.commune || (p.garde && p.garde.commune)].filter(Boolean).join(' · ') || (ns ? `Près de l'arrêt ${ns.name}` : '');
    const tags = [`<span class="st ${p.st}">${esc(statusLabel(p, true))}</span>`];
    if (p.garde && p.os.open === true) tags.push('<span class="st open">Ouverte</span>');
    return `<article class="ph-card${p.garde ? ' garde' : ''}" data-ph="${esc(p.id)}" tabindex="0">
      <div class="ph-top"><span class="ph-ic">${ic('cross')}</span>
        <div class="ph-main"><div class="ph-name">${esc(p.name)}</div><div class="ph-meta">${esc(meta)}</div></div>
        <div class="ph-dist">${p.d != null ? (p.approx ? `<b>≈ ${fmtDist(p.d)}</b><small>centre-ville</small>` : `<b>${fmtDist(p.d)}</b><small>~${fmtMin(Core.walkMin(p.d * Core.CFG.DETOUR))} à pied</small>`) : '<small>position<br>inconnue</small>'}</div>
      </div>
      <div class="ph-tags">${tags.join('')}</div>
      <div class="ph-btns">
        <button class="btn green" data-ph-go="${esc(p.id)}">${ic('route')}Itinéraire</button>
        ${p.phone ? `<a class="btn ghost" href="${esc(telHref(p.phone))}" data-ph-call>${ic('phone')}Appeler</a>` : '<button class="btn ghost" disabled>Pas de numéro</button>'}
      </div>
    </article>`;
  }

  function renderPharma() {
    if (!ph.checking && Date.now() - ph.checkedAt > 3 * 3600e3 && Date.now() - (ph.lastCheckTry || 0) > 120e3) { ph.lastCheckTry = Date.now(); loadGardes(); }
    renderGardeBanner();
    const f = ph.filter || 'all';
    document.querySelectorAll('#ph-filter button').forEach(b => { const on = b.dataset.f === f; b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on)); });
    $('ph-sub').textContent = state.pos ? (state.placeName ? `Autour de ${state.placeName}` : 'Autour de vous') : 'Position inconnue : triées par nom';
    const list = phFiltered();
    const top = list.filter(p => p.d != null).slice(0, 5);
    $('ph-board').innerHTML = top.length ? `<div class="board green"><div class="board-row head"><span>Pharmacie</span><span class="b-dist">Distance</span><span class="b-st">Statut</span></div>${top.map((p, i) =>
      `<button class="board-row" style="animation-delay:${i * 80}ms" data-ph="${esc(p.id)}"><span class="b-name">${esc(p.name.replace(/^pharmacie\s+/i, '').replace(/^./, c => c.toUpperCase()))}</span><span class="b-dist">${p.approx ? '≈' : ''}${fmtDist(p.d)}</span><span class="b-st ${p.st}">${esc(p.st === 'garde' ? 'GARDE' : p.st === 'open' ? 'OUVERTE' : p.st === 'closed' ? 'FERMÉE' : '—')}</span></button>`).join('')}</div>` : '';
    if (!list.length) {
      const total = PH_EMBED.length + (ph.cache ? ph.cache.list.length : 0);
      $('ph-list').innerHTML = `<div class="empty">${ic('cross')}<p><b>${ph.q ? 'Aucune pharmacie ne correspond' : f === 'garde' ? 'Aucune pharmacie de garde trouvée' : 'Aucune pharmacie trouvée'}</b></p><p>${!total ? 'Connectez-vous à internet puis touchez « Actualiser » pour charger les pharmacies autour de vous.' : f !== 'all' ? 'Essayez le filtre « Toutes ».' : 'Modifiez votre recherche.'}</p>${f !== 'all' ? '<button class="btn ghost sm" data-ph-all>Voir toutes les pharmacies</button>' : ''}</div>`;
      $('ph-more').hidden = true;
    } else {
      $('ph-list').innerHTML = list.slice(0, ph.shown).map(phCard).join('');
      $('ph-more').hidden = list.length <= ph.shown;
      $('ph-more').textContent = `Afficher plus (${list.length - ph.shown})`;
    }
    const upd = window.ZUPA_PHARMA && window.ZUPA_PHARMA.updated;
    $('ph-note').textContent = `${PH_EMBED.length + (ph.cache ? ph.cache.list.length : 0) ? 'Données © OpenStreetMap' : ''}${upd ? ' · base du ' + new Date(upd).toLocaleDateString('fr-FR') : ''}${ph.cache ? ' · actualisée le ' + new Date(ph.cache.t).toLocaleDateString('fr-FR') : ''}`;
    if (state.pos) refreshLive(false);
  }

  function renderPhTeaser() {
    const list = allPharmacies().filter(p => p.d != null).sort((a, b) => a.d - b.d);
    const g = list.find(p => p.garde), o = list.find(p => p.st === 'open'), n = list[0];
    const p = g || o || n;
    $('ph-teaser-label').textContent = g ? 'Pharmacie de garde la plus proche' : o ? 'Pharmacie ouverte la plus proche' : 'Pharmacies';
    $('ph-teaser-name').textContent = p ? p.name : state.pos ? 'Voir les pharmacies autour de vous' : 'Pharmacies de garde et ouvertes';
    $('ph-teaser-meta').textContent = p ? `${p.approx ? '≈ ' : ''}${fmtDist(p.d)}${p.approx ? ' (centre-ville)' : ''} · ${statusLabel(p, true)}` : '';
    $('ph-teaser').dataset.ph = p ? p.id : '';
  }

  // Événements de la liste
  $('ph-filter').addEventListener('click', e => {
    const b = e.target.closest('[data-f]'); if (!b) return;
    ph.filter = b.dataset.f; ph.shown = 20; store.set('phFilter', ph.filter); renderPharma();
  });
  $('ph-q').addEventListener('input', debounce(() => { ph.q = $('ph-q').value; ph.shown = 20; renderPharma(); }, 150));
  $('ph-more').onclick = () => { ph.shown += 20; renderPharma(); };
  $('ph-refresh').innerHTML = ic('refresh');
  $('ph-refresh').onclick = () => {
    loadGardes();
    if (!state.pos) { toast('Position inconnue : la liste de garde est vérifiée, mais pas les pharmacies autour de vous.', 'error'); return; }
    refreshLive(true);
  };
  function onPhClick(e) {
    if (e.target.closest('[data-ph-call]')) return; // lien tel: natif
    if (e.target.closest('[data-ph-all]')) { ph.filter = 'all'; store.set('phFilter', 'all'); renderPharma(); return; }
    const go = e.target.closest('[data-ph-go]');
    const el = go || e.target.closest('[data-ph]');
    if (!el) return;
    openPharmacy(go ? go.dataset.phGo : el.dataset.ph, current);
  }
  $('ph-list').addEventListener('click', onPhClick);
  $('ph-board').addEventListener('click', onPhClick);
  $('ph-list').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.ph-card')) openPharmacy(e.target.dataset.ph, current); });
  $('ph-teaser').onclick = () => { const id = $('ph-teaser').dataset.ph; if (id) openPharmacy(id, 'screen-home'); else show('screen-pharma'); };

  /* ---------- Détail ---------- */
  let pdMap = null, pdLayer = null, pdUser = null;
  function openPharmacy(id, from) {
    const p = allPharmacies().find(x => x.id === id);
    if (!p) { toast('Pharmacie introuvable.', 'error'); return; }
    openDetail(p, from, 'pharma');
  }
  /* Fiche détaillée commune aux pharmacies et aux lieux Paiya */
  // Horaires OpenStreetMap lisibles : « 24/7 » → « 24h/24 », « Mo-Su » → « Tous les jours »
  const fmtHours = h => String(h).replace(/^24\/7$/, '24h/24').replace(/\bMo-Su\b/g, 'Tous les jours,').replace(/\bMo-Sa\b/g, 'Lun-sam').replace(/\bMo-Fr\b/g, 'Lun-ven').replace(/(\d{2}:\d{2})-(\d{2}:\d{2})/g, '$1–$2');
  function openDetail(p, from, kind) {
    const home = kind === 'paiya' ? 'screen-paiya' : 'screen-pharma';
    ph.sel = p; ph.kind = kind; ph.back = from && from !== 'screen-pharma-detail' ? from : home;
    if (Number.isFinite(p.lat) && !p.approx) { live.dest = { kind, id: p.id, t: Date.now() }; store.set('liveDest', live.dest); }
    $('pd-name').textContent = p.name;
    $('pd-status').textContent = statusLabel(p, true);
    const call = $('pd-call');
    if (p.phone) { call.href = telHref(p.phone); call.removeAttribute('aria-disabled'); call.classList.remove('disabled'); }
    else { call.href = '#'; call.setAttribute('aria-disabled', 'true'); call.classList.add('disabled'); }
    const ns = p.approx || (p.garde && p.garde.interieur) ? null : nearStop(p);
    const rows = kind === 'paiya' ? [
      [PY_ICON[p.cat] || 'explore', 'Type', esc(p.sub || '')],
      p.hours && ['clock', 'Statut', esc(pyStatus(p, true))],
      p.phone && ['phone', 'Téléphone', String(p.phone).split(/[;,/]/).map(t => t.trim()).filter(Boolean).map(t => `<a href="${esc(telHref(t))}">${esc(fmtPhone(t))}</a>`).join('<br>')],
      (p.street || p.commune) && ['pin', 'Adresse', esc([p.street, p.commune].filter(Boolean).join(' · '))],
      ns && ['bus', 'Arrêt de bus le plus proche', `${esc(ns.name)} · ${fmtDist(ns.d)}`],
      p.hours && ['clock', 'Horaires', esc(fmtHours(p.hours))],
      p.note && ['info', 'Remarque', esc(p.note)],
      p.community && ['user', 'Source', `Ajouté par ${p.mine ? 'vous' : 'un utilisateur de ZUPA'}${p.created ? ' le ' + esc(new Date(p.created).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })) : ''}${p.pending ? ' · en attente d\u2019envoi' : ''}`],
      p.web && ['share', 'Site web', `<a href="${esc(/^https?:/.test(p.web) ? p.web : 'https://' + p.web)}" data-ext>${esc(p.web.replace(/^https?:\/\//, '').slice(0, 40))}</a>`]
    ].filter(Boolean) : [
      ['cross', 'Statut', esc(statusLabel(p, true)) + (p.garde ? ` <small style="text-transform:none;letter-spacing:0">(semaine du ${esc(fmtDay(week().du))} au ${esc(fmtDay(week().au))})</small>` : '')],
      p.phone && ['phone', 'Téléphone', [...new Set([p.phone, ...((p.garde && p.garde.tels) || [])].map(t => String(t).replace(/[^\d+]/g, '').replace(/^\+?225(?=\d{10}$)/, '')))]
        .map(t => `<a href="${esc(telHref(t))}">${esc(fmtPhone(t))}</a>`).join('<br>')],
      (p.street || p.commune || (p.garde && p.garde.adresse)) && ['pin', 'Adresse', esc([(p.garde && p.garde.adresse) || p.street, p.garde && p.garde.quartier, p.commune].filter(Boolean).join(' · '))],
      ns && ['bus', 'Arrêt de bus le plus proche', `${esc(ns.name)} · ${fmtDist(ns.d)}`],
      p.hours && ['clock', 'Horaires', esc(p.hours)],
      p.operator && ['user', 'Pharmacien', esc(p.operator)]
    ].filter(Boolean);
    $('pd-info').innerHTML = rows.map(([i, l, v]) => `<div class="pd-row">${ic(i)}<div><small>${l}</small>${v}</div></div>`).join('');
    $('pd-walk').innerHTML = '';
    $('pd-bus').disabled = !Number.isFinite(p.lat);
    $('pd-gmaps').disabled = false;
    $('pd-gmaps').lastChild.textContent = p.approx || !Number.isFinite(p.lat) ? 'Rechercher dans Google Maps' : 'Itinéraire à pied dans Google Maps';
    $('pd-bus').hidden = !!(p.garde && p.garde.interieur);
    $('pd-status').textContent = kind === 'paiya' ? [p.sub, p.hours ? pyStatus(p, true) : ''].filter(Boolean).join(' · ') : statusLabel(p, true);
    $('pd-note').textContent = kind === 'paiya'
      ? 'Informations issues d\'OpenStreetMap : elles peuvent être incomplètes. Appelez avant de vous déplacer si possible.'
      : 'Vérifiez par téléphone avant de vous déplacer : les informations proviennent d\'OpenStreetMap et de la liste de garde publiée.';
    renderPdComm(kind === 'paiya' ? p : null);
    if (p.community) $('pd-note').textContent = 'Lieu ajouté par la communauté ZUPA. Signalez-le s\u2019il est faux ou n\u2019existe plus.';
    $('screen-pharma-detail').classList.toggle('py', kind === 'paiya');
    $('screen-pharma-detail').style.setProperty('--c', kind === 'paiya' ? PY_COLOR[p.cat] : '');
    show('screen-pharma-detail');
  }
  function ensurePdMap() {
    const p = ph.sel;
    if (!p) { show(ph.kind === 'paiya' ? 'screen-paiya' : 'screen-pharma'); return; }
    if (!Number.isFinite(p.lat)) { $('pd-map').innerHTML = '<div class="map-off">Position inconnue</div>'; pdMap = null; return; }
    if (!hasL) { mapOff('pd-map'); return; }
    if (!pdMap || !pdMap.getContainer().isConnected) { pdMap = baseMap($('pd-map')); pdLayer = L.layerGroup().addTo(pdMap); pdUser = null; }
    pdMap.invalidateSize();
    pdLayer.clearLayers();
    pdUser = userMarker(pdMap, pdUser);
    L.marker([p.lat, p.lon], { icon: ph.kind === 'paiya' ? mkIcon('mk-py', 24, PY_COLOR[p.cat]) : mkIcon('mk-ph' + (p.garde ? ' garde' : ''), 28), zIndexOffset: 900 }).bindPopup(`<b>${esc(p.name)}</b><br>${esc(statusLabel(p, true))}`).addTo(pdLayer);
    if (p.approx) {
      pdMap.setView([p.lat, p.lon], 14);
      $('pd-walk').innerHTML = `${ic('info')}<span>Position approximative : centre de ${esc(p.commune || 'la ville')}. Appelez la pharmacie pour l'adresse exacte.</span>`;
    } else if (state.pos) {
      const crow = Core.haversine(state.pos[0], state.pos[1], p.lat, p.lon);
      const wcol = ph.kind === 'paiya' ? PY_COLOR[p.cat] : (isDark() ? '#3ccf78' : '#16994d');
      const walkStyle = { color: wcol, weight: 5, dashArray: '0 9', lineCap: 'round', interactive: false };
      fitVisible(pdMap, [state.pos, [p.lat, p.lon]]);
      const setWalk = km => { $('pd-walk').innerHTML = `${ic('walk')}<span><b>${fmtDist(km)}</b> à pied · environ <b>${fmtMin(Core.walkMin(km))}</b></span>`; };
      setWalk(crow * Core.CFG.DETOUR);
      drawWalk(pdLayer, { lat: state.pos[0], lon: state.pos[1] }, p, walkStyle, wcol, km => { if (ph.sel === p) setWalk(km); });
    } else {
      pdMap.setView([p.lat, p.lon], 16);
      $('pd-walk').innerHTML = `${ic('info')}<span>Activez la localisation pour voir le trajet.</span>`;
    }
  }
  function renderPdComm(p) {
    const box = $('pd-comm');
    if (!p || !p.community) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    if (p.mine) box.innerHTML = `<button class="btn ghost block" data-pd-del="${esc(p.rid)}">${ic('trash')}Supprimer ce lieu</button>`;
    else if (comm.reported.includes(p.rid)) box.innerHTML = `<p class="muted pd-reported">${ic('check')}Vous avez signalé ce lieu.</p>`;
    else box.innerHTML = `<button class="btn ghost block" data-pd-report>${ic('flag')}Signaler une erreur</button><div class="ap-chips pd-motifs" hidden><button type="button" data-motif="N'existe pas">N'existe pas</button><button type="button" data-motif="Mauvais emplacement">Mauvais emplacement</button><button type="button" data-motif="Infos fausses">Infos fausses</button></div>`;
  }
  $('pd-comm').addEventListener('click', async e => {
    const p = ph.sel; if (!p) return;
    if (e.target.closest('[data-pd-report]')) { $('pd-comm').querySelector('.pd-motifs').hidden = false; e.target.closest('[data-pd-report]').hidden = true; return; }
    const m = e.target.closest('[data-motif]'); if (m) { reportPlace(p, m.dataset.motif); return; }
    const d = e.target.closest('[data-pd-del]');
    if (d && confirm('Supprimer ce lieu pour tous les utilisateurs ?')) { await deleteMine(d.dataset.pdDel); if (!comm.mine.some(x => x.id === d.dataset.pdDel)) show(ph.back || 'screen-paiya'); }
  });
  $('pd-back').innerHTML = ic('back');
  $('pd-back').onclick = () => show(ph.back || 'screen-pharma');
  $('pd-share').innerHTML = ic('share');
  $('pd-call').addEventListener('click', e => { if ($('pd-call').classList.contains('disabled')) { e.preventDefault(); toast('Numéro de téléphone non renseigné.'); } });
  $('pd-gmaps').onclick = () => {
    const p = ph.sel; if (!p) return;
    if (p.approx || !Number.isFinite(p.lat)) openExternal(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([p.name, p.commune, "Côte d'Ivoire"].filter(Boolean).join(', '))}`);
    else openExternal(`https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lon}&travelmode=walking`);
  };
  $('pd-bus').onclick = () => {
    const p = ph.sel;
    if (!p || !Number.isFinite(p.lat)) return;
    if (!state.pos) { toast('Position inconnue : activez la localisation ou corrigez votre position.', 'error'); return; }
    searchRoutes({ lat: state.pos[0], lon: state.pos[1], label: state.manual ? 'Position choisie' : 'Ma position' },
      { id: null, place: true, lat: p.lat, lon: p.lon, label: p.name }, $('pd-bus'));
  };
  $('pd-share').onclick = async () => {
    const p = ph.sel; if (!p) return;
    const text = [p.name + (p.garde ? ' (de garde)' : ''), [p.street, p.commune].filter(Boolean).join(', '), p.phone && 'Tél. ' + fmtPhone(p.phone),
      Number.isFinite(p.lat) && `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`, '— partagé avec ZUPA'].filter(Boolean).join('\n');
    try { if (navigator.share) { await navigator.share({ title: p.name, text }); return; } } catch (err) { if (err && err.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text); toast('Informations copiées.', 'success'); } catch (_) { toast(text, 'info', 8000); }
  };

  /* =====================================================================
     PAIYA : hôtels, restaurants, toilettes publiques, commerces
     ===================================================================== */
  const PYC = PaiyaCore;
  const PY_ICON = { hotel: 'hotel', resto: 'resto', wc: 'wc', shop: 'shop' };
  const PY_COLOR = { hotel: '#5b3cc4', resto: '#c24a12', wc: '#0b7a8f', shop: '#b3245f' }; // texte blanc lisible (contraste ≥ 4,5)
  const PY_EMBED = (window.ZUPA_PAIYA && Array.isArray(window.ZUPA_PAIYA.list)) ? window.ZUPA_PAIYA.list : [];
  const py = { cat: store.get('pyCat', 'resto'), q: '', shown: 20, cache: store.get('pyCache', null), loading: false, lastTry: 0, open: false };

  // Liste fusionnée (intégrée + actualisée), recalculée seulement quand le cache change
  let pyBase = null, pyBaseKey = '';
  function placesBase() {
    const key = `${(py.cache && py.cache.t) || 0}|${comm.ver}`;
    if (pyBase && pyBaseKey === key) return pyBase;
    const m = new Map();
    for (const p of PY_EMBED) m.set(p.id, p);
    for (const p of (py.cache && py.cache.list) || []) m.set(p.id, p);
    for (const r of (comm.list && comm.list.rows) || []) m.set('z' + r.id, commPlace(r, false));
    for (const r of comm.mine) m.set('z' + r.id, commPlace(r, true));
    pyBase = [...m.values()]; pyBaseKey = key;
    return pyBase;
  }
  // Distance rapide (approximation plane, suffisante pour trier à l'échelle d'une ville)
  const quickKm = (p) => { const x = (p.lon - state.pos[1]) * 111.32 * Math.cos(state.pos[0] * Math.PI / 180), y = (p.lat - state.pos[0]) * 110.57; return Math.sqrt(x * x + y * y); };
  function withStatus(p0) {
    const p = Object.assign({}, p0);
    p.d = state.pos ? Core.haversine(state.pos[0], state.pos[1], p.lat, p.lon) : null;
    p.os = PC.openingStatus(p.hours, new Date());
    p.st = p.os.open === true ? 'open' : p.os.open === false ? 'closed' : 'unk';
    return p;
  }
  function allPlaces() { return placesBase().map(withStatus); }

  /* ---------- Lieux ajoutés par les utilisateurs : base partagée (Supabase) ----------
     Chaque lieu est d'abord gardé sur le téléphone, puis envoyé dès qu'il y a internet.
     L'identifiant est créé ici : un renvoi ne crée jamais de doublon. */
  const SB = { url: String(CONFIG.supabaseUrl || '').replace(/\/+$/, ''), key: String(CONFIG.supabaseKey || '') };
  const sbOn = () => !!(SB.url && SB.key);
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    const b = crypto.getRandomValues(new Uint8Array(16)); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    const x = [...b].map(v => v.toString(16).padStart(2, '0')).join('');
    return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20)}`;
  }
  const deviceId = (() => { let d = store.get('device', null); if (!/^[0-9a-f-]{36}$/.test(d || '')) { d = uuid(); store.set('device', d); } return d; })();
  const comm = { list: store.get('community', null), mine: store.get('myPlaces', []), ver: 0, syncing: false, lastFetch: 0, reported: store.get('reported', []) };
  if (!Array.isArray(comm.mine)) comm.mine = [];
  function commPlace(r, mine) {
    const o = { id: 'z' + r.id, rid: r.id, cat: r.cat, name: r.name, sub: r.sub || PYC.CATS[r.cat].one, lat: r.lat, lon: r.lon, community: true, created: r.created_at || r.created };
    if (r.phone) o.phone = r.phone;
    if (r.hours) o.hours = r.hours;
    if (r.note) o.note = r.note;
    if (mine) { o.mine = true; o.pending = !r.synced; o.err = r.err || null; }
    return o;
  }
  function commChanged() { comm.ver++; if (current === 'screen-paiya') renderPaiya(); if (current === 'screen-profile') renderMyPlaces(); }
  function saveMine() { store.set('myPlaces', comm.mine); commChanged(); }
  async function sb(path, opts = {}) {
    const headers = { apikey: SB.key, 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (!SB.key.startsWith('sb_')) headers.Authorization = 'Bearer ' + SB.key; // ancienne clé « anon » (JWT)
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), opts.timeout || 12000);
    try {
      const r = await fetch(SB.url + path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined, signal: ctl.signal, cache: 'no-store' });
      const txt = await r.text();
      let data = null; try { data = txt ? JSON.parse(txt) : null; } catch (_) {}
      return { ok: r.ok, status: r.status, data, net: false };
    } catch (_) { return { ok: false, status: 0, data: null, net: true }; }
    finally { clearTimeout(t); }
  }
  async function fetchCommunity(force) {
    if (!sbOn() || (!force && Date.now() - comm.lastFetch < 10 * 60e3)) return;
    comm.lastFetch = Date.now();
    const r = await sb('/rest/v1/lieux?select=id,cat,name,sub,lat,lon,phone,hours,note,fee,wheelchair,created_at&order=created_at.desc&limit=5000');
    if (r.ok && Array.isArray(r.data)) {
      comm.list = { t: Date.now(), rows: r.data };
      store.set('community', comm.list);
      // un lieu présent en ligne est forcément envoyé
      const online = new Set(r.data.map(x => x.id));
      let fixed = false;
      comm.mine.forEach(m => { if (!m.synced && online.has(m.id)) { m.synced = true; fixed = true; } });
      if (fixed) store.set('myPlaces', comm.mine);
      commChanged();
    }
  }
  const sbErr = r => (r.data && (r.data.message || r.data.hint)) || `Erreur ${r.status}`;
  async function syncMine() {
    if (!sbOn() || comm.syncing) return { sent: 0 };
    comm.syncing = true;
    let sent = 0, net = false, err = null;
    for (const m of comm.mine.filter(x => !x.synced)) {
      const body = { id: m.id, cat: m.cat, name: m.name, sub: m.sub, lat: m.lat, lon: m.lon, acc: m.acc == null ? null : Math.min(1000, Math.round(m.acc)),
        phone: m.phone || null, hours: m.hours || null, note: m.note || null, fee: m.fee || null, wheelchair: m.wheelchair == null ? null : m.wheelchair, device: deviceId };
      const r = await sb('/rest/v1/lieux', { method: 'POST', body, headers: { Prefer: 'return=minimal,resolution=ignore-duplicates' } });
      if (r.ok) { m.synced = true; m.err = null; sent++; }
      else if (r.net || r.status >= 500 || r.status === 429) { net = true; break; }
      else { m.err = sbErr(r); err = m.err; if (/Trop de lieux/.test(m.err)) break; }
    }
    comm.syncing = false;
    store.set('myPlaces', comm.mine);
    if (sent) { comm.lastFetch = 0; fetchCommunity(true); } else commChanged();
    return { sent, net, err };
  }
  async function deleteMine(id) {
    const m = comm.mine.find(x => x.id === id);
    if (!m) return;
    if (m.synced && sbOn()) {
      const r = await sb('/rest/v1/rpc/supprimer_lieu', { method: 'POST', body: { p_id: id, p_device: deviceId } });
      if (!r.ok) { toast(r.net ? 'Suppression impossible sans internet.' : 'Suppression impossible : ' + sbErr(r), 'error'); return; }
      if (comm.list) { comm.list.rows = comm.list.rows.filter(x => x.id !== id); store.set('community', comm.list); }
    }
    comm.mine = comm.mine.filter(x => x.id !== id);
    if (live.dest && live.dest.id === 'z' + id) live.dest = null;
    saveMine();
    toast('Lieu supprimé.', 'success');
  }
  async function reportPlace(p, motif) {
    if (!sbOn()) return;
    const r = await sb('/rest/v1/rpc/signaler_lieu', { method: 'POST', body: { p_id: p.rid, p_device: deviceId, p_motif: motif } });
    if (!r.ok) { toast(r.net ? 'Signalement impossible sans internet.' : 'Signalement impossible : ' + sbErr(r), 'error'); return; }
    comm.reported.push(p.rid); store.set('reported', comm.reported);
    if ((r.data | 0) >= 3 && comm.list) { comm.list.rows = comm.list.rows.filter(x => x.id !== p.rid); store.set('community', comm.list); comm.ver++; }
    toast('Merci, le signalement est enregistré.', 'success');
    renderPdComm(p);
  }
  window.addEventListener('online', () => { syncMine(); fetchCommunity(true); });
  async function refreshPaiya(force) {
    if (!state.pos || py.loading) return;
    const c = py.cache;
    const fresh = c && c.center && Date.now() - c.t < 3 * 24 * 3600e3 && Core.haversine(c.center[0], c.center[1], state.pos[0], state.pos[1]) < 1;
    const embedded = PY_EMBED.some(p => Core.haversine(p.lat, p.lon, state.pos[0], state.pos[1]) < 2);
    if (!force && (fresh || embedded || Date.now() - py.lastTry < 60e3)) return;
    py.loading = true; py.lastTry = Date.now();
    $('py-refresh').classList.add('spin-ic');
    const q = PYC.queryAround(state.pos[0], state.pos[1], 3000);
    let got = null;
    for (const url of CONFIG.overpass || []) {
      try {
        const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 30000);
        const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctl.signal });
        clearTimeout(t);
        if (r.ok) { got = PYC.fromOsm(await r.json()); break; }
      } catch (_) {}
    }
    py.loading = false;
    $('py-refresh').classList.remove('spin-ic');
    if (got) {
      const keep = (c && c.list || []).filter(p => !got.some(g => g.id === p.id));
      py.cache = { t: Date.now(), center: state.pos.slice(), list: got.concat(keep).slice(0, 4000) };
      store.set('pyCache', py.cache);
      if (current === 'screen-paiya') renderPaiya();
      if (force) toast(`${got.length} lieux trouvés autour de vous.`, 'success');
    } else if (force) toast('Actualisation impossible : vérifiez votre connexion internet.', 'error');
  }

  // Accroche du haut : change avec la catégorie et l'heure
  function pyTitle(cat) {
    const h = new Date().getHours();
    if (cat === 'resto') return h < 10 ? 'Un petit-déj’ pas loin ?' : h < 15 ? 'On mange où à midi ?' : h < 18 ? 'Une petite pause ?' : 'Ce soir, on sort où ?';
    if (cat === 'hotel') return h >= 18 || h < 6 ? 'Où dormir ce soir ?' : 'Où poser vos valises ?';
    if (cat === 'wc') return 'Une envie pressante ?';
    return h < 12 ? 'Des courses à faire ?' : 'Un tour en boutique ?';
  }
  // accord : un restaurant « ouvert », des toilettes « ouvertes »
  const pyStatus = (p, long) => { const t = statusLabel(p, long); return p.cat === 'wc' ? t.replace('Ouverte', 'Ouvertes').replace('Fermée', 'Fermées') : t.replace('Ouverte', 'Ouvert').replace('Fermée', 'Fermé'); };
  const PY_PLURAL = { hotel: ['hôtel', 'hôtels'], resto: ['restaurant', 'restaurants'], wc: ['toilettes', 'toilettes'], shop: ['commerce', 'commerces'] };
  function renderPaiya() {
    const base = placesBase();
    const counts = Object.fromEntries(PYC.ORDER.map(c => [c, 0]));
    let near1 = 0;
    for (const p of base) {
      if (state.pos) { const k = quickKm(p); if (k <= 15) counts[p.cat]++; if (p.cat === py.cat && k <= 1) near1++; }
      else counts[p.cat]++;
    }
    const col = PY_COLOR[py.cat];
    // en-tête coloré : la couleur, l'icône géante et l'accroche suivent la catégorie
    const scr = $('screen-paiya');
    scr.style.setProperty('--c', col);
    const title = pyTitle(py.cat), tEl = $('py-title');
    if (tEl.textContent !== title) { tEl.textContent = title; tEl.classList.remove('swap'); void tEl.offsetWidth; tEl.classList.add('swap'); }
    const art = $('py-hero-art');
    if (art.dataset.cat !== py.cat) { art.dataset.cat = py.cat; art.firstChild.setAttribute('d', ICONS[PY_ICON[py.cat]]); art.classList.remove('swap'); void art.offsetWidth; art.classList.add('swap'); }
    const [one, many] = PY_PLURAL[py.cat];
    $('py-pulse').textContent = !state.pos ? 'Activez la localisation pour voir ce qu’il y a autour.'
      : near1 ? `${near1} ${near1 > 1 ? many : one} à moins d’1 km` : counts[py.cat] ? `Le plus proche est un peu plus loin` : `Rien dans le coin pour l’instant`;
    $('py-cats').innerHTML = PYC.ORDER.map(c => `<button class="py-cat${py.cat === c ? ' on' : ''}" role="tab" aria-selected="${py.cat === c}" data-cat="${c}" style="--c:${PY_COLOR[c]}">${ic(PY_ICON[c])}<span>${esc(PYC.CATS[c].label)}</span></button>`).join('');
    $('py-open').classList.toggle('on', py.open);
    $('py-open').setAttribute('aria-pressed', String(py.open));
    $('py-sub').textContent = state.pos ? (state.placeName ? state.placeName : '') : 'triés par nom';
    let list = base.filter(p => p.cat === py.cat);
    const q = PC.norm(py.q);
    if (q) list = list.filter(p => PC.norm([p.name, p.sub, p.street, p.commune].filter(Boolean).join(' ')).includes(q));
    if (py.open) list = list.filter(p => p.hours && withStatus(p).st === 'open');
    if (state.pos) { const dk = new Map(list.map(p => [p, quickKm(p)])); list.sort((a, b) => dk.get(a) - dk.get(b)); }
    else list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
    const shown = list.slice(0, py.shown).map(withStatus);
    $('py-list-h').textContent = py.open ? 'Ouverts maintenant' : state.pos ? 'Autour de vous' : PYC.CATS[py.cat].label;
    if (!list.length) {
      const msg = q ? 'Modifiez votre recherche.'
        : py.open ? 'Peu de lieux indiquent leurs horaires. Retirez le filtre « Ouvert » pour tout voir.'
        : 'Connectez-vous à internet puis touchez le bouton d’actualisation pour charger les lieux autour de vous.';
      $('py-list').innerHTML = `<div class="py-empty">${ic(PY_ICON[py.cat])}<p><b>Aucun lieu trouvé</b></p><p>${msg}</p>${py.open ? '<button class="btn ghost sm" data-py-all>Tout afficher</button>' : '<button class="btn ghost sm" data-py-new>Ajouter un lieu</button>'}</div>`;
      $('py-list').classList.add('is-empty');
      $('py-more').hidden = true;
    } else {
      $('py-list').classList.remove('is-empty');
      $('py-list').innerHTML = shown.map(p => {
        const status = p.hours ? `<small class="py-st ${p.st}">${esc(pyStatus(p))}</small>` : '';
        return `<button class="py-row" data-py="${esc(p.id)}" type="button">
          <span class="py-ic">${ic(PY_ICON[p.cat])}</span>
          <span class="py-main"><b><span>${esc(p.name)}</span>${p.community ? `<em class="py-tag${p.pending ? ' wait' : ''}">${p.pending ? 'en attente' : 'ZUPA'}</em>` : ''}</b><small>${esc([p.sub, p.street || p.commune].filter(Boolean).join(' · '))}</small></span>
          <span class="py-d">${p.d != null ? `<b>${fmtDist(p.d)}</b>` : ''}${status || (p.d != null ? `<small>${fmtMin(Core.walkMin(p.d * Core.CFG.DETOUR))} à pied</small>` : '')}</span>
        </button>`;
      }).join('');
      $('py-more').hidden = list.length <= py.shown;
      $('py-more').textContent = `Afficher plus (${list.length - py.shown})`;
    }
    const upd = window.ZUPA_PAIYA && window.ZUPA_PAIYA.updated;
    $('py-note').textContent = `Données © OpenStreetMap${upd ? ' · base du ' + new Date(upd).toLocaleDateString('fr-FR') : ''}${py.cache ? ' · actualisée le ' + new Date(py.cache.t).toLocaleDateString('fr-FR') : ''}`;
    renderLive();
    if (state.pos) refreshPaiya(false);
    fetchCommunity(false);
  }
  $('py-open').onclick = () => { py.open = !py.open; py.shown = 20; renderPaiya(); };
  $('py-cats').addEventListener('click', e => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    py.cat = b.dataset.cat; py.shown = 20; store.set('pyCat', py.cat); renderPaiya();
    $('screen-paiya').scrollTop = 0;
  });
  $('py-q').addEventListener('input', debounce(() => { py.q = $('py-q').value; py.shown = 20; renderPaiya(); }, 150));
  $('py-more').onclick = () => { py.shown += 20; renderPaiya(); };
  $('py-refresh').innerHTML = ic('refresh');
  $('py-refresh').onclick = () => { if (!state.pos) { toast('Position inconnue : activez la localisation.', 'error'); return; } refreshPaiya(true); };
  $('py-list').addEventListener('click', e => {
    if (e.target.closest('[data-py-all]')) { py.open = false; renderPaiya(); return; }
    if (e.target.closest('[data-py-new]')) { openAddPlace(py.cat, 'screen-paiya'); return; }
    if (e.target.closest('[data-ph-call]')) return;
    const el = e.target.closest('[data-py-go]') || e.target.closest('[data-py]');
    if (!el) return;
    const id = el.dataset.pyGo || el.dataset.py;
    const p0 = placesBase().find(x => x.id === id);
    if (p0) openDetail(withStatus(p0), 'screen-paiya', 'paiya');
  });
  document.addEventListener('click', e => { const a = e.target.closest('a[data-ext]'); if (a) { e.preventDefault(); openExternal(a.href); } });

  /* ---------- Ajouter un lieu : position trouvée automatiquement, confirmée par « Géolocaliser » ---------- */
  const AP_KINDS = {
    resto: ['Restaurant', 'Maquis', 'Fast-food', 'Café', 'Glacier'],
    hotel: ['Hôtel', 'Résidence meublée', 'Auberge', 'Motel'],
    wc: ['Toilettes publiques'],
    shop: ['Supérette', 'Supermarché', 'Boutique', 'Téléphonie', 'Coiffure', 'Pressing', 'Quincaillerie', 'Commerce']
  };
  const AP_PH = { resto: 'ex. Maquis Chez Tantie', hotel: 'ex. Hôtel Le Baobab', wc: 'ex. Toilettes de la gare', shop: 'ex. Boutique Awa' };
  const ap = { cat: 'wc', st: 'auto', pos: null, acc: null, kind: null, fee: null, hours: '', back: 'screen-paiya', timer: 0 };
  let apMap = null, apUser = null, apMoving = false;
  function openAddPlace(cat, from) {
    ap.cat = cat || py.cat; ap.back = from || current;
    ap.kind = AP_KINDS[ap.cat][0]; ap.fee = null; ap.hours = '';
    ap.pos = state.gpsLast || state.pos; ap.acc = state.gpsLast ? state.gpsAcc : state.accuracy;
    ap.st = ap.pos ? 'auto' : 'none';
    $('ap-form').reset(); $('ap-range').hidden = true;
    renderAddPlace();
    show('screen-addplace');
  }
  function renderAddPlace() {
    const scr = $('screen-addplace');
    scr.style.setProperty('--c', PY_COLOR[ap.cat]);
    $('ap-cats').innerHTML = PYC.ORDER.map(c => `<button type="button" class="py-cat${ap.cat === c ? ' on' : ''}" role="radio" aria-checked="${ap.cat === c}" data-cat="${c}" style="--c:${PY_COLOR[c]}">${ic(PY_ICON[c])}<span>${esc(PYC.CATS[c].label)}</span></button>`).join('');
    const kinds = AP_KINDS[ap.cat];
    $('ap-kind').innerHTML = kinds.map(k => `<button type="button" role="radio" aria-checked="${ap.kind === k}" class="${ap.kind === k ? 'on' : ''}" data-v="${esc(k)}">${esc(k)}</button>`).join('');
    $('ap-kind').previousElementSibling.hidden = $('ap-kind').hidden = kinds.length < 2;
    $('ap-wc').hidden = ap.cat !== 'wc';
    $('ap-name').placeholder = AP_PH[ap.cat];
    $('ap-name-l').innerHTML = ap.cat === 'wc' ? 'Nom <small>(facultatif)</small>' : 'Nom';
    [['ap-fee', ap.fee], ['ap-hours', ap.hours === '' || ap.hours === '24/7' ? ap.hours : 'range']].forEach(([id, v]) =>
      $(id).querySelectorAll('button').forEach(b => { const on = b.dataset.v === (v == null ? '\u0000' : v); b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); }));
    renderApState();
  }
  function renderApState() {
    const el = $('ap-state'), acc = ap.acc ? `± ${fmtDist(ap.acc / 1000)}` : '';
    const weak = ap.acc > 40;
    const T = {
      none: [ic('info'), 'Aucune position pour le moment. Touchez « Géolocaliser » ou déplacez la carte sur le lieu.', 'warn'],
      auto: [ic('locate'), `Position trouvée automatiquement${acc ? ' · ' + acc : ''}. Touchez « Géolocaliser » pour la confirmer.`, weak ? 'warn' : ''],
      locating: ['<span class="spinner"></span>', `Recherche du meilleur signal GPS…${acc ? ' ' + acc : ''}`, ''],
      ok: [ic('check'), `Position confirmée${acc ? ' · ' + acc : ''}${weak ? '. Précision moyenne : déplacez la carte si le repère n\u2019est pas sur le lieu.' : ''}`, weak ? 'ok warn' : 'ok'],
      moved: [ic('edit'), 'Repère déplacé à la main. Touchez « Valider ce point » pour le garder.', ''],
      pin: [ic('check'), 'Point validé sur la carte.', 'ok']
    }[ap.st];
    el.className = 'ap-state ' + T[2];
    el.innerHTML = `${T[0]}<span>${T[1]}</span>`;
    $('ap-locate').disabled = ap.st === 'locating';
    $('ap-locate').lastChild.textContent = ap.st === 'ok' ? 'Géolocaliser à nouveau' : 'Géolocaliser';
    $('ap-pin-ok').hidden = ap.st !== 'moved';
    const confirmed = ap.st === 'ok' || ap.st === 'pin';
    const nameOk = ap.cat === 'wc' || $('ap-name').value.trim().length >= 2;
    $('ap-save').disabled = !(confirmed && nameOk);
    $('ap-why').textContent = !confirmed ? 'Confirmez d\u2019abord la position avec « Géolocaliser ».' : !nameOk ? 'Indiquez le nom du lieu.' : '';
  }
  function ensureApMap() {
    if (!hasL) { mapOff('ap-map'); return; }
    if (!apMap) {
      apMap = baseMap($('ap-map'), { onLocate: () => { apLocate(); return false; } });
      apMap.on('dragstart', () => { apMoving = true; });
      apMap.on('moveend', () => {
        if (!apMoving) return;
        apMoving = false;
        const c = apMap.getCenter(); ap.pos = [c.lat, c.lng]; ap.acc = null; ap.st = 'moved'; renderApState();
      });
    }
    apMap.invalidateSize();
    apUser = userMarker(apMap, apUser);
    apMap.setView(ap.pos || [5.33, -4.01], ap.pos ? 18 : 12, { animate: false });
  }
  // « Géolocaliser » : garde la meilleure mesure GPS des 8 prochaines secondes (arrêt dès ± 15 m)
  function apLocate() {
    clearTimeout(ap.timer);
    ap.st = 'locating'; renderApState();
    if (!gotFix && !watchHigh) startGeo(true);
    const t0 = Date.now(); let best = null;
    const tick = () => {
      if (current !== 'screen-addplace') return;
      if (state.gpsLast && (!best || state.gpsAcc < best.acc)) best = { p: state.gpsLast.slice(), acc: state.gpsAcc };
      if (best) { ap.acc = best.acc; renderApState(); }
      if (best && (best.acc <= 15 || Date.now() - t0 > 8000)) {
        ap.pos = best.p; ap.st = 'ok';
        if (apMap) apMap.setView(ap.pos, Math.max(apMap.getZoom(), 18));
        vibrate(60); renderApState(); return;
      }
      if (!best && Date.now() - t0 > 10000) {
        ap.st = ap.pos ? 'moved' : 'none'; renderApState();
        toast('GPS indisponible. Déplacez la carte sur le lieu, puis touchez « Valider ce point ».', 'error', 6000); return;
      }
      ap.timer = setTimeout(tick, 500);
    };
    tick();
  }
  $('ap-back').innerHTML = ic('back');
  $('ap-back').onclick = () => show(ap.back || 'screen-paiya');
  $('ap-locate').onclick = apLocate;
  $('ap-pin-ok').onclick = () => { ap.st = 'pin'; renderApState(); };
  $('ap-cats').addEventListener('click', e => {
    const b = e.target.closest('[data-cat]'); if (!b) return;
    ap.cat = b.dataset.cat; ap.kind = AP_KINDS[ap.cat][0]; renderAddPlace();
  });
  const chipPick = (id, fn) => $(id).addEventListener('click', e => { const b = e.target.closest('button[data-v]'); if (b) { fn(b.dataset.v); renderAddPlace(); } });
  chipPick('ap-kind', v => { ap.kind = v; });
  chipPick('ap-fee', v => { ap.fee = ap.fee === v ? null : v; });
  chipPick('ap-hours', v => { ap.hours = v === 'range' ? `Mo-Su ${$('ap-open').value}-${$('ap-close').value}` : v; $('ap-range').hidden = v !== 'range'; });
  ['ap-open', 'ap-close'].forEach(id => $(id).addEventListener('change', () => { ap.hours = `Mo-Su ${$('ap-open').value || '08:00'}-${$('ap-close').value || '20:00'}`; }));
  $('ap-name').addEventListener('input', renderApState);
  $('ap-form').addEventListener('submit', async e => {
    e.preventDefault();
    renderApState();
    if ($('ap-save').disabled) return;
    const name = $('ap-name').value.trim().replace(/\s+/g, ' ') || (ap.cat === 'wc' ? 'Toilettes publiques' : '');
    const sub = ap.cat === 'wc'
      ? ['Toilettes', ap.fee === 'yes' ? 'payantes' : ap.fee === 'no' ? 'gratuites' : '', $('ap-wheel').checked ? 'accessibles' : ''].filter(Boolean).join(' · ')
      : ap.kind;
    const [lat, lon] = ap.pos;
    const twin = placesBase().find(x => x.cat === ap.cat && Core.haversine(lat, lon, x.lat, x.lon) < 0.025 && (ap.cat === 'wc' || PC.norm(x.name) === PC.norm(name)));
    if (twin && !confirm(`« ${twin.name} » existe déjà à ${fmtDist(Core.haversine(lat, lon, twin.lat, twin.lon))}. L'ajouter quand même ?`)) return;
    const rec = { id: uuid(), cat: ap.cat, name, sub, lat: +lat.toFixed(6), lon: +lon.toFixed(6), acc: ap.acc, phone: $('ap-phone').value.trim(), hours: ap.hours,
      note: $('ap-note').value.trim(), fee: ap.cat === 'wc' ? ap.fee : null, wheelchair: ap.cat === 'wc' && $('ap-wheel').checked ? true : null, created: new Date().toISOString(), synced: false };
    comm.mine.unshift(rec);
    saveMine();
    $('ap-save').disabled = true;
    const res = await syncMine();
    if (!sbOn()) toast('Lieu enregistré sur ce téléphone.', 'success');
    else if (rec.synced) toast('Merci ! Le lieu est partagé avec tous les utilisateurs de ZUPA.', 'success', 5000);
    else if (rec.err) toast('Lieu gardé sur ce téléphone, mais refusé par la base : ' + rec.err, 'error', 7000);
    else toast('Lieu enregistré. Il sera partagé dès que vous aurez internet.', 'success', 5000);
    py.cat = rec.cat; store.set('pyCat', py.cat);
    live.dest = { kind: 'paiya', id: 'z' + rec.id, t: Date.now() }; store.set('liveDest', live.dest);
    show(ap.back === 'screen-profile' ? 'screen-profile' : 'screen-paiya');
  });
  $('py-add').onclick = () => openAddPlace(py.cat, 'screen-paiya');
  $('my-places-add').onclick = () => openAddPlace(py.cat, 'screen-profile');
  function renderMyPlaces() {
    const ul = $('my-places');
    if (!comm.mine.length) { ul.innerHTML = '<li class="muted">Aucun lieu ajouté pour l\u2019instant.</li>'; return; }
    ul.innerHTML = comm.mine.map(m => {
      const st = m.synced ? '<em class="py-tag">partagé</em>' : m.err ? '<em class="py-tag bad">refusé</em>' : `<em class="py-tag wait">${sbOn() ? 'en attente' : 'sur ce téléphone'}</em>`;
      return `<li style="--c:${PY_COLOR[m.cat]}">${ic(PY_ICON[m.cat])}<span>${esc(m.name)} ${st}<br><small class="muted">${esc(m.sub || '')}${m.err ? ' · ' + esc(m.err) : ''}</small></span><button class="btn ghost sm" data-del-place="${esc(m.id)}" aria-label="Supprimer ${esc(m.name)}">${ic('trash')}</button></li>`;
    }).join('');
  }
  $('my-places').addEventListener('click', e => {
    const b = e.target.closest('[data-del-place]');
    if (b && confirm('Supprimer ce lieu ?')) deleteMine(b.dataset.delPlace);
  });

  /* ---------- Navigation globale ---------- */
  document.querySelectorAll('[data-icon]').forEach(el => { el.outerHTML = ic(el.dataset.icon); });
  document.querySelectorAll('[data-go]').forEach(b => { if (b.classList.contains('icon-btn')) b.innerHTML = ic('back'); });
  document.addEventListener('click', e => {
    const go = e.target.closest('[data-go]');
    if (go) {
      const to = go.dataset.go;
      if (to === 'screen-results' && !state.lastSearch) { show('screen-home'); return; }
      show(to); return;
    }
    const nav = e.target.closest('[data-nav]');
    if (nav) {
      if (nav.dataset.nav === 'screen-track' && !state.tracking) {
        toast(state.lastSearch ? 'Choisissez un itinéraire puis « Suivre ».' : 'Aucun trajet en cours. Lancez une recherche.');
        if (state.lastSearch) show('screen-results');
        return;
      }
      show(nav.dataset.nav);
    }
  });

  /* ---------- Bouton retour d'Android ---------- */
  function goBack() {
    if (document.querySelector('.map-wrap.full')) { exitFull(); return true; }
    const open = [...document.querySelectorAll('.suggest')].some(b => !b.hidden);
    if (open) { closeSuggests(); return true; }
    const map = {
      'screen-results': state.resBack || 'screen-home', 'screen-track': state.lastSearch ? 'screen-results' : 'screen-home',
      'screen-addstop': asBackTo === 'screen-addstop' ? 'screen-profile' : asBackTo, 'screen-fixpos': fpBack,
      'screen-pharma-detail': ph.back || 'screen-pharma', 'screen-addplace': ap.back || 'screen-paiya', 'screen-pharma': 'screen-home', 'screen-paiya': 'screen-home', 'screen-profile': 'screen-home'
    };
    const to = map[current];
    if (!to || to === current) return false;
    if (current === 'screen-addstop') draft = null;
    show(to);
    return true;
  }
  $('res-back').innerHTML = ic('back');
  $('res-back').onclick = () => goBack();
  try {
    const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (App && isNative()) App.addListener('backButton', () => { if (!goBack()) App.exitApp(); });
  } catch (_) {}

  /* ---------- Démarrage ---------- */
  // un écran à carte plein écran ne doit jamais défiler lui-même
  document.querySelectorAll('.screen.immersive').forEach(el => el.addEventListener('scroll', () => { if (el.scrollTop) el.scrollTop = 0; }));
  loadOfflineMap();
  makeSheet('screen-results', 'res-sheet', [0.3, 0.55, 0.9], 1);
  makeSheet('screen-track', 'trk-sheet', [0.22, 0.5, 0.88], 0);
  makeSheet('screen-pharma-detail', 'pd-sheet', [0.3, 0.55, 0.9], 1);
  applyTheme();
  if ($('app-version')) $('app-version').textContent = CONFIG.version || '1.0.0';
  $('data-note').textContent = `${D.lines.length} trajets · ${D.stops.length} arrêts · Durées estimées, hors trafic.`;
  if (!D.lines.length) toast('Les données des bus n\'ont pas pu être chargées.', 'error', 8000);
  syncClear();
  renderHome();
  startGeo();
  setTimeout(() => { syncMine(); fetchCommunity(false); }, 4000);
  renderPhTeaser();
  loadGardes();
})();
