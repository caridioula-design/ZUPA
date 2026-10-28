/* ==========================================================================
   ZUPA — interface (Bouge. Trouve. Vis.)
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Données ---------- */
  // Données du réseau : data/bus.js (window.ZUPA_BUS) : bus SOTRA, gbaka et wôrô-wôrô cartographiés dans OpenStreetMap
  const RAW = (Array.isArray(window.ZUPA_BUS) ? window.ZUPA_BUS : []).filter(l => !l.kind || ['bus', 'gbaka', 'woro', 'saloni', 'bateau'].includes(l.kind));
  // Arrêts ajoutés par l'utilisateur (stockés sur l'appareil)
  let customStops = (() => { try { const v = JSON.parse(localStorage.getItem('zupa:customStops') || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; } })();
  /* Lignes ajoutées par les utilisateurs (gbaka, wôrô-wôrô, saloni) : base partagée + celles de ce téléphone */
  const LINE_TYPES = { bus: { label: 'Bus', icon: 'bus', color: '#E97234' }, gbaka: { label: 'Gbaka', icon: 'gbaka', color: '#0f766e' }, woro: { label: 'Wôrô-wôrô', icon: 'taxi', color: '#b45309' }, saloni: { label: 'Saloni', icon: 'saloni', color: '#7c3aed' }, bateau: { label: 'Bateau-bus', icon: 'boat', color: '#0369a1' } };
  function extraLines() {
    let rows = [], mine = [];
    try { rows = (JSON.parse(localStorage.getItem('zupa:lignes') || 'null') || {}).rows || []; mine = JSON.parse(localStorage.getItem('zupa:myLines') || '[]') || []; } catch (_) {}
    const m = new Map(); [...rows, ...mine].forEach(r => r && m.set(r.id, r));
    const used = new Map();
    return [...m.values()].filter(r => LINE_TYPES[r.type] && Array.isArray(r.arrets) && r.arrets.length >= 2).map(r => {
      const a = r.arrets;
      if (r.type === 'bus') { // nouveau bus : numéro + départ → terminus (et le retour, terminus → départ)
        const num = String(r.gare || '').toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 6) || '?';
        const st = a.map(x => ({ name: x.name, lat: +x.lat, lon: +x.lon }));
        return [{ name: `Bus ${num}: ${a[0].name} → ${a[a.length - 1].name}`, kind: 'bus', ref: num, cost: r.tarif || null, stops: st },
          { name: `Bus ${num}: ${a[a.length - 1].name} → ${a[0].name}`, kind: 'bus', ref: num, cost: r.tarif || null, stops: st.slice().reverse() }];
      }
      const g = String(r.gare).replace(/^gare\s+(routi[eè]re\s+)?(de\s+|d['’]\s*|du\s+)?/i, '').trim() || r.gare;
      let ref = g.length > 14 ? g.slice(0, 13) + '…' : g; const k = r.type + ref; used.set(k, (used.get(k) || 0) + 1); if (used.get(k) > 1) ref += ' ' + used.get(k);
      return { name: `${LINE_TYPES[r.type].label} ${ref}: ${a[0].name} → ${a[a.length - 1].name}`, kind: r.type, ref, cost: r.tarif || null, stops: a.map(x => ({ name: x.name, lat: +x.lat, lon: +x.lon })) };
    }).flat();
  }
  // Nouveaux bus qui suivent le trajet d'une ligne existante (ex. le 981 fait le même parcours que le 04)
  const busCopiesGet = () => { try { const v = JSON.parse(localStorage.getItem('zupa:busCopies') || '[]'); return Array.isArray(v) ? v : []; } catch (_) { return []; } };
  function busCopies() {
    const out = [];
    for (const bc of busCopiesGet()) {
      const num = String(bc.num || '').toUpperCase().replace(/[^0-9A-Z]/g, ''); if (!num) continue;
      for (const nm of bc.from || []) {
        const l = RAW.find(x => x.name === nm); if (!l || !Array.isArray(l.stops)) continue;
        out.push({ name: `Bus ${num}: ${String(l.name).split(':').slice(1).join(':').trim() || l.name}`, ref: num, kind: 'bus', cost: l.cost || null, copyOf: l.name, stops: l.stops });
      }
    }
    return out;
  }
  let D = Core.build(RAW.concat(extraLines(), busCopies()), customStops);
  function rebuildNetwork() { D = Core.build(RAW.concat(extraLines(), busCopies()), customStops); }

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
    lock: 'M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1s3.1 1.39 3.1 3.1v2z',
    work: 'M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z',
    fire: 'M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z',
    more: 'M6 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm12 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm-6 0c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z',
    block: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9A7.902 7.902 0 0 1 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1A7.902 7.902 0 0 1 20 12c0 4.42-3.58 8-8 8z',
    person_remove: 'M14 8c0-2.21-1.79-4-4-4S6 5.79 6 8s1.79 4 4 4 4-1.79 4-4zm3 2v2h6v-2h-6zM2 18v2h16v-2c0-2.66-5.33-4-8-4s-8 1.34-8 4z',
    groups: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    night: 'M12.34 2.02C6.59 1.82 2 6.42 2 12c0 5.52 4.48 10 10 10 3.71 0 6.93-2.02 8.66-5.02-7.51-.25-12.09-8.43-8.32-14.96z',
    chat: 'M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z',
    bar: 'M21 5V3H3v2l8 9v5H6v2h12v-2h-5v-5l8-9zM7.43 7L5.66 5h12.69l-1.78 2H7.43z',
    fuel: 'M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 10H6V5h6v5zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z',
    cart: 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0 0 20 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z',
    market: 'M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z',
    worship: 'M4 10h3v7H4zm6.5 0h3v7h-3zM2 19h20v3H2zm15-9h3v7h-3zm-5-9L2 6v2h20V6z',
    church: 'M18 12.22V9l-5-2.5V5h2V3h-2V1h-2v2H9v2h2v1.5L6 9v3.22L2 14v8h8v-3c0-1.1.9-2 2-2s2 .9 2 2v3h8v-8l-4-1.78zM12 13.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
    mosque: 'M7 8h10c.29 0 .57.06.84.11C17.27 5.9 15.13 4 12 2 9.13 3.78 6.73 5.9 6.16 8.11 6.43 8.06 6.71 8 7 8zM24 7c0-1.1-2-3-2-3s-2 1.9-2 3c0 .74.4 1.38 1 1.72V13h-2v-2c0-1.1-.9-2-2-2H7c-1.1 0-2 .9-2 2v2H3V8.72c.6-.34 1-.98 1-1.72 0-1.1-2-3-2-3S0 5.9 0 7c0 .74.4 1.38 1 1.72V21h9v-4c0-1.1.9-2 2-2s2 .9 2 2v4h9V8.72c.6-.34 1-.98 1-1.72z',
    clinic: 'M10 4h4v2h2V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2h2V4zm10 4H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-4 8h-3v3h-2v-3H8v-2h3v-3h2v3h3v2z',
    gbaka: 'M17 5H3c-1.1 0-2 .89-2 2v9h2c0 1.65 1.34 3 3 3s3-1.35 3-3h5.5c0 1.65 1.34 3 3 3s3-1.35 3-3H23v-5l-6-6zM3 11V7h4v4H3zm3 6.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM13 11H9V7h4v4zm4.5 6.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM15 11V7h1l4 4h-5z',
    taxi: 'M18.92 6.01C18.72 5.42 18.16 5 17.5 5H15V3H9v2H6.5c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z',
    boat: 'M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.15.52-.06.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z',
    saloni: 'M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4.48L19 10.35V7zM7 17c-.55 0-1-.45-1-1h2c0 .55-.45 1-1 1zM5 6h5v2H5zm14 7c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3zm0 4c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z',
    key: 'M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65zM7 14c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z',
    camera: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4zM9 2 7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z',
    image: 'M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z',
    bed: 'M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z',
    bath: 'M7 7c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm13 6V4.83C20 3.27 18.73 2 17.17 2c-.75 0-1.47.3-2 .83l-1.25 1.25c-.16-.05-.33-.08-.51-.08-.4 0-.77.12-1.08.32l2.76 2.76c.2-.31.32-.68.32-1.08 0-.18-.03-.34-.07-.51l1.25-1.25c.15-.15.36-.24.58-.24.46 0 .83.37.83.83V13h-6.85c-.3-.21-.57-.45-.82-.72l-1.4-1.55c-.19-.21-.43-.38-.69-.5-.31-.15-.65-.23-1-.23C6 10.01 5 11.01 5 12.25V13H2v6c0 1.1.9 2 2 2 0 .55.45 1 1 1h14c.55 0 1-.45 1-1 1.1 0 2-.9 2-2v-6h-2z',
    area: 'M17.66 17.66l-1.06 1.06-.71-.71 1.06-1.06-1.94-1.94-1.06 1.06-.71-.71 1.06-1.06-1.94-1.94-1.06 1.06-.71-.71 1.06-1.06L9.7 9.7l-1.06 1.06-.71-.71 1.06-1.06-1.94-1.94-1.06 1.06-.71-.71 1.06-1.06L4 4v14c0 1.1.9 2 2 2h14l-2.34-2.34zM7 17v-5.76L12.76 17H7z',
    floor: 'M17 11V3H7v4H3v14h8v-4h2v4h8V11h-4zM7 19H5v-2h2v2zm0-4H5v-2h2v2zm0-4H5V9h2v2zm4 4H9v-2h2v2zm0-4H9V9h2v2zm0-4H9V5h2v2zm4 8h-2v-2h2v2zm0-4h-2V9h2v2zm0-4h-2V5h2v2zm4 12h-2v-2h2v2zm0-4h-2v-2h2v2z',
    doc: 'M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z',
    school: 'M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82zM12 3 1 9l11 6 9-4.91V17h2V9L12 3z',
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
    recentPlaces: (store.get('recentPlaces', []) || []).filter(r => r && Number.isFinite(r.lat)),
    mode: store.get('mode', 'all'),
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
  /* Navigation : pile d'écrans (le bouton retour revient vraiment à l'écran précédent),
     garde-fous avant de quitter un formulaire, et verrou de 300 ms contre les « clics fantômes »
     (le doigt qui a ouvert un écran ne doit pas toucher un bouton du nouvel écran). */
  const ROOTS = ['screen-home', 'screen-pharma', 'screen-paiya', 'screen-imo', 'screen-track', 'screen-profile'];
  const navStack = ['screen-home'];
  const leaveGuards = {};
  let navLockT = 0;
  function show(id, opts = {}) {
    if (current && current !== id && !opts.force && leaveGuards[current] && !leaveGuards[current](id)) return false;
    const prev = current;
    let dir = 'tab';
    if (ROOTS.includes(id) && !opts.keepStack) { navStack.length = 0; navStack.push(id); }
    else {
      const k = navStack.indexOf(id);
      if (k >= 0) { navStack.length = k + 1; dir = 'pop'; }
      else { navStack.push(id); dir = 'push'; }
    }
    document.body.classList.add('nav-lock');
    clearTimeout(navLockT); navLockT = setTimeout(() => document.body.classList.remove('nav-lock'), 300);
    current = id;
    document.querySelectorAll('.screen').forEach(s => {
      const a = s.id === id;
      s.classList.toggle('active', a);
      s.setAttribute('aria-hidden', String(!a));
    });
    const tab = { 'screen-results': 'screen-home', 'screen-addstop': 'screen-home', 'screen-fixpos': 'screen-home', 'screen-addplace': 'screen-paiya', 'screen-addline': 'screen-home', 'screen-agenda': 'screen-home', 'screen-imo-search': 'screen-imo', 'screen-imo-pub': 'screen-imo', 'screen-cle': 'screen-imo', 'screen-pharma-detail': (typeof ph !== 'undefined' && ph.kind === 'paiya') ? 'screen-paiya' : 'screen-pharma' }[id] || id;
    document.querySelectorAll('[data-nav]').forEach(b => b.classList.toggle('active', b.dataset.nav === tab));
    $(id).scrollTop = 0;
    if (prev !== id) document.querySelectorAll('#toasts .toast.error').forEach(t => t.remove()); // une erreur ne suit pas l'utilisateur sur un autre écran
    if (prev !== id) { const el = $(id); el.classList.remove('in-push', 'in-pop', 'in-tab'); void el.offsetWidth; el.classList.add('in-' + dir); }
    closeSuggests();
    if (sheets[id]) sheets[id].snapTo(sheets[id].idx);
    syncBars();
    requestAnimationFrame(() => {
      placeLive(id);
      if (id === 'screen-home') renderHome();
      if (id === 'screen-results') ensureResMap();
      if (id === 'screen-track') ensureTrkMap();
      if (id === 'screen-profile') renderProfile();
      if (id === 'screen-addstop') { ensureAsMap(); if (prev !== id) asSnap = snapDraft(); }
      if (id === 'screen-fixpos') ensureFpMap();
      if (id === 'screen-addplace') ensureApMap();
      if (id === 'screen-addline') ensureAlMap();
      if (id === 'screen-agenda' && typeof ensureAgMap === 'function') ensureAgMap();
      if (id === 'screen-pharma') renderPharma();
      if (id === 'screen-paiya') renderPaiya();
      if (id === 'screen-imo') renderImo(true);
      if (id === 'screen-imo-pub') ensureIpMap();
      renderLive();
      if (id === 'screen-pharma-detail') ensurePdMap();
      scheduleAutoZoom(id);
    });
    return true;
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
    syncBars();
  }
  function setTheme(t) { state.theme = t; store.set('theme', t); applyTheme(); }

  /* ---------- Barre d'état du téléphone : même couleur que le haut de l'onglet ---------- */
  // fond coloré de chaque onglet principal, prolongé sous la barre d'état
  ['screen-pharma', 'screen-paiya', 'screen-imo', 'screen-profile'].forEach(id => { const sc = $(id); if (sc && !sc.querySelector('.tab-aura')) { sc.classList.add('has-aura'); sc.insertAdjacentHTML('afterbegin', '<div class="tab-aura" aria-hidden="true"></div>'); } });
  document.body.insertAdjacentHTML('beforeend', '<div class="sb-scrim" id="sb-scrim" aria-hidden="true"></div>');
  var barsLast = '';
  function syncBars() {
    const sc = document.getElementById('sb-scrim'); if (!sc || typeof current === 'undefined') return;
    const scr = document.getElementById(current), dark = isDark();
    let color = '', map = false, statusLight;
    if (current === 'screen-home') { const sky = document.getElementById('home-sky'); color = sky ? getComputedStyle(sky).getPropertyValue('--s1').trim() : ''; statusLight = true; }
    else if (scr && scr.classList.contains('has-aura')) { color = getComputedStyle(scr).getPropertyValue('--a1').trim(); statusLight = current === 'screen-imo' ? dark : true; } // Imo : fond jaune, icônes noires
    else if (scr && scr.classList.contains('immersive')) { map = true; statusLight = true; }
    else { color = getComputedStyle(document.body).getPropertyValue('--bg').trim(); statusLight = dark; }
    // color-mix() n'est pas toujours calculé en couleur : on passe par un élément témoin
    if (/color-mix/.test(color)) { sc.style.background = color; color = getComputedStyle(sc).backgroundColor; sc.style.background = ''; }
    sc.classList.toggle('map', map);
    sc.classList.toggle('on', !map && !!scr && scr.scrollTop > 6);
    sc.style.setProperty('--sb-c', map ? 'transparent' : (color || 'transparent'));
    const meta = document.querySelector('meta[name=theme-color]'); if (meta && color) meta.content = color;
    const key = `${statusLight}|${dark}`;
    if (key === barsLast) return;
    barsLast = key;
    const B = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.ZupaBars;
    if (B && B.setStyle) B.setStyle({ statusLight, navLight: dark }).catch(() => {});
  }
  window.addEventListener('zupabars', () => { barsLast = ''; syncBars(); });
  // barre transparente : le fond de l'onglet se voit dessous ; un voile n'apparaît que si le contenu défile sous l'heure
  document.addEventListener('scroll', e => {
    if (!e.target.classList || !e.target.classList.contains('screen') || e.target.id !== current) return;
    const sc = document.getElementById('sb-scrim'); if (sc && !sc.classList.contains('map')) sc.classList.toggle('on', e.target.scrollTop > 6);
  }, { capture: true, passive: true });
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
  const nav = { heading: null, gpsT: 0, compT: 0, raf: 0, anchor: null };
  const headingMarkers = new Set();
  function setHeading(h, src) {
    if (!Number.isFinite(h)) return;
    if (src === 'compass') nav.compT = Date.now();
    if (src === 'compass' && Date.now() - nav.gpsT < 4000) return; // le GPS prime quand on roule
    if (src === 'move' && Date.now() - nav.compT < 3000) return;   // la boussole prime à pied si elle existe
    if (nav.heading == null) nav.heading = (h + 360) % 360;
    else {
      const d = ((h - nav.heading + 540) % 360) - 180; if (Math.abs(d) < 0.5) return;
      // lissage léger : réactif sans trembler (plus fort quand l'écart est grand)
      const k = src === 'compass' ? (Math.abs(d) > 30 ? 0.7 : 0.45) : src === 'gps' ? 0.85 : 0.75;
      nav.heading = (nav.heading + d * k + 360) % 360;
    }
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
  // boussole absolue si elle existe ; sinon orientation simple ; sinon le sens de la marche (positions GPS successives)
  let gotAbs = false;
  if ('ondeviceorientationabsolute' in window) window.addEventListener('deviceorientationabsolute', e => { gotAbs = true; onOrientation(e); });
  window.addEventListener('deviceorientation', e => { if (!gotAbs && (typeof e.webkitCompassHeading === 'number' || e.absolute === true)) onOrientation(e); });
  // sans boussole ni gyroscope : cap déduit du déplacement (dès 4 m parcourus, GPS précis)
  function headingFromMove(lat, lon, acc) {
    if (!(acc <= 30)) return;
    const a = nav.anchor;
    if (!a) { nav.anchor = [lat, lon]; return; }
    const dm = Core.haversine(a[0], a[1], lat, lon) * 1000;
    if (dm >= Math.max(4, acc * 0.6)) { setHeading(bearing(a, [lat, lon]), 'move'); nav.anchor = [lat, lon]; }
    else if (dm > 60) nav.anchor = [lat, lon];
  }
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
    } else glide(cur, state.pos);
    cur._acc.setRadius(r > 15 ? r : 0);
    updateHeadingMarkers();
    return cur;
  }
  // le point bleu glisse jusqu'à la nouvelle position (mouvement continu entre deux mesures GPS)
  function glide(m, to) {
    const from = m.getLatLng(), km = Core.haversine(from.lat, from.lng, to[0], to[1]);
    cancelAnimationFrame(m._gl);
    if (km > 0.4 || km < 0.0005 || document.visibilityState !== 'visible') { m.setLatLng(to); m._acc.setLatLng(to); return; }
    const now = performance.now(), dur = Math.min(1100, Math.max(250, now - (m._glT || now - 900)));
    m._glT = now;
    const step = t => {
      const k = Math.min(1, (t - now) / dur), ll = [from.lat + (to[0] - from.lat) * k, from.lng + (to[1] - from.lng) * k];
      m.setLatLng(ll); m._acc.setLatLng(ll);
      if (k < 1) m._gl = requestAnimationFrame(step);
    };
    m._gl = requestAnimationFrame(step);
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
  /* ---------- Défilement horizontal des noms trop longs (bulle en direct, ligne sélectionnée) ----------
     Le texte va et vient lentement, avec une pause à chaque bout ; rien ne bouge s'il tient en entier. */
  function marquee(host) {
    if (!host) return;
    const inner = host.querySelector('.mq-in'); if (!inner) return;
    requestAnimationFrame(() => {
      const over = inner.scrollWidth - host.clientWidth;
      if (over > 4) {
        host.classList.add('mq');
        host.style.setProperty('--mq-d', `-${over + 14}px`);
        host.style.setProperty('--mq-t', `${Math.max(5, Math.min(16, (over + 14) / 22 + 2.5)).toFixed(1)}s`);
      } else host.classList.remove('mq');
    });
  }
  const marqueeAll = root => (root || document).querySelectorAll('.mq-host').forEach(marquee);
  window.addEventListener('resize', debounce(() => marqueeAll(), 200));

  /* ---------- Activité en direct (style « Live Activities » / Dynamic Island) ----------
     Capsule noire en haut de l'onglet Bus : distance jusqu'à l'arrêt, mise à jour à chaque mesure GPS.
     Cible : arrêt de départ ou prochain arrêt pendant un trajet suivi, sinon l'arrêt le plus proche.
     Elle verdit à l'approche (500 m -> 30 m) et clignote en vert à l'arrêt. Un appui l'agrandit. */
  const live = { open: true, // ouverte au démarrage (arrêt, direction et offres visibles)
    shown: null, raf: 0, key: '', dest: store.get('liveDest', null) };
  const CARD = ['le nord', 'le nord-est', "l'est", 'le sud-est', 'le sud', 'le sud-ouest', "l'ouest", 'le nord-ouest'];
  const CARD16 = ['le nord', 'le nord-nord-est', 'le nord-est', "l'est-nord-est", "l'est", "l'est-sud-est", 'le sud-est', 'le sud-sud-est', 'le sud', 'le sud-sud-ouest', 'le sud-ouest', "l'ouest-sud-ouest", "l'ouest", "l'ouest-nord-ouest", 'le nord-ouest', 'le nord-nord-ouest'];
  const LIVE_HOST = { 'screen-home': ['loc-chip', 'before'], 'screen-pharma': ['ph-filter', 'after'], 'screen-paiya': ['py-cats', 'after'], 'screen-imo': ['imo-hero', 'after'], 'screen-track': ['trk-live-slot', 'in'] };
  function placeLive(id) { // la même bulle passe d'un onglet à l'autre
    const h = LIVE_HOST[id], box = $('live');
    if (!h) return;
    const ref = $(h[0]);
    if (h[1] === 'in') { if (box.parentNode !== ref) ref.appendChild(box); }
    else if (h[1] === 'before') { if (ref.previousElementSibling !== box) ref.before(box); }
    else if (ref.nextElementSibling !== box) ref.after(box);
    live.key = '';
    setTimeout(() => marquee($('live-name')), 60);
  }
  const DEST_TTL = 3 * 3600e3;
  const isFollowed = (kind, id) => !!(live.dest && live.dest.kind === kind && live.dest.id === id && Date.now() - live.dest.t < DEST_TTL);
  // Toucher un lieu dans une liste : la bulle le suit (sans ouvrir la carte) ; le toucher à nouveau ouvre sa fiche
  function followPlace(kind, id) {
    live.dest = { kind, id, t: Date.now() }; store.set('liveDest', live.dest); live.followT = Date.now();
    live.open = true; $('live').classList.add('open'); $('live-pill').setAttribute('aria-expanded', 'true');
    vibrate(25);
    if (kind === 'pharma') renderPharma(); else if (kind === 'imo') renderImo(); else renderPaiya();
    renderLive();
    const box = $('live'); box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
  }
  function placeTarget(kind) {
    const d = live.dest && live.dest.kind === kind && Date.now() - live.dest.t < DEST_TTL ? live.dest : null;
    if (kind === 'pharma') {
      const list = allPharmacies().filter(p => p.d != null && !p.approx).sort((a, b) => a.d - b.d);
      let sel = d && list.find(p => p.id === d.id);
      if (!sel && d) { const c = clinics().find(x => x.id === d.id); if (c && c.d != null) sel = c; }
      const g = list.find(p => p.garde), o = list.find(p => p.st === 'open');
      const p = sel || g || o || list[0];
      if (!p) return null;
      return { kind, p, icon: p.cat === 'sante' ? 'clinic' : 'cross', color: '#10b981', dest: !!sel, far: FAR_KM, at: 0.04,
        kicker: sel ? 'Votre destination' : p === g ? 'De garde, la plus proche' : p === o ? 'Ouverte, la plus proche' : 'La plus proche',
        tags: p.cat === 'sante' ? `<span class="live-sub">${esc(p.sub || 'Clinique')}</span>` : `<span class="st ${p.st}">${esc(statusLabel(p, true))}</span>` };
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
    const one = { hotel: 'Hôtel le plus proche', resto: 'Restaurant le plus proche', wc: 'Toilettes les plus proches', shop: 'Commerce le plus proche', maquis: 'Maquis le plus proche', station: 'Station la plus proche', supermarche: 'Supermarché le plus proche', marche: 'Marché le plus proche', culte: 'Lieu de culte le plus proche' }[p.cat] || 'Le plus proche';
    return { kind, p, icon: placeIcon(p), color: PY_COLOR[p.cat], dest: sel, far: FAR_KM, at: 0.04,
      kicker: sel ? 'Votre destination' : one,
      tags: `<span class="live-sub">${esc(p.sub || '')}</span>${p.hours ? `<span class="st ${p.st}">${esc(pyStatus(p, true))}</span>` : ''}` };
  }
  function liveTarget() {
    if (current === 'screen-pharma') return placeTarget('pharma');
    if (current === 'screen-paiya') return placeTarget('paiya');
    if (current === 'screen-imo') return imoTarget();
    const t = state.tracking;
    if (t && !t.arrived) {
      const n = t.pts.length, prog = `<span class="live-prog">${Math.max(0, t.idx + 1)}/${n} arrêts · ~${fmtMin(remainingMin(t))} restantes</span>`;
      if (t.idx < 0) { const p = t.pts[0]; return { kicker: 'Votre arrêt de départ', p, line: p.line, veh: p.veh, act: 'track', far: FAR_KM, at: AT_STOP_KM, tags: lineBadge(p.line, true) + prog, hint: `Montez dans le ${p.veh} ${p.line}` }; }
      const nx = t.pts[t.idx + 1];
      if (nx) return { kicker: nx.kind === 'alight' ? 'Descendez à' : nx.kind !== 'stop' ? 'Correspondance à' : 'Prochain arrêt', p: nx, line: nx.line, veh: nx.veh, act: 'track', far: 1.5, at: 0.06, tags: lineBadge(nx.line, true) + prog, hint: nx.kind !== 'stop' ? hint(nx) : null };
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
    box.classList.toggle('med', tg.kind === 'pharma');
    // la bulle prend la couleur de son onglet : Bus et Trajet orange, Pharmacies vert, Paiya couleur de la catégorie
    box.classList.toggle('t-bus', current === 'screen-home' || current === 'screen-track');
    box.classList.toggle('t-py', current === 'screen-paiya');
    box.classList.toggle('t-imo', current === 'screen-imo');
    if (current === 'screen-imo') renderLiveImo(tg); else if (live.imoId) { live.imoId = null; $('live-imo').innerHTML = ''; }
    renderLiveAds(tg); if (wx) wxMaybe();
    if (current === 'screen-paiya') box.style.setProperty('--pyc', PY_COLOR[(tg.p && PYC.CATS[tg.p.cat]) ? tg.p.cat : py.cat]);
    const key = current + tg.kicker + tg.p.name;
    if (key !== live.key) {
      live.key = key; live.shown = null;
      const icn = tg.icon || 'bus';
      $('live-ic').innerHTML = ic(icn); box.querySelector('.live-end').innerHTML = ic(icn);
    }
    $('live-kicker').textContent = at ? (tg.kind ? 'Vous y êtes' : tg.act === 'track' && state.tracking && state.tracking.idx >= 0 ? 'Arrêt atteint' : 'Vous êtes à l’arrêt') : tg.kicker;
    const ln = $('live-name');
    if (ln.dataset.n !== tg.p.name) { ln.dataset.n = tg.p.name; ln.innerHTML = `<span class="mq-in">${esc(tg.p.name)}</span>`; marquee(ln); }
    if (at) { cancelAnimationFrame(live.raf); live.shown = d; $('live-dist').textContent = 'Ici'; $('live-unit').textContent = ''; }
    else tweenDist($('live-dist'), d);
    $('live-fill').style.width = (k * 100).toFixed(1) + '%'; box.style.setProperty('--fill', (k * 100).toFixed(1) + '%');
    const walk = Core.walkMin(d * Core.CFG.DETOUR);
    $('live-walk').textContent = at ? (state.posStale ? 'Position en cours de mise à jour' : 'Vous y êtes')
      : tg.hint ? tg.hint
      : tg.act === 'track' && state.tracking && state.tracking.idx >= 0 ? `${tg.veh || 'Bus'} ${tg.line || ''}`.trim()
      : `~${fmtMin(walk)} à pied`;
    $('live-dir-txt').parentNode.hidden = at;
    updateLiveDir(tg);
    const lh = tg.tags || (tg.stop ? linesHtml(tg.stop) : tg.line ? lineBadge(tg.line, true) : '');
    if (live.linesHtml !== lh) { live.linesHtml = lh; $('live-lines').innerHTML = lh; } // pas de réécriture inutile à chaque mesure GPS
    $('live-act').textContent = tg.kind === 'imo' ? 'Voir l\u2019itinéraire' : tg.kind ? (tg.p.phone ? 'Itinéraire et appel' : 'Itinéraire') : tg.act === 'track' ? 'Ouvrir le suivi du trajet' : 'Partir de cet arrêt';
    $('live-clear').hidden = !tg.dest;
    $('live-act').hidden = current === 'screen-track'; // déjà sur le suivi : pas de bouton inutile
    box.classList.toggle('on-map', current === 'screen-track');
    $('live-back').hidden = current !== 'screen-track';
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
      const hr = Math.round(rot / 30) % 12 || 12; // position sur un cadran : 12 h = devant
      const side = rot < 180 ? 'droite' : 'gauche', a = rot < 180 ? rot : 360 - rot;
      txt = a < 12 ? 'Tout droit' : a < 40 ? `Légèrement à ${side}` : a < 75 ? `À ${side}, en biais` : a < 115 ? `À ${side}` : a < 160 ? `Derrière vous, à ${side}` : 'Faites demi-tour';
      txt += ` · ${hr} h`;
    } else txt = `Vers ${CARD16[Math.round(b / 22.5) % 16]} · ${Math.round(b)}°`;
    // angle continu : la flèche tourne toujours par le plus court chemin, sans faire de tour complet
    const prev = live.arrow == null ? rot : live.arrow, dd = ((rot - (prev % 360) + 540) % 360) - 180;
    live.arrow = prev + dd;
    $('live-arrow').style.transform = `rotate(${live.arrow.toFixed(1)}deg)`;
    if ($('live-dir-txt').textContent !== txt) $('live-dir-txt').textContent = txt;
  }
  $('live-pill').addEventListener('click', () => {
    setTimeout(() => marquee($('live-name')), 480);
    live.open = !live.open;
    $('live').classList.toggle('open', live.open);
    $('live-pill').setAttribute('aria-expanded', String(live.open));
  });
  // la bulle ouverte se replie quand on fait défiler la liste vers le bas (elle reste en haut, en petit)
  Object.keys(LIVE_HOST).forEach(id => {
    let last = 0;
    $(id).addEventListener('scroll', e => {
      const y = e.target.scrollTop;
      if (live.open && id !== 'screen-imo' && y > 160 && y - last > 4) { live.open = false; $('live').classList.remove('open'); $('live-pill').setAttribute('aria-expanded', 'false'); }
      last = y;
    }, { passive: true });
  });
  // sur le Trajet, le retour est intégré à la bulle (il ne la gêne plus)
  $('live-back').addEventListener('click', () => show(navStack.length > 1 ? navStack[navStack.length - 2] : (state.lastSearch ? 'screen-results' : 'screen-home')));
  $('live-clear').addEventListener('click', () => {
    live.dest = null; store.set('liveDest', null);
    if (current === 'screen-pharma') renderPharma(); else if (current === 'screen-paiya') renderPaiya(); else if (current === 'screen-imo') renderImo();
    renderLive();
  });
  $('live-act').addEventListener('click', () => {
    const tg = live.tg;
    if (!tg) return;
    if (tg.kind === 'imo') { imoRoute(tg.p); return; }
    if (tg.kind) { openDetail(tg.p, current, tg.kind); return; }
    if (tg.act === 'track') { show('screen-track'); return; }
    setOriginStop(tg.stop);
    destInput.focus();
    toast(`Départ : ${tg.stop.label}. Où allez-vous ?`);
  });
  function renderLoc() {
    const el = $('loc-chip');
    el.hidden = false; if ($('wx-loc')) $('wx-loc').hidden = true;
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
    el.className = 'loc-chip' + (state.approx || acc > 150 ? ' warn' : !nearTxt && !state.posStale ? ' ok' : '');
    // position correcte : pas de cadre, le lieu s'affiche en petit sous la météo (toucher = corriger)
    const good = el.classList.contains('ok');
    el.hidden = good;
    const wl = $('wx-loc');
    if (wl) { wl.hidden = !good; wl.innerHTML = good ? `${ic('pin')}<span>${esc(state.placeName ? state.placeName.split(', ').reverse().join(' · ') : 'Position trouvée')}</span>` : ''; } // le quartier d'abord
    el.innerHTML = `${ic('pin')}<span>${where}${state.posStale ? ' <small>(mise à jour…)</small>' : quality}${nearTxt ? `<br><small>${nearTxt}</small>` : ''}${warn}<span class="loc-actions"><button class="link" data-geo="fix">${acc > 50 || state.posStale ? 'Position inexacte ? Corriger' : 'Corriger'}</button>${state.approx || acc > 150 ? '<button class="link" data-geo="help">Améliorer le GPS</button>' : ''}</span></span>`;
  }
  $('wx-loc').onclick = () => openFixPos();
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
    if (c.heading != null && Number.isFinite(c.heading) && (c.speed || 0) > 0.7) { nav.gpsT = Date.now(); setHeading(c.heading, 'gps'); }
    else headingFromMove(c.latitude, c.longitude, c.accuracy);
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
    state.gpsLast = [f.lat, f.lon]; state.gpsAcc = f.acc; state.gpsT = Date.now(); state.gpsRaw = { lat: c.latitude, lon: c.longitude, acc: c.accuracy || 9999, t: Date.now() };
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
    if (typeof agCheck === 'function') agCheck();
    checkVisit();
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
  $('fp-back').onclick = () => goBack();

  /* ---------- Autocomplétion ---------- */
  const suggests = [];
  function closeSuggests() { suggests.forEach(s => s.close()); }
  const linesHtml = s => s.lines.slice(0, 6).map(n => lineBadge(n, true)).join('') + (s.lines.length > 6 ? `<small>+${s.lines.length - 6}</small>` : '')
    + (s.unverified || []).slice(0, 3).map(n => `<span class="lb sm unv" title="Signalé par vous, à confirmer">${esc(n)}</span>`).join('');
  function stopItem(s, extra) {
    return { type: 'stop', stop: s, html: `<span class="sg-ic">${ic('bus')}</span><span class="sg-main"><span class="sg-name">${esc(s.label)}${s.custom ? '<span class="utag">ajouté</span>' : ''}</span><span class="sg-lines">${linesHtml(s)}</span></span>${extra ? `<span class="sg-extra">${extra}</span>` : ''}` };
  }
  const withDist = s => stopItem(s, state.pos ? fmtDist(dist(state.pos, s)) : '');

  function makeSuggest(input, box, { onPick, empty, onEnter, search }) {
    let items = [], active = -1;
    const render = () => {
      if (!items.length) { close(); return; }
      box.innerHTML = items.map((it, i) => it.head
        ? `<div class="sg-head">${esc(it.head)}</div>`
        : `<div class="sg-item${i === active ? ' active' : ''}" role="option" id="${box.id}-${i}" data-i="${i}" aria-selected="${i === active}">${it.html}</div>`).join('');
      box.hidden = false;
      sizeSuggest();
      input.setAttribute('aria-expanded', 'true');
      if (active >= 0) { input.setAttribute('aria-activedescendant', `${box.id}-${active}`); const el = $(`${box.id}-${active}`); el && el.scrollIntoView({ block: 'nearest' }); }
      else input.removeAttribute('aria-activedescendant');
    };
    const update = () => {
      const q = input.value.trim();
      items = q ? (search ? search(q) : Core.searchStops(D, q, 8).map(withDist)) : (empty ? empty() : []);
      if (q && !items.length) items = [{ head: search ? 'Aucun arrêt ni lieu ne correspond' : 'Aucun arrêt ne correspond' }];
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
    // Toucher ≠ choisir : on choisit au relâcher, seulement si le doigt n'a pas glissé (défilement de la liste).
    // Un toucher qui arrête un défilement en cours ne choisit rien non plus.
    let tap = null, scrolledAt = 0, touchedAt = 0; // seuls les défilements faits au doigt comptent (pas ceux du programme)
    const unpress = () => { if (tap && tap.el) tap.el.classList.remove('pressed'); tap = null; };
    box.addEventListener('scroll', () => { if (Date.now() - touchedAt < 1500) { scrolledAt = Date.now(); unpress(); } }, { passive: true });
    box.addEventListener('pointerdown', e => {
      touchedAt = Date.now();
      e.preventDefault(); // garde le focus (et le clavier) sur le champ
      const el = e.target.closest('.sg-item');
      unpress();
      if (!el || Date.now() - scrolledAt < 300) return;
      tap = { el, i: +el.dataset.i, x: e.clientX, y: e.clientY, id: e.pointerId };
      el.classList.add('pressed');
    });
    box.addEventListener('pointermove', e => { touchedAt = Date.now(); if (tap && e.pointerId === tap.id && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 8) unpress(); }, { passive: true });
    box.addEventListener('pointercancel', unpress);
    box.addEventListener('pointerleave', unpress);
    box.addEventListener('pointerup', e => {
      touchedAt = Date.now();
      if (!tap || e.pointerId !== tap.id) return;
      const t = tap; unpress();
      if (e.target.closest('.sg-item') === t.el && Date.now() - scrolledAt > 300) pick(t.i);
    });
    const api = { close, refresh: update };
    suggests.push(api);
    return api;
  }

  /* ---------- Accueil ---------- */
  const originInput = $('origin-input'), destInput = $('dest-input');
  function setOriginStop(s) { state.origin = s ? { type: 'stop', id: s.id } : null; originInput.value = s ? s.label : ''; syncClear(); }
  function setDest(s) { state.dest = s ? s.id : null; state.destPlace = null; destInput.value = s ? s.label : ''; syncClear(); }
  // Destination = un lieu (Paiya, pharmacie, lieu ajouté) : l'itinéraire vise les arrêts les plus proches de ce lieu
  function setDestPlace(p) { state.dest = null; state.destPlace = { id: null, place: true, lat: p.lat, lon: p.lon, label: p.name, icon: p.icon }; destInput.value = p.name; syncClear(); }
  function addRecentPlace(d) {
    state.recentPlaces = [{ name: d.label, lat: d.lat, lon: d.lon, icon: d.icon || 'pin' }, ...state.recentPlaces.filter(x => x.name !== d.label)].slice(0, 4);
    store.set('recentPlaces', state.recentPlaces);
  }
  // quartiers, villages et lieux-dits du Grand Abidjan (destination = le quartier)
  const ZONES = (window.ZUPA_VILLES || []).filter(v => v[2] > 5.15 && v[2] < 5.62 && v[3] > -4.3 && v[3] < -3.7)
    .map(v => ({ name: v[0], lat: v[2], lon: v[3], zone: v[1] }));
  let placeIndex = null, placeIndexKey = '';
  function placeIdx() { // noms normalisés, recalculés seulement quand les listes changent
    placesBase();
    const key = `${pyBaseKey}|${(ph.cache && ph.cache.t) || 0}`;
    if (placeIndex && key === placeIndexKey) return placeIndex;
    const all = [];
    for (const z of ZONES) all.push({ p: z, kind: 'zone', n: Core.key(z.name) });
    for (const p of placesBase()) if (p.name && p.name !== PYC.CATS[p.cat].one) all.push({ p, kind: 'paiya', n: Core.key(p.name + ' ' + (p.sub || '')) });
    for (const p of PC.mergeLists(PH_EMBED, ph.cache && ph.cache.list)) if (Number.isFinite(p.lat)) all.push({ p, kind: 'pharma', n: Core.key(p.name + ' ' + (p.commune || '')) });
    placeIndex = all; placeIndexKey = key;
    return all;
  }
  function placeItem(x) {
    const p = x.p, cat = x.kind === 'paiya' ? p.cat : null;
    const icn = cat ? PY_ICON[cat] : x.kind === 'zone' ? 'pin' : 'cross', col = cat ? PY_COLOR[cat] : x.kind === 'zone' ? 'var(--info)' : 'var(--ph)';
    p.icon = icn;
    const n = Core.nearbyStops(D, p.lat, p.lon, 0.8, 1)[0];
    const near = n ? `près de l'arrêt ${n.stop.label} · ${fmtDist(n.d)}` : 'aucun arrêt à moins de 800 m';
    const ZT = { suburb: 'quartier', quarter: 'quartier', neighbourhood: 'quartier', village: 'village', town: 'ville', city: 'ville', hamlet: 'lieu-dit' };
    const tag = p.community ? '<span class="utag">ZUPA</span>' : x.kind === 'zone' ? `<span class="utag zone">${ZT[p.zone] || 'quartier'}</span>` : '';
    return { type: 'place', place: p, html: `<span class="sg-ic place" style="--c:${col}">${ic(icn)}</span><span class="sg-main"><span class="sg-name">${esc(p.name)}${tag}</span><span class="sg-sub">${esc(near)}</span></span>${state.pos ? `<span class="sg-extra">${fmtDist(Core.haversine(state.pos[0], state.pos[1], p.lat, p.lon))}</span>` : ''}` };
  }
  function searchPlaces(q, max = 5) {
    const nq = Core.key(q);
    if (nq.length < 2) return [];
    const hits = [];
    for (const x of placeIdx()) {
      let sc = Core.matchScore(nq, x.n);
      if (sc < 0) sc = Core.partialScore(nq, x.n);
      if (sc < 0) continue;
      if (x.p.community) sc -= 1.5;
      if (x.kind === 'zone') sc -= 0.5;
      if (state.pos) sc += Math.min(1, Core.haversine(state.pos[0], state.pos[1], x.p.lat, x.p.lon) / 20);
      hits.push([sc, x]);
    }
    return hits.sort((a, b) => a[0] - b[0]).slice(0, max).map(h => placeItem(h[1]));
  }
  function syncClear() {
    $('origin-clear').hidden = !originInput.value;
    $('dest-clear').hidden = !destInput.value;
    if (originInput.value || destInput.value) foldSearch(true);
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
    onPick: it => { if (it.type === 'place') setDestPlace(it.place); else setDest(it.stop); runSearch(); },
    onEnter: () => runSearch(),
    search: q => {
      const stops = Core.searchStops(D, q, 6).map(withDist), places = searchPlaces(q, 6), mine = privMatches(q).map(privItem);
      const out = [];
      if (mine.length) out.push({ head: 'Mes lieux confidentiels' }, ...mine);
      if (stops.length) out.push({ head: 'Arrêts' }, ...stops);
      if (places.length) out.push({ head: 'Lieux' }, ...places);
      return out;
    },
    empty: () => {
      const out = [];
      if (priv.length) out.push({ head: 'Mes lieux confidentiels' }, ...priv.map(privItem));
      const mine = comm.mine.slice(0, 4).map(m => placeItem({ p: commPlace(m, true), kind: 'paiya' }));
      if (mine.length) out.push({ head: 'Mes lieux' }, ...mine);
      const rp = state.recentPlaces.map(r => ({ type: 'place', place: r, html: `<span class="sg-ic place" style="--c:var(--text-2)">${ic('clock')}</span><span class="sg-main"><span class="sg-name">${esc(r.name)}</span></span>${state.pos ? `<span class="sg-extra">${fmtDist(Core.haversine(state.pos[0], state.pos[1], r.lat, r.lon))}</span>` : ''}` }));
      if (rp.length) out.push({ head: 'Lieux récents' }, ...rp);
      const favs = state.profile.favorites.map(id => D.byId.get(id)).filter(Boolean);
      if (favs.length) { out.push({ head: 'Favoris' }); favs.forEach(s => out.push(withDist(s))); }
      const rec = state.recents.filter(id => !state.profile.favorites.includes(id)).map(id => D.byId.get(id)).filter(Boolean);
      if (rec.length) { out.push({ head: 'Récents' }); rec.forEach(s => out.push(withDist(s))); }
      return out;
    }
  });
  originInput.addEventListener('input', () => { state.origin = null; syncClear(); });
  destInput.addEventListener('input', () => { state.dest = null; state.destPlace = null; syncClear(); });
  $('origin-clear').innerHTML = ic('close');
  $('dest-clear').innerHTML = ic('close');
  $('origin-clear').onclick = () => { setOriginStop(null); originInput.focus(); };
  $('dest-clear').onclick = () => { setDest(null); destInput.focus(); };
  $('swap-btn').innerHTML = ic('swap');
  $('swap-btn').onclick = () => {
    const o = state.origin ? D.byId.get(state.origin.id) : Core.resolveStop(D, originInput.value);
    if (state.destPlace) { toast('La destination est un lieu : choisissez un arrêt pour inverser.'); return; }
    const d = state.dest ? D.byId.get(state.dest) : Core.resolveStop(D, destInput.value);
    if (!o) {
      if (!d) { toast('Choisissez d\'abord un départ et une destination.'); return; }
      toast('Le départ est votre position : choisissez un arrêt de départ pour inverser.'); return;
    }
    setOriginStop(d || null); setDest(o);
  };
  // Les champs de recherche sont repliés : « Trouver mon trajet » les ouvre, puis lance la recherche
  function foldSearch(open) {
    const f = $('search-fold'); if (!f) return;
    f.classList.toggle('open', open);
    f.setAttribute('aria-hidden', String(!open));
    f.querySelectorAll('input,button').forEach(el => { el.tabIndex = open ? 0 : -1; });
    $('search-btn').textContent = open ? 'Rechercher' : 'Trouver mon trajet';
  }
  $('search-btn').onclick = () => {
    if (!$('search-fold').classList.contains('open')) { foldSearch(true); vibrate(10); setTimeout(() => destInput.focus(), 260); return; }
    if (!destInput.value) { destInput.focus(); return; }
    runSearch();
  };

  function greeting() {
    const h = new Date().getHours();
    const hello = h < 5 || h >= 18 ? 'Bonsoir' : 'Bonjour';
    $('greet').innerHTML = `<span>${hello}${state.profile.firstname ? ', ' + esc(state.profile.firstname) : ''}</span><span>où allez-vous aujourd’hui ?</span>`;
    skyPaint();
  }

  function renderHome() {
    if (typeof renderAgenda === 'function' && typeof ag !== 'undefined') renderAgenda();
    greeting(); renderLoc(); renderBoard(); renderRecents();
    if (!originInput.value && !destInput.value && document.activeElement !== destInput && document.activeElement !== originInput) foldSearch(false);
  }

  // Tableau des favoris façon panneau à LED : calculs étalés (l'écran reste fluide), résultats mis en cache
  const boardCache = new Map();
  let boardJob = 0;
  const ledClock = () => { const d = new Date(); return `${String(d.getHours()).padStart(2, '0')}<i>:</i>${String(d.getMinutes()).padStart(2, '0')}`; };
  function boardRowHtml(id, i, r, res, origin) {
    const s = D.byId.get(id);
    const bus = r ? r.legs.map(l => l.line.num).join(' › ') : res && res.status === 'near' ? 'À PIED' : origin ? '—' : '…';
    const dep = r ? 'depuis ' + r.legs[0].board.name : !origin ? 'Localisation…' : !res ? 'Calcul…' : res.status === 'near' ? 'Vous y êtes presque' : 'Aucun trajet';
    const t = r ? Math.round(r.totalMin) : null;
    return `<button class="led-row" style="animation-delay:${i * 70}ms" data-fav="${esc(id)}" title="${esc(`Aller à ${s.label}`)}">
      <span class="led-line">${esc(bus)}</span>
      <span class="led-dest"><b><span class="led-mq">${esc(s.label)}</span></b><small>${esc(dep)}</small></span>
      <span class="led-time${t != null && t <= 15 ? ' soon' : ''}">${t != null ? `${t}<small>min</small>` : ''}</span></button>`;
  }
  function renderBoard() {
    const el = $('fav-board');
    const favs = state.profile.favorites.filter(id => D.byId.has(id));
    if (!favs.length) {
      el.innerHTML = `<div class="empty"><p>Ajoutez vos destinations habituelles (maison, travail…) pour voir ici le meilleur bus depuis votre position.</p><button class="btn ghost sm" data-go="screen-profile">${ic('starO')}Ajouter un favori</button></div>`;
      return;
    }
    const origin = state.pos ? { lat: state.pos[0], lon: state.pos[1] } : null;
    const pk = origin ? `${origin.lat.toFixed(3)},${origin.lon.toFixed(3)}` : '';
    const cached = id => boardCache.get(id + '|' + pk);
    el.innerHTML = `<div class="led"><div class="led-top"><span>Mes destinations</span><span class="led-clock" id="led-clock">${ledClock()}</span></div>
      ${favs.map((id, i) => { const c = cached(id); return boardRowHtml(id, i, c && c.r, c && c.res, origin); }).join('')}</div>`;
    ledMarquee(el);
    if (!origin) return;
    // un favori à la fois, entre deux images : jamais de saccade pendant un défilement
    const job = ++boardJob;
    const todo = favs.filter(id => !cached(id));
    const step = () => {
      if (job !== boardJob || !todo.length) return;
      const id = todo.shift(), res = Core.findRoutes(D, origin, id), r = res && res.routes[0];
      boardCache.set(id + '|' + pk, { res, r }); if (boardCache.size > 60) boardCache.delete(boardCache.keys().next().value);
      const row = el.querySelector(`[data-fav="${CSS.escape(id)}"]`);
      if (row) { const tmp = document.createElement('div'); tmp.innerHTML = boardRowHtml(id, 0, r, res, origin); tmp.firstElementChild.style.animation = 'none'; row.replaceWith(tmp.firstElementChild); ledMarquee(el); }
      (window.requestIdleCallback || (f => setTimeout(f, 16)))(step);
    };
    setTimeout(step, 30);
  }
  // nom trop long pour le panneau : il défile, comme sur un vrai afficheur
  function ledMarquee(root) {
    requestAnimationFrame(() => root.querySelectorAll('.led-dest b').forEach(b => {
      const inner = b.firstElementChild; if (!inner) return;
      const over = inner.scrollWidth - b.clientWidth;
      b.classList.toggle('scroll', over > 4);
      if (over > 4) { inner.style.setProperty('--mq', `-${over + 12}px`); inner.style.animationDuration = `${Math.max(5, over / 22)}s`; }
    }));
  }
  setInterval(() => { const c = $('led-clock'); if (c && current === 'screen-home') c.innerHTML = ledClock(); }, 15000);
  $('fav-board').addEventListener('click', e => {
    const row = e.target.closest('[data-fav]');
    if (!row) return;
    setOriginStop(null); setDest(D.byId.get(row.dataset.fav)); runSearch();
  });
  $('manage-fav').onclick = () => show('screen-profile');

  function renderRecents() {
    const ids = state.recents.filter(id => D.byId.has(id));
    $('recents-section').hidden = !ids.length && !state.recentPlaces.length;
    $('recents').innerHTML = ids.map(id => `<button class="chip" data-recent="${esc(id)}">${ic('clock')}<span>${esc(D.byId.get(id).label)}</span></button>`).join('')
      + state.recentPlaces.map((r, i) => `<button class="chip" data-recent-place="${i}">${ic(r.icon || 'pin')}<span>${esc(r.name)}</span></button>`).join('');
  }
  $('recents').addEventListener('click', e => {
    const c = e.target.closest('[data-recent]');
    if (c) { setDest(D.byId.get(c.dataset.recent)); runSearch(); return; }
    const r = e.target.closest('[data-recent-place]');
    if (r) { const pl = state.recentPlaces[+r.dataset.recentPlace]; if (pl) { setDestPlace(pl); runSearch(); } }
  });
  $('clear-recents').onclick = () => {
    const old = state.recents.slice(), oldP = state.recentPlaces.slice();
    state.recents = []; state.recentPlaces = []; store.set('recents', []); store.set('recentPlaces', []); renderRecents();
    toast('Historique effacé.', 'info', 5000, { text: 'Annuler', fn: () => { state.recents = old; state.recentPlaces = oldP; store.set('recents', old); store.set('recentPlaces', oldP); renderRecents(); } });
  };
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
    if (state.destPlace && destInput.value === state.destPlace.label) return state.destPlace;
    if (state.dest && D.byId.has(state.dest)) return D.byId.get(state.dest);
    const s = Core.resolveStop(D, destInput.value);
    if (s) setDest(s);
    return s;
  }

  function runSearch() {
    closeSuggests();
    const dest = getDest();
    if (!dest) {
      toast(destInput.value.trim() ? 'Destination introuvable : choisissez un arrêt ou un lieu dans la liste.' : 'Indiquez votre destination.', 'error');
      destInput.focus(); return;
    }
    const origin = getOrigin();
    if (origin.error) { toast(origin.error, 'error', 5000); originInput.focus(); return; }
    if (origin.stopId && dest.id === origin.stopId) { toast('Le départ et la destination sont le même arrêt.', 'error'); destInput.focus(); return; }
    searchRoutes(origin, dest, $('search-btn'));
  }

  /* Recherche vers un arrêt (dest.id) ou vers un lieu quelconque (dest.place : pharmacie…) */
  function searchRoutes(origin, dest, btn) {
    if (btn) { btn.classList.add('loading'); btn.disabled = true; }
    setTimeout(() => {
      try {
        const res = Core.findRoutes(D, origin, dest.place ? { lat: dest.lat, lon: dest.lon } : dest.id, state.mode && state.mode !== 'all' ? { kinds: [state.mode] } : null);
        if (res.status === 'near') {
          toast(res.walkKm < 0.03 ? 'Vous êtes déjà à destination !' :
            `${dest.label} est à ${fmtDist(res.walkKm)} : environ ${fmtMin(Core.walkMin(res.walkKm * Core.CFG.DETOUR))} à pied.`, 'success', 5000);
          return;
        }
        if (res.status === 'noStops') { toast('Aucun arrêt de bus à moins de 2 km de votre point de départ.', 'error', 5000); return; }
        if (res.status === 'noDestStops') { toast(`Aucun arrêt à moins de 6 km de ${dest.label}. Prenez un taxi ou un saloni.`, 'error', 5000); return; }
        state.lastSearch = { origin, dest, res };
        const off = r => r.legs.some(l => lineOpen(l.line) === false) ? 1 : 0;
        state.routes = res.routes.slice().sort((x, y) => off(x) - off(y)); state.selected = 0; // lignes hors service en dernier
        if (dest.id) addRecent(dest.id); else if (dest.place && current === 'screen-home' && !priv.some(r => r.name === dest.label)) addRecentPlace(dest);
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
  // filtre par moyen de transport : tous, bus SOTRA, gbaka, wôrô-wôrô, saloni
  const MODES = [['all', 'Tous', 'route'], ['bus', 'Bus', 'bus'], ['gbaka', 'Gbaka', 'gbaka'], ['woro', 'Wôrô-wôrô', 'taxi'], ['saloni', 'Saloni', 'saloni'], ['bateau', 'Bateau', 'boat']];
  function renderModes() {
    const has = new Set(D.lines.map(l => l.kind));
    $('res-modes').innerHTML = MODES.filter(([k]) => k === 'all' || has.has(k)).map(([k, l, i]) => `<button type="button" class="res-mode${(state.mode || 'all') === k ? ' on' : ''}" data-mode="${k}" role="tab" aria-selected="${(state.mode || 'all') === k}">${ic(i)}<span>${l}</span></button>`).join('');
  }
  $('res-list').addEventListener('click', e => { const b = e.target.closest('.empty [data-mode]'); if (b && state.lastSearch) { state.mode = 'all'; store.set('mode', 'all'); searchRoutes(state.lastSearch.origin, state.lastSearch.dest); } });
  $('res-modes').addEventListener('click', e => {
    const b = e.target.closest('[data-mode]'); if (!b || !state.lastSearch) return;
    state.mode = b.dataset.mode; store.set('mode', state.mode);
    const { origin, dest } = state.lastSearch;
    searchRoutes(origin, dest);
  });
  function renderResults() {
    renderModes();
    const { origin, dest } = state.lastSearch;
    $('res-sub').innerHTML = `${esc(origin.label)} → <b>${esc(dest.label)}</b>`;
    updateFavToggle();
    const list = $('res-list');
    if (!state.routes.length) {
      const mf = state.mode && state.mode !== 'all' ? MODES.find(m => m[0] === state.mode) : null;
      list.innerHTML = mf ? `<div class="empty">${ic(mf[2])}<p><b>Aucun trajet en ${esc(mf[1].toLowerCase())}</b></p><p>Aucune ligne de ce type ne relie ces points dans nos données.</p><button class="btn ghost sm" data-mode="all">Voir tous les moyens</button></div>`
        : `<div class="empty">${ic('bus')}<p><b>Aucun itinéraire trouvé</b></p><p>Aucune ligne, même avec deux correspondances, ne relie ces arrêts dans nos données. Essayez un arrêt voisin.</p></div>`;
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
  // Fréquence et horaires de service (fiches OpenStreetMap) — avertit si la ligne ne circule pas maintenant
  function lineOpen(line) { if (!line.hours) return null; try { const o = PC.openingStatus(line.hours, new Date()); return o && typeof o.open === 'boolean' ? o.open : null; } catch (e) { return null; } }
  function lineInfo(line) {
    const bits = [];
    if (line.every) bits.push(`passe toutes les ${line.every >= 60 && line.every % 60 === 0 ? (line.every / 60) + ' h' : line.every + ' min'}`);
    const hm = line.hours && /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/.exec(line.hours);
    if (hm) bits.push(`de ${+hm[1]}h${hm[2] === '00' ? '' : hm[2]} à ${+hm[3]}h${hm[4] === '00' ? '' : hm[4]}`);
    const open = lineOpen(line);
    if (open === false) return `<br><small class="lg-off">⚠ Ne circule pas à cette heure${hm ? ` (${bits.slice(-1)[0]})` : ''}</small>`;
    return bits.length ? `<br><small class="lg-freq">${ic('clock')} ${bits.join(' · ')}</small>` : '';
  }
  function routeCard(r, i) {
    const chain = [];
    if (r.walkStartKm > 0.02) chain.push(`<span class="walk">${ic('walk')}<small>${fmtDist(r.walkStartKm)}</small></span>`);
    r.legs.forEach(l => { if (chain.length) chain.push('<span class="chev">›</span>'); chain.push(lineBadge(l.line.num)); });
    if (r.walkEndKm > 0.02) chain.push(`<span class="chev">›</span><span class="walk${r.endRide ? ' ride' : ''}">${ic(r.endRide ? 'saloni' : 'walk')}<small>${fmtDist(r.walkEndKm)}</small></span>`);
    const steps = r.legs.map((l, k) => {
      const n = l.to - l.from;
      return `<li><span class="lg-dot" style="--c:${lineColor(l.line.num)}"></span><div><b>${k === 0 ? 'Montez' : 'Correspondance'} à ${esc(l.board.name)}</b>${l.walkBeforeKm > 0.02 ? ` <small>(${fmtDist(l.walkBeforeKm)} à pied)</small>` : ''}<br><small>${l.line.veh} ${esc(l.line.num)} direction ${esc(direction(l.line))} · ${n} arrêt${n > 1 ? 's' : ''}</small>${lineInfo(l.line)}</div></li>`;
    }).join('') + `<li><span class="lg-dot end"></span><div><b>Descendez à ${esc(r.legs[r.legs.length - 1].alight.name)}</b>${r.walkEndKm > 0.02 ? (r.endRide ? ` <small>puis ${fmtDist(r.walkEndKm)} en saloni, taxi ou gbaka (~${fmtMin(Core.endMin(r.walkEndKm))}) — ou ~${fmtMin(Core.walkMin(r.walkEndKm))} à pied</small>` : ` <small>puis ${fmtDist(r.walkEndKm)} à pied</small>`) : ''}</div></li>`;
    return `<article class="route-card${i === state.selected ? ' selected' : ''}" data-i="${i}" tabindex="0" aria-label="Itinéraire ${i + 1}, ${fmtMin(r.totalMin)}">
      <div class="rc-top"><div class="chain">${chain.join('')}</div><div class="rc-time"><b>${fmtMin(r.totalMin)}</b><small>estimé</small></div></div>
      <ul class="rc-steps">${steps}</ul>
      <div class="rc-foot"><span>${r.nStops} arrêt${r.nStops > 1 ? 's' : ''}${costText(r)}${i === 0 ? '<span class="tag">Le plus rapide</span>' : ''}${r.legs.some(l => lineOpen(l.line) === false) ? '<span class="tag off">Hors service</span>' : ''}</span><button class="btn primary sm" data-track="${i}">Suivre</button></div>
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
    show('screen-track', { keepStack: true });
    renderTracking(true);
    requestWakeLock();
    if (state.pos) onTrackPos();
    if (typeof agRoute === 'function') setTimeout(agRoute, 1200);
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

  // Où en est-on sur le trajet ? On projette la position sur chaque tronçon arrêt → arrêt suivant
  // (autour de l'arrêt en cours) : on obtient le tronçon parcouru et la fraction déjà faite.
  function trackProgress(t, pos) {
    const n = t.pts.length, cosL = Math.cos(pos[0] * Math.PI / 180), K = 111.32;
    const xy = p => [(p.lon - pos[1]) * K * cosL, (p.lat - pos[0]) * K]; // km, origine = la position
    let best = null;
    for (let j = Math.max(0, t.idx - 1); j < Math.min(n - 1, Math.max(0, t.idx) + 8); j++) {
      const a = xy(t.pts[j]), b = xy(t.pts[j + 1]), vx = b[0] - a[0], vy = b[1] - a[1], L2 = vx * vx + vy * vy;
      const f = L2 ? Math.max(0, Math.min(1, -(a[0] * vx + a[1] * vy) / L2)) : 0;
      const d = Math.hypot(a[0] + vx * f, a[1] + vy * f);
      if (!best || d < best.d - 0.01 || (d <= best.d + 0.01 && j > best.j)) best = { j, f, d, len: Math.sqrt(L2) };
    }
    return best;
  }
  function onTrackPos() {
    const t = state.tracking;
    if (!t || !state.pos) return;
    const acc = (state.accuracy || 30) / 1000;
    // arrêt atteint : à moins de 60 m (ou de la précision GPS, 150 m au plus)
    const near = Math.min(0.15, Math.max(0.06, acc));
    let best = -1, bd = Infinity;
    for (let j = Math.max(0, t.idx); j < Math.min(t.pts.length, Math.max(0, t.idx) + 10); j++) {
      const d = dist(state.pos, t.pts[j]);
      if (d < bd) { bd = d; best = j; }
    }
    if (t.idx < 0 && dist(state.pos, t.pts[0]) <= Math.max(0.08, near)) t.sawStart = true;
    const pr = trackProgress(t, state.pos);
    t.seg = 0;
    if (best >= 0 && bd <= near && best > t.idx) setIdx(best, true);
    else if (pr && pr.d <= Math.max(0.15, acc * 1.5)) {
      // on suit le tracé : un arrêt dépassé sans passer tout près (bus rapide, GPS lent) compte quand même
      if (t.idx < 0) { if (t.sawStart && pr.j * 1 + pr.f > 0 && pr.len * pr.f > 0.1) setIdx(pr.j, true); }
      else if (pr.j > t.idx) setIdx(pr.j, true);
      if (pr.j === t.idx) t.seg = pr.f;
    }
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

    // avancement entre l'arrêt en cours et le suivant (0 à 1), d'après la position GPS
    let seg = t.idx >= 0 && !t.arrived ? (t.seg || 0) : 0;
    if (!seg && state.pos && t.idx >= 0 && t.pts[t.idx + 1]) { const a0 = t.pts[t.idx], b0 = t.pts[t.idx + 1], tot = dist([a0.lat, a0.lon], b0), rest = dist(state.pos, b0); seg = tot > 0 ? Math.max(0, Math.min(1, 1 - rest / tot)) : 0; }
    const box = $('trk-list');
    box.style.setProperty('--seg', seg.toFixed(3));
    // la liste n'est reconstruite que si l'arrêt en cours change : sinon seuls la jauge et le curseur bougent
    const key = `${t.idx}|${t.arrived}`;
    if (box._r !== t.r || box._key !== key || fit) {
      box._r = t.r; box._key = key;
      box.innerHTML = t.pts.map((p, j) => {
        const cls = [j < t.idx ? 'passed' : '', j === t.idx ? 'current' : '', p.kind !== 'stop' ? 'key' : ''].join(' ');
        const sub = p.kind !== 'stop' ? hint(p) : (j === t.idx ? 'Vous êtes ici' : '');
        return `<li class="${cls}" data-j="${j}" style="--c:${lineColor(p.line)}"><span class="tl-dot"></span><div><div class="tl-name">${esc(p.name)}</div>${sub ? `<div class="tl-sub">${esc(sub)}</div>` : ''}</div></li>`;
      }).join('') + `<li class="lst-me" aria-hidden="true">${ic(t.idx < 0 ? 'walk' : 'bus')}</li>`;
    }
    // curseur « vous » : glisse entre l'arrêt en cours et le suivant, au rythme du GPS
    const me = box.querySelector('.lst-me');
    if (me) {
      const i0 = Math.max(0, t.idx), li = box.children[i0], nx = box.children[i0 + 1];
      if (li) {
        const x0 = li.offsetLeft + li.offsetWidth / 2, x1 = nx && !nx.classList.contains('lst-me') ? nx.offsetLeft + nx.offsetWidth / 2 : x0;
        const x = t.idx < 0 ? x0 - 30 : x0 + (x1 - x0) * seg;
        me.style.transform = `translateX(${(x - 13).toFixed(1)}px)`;
        me.classList.toggle('pre', t.idx < 0);
        me.hidden = !!t.arrived;
        // la bande défile toute seule pour garder « vous » à l'écran (sauf si on vient de la faire défiler au doigt)
        if (Date.now() - (box._touchT || 0) > 6000) {
          const left = Math.max(0, x - box.clientWidth * 0.4);
          if (Math.abs(box.scrollLeft - left) > 4) box.scrollTo({ left, behavior: fit || !box.dataset.done ? 'auto' : 'smooth' });
          box.dataset.done = '1';
        }
      }
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
    if (!live.open) { live.open = true; $('live').classList.add('open'); $('live-pill').setAttribute('aria-expanded', 'true'); }
    renderTrkAd();
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

  // les boutons de la carte (boussole) restent sous la bulle, quelle que soit sa hauteur
  try {
    const top = document.querySelector('#screen-track .imm-top');
    new ResizeObserver(() => $('screen-track').style.setProperty('--imm-top-h', top.getBoundingClientRect().bottom - $('screen-track').getBoundingClientRect().top + 'px')).observe(top);
  } catch (_) {}

  /* ---------- Espace publicitaire « À l'arrivée » (écran Trajet) ----------
     1. publications sponsorisées des commerces proches de la destination (table publications) ;
     2. la destination elle-même si c'est un lieu ; 3. les lieux les plus visités ou proches de l'arrivée.
     Les diapositives défilent toutes seules ; tout ce qui est payé porte la mention « Sponsorisé ». */
  const ads = { list: [], i: 0, timer: 0, key: '' };
  async function fetchPubs(lat, lon) {
    if (!sbOn()) return [];
    const dl = 0.05, r = await sb(`/rest/v1/publications?select=id,place_id,nom,cat,lat,lon,titre,texte,tel,rayon_m,priorite&lat=gte.${(lat - dl).toFixed(4)}&lat=lte.${(lat + dl).toFixed(4)}&lon=gte.${(lon - dl).toFixed(4)}&lon=lte.${(lon + dl).toFixed(4)}&order=priorite.desc&limit=20`);
    if (!r.ok || !Array.isArray(r.data)) return [];
    return r.data.filter(x => Core.haversine(lat, lon, x.lat, x.lon) * 1000 <= (x.rayon_m || 600));
  }
  async function renderTrkAd() {
    const t = state.tracking, box = $('trk-ad');
    if (!t) { box.hidden = true; return; }
    const d = t.destObj && Number.isFinite(t.destObj.lat) ? t.destObj : t.pts[t.pts.length - 1];
    const key = `${d.lat},${d.lon}`;
    if (ads.key === key && ads.list.length) return;
    ads.key = key;
    const slides = [];
    const pubs = await fetchPubs(d.lat, d.lon);
    pubs.forEach(x => slides.push({ kind: 'pub', x }));
    // campagnes de la régie autour de l'arrivée (panneaux virtuels du quartier de destination)
    const tday = new Date().toISOString().slice(0, 10);
    (regie.data.rows || []).filter(c => String(c.debut).slice(0, 10) <= tday && String(c.fin).slice(0, 10) >= tday && Core.haversine(d.lat, d.lon, c.lat, c.lon) * 1000 <= Math.max(c.rayon_m, 1000))
      .sort((a, b) => Core.haversine(d.lat, d.lon, a.lat, a.lon) - Core.haversine(d.lat, d.lon, b.lat, b.lon)).slice(0, 3)
      .forEach(c => slides.unshift({ kind: 'camp', c }));
    const destPlace = t.destObj && t.destObj.place ? placesBase().find(p => Core.haversine(p.lat, p.lon, d.lat, d.lon) < 0.03 && p.name === t.destObj.label) : null;
    if (destPlace) slides.push({ kind: 'dest', p: withStatus(destPlace) });
    const popIds = new Set(((pop.list && pop.list.rows) || []).map(r => r.place_id));
    const near = placesBase().filter(p => p !== destPlace && (p.cat === 'resto' || p.cat === 'shop' || p.cat === 'hotel') && p.name !== PYC.CATS[p.cat].one && Math.abs(p.lat - d.lat) < 0.005 && Math.abs(p.lon - d.lon) < 0.005)
      .map(p => [p, Core.haversine(p.lat, p.lon, d.lat, d.lon)]).filter(([, k]) => k < 0.4)
      .sort((a, b) => (popIds.has(b[0].id) - popIds.has(a[0].id)) || a[1] - b[1]).slice(0, 3);
    near.forEach(([p, k]) => slides.push({ kind: 'near', p: withStatus(p), k, popular: popIds.has(p.id) }));
    if (CONFIG.adsContact) slides.push({ kind: 'house' });
    ads.list = slides; ads.i = 0;
    if (!slides.length) { box.hidden = true; return; }
    box.hidden = false;
    $('trk-ad-rail').innerHTML = slides.map((sl, i) => {
      if (sl.kind === 'camp') { const c = sl.c, col = (CAMP_COL[c.couleur] || CAMP_COL.jaune)[1];
        return `<article class="ad-slide pub" data-ad="${i}" style="--c:${col}"><span class="ad-ic">${ic(CAMP_CAT_IC[c.cat] || 'explore')}</span><span class="ad-main"><small class="ad-tag">Publicité · ${esc(c.commerce)}</small><b>${esc(c.titre)}${c.accroche ? ' · ' + esc(c.accroche) : ''}</b>${c.sous_titre ? `<small>${esc(c.sous_titre)}</small>` : ''}</span></article>`; }
      if (sl.kind === 'pub') { const x = sl.x, c = PY_COLOR[x.cat] || 'var(--brand)';
        return `<article class="ad-slide pub" data-ad="${i}" style="--c:${c}"><span class="ad-ic">${ic(PY_ICON[x.cat] || (x.cat === 'pharma' ? 'cross' : 'explore'))}</span><span class="ad-main"><small class="ad-tag">Sponsorisé · ${esc(x.nom)}</small><b>${esc(x.titre)}</b>${x.texte ? `<small>${esc(x.texte)}</small>` : ''}</span>${x.tel ? `<a class="ad-call" href="${esc(telHref(x.tel))}" data-ph-call aria-label="Appeler ${esc(x.nom)}">${ic('phone')}</a>` : ''}</article>`; }
      if (sl.kind === 'dest') { const p = sl.p;
        return `<article class="ad-slide" data-ad="${i}" style="--c:${PY_COLOR[p.cat] || 'var(--brand)'}"><span class="ad-ic">${ic(PY_ICON[p.cat] || 'pin')}</span><span class="ad-main"><small class="ad-tag">Votre destination</small><b>${esc(p.name)}</b><small>${esc([p.sub, p.hours ? pyStatus(p, true) : ''].filter(Boolean).join(' · '))}</small></span>${p.phone ? `<a class="ad-call" href="${esc(telHref(String(p.phone).split(/[;,/]/)[0]))}" data-ph-call aria-label="Appeler">${ic('phone')}</a>` : ''}</article>`; }
      if (sl.kind === 'near') { const p = sl.p;
        return `<article class="ad-slide" data-ad="${i}" style="--c:${PY_COLOR[p.cat]}"><span class="ad-ic">${ic(PY_ICON[p.cat])}</span><span class="ad-main"><small class="ad-tag">${sl.popular ? 'Très visité · ' : ''}Près de votre arrivée · ${fmtDist(sl.k)}</small><b>${esc(p.name)}</b><small>${esc(p.sub || '')}</small></span></article>`; }
      return `<article class="ad-slide house" data-ad="${i}"><span class="ad-ic">${ic('explore')}</span><span class="ad-main"><small class="ad-tag">Publicité</small><b>Votre commerce ici ?</b><small>Faites-vous connaître des voyageurs qui arrivent près de chez vous.</small></span></article>`;
    }).join('');
    $('trk-ad-dots').innerHTML = slides.length > 1 ? slides.map((_, i) => `<i class="${i ? '' : 'on'}"></i>`).join('') : '';
    clearInterval(ads.timer);
    if (slides.length > 1) ads.timer = setInterval(() => { if (current === 'screen-track' && !ads.hold) adGo(ads.i + 1); }, 6000);
  }
  function adGo(i) {
    const rail = $('trk-ad-rail'), n = ads.list.length; if (!n) return;
    ads.i = (i + n) % n;
    rail.scrollTo({ left: rail.clientWidth * ads.i, behavior: 'smooth' });
    $('trk-ad-dots').querySelectorAll('i').forEach((d, k) => d.classList.toggle('on', k === ads.i));
  }
  $('trk-ad-rail').addEventListener('scroll', debounce(() => { const r = $('trk-ad-rail'); ads.i = Math.round(r.scrollLeft / Math.max(1, r.clientWidth)); $('trk-ad-dots').querySelectorAll('i').forEach((d, k) => d.classList.toggle('on', k === ads.i)); }, 80), { passive: true });
  $('trk-ad-rail').addEventListener('pointerdown', () => { ads.hold = true; clearTimeout(ads.holdT); ads.holdT = setTimeout(() => { ads.hold = false; }, 12000); });
  $('trk-ad-rail').addEventListener('click', e => {
    if (e.target.closest('[data-ph-call]')) return;
    const el = e.target.closest('[data-ad]'); if (!el) return;
    const sl = ads.list[+el.dataset.ad]; if (!sl) return;
    if (sl.kind === 'camp') { campOpen(sl.c); return; }
    if (sl.kind === 'pub') { const x = sl.x, b = x.place_id && placesBase().find(p => p.id === x.place_id); openDetail(withStatus(b || { id: 'ad' + x.id, cat: PYC.CATS[x.cat] ? x.cat : 'shop', name: x.nom, sub: x.titre, lat: x.lat, lon: x.lon, phone: x.tel || undefined, note: x.texte || '' }), 'screen-track', 'paiya'); }
    else if (sl.kind === 'dest' || sl.kind === 'near') openDetail(sl.p, 'screen-track', 'paiya');
    else if (sl.kind === 'house' && CONFIG.adsContact) openExternal(CONFIG.adsContact);
  });

  function syncNavFab() {
    if (!trkMap || !trkMap._locate) return;
    trkMap._locate.classList.toggle('on', trkFollow);
    trkMap._locate.innerHTML = ic(trkFollow && trkRotate ? 'navigation' : 'locate');
  }
  function endTracking() {
    clearInterval(ads.timer); ads.list = []; ads.key = ''; $('trk-ad').hidden = true;
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
  ['pointerdown', 'wheel'].forEach(ev => $('trk-list').addEventListener(ev, () => { $('trk-list')._touchT = Date.now(); }, { passive: true }));
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
    renderFriends(); renderPrivList(); renderGroups(); renderMyLines(); renderCompte();
    frRefresh(true);
    // les lieux reçus affichés sont considérés comme vus
    setTimeout(() => { if (current === 'screen-profile' && fr.recus.some(r => !r.lu)) { fr.recus.forEach(r => { if (!r.lu) { r.lu = true; rpc('lieu_recu_maj', { p_id: r.id }); } }); store.set('recus', fr.recus); syncBadge(); renderFriends(); } }, 4000);
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
    if (b) {
      const id = b.dataset.remove, pos = state.profile.favorites.indexOf(id);
      state.profile.favorites = state.profile.favorites.filter(x => x !== id); saveProfile(); renderProfile();
      toast(`${D.byId.get(id).label} retiré des favoris.`, 'info', 5000, { text: 'Annuler', fn: () => { if (!state.profile.favorites.includes(id)) { state.profile.favorites.splice(pos, 0, id); saveProfile(); renderProfile(); } } });
    }
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
      ? { id: ex.id, name: ex.name, lat: ex.lat, lon: ex.lon, links: (ex.links || []).filter(n => lineByName(n)), nums: (ex.nums || []).slice(), ext: !!ex.ext, note: ex.note || '', created: ex.created }
      : { id: null, name: '', lat: null, lon: null, links: [], nums: [], ext: false, note: '' };
    $('as-title').textContent = ex ? 'Modifier l\'arrêt' : 'Nouvel arrêt';
    setAsMode(draft.ext ? 'ext' : 'new');
    $('as-ext-q').value = '';
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

  // « Arrêt existant » : on ajoute un bus à un arrêt déjà connu (même nom, même position : il s'y rattache)
  function setAsMode(m) {
    draft.ext = m === 'ext';
    $('as-mode').querySelectorAll('button').forEach(b => { const on = b.dataset.m === m; b.classList.toggle('active', on); b.setAttribute('aria-checked', String(on)); });
    $('as-new-box').hidden = draft.ext; $('as-ext-box').hidden = !draft.ext; $('as-loc-card').hidden = draft.ext;
    $('as-bus-hint').textContent = draft.ext ? 'Ajoutez au moins un bus : un numéro de la liste (il servira aussitôt aux itinéraires) ou un numéro absent de nos lignes (affiché à l’arrêt, à confirmer).'
      : 'Facultatif. Sans bus, l\'arrêt sert de point de repère : on vous guide jusqu\'à l\'arrêt desservi le plus proche.';
    if (!draft.id) $('as-title').textContent = draft.ext ? 'Ajouter un bus à un arrêt' : 'Nouvel arrêt';
    if (draft.ext) renderExtList();
  }
  function renderExtList() {
    const q = $('as-ext-q').value.trim();
    const ref = draft.lat != null ? [draft.lat, draft.lon] : state.pos;
    let list = q.length >= 2 ? Core.searchStops(D, q, 10).map(x => x.stop || x) : ref ? Core.nearbyStops(D, ref[0], ref[1], 1.5, 8).map(n => n.stop) : [];
    list = list.filter(Boolean);
    const sel = draft.ext && draft.name ? Core.norm(draft.name) : null;
    $('as-ext-list').innerHTML = list.length ? list.map(st => {
      const on = sel === st.key && draft.lat != null && Core.haversine(st.lat, st.lon, draft.lat, draft.lon) < 0.08;
      return `<button type="button" role="radio" aria-checked="${on}" class="as-ext${on ? ' on' : ''}" data-st="${esc(st.id)}">${ic('bus')}<span><b>${esc(st.label)}</b><span class="sg-lines">${linesHtml(st) || '<small>aucun bus connu</small>'}</span></span>${ref ? `<small>${fmtDist(Core.haversine(ref[0], ref[1], st.lat, st.lon))}</small>` : ''}</button>`;
    }).join('') : `<p class="muted">${q.length >= 2 ? 'Aucun arrêt trouvé.' : 'Tapez le nom de l’arrêt.'}</p>`;
  }
  $('as-mode').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b && !draft.id) { setAsMode(b.dataset.m); if (b.dataset.m === 'new' && !draft.name) $('as-name').value = ''; } });
  $('as-ext-q').addEventListener('input', debounce(renderExtList, 150));
  $('as-ext-list').addEventListener('click', e => {
    const b = e.target.closest('[data-st]'); if (!b) return;
    const st = D.byId.get(b.dataset.st); if (!st) return;
    draft.name = st.name; $('as-name').value = st.name;
    draft.lat = +st.lat.toFixed(6); draft.lon = +st.lon.toFixed(6); draft.acc = null;
    renderExtList(); renderLinks(); vibrate(10);
  });
  $('as-add-num').onclick = () => {
    const n = $('as-num').value.trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (!n) { toast('Tapez le numéro du bus.', 'error'); return; }
    if (lineNums().includes(n)) { toast(`Le bus ${n} est dans la liste : choisissez-le ci-dessus, il servira aussitôt aux itinéraires.`, 'info', 6000); $('as-bus').value = n; fillDirSelect(); $('as-num').value = ''; return; }
    if (!draft.nums.includes(n)) draft.nums.push(n);
    $('as-num').value = ''; renderLinks();
  };
  function renderLinks() {
    const ul = $('as-links');
    if (!draft.links.length && !(draft.nums || []).length) { ul.innerHTML = ''; return; }
    const busNums = lineNums().filter(n => (D.lines.find(l => l.num === n) || {}).kind === 'bus');
    draft.numFrom = draft.numFrom || {};
    ul.innerHTML = (draft.nums || []).map((n, i) => `<li><span class="lb unv">${esc(n)}</span><div><b>Bus ${esc(n)}</b>
      <label class="as-follow">Il suit le trajet de la ligne <select class="input sm" data-numfrom="${esc(n)}"><option value="">trajet inconnu</option>${busNums.map(x => `<option value="${esc(x)}"${draft.numFrom[n] === x ? ' selected' : ''}>${esc(x)} · ${esc((D.lines.find(l => l.num === x).title || '').split('→')[0])}</option>`).join('')}</select></label>
      <small>${draft.numFrom[n] ? `Le bus ${esc(n)} sera ajouté sur tout le trajet de la ligne ${esc(draft.numFrom[n])} (les deux sens) et servira aux itinéraires.` : 'Trajet inconnu : affiché à l’arrêt (à confirmer), pas encore utilisé pour les itinéraires.'}</small></div><button type="button" class="x-btn" data-unnum="${i}" aria-label="Retirer ce numéro">${ic('close')}</button></li>`).join('') + draft.links.map((n, i) => {
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
  $('as-links').addEventListener('change', e => {
    const sel = e.target.closest('[data-numfrom]'); if (!sel) return;
    draft.numFrom = draft.numFrom || {}; draft.numFrom[sel.dataset.numfrom] = sel.value; renderLinks();
  });
  $('as-links').addEventListener('click', e => {
    const b = e.target.closest('[data-unlink]');
    if (b) { draft.links.splice(+b.dataset.unlink, 1); renderLinks(); }
    const u = e.target.closest('[data-unnum]');
    if (u) { draft.nums.splice(+u.dataset.unnum, 1); renderLinks(); }
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
    const name = (draft.ext ? draft.name : $('as-name').value).trim().replace(/\s+/g, ' ');
    if (draft.ext && (!name || draft.lat == null)) { toast('Choisissez l’arrêt dans la liste.', 'error'); return; }
    if (draft.ext && !draft.links.length && !draft.nums.length) { toast('Ajoutez au moins un bus à cet arrêt.', 'error'); return; }
    if (name.length < 2) { toast('Donnez un nom à l\'arrêt.', 'error'); $('as-name').focus(); return; }
    if (draft.lat == null) { toast('Choisissez l\'emplacement : votre position ou un point sur la carte.', 'error'); return; }
    const far = draft.links.map(lineByName).filter(Boolean)
      .filter(l => Core.insertionPoint(l.stops.filter(x => !isSelf(x)), draft.lat, draft.lon).nearestKm > 1);
    if (far.length && !confirm(`L'emplacement est loin du tracé connu du bus ${far.map(l => l.num).join(', ')}. Enregistrer quand même ?`)) return;
    const rec = {
      id: draft.id || 'u-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name, lat: draft.lat, lon: draft.lon, links: draft.links.slice(), nums: (draft.nums || []).slice(), ext: !!draft.ext,
      note: $('as-note').value.trim(), created: draft.created || new Date().toISOString(), updated: new Date().toISOString()
    };
    const follow = Object.entries(draft.numFrom || {}).filter(([n, from]) => from && rec.nums.includes(n));
    if (follow.length) {
      const all = busCopiesGet().filter(bc => !follow.some(([n]) => bc.num === n));
      follow.forEach(([n, from]) => all.push({ num: n, from: RAW.filter(l => D.lines.some(d => d.name === l.name && d.num === from)).map(l => l.name), via: from, created: new Date().toISOString() }));
      try { localStorage.setItem('zupa:busCopies', JSON.stringify(all)); } catch (_) {}
      rebuildNetwork();
      // l'arrêt est relié au nouveau bus (il est inséré sur son trajet s'il n'y est pas déjà)
      follow.forEach(([n]) => { D.lines.filter(l => l.num === n).forEach(l => { if (!rec.links.includes(l.name)) rec.links.push(l.name); }); rec.nums = rec.nums.filter(x => x !== n); });
    }
    const i = customStops.findIndex(c => c.id === rec.id);
    if (i >= 0) customStops[i] = rec; else customStops.push(rec);
    saveCustom();
    rebuildNetwork();
    const isNew = i < 0;
    draft = null;
    const addedNums = [...new Set(rec.links.map(n => (lineByName(n) || Core.parseName(n)).num).concat(rec.nums))];
    toast(rec.ext ? `Bus ${addedNums.join(', ')} ajouté${addedNums.length > 1 ? 's' : ''} à « ${name} ».` : isNew ? `Arrêt « ${name} » enregistré.` : 'Arrêt modifié.', 'success', 5000, {
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
  $('as-back').onclick = () => goBack();
  // garde-fou : quitter l'ajout d'un arrêt avec des changements non enregistrés
  const snapDraft = () => draft ? JSON.stringify([draft.name || '', draft.lat, draft.lon, (draft.links || []).join(), (draft.nums || []).join(), $('as-note').value]) : '';
  let asSnap = '';
  leaveGuards['screen-addstop'] = () => {
    if (draft && snapDraft() !== asSnap && !confirm('Quitter sans enregistrer cet arrêt ?')) return false;
    draft = null; return true;
  };
  $('add-stop-btn').onclick = () => openAddStop(null, 'screen-profile');

  function renderBusCopies() {
    const box = $('bus-copies'); if (!box) return;
    const bcs = busCopiesGet();
    box.innerHTML = bcs.length ? `<p class="muted bc-h">Bus ajoutés sur une ligne existante</p>` + bcs.map((bc, i) => `<li>${ic('bus')}<span>Bus ${esc(bc.num)}<br><small class="muted">même trajet que la ligne ${esc(bc.via || '?')}</small></span><button class="btn ghost sm" data-bc-del="${i}">Retirer</button></li>`).join('') : '';
  }
  function renderCustomList() {
    renderBusCopies();
    const ul = $('custom-list');
    if (!customStops.length) { ul.innerHTML = '<li class="muted">Aucun arrêt ajouté pour l\'instant.</li>'; $('export-stops').disabled = true; return; }
    $('export-stops').disabled = false;
    ul.innerHTML = customStops.map(c => {
      const nums = [...new Set((c.links || []).map(n => (lineByName(n) || Core.parseName(n)).num).concat(c.nums || []))];
      return `<li>${ic('addPin')}<span>${esc(c.name)}${c.ext ? ' <small class="muted">(arrêt existant)</small>' : ''}<br><small class="muted">${nums.length ? 'Bus ' + nums.map(esc).join(', ') : 'Sans bus'}${c.note ? ' · ' + esc(c.note) : ''}</small></span><button class="btn ghost sm" data-edit-stop="${esc(c.id)}">Modifier</button></li>`;
    }).join('');
  }
  $('bus-copies').addEventListener('click', e => {
    const b = e.target.closest('[data-bc-del]'); if (!b) return;
    const all = busCopiesGet(), bc = all[+b.dataset.bcDel]; if (!bc || !confirm(`Retirer le bus ${bc.num} ?`)) return;
    all.splice(+b.dataset.bcDel, 1); try { localStorage.setItem('zupa:busCopies', JSON.stringify(all)); } catch (_) {}
    rebuildNetwork(); renderCustomList(); toast(`Bus ${bc.num} retiré.`);
  });
  $('custom-list').addEventListener('click', e => {
    const b = e.target.closest('[data-edit-stop]');
    if (b) openAddStop(b.dataset.editStop, 'screen-profile');
  });

  $('export-stops').onclick = async () => {
    const payload = {
      app: 'ZUPA', version: 1, exported: new Date().toISOString(),
      stops: customStops.map(c => ({ name: c.name, lat: c.lat, lon: c.lon, note: c.note || '', lines: c.links || [], nums: c.nums || [], ext: !!c.ext, created: c.created }))
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
    checkedAt: store.get('gardesChecked', 0), checking: false, checkFailed: false, manual: store.get('gardesManuelles', [])
  };
  const isNative = () => !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  function openExternal(url) { if (isNative()) location.href = url; else window.open(url, '_blank', 'noopener'); }
  const telHref = t => 'tel:' + String(t).replace(/[^\d+]/g, '');
  const fmtPhone = t => {
    const d = String(t).replace(/[^\d+]/g, '').replace(/^\+?225/, '');
    return d.length === 10 ? d.replace(/(\d{2})(?=\d)/g, '$1 ').trim() : t;
  };
  // liste de garde officielle + pharmacies de garde ajoutées par l'administrateur (actives aujourd'hui)
  const manualToday = () => { const t = PC.dayStr(new Date()); return (ph.manual || []).filter(m => m.du <= t && t <= m.au); };
  const gardeOn = () => PC.gardeState(ph.gardes) === 'current' || manualToday().length > 0;
  function effGardes() {
    const man = manualToday().map(m => ({ nom: m.nom, commune: m.commune || null, adresse: m.adresse || null, tel: m.tel || null, tels: m.tel ? [m.tel] : [], lat: m.lat ?? undefined, lon: m.lon ?? undefined, manuel: true }));
    const off = PC.gardeState(ph.gardes) === 'current' ? PC.pickWeek(ph.gardes) : null;
    if (!off && !man.length) return null;
    const t = PC.dayStr(new Date());
    return { du: off ? off.du : t, au: off ? off.au : t, source: off ? off.source : 'ZUPA', pharmacies: [...(off ? off.pharmacies : []), ...man] };
  }
  const week = () => PC.pickWeek(ph.gardes);
  // « du 24 au 30 oct. » (mois répété seulement s'il change)
  const fmtRange = (a, b) => { const d1 = new Date(a + 'T12:00:00'), d2 = new Date(b + 'T12:00:00');
    if (isNaN(d1) || isNaN(d2)) return `du ${a} au ${b}`;
    const same = d1.getMonth() === d2.getMonth();
    const o = { day: 'numeric', month: 'short' };
    const l = same ? String(d1.getDate()) : d1.toLocaleDateString('fr-FR', o);
    return `du ${l} au ${d2.toLocaleDateString('fr-FR', o)}`; };
  const fmtDay = s => { const d = new Date(s + 'T12:00:00'); return isNaN(d) ? s : d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }); };

  // pharmacies ajoutées par les utilisateurs (base partagée) et cliniques (OpenStreetMap + ajouts)
  function commPharmacies() {
    const rows = [...((comm.list && comm.list.rows) || []), ...comm.mine].filter(r => r.cat === 'pharma');
    const m = new Map(); rows.forEach(r => m.set(r.id, { id: 'z' + r.id, name: r.name, lat: r.lat, lon: r.lon, phone: r.phone || null, hours: r.hours || null, commune: null, street: null, community: true }));
    return [...m.values()];
  }
  const clinics = () => placesBase().filter(p => p.cat === 'sante').map(withStatus);
  function allPharmacies() {
    const base = PC.mergeLists(PC.mergeLists(PH_EMBED, ph.cache && ph.cache.list), commPharmacies());
    const list = PC.applyGardes(base, effGardes());
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
    if (sbOn()) { // pharmacies de garde ajoutées par l'administrateur
      const r = await sb('/rest/v1/gardes_manuelles?select=id,nom,commune,adresse,tel,lat,lon,du,au&order=du.desc&limit=200');
      if (r.ok && Array.isArray(r.data)) { ph.manual = r.data; store.set('gardesManuelles', ph.manual); }
    }
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
    const f = ph.filter || 'all';
    let list = f === 'clinic' ? clinics() : allPharmacies();
    if (f === 'garde') list = list.filter(p => p.garde);
    else if (f === 'open') list = list.filter(p => p.st === 'garde' || p.st === 'open');
    const q = Core.key(ph.q);
    if (q) list = list.filter(p => Core.matchScore(q, Core.key([p.name, p.commune, p.street, p.garde && p.garde.commune, p.garde && p.garde.quartier, (nearStop(p) || {}).name].filter(Boolean).join(' '))) >= 0);
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
  $('ph-garde').addEventListener('click', e => {
    const h = e.target.closest('.gb-head'); if (!h) return;
    const open = !$('ph-garde').classList.contains('open');
    store.set('gardeOpen', open);
    $('ph-garde').classList.toggle('open', open); h.setAttribute('aria-expanded', String(open));
  });
  function freshLine(stt) {
    const g = week();
    const maj = ph.gardes && ph.gardes.maj ? fmtDay(ph.gardes.maj) : g && g.maj ? fmtDay(g.maj) : null;
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
      const nMan = manualToday().length;
      const detail = (nInt ? `${g.pharmacies.length - nInt} à Abidjan · ${nInt} dans ${villes} villes de l'intérieur` : `${g.pharmacies.length} pharmacies`) + (nMan ? ` · ${nMan} ajoutée${nMan > 1 ? 's' : ''} par ZUPA` : '');
      const open = !!store.get('gardeOpen', false);
      el.className = 'garde-banner fold' + (open ? ' open' : '');
      el.innerHTML = `<button type="button" class="gb-head" aria-expanded="${open}">${ic('cross')}<span class="gb-title"><b>De garde</b><span class="gb-dates">${esc(fmtRange(g.du, g.au))}</span><small class="gb-maj">${(ph.gardes && ph.gardes.maj) || g.maj ? `Mise à jour le ${esc(fmtDay((ph.gardes && ph.gardes.maj) || g.maj))}` : 'Liste UNPPCI de la semaine'}${ph.checking ? ' · vérification…' : ph.checkedAt && !ph.checkFailed ? ` · vérifiée ${fmtAgo(ph.checkedAt)}` : ph.checkedAt ? ` · hors ligne` : ''}</small></span><span class="fresh ok${ph.checking ? ' checking' : ''}"><i></i>À jour</span>${ic('chevron')}</button><div class="gb-body"><div><small>${detail} · source : UNPPCI</small>${freshLine(stt)}</div></div>`;
    } else {
      el.className = 'garde-banner warn';
      el.innerHTML = `${ic('info')}<span><b>Liste de garde ${stt === 'expired' ? 'expirée' : stt === 'future' ? 'pas encore en vigueur' : 'indisponible'}</b><small>${stt === 'expired' ? `Dernière liste : semaine du ${esc(fmtDay(g.du))}. ` : ''}Connectez-vous à internet pour recevoir la liste de la semaine. En attendant, les pharmacies ouvertes sont indiquées selon leurs horaires.</small>${freshLine(stt)}</span>`;
    }
  }

  function phCard(p) {
    const ns = p.approx ? null : nearStop(p);
    const meta = [p.garde && p.garde.adresse || p.street, p.commune || (p.garde && p.garde.commune)].filter(Boolean).join(' · ') || (ns ? `Près de l'arrêt ${ns.name}` : '');
    const fol = isFollowed('pharma', p.id);
    const st = fol ? '<small class="py-st follow">suivie</small>'
      : p.st === 'garde' ? '<small class="ph-badge">GARDE</small>'
      : p.st === 'open' ? `<small class="py-st open">${esc(statusLabel(p))}</small>`
      : p.st === 'closed' ? '<small class="py-st closed">Fermée</small>'
      : (p.d != null && !p.approx ? `<small>${fmtMin(Core.walkMin(p.d * Core.CFG.DETOUR))} à pied</small>` : '');
    const tel = p.phone || (p.garde && p.garde.tels && p.garde.tels[0]);
    return `<div class="py-row ph-row${p.st === 'garde' ? ' garde' : ''}${fol ? ' following' : ''}" data-ph="${esc(p.id)}" role="button" tabindex="0" aria-pressed="${fol}">
      <span class="py-ic">${ic(p.cat === 'sante' ? 'clinic' : 'cross')}</span>
      <span class="py-main"><b>${fol ? `<span class="mq-host"><span class="mq-in">${esc(p.name)}</span></span>` : `<span>${esc(p.name)}</span>`}</b><small>${esc(meta)}</small></span>
      <span class="py-d">${p.d != null ? `<b>${p.approx ? '≈ ' : ''}${fmtDist(p.d)}</b>` : ''}${st}</span>
      ${tel ? `<a class="ph-call" href="${esc(telHref(tel))}" data-ph-call aria-label="Appeler ${esc(p.name)}">${ic('phone')}</a>` : '<span class="ph-call off" aria-hidden="true"></span>'}
      <button class="py-more-btn" type="button" data-ph-go="${esc(p.id)}" aria-label="Fiche et carte de ${esc(p.name)}">${ic('chevron')}</button>
    </div>`;
  }

  // Accroche du haut : la nuit et le week-end, on cherche surtout une pharmacie de garde
  function phTitle() {
    const d = new Date(), h = d.getHours(), we = d.getDay() === 0 || (d.getDay() === 6 && h >= 13);
    if (h >= 20 || h < 7) return 'Une pharmacie de garde cette nuit ?';
    if (we) return 'De garde ce week-end';
    return h < 12 ? 'Une pharmacie ce matin ?' : 'Une pharmacie près de vous';
  }
  function renderPharma() {
    if (!ph.checking && Date.now() - ph.checkedAt > 3 * 3600e3 && Date.now() - (ph.lastCheckTry || 0) > 120e3) { ph.lastCheckTry = Date.now(); loadGardes(); }
    renderGardeBanner();
    const f = ph.filter || 'all';
    document.querySelectorAll('#ph-filter button').forEach(b => { const on = b.dataset.f === f; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on)); });
    const all = allPharmacies(), near = all.filter(p => p.d != null && !p.approx && p.d <= 3);
    $('ph-n-garde').textContent = all.filter(p => p.garde).length || '';
    $('ph-n-open').textContent = all.filter(p => p.st === 'garde' || p.st === 'open').length || '';
    $('ph-n-all').textContent = all.length;
    $('ph-n-clinic').textContent = placesBase().filter(p => p.cat === 'sante').length || '';
    const t = phTitle(), tEl = $('ph-title');
    if (tEl.textContent !== t) { tEl.textContent = t; tEl.classList.remove('swap'); void tEl.offsetWidth; tEl.classList.add('swap'); }
    const ng = near.filter(p => p.garde).length, closest = near.filter(p => p.garde).sort((a, b) => a.d - b.d)[0];
    $('ph-pulse').textContent = !state.pos ? 'Activez la localisation pour voir les pharmacies autour de vous.'
      : ng ? `${ng} de garde à moins de 3 km · la plus proche à ${fmtDist(closest.d)}`
      : gardeOn() ? 'Aucune pharmacie de garde à moins de 3 km' : `${near.length} pharmacies à moins de 3 km`;
    $('ph-list-h').textContent = f === 'garde' ? 'De garde autour de vous' : f === 'open' ? 'Ouvertes maintenant' : f === 'clinic' ? 'Cliniques et centres de santé' : 'Autour de vous';
    $('ph-sub').textContent = state.pos ? (state.placeName || '') : 'triées par nom';
    const list = phFiltered();
    if (!list.length) {
      const total = PH_EMBED.length + (ph.cache ? ph.cache.list.length : 0);
      $('ph-list').classList.add('is-empty');
      $('ph-list').innerHTML = `<div class="py-empty">${ic('cross')}<p><b>${ph.q ? 'Aucune pharmacie ne correspond' : f === 'garde' ? 'Aucune pharmacie de garde trouvée' : 'Aucune pharmacie trouvée'}</b></p><p>${!total ? 'Connectez-vous à internet puis touchez « Actualiser » pour charger les pharmacies autour de vous.' : f !== 'all' ? 'Essayez le filtre « Toutes ».' : 'Modifiez votre recherche.'}</p>${f !== 'all' ? '<button class="btn ghost sm" data-ph-all>Voir toutes les pharmacies</button>' : ''}</div>`;
      $('ph-more').hidden = true;
    } else {
      $('ph-list').classList.remove('is-empty');
      $('ph-list').innerHTML = list.slice(0, ph.shown).map(phCard).join('');
      marqueeAll($('ph-list'));
      $('ph-more').hidden = list.length <= ph.shown;
      $('ph-more').textContent = `Afficher plus (${list.length - ph.shown})`;
    }
    const upd = window.ZUPA_PHARMA && window.ZUPA_PHARMA.updated;
    $('ph-note').textContent = `${PH_EMBED.length + (ph.cache ? ph.cache.list.length : 0) ? 'Données © OpenStreetMap' : ''}${upd ? ' · base du ' + new Date(upd).toLocaleDateString('fr-FR') : ''}${ph.cache ? ' · actualisée le ' + new Date(ph.cache.t).toLocaleDateString('fr-FR') : ''}`;
    if (state.pos) refreshLive(false);
  }

  function renderPhTeaser() {
    if ($('ph-teaser').hidden) return; // retiré de l'onglet Go
    const list = allPharmacies().filter(p => p.d != null).sort((a, b) => a.d - b.d);
    const g = list.find(p => p.garde), o = list.find(p => p.st === 'open'), n = list[0];
    const p = g || o || n;
    $('ph-teaser-label').textContent = g ? 'Pharmacie de garde la plus proche' : o ? 'Pharmacie ouverte la plus proche' : 'Pharmacies';
    $('ph-teaser-name').textContent = p ? p.name : state.pos ? 'Voir les pharmacies autour de vous' : 'Pharmacies de garde et ouvertes';
    $('ph-teaser-meta').textContent = p ? `${p.approx ? '≈ ' : ''}${fmtDist(p.d)}${p.approx ? ' (centre-ville)' : ''} · ${statusLabel(p, true)}` : '';
    $('ph-teaser').dataset.ph = p ? p.id : '';
  }

  /* ---------- « + Ajouter » de l'onglet Pharmacies ---------- */
  $('ph-add').onclick = () => openActions({ title: 'Ajouter', sub: 'Pharmacies et santé', actions: [
    { icon: 'cross', label: 'Une pharmacie', hint: 'Visible par tous, comme les autres lieux ajoutés.', fn: () => openAddPlace('pharma', 'screen-pharma', { group: 'health' }) },
    { icon: 'clinic', label: 'Une clinique ou un centre de santé', fn: () => openAddPlace('sante', 'screen-pharma', { group: 'health' }) },
    { icon: 'lock', label: 'Une pharmacie de garde', hint: 'Réservé à l\u2019administrateur (code secret).', fn: openGarde }] });

  /* ---------- Pharmacies de garde ajoutées à la main (administrateur) ---------- */
  const gd = { pick: null, code: store.get('adminCode', '') };
  function openGarde() {
    if (!sbOn()) { toast('La base en ligne n\u2019est pas configurée.', 'error'); return; }
    $('gd-login').hidden = !!gd.code; $('gd-main').hidden = !gd.code;
    if (gd.code) prepGarde();
    const sh = $('gd-sheet'); sh.hidden = false; requestAnimationFrame(() => sh.classList.add('open'));
  }
  function closeGarde() { const sh = $('gd-sheet'); sh.classList.remove('open'); setTimeout(() => { sh.hidden = true; }, 250); }
  function prepGarde() {
    const w = PC.gardeState(ph.gardes) === 'current' ? PC.pickWeek(ph.gardes) : null, t = PC.dayStr(new Date());
    $('gd-du').value = w ? w.du : t;
    $('gd-au').value = w ? w.au : PC.dayStr(new Date(Date.now() + 6 * 864e5));
    gd.pick = null; ['gd-name', 'gd-commune', 'gd-tel', 'gd-adresse'].forEach(i => { $(i).value = ''; });
    $('gd-pos').textContent = '';
    renderGardeList();
  }
  function renderGardeList() {
    const l = ph.manual || [];
    $('gd-list-h').hidden = !l.length;
    $('gd-list').innerHTML = l.map(m => `<li>${ic('cross')}<span>${esc(m.nom)}<br><small class="muted">${esc([m.commune, `du ${fmtDay(m.du)} au ${fmtDay(m.au)}`].filter(Boolean).join(' · '))}</small></span><button class="btn ghost sm" type="button" data-gd-del="${esc(m.id)}" aria-label="Retirer">${ic('trash')}</button></li>`).join('');
  }
  $('gd-sheet').addEventListener('click', async e => {
    if (e.target.closest('[data-gd-close]')) { closeGarde(); return; }
    const d = e.target.closest('[data-gd-del]');
    if (d && confirm('Retirer cette pharmacie de la liste de garde ?')) {
      const r = await sb('/rest/v1/rpc/garde_supprimer', { method: 'POST', body: { p_code: gd.code, p_id: d.dataset.gdDel } });
      if (!r.ok) { toast('Suppression impossible : ' + (r.net ? 'pas de connexion.' : sbErr(r)), 'error'); return; }
      ph.manual = ph.manual.filter(m => m.id !== d.dataset.gdDel); store.set('gardesManuelles', ph.manual); renderGardeList(); refreshPharmaViews();
    }
    const sg = e.target.closest('[data-gd-pick]');
    if (sg) {
      const p = allPharmacies().find(x => x.id === sg.dataset.gdPick); if (!p) return;
      gd.pick = p; $('gd-name').value = p.name; $('gd-commune').value = p.commune || ''; $('gd-tel').value = p.phone || ''; $('gd-adresse').value = p.street || '';
      $('gd-suggest').hidden = true;
      $('gd-pos').textContent = Number.isFinite(p.lat) ? 'Position : celle de la pharmacie choisie.' : '';
    }
  });
  $('gd-login-btn').onclick = async () => {
    const c = $('gd-code').value.trim(); if (c.length < 8) { toast('Code trop court.', 'error'); return; }
    const r = await sb('/rest/v1/rpc/admin_ok', { method: 'POST', body: { p_code: c } });
    if (r.status === 404) { toast('Fonction absente : exécutez supabase/v2.sql.', 'error', 6000); return; }
    if (!r.ok || r.data !== true) { toast(r.net ? 'Pas de connexion internet.' : 'Code administrateur incorrect.', 'error'); return; }
    gd.code = c; store.set('adminCode', c); $('gd-login').hidden = true; $('gd-main').hidden = false; prepGarde();
  };
  $('gd-name').addEventListener('input', debounce(() => {
    gd.pick = null; $('gd-pos').textContent = state.pos ? 'Pharmacie inconnue : votre position actuelle sera utilisée.' : '';
    const q = Core.key($('gd-name').value);
    const hits = q.length < 3 ? [] : allPharmacies().map(p => [Core.matchScore(q, Core.key(p.name + ' ' + (p.commune || ''))), p]).filter(x => x[0] >= 0).sort((a, b) => a[0] - b[0]).slice(0, 6);
    $('gd-suggest').innerHTML = hits.map(([, p]) => `<div class="sg-item" data-gd-pick="${esc(p.id)}"><span class="sg-ic">${ic('cross')}</span><span class="sg-main"><span class="sg-name">${esc(p.name)}</span><span class="sg-sub">${esc(p.commune || p.street || '')}</span></span></div>`).join('');
    $('gd-suggest').hidden = !hits.length;
  }, 150));
  $('gd-form').addEventListener('submit', async e => {
    e.preventDefault();
    const nom = $('gd-name').value.trim(), du = $('gd-du').value, au = $('gd-au').value;
    if (nom.length < 3) { toast('Indiquez le nom de la pharmacie.', 'error'); return; }
    if (!du || !au || au < du) { toast('Vérifiez les dates.', 'error'); return; }
    const p = gd.pick, here = state.pos;
    const lat = p && Number.isFinite(p.lat) ? p.lat : here ? here[0] : null, lon = p && Number.isFinite(p.lon) ? p.lon : here ? here[1] : null;
    $('gd-save').disabled = true;
    const r = await sb('/rest/v1/rpc/garde_ajouter', { method: 'POST', body: { p_code: gd.code, p_nom: nom, p_commune: $('gd-commune').value.trim() || null, p_adresse: $('gd-adresse').value.trim() || null, p_tel: $('gd-tel').value.trim() || null, p_lat: lat, p_lon: lon, p_du: du, p_au: au } });
    $('gd-save').disabled = false;
    if (!r.ok) { if (/Code administrateur/.test(sbErr(r))) { gd.code = ''; store.set('adminCode', ''); } toast(r.net ? 'Pas de connexion internet.' : 'Ajout impossible : ' + sbErr(r), 'error', 6000); return; }
    toast(`« ${nom} » ajoutée à la liste de garde.`, 'success');
    await loadGardes(); prepGarde();
  });

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
    if (go) { openPharmacy(go.dataset.phGo, current); return; }
    const el = e.target.closest('[data-ph]');
    if (!el) return;
    const p = allPharmacies().find(x => x.id === el.dataset.ph) || clinics().find(x => x.id === el.dataset.ph);
    if (isFollowed('pharma', el.dataset.ph) && Date.now() - (live.followT || 0) < 700) return;
    if (!p || p.approx || !Number.isFinite(p.lat) || isFollowed('pharma', p.id)) openPharmacy(el.dataset.ph, current);
    else followPlace('pharma', p.id);
  }
  $('ph-list').addEventListener('click', onPhClick);
  $('ph-list').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.ph-row')) e.target.click(); });
  $('ph-teaser').onclick = () => { const id = $('ph-teaser').dataset.ph; if (id) openPharmacy(id, 'screen-home'); else show('screen-pharma'); };

  /* ---------- Détail ---------- */
  let pdMap = null, pdLayer = null, pdUser = null;
  function openPharmacy(id, from) {
    const p = allPharmacies().find(x => x.id === id);
    if (p) { openDetail(p, from, 'pharma'); return; }
    const c = clinics().find(x => x.id === id);
    if (c) { openDetail(c, from, 'paiya'); return; }
    toast('Lieu introuvable.', 'error');
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
      !p.position && [PY_ICON[p.cat] || 'explore', 'Type', esc(p.sub || '')],
      p.hours && ['clock', 'Statut', esc(pyStatus(p, true))],
      p.phone && ['phone', 'Téléphone', String(p.phone).split(/[;,/]/).map(t => t.trim()).filter(Boolean).map(t => `<a href="${esc(telHref(t))}">${esc(fmtPhone(t))}</a>`).join('<br>')],
      (p.street || p.commune) && ['pin', 'Adresse', esc([p.street, p.commune].filter(Boolean).join(' · '))],
      ns && ['bus', 'Arrêt de bus le plus proche', `${esc(ns.name)} · ${fmtDist(ns.d)}`],
      p.hours && ['clock', 'Horaires', esc(fmtHours(p.hours))],
      p.note && ['info', 'Remarque', esc(p.note)],
      p.msg && ['chat', `Message de ${esc(p.from)}`, `<span class="pd-msg">« ${esc(p.msg)} »</span>`],
      p.position && ['navigation', 'Position partagée', `${esc(fmtAgo(new Date(p.created).getTime()))}${Date.now() - new Date(p.created).getTime() > 6 * 3600e3 ? ' · <b>ancienne position</b>, il est peut-être parti' : ''}`],
      p.shared && !p.position && ['user', 'Source', `Envoyé par ${esc(p.from)}${p.created ? ' le ' + esc(new Date(p.created).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })) : ''}`],
      p.private && ['lock', 'Confidentiel', 'Visible par vous seul, enregistré sur ce téléphone.'],
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
    if (p.private) $('pd-note').textContent = 'Lieu confidentiel : il n\u2019est ni envoyé ni partagé.';
    else if (p.position) $('pd-note').textContent = `Position envoyée par ${p.from}. Appelez-le si vous ne le trouvez pas.`;
    else if (p.shared) $('pd-note').textContent = 'Lieu envoyé par un ami. Vérifiez sur place avant de vous déplacer loin.';
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
  $('pd-back').onclick = () => goBack();
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
  $('pd-share').onclick = () => { if (ph.sel) openShare(ph.sel); };
  async function nativeShare(p) {
    if (!p) return;
    const text = [p.name + (p.garde ? ' (de garde)' : ''), [p.street, p.commune].filter(Boolean).join(', '), p.phone && 'Tél. ' + fmtPhone(p.phone),
      Number.isFinite(p.lat) && `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}`, '— partagé avec ZUPA'].filter(Boolean).join('\n');
    try { if (navigator.share) { await navigator.share({ title: p.name, text }); return; } } catch (err) { if (err && err.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(text); toast('Informations copiées.', 'success'); } catch (_) { toast(text, 'info', 8000); }
  }

  /* =====================================================================
     PAIYA : hôtels, restaurants, toilettes publiques, commerces
     ===================================================================== */
  const PYC = PaiyaCore;
  const PY_ICON = { resto: 'resto', maquis: 'bar', hotel: 'hotel', wc: 'wc', station: 'fuel', shop: 'shop', supermarche: 'cart', marche: 'market', culte: 'worship', sante: 'clinic', pharma: 'cross', private: 'lock' };
  const EXTRA_CATS = { pharma: { label: 'Pharmacies', one: 'Pharmacie' } };
  const catInfo = c => PaiyaCore.CATS[c] || EXTRA_CATS[c] || { label: 'Lieux', one: 'Lieu' };
  // icône d'un lieu : église ou mosquée pour les lieux de culte
  const placeIcon = p => p.cat === 'culte' ? (/mosqu/i.test((p.sub || '') + ' ' + p.name) ? 'mosque' : /[ée]glise|chapelle|paroisse|temple|cath[ée]drale/i.test((p.sub || '') + ' ' + p.name) ? 'church' : 'worship') : (PY_ICON[p.cat] || 'explore');
  // texte blanc lisible sur chaque couleur (contraste ≥ 4,5)
  const PY_COLOR = { resto: '#c24a12', maquis: '#a21caf', hotel: '#5b3cc4', wc: '#0b7a8f', station: '#475569', shop: '#b3245f', supermarche: '#1d4ed8', marche: '#4d7c0f', culte: '#854d0e', sante: '#be123c', pharma: '#0a6b43', private: '#3f4a5a' };
  const PY_EMBED = (window.ZUPA_PAIYA && Array.isArray(window.ZUPA_PAIYA.list)) ? window.ZUPA_PAIYA.list : [];
  const py = { cat: PaiyaCore.ORDER.includes(store.get('pyCat', 'resto')) ? store.get('pyCat', 'resto') : 'resto', q: '', shown: 20, cache: store.get('pyCache', null), loading: false, lastTry: 0, open: false };

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
    const o = { id: 'z' + r.id, rid: r.id, cat: r.cat, name: r.name, sub: r.sub || catInfo(r.cat).one, lat: r.lat, lon: r.lon, community: true, created: r.created_at || r.created };
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
  window.addEventListener('online', () => { syncMine(); fetchCommunity(true); flushVisits(); frRefresh(false); syncLines(); fetchLines(true); });
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
    if (cat === 'maquis') return h >= 17 || h < 4 ? 'On s\u2019enjaille où ce soir ?' : 'Un maquis pour plus tard ?';
    if (cat === 'station') return 'Le réservoir est vide ?';
    if (cat === 'supermarche') return 'Le frigo est vide ?';
    if (cat === 'marche') return 'On va au marché ?';
    if (cat === 'culte') return 'Un lieu pour prier ?';
    return h < 12 ? 'Des courses à faire ?' : 'Un tour en boutique ?';
  }
  // accord : un restaurant « ouvert », des toilettes « ouvertes »
  const pyStatus = (p, long) => { const t = statusLabel(p, long); return p.cat === 'wc' ? t.replace('Ouverte', 'Ouvertes').replace('Fermée', 'Fermées') : t.replace('Ouverte', 'Ouvert').replace('Fermée', 'Fermé'); };
  const PY_PLURAL = { hotel: ['hôtel', 'hôtels'], resto: ['restaurant', 'restaurants'], wc: ['toilettes', 'toilettes'], shop: ['commerce', 'commerces'], maquis: ['maquis ou bar', 'maquis et bars'], station: ['station', 'stations'], supermarche: ['supermarché', 'supermarchés'], marche: ['marché', 'marchés'], culte: ['lieu de culte', 'lieux de culte'] };
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
    if (scr.style.getPropertyValue('--c') !== col) { scr.style.setProperty('--c', col); if (current === 'screen-paiya') syncBars(); }
    const title = pyTitle(py.cat), tEl = $('py-title');
    if (tEl.textContent !== title) { tEl.textContent = title; tEl.classList.remove('swap'); void tEl.offsetWidth; tEl.classList.add('swap'); }
    const art = $('py-hero-art');
    if (art.dataset.cat !== py.cat) { art.dataset.cat = py.cat; art.firstChild.setAttribute('d', ICONS[PY_ICON[py.cat]]); art.classList.remove('swap'); void art.offsetWidth; art.classList.add('swap'); }
    const [one, many] = PY_PLURAL[py.cat];
    $('py-pulse').textContent = !state.pos ? 'Activez la localisation pour voir ce qu’il y a autour.'
      : near1 ? `${near1} ${near1 > 1 ? many : one} à moins d’1 km` : counts[py.cat] ? `Le plus proche est un peu plus loin` : `Rien dans le coin pour l’instant`;
    $('py-cats').innerHTML = PYC.ORDER.map(c => `<button class="py-cat${py.cat === c ? ' on' : ''}" role="tab" aria-selected="${py.cat === c}" data-cat="${c}" style="--c:${PY_COLOR[c]}">${ic(PY_ICON[c])}<span>${esc(PYC.CATS[c].label)}</span></button>`).join('');
    const onCat = $('py-cats').querySelector('.on'); if (onCat && !renderPaiya.scrolled) { renderPaiya.scrolled = true; onCat.scrollIntoView({ inline: 'center', block: 'nearest' }); }
    $('py-open').classList.toggle('on', py.open);
    $('py-open').setAttribute('aria-pressed', String(py.open));
    $('py-sub').textContent = state.pos ? (state.placeName ? state.placeName : '') : 'triés par nom';
    let list = base.filter(p => p.cat === py.cat);
    const q = Core.key(py.q);
    if (q) list = list.filter(p => Core.matchScore(q, Core.key([p.name, p.sub, p.street, p.commune].filter(Boolean).join(' '))) >= 0);
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
        const fol = isFollowed('paiya', p.id);
        return `<div class="py-row${fol ? ' following' : ''}" data-py="${esc(p.id)}" role="button" tabindex="0" aria-pressed="${fol}">
          <span class="py-ic">${ic(placeIcon(p))}</span>
          <span class="py-main"><b>${fol ? `<span class="mq-host"><span class="mq-in">${esc(p.name)}</span></span>` : `<span>${esc(p.name)}</span>`}${p.community ? `<em class="py-tag${p.pending ? ' wait' : ''}">${p.pending ? 'en attente' : 'ZUPA'}</em>` : ''}</b><small>${esc([p.sub, p.street || p.commune].filter(Boolean).join(' · '))}</small></span>
          <span class="py-d">${p.d != null ? `<b>${fmtDist(p.d)}</b>` : ''}${fol ? '<small class="py-st follow">suivi</small>' : status || (p.d != null ? `<small>${fmtMin(Core.walkMin(p.d * Core.CFG.DETOUR))} à pied</small>` : '')}</span>
          <button class="py-more-btn" type="button" data-py-go="${esc(p.id)}" aria-label="Fiche et carte de ${esc(p.name)}">${ic('chevron')}</button>
        </div>`;
      }).join('');
      $('py-more').hidden = list.length <= py.shown;
      $('py-more').textContent = `Afficher plus (${list.length - py.shown})`;
      marqueeAll($('py-list'));
    }
    const upd = window.ZUPA_PAIYA && window.ZUPA_PAIYA.updated;
    $('py-note').textContent = `Données © OpenStreetMap${upd ? ' · base du ' + new Date(upd).toLocaleDateString('fr-FR') : ''}${py.cache ? ' · actualisée le ' + new Date(py.cache.t).toLocaleDateString('fr-FR') : ''}`;
    renderLive();
    renderPopular();
    if (state.pos) refreshPaiya(false);
    fetchCommunity(false);
    fetchPopular(false);
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
    const go = e.target.closest('[data-py-go]'), el = go || e.target.closest('[data-py]');
    if (!el) return;
    const id = el.dataset.pyGo || el.dataset.py;
    const p0 = placesBase().find(x => x.id === id);
    if (!p0) return;
    if (!go && isFollowed('paiya', id) && Date.now() - (live.followT || 0) < 700) return;
    if (go || isFollowed('paiya', id) || !state.pos) openDetail(withStatus(p0), 'screen-paiya', 'paiya');
    else followPlace('paiya', id);
  });
  $('py-list').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('.py-row')) e.target.click(); });
  document.addEventListener('click', e => { const a = e.target.closest('a[data-ext]'); if (a) { e.preventDefault(); openExternal(a.href); } });

  /* ---------- Ajouter un lieu : position trouvée automatiquement, confirmée par « Géolocaliser » ---------- */
  const AP_KINDS = {
    resto: ['Restaurant', 'Fast-food', 'Garbadrome', 'Café', 'Glacier'],
    maquis: ['Maquis', 'Bar', 'Boîte de nuit', 'Lounge'],
    hotel: ['Hôtel', 'Résidence meublée', 'Auberge', 'Motel'],
    wc: ['Toilettes publiques'],
    station: ['Station-service', 'Station + boutique', 'Lavage auto'],
    shop: ['Boutique', 'Supérette', 'Téléphonie', 'Coiffure', 'Pressing', 'Quincaillerie', 'Commerce'],
    supermarche: ['Supermarché', 'Hypermarché'],
    marche: ['Marché', 'Marché de nuit'],
    culte: ['Église', 'Mosquée', 'Temple'],
    pharma: ['Pharmacie'],
    sante: ['Clinique', 'Centre de santé', 'Hôpital', 'Laboratoire', 'Cabinet médical']
  };
  const AP_PH = { resto: 'ex. Chez Tantie Rose', maquis: 'ex. Maquis Le Baobab', hotel: 'ex. Hôtel Le Baobab', wc: 'ex. Toilettes de la gare', station: 'ex. Total Riviera 2', shop: 'ex. Boutique Awa', supermarche: 'ex. Supermarché du quartier', marche: 'ex. Marché de Cocovico', culte: 'ex. Paroisse Saint-Jacques', pharma: 'ex. Pharmacie des Lagunes', sante: 'ex. Clinique Les Oliviers' };
  const AP_GROUPS = { paiya: PaiyaCore.ORDER, health: ['pharma', 'sante'] };
  const ap = { cat: 'wc', st: 'auto', pos: null, acc: null, kind: null, fee: null, hours: '', back: 'screen-paiya', timer: 0 };
  let apMap = null, apUser = null, apMoving = false;
  // nom plausible : au moins 2 lettres, pas de lien ni d'adresse e-mail, pas de répétitions absurdes
  const nameValid = v => { const t = v.trim(); return t.length >= 2 && (t.match(/\p{L}/gu) || []).length >= 2 && !/https?:|www\.|@|\.(com|net|org|ci)\b/i.test(t) && !/(.)\1{4,}/.test(t); };
  const phoneDigits = v => v.replace(/\D/g, '').replace(/^225(?=\d{10}$)/, '');
  function openAddPlace(cat, from, opts = {}) {
    ap.vis = opts.private ? 'private' : 'public'; ap.pkind = opts.kind || 'home';
    ap.group = opts.group || (cat === 'pharma' || cat === 'sante' ? 'health' : 'paiya');
    const lastHour = comm.mine.filter(m => Date.now() - new Date(m.created).getTime() < 3600e3).length;
    if (ap.vis === 'public' && lastHour >= 10) { toast('Vous avez déjà ajouté 10 lieux en une heure. Réessayez un peu plus tard.', 'error', 5000); return; }
    ap.cat = AP_GROUPS[ap.group].includes(cat) ? cat : AP_GROUPS[ap.group][0]; ap.back = from || current;
    ap.kind = AP_KINDS[ap.cat][0]; ap.fee = null; ap.hours = '';
    ap.pos = state.gpsLast || state.pos; ap.acc = state.gpsLast ? state.gpsAcc : state.accuracy;
    ap.st = ap.pos ? 'auto' : 'none';
    $('ap-form').reset(); $('ap-range').hidden = true;
    renderAddPlace();
    show('screen-addplace');
  }
  function renderAddPlace() {
    const scr = $('screen-addplace'), pv = ap.vis === 'private';
    scr.style.setProperty('--c', pv ? PY_COLOR.private : PY_COLOR[ap.cat]);
    $('ap-vis').querySelectorAll('button').forEach(b => { const on = b.dataset.vis === ap.vis; b.classList.toggle('active', on); b.setAttribute('aria-checked', String(on)); });
    $('ap-vis-note').innerHTML = pv ? `${ic('lock')}<span>Visible par vous seul. Enregistré sur ce téléphone, jamais envoyé ni partagé.</span>` : `${ic('explore')}<span>Visible par tous les utilisateurs de ZUPA.</span>`;
    $('ap-vis-note').className = 'ap-vis-note' + (pv ? ' priv' : '');
    $('ap-sub').textContent = pv ? 'Lieu confidentiel' : 'Visible par tous les utilisateurs de ZUPA';
    $('ap-public-fields').hidden = pv; $('ap-hours').hidden = pv; $('ap-hours').previousElementSibling.hidden = pv;
    $('ap-range').hidden = pv || !(ap.hours && ap.hours !== '24/7');
    if (pv) {
      $('ap-cats').innerHTML = Object.entries(PRIV_KINDS).map(([k, v]) => `<button type="button" class="py-cat${ap.pkind === k ? ' on' : ''}" role="radio" aria-checked="${ap.pkind === k}" data-pkind="${k}" style="--c:${PY_COLOR.private}">${ic(v.icon)}<span>${v.label}</span></button>`).join('');
      $('ap-wc').hidden = true;
      $('ap-name').placeholder = ap.pkind === 'other' ? 'ex. Chez maman, Salle de sport' : PRIV_KINDS[ap.pkind].label;
      $('ap-name-l').innerHTML = 'Nom <small>(facultatif)</small>';
      renderApState();
      return;
    }
    $('ap-cats').innerHTML = AP_GROUPS[ap.group].map(c => `<button type="button" class="py-cat${ap.cat === c ? ' on' : ''}" role="radio" aria-checked="${ap.cat === c}" data-cat="${c}" style="--c:${PY_COLOR[c]}">${ic(PY_ICON[c])}<span>${esc(catInfo(c).label)}</span></button>`).join('');
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
      weak: [ic('info'), `Signal GPS trop faible (${acc}) pour confirmer. Déplacez la carte pour mettre le repère sur le lieu, puis touchez « Valider ce point ».`, 'warn'],
      pin: [ic('check'), 'Point validé sur la carte.', 'ok']
    }[ap.st];
    el.className = 'ap-state ' + T[2];
    el.innerHTML = `${T[0]}<span>${T[1]}</span>`;
    $('ap-locate').disabled = ap.st === 'locating';
    $('ap-locate').lastChild.textContent = ap.st === 'ok' ? 'Géolocaliser à nouveau' : 'Géolocaliser';
    $('ap-pin-ok').hidden = ap.st !== 'moved' && ap.st !== 'weak';
    const confirmed = ap.st === 'ok' || ap.st === 'pin';
    const nameOk = (ap.vis === 'private' || ap.cat === 'wc') && !$('ap-name').value.trim() || nameValid($('ap-name').value);
    $('ap-save').disabled = !(confirmed && nameOk);
    $('ap-why').textContent = !confirmed ? 'Confirmez d\u2019abord la position avec « Géolocaliser ».' : !nameOk ? 'Indiquez le vrai nom du lieu (lettres, sans lien internet).' : '';
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
        if (best.acc > 100) { // signal trop faible pour confirmer : placement à la main obligatoire
          ap.pos = best.p; ap.st = 'weak';
          if (apMap) apMap.setView(ap.pos, 17);
          renderApState(); return;
        }
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
  $('ap-back').onclick = () => goBack();
  leaveGuards['screen-addplace'] = () => {
    const dirty = ['ok', 'pin', 'moved'].includes(ap.st) || ['ap-name', 'ap-phone', 'ap-note'].some(i => $(i).value.trim());
    return !dirty || confirm('Abandonner l\u2019ajout de ce lieu ? Les informations saisies seront perdues.');
  };
  $('ap-locate').onclick = apLocate;
  $('ap-pin-ok').onclick = () => { ap.st = 'pin'; renderApState(); };
  $('ap-vis').addEventListener('click', e => {
    const b = e.target.closest('[data-vis]'); if (!b || b.dataset.vis === ap.vis) return;
    ap.vis = b.dataset.vis; renderAddPlace();
  });
  $('ap-cats').addEventListener('click', e => {
    const k = e.target.closest('[data-pkind]'); if (k) { ap.pkind = k.dataset.pkind; renderAddPlace(); return; }
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
    if (ap.vis === 'private') {
      const nm = $('ap-name').value.trim().replace(/\s+/g, ' ') || PRIV_KINDS[ap.pkind].label;
      const old = ap.pkind !== 'other' && priv.find(r => r.kind === ap.pkind);
      if (old && !confirm(`Remplacer votre ${PRIV_KINDS[ap.pkind].label.toLowerCase()} enregistré (« ${old.name} ») ?`)) return;
      if (old) priv = priv.filter(r => r !== old);
      priv.push({ id: 'p-' + uuid(), kind: ap.pkind, name: nm, lat: +ap.pos[0].toFixed(6), lon: +ap.pos[1].toFixed(6), note: $('ap-note').value.trim(), created: new Date().toISOString() });
      savePriv();
      toast(`« ${nm} » enregistré sur ce téléphone uniquement.`, 'success', 5000);
      show(ap.back && ap.back !== 'screen-addplace' ? ap.back : 'screen-profile', { force: true });
      return;
    }
    // un lieu public posé sur un lieu confidentiel le révélerait
    const hp = priv.find(r => Core.haversine(r.lat, r.lon, ap.pos[0], ap.pos[1]) < 0.06);
    if (hp && !confirm(`Ce point est tout près de votre lieu confidentiel « ${hp.name} ». Le rendre public révélerait cet endroit à tous. Continuer ?`)) return;
    const name = $('ap-name').value.trim().replace(/\s+/g, ' ') || (ap.cat === 'wc' ? 'Toilettes publiques' : '');
    const tel = phoneDigits($('ap-phone').value);
    if ($('ap-phone').value.trim() && (tel.length < 8 || tel.length > 10)) { toast('Numéro de téléphone invalide : 10 chiffres, par ex. 07 00 00 00 00.', 'error', 5000); $('ap-phone').focus(); return; }
    const gp = state.gpsLast || state.pos;
    if (gp && ap.st === 'pin') {
      const far = Core.haversine(gp[0], gp[1], ap.pos[0], ap.pos[1]);
      if (far > 1 && !confirm(`Ce point est à ${fmtDist(far)} de vous. N'ajoutez que des lieux que vous connaissez bien. Continuer ?`)) return;
    }
    const sub = ap.cat === 'wc'
      ? ['Toilettes', ap.fee === 'yes' ? 'payantes' : ap.fee === 'no' ? 'gratuites' : '', $('ap-wheel').checked ? 'accessibles' : ''].filter(Boolean).join(' · ')
      : ap.kind;
    const [lat, lon] = ap.pos;
    const twin = placesBase().find(x => x.cat === ap.cat && Core.haversine(lat, lon, x.lat, x.lon) < 0.025 && (ap.cat === 'wc' || PC.norm(x.name) === PC.norm(name)));
    if (twin && !confirm(`« ${twin.name} » existe déjà à ${fmtDist(Core.haversine(lat, lon, twin.lat, twin.lon))}. L'ajouter quand même ?`)) return;
    const rec = { id: uuid(), cat: ap.cat, name, sub, lat: +lat.toFixed(6), lon: +lon.toFixed(6), acc: ap.acc, phone: tel ? tel.replace(/(\d{2})(?=\d)/g, '$1 ') : '', hours: ap.hours,
      note: $('ap-note').value.trim(), fee: ap.cat === 'wc' ? ap.fee : null, wheelchair: ap.cat === 'wc' && $('ap-wheel').checked ? true : null, created: new Date().toISOString(), synced: false };
    comm.mine.unshift(rec);
    saveMine();
    $('ap-save').disabled = true; $('ap-save').classList.add('loading');
    const res = await syncMine();
    $('ap-save').classList.remove('loading');
    if (!sbOn()) toast('Lieu enregistré sur ce téléphone.', 'success');
    else if (rec.synced) toast('Merci ! Le lieu est partagé avec tous les utilisateurs de ZUPA.', 'success', 5000);
    else if (rec.err) toast('Lieu gardé sur ce téléphone, mais refusé par la base : ' + rec.err, 'error', 7000);
    else toast('Lieu enregistré. Il sera partagé dès que vous aurez internet.', 'success', 5000);
    py.cat = rec.cat; store.set('pyCat', py.cat);
    live.dest = { kind: 'paiya', id: 'z' + rec.id, t: Date.now() }; store.set('liveDest', live.dest);
    show(ap.back === 'screen-profile' ? 'screen-profile' : 'screen-paiya', { force: true });
  });
  $('ap-note').addEventListener('input', () => {});
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
    if (!b) return;
    const m = comm.mine.find(x => x.id === b.dataset.delPlace);
    if (m && !m.synced) { // pas encore envoyé : suppression locale, annulable
      const i = comm.mine.indexOf(m); comm.mine.splice(i, 1); saveMine();
      toast('Lieu supprimé.', 'info', 5000, { text: 'Annuler', fn: () => { comm.mine.splice(i, 0, m); saveMine(); } });
    } else if (confirm('Supprimer ce lieu pour tous les utilisateurs ?')) deleteMine(b.dataset.delPlace);
  });

  /* =====================================================================
     LIEUX CONFIDENTIELS : uniquement sur ce téléphone (jamais envoyés, jamais partagés)
     ===================================================================== */
  const PRIV_KINDS = { home: { label: 'Domicile', icon: 'home', alias: 'maison chez moi domicile home' }, work: { label: 'Travail', icon: 'work', alias: 'travail bureau boulot job service' }, other: { label: 'Autre lieu', icon: 'lock', alias: '' } };
  let priv = store.get('private', []); if (!Array.isArray(priv)) priv = [];
  const privPlace = r => ({ id: r.id, name: r.name, lat: r.lat, lon: r.lon, kind: r.kind, cat: 'private', sub: 'Lieu confidentiel', private: true, icon: PRIV_KINDS[r.kind].icon, note: r.note || '', created: r.created });
  const nearPrivate = (lat, lon, km = 0.15) => priv.some(r => Core.haversine(lat, lon, r.lat, r.lon) < km);
  function savePriv() { store.set('private', priv); renderQuickPlaces(); renderPrivList(); }
  function privMatches(q) {
    const k = Core.key(q);
    return priv.filter(r => Core.matchScore(k, Core.key(r.name + ' ' + PRIV_KINDS[r.kind].alias)) >= 0);
  }
  const privItem = r => ({ type: 'place', place: privPlace(r), html: `<span class="sg-ic place" style="--c:${PY_COLOR.private}">${ic(PRIV_KINDS[r.kind].icon)}</span><span class="sg-main"><span class="sg-name">${esc(r.name)}<span class="utag priv">${ic('lock')}privé</span></span></span>${state.pos ? `<span class="sg-extra">${fmtDist(Core.haversine(state.pos[0], state.pos[1], r.lat, r.lon))}</span>` : ''}` });
  function renderQuickPlaces() {
    const box = $('quick-places');
    const chips = ['home', 'work'].map(k => {
      const r = priv.find(x => x.kind === k);
      return r ? `<button class="qp" data-qp="${esc(r.id)}">${ic(PRIV_KINDS[k].icon)}<span>${esc(r.name)}</span></button>`
        : `<button class="qp add" data-qp-add="${k}">${ic('plus')}<span>${PRIV_KINDS[k].label}</span></button>`;
    });
    priv.filter(r => r.kind === 'other').slice(0, 2).forEach(r => chips.push(`<button class="qp" data-qp="${esc(r.id)}">${ic('lock')}<span>${esc(r.name)}</span></button>`));
    if (fr.me && fr.list.some(f => f.etat === 'ami')) chips.unshift(`<button class="qp send" data-qp-pos>${ic('navigation')}<span>Je suis ici</span></button>`);
    box.innerHTML = chips.join('');
  }
  $('quick-places').addEventListener('click', e => {
    if (e.target.closest('[data-qp-pos]')) { openPos(); return; }
    const a = e.target.closest('[data-qp-add]');
    if (a) { openAddPlace(null, 'screen-home', { private: true, kind: a.dataset.qpAdd }); return; }
    const b = e.target.closest('[data-qp]'); if (!b) return;
    const r = priv.find(x => x.id === b.dataset.qp);
    if (r) { setOriginStop(null); setDestPlace(privPlace(r)); runSearch(); }
  });
  function renderPrivList() {
    const ul = $('priv-list');
    ul.innerHTML = priv.length ? priv.map(r => { const n = Core.nearbyStops(D, r.lat, r.lon, 6, 1)[0];
      const att = n ? ` · arrêt ${esc(n.stop.label)} à ${fmtDist(n.d)}${n.d > Core.CFG.LAST_WALK_KM ? ' (saloni, taxi)' : ' à pied'}` : '';
      return `<li style="--c:${PY_COLOR.private}">${ic(PRIV_KINDS[r.kind].icon)}<span>${esc(r.name)}<br><small class="muted">${PRIV_KINDS[r.kind].label}${att}${r.note ? ' · ' + esc(r.note) : ''}</small></span><button class="btn ghost sm" data-priv-go="${esc(r.id)}">Y aller</button><button class="btn ghost sm" data-priv-del="${esc(r.id)}" aria-label="Supprimer ${esc(r.name)}">${ic('trash')}</button></li>`; }).join('')
      : '<li class="muted">Aucun lieu confidentiel. Ajoutez votre domicile ou votre travail pour y aller en un geste.</li>';
  }
  $('priv-list').addEventListener('click', e => {
    const g = e.target.closest('[data-priv-go]');
    if (g) { const r = priv.find(x => x.id === g.dataset.privGo); if (r) { setOriginStop(null); setDestPlace(privPlace(r)); runSearch(); } return; }
    const d = e.target.closest('[data-priv-del]'); if (!d) return;
    const i = priv.findIndex(x => x.id === d.dataset.privDel); if (i < 0) return;
    const r = priv.splice(i, 1)[0]; savePriv();
    toast(`« ${r.name} » supprimé.`, 'info', 5000, { text: 'Annuler', fn: () => { priv.splice(i, 0, r); savePriv(); } });
  });
  $('priv-add').onclick = () => openAddPlace(null, 'screen-profile', { private: true, kind: priv.some(r => r.kind === 'home') ? (priv.some(r => r.kind === 'work') ? 'other' : 'work') : 'home' });

  /* =====================================================================
     AMIS ET PARTAGE DE LIEUX
     Un secret aléatoire par téléphone (seule son empreinte est en ligne) ; on ne trouve
     quelqu'un que par son code ami ; les lieux ne s'échangent qu'entre amis acceptés.
     ===================================================================== */
  const mySecret = (() => { let x = store.get('secret', null); if (!/^[0-9a-f-]{36}$/.test(x || '')) { x = uuid(); store.set('secret', x); } return x; })();
  const fr = { me: store.get('me', null), list: store.get('friends', []), recus: store.get('recus', []), blocked: store.get('blocked', []), seen: store.get('recusSeen', []), busy: false };
  const rpc = (name, body) => sb('/rest/v1/rpc/' + name, { method: 'POST', body: { p_secret: mySecret, ...body } });
  const initial = n => esc(String(n || '?').trim().charAt(0).toUpperCase());
  async function frRefresh(quiet) {
    if (!fr.me || !sbOn() || fr.busy) return;
    fr.busy = true;
    const [a, b, c] = await Promise.all([rpc('amis_liste', {}), rpc('lieux_recus', {}), rpc('bloques_liste', {})]);
    if (c.ok && Array.isArray(c.data)) { fr.blocked = c.data; store.set('blocked', fr.blocked); }
    fr.busy = false;
    if (a.status === 400 && /Profil inconnu/.test(sbErr(a))) { fr.me = null; store.set('me', null); renderFriends(); return; }
    const before = new Set(fr.list.filter(f => f.etat === 'recue').map(f => f.code));
    if (a.ok && Array.isArray(a.data)) { fr.list = a.data; store.set('friends', fr.list); }
    if (b.ok && Array.isArray(b.data)) { fr.recus = b.data; store.set('recus', fr.recus); }
    if (!quiet) {
      const visible = document.visibilityState === 'visible';
      fr.list.filter(f => f.etat === 'recue' && !before.has(f.code)).forEach(f => {
        if (visible) toast(`${f.pseudo} veut devenir votre ami.`, 'info', 6000, { text: 'Voir', fn: () => show('screen-profile') });
        notify(f.code.replace('-', '') + '0f', 'Nouvelle demande d\u2019ami', `${f.pseudo} veut devenir votre ami sur ZUPA.`, { friend: f.code });
      });
      const fresh = fr.recus.filter(r => !r.lu && !fr.seen.includes(r.id));
      fresh.forEach(r => isPos(r)
        ? notify(r.id, `${r.de_pseudo} partage sa position`, `« ${r.note} »${r.nom !== 'Ma position' ? ' — ' + r.nom : ''}`, { recu: r.id })
        : notify(r.id, `${r.de_pseudo} vous a envoyé un lieu`, r.nom + (r.note ? ` · « ${r.note} »` : ''), { recu: r.id }));
      if (fresh.length && visible) toast(fresh.length === 1 ? (isPos(fresh[0]) ? `${fresh[0].de_pseudo} : « ${fresh[0].note} »` : `${fresh[0].de_pseudo} vous a envoyé un lieu : ${fresh[0].nom}`) : `${fresh.length} nouveaux lieux reçus de vos amis`, 'success', 6000, { text: 'Voir', fn: () => fresh.length === 1 ? openRecu(fresh[0]) : show('screen-profile') });
      fr.seen = [...new Set([...fr.seen, ...fresh.map(r => r.id)])].slice(-200); store.set('recusSeen', fr.seen);
    }
    renderFriends(); syncBadge(); renderGroups(); renderQuickPlaces();
  }
  function syncBadge() {
    const n = fr.list.filter(f => f.etat === 'recue').length + fr.recus.filter(r => !r.lu).length;
    const b = $('nav-pf-badge'); b.hidden = !n; b.textContent = n > 9 ? '9+' : String(n);
  }
  function renderFriends() {
    $('fr-setup').hidden = !!fr.me; $('fr-main').hidden = !fr.me;
    if (!sbOn()) { $('fr-setup').innerHTML = '<p class="muted">Les amis ont besoin de la base en ligne, qui n\u2019est pas configurée.</p>'; return; }
    if (fr.me) {
      $('fr-avatar').textContent = String(fr.me.pseudo).charAt(0).toUpperCase();
      $('fr-me-pseudo').textContent = fr.me.pseudo; $('fr-me-code').textContent = fr.me.code;
      const L = { recue: 'vous invite', envoyee: 'invitation envoyée', ami: 'ami' };
      const sorted = [...fr.list].sort((x, y) => ({ recue: 0, ami: 1, envoyee: 2 }[x.etat] - { recue: 0, ami: 1, envoyee: 2 }[y.etat]));
      $('fr-list').innerHTML = sorted.length ? sorted.map(f => `<li class="fr-item ${f.etat}"><span class="fr-avatar">${initial(f.pseudo)}</span><span>${esc(f.pseudo)}<br><small class="muted">${L[f.etat]}</small></span>${
        f.etat === 'recue' ? `<button class="btn primary sm" data-fr-ok="${esc(f.code)}">Accepter</button>` : ''}<button class="btn ghost sm fr-more" data-fr-menu="${esc(f.code)}" aria-label="Options pour ${esc(f.pseudo)}">${ic('more')}</button></li>`).join('')
        : '<li class="muted">Aucun ami pour l\u2019instant. Envoyez votre code avec « Inviter », ou saisissez celui d\u2019un ami.</li>';
    }
    const bl = fr.blocked || [];
    $('fr-blocked').hidden = !bl.length;
    $('fr-blocked-sum').textContent = `Utilisateurs bloqués (${bl.length})`;
    $('fr-blocked-list').innerHTML = bl.map(b => `<li><span class="fr-avatar off">${initial(b.pseudo)}</span><span>${esc(b.pseudo)}<br><small class="muted">bloqué</small></span><button class="btn ghost sm" data-fr-unblock="${esc(b.code)}">Débloquer</button></li>`).join('');
    const rc = fr.recus;
    $('recus-card').hidden = !rc.length;
    $('recus-list').innerHTML = rc.map(r => `<li class="${r.lu ? '' : 'unread'}${isPos(r) ? ' pos' : ''}"><span class="fr-avatar">${isPos(r) ? ic('navigation') : initial(r.de_pseudo)}</span><span>${isPos(r) ? `<b>${esc(r.de_pseudo)}</b> <small class="muted">est ici</small><br><span class="rc-msg">« ${esc(r.note || '')} »</span><br><small class="muted">${r.nom !== 'Ma position' ? esc(r.nom) + ' · ' : ''}${esc(fmtAgo(new Date(r.created_at).getTime()))}</small>` : `<b>${esc(r.nom)}</b><br><small class="muted">de ${esc(r.de_pseudo)} · ${esc(fmtAgo(new Date(r.created_at).getTime()))}${r.note ? ' · « ' + esc(r.note) + ' »' : ''}</small>`}</span><button class="btn ${isPos(r) ? 'primary' : 'ghost'} sm" data-rc-go="${esc(r.id)}">${isPos(r) ? 'Rejoindre' : 'Voir'}</button><button class="btn ghost sm fr-more" data-rc-menu="${esc(r.id)}" aria-label="Options">${ic('more')}</button></li>`).join('');
  }
  const isPos = r => r.genre === 'position';
  const recuPlace = r => isPos(r)
    ? { id: 'r' + r.id, cat: PYC.CATS[r.cat] ? r.cat : 'shop', name: r.nom === 'Ma position' ? `Position de ${r.de_pseudo}` : r.nom, sub: `${r.de_pseudo} est ici · ${fmtAgo(new Date(r.created_at).getTime())}`, lat: r.lat, lon: r.lon, msg: r.note || '', shared: true, position: true, from: r.de_pseudo, created: r.created_at }
    : { id: 'r' + r.id, cat: PYC.CATS[r.cat] ? r.cat : 'shop', name: r.nom, sub: `Envoyé par ${r.de_pseudo}`, lat: r.lat, lon: r.lon, note: r.note || '', shared: true, from: r.de_pseudo, created: r.created_at };
  function openRecu(r) {
    if (!r.lu) { r.lu = true; store.set('recus', fr.recus); rpc('lieu_recu_maj', { p_id: r.id }); syncBadge(); }
    openDetail(withStatus(recuPlace(r)), current, 'paiya');
  }
  $('fr-create').addEventListener('submit', async e => {
    e.preventDefault();
    const ps = $('fr-pseudo').value.trim();
    if (ps.length < 2 || !nameValid(ps)) { toast('Choisissez un pseudo de 2 à 30 lettres.', 'error'); return; }
    const r = await rpc('zupa_moi', { p_pseudo: ps });
    if (!r.ok || !r.data || !r.data[0]) { toast(r.net ? 'Pas de connexion internet.' : 'Création impossible : ' + sbErr(r), 'error'); return; }
    fr.me = r.data[0]; store.set('me', fr.me); renderFriends(); frRefresh(true); notifPermission(true); toast(`Profil créé. Votre code ami : ${fr.me.code}`, 'success', 6000);
  });
  $('fr-add').addEventListener('submit', async e => {
    e.preventDefault();
    let c = $('fr-code-in').value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (c.length !== 8) { toast('Un code ami a 8 caractères, par exemple 7KQ4-92XZ.', 'error'); return; }
    c = c.slice(0, 4) + '-' + c.slice(4);
    const r = await rpc('ami_demander', { p_code: c });
    const M = { envoyee: ['Invitation envoyée.', 'success'], acceptee: ['Vous êtes maintenant amis !', 'success'], deja_amis: ['Vous êtes déjà amis.', 'info'], introuvable: ['Aucun utilisateur avec ce code.', 'error'], soi_meme: ['C\u2019est votre propre code.', 'error'] };
    const m = r.ok ? M[r.data] : [r.net ? 'Pas de connexion internet.' : sbErr(r), 'error'];
    toast(m[0], m[1]);
    if (r.ok && r.data !== 'introuvable' && r.data !== 'soi_meme') { $('fr-code-in').value = ''; frRefresh(true); }
  });
  $('fr-code-in').addEventListener('input', e => { const v = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8); e.target.value = v.length > 4 ? v.slice(0, 4) + '-' + v.slice(4) : v; });
  $('fr-invite').onclick = async () => {
    const text = `Rejoins-moi sur ZUPA pour échanger nos lieux ! Mon code ami : ${fr.me.code}`;
    try { if (navigator.share) { await navigator.share({ title: 'ZUPA', text }); return; } } catch (err) { if (err && err.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(fr.me.code); toast('Code copié : ' + fr.me.code, 'success'); } catch (_) { toast(text, 'info', 8000); }
  };
  // Feuille d'actions (options d'un ami)
  function openActions(o) {
    $('act-title').textContent = o.title; $('act-sub').textContent = o.sub || '';
    $('act-avatar').textContent = o.avatar || ''; $('act-avatar').hidden = !o.avatar;
    $('act-list').innerHTML = o.actions.map((a, i) => `<button type="button" class="act-btn${a.danger ? ' danger' : ''}" data-act="${i}">${ic(a.icon)}<span><b>${esc(a.label)}</b>${a.hint ? `<small>${esc(a.hint)}</small>` : ''}</span></button>`).join('');
    openActions.cur = o.actions;
    const sh = $('act-sheet'); sh.hidden = false; requestAnimationFrame(() => sh.classList.add('open'));
  }
  function closeActions() { const sh = $('act-sheet'); sh.classList.remove('open'); setTimeout(() => { sh.hidden = true; }, 250); }
  $('act-sheet').addEventListener('click', e => {
    if (e.target.closest('[data-act-close]')) { closeActions(); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const a = openActions.cur[+b.dataset.act]; closeActions(); if (a) a.fn();
  });
  const frAct = async (fn, body, okMsg) => {
    const r = await rpc(fn, body);
    if (!r.ok) { toast('Action impossible : ' + (r.net ? 'pas de connexion internet.' : sbErr(r)), 'error'); return false; }
    if (okMsg) toast(okMsg, 'success');
    await frRefresh(true); return true;
  };
  function friendMenu(f) {
    const block = { icon: 'block', danger: true, label: `Bloquer ${f.pseudo}`, hint: 'Il ne pourra plus vous inviter ni vous envoyer de lieu. Il n\u2019est pas prévenu.', fn: () => frAct('ami_bloquer', { p_code: f.code }, `${f.pseudo} est bloqué.`) };
    const actions = f.etat === 'ami' ? [
      { icon: 'person_remove', label: 'Retirer de mes amis', hint: 'Les lieux échangés entre vous sont effacés.', fn: () => frAct('ami_retirer', { p_code: f.code }, `${f.pseudo} a été retiré de vos amis.`) }, block]
      : f.etat === 'recue' ? [
      { icon: 'check', label: 'Accepter', fn: () => frAct('ami_repondre', { p_code: f.code, p_ok: true }, 'Vous êtes maintenant amis !') },
      { icon: 'close', label: 'Refuser', hint: 'Il pourra vous réinviter plus tard.', fn: () => frAct('ami_repondre', { p_code: f.code, p_ok: false }, 'Invitation refusée.') }, block]
      : [{ icon: 'close', label: 'Annuler l\u2019invitation', fn: () => frAct('ami_retirer', { p_code: f.code }, 'Invitation annulée.') }, block];
    openActions({ title: f.pseudo, sub: { ami: 'Ami sur ZUPA', recue: 'Vous invite à devenir amis', envoyee: 'Invitation envoyée' }[f.etat], avatar: String(f.pseudo).charAt(0).toUpperCase(), actions });
  }
  $('fr-list').addEventListener('click', e => {
    const ok = e.target.closest('[data-fr-ok]');
    if (ok) { frAct('ami_repondre', { p_code: ok.dataset.frOk, p_ok: true }, 'Vous êtes maintenant amis !'); return; }
    const m = e.target.closest('[data-fr-menu]'); if (!m) return;
    const f = fr.list.find(x => x.code === m.dataset.frMenu); if (f) friendMenu(f);
  });
  $('fr-blocked-list').addEventListener('click', e => {
    const u = e.target.closest('[data-fr-unblock]'); if (!u) return;
    const b = (fr.blocked || []).find(x => x.code === u.dataset.frUnblock);
    frAct('ami_debloquer', { p_code: u.dataset.frUnblock }, b ? `${b.pseudo} est débloqué. Vous pouvez de nouveau l\u2019inviter.` : 'Débloqué.');
  });
  $('recus-list').addEventListener('click', async e => {
    const g = e.target.closest('[data-rc-go]'), mm = e.target.closest('[data-rc-menu]');
    const r = fr.recus.find(x => x.id === (g || mm || {}).dataset?.[g ? 'rcGo' : 'rcMenu']);
    if (!r) return;
    if (g) { openRecu(r); return; }
    openActions({ title: r.nom, sub: `Envoyé par ${r.de_pseudo}`, avatar: String(r.de_pseudo).charAt(0).toUpperCase(), actions: [
      { icon: 'route', label: 'Y aller en bus', fn: () => { setOriginStop(null); setDestPlace({ name: r.nom, lat: r.lat, lon: r.lon }); runSearch(); } },
      { icon: 'trash', label: 'Supprimer ce lieu', fn: () => delRecu(r) },
      { icon: 'block', danger: true, label: `Bloquer ${r.de_pseudo}`, hint: 'Ses lieux sont effacés et il ne pourra plus vous en envoyer.', fn: () => frAct('ami_bloquer', { p_code: r.de_code }, `${r.de_pseudo} est bloqué.`) }] });
  });
  function delRecu(r) {
    const i = fr.recus.indexOf(r); fr.recus.splice(i, 1); store.set('recus', fr.recus); renderFriends(); syncBadge();
    let undone = false;
    toast('Lieu reçu supprimé.', 'info', 5000, { text: 'Annuler', fn: () => { undone = true; fr.recus.splice(i, 0, r); store.set('recus', fr.recus); renderFriends(); syncBadge(); } });
    setTimeout(() => { if (!undone) rpc('lieu_recu_maj', { p_id: r.id, p_supprimer: true }); }, 5200);
  }

  /* ---------- Listes d'amis (groupes) : sur ce téléphone, pour envoyer à plusieurs d'un coup ---------- */
  let groups = store.get('groups', []); if (!Array.isArray(groups)) groups = [];
  const saveGroups = () => { store.set('groups', groups); renderGroups(); };
  const friendsOnly = () => fr.list.filter(f => f.etat === 'ami');
  const groupMembers = g => g.codes.filter(c => friendsOnly().some(f => f.code === c));
  function recipHtml() {
    const friends = friendsOnly();
    const gs = groups.filter(g => groupMembers(g).length);
    return (gs.length ? `<div class="rc-groups">${gs.map(g => `<button type="button" class="rc-group" data-grp="${esc(g.id)}" aria-pressed="false">${ic('groups')}<span>${esc(g.name)}</span><small>${groupMembers(g).length}</small></button>`).join('')}</div>` : '')
      + `<div class="share-list">${friends.map(f => `<label class="share-friend"><input type="checkbox" value="${esc(f.code)}"><span class="fr-avatar">${initial(f.pseudo)}</span><span>${esc(f.pseudo)}</span></label>`).join('')}</div>`;
  }
  // toucher une liste coche ou décoche tous ses membres
  function wireRecip(box, onChange) {
    const sync = () => {
      box.querySelectorAll('[data-grp]').forEach(b => {
        const g = groups.find(x => x.id === b.dataset.grp), m = g ? groupMembers(g) : [];
        const on = m.length && m.every(c => box.querySelector(`input[value="${c}"]`)?.checked);
        b.classList.toggle('on', !!on); b.setAttribute('aria-pressed', String(!!on));
      });
      onChange();
    };
    box.onclick = e => {
      const b = e.target.closest('[data-grp]'); if (!b) return;
      const g = groups.find(x => x.id === b.dataset.grp); if (!g) return;
      const m = groupMembers(g), all = m.every(c => box.querySelector(`input[value="${c}"]`)?.checked);
      m.forEach(c => { const i = box.querySelector(`input[value="${c}"]`); if (i) i.checked = !all; });
      sync();
    };
    box.onchange = sync;
    sync();
  }
  const picked = box => [...box.querySelectorAll('input[type=checkbox]:checked')].map(i => i.value);
  const pickedLabel = codes => { const n = codes.map(c => (fr.list.find(f => f.code === c) || {}).pseudo).filter(Boolean); return n.length <= 2 ? n.join(' et ') : `${n.length} amis`; };

  function renderGroups() {
    const ul = $('grp-list'); if (!ul) return;
    ul.innerHTML = groups.length ? groups.map(g => { const m = groupMembers(g); return `<li><span class="fr-avatar grp">${ic('groups')}</span><span><b>${esc(g.name)}</b><br><small class="muted">${m.length ? m.map(c => (fr.list.find(f => f.code === c) || {}).pseudo).join(', ') : 'aucun ami'}</small></span><button class="btn ghost sm fr-more" data-grp-menu="${esc(g.id)}" aria-label="Options de la liste ${esc(g.name)}">${ic('more')}</button></li>`; }).join('')
      : '<li class="muted">Regroupez vos amis (Famille, Bureau, Les gars du quartier…) pour leur envoyer un lieu ou votre position en un geste.</li>';
  }
  const grpEd = { id: null };
  function openGroupEditor(g) {
    if (!friendsOnly().length) { toast('Ajoutez d\u2019abord des amis avec leur code.', 'error'); return; }
    grpEd.id = g ? g.id : null;
    $('grp-title').textContent = g ? 'Modifier la liste' : 'Nouvelle liste';
    $('grp-name').value = g ? g.name : '';
    $('grp-members').innerHTML = `<div class="share-list">${friendsOnly().map(f => `<label class="share-friend"><input type="checkbox" value="${esc(f.code)}"${g && g.codes.includes(f.code) ? ' checked' : ''}><span class="fr-avatar">${initial(f.pseudo)}</span><span>${esc(f.pseudo)}</span></label>`).join('')}</div>`;
    $('grp-del').hidden = !g;
    const sh = $('grp-sheet'); sh.hidden = false; requestAnimationFrame(() => sh.classList.add('open'));
  }
  function closeGroupEditor() { const sh = $('grp-sheet'); sh.classList.remove('open'); setTimeout(() => { sh.hidden = true; }, 250); }
  $('grp-new').onclick = () => openGroupEditor(null);
  $('grp-sheet').addEventListener('click', e => { if (e.target.closest('[data-grp-close]')) closeGroupEditor(); });
  $('grp-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = $('grp-name').value.trim().replace(/\s+/g, ' '), codes = picked($('grp-members'));
    if (name.length < 2) { toast('Donnez un nom à la liste.', 'error'); $('grp-name').focus(); return; }
    if (!codes.length) { toast('Choisissez au moins un ami.', 'error'); return; }
    const g = groups.find(x => x.id === grpEd.id);
    if (g) Object.assign(g, { name, codes }); else groups.push({ id: 'g-' + uuid(), name, codes });
    saveGroups(); closeGroupEditor(); toast(`Liste « ${name} » enregistrée.`, 'success');
  });
  $('grp-del').onclick = () => {
    const i = groups.findIndex(x => x.id === grpEd.id); if (i < 0) return;
    const g = groups.splice(i, 1)[0]; saveGroups(); closeGroupEditor();
    toast(`Liste « ${g.name} » supprimée.`, 'info', 5000, { text: 'Annuler', fn: () => { groups.splice(i, 0, g); saveGroups(); } });
  };
  $('grp-list').addEventListener('click', e => {
    const m = e.target.closest('[data-grp-menu]'); if (!m) return;
    const g = groups.find(x => x.id === m.dataset.grpMenu); if (!g) return;
    openActions({ title: g.name, sub: `${groupMembers(g).length} ami(s)`, actions: [
      { icon: 'navigation', label: 'Envoyer ma position à cette liste', fn: () => openPos({ codes: groupMembers(g) }) },
      { icon: 'edit', label: 'Modifier la liste', fn: () => openGroupEditor(g) },
      { icon: 'trash', danger: true, label: 'Supprimer la liste', hint: 'Vos amis ne sont pas retirés.', fn: () => { grpEd.id = g.id; $('grp-del').onclick(); } }] });
  });

  /* ---------- « Je suis ici » : envoyer sa position avec un message ----------
     Bibliothèque de messages par type de lieu (expressions ivoiriennes et nouchi) + messages perso. */
  const POS_CATS = {
    resto: { label: 'Resto', icon: 'resto', msgs: ['Y\u2019a bon paiya ici ! Retrouve-moi ici.', 'J\u2019ai trouvé un bon coin pour manger. Rejoins-moi !', 'Le garba est chaud ici, viens vite !', 'On mange bien ici, je te garde une place.', 'C\u2019est doux ici, viens on mange ensemble.'] },
    maquis: { label: 'Maquis & sortie', icon: 'night', msgs: ['C\u2019est gâté ici, hein ! Voici notre position.', 'L\u2019ambiance est douce ici. Rejoins-nous !', 'On est dans un bon coin ce soir. Tu viens ?', 'Ça chauffe ici ! Viens on s\u2019enjaille.', 'On est posés au maquis, y\u2019a la place pour toi.'] },
    shop: { label: 'Boutique', icon: 'shop', msgs: ['Y\u2019a de vrais trucs ici, hein ! Viens voir ça.', 'J\u2019ai trouvé un coin intéressant. Regarde ma position !', 'Les prix sont doux ici, viens voir !', 'Y\u2019a tout ici, je t\u2019attends.'] },
    rdv: { label: 'Rendez-vous', icon: 'pin', msgs: ['Je suis ici, viens me trouver.', 'Je suis arrivé. Voici ma position.', 'On se retrouve ici ?', 'Je t\u2019attends ici, ne tarde pas !'] }
  };
  let myMsgs = store.get('myMsgs', {}); if (!myMsgs || typeof myMsgs !== 'object') myMsgs = {};
  const pos = { cat: 'rdv', place: null, withPlace: true, at: null, acc: null };
  // lieu où l'on se trouve : le lieu indiqué, sinon le lieu Paiya le plus proche (moins de 50 m)
  function detectPlace(here, hint) {
    if (hint && Number.isFinite(hint.lat) && !hint.private && Core.haversine(here[0], here[1], hint.lat, hint.lon) < 0.15) return hint;
    let best = null, bd = 0.05;
    for (const p of placesBase()) {
      if (Math.abs(p.lat - here[0]) > 0.0006 || Math.abs(p.lon - here[1]) > 0.0006) continue;
      const d = Core.haversine(here[0], here[1], p.lat, p.lon); if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  function catFor(p) {
    if (!p) return 'rdv';
    const h = new Date().getHours();
    if (p.cat === 'maquis') return 'maquis';
    if (p.cat === 'resto') return /maquis|bar|lounge|grill|club/i.test(p.name + ' ' + (p.sub || '')) || h >= 19 ? 'maquis' : 'resto';
    if (p.cat === 'supermarche' || p.cat === 'marche') return 'shop';
    return p.cat === 'shop' ? 'shop' : 'rdv';
  }
  function openPos(o = {}) {
    if (!sbOn() || !fr.me) { toast('Créez d\u2019abord votre profil d\u2019amis (Profil › Amis).', 'error'); show('screen-profile'); return; }
    if (!friendsOnly().length) { toast('Ajoutez d\u2019abord un ami avec son code.', 'error'); show('screen-profile'); return; }
    const here = state.gpsLast && state.gpsAcc ? state.gpsLast : state.pos;
    if (!here) { toast('Position inconnue : activez la localisation.', 'error'); return; }
    pos.at = here.slice(); pos.acc = state.gpsLast ? state.gpsAcc : state.accuracy;
    pos.place = detectPlace(here, o.place); pos.withPlace = !!pos.place; pos.cat = catFor(pos.place);
    $('pos-to').innerHTML = recipHtml();
    (o.codes || []).forEach(c => { const i = $('pos-to').querySelector(`input[value="${c}"]`); if (i) i.checked = true; });
    wireRecip($('pos-to'), syncPosBtn);
    $('pos-text').value = POS_CATS[pos.cat].msgs[0];
    renderPos();
    const sh = $('pos-sheet'); sh.hidden = false; requestAnimationFrame(() => sh.classList.add('open'));
  }
  function closePos() { const sh = $('pos-sheet'); sh.classList.remove('open'); setTimeout(() => { sh.hidden = true; }, 250); }
  function renderPos() {
    const hp = priv.find(r => Core.haversine(r.lat, r.lon, pos.at[0], pos.at[1]) < 0.15);
    const acc = pos.acc ? ` · ± ${fmtDist(pos.acc / 1000)}` : '';
    $('pos-where').innerHTML = `<span class="pos-pin">${ic('navigation')}</span><span>${pos.place ? `<label class="pos-place"><input type="checkbox" id="pos-with"${pos.withPlace ? ' checked' : ''}> Indiquer le lieu : <b>${esc(pos.place.name)}</b></label>` : '<b>Ma position actuelle</b>'}<small>Votre position exacte sera envoyée${acc}${pos.acc > 150 ? ' — précision faible' : ''}</small>${hp ? `<small class="warn-txt">Vous êtes à votre lieu confidentiel « ${esc(hp.name)} » : vos amis le verront.</small>` : ''}</span>`;
    $('pos-cats').innerHTML = Object.entries(POS_CATS).map(([k, v]) => `<button type="button" role="radio" aria-checked="${pos.cat === k}" class="${pos.cat === k ? 'on' : ''}" data-pcat="${k}">${esc(v.label)}</button>`).join('');
    const mine = myMsgs[pos.cat] || [], cur = $('pos-text').value;
    $('pos-msgs').innerHTML = [...mine.map(m => [m, true]), ...POS_CATS[pos.cat].msgs.map(m => [m, false])].map(([m, own]) =>
      `<button type="button" class="pos-msg${m === cur ? ' on' : ''}${own ? ' own' : ''}" data-msg="${esc(m)}">${own ? ic('star') : ''}<span>${esc(m)}</span>${own ? `<i data-msg-del="${esc(m)}" aria-label="Retirer ce message">${ic('close')}</i>` : ''}</button>`).join('');
    syncPosBtn();
  }
  function syncPosBtn() {
    const codes = picked($('pos-to')), t = $('pos-text').value.trim();
    $('pos-count').textContent = `${t.length}/200`;
    $('pos-send').disabled = !codes.length || !t;
    $('pos-send').textContent = !codes.length ? 'Choisissez à qui l\u2019envoyer' : !t ? 'Écrivez un message' : `Envoyer à ${pickedLabel(codes)}`;
  }
  $('pos-sheet').addEventListener('click', e => {
    if (e.target.closest('[data-pos-close]')) { closePos(); return; }
    const del = e.target.closest('[data-msg-del]');
    if (del) { myMsgs[pos.cat] = (myMsgs[pos.cat] || []).filter(m => m !== del.dataset.msgDel); store.set('myMsgs', myMsgs); renderPos(); return; }
    const c = e.target.closest('[data-pcat]');
    if (c) { const old = POS_CATS[pos.cat].msgs.includes($('pos-text').value) || (myMsgs[pos.cat] || []).includes($('pos-text').value); pos.cat = c.dataset.pcat; if (old || !$('pos-text').value.trim()) $('pos-text').value = (myMsgs[pos.cat] || [])[0] || POS_CATS[pos.cat].msgs[0]; renderPos(); return; }
    const m = e.target.closest('[data-msg]');
    if (m) { $('pos-text').value = m.dataset.msg; renderPos(); }
  });
  $('pos-sheet').addEventListener('change', e => { if (e.target.id === 'pos-with') pos.withPlace = e.target.checked; });
  $('pos-text').addEventListener('input', () => { syncPosBtn(); $('pos-msgs').querySelectorAll('.pos-msg').forEach(b => b.classList.toggle('on', b.dataset.msg === $('pos-text').value)); });
  $('pos-save').onclick = () => {
    const t = $('pos-text').value.trim().replace(/\s+/g, ' ');
    if (!t) return;
    if (/https?:|www\./i.test(t)) { toast('Pas de lien internet dans les messages.', 'error'); return; }
    const l = myMsgs[pos.cat] = myMsgs[pos.cat] || [];
    if (l.includes(t) || POS_CATS[pos.cat].msgs.includes(t)) { toast('Ce message est déjà dans la liste.'); return; }
    l.unshift(t); myMsgs[pos.cat] = l.slice(0, 8); store.set('myMsgs', myMsgs); renderPos();
    toast('Message gardé pour la prochaine fois.', 'success');
  };
  $('pos-send').onclick = async () => {
    const codes = picked($('pos-to')), msg = $('pos-text').value.trim().replace(/\s+/g, ' ');
    if (!codes.length || !msg) return;
    if (/https?:|www\./i.test(msg)) { toast('Pas de lien internet dans les messages.', 'error'); return; }
    if (pos.acc > 300 && !confirm(`Votre position est imprécise (± ${fmtDist(pos.acc / 1000)}). Envoyer quand même ?`)) return;
    $('pos-send').disabled = true;
    const lieu = pos.withPlace && pos.place ? pos.place.name : null;
    const r = await rpc('position_partager', { p_codes: codes, p_message: msg, p_lat: +pos.at[0].toFixed(6), p_lon: +pos.at[1].toFixed(6), p_lieu: lieu, p_cat: pos.place && PYC.CATS[pos.place.cat] ? pos.place.cat : null });
    if (r.ok) { closePos(); toast(`Position envoyée à ${pickedLabel(codes)}.`, 'success'); }
    else { syncPosBtn(); toast(r.net ? 'Pas de connexion internet : réessayez.' : r.status === 404 ? 'Fonction absente de la base : relancez supabase/amis.sql.' : 'Envoi impossible : ' + sbErr(r), 'error', 6000); }
  };
  $('fr-pos').onclick = () => openPos();

  // Feuille de partage : amis ZUPA ou autre application
  const share = { p: null };
  function openShare(p) {
    share.p = p;
    $('share-title').textContent = `Partager « ${p.name} »`;
    const friends = fr.list.filter(f => f.etat === 'ami');
    const box = $('share-friends');
    $('share-send-box').hidden = true; $('share-out').hidden = !!p.private;
    $('share-here').hidden = !!p.private || !p.lat || !state.pos || Core.haversine(state.pos[0], state.pos[1], p.lat, p.lon) > 0.2;
    if (p.private) { $('share-sub').innerHTML = `${ic('lock')} Lieu confidentiel : visible par vous seul. Il ne peut pas être partagé.`; box.innerHTML = ''; }
    else if (!sbOn() || !fr.me) { $('share-sub').textContent = 'Avec vos amis ZUPA : créez d\u2019abord votre profil d\u2019amis.'; box.innerHTML = '<button class="btn ghost sm" data-share-setup>Créer mon profil d\u2019amis</button>'; }
    else if (!friends.length) { $('share-sub').textContent = 'Aucun ami pour l\u2019instant. Ajoutez-en avec leur code dans Profil › Amis.'; box.innerHTML = '<button class="btn ghost sm" data-share-setup>Ajouter un ami</button>'; }
    else {
      $('share-sub').textContent = 'Choisissez à qui l\u2019envoyer :';
      box.innerHTML = recipHtml();
      $('share-send-box').hidden = false; $('share-note').value = '';
      wireRecip(box, syncShareBtn);
    }
    const sh = $('share-sheet'); sh.hidden = false; requestAnimationFrame(() => sh.classList.add('open'));
  }
  function closeShare() { const sh = $('share-sheet'); sh.classList.remove('open'); setTimeout(() => { sh.hidden = true; }, 250); }
  function syncShareBtn() { const c = picked($('share-friends')); $('share-send').disabled = !c.length; $('share-send').textContent = c.length ? `Envoyer à ${pickedLabel(c)}` : 'Choisissez un ami'; }
  $('share-sheet').addEventListener('click', e => {
    if (e.target.closest('[data-share-close]')) { closeShare(); return; }
    if (e.target.closest('[data-share-setup]')) { closeShare(); show('screen-profile'); setTimeout(() => $('friends-card').scrollIntoView({ behavior: 'smooth', block: 'start' }), 350); }
  });
  $('share-out').onclick = () => { const p = share.p; closeShare(); nativeShare(p); };
  $('share-here').onclick = () => { const p = share.p; closeShare(); setTimeout(() => openPos({ place: p }), 260); };
  $('share-send').onclick = async () => {
    const p = share.p, codes = picked($('share-friends'));
    if (!p || !codes.length || p.private) return;
    $('share-send').disabled = true;
    const r = await rpc('lieu_partager', { p_codes: codes, p_nom: p.name, p_cat: p.cat && PYC.CATS[p.cat] ? p.cat : (p.st ? 'pharma' : null), p_lat: p.lat, p_lon: p.lon, p_note: $('share-note').value.trim() || null });
    if (r.ok) { closeShare(); toast(r.data > 1 ? `Lieu envoyé à ${r.data} amis.` : 'Lieu envoyé.', 'success'); }
    else { $('share-send').disabled = false; toast(r.net ? 'Pas de connexion internet : réessayez.' : 'Envoi impossible : ' + sbErr(r), 'error'); }
  };

  /* ---------- Notifications du téléphone (nouveau lieu reçu, demande d'ami) ---------- */
  const LN = () => (isNative() && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications) || null;
  const notifOn = () => store.get('notifOn', true);
  async function notifPermission(ask) {
    const ln = LN(); if (!ln) return false;
    try { let p = await ln.checkPermissions(); if (p.display !== 'granted' && ask) p = await ln.requestPermissions(); return p.display === 'granted'; } catch (_) { return false; }
  }
  async function notify(key, title, body, extra) {
    const ln = LN(); if (!ln || !notifOn() || !(await notifPermission(false))) return false;
    const id = parseInt(String(key).replace(/[^0-9a-f]/gi, '').slice(0, 7) || '1', 16) || Date.now() % 2e9;
    try { await ln.schedule({ notifications: [{ id, title, body, extra, smallIcon: 'ic_stat_zupa', iconColor: '#E97234', autoCancel: true }] }); return true; } catch (_) { return false; }
  }
  try {
    const ln = LN();
    if (ln) ln.addListener('localNotificationActionPerformed', async ev => {
      const x = (ev && ev.notification && ev.notification.extra) || {};
      if (x.recu) { let r = fr.recus.find(y => y.id === x.recu); if (!r) { await frRefresh(true); r = fr.recus.find(y => y.id === x.recu); } if (r) openRecu(r); else show('screen-profile'); }
      else if (x.friend) show('screen-profile');
      else if (x.agenda) show('screen-home');
    });
  } catch (_) {}
  $('fr-notif').checked = notifOn();
  $('fr-notif').onchange = async e => {
    store.set('notifOn', e.target.checked);
    if (e.target.checked && LN() && !(await notifPermission(true))) toast('Autorisez les notifications de ZUPA dans les réglages du téléphone.', 'error', 6000);
  };

  /* =====================================================================
     LIEUX LES PLUS VISITÉS (anonyme)
     Une visite = rester 2 min à moins de 35 m d'un lieu public, GPS précis. Rien n'est compté
     près des lieux confidentiels. Identifiant de visite = empreinte (appareil + jour) : il change
     chaque jour et ne peut pas être relié au profil.
     ===================================================================== */
  const visit = { cand: null, since: 0, done: store.get('visitsDone', {}), queue: store.get('visitQueue', []), on: store.get('pvVisits', true) };
  const today = () => new Date().toISOString().slice(0, 10);
  async function vidFor(day) {
    try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(deviceId + '|' + day)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
    catch (_) { return null; }
  }
  async function flushVisits() {
    if (!sbOn() || !visit.queue.length) return;
    const q = visit.queue.slice();
    for (const v of q) {
      const vid = await vidFor(v.day); if (!vid) break;
      const r = await sb('/rest/v1/rpc/visite_ajouter', { method: 'POST', body: { p_place: v.id, p_vid: vid, p_cat: v.cat, p_nom: v.name, p_lat: v.lat, p_lon: v.lon } });
      if (r.net) break;
      visit.queue = visit.queue.filter(x => x !== v);
    }
    store.set('visitQueue', visit.queue);
  }
  function checkVisit() {
    if (!visit.on || !state.pos || state.posStale || state.manual || (state.accuracy || 999) > 50) { visit.cand = null; return; }
    const [lat, lon] = state.pos;
    if (nearPrivate(lat, lon)) { visit.cand = null; return; }
    let best = null, bd = 0.035;
    for (const p of placesBase()) {
      if (Math.abs(p.lat - lat) > 0.0004 || Math.abs(p.lon - lon) > 0.0004) continue;
      const d = Core.haversine(lat, lon, p.lat, p.lon);
      if (d < bd) { bd = d; best = p; }
    }
    if (!best || !PYC.CATS[best.cat] || PYC.SENSITIVE.has(best.cat)) { visit.cand = null; return; }
    if (!visit.cand || visit.cand.id !== best.id) { visit.cand = best; visit.since = Date.now(); return; }
    if (Date.now() - visit.since < 120e3) return;
    const day = today();
    if (visit.done[best.id] === day) return;
    visit.done[best.id] = day;
    for (const k in visit.done) if (visit.done[k] !== day) delete visit.done[k];
    store.set('visitsDone', visit.done);
    visit.queue.push({ id: best.id, day, cat: best.cat, name: best.name, lat: +best.lat.toFixed(5), lon: +best.lon.toFixed(5) });
    visit.queue = visit.queue.slice(-50); store.set('visitQueue', visit.queue);
    flushVisits();
  }
  $('pv-visits').checked = visit.on;
  $('pv-visits').onchange = e => { visit.on = e.target.checked; store.set('pvVisits', visit.on); if (!visit.on) { visit.queue = []; store.set('visitQueue', []); } toast(visit.on ? 'Vos visites seront comptées de façon anonyme.' : 'Vos visites ne sont plus comptées.'); };
  $('pv-wipe').onclick = async () => {
    if (!sbOn()) return;
    if (!confirm('Effacer vos données en ligne ? Votre profil d\u2019amis, vos amis, les lieux échangés, les lieux publics et les annonces Imo que vous avez ajoutés seront supprimés (une annonce liée à une clé numérique est seulement retirée : l\u2019historique de la clé est conservé pour les deux parties). Vos données sur ce téléphone restent.')) return;
    const r = await sb('/rest/v1/rpc/mes_donnees_supprimer', { method: 'POST', body: { p_secret: mySecret, p_device: deviceId } });
    if (r.ok) { await sb('/rest/v1/rpc/mes_annonces_supprimer', { method: 'POST', body: { p_secret: mySecret } }); imo.mine = []; store.set('imoMine', []); }
    if (!r.ok) { toast(r.net ? 'Pas de connexion internet.' : 'Effacement impossible : ' + sbErr(r), 'error'); return; }
    fr.me = null; fr.list = []; fr.recus = [];
    ['me', 'friends', 'recus'].forEach(k => store.set(k, k === 'me' ? null : []));
    comm.mine = comm.mine.filter(m => !m.synced); store.set('myPlaces', comm.mine);
    if (comm.list) { comm.list.rows = []; store.set('community', comm.list); }
    comm.ver++; renderFriends(); syncBadge(); renderMyPlaces();
    toast('Vos données en ligne ont été effacées.', 'success');
  };

  const pop = { list: store.get('popular', null), t: 0 };
  async function fetchPopular(force) {
    if (!sbOn() || !state.pos || (!force && Date.now() - pop.t < 15 * 60e3)) return;
    pop.t = Date.now();
    const r = await sb('/rest/v1/rpc/lieux_populaires', { method: 'POST', body: { p_lat: +state.pos[0].toFixed(3), p_lon: +state.pos[1].toFixed(3), p_km: 10 } });
    if (r.ok && Array.isArray(r.data)) { pop.list = { t: Date.now(), rows: r.data }; store.set('popular', pop.list); if (current === 'screen-paiya') renderPopular(); }
  }
  const popPlace = r => { const b = placesBase().find(x => x.id === r.place_id); return b || { id: r.place_id, cat: r.cat, name: r.nom, sub: PYC.CATS[r.cat].one, lat: r.lat, lon: r.lon }; };
  function renderPopular() {
    const rows = ((pop.list && pop.list.rows) || []).filter(r => PYC.CATS[r.cat] && !PYC.SENSITIVE.has(r.cat)).slice(0, 10);
    $('py-pop').hidden = !rows.length;
    $('py-rail').innerHTML = rows.map((r, i) => {
      const p = popPlace(r), d = state.pos ? Core.haversine(state.pos[0], state.pos[1], p.lat, p.lon) : null;
      return `<button class="pop-card${isFollowed('paiya', p.id) ? ' following' : ''}" data-pop="${esc(r.place_id)}" style="--c:${PY_COLOR[r.cat]}"><span class="pop-rank">${i + 1}</span><span class="pop-ic">${ic(PY_ICON[r.cat])}</span>${isFollowed('paiya', p.id) ? `<b class="mq-host"><span class="mq-in">${esc(p.name)}</span></b>` : `<b>${esc(p.name)}</b>`}<small>${ic('fire')}${r.visites} visites${d != null ? ' · ' + fmtDist(d) : ''}</small></button>`;
    }).join('');
    marqueeAll($('py-rail'));
  }
  $('py-rail').addEventListener('click', e => {
    const c = e.target.closest('[data-pop]'); if (!c) return;
    const r = ((pop.list && pop.list.rows) || []).find(x => x.place_id === c.dataset.pop); if (!r) return;
    const p = popPlace(r);
    if (placesBase().some(x => x.id === p.id) && !isFollowed('paiya', p.id) && state.pos) followPlace('paiya', p.id);
    else openDetail(withStatus(p), 'screen-paiya', 'paiya');
  });

  /* =====================================================================
     CLAVIER : le champ et ses suggestions restent visibles au-dessus du clavier
     ===================================================================== */
  const vv = window.visualViewport;
  let fullH = window.innerHeight;
  function sizeSuggest() {
    const vh = vv ? vv.height + vv.offsetTop : window.innerHeight;
    document.querySelectorAll('.suggest').forEach(b => {
      if (b.hidden) return;
      const top = b.getBoundingClientRect().top;
      // la liste s'arrête au-dessus de la barre d'onglets (sinon les dernières suggestions sont cachées dessous)
      const nav = document.querySelector('.navbar'), nr = nav && nav.offsetParent ? nav.getBoundingClientRect() : null;
      const bottom = nr && nr.height && nr.top < vh ? Math.min(vh, nr.top) : vh;
      b.style.maxHeight = Math.max(150, bottom - top - 10) + 'px';
    });
  }
  function keepFocusVisible() {
    const el = document.activeElement;
    if (!el || !el.matches('input:not([type=checkbox]), textarea')) return;
    const scr = el.closest('.screen'); if (!scr) { sizeSuggest(); return; }
    const r = el.getBoundingClientRect(), sr = scr.getBoundingClientRect();
    const card = el.closest('.search-card');
    // la zone de recherche monte en haut de l'écran : toute la place restante va aux suggestions
    const delta = card ? card.getBoundingClientRect().top - sr.top - 8 : r.top - sr.top - 90;
    if (Math.abs(delta) > 6) scr.scrollBy({ top: delta, behavior: 'smooth' });
    setTimeout(sizeSuggest, 320);
  }
  function kbUpdate() {
    const h = vv ? vv.height : window.innerHeight;
    const typing = !!document.activeElement && document.activeElement.matches('input:not([type=checkbox]), textarea');
    if (!typing) fullH = Math.max(window.innerHeight, h); // hauteur de référence prise sans clavier
    const open = fullH - h > 140 && !!document.activeElement && document.activeElement.matches('input, textarea');
    document.body.classList.toggle('kb-open', open);
    // si la page n'a pas été redimensionnée (clavier par-dessus), on ajoute la hauteur du clavier en bas
    document.documentElement.style.setProperty('--kb', (open ? Math.max(0, window.innerHeight - h) : 0) + 'px');
    if (open) keepFocusVisible(); else sizeSuggest();
  }
  if (vv) vv.addEventListener('resize', kbUpdate);
  window.addEventListener('resize', kbUpdate);
  window.addEventListener('orientationchange', () => { fullH = 0; setTimeout(kbUpdate, 400); });
  document.addEventListener('focusin', e => { if (e.target.matches('input:not([type=checkbox]), textarea')) setTimeout(() => { kbUpdate(); keepFocusVisible(); }, 300); });
  document.addEventListener('focusout', () => setTimeout(kbUpdate, 200));

  /* =====================================================================
     LIGNES GBAKA / WÔRÔ-WÔRÔ / SALONI ajoutées par les utilisateurs
     Gare de départ → arrêts → terminus, chaque point placé sur la carte (ou à sa position).
     ===================================================================== */
  const lg = { list: store.get('lignes', null), mine: store.get('myLines', []), syncing: false, lastFetch: 0 };
  if (!Array.isArray(lg.mine)) lg.mine = [];
  const al = { type: 'gbaka', pts: [], back: 'screen-home' };
  let alMap = null, alLayer = null, alUser = null;
  function linesChanged() { rebuildNetwork(); renderLinesSection(); if (current === 'screen-profile') renderMyLines(); }
  function renderLinesSection() {
    const n = ((lg.list && lg.list.rows) || []).length, mine = lg.mine.filter(m => !((lg.list && lg.list.rows) || []).some(r => r.id === m.id)).length;
    const tot = n + mine;
    $('lines-sub').textContent = tot ? `${tot} ligne${tot > 1 ? 's' : ''} ajoutée${tot > 1 ? 's' : ''} par la communauté ${tot > 1 ? 'sont prises' : 'est prise'} en compte dans vos itinéraires.`
      : 'Ajoutez les lignes que vous connaissez : gare de départ, arrêts et terminus. Elles servent aussitôt dans les itinéraires de tous.';
  }
  async function fetchLines(force) {
    if (!sbOn() || (!force && Date.now() - lg.lastFetch < 10 * 60e3)) return;
    lg.lastFetch = Date.now();
    const r = await sb('/rest/v1/lignes?select=id,type,gare,nom,tarif,arrets,created_at&order=created_at.desc&limit=2000');
    if (r.ok && Array.isArray(r.data)) {
      lg.list = { t: Date.now(), rows: r.data }; store.set('lignes', lg.list);
      const ids = new Set(r.data.map(x => x.id)); lg.mine.forEach(m => { if (ids.has(m.id)) m.synced = true; }); store.set('myLines', lg.mine);
      linesChanged();
    }
  }
  async function syncLines() {
    if (!sbOn() || lg.syncing) return;
    lg.syncing = true; let sent = 0;
    for (const m of lg.mine.filter(x => x.synced && x.dirty)) {
      const r = await sb('/rest/v1/rpc/ligne_modifier', { method: 'POST', body: { p_id: m.id, p_device: deviceId, p: { gare: m.gare, nom: m.nom || null, tarif: m.tarif ?? null, arrets: m.arrets } } });
      if (r.ok) { m.dirty = false; m.err = null; sent++; } else if (r.net || r.status >= 500 || r.status === 404) break; else m.err = sbErr(r);
    }
    for (const m of lg.mine.filter(x => !x.synced)) {
      const r = await sb('/rest/v1/lignes', { method: 'POST', body: { id: m.id, type: m.type, gare: m.gare, nom: m.nom || null, tarif: m.tarif ?? null, arrets: m.arrets, device: deviceId }, headers: { Prefer: 'return=minimal,resolution=ignore-duplicates' } });
      if (r.ok) { m.synced = true; m.err = null; sent++; } else if (r.net || r.status >= 500) break; else m.err = sbErr(r);
    }
    lg.syncing = false; store.set('myLines', lg.mine);
    if (sent) fetchLines(true); else if (current === 'screen-profile') renderMyLines();
  }
  function renderMyLines() {
    $('my-lines-card').hidden = !lg.mine.length;
    $('my-lines').innerHTML = lg.mine.map(m => { const t = LINE_TYPES[m.type]; const st = m.synced ? '<em class="py-tag">partagée</em>' : m.err ? '<em class="py-tag bad">refusée</em>' : '<em class="py-tag wait">en attente</em>';
      const nm = m.type === 'bus' ? 'Bus ' + m.gare : t.label + ' · ' + m.gare;
      return `<li style="--c:${t.color}">${ic(t.icon)}<span>${esc(nm)} ${m.dirty ? '<em class="py-tag wait">modifiée</em>' : st}<br><small class="muted">${esc(m.arrets[0].name)} → ${esc(m.arrets[m.arrets.length - 1].name)} · ${m.arrets.length} arrêts${m.err ? ' · ' + esc(m.err) : ''}</small></span><button class="btn ghost sm" data-edit-line="${esc(m.id)}" aria-label="Ajouter des arrêts">${ic('addPin')}</button><button class="btn ghost sm" data-del-line="${esc(m.id)}" aria-label="Supprimer">${ic('trash')}</button></li>`; }).join('');
  }
  $('my-lines').addEventListener('click', async e => {
    const ed = e.target.closest('[data-edit-line]'); if (ed) { openAddLine('screen-profile', { edit: ed.dataset.editLine }); return; }
    const b = e.target.closest('[data-del-line]'); if (!b) return;
    const m = lg.mine.find(x => x.id === b.dataset.delLine); if (!m) return;
    if (!confirm(m.synced ? 'Supprimer cette ligne pour tous les utilisateurs ?' : 'Supprimer cette ligne ?')) return;
    if (m.synced && sbOn()) {
      const r = await sb('/rest/v1/rpc/ligne_supprimer', { method: 'POST', body: { p_id: m.id, p_device: deviceId } });
      if (!r.ok) { toast(r.net ? 'Suppression impossible sans internet.' : 'Suppression impossible : ' + sbErr(r), 'error'); return; }
      if (lg.list) { lg.list.rows = lg.list.rows.filter(x => x.id !== m.id); store.set('lignes', lg.list); }
    }
    lg.mine = lg.mine.filter(x => x !== m); store.set('myLines', lg.mine); linesChanged(); renderMyLines(); toast('Ligne supprimée.', 'success');
  });

  // insertion d'un arrêt à la meilleure place entre le départ et le terminus (détour minimal)
  function alInsertAt(pts, p) {
    if (pts.length < 2) return pts.length;
    const d = (x, y) => Core.haversine(x.lat, x.lon, y.lat, y.lon);
    let best = 1, cost = Infinity;
    for (let i = 1; i < pts.length; i++) { const c = d(pts[i - 1], p) + d(p, pts[i]) - d(pts[i - 1], pts[i]); if (c < cost) { cost = c; best = i; } }
    return best;
  }
  function openAddLine(from, opts = {}) {
    al.back = from || current; al.pts = []; al.editId = null;
    if (opts.type) al.type = opts.type; al.type = al.type || 'bus';
    ['al-gare', 'al-nom', 'al-tarif', 'al-pt'].forEach(i => { $(i).value = ''; });
    if (opts.edit) {
      const m = lg.mine.find(x => x.id === opts.edit);
      if (m) { al.editId = m.id; al.type = m.type; al.pts = m.arrets.map(x => ({ ...x })); $('al-gare').value = m.gare; $('al-nom').value = m.nom || ''; $('al-tarif').value = m.tarif ?? ''; al.orig = m.arrets.length; }
    }
    renderAddLine();
    show('screen-addline');
  }
  function renderAddLine() {
    const t = LINE_TYPES[al.type], bus = al.type === 'bus', ed = !!al.editId;
    $('screen-addline').style.setProperty('--c', t.color);
    $('al-title').textContent = ed ? (bus ? `Bus ${$('al-gare').value.trim()} : ajouter des arrêts` : 'Compléter la ligne') : bus ? 'Nouveau bus' : 'Nouvelle ligne';
    $('al-types').hidden = ed;
    $('al-types').innerHTML = Object.entries(LINE_TYPES).filter(([k]) => k !== 'bateau').map(([k, v]) => `<button type="button" class="al-type${al.type === k ? ' on' : ''}" role="radio" aria-checked="${al.type === k}" data-lt="${k}" style="--c:${v.color}">${ic(v.icon)}<span>${v.label}</span></button>`).join('');
    $('al-gare-l').textContent = bus ? 'Numéro du bus' : 'Gare de départ';
    $('al-gare').placeholder = bus ? 'ex. 81' : 'ex. Gare d’Adjamé Liberté';
    $('al-gare').maxLength = bus ? 6 : 60;
    $('al-gare').readOnly = ed && bus;
    $('al-nom-l').innerHTML = bus ? 'Nom du trajet <small>(facultatif)</small>' : 'Trajet <small>(facultatif)</small>';
    $('al-nom').placeholder = bus ? 'ex. Gare Nord – Port-Bouët' : 'ex. Adjamé – Yopougon Selmer';
    const n = al.pts.length;
    $('al-help').textContent = n === 0 ? `Placez la carte sous le repère, sur ${bus ? 'le point de départ du bus' : 'la gare de départ'}, puis touchez « Ajouter ».`
      : n === 1 ? 'Déplacez maintenant la carte jusqu’au terminus, donnez-lui un nom, puis « Ajouter ».'
      : bus ? 'Départ et terminus enregistrés. Ajoutez les arrêts du trajet maintenant ou plus tard (Profil › Mes lignes) : chacun se place tout seul dans l’ordre du parcours.'
      : 'Ajoutez les arrêts entre le départ et le terminus : chacun se place tout seul dans l’ordre du parcours.';
    $('al-pt').placeholder = n === 0 ? (bus ? 'Nom du point de départ' : ($('al-gare').value.trim() || 'Nom de la gare de départ')) : n === 1 ? 'Nom du terminus' : 'Nom de l’arrêt';
    $('al-list').innerHTML = al.pts.map((p, i) => `<li${ed && i > 0 && i < n - 1 && p.nouveau ? ' class="new"' : ''}><span class="al-n">${i === 0 ? 'Départ' : i === n - 1 && n > 1 ? 'Terminus' : 'Arrêt ' + i}</span><b>${esc(p.name)}</b><button type="button" class="al-del" data-al-del="${i}" aria-label="Retirer ${esc(p.name)}">${ic('close')}</button></li>`).join('');
    const g = $('al-gare').value.trim(), gOk = bus ? /^[0-9A-Za-z]{1,6}$/.test(g) : g.length >= 2;
    const ok = gOk && n >= 2;
    $('al-save').disabled = !ok;
    $('al-save').textContent = ed ? 'Enregistrer les modifications' : bus ? 'Enregistrer le bus' : 'Enregistrer la ligne';
    $('al-why').textContent = !gOk ? (bus ? 'Indiquez le numéro du bus (chiffres et lettres, 6 au plus).' : 'Indiquez le nom de la gare de départ.') : n < 2 ? 'Ajoutez au moins le départ et le terminus.' : `${t.label}${bus ? ' ' + g.toUpperCase() : ''} · ${n} points · ${fmtDist(al.pts.reduce((a, p, i) => i ? a + Core.haversine(al.pts[i - 1].lat, al.pts[i - 1].lon, p.lat, p.lon) : 0, 0))}`;
    drawAlRoute();
  }
  function drawAlRoute() {
    if (!alMap) return;
    alLayer.clearLayers();
    const c = LINE_TYPES[al.type].color;
    if (al.pts.length > 1) L.polyline(al.pts.map(p => [p.lat, p.lon]), { color: c, weight: 5, opacity: .85 }).addTo(alLayer);
    al.pts.forEach((p, i) => L.marker([p.lat, p.lon], { icon: L.divIcon({ className: 'al-mk', html: `<span style="--c:${c}">${i + 1}</span>`, iconSize: [24, 24], iconAnchor: [12, 12] }), interactive: false }).addTo(alLayer));
  }
  function alNear() {
    if (!alMap) return;
    const c = alMap.getCenter(), n = Core.nearbyStops(D, c.lat, c.lng, 0.08, 1)[0];
    $('al-near').innerHTML = n ? `<button type="button" class="al-near-btn" data-al-name="${esc(n.stop.label)}">${ic('bus')}Arrêt connu ici : <b>${esc(n.stop.label)}</b> · utiliser ce nom</button>` : '';
  }
  function ensureAlMap() {
    if (!hasL) { mapOff('al-map'); return; }
    if (!alMap) { alMap = baseMap($('al-map')); $('al-map')._map = alMap; alLayer = L.layerGroup().addTo(alMap); alMap.on('moveend', alNear); }
    alMap.invalidateSize();
    alUser = userMarker(alMap, alUser);
    const last = al.pts[al.pts.length - 1];
    alMap.setView(last ? [last.lat, last.lon] : state.pos || [5.33, -4.01], 16, { animate: false });
    drawAlRoute(); alNear();
  }
  $('al-open').onclick = () => openAddMenu('screen-home');
  $('al-back').innerHTML = ic('back');
  $('al-back').onclick = () => goBack();
  $('al-types').addEventListener('click', e => { const b = e.target.closest('[data-lt]'); if (b) { al.type = b.dataset.lt; renderAddLine(); } });
  ['al-gare', 'al-nom', 'al-tarif'].forEach(i => $(i).addEventListener('input', debounce(renderAddLine, 150)));
  $('al-near').addEventListener('click', e => { const b = e.target.closest('[data-al-name]'); if (b) { $('al-pt').value = b.dataset.alName; $('al-pt').focus(); } });
  $('al-gps').onclick = () => { if (!state.pos) { toast('Position inconnue pour le moment.', 'error'); return; } if (alMap) alMap.setView(state.gpsLast || state.pos, Math.max(alMap.getZoom(), 17)); };
  $('al-add-pt').onclick = () => {
    if (!alMap) return;
    const c = alMap.getCenter();
    const name = ($('al-pt').value.trim() || (al.pts.length === 0 && al.type !== 'bus' ? $('al-gare').value.trim() : '')).replace(/\s+/g, ' ');
    if (name.length < 2) { toast('Donnez un nom à ce point.', 'error'); $('al-pt').focus(); return; }
    if (al.pts.length >= 60) { toast('60 points au maximum.', 'error'); return; }
    const pt = { name: name.slice(0, 60), lat: +c.lat.toFixed(6), lon: +c.lng.toFixed(6) };
    if (al.pts.some(q => Core.haversine(q.lat, q.lon, pt.lat, pt.lon) < 0.03)) { toast('Un point de la ligne est déjà à cet endroit : déplacez la carte.', 'error'); return; }
    if (al.pts.length < 2) al.pts.push(pt); else { pt.nouveau = true; const i = alInsertAt(al.pts, pt); al.pts.splice(i, 0, pt); toast(`« ${pt.name} » placé entre ${al.pts[i - 1].name} et ${al.pts[i + 1].name}.`, 'info', 3000); }
    $('al-pt').value = ''; vibrate(20); renderAddLine();
  };
  $('al-list').addEventListener('click', e => { const b = e.target.closest('[data-al-del]'); if (b) { al.pts.splice(+b.dataset.alDel, 1); renderAddLine(); } });
  leaveGuards['screen-addline'] = () => al.saved || !(al.editId ? al.pts.some(p => p.nouveau) : (al.pts.length || $('al-gare').value.trim())) || confirm('Quitter sans enregistrer ? Les points ajoutés seront perdus.');
  $('al-save').onclick = async () => {
    const bus = al.type === 'bus';
    let gare = $('al-gare').value.trim().replace(/\s+/g, ' ');
    if (bus) gare = gare.toUpperCase().replace(/[^0-9A-Z]/g, '');
    if ((bus ? !gare : gare.length < 2) || al.pts.length < 2) { renderAddLine(); return; }
    const tarif = parseInt($('al-tarif').value, 10);
    const pts = al.pts.map(p => ({ name: p.name, lat: p.lat, lon: p.lon }));
    const extra = { gare, nom: $('al-nom').value.trim() || null, tarif: Number.isFinite(tarif) && tarif >= 0 && tarif <= 10000 ? tarif : null, arrets: pts };
    let rec;
    if (al.editId) {
      rec = lg.mine.find(x => x.id === al.editId); if (!rec) return;
      Object.assign(rec, extra, { dirty: true, err: null });
    } else {
      if (lg.mine.filter(m => Date.now() - new Date(m.created).getTime() < 864e5).length >= 5) { toast('5 lignes par jour au maximum. Réessayez demain.', 'error'); return; }
      rec = { id: uuid(), type: al.type, ...extra, created: new Date().toISOString(), synced: false };
      lg.mine.unshift(rec);
    }
    store.set('myLines', lg.mine); linesChanged();
    al.saved = true;
    await syncLines();
    const what = bus ? `Bus ${gare}` : `Ligne ${LINE_TYPES[rec.type].label}`;
    const shared = rec.synced && !rec.dirty;
    toast(al.editId ? `${what} mis à jour${shared ? ' pour tous' : ''}.` : shared ? `${what} enregistré et partagé. ${bus && pts.length === 2 ? 'Ajoutez ses arrêts quand vous voulez : Profil › Mes lignes.' : 'Il sert déjà dans les itinéraires.'}` : sbOn() ? `${what} enregistré. Il sera partagé dès que vous aurez internet.` : `${what} enregistré sur ce téléphone.`, 'success', 7000);
    const back = al.back && al.back !== 'screen-addline' ? al.back : 'screen-home';
    al.pts = []; al.editId = null; $('al-gare').value = '';
    show(back, { force: true }); al.saved = false;
  };

  // un seul point d'entrée pour compléter le réseau : arrêt, nouveau bus, gbaka / wôrô-wôrô / saloni
  function openAddMenu(from) {
    const acts = [
      { icon: 'addPin', label: 'Un arrêt manque', hint: 'Arrêt où passent des bus, à votre position', fn: () => openAddStop(null, from) },
      { icon: 'bus', label: 'Un nouveau bus', hint: 'Numéro, départ et terminus ; les arrêts ensuite', fn: () => openAddLine(from, { type: 'bus' }) },
      { icon: 'gbaka', label: 'Gbaka, wôrô-wôrô ou saloni', hint: 'Une ligne : départ, terminus et arrêts', fn: () => openAddLine(from, { type: al.type && al.type !== 'bus' ? al.type : 'gbaka' }) }
    ];
    const mine = lg.mine.slice(0, 4);
    mine.forEach(m => acts.push({ icon: LINE_TYPES[m.type].icon, label: `Compléter : ${m.type === 'bus' ? 'Bus ' + m.gare : LINE_TYPES[m.type].label + ' ' + m.gare}`, hint: `${m.arrets.length} points · ajouter des arrêts`, fn: () => openAddLine(from, { edit: m.id }) }));
    openActions({ title: 'Ajouter au réseau', sub: 'Tout ce que vous ajoutez sert aussitôt dans les itinéraires', actions: acts });
  }
  $('cta-addstop').onclick = () => openAddMenu('screen-home');


  /* =====================================================================
     AGENDA : « rappelle-moi de … quand je passe par … »
     Chaque rappel est lié à un lieu (arrêt, quartier, lieu ou point sur la carte) et à une distance.
     - en se déplaçant : rappel dès qu'on entre dans la zone (notification + vibration) ;
     - en suivant un itinéraire : dès le départ, les rappels situés le long du trajet sont signalés,
       avec l'arrêt où descendre, puis rappelés à l'approche de cet arrêt.
     Les lieux des rappels restent sur le téléphone.
     ===================================================================== */
  const AG_RAD = [[200, '200 m'], [500, '500 m'], [1000, '1 km'], [2000, '2 km']];
  const AG_WHEN = [['toujours', 'Dès que j’y passe'], ['jour', 'Aujourd’hui'], ['date', 'Un autre jour']];
  var ag = { list: store.get('agenda', []), f: null, map: null, user: null, rt: null };
  if (!Array.isArray(ag.list)) ag.list = [];
  const agSave = () => { store.set('agenda', ag.list); renderAgenda(); };
  const todayLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const agActive = t => !t.done && (t.when === 'toujours' || !t.date || t.date === todayLocal());
  const agOverdue = t => !t.done && t.when !== 'toujours' && t.date && t.date < todayLocal();
  function agWhenTxt(t) {
    if (t.when === 'toujours') return 'dès que vous y passez';
    if (!t.date) return '';
    if (t.date === todayLocal()) return 'aujourd’hui';
    const d = new Date(t.date + 'T12:00:00');
    return (t.date < todayLocal() ? 'prévu le ' : 'le ') + d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function renderAgenda() {
    const box = $('ag-list'); if (!box) return;
    const list = ag.list.slice().sort((a, b) => (a.done - b.done) || (agActive(b) - agActive(a)) || (state.pos ? Core.haversine(state.pos[0], state.pos[1], a.lat, a.lon) - Core.haversine(state.pos[0], state.pos[1], b.lat, b.lon) : 0));
    if (!list.length) {
      box.innerHTML = `<button type="button" class="ag-empty" data-ag-new>${ic('clock')}<span><b>Rappels selon le lieu</b><small>« Acheter le pain à Adjamé », « Déposer le dossier au Plateau » : ZUPA vous le rappelle quand vous passez dans le coin ou que votre trajet y mène.</small></span></button>`;
      return;
    }
    box.innerHTML = list.slice(0, 6).map(t => {
      const d = state.pos ? Core.haversine(state.pos[0], state.pos[1], t.lat, t.lon) : null;
      const inZone = d != null && d * 1000 <= t.r && agActive(t);
      const sub = [t.place, d != null ? fmtDist(d) : '', agWhenTxt(t)].filter(Boolean).join(' · ');
      return `<div class="ag-item${t.done ? ' done' : ''}${inZone ? ' here' : ''}${agOverdue(t) ? ' late' : ''}" data-ag="${esc(t.id)}">
        <button type="button" class="ag-check" data-ag-done="${esc(t.id)}" aria-label="${t.done ? 'Remettre à faire' : 'Marquer comme fait'}">${t.done ? ic('check') : ''}</button>
        <button type="button" class="ag-main" data-ag-edit="${esc(t.id)}"><b>${esc(t.txt)}</b><small>${inZone ? '<em>Vous y êtes</em> · ' : ''}${esc(sub)}</small></button>
        <button type="button" class="ag-go" data-ag-go="${esc(t.id)}" aria-label="Itinéraire vers ${esc(t.place || t.txt)}">${ic('route')}</button>
      </div>`;
    }).join('') + (list.length > 6 ? `<p class="muted ag-more">+ ${list.length - 6} autre${list.length - 6 > 1 ? 's' : ''}</p>` : '') +
      (ag.list.some(t => t.done) ? '<button type="button" class="link ag-clear" data-ag-clear>Effacer les rappels faits</button>' : '');
  }
  $('ag-list').addEventListener('click', e => {
    const t = e.target;
    if (t.closest('[data-ag-new]')) { openAgenda(); return; }
    if (t.closest('[data-ag-clear]')) { ag.list = ag.list.filter(x => !x.done); agSave(); return; }
    const dn = t.closest('[data-ag-done]'); if (dn) { const x = ag.list.find(y => y.id === dn.dataset.agDone); if (x) { x.done = !x.done; x.doneAt = x.done ? Date.now() : null; vibrate(15); agSave(); } return; }
    const ed = t.closest('[data-ag-edit]'); if (ed) { openAgenda(ed.dataset.agEdit); return; }
    const go = t.closest('[data-ag-go]'); if (go) { const x = ag.list.find(y => y.id === go.dataset.agGo); if (x) { setDestPlace({ name: x.place || x.txt, lat: x.lat, lon: x.lon, icon: 'clock' }); runSearch(); } }
  });
  $('ag-add').onclick = () => openAgenda();

  function openAgenda(id) {
    const t = id && ag.list.find(x => x.id === id);
    ag.f = t ? { ...t } : { id: null, txt: '', place: '', lat: null, lon: null, r: 500, when: 'toujours', date: '' };
    $('ag-title').textContent = t ? 'Modifier le rappel' : 'Nouveau rappel';
    $('ag-txt').value = ag.f.txt; $('ag-q').value = ag.f.place || '';
    $('ag-date').value = ag.f.date || ''; $('ag-del').hidden = !t;
    renderAgForm();
    show('screen-agenda');
    if (!t) setTimeout(() => $('ag-txt').focus(), 350);
  }
  function renderAgForm() {
    const f = ag.f;
    $('ag-rad').innerHTML = AG_RAD.map(([v, l]) => `<button type="button" role="radio" aria-checked="${f.r === v}" class="${f.r === v ? 'on' : ''}" data-ag-r="${v}" style="--c:#7c3aed">${l}</button>`).join('');
    $('ag-when').innerHTML = AG_WHEN.map(([v, l]) => `<button type="button" role="radio" aria-checked="${f.when === v}" class="${f.when === v ? 'on' : ''}" data-ag-w="${v}" style="--c:#7c3aed">${l}</button>`).join('');
    $('ag-date').hidden = f.when !== 'date';
    $('ag-where').innerHTML = f.lat == null ? 'Cherchez un lieu ou placez la carte sous le repère.' : `${ic('pin')}<span>${esc(f.place || 'Point choisi sur la carte')}${state.pos ? ' · à ' + fmtDist(Core.haversine(state.pos[0], state.pos[1], f.lat, f.lon)) : ''}</span>`;
    agCircle();
  }
  function agCircle() {
    if (!ag.map || ag.f.lat == null) return;
    if (!ag.circle) ag.circle = L.circle([ag.f.lat, ag.f.lon], { radius: ag.f.r, color: '#7c3aed', weight: 1.5, fillOpacity: 0.08, interactive: false }).addTo(ag.map);
    else { ag.circle.setLatLng([ag.f.lat, ag.f.lon]); ag.circle.setRadius(ag.f.r); }
  }
  function agFit() { if (ag.map && ag.f.lat != null) ag.map.setView([ag.f.lat, ag.f.lon], ag.f.r >= 1000 ? 14 : 15, { animate: false }); }
  function ensureAgMap() {
    if (!hasL) { mapOff('ag-map'); return; }
    if (!ag.map) {
      ag.map = baseMap($('ag-map')); $('ag-map')._map = ag.map;
      ag.map.on('moveend', () => {
        if (ag.skipMove) { ag.skipMove = false; return; }
        const c = ag.map.getCenter();
        if (ag.f.lat != null && Core.haversine(ag.f.lat, ag.f.lon, c.lat, c.lng) < 0.01) return;
        // la carte a été déplacée à la main : le point devient celui sous le repère
        ag.f.lat = +c.lat.toFixed(6); ag.f.lon = +c.lng.toFixed(6);
        const n = Core.nearbyStops(D, c.lat, c.lng, 0.25, 1)[0];
        ag.f.place = n ? `Près de ${n.stop.label}` : 'Point choisi sur la carte';
        $('ag-q').value = ag.f.place; renderAgForm();
      });
    }
    ag.map.invalidateSize();
    ag.user = userMarker(ag.map, ag.user);
    ag.skipMove = true;
    if (ag.f.lat != null) agFit(); else ag.map.setView(state.pos || [5.33, -4.01], 15, { animate: false });
    if (ag.circle && ag.f.lat == null) { ag.circle.remove(); ag.circle = null; }
    agCircle();
  }
  function agSetPlace(name, lat, lon) {
    ag.f.place = name; ag.f.lat = +(+lat).toFixed(6); ag.f.lon = +(+lon).toFixed(6);
    $('ag-q').value = name; ag.skipMove = true; agFit(); renderAgForm();
  }
  makeSuggest($('ag-q'), $('ag-suggest'), {
    onPick: it => { const p = it.type === 'place' ? it.place : it.stop; if (p) agSetPlace(p.label || p.name, p.lat, p.lon); },
    search: q => {
      const stops = Core.searchStops(D, q, 5).map(withDist), places = searchPlaces(q, 6), mine = privMatches(q).map(privItem);
      const out = [];
      if (mine.length) out.push({ head: 'Mes lieux confidentiels' }, ...mine);
      if (places.length) out.push({ head: 'Quartiers et lieux' }, ...places);
      if (stops.length) out.push({ head: 'Arrêts' }, ...stops);
      return out;
    },
    empty: () => priv.length ? [{ head: 'Mes lieux confidentiels' }, ...priv.map(privItem)] : []
  });
  $('ag-back').innerHTML = ic('back');
  $('ag-back').onclick = () => goBack();
  $('ag-here').onclick = () => {
    if (!state.pos) { toast('Position inconnue pour le moment.', 'error'); return; }
    const n = Core.nearbyStops(D, state.pos[0], state.pos[1], 0.25, 1)[0];
    agSetPlace(state.placeName ? state.placeName : n ? `Près de ${n.stop.label}` : 'Ici (ma position)', state.pos[0], state.pos[1]);
  };
  $('ag-rad').addEventListener('click', e => { const b = e.target.closest('[data-ag-r]'); if (b) { ag.f.r = +b.dataset.agR; renderAgForm(); agFit(); } });
  $('ag-when').addEventListener('click', e => { const b = e.target.closest('[data-ag-w]'); if (!b) return; ag.f.when = b.dataset.agW; if (ag.f.when === 'date' && !$('ag-date').value) { const d = new Date(Date.now() + 864e5); $('ag-date').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; } renderAgForm(); });
  leaveGuards['screen-agenda'] = () => ag.saved || !($('ag-txt').value.trim() && !ag.f.id) || confirm('Quitter sans enregistrer ce rappel ?');
  $('ag-save').onclick = () => {
    const txt = $('ag-txt').value.trim().replace(/\s+/g, ' ');
    if (txt.length < 2) { toast('Écrivez ce que vous voulez faire.', 'error'); $('ag-txt').focus(); return; }
    if (ag.f.lat == null) { toast('Choisissez le lieu du rappel.', 'error'); $('ag-q').focus(); return; }
    const when = ag.f.when, date = when === 'jour' ? todayLocal() : when === 'date' ? $('ag-date').value : '';
    if (when === 'date' && !date) { toast('Choisissez la date.', 'error'); return; }
    const rec = { id: ag.f.id || uuid(), txt: txt.slice(0, 80), place: ag.f.place, lat: ag.f.lat, lon: ag.f.lon, r: ag.f.r, when, date, created: ag.f.created || Date.now(), done: false, notified: 0 };
    const k = ag.list.findIndex(x => x.id === rec.id);
    if (k >= 0) ag.list[k] = rec; else ag.list.unshift(rec);
    if (ag.list.length > 60) ag.list.length = 60;
    agSave(); ag.saved = true;
    notifPermission(true);
    toast(k >= 0 ? 'Rappel modifié.' : `Rappel enregistré. ZUPA vous préviendra à moins de ${AG_RAD.find(x => x[0] === rec.r)[1]} du lieu : ${rec.place}.`, 'success', 5000);
    goBack(); ag.saved = false;
    agCheck(true);
  };
  $('ag-del').onclick = () => { if (!ag.f.id || !confirm('Supprimer ce rappel ?')) return; ag.list = ag.list.filter(x => x.id !== ag.f.id); agSave(); ag.saved = true; goBack(); ag.saved = false; };

  // rappel à l'entrée dans la zone (au plus une fois toutes les 3 heures par rappel)
  function agAlert(t, msg, notifBody) {
    t.notified = Date.now(); store.set('agenda', ag.list);
    vibrate([200, 100, 200]);
    toast(msg, 'info', 9000, { text: 'Fait', fn: () => { t.done = true; t.doneAt = Date.now(); agSave(); } });
    notify('a' + t.id.replace(/-/g, '').slice(0, 6), 'Agenda ZUPA', notifBody, { agenda: t.id });
  }
  function agCheck(force) {
    if (!state.pos || state.posStale || !ag.list.length) return;
    if (!force && Date.now() - (ag.lastCheck || 0) < 15e3) return;
    ag.lastCheck = Date.now();
    const acc = state.accuracy || 50;
    for (const t of ag.list) {
      if (!agActive(t)) continue;
      const d = Core.haversine(state.pos[0], state.pos[1], t.lat, t.lon) * 1000;
      if (d - Math.min(acc, 150) > t.r) continue;
      if (t.notified && Date.now() - t.notified < 3 * 3600e3) continue;
      agAlert(t, `Agenda : « ${t.txt} ». Vous êtes à ${fmtDist(d / 1000)} du lieu (${t.place}).`, `${t.txt} · à ${fmtDist(d / 1000)} : ${t.place}`);
    }
    if (current === 'screen-home') renderAgenda();
  }
  // en suivant un trajet : les rappels situés le long du parcours, avec l'arrêt où descendre
  function agRoute() {
    const tr = state.tracking; if (!tr || !tr.pts || !ag.list.length) return;
    const hits = [];
    for (const t of ag.list) {
      if (!agActive(t)) continue;
      let best = null;
      tr.pts.forEach((p, i) => { const d = Core.haversine(p.lat, p.lon, t.lat, t.lon) * 1000; if (d <= Math.max(t.r, 400) && (!best || d < best.d)) best = { p, i, d }; });
      if (best) hits.push({ t, ...best });
    }
    tr.agenda = hits;
    if (!hits.length) return;
    const h = hits[0];
    const more = hits.length > 1 ? ` (+ ${hits.length - 1} autre${hits.length > 2 ? 's' : ''})` : '';
    toast(`Sur votre trajet : « ${h.t.txt} » à ${fmtDist(h.d / 1000)} de l’arrêt ${h.p.name}${more}.`, 'info', 8000);
  }
  // à l'approche de l'arrêt lié à un rappel pendant le suivi
  setInterval(() => {
    const tr = state.tracking; if (!tr || !tr.agenda || !state.pos) return;
    for (const h of tr.agenda) {
      if (h.warned) continue;
      const d = Core.haversine(state.pos[0], state.pos[1], h.p.lat, h.p.lon) * 1000;
      if (d < 600) { h.warned = true; agAlert(h.t, `Prochain arrêt utile : ${h.p.name} — « ${h.t.txt} » à ${fmtDist(h.d / 1000)}.`, `Descendez à ${h.p.name} pour : ${h.t.txt}`); }
    }
  }, 10e3);
  renderAgenda();

  /* ---------- Anti double appui ---------- */
  let lastTap = { el: null, t: 0 };
  document.addEventListener('click', e => {
    const el = e.target.closest('button, a, [role="button"], .board-row');
    if (!el || el.matches('.live-pill, .gb-head, .sheet-grab, .ap-chips button, .py-cat, .segmented button')) return;
    const now = Date.now();
    if (lastTap.el === el && now - lastTap.t < 450) { e.stopImmediatePropagation(); e.preventDefault(); return; }
    lastTap = { el, t: now };
  }, true);

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
    if (nav && nav.dataset.nav === current) { $(current).scrollTo({ top: 0, behavior: 'smooth' }); return; }
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
    if (!$('share-sheet').hidden) { closeShare(); return true; }
    if (!$('act-sheet').hidden) { closeActions(); return true; }
    if (!$('pos-sheet').hidden) { closePos(); return true; }
    if (!$('gd-sheet').hidden) { closeGarde(); return true; }
    if (!$('grp-sheet').hidden) { closeGroupEditor(); return true; }
    if (live.open && LIVE_HOST[current] && current !== 'screen-track') { live.open = false; $('live').classList.remove('open'); $('live-pill').setAttribute('aria-expanded', 'false'); return true; }
    const to = navStack.length > 1 ? navStack[navStack.length - 2] : current !== 'screen-home' ? 'screen-home' : null;
    if (!to) return false;
    show(to);
    return true;
  }
  $('res-back').innerHTML = ic('back');
  $('res-back').onclick = () => goBack();
  try {
    const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (App && isNative()) App.addListener('backButton', () => { if (!goBack()) App.exitApp(); });
  } catch (_) {}

  /* =====================================================================
     COMPTE : connexion Google / Facebook (Supabase Auth) pour sauvegarder et
     retrouver ses données après une réinstallation ou sur un nouveau téléphone.
     - sauvegardé : prénom, nom, favoris, secret de l'appareil (amis, annonces,
       clés, publicités), arrêts / lignes / bus ajoutés, code de secours…
     - les lieux confidentiels (maison, travail) ne partent QUE si l'utilisateur
       coche l'option (désactivée par défaut) ;
     - la position, les caches et les statistiques ne sont jamais sauvegardés.
     ===================================================================== */
  const ACCT_KEYS = ['profile', 'secret', 'device', 'me', 'friends', 'groups', 'myPlaces', 'myLines', 'lignes', 'customStops', 'busCopies',
    'cleSecours', 'cles', 'imoMine', 'recus', 'recusSeen', 'myMsgs', 'blocked', 'reported', 'imoReported', 'recents', 'recentPlaces',
    'theme', 'mode', 'notifOn', 'phFilter', 'gardesManuelles', 'agenda'];
  const ACCT_REDIRECT = 'ci.zupa.app://auth';
  const acct = { s: store.get('compte', null), prov: null, busy: false, pending: null, timer: 0, err: '' };
  const acctOn = () => !!(acct.s && acct.s.refresh);
  const acctPrivOk = () => !!(acct.s && acct.s.priv);

  async function acctFetch(path, opts = {}) {
    const headers = { apikey: SB.key, 'Content-Type': 'application/json', ...(opts.headers || {}) };
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 15000);
    try {
      const r = await fetch(SB.url + path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined, signal: ctl.signal, cache: 'no-store' });
      const txt = await r.text(); let data = null; try { data = txt ? JSON.parse(txt) : null; } catch (_) {}
      return { ok: r.ok, status: r.status, data };
    } catch (_) { return { ok: false, status: 0, data: null, net: true }; }
    finally { clearTimeout(t); }
  }
  function acctUser(u) {
    const m = (u && u.user_metadata) || {};
    return { email: (u && u.email) || m.email || '', name: m.full_name || m.name || '', avatar: m.avatar_url || m.picture || '',
      provider: (u && u.app_metadata && u.app_metadata.provider) || '' };
  }
  function acctSave() { store.set('compte', acct.s); }
  async function acctToken() {
    if (!acctOn()) return null;
    if (acct.s.access && Date.now() < (acct.s.exp || 0) - 60e3) return acct.s.access;
    const r = await acctFetch('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: acct.s.refresh } });
    if (r.ok && r.data && r.data.access_token) {
      Object.assign(acct.s, { access: r.data.access_token, refresh: r.data.refresh_token || acct.s.refresh, exp: Date.now() + (r.data.expires_in || 3600) * 1000 });
      if (r.data.user) Object.assign(acct.s, acctUser(r.data.user));
      acctSave(); return acct.s.access;
    }
    if (r.status === 400 || r.status === 401 || r.status === 403) { // session révoquée : on se déconnecte proprement, les données restent sur le téléphone
      acct.s = null; acctSave(); renderCompte(); toast('Session du compte expirée : reconnectez-vous pour continuer la sauvegarde.', 'error', 6000);
    }
    return null;
  }
  async function acctRpc(fn, body) {
    const tok = await acctToken(); if (!tok) return { ok: false, status: 401, data: null };
    return acctFetch('/rest/v1/rpc/' + fn, { method: 'POST', body: body || {}, headers: { Authorization: 'Bearer ' + tok } });
  }
  function acctSnapshot() {
    const data = {};
    ACCT_KEYS.forEach(k => { const v = localStorage.getItem('zupa:' + k); if (v != null) data[k] = v; });
    if (acctPrivOk()) { const v = localStorage.getItem('zupa:private'); if (v != null) data.private = v; }
    return data;
  }
  function acctSummary(data) {
    const p = (k, d) => { try { return data[k] == null ? d : JSON.parse(data[k]); } catch (_) { return d; } };
    const prof = p('profile', {}) || {}, out = [];
    const nm = [prof.firstname, prof.lastname].filter(Boolean).join(' ');
    if (nm) out.push(nm);
    const n = (a, one, many) => { const c = Array.isArray(a) ? a.length : 0; if (c) out.push(`${c} ${c > 1 ? many : one}`); };
    n(prof.favorites, 'favori', 'favoris'); n(p('friends', []), 'ami', 'amis'); n(p('imoMine', []), 'annonce', 'annonces');
    n(p('cles', []), 'clé', 'clés'); n(p('customStops', []), 'arrêt ajouté', 'arrêts ajoutés'); n(p('busCopies', []), 'bus ajouté', 'bus ajoutés');
    n(p('myLines', []), 'ligne', 'lignes'); n(p('myPlaces', []), 'lieu partagé', 'lieux partagés');
    if (data.private) out.push('lieux confidentiels');
    return out.join(' · ') || 'aucune donnée personnelle';
  }
  async function acctPush(force) {
    if (!acctOn() || acct.pending) return;
    const data = acctSnapshot(), json = JSON.stringify(data);
    if (!force && json === acct.lastJson) return;
    if (json.length > 900000) { acct.err = 'Données trop volumineuses pour la sauvegarde.'; renderCompte(); return; }
    const r = await acctRpc('compte_sauver', { p_data: data, p_device: deviceId });
    if (r.ok) { acct.lastJson = json; acct.s.sync = Date.now(); acct.err = ''; acctSave(); }
    else acct.err = r.status === 0 ? 'Hors ligne : sauvegarde au prochain réseau.' : r.status === 404 ? 'Sauvegarde non activée côté serveur (compte.sql).' : 'Sauvegarde impossible pour le moment.';
    if (current === 'screen-profile') renderCompte();
  }
  function acctSoon() { if (!acctOn() || acct.pending) return; clearTimeout(acct.timer); acct.timer = setTimeout(() => acctPush(false), 5000); }
  // toute écriture d'une donnée sauvegardée programme une sauvegarde (regroupée)
  { const set0 = store.set; const watched = new Set(ACCT_KEYS.concat('private'));
    store.set = (k, v) => { set0(k, v); if (watched.has(k)) acctSoon(); }; }
  document.addEventListener('visibilitychange', () => { if (document.hidden && acctOn()) { clearTimeout(acct.timer); acctPush(false); } });

  async function acctProviders() {
    if (acct.prov || !sbOn()) return;
    const r = await acctFetch('/auth/v1/settings');
    acct.prov = r.ok && r.data && r.data.external ? { google: !!r.data.external.google, facebook: !!r.data.external.facebook } : { google: false, facebook: false, off: true };
    if (current === 'screen-profile') renderCompte();
  }
  function acctLogin(provider) {
    if (!sbOn()) { toast('Service en ligne non configuré.', 'error'); return; }
    if (acct.prov && !acct.prov[provider]) { toast(`Connexion ${provider === 'google' ? 'Google' : 'Facebook'} pas encore activée.`, 'error', 5000); return; }
    const back = isNative() ? ACCT_REDIRECT : location.origin + location.pathname;
    toast('Ouverture de la connexion…', 'info', 2500);
    openExternal(`${SB.url}/auth/v1/authorize?provider=${provider}&redirect_to=${encodeURIComponent(back)}`);
  }
  // retour de la page de connexion : ci.zupa.app://auth#access_token=…&refresh_token=…
  async function acctCallback(url) {
    const i = String(url || '').indexOf('#'); if (i < 0) return false;
    const q = new URLSearchParams(String(url).slice(i + 1));
    if (q.get('error') || q.get('error_description')) { toast('Connexion annulée : ' + (q.get('error_description') || q.get('error')).replace(/\+/g, ' '), 'error', 6000); return true; }
    const access = q.get('access_token'), refresh = q.get('refresh_token');
    if (!access || !refresh) return false;
    acct.s = { access, refresh, exp: Date.now() + (+q.get('expires_in') || 3600) * 1000, priv: false };
    const u = await acctFetch('/auth/v1/user', { headers: { Authorization: 'Bearer ' + access } });
    if (u.ok) Object.assign(acct.s, acctUser(u.data));
    acctSave();
    await acctAfterLogin();
    return true;
  }
  async function acctAfterLogin() {
    acct.busy = true; renderCompte();
    const r = await acctRpc('compte_lire');
    acct.busy = false;
    const row = r.ok ? (Array.isArray(r.data) ? r.data[0] : r.data) : null;
    if (r.ok && (!row || !row.data)) { await acctPush(true); toast('Compte connecté : vos données sont sauvegardées.', 'success', 5000); }
    else if (row && row.data) {
      const same = row.device === deviceId || JSON.stringify(row.data) === JSON.stringify(acctSnapshot());
      if (same) { acct.lastJson = JSON.stringify(row.data); acct.s.sync = Date.now(); acctSave(); acctPush(false); toast('Compte connecté.', 'success'); }
      else { acct.pending = row; if (current !== 'screen-profile') show('screen-profile'); toast('Une sauvegarde existe pour ce compte : choisissez quoi faire.', 'info', 6000); }
    } else toast(r.status === 404 ? 'Connecté, mais la sauvegarde n\'est pas encore activée sur le serveur.' : 'Connecté. Sauvegarde impossible pour le moment.', 'error', 6000);
    renderCompte();
  }
  function acctRestore() {
    const row = acct.pending; if (!row || !row.data) return;
    const keep = acct.s;
    ACCT_KEYS.concat('private').forEach(k => { if (k === 'private' && !row.data.private) return; try { localStorage.removeItem('zupa:' + k); } catch (_) {} });
    Object.entries(row.data).forEach(([k, v]) => { if (k === 'private' || ACCT_KEYS.includes(k)) try { localStorage.setItem('zupa:' + k, v); } catch (_) {} });
    if (row.data.private) keep.priv = true;
    acct.pending = null; acct.s = keep; acctSave();
    try { sessionStorage.setItem('zupa:restored', '1'); } catch (_) {}
    location.reload();
  }
  async function acctReplace() {
    if (!confirm('Remplacer la sauvegarde du compte par les données de ce téléphone ? L\'ancienne sauvegarde sera perdue.')) return;
    acct.pending = null; await acctPush(true); toast('Sauvegarde remplacée par ce téléphone.', 'success'); renderCompte();
  }
  async function acctLogout() {
    if (!confirm('Se déconnecter ? Vos données restent sur ce téléphone, mais ne seront plus sauvegardées.')) return;
    await acctPush(false);
    const tok = acct.s && acct.s.access;
    if (tok) acctFetch('/auth/v1/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + tok } });
    acct.s = null; acct.pending = null; acctSave(); renderCompte();
  }
  async function acctForget() {
    if (!confirm('Supprimer la sauvegarde en ligne et se déconnecter ? Les données de ce téléphone ne sont pas touchées.')) return;
    const r = await acctRpc('compte_effacer');
    if (r.ok) { acct.s.sync = 0; acct.lastJson = ''; acctSave(); toast('Sauvegarde en ligne supprimée, compte déconnecté.', 'success'); acct.s = null; acctSave(); renderCompte(); }
    else toast('Suppression impossible pour le moment.', 'error');
  }
  const G_SVG = '<svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  const F_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="#fff" d="M14 13.5h2.5l1-4H14v-2c0-1 0-2 2-2h1.5V2.1C17.2 2.1 15.9 2 14.5 2 11.6 2 9.5 3.8 9.5 7v2.5h-3v4h3V22h4.5z"/></svg>';
  function renderCompte() {
    const el = $('acct-card'); if (!el) return;
    if (!sbOn()) { el.hidden = true; return; }
    el.hidden = false; acctProviders();
    if (!acctOn()) {
      const p = acct.prov || {};
      el.innerHTML = `<h3>Mon compte</h3>
        <p class="acct-txt">Connectez-vous pour <b>retrouver votre profil, vos favoris, vos amis, vos annonces et vos clés</b> après une mise à jour, une réinstallation ou sur un nouveau téléphone.</p>
        <button class="acct-btn g" type="button" data-acct="google"${acct.prov && !p.google ? ' aria-disabled="true"' : ''}>${G_SVG}<span>Continuer avec Google</span></button>
        <button class="acct-btn f" type="button" data-acct="facebook"${acct.prov && !p.facebook ? ' aria-disabled="true"' : ''}>${F_SVG}<span>Continuer avec Facebook</span></button>
        ${acct.prov && !p.google && !p.facebook ? '<p class="acct-note">La connexion sera disponible très bientôt.</p>' : ''}
        <p class="acct-note">Vos lieux confidentiels (maison, travail) et votre position ne sont jamais envoyés sans votre accord.</p>`;
    } else {
      const s = acct.s, row = acct.pending;
      const who = esc(s.name || s.email || 'Compte connecté');
      const av = s.avatar ? `<img src="${esc(s.avatar)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : '';
      const pv = s.provider === 'facebook' ? 'Facebook' : s.provider === 'google' ? 'Google' : '';
      el.innerHTML = `<h3>Mon compte</h3>
        <div class="acct-who"><span class="acct-av">${av}<i>${esc((s.name || s.email || '?').trim().charAt(0).toUpperCase())}</i></span>
          <div><b>${who}</b><small>${esc([pv, s.name ? s.email : ''].filter(Boolean).join(' · '))}</small></div></div>
        ${row ? `<div class="acct-pend"><b>Sauvegarde trouvée</b><small>du ${esc(new Date(row.updated_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }))}</small>
            <p>${esc(acctSummary(row.data))}</p>
            <button class="btn primary block" type="button" data-acct="restore">Restaurer mes données</button>
            <button class="btn ghost block" type="button" data-acct="replace">Garder ce téléphone (remplace la sauvegarde)</button></div>`
          : `<p class="acct-sync">${acct.busy ? 'Vérification de la sauvegarde…' : acct.err ? esc(acct.err) : s.sync ? 'Sauvegarde automatique · dernière le ' + esc(new Date(s.sync).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })) : 'Sauvegarde automatique activée'}</p>
            <label class="acct-opt"><input type="checkbox" id="acct-priv"${s.priv ? ' checked' : ''}><span>Inclure mes lieux confidentiels (maison, travail)</span></label>
            <div class="acct-row"><button class="btn ghost sm" type="button" data-acct="sync">Sauvegarder maintenant</button>
            <button class="btn ghost sm" type="button" data-acct="logout">Se déconnecter</button></div>
            <button class="acct-del" type="button" data-acct="forget">Supprimer la sauvegarde en ligne</button>`}`;
      const cb = $('acct-priv'); if (cb) cb.onchange = () => { acct.s.priv = cb.checked; acctSave(); acctPush(true); };
    }
    el.querySelectorAll('[data-acct]').forEach(b => b.onclick = () => {
      const a = b.dataset.acct;
      if (a === 'google' || a === 'facebook') acctLogin(a);
      else if (a === 'restore') acctRestore();
      else if (a === 'replace') acctReplace();
      else if (a === 'sync') { acctPush(true).then(() => { if (!acct.err) toast('Données sauvegardées.', 'success'); }); }
      else if (a === 'logout') acctLogout();
      else if (a === 'forget') acctForget();
    });
  }
  function acctBoot() {
    try { if (sessionStorage.getItem('zupa:restored')) { sessionStorage.removeItem('zupa:restored'); setTimeout(() => toast('Vos données ont été restaurées.', 'success', 5000), 600); } } catch (_) {}
    try {
      const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
      if (App && isNative()) {
        App.addListener('appUrlOpen', e => { if (e && /^ci\.zupa\.app:\/\/auth/.test(e.url || '')) acctCallback(e.url); });
        App.getLaunchUrl && App.getLaunchUrl().then(r => { if (r && /^ci\.zupa\.app:\/\/auth/.test(r.url || '')) acctCallback(r.url); }).catch(() => {});
      }
    } catch (_) {}
    const fromHash = () => {
      if (!/access_token=|error_description=/.test(location.hash)) return false;
      const h = location.hash; history.replaceState(null, '', location.pathname + location.search);
      acctCallback(h); return true;
    };
    window.addEventListener('hashchange', fromHash);
    if (!fromHash() && acctOn()) setTimeout(() => acctPush(false), 4000);
  }
  acctBoot();

  /* =====================================================================
     IMO : logements mis en location par des particuliers et des agents
     - la bulle présente l'annonce choisie (ou la plus proche / la meilleure pour la recherche) ;
     - « Je cherche » : type, équipements, quartier, loyer maximum ; classement par distance
       au lieu de travail (ou à l'utilisateur s'il cherche dans son quartier actuel) ;
     - « Publier » : position GPS mesurée sur place OBLIGATOIRE (± 50 m), repère déplaçable
       de 60 m au plus ; aucune annonce possible avec un quartier ou une adresse seule.
     ===================================================================== */
  const IMO_TYPES = [['chambre', 'Chambre simple'], ['studio', 'Studio'], ['2p', 'Chambre salon (2 pièces)'], ['3p', '3 pièces'], ['4p', '4 pièces'], ['5p', '5 pièces et +'], ['villa', 'Villa'], ['duplex', 'Duplex']];
  const IMO_T = Object.fromEntries(IMO_TYPES);
  const IMO_SHORT = { chambre: 'Chambre', studio: 'Studio', '2p': '2 pièces', '3p': '3 pièces', '4p': '4 pièces', '5p': '5 pièces +', villa: 'Villa', duplex: 'Duplex' };
  const IMO_COLS = 'id,role,type,chambres,sdb,cuisine,douche_int,meuble,surface,etage,loyer,avance,caution,frais_visite,bail_mois,description,quartier,adresse,lat,lon,gps_acc,contact_nom,tel,whatsapp,thumb,nb_photos,created_at,porte,remises';
  const IMO_GPS_MAX = 50, IMO_PIN_MAX = 60, IMO_GPS_TTL = 2 * 3600e3;
  const imo = { list: store.get('imoList', null), thumbs: new Map(), lastFetch: 0, loading: false, err: null, shown: 30,
    q: store.get('imoQ', null), mine: store.get('imoMine', []), photos: new Map(), photoFail: new Map(), reported: store.get('imoReported', []) };
  if (!Array.isArray(imo.mine)) imo.mine = [];
  const money = n => (Number(n) || 0).toLocaleString('fr-FR').replace(/ | /g, ' ');
  const intOf = v => { const d = String(v || '').replace(/\D/g, ''); return d ? parseInt(d, 10) : null; };
  const imoRows = () => (imo.list && Array.isArray(imo.list.rows) ? imo.list.rows : []);
  const imoById = id => imoRows().find(a => a.id === id);
  const imoTitle = a => IMO_T[a.type] + (a.meuble ? ' meublé' + (/^(chambre|villa)/.test(a.type) ? 'e' : '') : '');
  const imoName = a => `${IMO_SHORT[a.type]} · ${a.quartier}`;
  const privOf = kind => { const r = (typeof priv !== 'undefined' ? priv : []).find(x => x.kind === kind); return r && Number.isFinite(r.lat) ? r : null; };
  const nearestZone = (lat, lon) => { let b = null, bd = Infinity; for (const z of ZONES) { const d = Core.haversine(lat, lon, z.lat, z.lon); if (d < bd) { bd = d; b = z; } } return b ? { ...b, d: bd } : null; };
  function zonesAround(lat, lon, km, n) {
    return ZONES.map(z => ({ ...z, d: Core.haversine(lat, lon, z.lat, z.lon) })).filter(z => z.d <= km).sort((a, b) => a.d - b.d)
      .filter((z, i, arr) => arr.findIndex(x => Core.key(x.name) === Core.key(z.name)) === i).slice(0, n);
  }

  async function fetchImo(force) {
    if (!sbOn() || imo.loading || (!force && Date.now() - imo.lastFetch < 5 * 60e3)) return;
    imo.loading = true; imo.lastFetch = Date.now();
    $('imo-refresh').classList.add('spin-ic');
    const r = await sb(`/rest/v1/annonces?select=${IMO_COLS}&order=created_at.desc&limit=2000`, { timeout: 20000 });
    imo.loading = false; $('imo-refresh').classList.remove('spin-ic');
    if (r.ok && Array.isArray(r.data)) {
      imo.err = null;
      r.data.forEach(a => { if (a.thumb) imo.thumbs.set(a.id, a.thumb); });
      const rows = r.data.map(({ thumb, ...a }) => a); // les vignettes restent en mémoire (place limitée sur le téléphone)
      imo.list = { t: Date.now(), rows };
      store.set('imoList', imo.list);
    } else imo.err = r.net ? 'Pas de connexion : annonces enregistrées sur le téléphone.' : r.status === 404 ? 'Imo n’est pas encore activé sur le serveur.' : 'Annonces indisponibles pour le moment.';
    if (current === 'screen-imo') renderImo();
  }
  async function fetchMine() {
    if (!sbOn()) return;
    const r = await rpc('mes_annonces', {});
    if (r.ok && Array.isArray(r.data)) { imo.mine = r.data; store.set('imoMine', imo.mine); if (current === 'screen-imo') renderMine(); }
  }

  // Point de référence pour classer : travail (recherche dans un autre quartier), sinon l'utilisateur
  function imoRef() {
    const q = imo.q;
    if (q && q.zone && q.zone.here && state.pos) return { lat: state.pos[0], lon: state.pos[1], label: 'de vous', key: 'pos' };
    const w = privOf('work');
    if (q && w) return { lat: w.lat, lon: w.lon, label: 'de votre travail', key: 'work' };
    if (q && q.zone && !q.zone.here) return { lat: q.zone.lat, lon: q.zone.lon, label: `du centre de ${q.zone.name}`, key: 'zone' };
    if (state.pos) return { lat: state.pos[0], lon: state.pos[1], label: 'de vous', key: 'pos' };
    return null;
  }
  function imoMatches(a, q, slack = 1) {
    if (!q) return true;
    if (q.type && a.type !== q.type) return false;
    if (q.budget && a.loyer > q.budget * slack) return false;
    if (q.cuisine && !a.cuisine) return false;
    if (q.douche && !a.douche_int) return false;
    if (q.meuble && !a.meuble) return false;
    if (q.zone) { const d = Core.haversine(a.lat, a.lon, q.zone.lat, q.zone.lon); if (d > (q.zone.here ? 3 : 2.5) && Core.key(a.quartier) !== Core.key(q.zone.name)) return false; }
    return true;
  }
  function imoResults() {
    const ref = imoRef(), q = imo.q;
    const withD = a => ({ a, d: ref ? Core.haversine(ref.lat, ref.lon, a.lat, a.lon) : null });
    const sort = (x, y) => (x.d ?? 1e9) - (y.d ?? 1e9) || x.a.loyer - y.a.loyer;
    const all = imoRows().map(withD);
    if (!q) return { ref, main: all.filter(x => x.d == null || x.d <= 25).sort(sort), extra: [] };
    const main = all.filter(x => imoMatches(x.a, q)).sort(sort);
    // un peu au-dessus du budget ou dans le reste de la zone : proposé à part, jamais mélangé
    const ids = new Set(main.map(x => x.a.id));
    const extra = all.filter(x => !ids.has(x.a.id) && (imoMatches(x.a, q, 1.15) || imoMatches(x.a, { ...q, type: null }))).sort(sort).slice(0, 10);
    return { ref, main, extra };
  }

  /* ---------- Onglet ---------- */
  function imoRow(x, ref) {
    const a = x.a, fol = isFollowed('imo', a.id), th = imo.thumbs.get(a.id);
    const eq = [a.chambres ? `${a.chambres} ch.` : '', a.cuisine ? 'cuisine' : '', a.douche_int ? 'douche int.' : ''].filter(Boolean).join(' · ');
    return `<div class="py-row imo-row${fol ? ' following' : ''}" data-imo="${esc(a.id)}" role="button" tabindex="0" aria-pressed="${fol}">
      <span class="imo-th">${th ? `<img src="${th}" alt="" loading="lazy">` : ic('home')}</span>
      <span class="imo-main"><b>${esc(a.type === '2p' ? 'Chambre salon' + (a.meuble ? ' meublé' : '') : imoTitle(a))}</b><small>${esc(a.quartier)}${eq ? ' · ' + esc(eq) : ''}</small><span class="imo-price">${money(a.loyer)} F<small>/mois</small></span></span>
      <span class="imo-d">${x.d != null ? `<b>${fmtDist(x.d)}</b><small>${esc(ref ? ref.label : '')}</small>` : ''}</span>
      <span class="imo-go">${ic('chevron')}</span></div>`;
  }
  function renderImo(enter) {
    if (enter) { fetchImo(false); if (Date.now() - (imo.mineT || 0) > 60e3) { imo.mineT = Date.now(); fetchMine(); } }
    const { ref, main, extra } = imoResults(), q = imo.q;
    const n = imoRows().length;
    $('imo-title').textContent = q ? 'Votre recherche' : 'Trouvez votre maison';
    $('imo-pulse').textContent = imo.err && !n ? imo.err
      : !n ? (imo.loading ? 'Chargement des annonces…' : 'Aucune annonce pour le moment. Soyez le premier à publier !')
      : q ? `${main.length} logement${main.length > 1 ? 's' : ''} pour vous${ref ? ', classés par distance ' + ref.label : ''}`
      : (k => `${k} logement${k > 1 ? 's' : ''} à louer à moins de 5 km`)(main.filter(x => x.d != null && x.d <= 5).length);
    const crit = $('imo-crit');
    crit.hidden = !q;
    if (q) {
      const bits = [q.type ? IMO_T[q.type] : 'Tout type', q.zone ? (q.zone.here ? `${q.zone.name} (mon quartier)` : q.zone.name) : 'Tout Abidjan', q.budget ? `≤ ${money(q.budget)} F/mois` : '', q.cuisine ? 'cuisine' : '', q.douche ? 'douche interne' : '', q.meuble ? 'meublé' : ''].filter(Boolean);
      crit.innerHTML = `<span>${ic('search')}<span>${bits.map(esc).join(' · ')}</span></span><button type="button" class="link" id="imo-crit-edit">Modifier</button><button type="button" class="link" id="imo-crit-x" aria-label="Effacer la recherche">${ic('close')}</button>`;
    }
    $('imo-list-h').textContent = q ? 'Pour votre recherche' : 'Autour de vous';
    $('imo-sub').textContent = ref ? `distance ${ref.label}` : '';
    const list = $('imo-list'), rows = main.slice(0, imo.shown);
    let html = rows.map(x => imoRow(x, ref)).join('');
    if (!rows.length) html = `<div class="py-empty imo-empty">${ic('home')}<b>${q ? 'Aucun logement ne correspond encore' : 'Pas encore d’annonce près de vous'}</b><span>${q ? 'Élargissez le quartier ou le budget, ou revenez plus tard : de nouvelles annonces arrivent chaque jour.' : 'Les annonces publiées autour de vous apparaîtront ici.'}</span></div>`;
    if (q && extra.length) html += `<div class="imo-sep">Proches de votre recherche</div>` + extra.map(x => imoRow(x, ref)).join('');
    list.innerHTML = html;
    list.classList.toggle('is-empty', !rows.length && !extra.length);
    $('imo-more').hidden = main.length <= imo.shown;
    renderMine();
    renderLive();
  }
  function renderMine() {
    const wrap = $('imo-mine-wrap');
    wrap.hidden = !imo.mine.length;
    if (!imo.mine.length) return;
    const now = Date.now();
    $('imo-mine-sub').textContent = `${imo.mine.length} annonce${imo.mine.length > 1 ? 's' : ''}`;
    $('imo-mine').innerHTML = imo.mine.map(m => {
      const exp = new Date(m.expires_at).getTime() < now, hidden = m.signalements >= 3;
      const st = m.statut === 'occupee' ? '<em class="py-tag ok">clé remise</em>' : m.statut === 'louee' ? '<em class="py-tag">louée</em>' : hidden ? '<em class="py-tag bad">masquée (signalée)</em>' : exp ? '<em class="py-tag wait">expirée</em>' : '<em class="py-tag ok">en ligne</em>';
      const left = Math.max(0, Math.ceil((new Date(m.expires_at).getTime() - now) / 864e5));
      return `<div class="py-row imo-row mine" data-mine="${esc(m.id)}" role="button" tabindex="0">
        <span class="imo-th">${imo.thumbs.get(m.id) ? `<img src="${imo.thumbs.get(m.id)}" alt="">` : ic('key')}</span>
        <span class="imo-main"><b>${esc(IMO_SHORT[m.type] || m.type)} · ${esc(m.quartier)}</b><small>${money(m.loyer)} F/mois · ${m.nb_photos} photo${m.nb_photos > 1 ? 's' : ''}${m.statut === 'active' && !exp ? ` · ${left} j restants` : ''}</small>${st}</span>
        <span class="imo-d"></span><span class="imo-go">${ic('more')}</span></div>`;
    }).join('');
  }
  $('imo-list').addEventListener('click', e => {
    const row = e.target.closest('[data-imo]'); if (!row) return;
    const id = row.dataset.imo;
    if (isFollowed('imo', id)) { $('screen-imo').scrollTo({ top: 0, behavior: 'smooth' }); live.open = true; $('live').classList.add('open'); return; }
    followPlace('imo', id);
    $('screen-imo').scrollTo({ top: 0, behavior: 'smooth' });
  });
  $('imo-mine').addEventListener('click', e => {
    const row = e.target.closest('[data-mine]'); if (!row) return;
    const m = imo.mine.find(x => x.id === row.dataset.mine); if (!m) return;
    const act = async (action, ok) => {
      const r = await rpc('annonce_statut', { p_id: m.id, p_action: action });
      if (!r.ok) { toast(r.net ? 'Pas de connexion internet.' : 'Action impossible : ' + sbErr(r), 'error'); return; }
      toast(ok, 'success'); fetchMine(); fetchImo(true);
    };
    if (m.statut === 'occupee') { openCles(); return; }
    openActions({ title: `${IMO_SHORT[m.type]} · ${m.quartier}`, sub: `${money(m.loyer)} F/mois`, actions: [
      { icon: 'key', label: 'Remettre les clés au locataire', hint: 'Au logement : le locataire saisit un code dans ZUPA. L’annonce est alors retirée.', fn: () => cleDonner(m) },
      { icon: 'edit', label: 'Modifier l’annonce', hint: 'Loyer, conditions, photos, description, contact', fn: () => imoEdit(m) },
      ...(imoById(m.id) ? [{ icon: 'home', label: 'Voir l’annonce', fn: () => followPlace('imo', m.id) }] : []),
      { icon: 'refresh', label: 'Toujours disponible', hint: 'Reste en ligne 45 jours de plus', fn: () => act('renouveler', 'Annonce prolongée de 45 jours.') },
      { icon: 'check', label: 'Loué sans clé numérique', hint: 'L’annonce n’apparaît plus (la remise de clés protège mieux les deux parties)', fn: () => act('louee', 'Annonce marquée louée.') },
      { icon: 'trash', label: 'Supprimer l’annonce', danger: true, fn: () => imoDelete(m) }] });
  });
  $('imo-more').onclick = () => { imo.shown += 30; renderImo(); };
  $('imo-refresh').onclick = () => { fetchImo(true); fetchMine(); };
  $('imo-find').onclick = () => openImoSearch();
  $('imo-pub').onclick = () => openImoPub();
  $('imo-crit').addEventListener('click', e => {
    if (e.target.closest('#imo-crit-edit')) openImoSearch();
    else if (e.target.closest('#imo-crit-x')) { const old = imo.q; imo.q = null; store.set('imoQ', null); renderImo(); toast('Recherche effacée.', 'info', 4000, { label: 'Annuler', fn: () => { imo.q = old; store.set('imoQ', old); renderImo(); } }); }
  });

  /* ---------- Bulle : l'annonce sélectionnée, présentée comme une fiche ---------- */
  function imoTarget() {
    const d = live.dest && live.dest.kind === 'imo' && Date.now() - live.dest.t < DEST_TTL ? live.dest : null;
    let a = d && imoById(d.id), kicker = 'Votre sélection';
    if (!a) {
      const { main } = imoResults();
      const x = main[0];
      if (!x) return null;
      a = x.a; kicker = imo.q ? 'Le mieux placé pour vous' : 'Le plus proche de vous';
    }
    return { kind: 'imo', p: { ...a, name: imoName(a) }, a, icon: 'home', dest: !!d, far: FAR_KM, at: 0.04, kicker,
      tags: '' }; // le prix n'apparaît qu'une fois, dans l'aperçu
  }
  // Distances pratiques : arrêt de bus le plus proche (et ses lignes), école primaire, collège et marché les plus proches
  const ECOLES = (window.ZUPA_ECOLES && Array.isArray(window.ZUPA_ECOLES.list)) ? window.ZUPA_ECOLES.list : [];
  function nearestEcole(lat, lon, kind) {
    let b = null, bd = Infinity;
    for (const e of ECOLES) { if (e[1] !== kind) continue; const d = Core.haversine(lat, lon, e[2], e[3]); if (d < bd) { bd = d; b = e; } }
    return b && bd <= 6 ? { name: b[0], d: bd } : null;
  }
  function imoDistances(a) {
    const out = []; // [icône, titre, distance km, détail (HTML)]
    const st = Core.nearbyStops(D, a.lat, a.lon, 3, 1)[0];
    if (st) out.push(['bus', 'Arrêt de bus', st.d, '', st.stop.label, st.stop.lines && st.stop.lines.length ? `<span class="imc-lines">${st.stop.lines.slice(0, 5).map(n => lineBadge(n, true)).join('')}${st.stop.lines.length > 5 ? `<small>+${st.stop.lines.length - 5}</small>` : ''}</span>` : '']);
    const ep = nearestEcole(a.lat, a.lon, 'p'); if (ep) out.push(['school', 'École (maternelle, CP1 – CM2)', ep.d, '', ep.name]);
    const co = nearestEcole(a.lat, a.lon, 'c'); if (co) out.push(['school', 'Collège / lycée (6e – Tle)', co.d, '', co.name]);
    let mk = null; for (const p of placesBase()) if (p.cat === 'marche') { const k = Core.haversine(a.lat, a.lon, p.lat, p.lon); if (!mk || k < mk.d) mk = { d: k, name: p.name }; }
    if (mk && mk.d < 15) out.push(['market', 'Marché', mk.d, '', mk.name && !/^march[ée]$/i.test(mk.name) ? mk.name : '']);
    return out;
  }
  function imoCardHtml(a) {
    const stat = (icn, v, l) => v == null || v === '' ? '' : `<div class="ic-stat">${ic(icn)}<b>${esc(String(v))}</b><small>${l}</small></div>`;
    const cond = [a.avance != null ? `Avance : ${a.avance} mois` : '', a.caution != null ? `Caution : ${a.caution} mois` : '',
      a.frais_visite != null ? (a.frais_visite ? `Frais de visite : ${money(a.frais_visite)} FCFA` : 'Visite gratuite') : '',
      a.bail_mois ? `Durée du bail : ${a.bail_mois} mois` : '', a.meuble ? 'Meublé' : '',
      [a.cuisine ? 'Cuisine' : 'Sans cuisine', a.douche_int ? 'douche interne' : 'douche externe'].join(', ')].filter(Boolean);
    const ph = imo.photos.get(a.id), nb = a.nb_photos || 0, th = imo.thumbs.get(a.id);
    let photos = '';
    if (nb) {
      const list = ph && ph.length ? ph : th ? [th] : [];
      photos = `<div class="ic-h">${ic('camera')}<b>Photos du logement</b>${nb > 1 ? `<small>${nb}</small>` : ''}</div>
        <div class="ic-photos${list.length > 1 ? ' multi' : ''}">${list.map((src, i) => `<button type="button" class="ic-ph${i === 0 ? ' big' : ''}" data-ph="${i}" aria-label="Photo ${i + 1}"><img src="${src}" alt=""></button>`).join('')}${ph ? '' : '<span class="ic-ph-load"><span class="spinner"></span></span>'}</div>`;
    }
    const dist = imoDistances(a);
    const tel = String(a.tel || '');
    const telFmt = tel.replace(/(\d{2})(?=\d)/g, '$1 ');
    return `<article class="imo-card" data-id="${esc(a.id)}">
      <span class="ic-badge">${ic('key')}À LOUER</span>
      <h3 class="ic-title">${esc(imoTitle(a))}</h3>
      <p class="ic-addr">${ic('pin')}<span>${esc(a.quartier)}${a.adresse ? ' – ' + esc(a.adresse) : ''}</span></p>
      <p class="ic-gps">${ic('locate')}Position GPS vérifiée sur place (± ${Math.round(a.gps_acc || 0)} m)</p>${a.porte ? `<p class="ic-gps">${ic('home')}${esc(a.porte)}</p>` : ''}
      ${a.remises > 0 ? `<p class="ic-trust">${ic('key')}${a.remises} remise${a.remises > 1 ? 's' : ''} de clés réussie${a.remises > 1 ? 's' : ''} avec ZUPA</p>` : ''}
      <p class="ic-price">${money(a.loyer)} FCFA <small>/ mois</small></p>
      <div class="ic-stats">${stat('bed', a.chambres, a.chambres > 1 ? 'Chambres' : 'Chambre')}${stat('bath', a.sdb, a.sdb > 1 ? 'Salles de bain' : 'Salle de bain')}${stat('area', a.surface ? a.surface + ' m²' : null, 'Surface')}${stat('floor', a.etage == null ? null : a.etage === 0 ? 'RDC' : a.etage, 'Étage')}</div>
      <div class="ic-boxes">
        ${dist.length ? `<div class="ic-box"><div class="ic-h">${ic('pin')}<b>Distances pratiques</b></div>${dist.map(([icn, l, d, , name]) => `<div class="ic-li">${ic(icn)}<span class="ic-li-t">${esc(l)}${name ? `<small>${esc(name)}</small>` : ''}</span><b>${fmtDist(d)}</b></div>`).join('')}</div>` : ''}
        <div class="ic-box"><div class="ic-h">${ic('doc')}<b>Conditions</b></div>${cond.map(c => `<div class="ic-li ok">${ic('check')}<span>${esc(c)}</span></div>`).join('')}</div>
      </div>
      ${a.description ? `<p class="ic-desc">${esc(a.description)}</p>` : ''}
      ${photos}
      <button type="button" class="ic-route" data-ic="route">${ic('route')}Voir l’itinéraire</button>
      <div class="ic-contact">
        <div class="ic-who">${ic('user')}<span><b>${esc(a.contact_nom || (a.role === 'agent' ? 'Agent immobilier' : 'Propriétaire'))}</b><small>${a.role === 'agent' ? 'Agent immobilier' : 'Propriétaire'} · ${esc(telFmt)}</small></span></div>
        <div class="ic-btns">${a.whatsapp ? `<button type="button" class="ic-wa" data-ic="wa">${ic('chat')}WhatsApp</button>` : ''}<button type="button" class="ic-call" data-ic="call">${ic('phone')}Appeler</button></div>
      </div>
      <button type="button" class="ic-report link" data-ic="report">${ic('flag')}Signaler cette annonce</button>
    </article>`;
  }
  // aperçu compact dans la bulle ; la fiche complète seulement si on la demande (« Voir tout »)
  function imoPreviewHtml(a) {
    const th = (imo.photos.get(a.id) || [])[0] || imo.thumbs.get(a.id);
    const facts = [a.chambres != null ? `${a.chambres} ch.` : '', a.sdb != null ? `${a.sdb} sdb` : '', a.surface ? `${a.surface} m²` : '', a.etage == null ? '' : a.etage === 0 ? 'RDC' : `${a.etage}e ét.`].filter(Boolean).join(' · ');
    const d = imoDistances(a)[0];
    return `<article class="imo-prev" data-id="${esc(a.id)}">
      <button type="button" class="ip-th" data-ph="0" aria-label="Voir les photos"${th ? '' : ' disabled'}>${th ? `<img src="${th}" alt="">` : ic('home')}${a.nb_photos > 1 ? `<em>${a.nb_photos}</em>` : ''}</button>
      <div class="ip-main"><b class="ip-price">${money(a.loyer)} FCFA<small> / mois</small></b><span>${esc(facts)}</span>${d ? `<small>${ic(d[0])}<span>${esc(d[1])}</span> <b>${fmtDist(d[2])}</b></small>` : ''}</div>
      <div class="ip-acts">${a.whatsapp ? `<button type="button" class="ic-wa" data-ic="wa" aria-label="WhatsApp">${ic('chat')}</button>` : ''}<button type="button" class="ic-call" data-ic="call" aria-label="Appeler">${ic('phone')}</button></div>
      <button type="button" class="ip-more" data-ic="more">Voir tout ${ic('chevron')}</button>
    </article>`;
  }
  // Bulle Imo : la fiche du logement en cartes qui défilent (automatiquement toutes les 5 s, ou au doigt)
  function imoCards(a) {
    const photos = imo.photos.get(a.id) || [], th = photos[0] || imo.thumbs.get(a.id), nb = a.nb_photos || 0;
    const tel = String(a.tel || ''), telFmt = tel.replace(/(\d{2})(?=\d)/g, '$1 ');
    const cards = [];
    // 1. la photo, le titre et le prix
    cards.push(`<div class="imc imc-photo${th ? '' : ' nophoto'}" data-ph="0" role="button" aria-label="Voir les photos">
      ${th ? `<img src="${th}" alt="">` : `<span class="imc-house">${ic('home')}</span>`}
      <span class="imc-tag">${ic('key')}À LOUER</span>${nb ? `<span class="imc-nb">${ic('camera')}${nb}</span>` : ''}
      <div class="imc-ov"><b class="imc-t">${esc(imoTitle(a))}</b><span>${ic('pin')}${esc(a.quartier)}${a.adresse ? ' – ' + esc(a.adresse) : ''}</span><b class="imc-price">${money(a.loyer)} FCFA<small> / mois</small></b></div></div>`);
    // 2. le logement
    const stat = (icn, v, l) => v == null || v === '' ? '' : `<div class="imc-st">${ic(icn)}<b>${esc(String(v))}</b><small>${l}</small></div>`;
    const eq = [a.cuisine ? 'Cuisine' : 'Sans cuisine', a.douche_int ? 'Douche interne' : 'Douche externe', a.meuble ? 'Meublé' : ''].filter(Boolean);
    cards.push(`<div class="imc imc-info"><p class="imc-h">${ic('home')}Le logement</p>
      <div class="imc-stats">${stat('bed', a.chambres, a.chambres > 1 ? 'chambres' : 'chambre')}${stat('bath', a.sdb, a.sdb > 1 ? 'salles de bain' : 'salle de bain')}${stat('area', a.surface ? a.surface + ' m²' : null, 'surface')}${stat('floor', a.etage == null ? null : a.etage === 0 ? 'RDC' : a.etage + 'e', 'étage')}</div>
      <div class="imc-chips">${eq.map(x => `<span>${esc(x)}</span>`).join('')}${a.porte ? `<span>${esc(a.porte)}</span>` : ''}</div>
      <p class="imc-gps">${ic('locate')}Position GPS vérifiée sur place (± ${Math.round(a.gps_acc || 0)} m)</p></div>`);
    // 3. le prix et ce qu'il faut prévoir à l'entrée
    const entree = (a.loyer || 0) * ((a.avance || 0) + (a.caution || 0)) + (a.frais_visite || 0);
    const row = (l, v) => `<div class="imc-row"><span>${l}</span><b>${v}</b></div>`;
    cards.push(`<div class="imc imc-money"><p class="imc-h">${ic('key')}Loyer et conditions</p>
      <b class="imc-big">${money(a.loyer)} FCFA<small> / mois</small></b>
      ${row('Avance', a.avance != null ? `${a.avance} mois` : '—')}${row('Caution', a.caution != null ? `${a.caution} mois` : '—')}${row('Frais de visite', a.frais_visite ? money(a.frais_visite) + ' F' : a.frais_visite === 0 ? 'gratuit' : '—')}${row('Bail', a.bail_mois ? `${a.bail_mois} mois` : '—')}
      ${entree > a.loyer ? `<p class="imc-total">À prévoir à l’entrée : <b>${money(entree)} FCFA</b></p>` : ''}</div>`);
    // 4. distances pratiques
    const dist = imoDistances(a);
    if (dist.length) cards.push(`<div class="imc imc-dist"><p class="imc-h">${ic('pin')}Distances pratiques</p>
      ${dist.map(([icn, l, d, , name, lines]) => `<div class="imc-d">${ic(icn)}<span class="imc-dl"><b>${esc(l)}</b>${name ? `<small>${esc(name)}</small>` : ''}${lines || ''}</span><em>${fmtDist(d)}</em></div>`).join('')}</div>`);
    // 5. contact
    cards.push(`<div class="imc imc-who"><p class="imc-h">${ic('user')}Contact</p>
      <b class="imc-name">${esc(a.contact_nom || (a.role === 'agent' ? 'Agent immobilier' : 'Propriétaire'))}</b>
      <small>${a.role === 'agent' ? 'Agent immobilier' : 'Propriétaire'} · ${esc(telFmt)}</small>
      ${a.remises > 0 ? `<p class="ic-trust">${ic('key')}${a.remises} remise${a.remises > 1 ? 's' : ''} de clés réussie${a.remises > 1 ? 's' : ''} avec ZUPA</p>` : ''}
      ${imo.mine.some(m => m.id === a.id) ? `<p class="imc-mine">${ic('user')}C’est votre annonce</p>
      <div class="imc-btns"><button type="button" class="ic-wa" data-ic="edit">${ic('edit')}Modifier</button><button type="button" class="ic-call" data-ic="del">${ic('trash')}Supprimer</button></div>`
      : `<div class="imc-btns">${a.whatsapp ? `<button type="button" class="ic-wa" data-ic="wa">${ic('chat')}WhatsApp</button>` : ''}<button type="button" class="ic-call" data-ic="call">${ic('phone')}Appeler</button></div>
      <div class="imc-links"><button type="button" class="link" data-ic="route">${ic('route')}Itinéraire</button><button type="button" class="link" data-ic="report">${ic('flag')}Signaler</button></div>`}</div>`);
    if (a.description) cards.splice(2, 0, `<div class="imc imc-desc"><p class="imc-h">${ic('edit')}Description</p><p>${esc(a.description)}</p></div>`);
    return cards;
  }
  const imc = { i: 0, timer: null, hold: false, holdT: null, n: 0 };
  function renderLiveImo(tg) {
    const box = $('live-imo');
    if (!tg || tg.kind !== 'imo') { box.innerHTML = ''; live.imoId = null; clearInterval(imc.timer); imc.timer = null; return; }
    const a = tg.a;
    const key = a.id + '|' + (imo.photos.get(a.id) || []).length + '|' + (imo.thumbs.has(a.id) ? 1 : 0) + '|' + imo.mine.some(m => m.id === a.id);
    if (live.imoKey === key) return;
    // le doigt est sur les cartes : on ne reconstruit rien maintenant (sinon retour à la première carte)
    if (imc.touch && live.imoId === a.id) { clearTimeout(imc.later); imc.later = setTimeout(() => renderLiveImo(live.tg), 600); return; }
    const old = $('imc-rail');
    if (live.imoId !== a.id) imc.i = 0;
    else if (old && old.clientWidth) imc.i = Math.round(old.scrollLeft / old.clientWidth); // position réelle, même en plein défilement
    live.imoKey = key; live.imoId = a.id;
    const cards = imoCards(a); imc.n = cards.length; imc.i = Math.max(0, Math.min(imc.i, cards.length - 1));
    box.innerHTML = `<div class="imc-rail" id="imc-rail">${cards.join('')}</div><div class="imc-dots" id="imc-dots">${cards.map((_, k) => `<i class="${k === imc.i ? 'on' : ''}"></i>`).join('')}</div>`;
    const rail = $('imc-rail');
    if (imc.i) rail.scrollLeft = rail.clientWidth * imc.i;
    rail.addEventListener('scroll', debounce(() => { const k = Math.round(rail.scrollLeft / Math.max(1, rail.clientWidth)); if (k !== imc.i) { imc.i = k; imcMark(); } }, 80), { passive: true });
    const hold = () => { imc.hold = true; imc.touch = true; clearTimeout(imc.holdT); imc.holdT = setTimeout(() => { imc.hold = false; }, 10000); };
    const free = () => { setTimeout(() => { imc.touch = false; }, 400); };
    rail.addEventListener('pointerdown', hold, { passive: true });
    rail.addEventListener('touchstart', hold, { passive: true });
    ['pointerup', 'pointercancel', 'touchend', 'touchcancel'].forEach(ev => rail.addEventListener(ev, free, { passive: true }));
    if (!imc.timer) imc.timer = setInterval(() => { if (current === 'screen-imo' && live.open && !imc.hold && !imc.touch && document.visibilityState === 'visible' && $('imc-rail')) { const r = $('imc-rail'); imc.i = Math.round(r.scrollLeft / Math.max(1, r.clientWidth)); imcGo(imc.i + 1); } }, 5000);
    if (a.nb_photos && !imo.photos.has(a.id) && Date.now() - (imo.photoFail.get(a.id) || 0) > 60e3) loadImoPhotos(a.id);
  }
  function imcMark() { const d = $('imc-dots'); if (d) d.querySelectorAll('i').forEach((x, k) => x.classList.toggle('on', k === imc.i)); }
  function imcGo(i) { const rail = $('imc-rail'); if (!rail || !imc.n) return; imc.i = (i + imc.n) % imc.n; rail.scrollTo({ left: rail.clientWidth * imc.i, behavior: 'smooth' }); imcMark(); }
  async function loadImoPhotos(id) {
    if (imo.photos.has(id) || !sbOn()) return;
    imo.photos.set(id, null);
    const r = await sb(`/rest/v1/annonce_photos?select=idx,data&annonce_id=eq.${id}&order=idx`, { timeout: 20000 });
    if (r.ok && Array.isArray(r.data)) imo.photos.set(id, r.data.map(x => x.data));
    else { imo.photos.delete(id); imo.photoFail.set(id, Date.now()); return; } // échec : pas de nouvel essai avant 1 min (évite une boucle de rafraîchissements)
    live.imoKey = ''; if (current === 'screen-imo') renderLive();
  }
  function imoRoute(a) {
    setDestPlace({ name: imoName(a), lat: a.lat, lon: a.lon, icon: 'home' });
    show('screen-home');
    setTimeout(() => { if (typeof searchRoutes === 'function') searchRoutes(); }, 60);
  }
  $('live-imo').addEventListener('click', e => {
    const b = e.target.closest('[data-ic],[data-ph]'); if (!b) return;
    const a = live.tg && live.tg.a; if (!a) return;
    e.stopPropagation();
    if (b.dataset.ph != null) { openViewer(imo.photos.get(a.id) || [imo.thumbs.get(a.id)].filter(Boolean), +b.dataset.ph); return; }
    const k = b.dataset.ic, tel = String(a.tel || '');
    if (k === 'more' || k === 'less') { live.imoFull = k === 'more'; live.imoKey = ''; renderLiveImo(live.tg); if (k === 'less') $('screen-imo').scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (k === 'edit' || k === 'del') { const m = imo.mine.find(x => x.id === a.id) || a; if (k === 'edit') imoEdit(m); else imoDelete(m); return; }
    if (k === 'route') imoRoute(a);
    else if (k === 'call') openExternal('tel:' + tel);
    else if (k === 'wa') openExternal(`https://wa.me/225${tel}?text=${encodeURIComponent(`Bonjour, je vous contacte depuis ZUPA pour votre annonce : ${imoTitle(a)} à ${a.quartier}, ${money(a.loyer)} FCFA/mois. Est-il toujours disponible ?`)}`);
    else if (k === 'report') reportImo(a);
  });
  function reportImo(a) {
    if (imo.reported.includes(a.id)) { toast('Vous avez déjà signalé cette annonce. Merci !'); return; }
    const send = async motif => {
      const r = await rpc('annonce_signaler', { p_id: a.id, p_motif: motif });
      if (!r.ok) { toast(r.net ? 'Pas de connexion internet.' : 'Signalement impossible : ' + sbErr(r), 'error'); return; }
      imo.reported.push(a.id); store.set('imoReported', imo.reported.slice(-300));
      toast('Merci. L’annonce est masquée après 3 signalements.', 'success');
    };
    openActions({ title: 'Signaler l’annonce', sub: imoName(a), actions: [
      { icon: 'pin', label: 'Mal localisée', hint: 'Le logement n’est pas à cet endroit', fn: () => send('mal_localisee') },
      { icon: 'block', label: 'Logement fictif', hint: 'Ce logement n’existe pas', fn: () => send('fictive') },
      { icon: 'check', label: 'Déjà loué', fn: () => send('deja_louee') },
      { icon: 'flag', label: 'Arnaque', hint: 'Argent demandé avant visite, etc.', danger: true, fn: () => send('arnaque') }] });
  }
  // visionneuse plein écran (défilement horizontal)
  function openViewer(list, i) {
    if (!list.length) return;
    const v = $('imo-viewer'), rail = $('imo-viewer-rail');
    rail.innerHTML = list.map(src => `<div class="imo-viewer-sl"><img src="${src}" alt=""></div>`).join('');
    v.hidden = false;
    requestAnimationFrame(() => { rail.scrollLeft = i * rail.clientWidth; upd(); });
    function upd() { $('imo-viewer-n').textContent = `${Math.round(rail.scrollLeft / Math.max(1, rail.clientWidth)) + 1} / ${list.length}`; }
    rail.onscroll = upd;
  }
  $('imo-viewer-x').onclick = () => { $('imo-viewer').hidden = true; };

  /* ---------- Je cherche ---------- */
  const is = { type: null, zone: null, cuisine: false, douche: false, meuble: false };
  function openImoSearch() {
    const q = imo.q || {};
    Object.assign(is, { type: q.type || null, zone: q.zone || null, cuisine: !!q.cuisine, douche: !!q.douche, meuble: !!q.meuble });
    $('is-budget').value = q.budget ? money(q.budget) : '';
    $('is-q').value = '';
    renderImoSearch();
    show('screen-imo-search');
  }
  function renderImoSearch() {
    $('is-type').innerHTML = IMO_TYPES.map(([k, l]) => `<button type="button" role="radio" aria-checked="${is.type === k}" class="${is.type === k ? 'on' : ''}" data-v="${k}">${esc(k === '2p' ? '2 pièces (chambre salon)' : l)}</button>`).join('');
    $('is-eq').querySelectorAll('button').forEach(b => { const on = !!is[b.dataset.k]; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    const here = state.pos ? nearestZone(state.pos[0], state.pos[1]) : null;
    const chips = [];
    if (here && here.d < 3) chips.push({ k: 'here', l: `${ic('locate')}Mon quartier : ${esc(here.name)}`, on: !!(is.zone && is.zone.here) });
    if (is.zone && !is.zone.here) chips.push({ k: 'cur', l: `${ic('pin')}${esc(is.zone.name)}`, on: true });
    chips.push({ k: 'any', l: 'Peu importe', on: !is.zone });
    $('is-qchips').innerHTML = chips.map(c => `<button type="button" role="radio" aria-checked="${c.on}" class="${c.on ? 'on' : ''}" data-z="${c.k}">${c.l}</button>`).join('');
    const b = intOf($('is-budget').value);
    $('is-bchips').innerHTML = [30000, 60000, 100000, 150000, 250000, 500000].map(v => `<button type="button" class="${b === v ? 'on' : ''}" data-b="${v}">${money(v)}</button>`).join('');
    const w = privOf('work');
    const ref = is.zone && is.zone.here ? 'les plus proches de vous (votre quartier actuel)' : w ? 'les plus proches de votre lieu de travail' : is.zone ? `les plus proches du centre de ${is.zone.name}` : 'les plus proches de vous';
    $('is-ref').innerHTML = `${ic('info')}<span>Les logements seront classés : <b>${esc(ref)}</b>.${!w ? ' Astuce : enregistrez votre <b>lieu de travail</b> (Profil, lieux confidentiels) pour classer les annonces selon votre trajet quotidien. Il reste sur votre téléphone.' : ''}</span>`;
  }
  $('is-type').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; is.type = is.type === b.dataset.v ? null : b.dataset.v; renderImoSearch(); });
  $('is-eq').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; is[b.dataset.k] = !is[b.dataset.k]; renderImoSearch(); });
  $('is-qchips').addEventListener('click', e => {
    const b = e.target.closest('[data-z]'); if (!b) return;
    if (b.dataset.z === 'any') is.zone = null;
    else if (b.dataset.z === 'here' && state.pos) { const z = nearestZone(state.pos[0], state.pos[1]); is.zone = { name: z.name, lat: state.pos[0], lon: state.pos[1], here: true }; }
    renderImoSearch();
  });
  $('is-bchips').addEventListener('click', e => { const b = e.target.closest('[data-b]'); if (!b) return; $('is-budget').value = money(+b.dataset.b); renderImoSearch(); });
  $('is-budget').addEventListener('input', e => { const v = intOf(e.target.value); e.target.value = v ? money(v) : ''; renderImoSearch(); });
  makeSuggest($('is-q'), $('is-suggest'), {
    search: q => { const k = Core.key(q); return ZONES.filter(z => Core.key(z.name).includes(k)).sort((a, b) => Core.key(a.name).indexOf(k) - Core.key(b.name).indexOf(k) || a.name.length - b.name.length)
      .filter((z, i, arr) => arr.findIndex(x => Core.key(x.name) === Core.key(z.name)) === i).slice(0, 8)
      .map(z => ({ z, html: `${ic('pin')}<span class="sg-main"><b>${esc(z.name)}</b><small>${state.pos ? fmtDist(Core.haversine(state.pos[0], state.pos[1], z.lat, z.lon)) + ' de vous' : 'quartier'}</small></span>` })); },
    onPick: it => { is.zone = { name: it.z.name, lat: it.z.lat, lon: it.z.lon, here: false }; $('is-q').value = ''; renderImoSearch(); }
  });
  $('is-back').onclick = () => goBack();
  $('is-clear').onclick = () => { imo.q = null; store.set('imoQ', null); show('screen-imo'); };
  $('is-form').addEventListener('submit', e => {
    e.preventDefault();
    const budget = intOf($('is-budget').value);
    if (budget != null && budget < 5000) { toast('Indiquez un loyer d’au moins 5 000 FCFA.', 'error'); return; }
    imo.q = { type: is.type, zone: is.zone, budget, cuisine: is.cuisine, douche: is.douche, meuble: is.meuble, t: Date.now() };
    store.set('imoQ', imo.q); imo.shown = 30;
    if (live.dest && live.dest.kind === 'imo') { live.dest = null; store.set('liveDest', null); }
    show('screen-imo');
  });

  /* ---------- Publier : GPS obligatoire et vérifié ---------- */
  const ip = { st: 'none', gps: null, pin: null, type: '2p', role: 'proprietaire', eq: { cuisine: true, douche: true, meuble: false }, zone: null, zones: [], photos: [], timer: 0, sending: false };
  let ipMap = null, ipCircle = null, ipMoving = false;
  function openImoPub() {
    if (!sbOn()) { toast('Publication indisponible : base partagée non configurée.', 'error'); return; }
    renderImoPub();
    show('screen-imo-pub');
  }
  function renderImoPub() {
    const acc = ip.gps ? `± ${Math.round(ip.gps.acc)} m` : '';
    const T = {
      none: [ic('info'), 'Aucune position. Touchez le bouton ci-dessous une fois sur place.', 'warn'],
      locating: ['<span class="spinner"></span>', `Mesure GPS en cours… ${acc} <small>(il faut ± ${IMO_GPS_MAX} m ou mieux)</small>`, ''],
      weak: [ic('info'), `Signal GPS trop imprécis (± ${ip.weakAcc || '?'} m, il faut ± ${IMO_GPS_MAX} m). Sortez devant la porte ou près d’une fenêtre, activez la localisation précise, puis réessayez. Publication impossible sans une mesure précise.`, 'warn'],
      fail: [ic('info'), 'GPS indisponible. Activez la localisation du téléphone et autorisez ZUPA, puis réessayez.', 'warn'],
      ok: [ic('check'), `Logement localisé par GPS (${acc}). Vous pouvez ajuster le repère de ${IMO_PIN_MAX} m au plus.`, 'ok'],
      old: [ic('info'), 'Mesure GPS de plus de 2 h : localisez à nouveau le logement.', 'warn']
    }[ip.st];
    $('ip-state').className = 'ap-state ' + (ip.edit ? 'ok' : T[2]);
    $('ip-state').innerHTML = ip.edit ? `${ic('check')}<span>Position GPS vérifiée sur place le ${new Date(ip.edit.created_at).toLocaleDateString('fr-FR')} (± ${Math.round(ip.edit.gps_acc || 0)} m). Elle ne se modifie pas : pour un autre emplacement, supprimez l’annonce et republiez-la sur place.</span>` : `${T[0]}<span>${T[1]}</span>`;
    $('ip-locate').hidden = !!ip.edit;
    document.querySelector('#screen-imo-pub .topbar .title').textContent = ip.edit ? 'Modifier l’annonce' : 'Publier un logement';
    $('ip-save').textContent = ip.edit ? 'Enregistrer les modifications' : 'Publier l’annonce';
    $('ip-locate').disabled = ip.st === 'locating';
    $('ip-locate').lastChild.textContent = ip.st === 'ok' ? 'Mesurer à nouveau' : 'Je suis au logement : localiser';
    $('ip-map-wrap').hidden = !ip.gps || !!ip.edit;
    $('ip-quartier').innerHTML = ip.zones.length ? ip.zones.map(z => `<button type="button" role="radio" aria-checked="${ip.zone === z.name}" class="${ip.zone === z.name ? 'on' : ''}" data-z="${esc(z.name)}">${esc(z.name)}</button>`).join('') : '<span class="ip-wait">Localisez d’abord le logement.</span>';
    $('ip-type').innerHTML = IMO_TYPES.map(([k, l]) => `<button type="button" role="radio" aria-checked="${ip.type === k}" class="${ip.type === k ? 'on' : ''}" data-v="${k}">${esc(k === '2p' ? '2 pièces (chambre salon)' : l)}</button>`).join('');
    $('ip-eq').querySelectorAll('button').forEach(b => { const on = !!ip.eq[b.dataset.k]; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    $('ip-role').querySelectorAll('button').forEach(b => { const on = b.dataset.v === ip.role; b.classList.toggle('active', on); b.setAttribute('aria-checked', String(on)); });
    $('ip-photos').innerHTML = ip.photos.map((p, i) => `<div class="ip-ph"><img src="${p.data}" alt=""><button type="button" data-rm="${i}" aria-label="Retirer la photo">${ic('close')}</button>${i === 0 ? '<em>Principale</em>' : ''}</div>`).join('') || '<p class="ip-wait">Ajoutez au moins une photo du logement.</p>';
    $('ip-cam').disabled = $('ip-gal').disabled = ip.photos.length >= 6;
    checkImoPub();
  }
  function imoPubProblem() {
    if (!ip.edit) {
      if (ip.st !== 'ok' || !ip.gps || !ip.pin) return 'Localisez le logement par GPS, sur place (obligatoire).';
      if (Date.now() - ip.gps.t > IMO_GPS_TTL) return 'Mesure GPS trop ancienne : localisez à nouveau le logement.';
      if (Core.haversine(ip.pin[0], ip.pin[1], ip.gps.lat, ip.gps.lon) * 1000 > IMO_PIN_MAX + 1) return `Le repère doit rester à ${IMO_PIN_MAX} m au plus de la mesure GPS.`;
      if (!ip.zone) return 'Choisissez le quartier.';
    }
    const loyer = intOf($('ip-loyer').value);
    if (!loyer || loyer < 5000) return 'Indiquez le loyer mensuel (5 000 FCFA au moins).';
    const ch = intOf($('ip-ch').value), sdb = intOf($('ip-sdb').value);
    if (ch == null || ch > 12 || sdb == null || sdb > 10) return 'Indiquez le nombre de chambres et de salles de bain.';
    if (!ip.photos.length) return 'Ajoutez au moins une photo du logement.';
    if (phoneDigits($('ip-tel').value).length !== 10) return 'Indiquez un numéro de téléphone à 10 chiffres.';
    if (!$('ip-certif').checked) return 'Cochez la case de certification.';
    return '';
  }
  function checkImoPub() { const pb = imoPubProblem(); $('ip-save').disabled = !!pb || ip.sending; $('ip-why').textContent = pb; }
  function ensureIpMap() {
    if (!ip.gps) return;
    if (!hasL) { mapOff('ip-map'); return; }
    if (!ipMap) {
      ipMap = baseMap($('ip-map'), { onLocate: () => { ipLocate(); return false; } });
      ipMap.on('dragstart', () => { ipMoving = true; });
      ipMap.on('moveend', () => {
        if (!ipMoving || !ip.gps) return;
        ipMoving = false;
        const c = ipMap.getCenter(), d = Core.haversine(c.lat, c.lng, ip.gps.lat, ip.gps.lon) * 1000;
        if (d > IMO_PIN_MAX) { // garde-fou : retour au point le plus éloigné autorisé
          const k = IMO_PIN_MAX / d;
          ip.pin = [ip.gps.lat + (c.lat - ip.gps.lat) * k, ip.gps.lon + (c.lng - ip.gps.lon) * k];
          ipMap.panTo(ip.pin);
          toast(`Le repère ne peut pas s’éloigner de plus de ${IMO_PIN_MAX} m de votre position GPS.`, 'error', 4000);
          vibrate(60);
        } else ip.pin = [c.lat, c.lng];
        setIpZones(); renderImoPub();
      });
    }
    ipMap.invalidateSize();
    if (ipCircle) ipCircle.remove();
    ipCircle = L.circle([ip.gps.lat, ip.gps.lon], { radius: IMO_PIN_MAX, color: '#e0a800', weight: 2, fillOpacity: 0.1, dashArray: '6 6', interactive: false }).addTo(ipMap);
    ipMap.setView(ip.pin, 18, { animate: false });
  }
  function setIpZones() {
    const p = ip.pin;
    ip.zones = zonesAround(p[0], p[1], 3, 6);
    if (!ip.zones.length) { const z = nearestZone(p[0], p[1]); if (z) ip.zones = [z]; }
    if (!ip.zones.some(z => z.name === ip.zone)) ip.zone = ip.zones[0] ? ip.zones[0].name : null;
  }
  // mesure GPS fraîche : seules les mesures reçues APRÈS l'appui comptent ; la meilleure des 20 s (arrêt dès ± 12 m)
  function ipLocate() {
    clearTimeout(ip.timer);
    ip.st = 'locating'; renderImoPub();
    if (!gotFix && !watchHigh) startGeo(true);
    const t0 = Date.now(); let best = null, n = 0, lastT = 0;
    const tick = () => {
      if (current !== 'screen-imo-pub') { if (ip.st === 'locating') ip.st = 'none'; return; }
      const r = state.gpsRaw;
      if (r && r.t > t0 && r.t !== lastT) { lastT = r.t; n++; if (!best || r.acc < best.acc) best = { ...r }; }
      if (best) { ip.gps = best; renderImoPub(); $('ip-map-wrap').hidden = true; }
      const done = best && ((best.acc <= 12 && n >= 2) || Date.now() - t0 > 20000);
      if (done) {
        if (best.acc > IMO_GPS_MAX) { ip.st = 'weak'; ip.weakAcc = Math.round(best.acc); ip.gps = null; ip.pin = null; ip.zones = []; ip.zone = null; renderImoPub(); return; }
        ip.gps = best; ip.pin = [best.lat, best.lon]; ip.st = 'ok';
        setIpZones(); vibrate(60); renderImoPub(); ensureIpMap(); return;
      }
      if (!best && Date.now() - t0 > 20000) { ip.st = 'fail'; renderImoPub(); return; }
      ip.timer = setTimeout(tick, 400);
    };
    tick();
  }
  $('ip-locate').onclick = ipLocate;
  $('ip-back').onclick = () => goBack();
  leaveGuards['screen-imo-pub'] = () => {
    const dirty = ip.st === 'ok' || ip.photos.length || ['ip-loyer', 'ip-tel', 'ip-desc', 'ip-adresse', 'ip-porte'].some(i => $(i).value.trim());
    return ip.sending ? false : !dirty || confirm('Abandonner cette annonce ? Les informations saisies seront perdues.');
  };
  $('ip-quartier').addEventListener('click', e => { const b = e.target.closest('[data-z]'); if (!b) return; ip.zone = b.dataset.z; renderImoPub(); });
  $('ip-type').addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b) return; ip.type = b.dataset.v;
    const ch = { chambre: 1, studio: 1, '2p': 1, '3p': 2, '4p': 3, '5p': 4 }[ip.type]; if (ch) $('ip-ch').value = ch;
    renderImoPub();
  });
  $('ip-eq').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (!b) return; ip.eq[b.dataset.k] = !ip.eq[b.dataset.k]; renderImoPub(); });
  $('ip-role').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (!b) return; ip.role = b.dataset.v; renderImoPub(); });
  $('ip-photos').addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (!b) return; ip.photos.splice(+b.dataset.rm, 1); renderImoPub(); });
  $('ip-form').addEventListener('input', e => {
    if (['ip-loyer', 'ip-visite'].includes(e.target.id)) { const v = intOf(e.target.value); e.target.value = v != null ? money(v) : ''; }
    checkImoPub();
  });
  $('ip-certif').addEventListener('change', checkImoPub);
  // photos : réduites sur le téléphone (1280 px, JPEG) avant l'envoi ; vignette 200 px pour les listes
  function shrink(file, max, q) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', q));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('image illisible')); };
      img.src = url;
    });
  }
  async function addPhotos(files) {
    for (const f of [...files].slice(0, 6 - ip.photos.length)) {
      if (!/^image\//.test(f.type)) continue;
      try {
        let data = await shrink(f, 1280, 0.72);
        if (data.length > 380000) data = await shrink(f, 960, 0.62);
        const thumb = ip.photos.length ? null : await shrink(f, 220, 0.6);
        ip.photos.push({ data, thumb });
      } catch (_) { toast('Une photo n’a pas pu être lue.', 'error'); }
    }
    if (ip.photos[0] && !ip.photos[0].thumb) ip.photos[0].thumb = ip.photos[0].data; // ne devrait pas arriver
    renderImoPub();
  }
  ['ip-cam', 'ip-gal'].forEach(id => $(id).addEventListener('change', async e => { await addPhotos(e.target.files || []); e.target.value = ''; }));
  $('ip-form').addEventListener('submit', async e => {
    e.preventDefault();
    const pb = imoPubProblem();
    if (pb) { toast(pb, 'error'); if (/GPS|Localisez|repère/.test(pb)) $('screen-imo-pub').scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (ip.edit) { await saveImoEdit(); return; }
    if (ip.photos[0] && ip.photos[0].thumb && ip.photos[0].thumb.length > 38000) ip.photos[0].thumb = null;
    const n = v => intOf(v);
    const body = {
      role: ip.role, type: ip.type, chambres: n($('ip-ch').value), sdb: n($('ip-sdb').value), cuisine: ip.eq.cuisine, douche_int: ip.eq.douche, meuble: ip.eq.meuble,
      surface: n($('ip-surf').value), etage: n($('ip-etage').value), loyer: n($('ip-loyer').value), avance: n($('ip-avance').value), caution: n($('ip-caution').value),
      frais_visite: n($('ip-visite').value), bail_mois: n($('ip-bail').value), description: $('ip-desc').value.trim(), quartier: ip.zone, adresse: $('ip-adresse').value.trim(), porte: $('ip-porte').value.trim(),
      lat: +ip.pin[0].toFixed(6), lon: +ip.pin[1].toFixed(6), gps_lat: +ip.gps.lat.toFixed(6), gps_lon: +ip.gps.lon.toFixed(6), gps_acc: Math.max(1, Math.round(ip.gps.acc)),
      gps_at: new Date(ip.gps.t).toISOString(), contact_nom: $('ip-nom').value.trim(), tel: phoneDigits($('ip-tel').value), whatsapp: $('ip-wa').checked,
      thumb: ip.photos[0] && ip.photos[0].thumb || null
    };
    ip.sending = true; $('ip-save').classList.add('loading'); checkImoPub();
    try {
      const r = await rpc('annonce_publier', { p: body });
      if (!r.ok || !r.data) { toast(r.net ? 'Pas de connexion internet. Réessayez.' : 'Publication refusée : ' + sbErr(r), 'error', 7000); return; }
      const id = r.data;
      let sent = 0;
      for (let i = 0; i < ip.photos.length; i++) {
        $('ip-why').textContent = `Envoi des photos… ${i + 1}/${ip.photos.length}`;
        const pr = await sb('/rest/v1/rpc/annonce_photo', { method: 'POST', body: { p_secret: mySecret, p_id: id, p_idx: i, p_data: ip.photos[i].data }, timeout: 40000 });
        if (pr.ok) sent++;
      }
      if (body.thumb) imo.thumbs.set(id, body.thumb);
      store.set('imoPubLast', { tel: body.tel, contact_nom: body.contact_nom, role: body.role, whatsapp: body.whatsapp });
      toast(sent === ip.photos.length ? 'Annonce publiée ! Elle est visible par tous pendant 45 jours.' : `Annonce publiée, mais ${ip.photos.length - sent} photo(s) n’ont pas pu être envoyées.`, sent === ip.photos.length ? 'success' : 'error', 7000);
      resetImoPub();
      await fetchImo(true); fetchMine();
      live.dest = { kind: 'imo', id, t: Date.now() }; store.set('liveDest', live.dest);
      show('screen-imo', { force: true });
    } finally { ip.sending = false; $('ip-save').classList.remove('loading'); checkImoPub(); }
  });
  // ---- modifier une annonce : mêmes champs que la publication, position GPS figée
  const imoFields = () => { const n = v => intOf(v); return {
    role: ip.role, type: ip.type, chambres: n($('ip-ch').value), sdb: n($('ip-sdb').value), cuisine: ip.eq.cuisine, douche_int: ip.eq.douche, meuble: ip.eq.meuble,
    surface: n($('ip-surf').value), etage: n($('ip-etage').value), loyer: n($('ip-loyer').value), avance: n($('ip-avance').value), caution: n($('ip-caution').value),
    frais_visite: n($('ip-visite').value), bail_mois: n($('ip-bail').value), description: $('ip-desc').value.trim(), adresse: $('ip-adresse').value.trim(), porte: $('ip-porte').value.trim(),
    contact_nom: $('ip-nom').value.trim(), tel: phoneDigits($('ip-tel').value), whatsapp: $('ip-wa').checked }; };
  async function imoEdit(m) {
    toast('Chargement de l’annonce…', 'info', 2000);
    const r = await rpc('annonce_detail', { p_id: m.id });
    if (!r.ok || !r.data) { toast(r.net ? 'Pas de connexion internet.' : 'Annonce introuvable : ' + sbErr(r), 'error'); return; }
    const a = r.data;
    resetImoPub();
    ip.edit = a; ip.type = a.type; ip.role = a.role; ip.zone = a.quartier; ip.zones = [{ name: a.quartier }];
    ip.eq = { cuisine: a.cuisine !== false, douche: a.douche_int !== false, meuble: !!a.meuble };
    ip.photos = (a.photos || []).map((d, i) => ({ data: d, thumb: i === 0 ? a.thumb || null : null, old: true }));
    ip.photosOrig = ip.photos.length;
    const set = (id, v) => { $(id).value = v == null ? '' : v; };
    set('ip-ch', a.chambres); set('ip-sdb', a.sdb); set('ip-surf', a.surface); set('ip-etage', a.etage); set('ip-loyer', a.loyer ? money(a.loyer) : '');
    set('ip-avance', a.avance); set('ip-caution', a.caution); set('ip-visite', a.frais_visite); set('ip-bail', a.bail_mois); set('ip-desc', a.description);
    set('ip-adresse', a.adresse); set('ip-porte', a.porte); set('ip-nom', a.contact_nom); set('ip-tel', a.tel); $('ip-wa').checked = a.whatsapp !== false;
    renderImoPub(); show('screen-imo-pub');
  }
  async function saveImoEdit() {
    const a = ip.edit, body = imoFields();
    const changedPhotos = ip.photos.length !== ip.photosOrig || ip.photos.some(p => !p.old) || ip.photos.some((p, i) => p.data !== (a.photos || [])[i]);
    ip.sending = true; $('ip-save').classList.add('loading'); checkImoPub();
    try {
      if (changedPhotos && ip.photos[0]) {
        if (!ip.photos[0].thumb || ip.photos[0].thumb.length > 38000) { try { ip.photos[0].thumb = await shrink(await (await fetch(ip.photos[0].data)).blob(), 220, 0.6); } catch (_) { ip.photos[0].thumb = null; } }
        body.thumb = ip.photos[0].thumb || null;
      }
      const r = await rpc('annonce_modifier', { p_id: a.id, p: body });
      if (!r.ok) { toast(r.net ? 'Pas de connexion internet. Réessayez.' : 'Modification refusée : ' + sbErr(r), 'error', 7000); return; }
      let bad = 0;
      if (changedPhotos) {
        for (let i = 0; i < ip.photos.length; i++) {
          if (ip.photos[i].old && ip.photos[i].data === (a.photos || [])[i]) continue; // photo inchangée à cette place
          $('ip-why').textContent = `Envoi des photos… ${i + 1}/${ip.photos.length}`;
          const pr = await sb('/rest/v1/rpc/annonce_photo', { method: 'POST', body: { p_secret: mySecret, p_id: a.id, p_idx: i, p_data: ip.photos[i].data }, timeout: 40000 });
          if (!pr.ok) bad++;
        }
        await rpc('annonce_photos_garder', { p_id: a.id, p_n: ip.photos.length });
        if (body.thumb) imo.thumbs.set(a.id, body.thumb);
        imo.photos.delete(a.id);
      }
      toast(bad ? `Annonce modifiée, mais ${bad} photo(s) n’ont pas pu être envoyées.` : 'Annonce modifiée.', bad ? 'error' : 'success', 6000);
      live.imoKey = '';
      resetImoPub();
      await fetchImo(true); fetchMine();
      show('screen-imo', { force: true });
    } finally { ip.sending = false; $('ip-save').classList.remove('loading'); checkImoPub(); }
  }
  async function imoDelete(m) {
    if (!confirm(`Supprimer définitivement l’annonce « ${IMO_SHORT[m.type] || m.type} · ${m.quartier} » et ses photos ?`)) return;
    const r = await rpc('annonce_statut', { p_id: m.id, p_action: 'retirer' });
    if (!r.ok) { toast(r.net ? 'Pas de connexion internet.' : 'Suppression impossible : ' + sbErr(r), 'error', 6000); return; }
    if (live.dest && live.dest.id === m.id) { live.dest = null; store.set('liveDest', null); }
    toast('Annonce supprimée.', 'success'); live.imoKey = ''; await fetchImo(true); fetchMine();
  }
  function resetImoPub() {
    clearTimeout(ip.timer);
    Object.assign(ip, { st: 'none', gps: null, pin: null, zone: null, zones: [], photos: [], edit: null, photosOrig: 0 });
    $('ip-form').reset();
    const last = store.get('imoPubLast', null);
    if (last) { $('ip-tel').value = last.tel || ''; $('ip-nom').value = last.contact_nom || ''; ip.role = last.role || 'proprietaire'; $('ip-wa').checked = last.whatsapp !== false; }
    ip.eq = { cuisine: true, douche: true, meuble: false };
    $('ip-ch').value = 1; $('ip-sdb').value = 1;
  }

  /* =====================================================================
     CLÉS NUMÉRIQUES — remise au logement, restitution, perte du téléphone, réémission, reprise
     Le serveur vérifie tout (codes à usage unique, présence au logement, une clé par logement) ;
     l'application guide les deux parties.
     ===================================================================== */
  const cle = { list: store.get('cles', []), view: 'liste', give: null, poll: null, ap: null, busy: false };
  if (!Array.isArray(cle.list)) cle.list = [];
  const CLE_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const cleNorm = c => String(c || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  const cleFmt = c => { const n = cleNorm(c); return n.length === 6 ? n.slice(0, 3) + ' ' + n.slice(3) : n; };
  function newSecours() {
    const r = new Uint32Array(12); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(r) : r.forEach((_, i) => { r[i] = Math.random() * 1e9; });
    const c = [...r].map(x => CLE_ABC[x % CLE_ABC.length]).join('');
    return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}`;
  }
  // un seul code de secours par téléphone, pour toutes ses clés (à noter sur papier)
  const mySecours = () => { let c = store.get('cleSecours', null); if (!c) { c = newSecours(); store.set('cleSecours', c); } return c; };
  const dateFr = d => d ? new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const CLE_ST = { en_attente: ['wait', 'remise en cours'], active: ['ok', 'clé active'], restituee: ['', 'restituée'], reprise: ['bad', 'reprise par l’agent'] };
  const cleErr = r => r.net ? 'Pas de connexion internet.' : r.status === 404 ? 'Les clés numériques ne sont pas encore activées sur le serveur.' : sbErr(r);
  const cleRpc = async (fn, body) => { const r = await rpc(fn, body); if (r.ok && r.data && r.data.erreur) return { ok: false, data: { message: r.data.erreur } }; return r; };

  // position fraîche et précise, exigée par le serveur pour toute remise ou restitution
  function cleFix() {
    return new Promise(res => {
      if (state.pos && !state.posStale && !state.manual && Date.now() - (state.gpsT || 0) < 120e3 && (state.accuracy || 999) <= 60) { res({ lat: state.pos[0], lon: state.pos[1], acc: state.accuracy }); return; }
      if (!navigator.geolocation) { res(null); return; }
      navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy || 999 }),
        () => res(state.pos && !state.manual ? { lat: state.pos[0], lon: state.pos[1], acc: state.accuracy || 999 } : null), { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 });
    });
  }
  const gpsBody = f => ({ p_lat: +f.lat.toFixed(6), p_lon: +f.lon.toFixed(6), p_acc: Math.max(1, Math.round(f.acc)) });

  async function fetchCles() {
    if (!sbOn()) return;
    const r = await rpc('mes_cles', {});
    if (r.ok && Array.isArray(r.data)) { cle.list = r.data; store.set('cles', cle.list); renderKeysBtn(); if (current === 'screen-cle' && cle.view === 'liste') renderCle(); }
    return r;
  }
  function renderKeysBtn() {
    const act = cle.list.filter(k => k.statut === 'active');
    const n = $('imo-keys-n'); if (!n) return;
    n.hidden = !act.length; n.textContent = act.length;
    $('imo-keys-sub').textContent = act.length ? `${act.length} clé${act.length > 1 ? 's' : ''} active${act.length > 1 ? 's' : ''}` : 'Recevoir, rendre ou retrouver vos clés';
  }
  function openCles(view) {
    cle.view = view || 'liste'; cle.ap = null;
    show('screen-cle'); renderCle(); fetchCles();
  }
  function cleStop() { clearInterval(cle.poll); cle.poll = null; clearInterval(cle.tick); cle.tick = null; }
  leaveGuards['screen-cle'] = () => { cleStop(); return true; };

  function cleCard(k) {
    const [cls, lbl] = CLE_ST[k.statut] || ['', k.statut];
    const ag = k.role === 'agent';
    const lines = [`${money(k.loyer)} F/mois · avance ${k.avance || 0} mois · caution ${k.caution || 0} mois`];
    if (k.debut) lines.push(`Depuis le ${dateFr(k.debut)}${k.statut === 'active' ? ` · bail jusqu’au ${dateFr(k.fin_prevue)}` : k.fin_at ? ` · jusqu’au ${dateFr(k.fin_at)}` : ''}`);
    lines.push(ag ? (k.client_nom ? `Locataire : ${k.client_nom} · ${k.client_tel}` : 'En attente du locataire') : `${k.agent_nom || 'Agent'} · ${k.agent_tel}`);
    const warn = k.statut === 'active' && k.reprise_demandee_at && !(k.contestee_at && k.contestee_at > k.reprise_demandee_at)
      ? `<p class="cle-warn">${ic('info')}${ag ? 'Reprise demandée le ' + dateFr(k.reprise_demandee_at) + ' : possible après la fin du bail et 30 jours sans contestation.' : 'L’agent a demandé la reprise du logement le ' + dateFr(k.reprise_demandee_at) + '. Si vous y habitez toujours, contestez.'}</p>` : '';
    const code = k.code_but ? `<p class="cle-pending">${ic('key')}Code de ${k.code_but === 'restitution' ? 'restitution' : k.code_but === 'reemission' ? 'réémission' : 'remise'} en cours, valable jusqu’à ${new Date(k.code_exp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>` : '';
    const j = (k.journal || []).slice(0, 6).map(e => `<li><time>${new Date(e.at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time><span>${esc(e.ev)}</span></li>`).join('');
    return `<article class="cle-card ${k.statut}" data-cle="${esc(k.id)}">
      <div class="cle-top"><span class="cle-ic">${ic('key')}</span><span class="cle-h"><small>${ag ? 'Vous avez remis la clé' : 'Votre clé'}</small><b>${esc(IMO_SHORT[k.type] || k.type)} · ${esc(k.quartier)}</b>${k.porte ? `<small>${esc(k.porte)}</small>` : ''}</span><em class="py-tag ${cls}">${esc(lbl)}</em></div>
      ${lines.map(l => `<p class="cle-l">${esc(l)}</p>`).join('')}${warn}${code}
      ${['active', 'en_attente'].includes(k.statut) ? `<button type="button" class="btn primary block sm" data-cle-act="${esc(k.id)}">${ic('more')}Actions</button>` : ''}
      ${j ? `<details class="cle-j"><summary>Historique (${(k.journal || []).length})</summary><ul>${j}</ul></details>` : ''}
    </article>`;
  }
  function renderCle() {
    const b = $('cle-body'); if (!b) return;
    $('cle-title').textContent = { liste: 'Clés numériques', donner: 'Donnez ce code', saisir: 'Saisir un code', secours: 'Nouveau téléphone' }[cle.view] || 'Clés numériques';
    if (cle.view === 'liste') {
      const mine = cle.list.filter(k => k.statut !== 'annulee');
      b.innerHTML = `<details class="cle-how card"${mine.length ? '' : ' open'}><summary><b>${ic('key')} Comment ça marche ?</b></summary>
          <ol><li><b>Au logement</b>, l’agent ou le propriétaire touche « Remettre les clés » sur son annonce : un code s’affiche.</li>
          <li>Le locataire, <b>sur place lui aussi</b>, saisit ce code, vérifie le loyer, l’avance et la caution, puis accepte.</li>
          <li>La clé numérique est remise : l’annonce disparaît et le logement ne peut plus être proposé à quelqu’un d’autre.</li></ol>
          <p class="muted">Ne versez l’avance et la caution qu’au moment de cette remise, au logement.</p></details>
        <div class="cle-btns"><button type="button" class="imo-act main" id="cle-recv">${ic('key')}<span><b>J’ai reçu un code</b><small>Remise ou restitution de clés</small></span></button>
          <button type="button" class="imo-act" id="cle-lost">${ic('phone')}<span><b>Nouveau téléphone</b><small>Retrouver mes clés</small></span></button></div>
        <div class="py-head"><h2>Mes clés</h2><span>${mine.length || ''}</span></div>
        ${mine.length ? mine.map(cleCard).join('') : `<div class="py-empty imo-empty">${ic('key')}<b>Aucune clé pour l’instant</b><span>Les clés que vous recevez ou remettez apparaîtront ici, avec leur historique.</span></div>`}
        ${store.get('cleSecours', null) && mine.some(k => k.role === 'locataire' && k.statut === 'active') ? `<button type="button" class="link cle-sec-show" id="cle-sec-show">${ic('lock')}Afficher mon code de secours</button>` : ''}`;
      return;
    }
    if (cle.view === 'donner') {
      const g = cle.give, left = Math.max(0, Math.round((new Date(g.exp).getTime() - Date.now()) / 1000));
      const who = g.but === 'restitution' ? 'l’agent ou le propriétaire' : 'le locataire';
      b.innerHTML = `<div class="card cle-give">
          <p class="cle-give-k">${g.but === 'restitution' ? 'Restitution des clés' : g.but === 'reemission' ? 'Réémission de la clé' : 'Remise des clés'} · ${esc(g.label || '')}</p>
          <div class="cle-code" aria-label="Code ${esc(g.code.split('').join(' '))}">${esc(cleFmt(g.code))}</div>
          <p class="cle-exp" id="cle-exp">${left ? `Valable encore ${Math.floor(left / 60)} min ${String(left % 60).padStart(2, '0')}` : 'Code expiré'}</p>
          <p>Montrez ce code à <b>${who}</b>, présent avec vous au logement. Il le saisit dans <b>ZUPA › Imo › Clés numériques › J’ai reçu un code</b>.</p>
          <p class="cle-wait" id="cle-wait"><span class="spinner"></span>En attente de la saisie…</p>
          <button type="button" class="btn ghost block" id="cle-cancel">Annuler ce code</button></div>`;
      return;
    }
    if (cle.view === 'saisir') {
      const a = cle.ap;
      if (!a) {
        b.innerHTML = `<form class="card form cle-form" id="cle-code-form" novalidate>
            <label for="cle-code-in">Code à 6 caractères</label>
            <input class="input cle-code-in" id="cle-code-in" maxlength="7" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="K7P 4QX">
            <button class="btn primary block" type="submit" id="cle-code-go">Continuer</button>
            <p class="muted">Le code est affiché sur le téléphone de l’autre personne, au logement. Il est valable 20 minutes et ne sert qu’une fois.</p></form>`;
        setTimeout(() => $('cle-code-in') && $('cle-code-in').focus(), 250);
        return;
      }
      const terms = `<div class="cle-terms"><div><small>Loyer</small><b>${money(a.loyer)} F</b></div><div><small>Avance</small><b>${a.avance || 0} mois</b></div><div><small>Caution</small><b>${a.caution || 0} mois</b></div><div><small>Bail</small><b>${a.bail_mois || 12} mois</b></div></div>`;
      const house = `<p class="cle-house">${ic('home')}<span><b>${esc(IMO_SHORT[a.type] || a.type)} · ${esc(a.quartier)}</b><small>${esc([a.porte, a.adresse].filter(Boolean).join(' · '))}</small></span></p>`;
      if (a.but === 'restitution') {
        b.innerHTML = `<div class="card cle-form">${house}<p>Le locataire <b>${esc(a.client_nom || '')}</b> vous rend les clés de ce logement.</p>
            <p class="cle-warn">${ic('info')}Vérifiez l’état du logement et récupérez les clés physiques avant de confirmer : le logement sera libéré et le locataire n’aura plus de clé.</p>
            <label class="ap-check"><input type="checkbox" id="cle-ok"> J’ai récupéré les clés et vérifié le logement.</label>
            <button class="btn primary block" type="button" id="cle-accept" disabled>Confirmer la restitution</button></div>`;
        return;
      }
      const sec = mySecours(), re = a.but === 'reemission';
      b.innerHTML = `<div class="card cle-form">${house}
          <p class="cle-from">${ic('user')}${a.role === 'agent' ? 'Agent' : 'Propriétaire'} : <b>${esc(a.agent_nom || '—')}</b> · ${esc(a.agent_tel || '')}${a.remises ? ` · ${a.remises} remise${a.remises > 1 ? 's' : ''} réussie${a.remises > 1 ? 's' : ''}` : ''}</p>
          ${re ? `<p>Votre clé va être réémise sur ce téléphone : l’ancien téléphone n’y aura plus accès. Indiquez le numéro donné lors de la remise.</p>` : `<h3>Conditions de location</h3>${terms}<p class="muted">En acceptant, vous confirmez ces conditions. Elles sont enregistrées pour vous deux et ne peuvent plus être modifiées.</p>
          <label for="cle-nom">Votre nom</label><input class="input" id="cle-nom" maxlength="60" autocomplete="name" value="${esc([state.profile.firstname, state.profile.lastname].filter(Boolean).join(' '))}">`}
          <label for="cle-tel">Votre téléphone</label><input class="input" id="cle-tel" type="tel" inputmode="tel" maxlength="20" autocomplete="tel" placeholder="07 00 00 00 00">
          <div class="cle-sec"><small>Votre code de secours (si vous perdez ou changez de téléphone)</small><b>${esc(sec)}</b><span>Notez-le sur papier et gardez-le chez vous. Ne le donnez à personne, pas même à l’agent.</span></div>
          <label class="ap-check"><input type="checkbox" id="cle-ok"> J’ai noté mon code de secours${re ? '' : ' et j’accepte ces conditions'}.</label>
          <button class="btn primary block" type="button" id="cle-accept" disabled>${re ? 'Recevoir ma clé sur ce téléphone' : 'Recevoir la clé'}</button></div>`;
      return;
    }
    if (cle.view === 'secours') {
      const nw = cle.newSec || (cle.newSec = newSecours());
      b.innerHTML = `<form class="card form cle-form" id="cle-sec-form" novalidate>
          <p>Vous avez changé ou perdu votre téléphone ? Saisissez le <b>code de secours</b> noté lors de la remise des clés : vos clés passent sur ce téléphone et l’ancien est désactivé.</p>
          <label for="cle-sec-in">Code de secours</label>
          <input class="input cle-code-in" id="cle-sec-in" maxlength="16" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX">
          <div class="cle-sec"><small>Votre nouveau code de secours</small><b>${esc(nw)}</b><span>L’ancien code ne fonctionnera plus. Notez celui-ci.</span></div>
          <label class="ap-check"><input type="checkbox" id="cle-ok"> J’ai noté mon nouveau code de secours.</label>
          <button class="btn primary block" type="submit" id="cle-accept" disabled>Retrouver mes clés</button>
          <p class="muted">Code de secours perdu aussi ? Retournez au logement avec l’agent : il pourra <b>réémettre la clé</b> sur votre nouveau téléphone, au même numéro.</p></form>`;
    }
  }

  // ---- agent : remettre les clés (annonce) ou réémettre ; locataire : rendre les clés
  async function cleGive(fn, body, label, but) {
    if (cle.busy) return; cle.busy = true;
    toast('Localisation au logement…', 'info', 2500);
    const f = await cleFix();
    if (!f) { cle.busy = false; toast('Activez la localisation : la remise des clés se fait au logement.', 'error', 6000); return; }
    const r = await cleRpc(fn, { ...body, ...gpsBody(f) });
    cle.busy = false;
    if (!r.ok || !r.data || !r.data.code) { toast(cleErr(r), 'error', 7000); return; }
    cle.give = { id: r.data.id, code: r.data.code, exp: r.data.exp, label, but, t0: Date.now() };
    cle.view = 'donner';
    if (current !== 'screen-cle') show('screen-cle');
    renderCle();
    cleStop();
    cle.tick = setInterval(() => {
      const e = $('cle-exp'); if (!e || cle.view !== 'donner') return;
      const left = Math.max(0, Math.round((new Date(cle.give.exp).getTime() - Date.now()) / 1000));
      e.textContent = left ? `Valable encore ${Math.floor(left / 60)} min ${String(left % 60).padStart(2, '0')}` : 'Code expiré : annulez et recommencez.';
      e.classList.toggle('bad', !left);
    }, 1000);
    // on surveille la saisie par l'autre personne
    cle.poll = setInterval(async () => {
      if (cle.view !== 'donner' || document.visibilityState !== 'visible') return;
      const r2 = await rpc('mes_cles', {});
      if (!r2.ok || !Array.isArray(r2.data)) return;
      cle.list = r2.data; store.set('cles', cle.list);
      const k = r2.data.find(x => x.id === cle.give.id);
      const done = but === 'restitution' ? !k || k.statut !== 'active' : !k || !k.code_but;
      if (!done) return;
      cleStop(); vibrate([120, 60, 120]);
      if (k && but === 'remise' && k.statut !== 'active') { toast('Le code a été annulé.', 'info'); cle.view = 'liste'; renderCle(); return; }
      toast(but === 'restitution' ? 'Restitution confirmée par l’agent. Merci !' : but === 'reemission' ? 'Clé réémise sur le nouveau téléphone du locataire.' : `Clés remises à ${k.client_nom}. L’annonce est retirée des propositions.`, 'success', 7000);
      cle.view = 'liste'; renderCle(); renderKeysBtn(); fetchMine(); fetchImo(true);
    }, 4000);
  }
  const cleDonner = m => cleGive('cle_preparer', { p_annonce: m.id }, `${IMO_SHORT[m.type]} · ${m.quartier}`, 'remise');

  function cleMenu(k) {
    const tel = String(k.role === 'agent' ? k.client_tel || '' : k.agent_tel || '');
    const label = `${IMO_SHORT[k.type] || k.type} · ${k.quartier}`;
    const call = tel ? [{ icon: 'phone', label: k.role === 'agent' ? `Appeler ${k.client_nom || 'le locataire'}` : `Appeler ${k.agent_nom || 'l’agent'}`, fn: () => openExternal('tel:' + tel) }] : [];
    const after = async (r, ok) => { if (!r.ok) { toast(cleErr(r), 'error', 7000); return; } toast(ok, 'success', 6000); await fetchCles(); renderCle(); };
    let actions = [];
    if (k.code_but) actions.push({ icon: 'close', label: 'Annuler le code en cours', fn: async () => after(await cleRpc('cle_annuler', { p_cle: k.id }), 'Code annulé.') });
    if (k.statut === 'active' && k.role === 'locataire') {
      actions.push({ icon: 'key', label: 'Rendre les clés', hint: 'Au logement : l’agent saisit le code qui s’affiche. Votre clé prend fin.', fn: () => cleGive('cle_restitution_preparer', { p_cle: k.id }, label, 'restitution') });
      if (k.reprise_demandee_at && !(k.contestee_at && k.contestee_at > k.reprise_demandee_at))
        actions.push({ icon: 'flag', label: 'Contester la reprise', hint: 'J’habite toujours ce logement : la reprise est bloquée', fn: async () => after(await cleRpc('cle_contester', { p_cle: k.id }), 'Reprise contestée : l’agent ne peut plus reprendre le logement sans vous.') });
      actions.push({ icon: 'lock', label: 'Mon code de secours', hint: 'Pour retrouver vos clés sur un nouveau téléphone', fn: showSecours });
    }
    if (k.statut === 'active' && k.role === 'agent') {
      actions.push({ icon: 'key', label: 'Saisir le code de restitution', hint: 'Le locataire vous rend les clés au logement', fn: () => { cle.view = 'saisir'; cle.ap = null; renderCle(); } });
      actions.push({ icon: 'refresh', label: 'Prolonger le bail', hint: `Fin actuelle : ${dateFr(k.fin_prevue)}`, fn: () => cleProlonger(k) });
      actions.push({ icon: 'phone', label: 'Réémettre la clé', hint: 'Le locataire a perdu son téléphone et son code de secours : au logement, au même numéro', fn: () => { if (confirm(`Réémettre la clé de ${k.client_nom} ?\n\nÀ faire au logement, avec le locataire. Il saisira le code sur son nouveau téléphone avec le même numéro (${k.client_tel}). Son ancien téléphone n’aura plus accès à la clé.`)) cleGive('cle_reemettre', { p_cle: k.id }, label, 'reemission'); } });
      const asked = k.reprise_demandee_at && !(k.contestee_at && k.contestee_at > k.reprise_demandee_at);
      actions.push({ icon: 'flag', danger: true, label: asked ? 'Reprendre le logement' : 'Locataire injoignable : demander la reprise', hint: asked ? 'Possible après la fin du bail et 30 jours sans contestation' : 'Le locataire est prévenu et peut contester. Reprise possible après la fin du bail et 30 jours.',
        fn: async () => { if (!asked && !confirm('Demander la reprise du logement ?\n\nÀ n’utiliser que si le locataire a quitté le logement sans rendre les clés. Il est prévenu dans ZUPA et peut contester. La reprise ne sera possible qu’après la fin du bail et 30 jours sans contestation.')) return;
          const r = await cleRpc('cle_reprise', { p_cle: k.id }); if (!r.ok) { toast(cleErr(r), 'error', 7000); return; }
          after(r, r.data && r.data.etat === 'reprise' ? 'Logement repris : vous pouvez le remettre en location.' : `Reprise demandée : possible à partir du ${dateFr(r.data && r.data.effet)} si le locataire ne conteste pas.`); } });
    }
    openActions({ title: label, sub: k.role === 'agent' ? 'Vous avez remis cette clé' : 'Votre clé', actions: [...actions, ...call] });
  }
  function cleProlonger(k) {
    openActions({ title: 'Prolonger le bail', sub: `Fin actuelle : ${dateFr(k.fin_prevue)}`, actions: [6, 12, 24].map(m => ({ icon: 'refresh', label: `${m} mois de plus`,
      fn: async () => { const r = await cleRpc('cle_prolonger', { p_cle: k.id, p_mois: m }); if (!r.ok) { toast(cleErr(r), 'error'); return; } toast(`Bail prolongé jusqu’au ${dateFr(r.data)}.`, 'success'); await fetchCles(); renderCle(); } })) });
  }
  function showSecours() {
    const c = store.get('cleSecours', null);
    if (!c) { toast('Aucun code de secours sur ce téléphone.', 'error'); return; }
    if (!confirm('Afficher votre code de secours ?\n\nAssurez-vous que personne ne regarde votre écran. Ne le donnez à personne, pas même à l’agent.')) return;
    toast(`Code de secours : ${c}`, 'info', 15000);
  }

  $('screen-cle').addEventListener('click', async e => {
    const t = e.target;
    if (t.closest('#cle-recv')) { cle.view = 'saisir'; cle.ap = null; renderCle(); return; }
    if (t.closest('#cle-lost')) { cle.view = 'secours'; cle.newSec = null; renderCle(); return; }
    if (t.closest('#cle-sec-show')) { showSecours(); return; }
    const a = t.closest('[data-cle-act]'); if (a) { const k = cle.list.find(x => x.id === a.dataset.cleAct); if (k) cleMenu(k); return; }
    if (t.closest('#cle-cancel')) { const r = await cleRpc('cle_annuler', { p_cle: cle.give.id }); cleStop(); toast(r.ok ? 'Code annulé.' : cleErr(r), r.ok ? 'info' : 'error'); cle.view = 'liste'; renderCle(); fetchCles(); return; }
    if (t.closest('#cle-accept') && !t.closest('#cle-sec-form')) cleAccept();
  });
  $('screen-cle').addEventListener('change', e => { if (e.target.id === 'cle-ok') $('cle-accept').disabled = !e.target.checked; });
  $('screen-cle').addEventListener('input', e => {
    if (e.target.id === 'cle-code-in') { const v = cleNorm(e.target.value).slice(0, 6); const f = v.length > 3 ? v.slice(0, 3) + ' ' + v.slice(3) : v; if (e.target.value !== f) e.target.value = f; }
  });
  $('screen-cle').addEventListener('submit', async e => {
    e.preventDefault();
    if (e.target.id === 'cle-code-form') {
      const code = cleNorm($('cle-code-in').value);
      if (code.length !== 6) { toast('Le code contient 6 caractères.', 'error'); return; }
      $('cle-code-go').classList.add('loading');
      const r = await cleRpc('cle_apercu', { p_code: code });
      $('cle-code-go') && $('cle-code-go').classList.remove('loading');
      if (!r.ok) { toast(cleErr(r), 'error', 6000); return; }
      cle.ap = { ...r.data, code }; renderCle();
    } else if (e.target.id === 'cle-sec-form') {
      if (!$('cle-ok').checked) return;
      const old = $('cle-sec-in').value;
      if (cleNorm(old).length < 12) { toast('Le code de secours contient 12 caractères.', 'error'); return; }
      const r = await rpc('cle_secours', { p_recup: old, p_new_recup: cle.newSec });
      if (!r.ok) { toast(cleErr(r), 'error', 6000); return; }
      if (!r.data) { toast('Code de secours inconnu. Vérifiez-le : il ne contient jamais les caractères O, I, L, 0 ou 1.', 'error', 7000); return; }
      store.set('cleSecours', cle.newSec);
      toast(`${r.data} clé${r.data > 1 ? 's' : ''} retrouvée${r.data > 1 ? 's' : ''} sur ce téléphone. L’ancien téléphone est désactivé.`, 'success', 7000);
      cle.view = 'liste'; await fetchCles(); renderCle();
    }
  });
  async function cleAccept() {
    const a = cle.ap; if (!a || cle.busy) return;
    const tel = a.but === 'restitution' ? null : phoneDigits($('cle-tel').value);
    if (a.but !== 'restitution' && !/^\d{10}$/.test(tel || '')) { toast('Numéro de téléphone : 10 chiffres.', 'error'); return; }
    if (a.but === 'remise' && $('cle-nom').value.trim().length < 2) { toast('Indiquez votre nom.', 'error'); return; }
    cle.busy = true; $('cle-accept').classList.add('loading');
    const f = await cleFix();
    if (!f) { cle.busy = false; $('cle-accept').classList.remove('loading'); toast('Activez la localisation : la remise se fait au logement.', 'error', 6000); return; }
    const r = await cleRpc('cle_valider', { p_code: a.code, ...gpsBody(f), p_nom: a.but === 'remise' ? $('cle-nom').value.trim() : null, p_tel: tel, p_recup: a.but === 'restitution' ? null : mySecours() });
    cle.busy = false; $('cle-accept') && $('cle-accept').classList.remove('loading');
    if (!r.ok) { toast(cleErr(r), 'error', 7000); return; }
    vibrate([150, 80, 150]);
    toast(a.but === 'restitution' ? 'Restitution confirmée : le logement est libéré. Vous pouvez le remettre en location depuis « Mes annonces ».' : a.but === 'reemission' ? 'Votre clé est maintenant sur ce téléphone.' : 'Clé reçue ! Elle est enregistrée dans « Mes clés », avec les conditions acceptées.', 'success', 8000);
    cle.ap = null; cle.view = 'liste'; await fetchCles(); renderCle(); fetchMine();
  }
  $('cle-back').onclick = () => { if (cle.view !== 'liste') { cleStop(); cle.view = 'liste'; cle.ap = null; renderCle(); fetchCles(); } else goBack(); };
  $('imo-keys').onclick = () => openCles();
  renderKeysBtn();
  setTimeout(() => fetchCles(), 7000);

  resetImoPub();
  setTimeout(() => fetchImo(false), 6000);

  /* =====================================================================
     ACCUEIL « GO ! » : ciel, météo et publicités de la bulle
     ===================================================================== */
  /* Ciel vivant : couleurs calculées d'après la hauteur réelle du soleil (aube, journée, couchant, nuit),
     nuages selon la couverture nuageuse mesurée, pluie SEULEMENT s'il tombe vraiment de l'eau
     (précipitations mesurées > 0), orage avec éclairs, brume. Transitions douces, animations sur le GPU. */
  var wx = { d: store.get('wx2', null), busy: false }; // var : lisible avant cette ligne (rendu précoce)
  // palettes du ciel selon la hauteur du soleil (degrés) : haut, milieu, bas
  const SKY = [
    [-18, ['#02040d', '#071230', '#13275e']],
    [-12, ['#050a22', '#121a45', '#2b2f6b']],
    [-7, ['#0f1748', '#3a2f6e', '#8c4f7d']],
    [-4, ['#1d2463', '#5b3a7a', '#c0657a']],
    [0, ['#2b3f8f', '#c86a7c', '#f6a35e']],
    [5, ['#2c64b8', '#7aa9de', '#f3cd92']],
    [14, ['#0d5fc4', '#3b93e3', '#9ad0f6']],
    [40, ['#0757bd', '#2a8be0', '#86c8f5']]
  ];
  const hex = c => [1, 3, 5].map(k => parseInt(c.slice(k, k + 2), 16));
  const mixRGB = (a, b, t) => a.map((v, k) => Math.round(v + (b[k] - v) * t));
  const rgbS = a => `rgb(${a.join(',')})`;
  // hauteur du soleil (approximation astronomique, suffisante à ±1°)
  function sunElev(date, lat, lon) {
    const d0 = Date.UTC(date.getUTCFullYear(), 0, 0), N = (date - d0) / 864e5;
    const g = 2 * Math.PI / 365 * (N - 1 + (date.getUTCHours() - 12) / 24);
    const eqt = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g);
    const tst = date.getUTCHours() * 60 + date.getUTCMinutes() + eqt + 4 * lon;
    const ha = (tst / 4 - 180) * Math.PI / 180, la = lat * Math.PI / 180;
    return Math.asin(Math.sin(la) * Math.sin(decl) + Math.cos(la) * Math.cos(decl) * Math.cos(ha)) * 180 / Math.PI;
  }
  // ce que montre le ciel : on se fie aux mesures (pluie, nuages), pas seulement au code « temps »
  function wxNow() {
    const d = wx.d;
    if (!d) return { code: 1, cover: 25, rain: 0, storm: false, fog: false };
    const rain = Math.max(d.precip || 0, (d.rain || 0) + (d.showers || 0));
    const storm = d.code >= 95 && rain > 0;
    const raining = rain >= 0.1 && (d.code >= 51 || rain >= 0.3);
    // code « pluie » sans pluie mesurée : c'est seulement nuageux
    const code = raining ? (storm ? 95 : d.code >= 51 ? d.code : 61) : d.code >= 51 ? (d.cover >= 80 ? 3 : 2) : d.code;
    return { code, cover: d.cover != null ? d.cover : code >= 3 ? 90 : code >= 1 ? 40 : 5, rain: raining ? rain : 0, storm, fog: d.code === 45 || d.code === 48 };
  }
  // nuages : trois couches à vitesses différentes (parallaxe), dessinées une fois
  function cloudSVG(w, seed) {
    let r = seed; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    const n = 4 + Math.floor(rnd() * 3), parts = [];
    for (let k = 0; k < n; k++) { const cx = 20 + k * (60 / n) + rnd() * 8, cy = 30 - Math.sin(k / (n - 1) * Math.PI) * (10 + rnd() * 8), rr = 12 + rnd() * 9; parts.push(`<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rr.toFixed(1)}"/>`); }
    parts.push('<rect x="12" y="30" width="76" height="14" rx="7"/>');
    return `<svg class="sky-cl" viewBox="0 0 100 46" style="width:${w}px" aria-hidden="true"><g fill="url(#skycg)">${parts.join('')}</g></svg>`;
  }
  function skyBuild() {
    const el = $('home-sky'); if (!el || el.dataset.built) return;
    el.dataset.built = '1';
    let html = '<svg width="0" height="0" style="position:absolute"><defs><linearGradient id="skycg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--cl-top)"/><stop offset="1" stop-color="var(--cl-bot)"/></linearGradient></defs></svg>';
    html += '<i class="sky-milky"></i><canvas class="sky-starfield" id="sky-stars-cv"></canvas><i class="sky-rays" id="sky-rays"></i><i class="sky-glow" id="sky-glow"></i><i class="sky-sun" id="sky-sun"></i>';
    [[3, 150, 11], [4, 115, 23], [5, 85, 37]].forEach(([n, w, seed], L) => {
      let row = '';
      for (let k = 0; k < n; k++) row += `<span style="left:${(k / n * 100 + (seed * 7 + k * 13) % 17).toFixed(1)}%;top:${(18 + L * 26 + ((seed + k * 29) % 22)).toFixed(0)}%">${cloudSVG(w * (0.75 + ((seed + k * 7) % 10) / 20), seed + k)}</span>`;
      html += `<div class="sky-layer l${L + 1}"><div>${row}</div><div aria-hidden="true">${row}</div></div>`;
    });
    html += '<i class="sky-haze"></i><canvas class="sky-drops" id="sky-drops"></canvas><i class="sky-flash" id="sky-flash"></i>';
    el.innerHTML = html;
  }
  function skyPaint() {
    const el = $('home-sky'); if (!el || !wx) return;
    skyBuild();
    const now = new Date(), w = wxNow();
    const lat = state.pos ? state.pos[0] : 5.33, lon = state.pos ? state.pos[1] : -4.03;
    const e = sunElev(now, lat, lon);
    let k = SKY.findIndex(([a]) => a >= e); if (k <= 0) k = k === 0 ? 1 : SKY.length - 1;
    const [ea, pa] = SKY[k - 1], [eb, pb] = SKY[k], t = Math.max(0, Math.min(1, (e - ea) / (eb - ea)));
    let cols = pa.map((c, i) => mixRGB(hex(c), hex(pb[i]), t));
    // ciel couvert ou pluvieux : les couleurs se ternissent vers le gris (de jour comme de nuit)
    const grey = Math.min(0.75, Math.max(0, (w.cover - 45) / 55) * 0.6 + (w.rain ? 0.25 : 0) + (w.fog ? 0.25 : 0));
    if (grey > 0) { const night = e < -4; const G = night ? [[22, 26, 34], [36, 42, 54], [58, 66, 80]] : [[92, 108, 128], [130, 146, 164], [176, 189, 203]]; cols = cols.map((c, i) => mixRGB(c, G[i], grey)); }
    if (isDark()) cols = cols.map(c => c.map(v => Math.round(v * 0.78)));
    cols.forEach((c, i) => el.style.setProperty(`--s${i + 1}`, rgbS(c)));
    // soleil / lune : se lève à gauche, se couche à droite ; lueur chaude près de l'horizon
    const day = e > -3, sun = $('sky-sun'), glow = $('sky-glow');
    const hrs = (now.getUTCHours() + now.getUTCMinutes() / 60 + lon / 15 + 24) % 24; // heure solaire
    const f = day ? Math.max(0, Math.min(1, (hrs - 6) / 12)) : ((hrs + 6) % 24) / 12; // 0 = lever, 1 = coucher
    const x = 8 + f * 84, y = 62 - Math.sin(Math.max(0, Math.min(1, f)) * Math.PI) * 50;
    const first = !sun.dataset.p; if (first) sun.style.transition = 'none'; // premier placement : sans glisser depuis le coin
    sun.style.transform = `translate3d(${(el.clientWidth * x / 100).toFixed(0)}px, ${(el.clientHeight * 0.8 * y / 100).toFixed(0)}px, 0)`;
    el.style.setProperty('--sunpos', sun.style.transform);
    if (first && el.clientWidth) { void sun.offsetWidth; sun.dataset.p = '1'; sun.style.transition = ''; }
    sun.classList.toggle('moon', !day);
    sun.style.opacity = (Math.max(0, 1 - w.cover / 95) * (day ? 1 : 0.85)).toFixed(2);
    // aube (vers 5 h – 6 h 30) et crépuscule (vers 18 h – 19 h) : lueur rose-orangée à l'horizon, côté soleil
    const morning = hrs < 12;
    glow.style.setProperty('--gx', (e < 2 ? (morning ? 12 : 88) : x).toFixed(1) + '%');
    glow.style.opacity = (e > -13 && e < 12 ? Math.max(0, 1 - Math.abs(e + 1.5) / 11) * (1 - grey * 0.8) : 0).toFixed(2);
    glow.classList.toggle('dawn', morning);
    // étoiles : elles apparaissent à partir de 19 h (pleines vers 19 h 40) et s'effacent à l'aube (4 h 45 → 5 h 30)
    const lh = now.getHours() + now.getMinutes() / 60;
    const nightK = lh >= 19 ? Math.min(1, (lh - 19) / 0.67) : lh < 4.75 ? 1 : lh < 5.5 ? 1 - (lh - 4.75) / 0.75 : 0;
    const starsK = nightK * Math.max(0, 1 - w.cover / 90) * (w.rain ? 0.3 : 1);
    el.style.setProperty('--stars', starsK.toFixed(2));
    el.style.setProperty('--milky', (nightK * (lh >= 20.5 || lh < 4 ? 1 : 0.4) * Math.max(0, 1 - w.cover / 60)).toFixed(2));
    starsSet(starsK);
    // journée dégagée : halo et rayons du soleil, très doux
    el.style.setProperty('--rays', (e > 6 ? Math.max(0, 1 - w.cover / 70) * Math.min(1, (e - 6) / 10) : 0).toFixed(2));
    el.dataset.phase = nightK > 0.5 ? 'nuit' : e < -0.8 ? (morning ? 'aube' : 'crepuscule') : e < 8 ? (morning ? 'lever' : 'couchant') : 'jour';
    // nuages : quantité et teinte selon la couverture mesurée
    const cov = w.cover / 100;
    el.style.setProperty('--c1', Math.min(1, cov * 1.6).toFixed(2));
    el.style.setProperty('--c2', Math.max(0, Math.min(1, (cov - 0.25) * 1.6)).toFixed(2));
    el.style.setProperty('--c3', Math.max(0, Math.min(1, (cov - 0.55) * 2.2)).toFixed(2));
    const lit = e < -4 ? [[70, 78, 96], [46, 52, 66]] : e < 4 ? [[255, 214, 196], [196, 150, 160]] : [[255, 255, 255], [220, 229, 240]];
    const dim = grey * 0.55;
    const ct = mixRGB(lit[0], [150, 158, 170], dim), cb = mixRGB(lit[1], [112, 120, 134], dim);
    el.style.setProperty('--cl-top', rgbS(ct)); el.style.setProperty('--cl-bot', rgbS(cb));
    el.style.setProperty('--haze', w.fog ? '0.55' : w.rain ? '0.22' : '0');
    el.classList.toggle('thunder', w.storm);
    if (wx.d && wx.day !== undefined && wx.day !== (e > -0.8)) renderWx(); // lever / coucher du soleil : l'icône change aussi
    rainSet(w.rain);
    syncBars();
  }
  // ciel étoilé : étoiles qui scintillent (couleurs et éclats variés) et étoiles filantes de temps en temps
  const starFx = { k: 0, list: null, raf: 0, last: 0, shoot: null, nextShoot: 0 };
  function starsSet(k) {
    starFx.k = k;
    if (k <= 0.02) { cancelAnimationFrame(starFx.raf); starFx.raf = 0; const cv = $('sky-stars-cv'); if (cv) cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); return; }
    if (!starFx.raf) starFx.raf = requestAnimationFrame(starsTick);
  }
  function starsTick(ts) {
    starFx.raf = 0;
    const cv = $('sky-stars-cv'); if (!cv || starFx.k <= 0.02) return;
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (current !== 'screen-home' || document.visibilityState !== 'visible') { setTimeout(() => { if (starFx.k > 0.02 && !starFx.raf) starFx.raf = requestAnimationFrame(starsTick); }, 1000); return; }
    if (ts - starFx.last < 66 && starFx.list) { starFx.raf = requestAnimationFrame(starsTick); return; } // ~15 images/s : léger pour la batterie
    starFx.last = ts;
    const W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (!W || !H) { setTimeout(() => { if (!starFx.raf) starFx.raf = requestAnimationFrame(starsTick); }, 800); return; }
    if (cv.width !== Math.round(W * dpr) || !starFx.list) {
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      let r = 7; const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
      const n = Math.round(Math.min(220, W * H / 850));
      starFx.list = Array.from({ length: n }, () => { const big = rnd() > 0.9; return { x: rnd(), y: Math.pow(rnd(), 1.25), r: big ? 1.4 + rnd() * 0.9 : 0.6 + rnd() * 0.8, a: 0.5 + rnd() * 0.5, sp: 0.6 + rnd() * 2.2, ph: rnd() * 6.28, c: rnd() > 0.82 ? (rnd() > 0.5 ? '255,226,196' : '200,220,255') : '255,255,255', big }; });
    }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const t = ts / 1000;
    for (const s of starFx.list) {
      const tw = reduce ? 1 : 0.55 + 0.45 * Math.sin(t * s.sp + s.ph);
      const a = s.a * tw * Math.max(0.25, 1 - s.y * 0.5); // plus pâles vers l'horizon
      ctx.fillStyle = `rgba(${s.c},${a.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(s.x * W, s.y * H, s.r, 0, 6.283); ctx.fill();
      if (s.big && tw > 0.85) { ctx.strokeStyle = `rgba(${s.c},${(a * 0.35).toFixed(3)})`; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(s.x * W - s.r * 3, s.y * H); ctx.lineTo(s.x * W + s.r * 3, s.y * H); ctx.moveTo(s.x * W, s.y * H - s.r * 3); ctx.lineTo(s.x * W, s.y * H + s.r * 3); ctx.stroke(); }
    }
    // étoile filante : une toutes les 15 à 40 secondes en pleine nuit
    if (!reduce && starFx.k > 0.6) {
      if (!starFx.shoot && t > starFx.nextShoot) { starFx.shoot = { x: 0.15 + Math.random() * 0.7, y: 0.05 + Math.random() * 0.3, t0: t, ang: 0.35 + Math.random() * 0.4 }; starFx.nextShoot = t + 15 + Math.random() * 25; }
      const sh = starFx.shoot;
      if (sh) {
        const p = (t - sh.t0) / 0.9;
        if (p >= 1) starFx.shoot = null;
        else {
          const len = 90, x = sh.x * W + p * 160 * Math.cos(sh.ang), y = sh.y * H + p * 160 * Math.sin(sh.ang);
          const g = ctx.createLinearGradient(x, y, x - len * Math.cos(sh.ang), y - len * Math.sin(sh.ang));
          g.addColorStop(0, `rgba(255,255,255,${(0.9 * (1 - p)).toFixed(2)})`); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - len * Math.cos(sh.ang), y - len * Math.sin(sh.ang)); ctx.stroke();
        }
      }
    } else if (!starFx.nextShoot) starFx.nextShoot = t + 8;
    starFx.raf = requestAnimationFrame(starsTick);
  }
  // pluie : gouttes dessinées sur un canevas, densité selon l'intensité mesurée (mm), arrêt hors de l'écran Go
  const rainFx = { mm: 0, drops: [], raf: 0, last: 0 };
  function rainSet(mm) {
    rainFx.mm = mm;
    if (!mm) { cancelAnimationFrame(rainFx.raf); rainFx.raf = 0; const cv = $('sky-drops'); if (cv) cv.getContext('2d').clearRect(0, 0, cv.width, cv.height); return; }
    if (!rainFx.raf && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) rainFx.raf = requestAnimationFrame(rainTick);
  }
  function rainTick(ts) {
    rainFx.raf = 0;
    const cv = $('sky-drops'); if (!cv || !rainFx.mm) return;
    if (current !== 'screen-home' || document.visibilityState !== 'visible') { setTimeout(() => { if (rainFx.mm && !rainFx.raf) rainFx.raf = requestAnimationFrame(rainTick); }, 800); return; }
    const W = cv.clientWidth, H = cv.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    const ctx = cv.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const dt = Math.min(50, ts - (rainFx.last || ts)) / 1000; rainFx.last = ts;
    const target = Math.round(Math.min(260, 40 + rainFx.mm * 60));
    while (rainFx.drops.length < target) rainFx.drops.push({ x: Math.random() * W * 1.2, y: Math.random() * -H, v: 520 + Math.random() * 380, l: 10 + Math.random() * 14, a: 0.18 + Math.random() * 0.32 });
    if (rainFx.drops.length > target) rainFx.drops.length = target;
    ctx.clearRect(0, 0, W, H); ctx.lineCap = 'round'; ctx.lineWidth = 1.1;
    for (const d of rainFx.drops) {
      d.y += d.v * dt; d.x -= d.v * dt * 0.18;
      if (d.y > H + 20 || d.x < -20) { d.y = -20 - Math.random() * 80; d.x = Math.random() * W * 1.2; }
      ctx.strokeStyle = `rgba(220,232,245,${d.a})`;
      ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.l * 0.18, d.y - d.l); ctx.stroke();
    }
    rainFx.raf = requestAnimationFrame(rainTick);
  }
  // éclairs occasionnels pendant un orage
  setInterval(() => { const el = $('home-sky'); if (el && el.classList.contains('thunder') && current === 'screen-home' && Math.random() < 0.35) { const f = $('sky-flash'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go'); } }, 4000);

  // icônes météo animées (d'après ce qui est réellement observé)
  function wxIcon(code, day) {
    const sun = '<g class="wx-sun"><circle cx="13" cy="13" r="5.5"/><g class="wx-rays">' + [0, 45, 90, 135, 180, 225, 270, 315].map(a => `<rect x="12.2" y="2" width="1.6" height="3.4" rx=".8" transform="rotate(${a} 13 13)"/>`).join('') + '</g></g>';
    const moon = '<path class="wx-moon" d="M16 5.5a7.5 7.5 0 1 0 5.6 11.6A6 6 0 0 1 16 5.5z"/>';
    const cloud = (cls = '') => `<path class="wx-cloud ${cls}" d="M10 29h17a6 6 0 0 0 .6-12A8 8 0 0 0 12.4 15 7 7 0 0 0 10 29z"/>`;
    const drops = '<g class="wx-drops"><path d="M13 31l-1.5 4M19 31l-1.5 4M25 31l-1.5 4"/></g>';
    const bolt = '<path class="wx-bolt" d="M20 27l-4 6h3l-2 5 6-7h-3l2-4z"/>';
    let inner;
    if (code === 0) inner = day ? '<g transform="translate(5 4)">' + sun + '</g>' : '<g transform="translate(4 4)">' + moon + '</g>';
    else if (code <= 2) inner = (day ? sun : '<g transform="translate(-2 -1)">' + moon + '</g>') + cloud('front');
    else if (code <= 48) inner = cloud('back') + cloud('front');
    else if (code < 95) inner = cloud('front') + drops;
    else inner = cloud('front dark') + bolt;
    return `<svg viewBox="0 0 40 40" aria-hidden="true">${inner}</svg>`;
  }
  // jour ou nuit d'après la hauteur réelle du soleil ici et maintenant (pas d'après un relevé qui peut dater)
  function wxDay() { const lat = state.pos ? state.pos[0] : 5.33, lon = state.pos ? state.pos[1] : -4.03; return sunElev(new Date(), lat, lon) > -0.8; }
  const WX_TXT = c => c === 0 ? 'Ciel dégagé' : c === 1 ? 'Peu nuageux' : c === 2 ? 'Partiellement nuageux' : c === 3 ? 'Couvert' : c <= 48 ? 'Brouillard' : c <= 57 ? 'Bruine' : c <= 67 ? 'Pluie' : c <= 82 ? 'Averses' : 'Orage';
  function renderWx() {
    const b = $('wx'); if (!b) return;
    if (!wx.d) { b.hidden = true; return; }
    const w = wxNow();
    b.hidden = false;
    wx.day = wxDay();
    $('wx-ic').innerHTML = wxIcon(w.code, wx.day);
    $('wx-t').textContent = `${Math.round(wx.d.temp)} °C`;
    b.setAttribute('aria-label', `Météo : ${WX_TXT(w.code)}, ${Math.round(wx.d.temp)} degrés`);
    b.title = WX_TXT(w.code);
    skyPaint();
  }
  async function wxMaybe() {
    if (wx.busy || !state.pos || !navigator.onLine) return;
    const d = wx.d, moved = d ? Core.haversine(d.lat, d.lon, state.pos[0], state.pos[1]) : 99;
    if (d && Date.now() - d.t < 10 * 60e3 && moved < 3) return;
    wx.busy = true;
    try {
      const [la, lo] = [state.pos[0].toFixed(2), state.pos[1].toFixed(2)]; // position arrondie (≈ 1 km) : rien de précis ne sort du téléphone
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day,cloud_cover,precipitation,rain,showers&minutely_15=precipitation&forecast_minutely_15=4&timezone=auto`);
      const j = await r.json(), c = j && j.current;
      if (c && typeof c.temperature_2m === 'number') {
        // pluie dans le quart d'heure en cours (plus fiable que le relevé horaire)
        const m15 = j.minutely_15 && Array.isArray(j.minutely_15.precipitation) ? +j.minutely_15.precipitation[0] || 0 : null;
        wx.d = { t: Date.now(), lat: +la, lon: +lo, temp: c.temperature_2m, feel: c.apparent_temperature, hum: c.relative_humidity_2m, wind: c.wind_speed_10m, code: c.weather_code | 0, isDay: c.is_day, cover: c.cloud_cover,
          precip: m15 != null ? Math.max(m15, c.precipitation || 0) : c.precipitation || 0, rain: c.rain || 0, showers: c.showers || 0, obs: c.time || '' };
        store.set('wx2', wx.d); renderWx();
      }
    } catch (e) { /* hors ligne : on garde la dernière météo */ }
    wx.busy = false;
  }
  $('wx').onclick = () => { if (!wx.d) return; const w = wxNow(); const dd = wx.d, f1 = v => String(Math.round(v));
    toast(`${WX_TXT(w.code)} · ${f1(dd.temp)} °C${dd.feel != null ? ` (ressenti ${f1(dd.feel)} °C)` : ''}${dd.hum != null ? ` · humidité ${f1(dd.hum)} %` : ''}${dd.wind != null ? ` · vent ${f1(dd.wind)} km/h` : ''}${dd.cover != null ? ` · nuages ${f1(dd.cover)} %` : ''}${w.rain ? ` · ${w.rain.toFixed(1).replace('.', ',')} mm` : ''} · relevé ${fmtAgo(dd.t)}`, 'info', 6000); };
  renderWx(); skyPaint();
  setInterval(() => { skyPaint(); wxMaybe(); }, 60e3); // le ciel suit le soleil minute par minute
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { skyPaint(); wxMaybe(); } });

  // Publicités de la bulle : EXEMPLES FICTIFS (marques inventées) en attendant la régie publicitaire.
  // Chaque offre est placée à quelques mètres de l'arrêt le plus proche pour montrer le rendu « près de vous ».
  var DEMO_ADS = [
    { id: 'paint', brand: 'Zolikolor', dx: 4, dy: 3, cls: 'zad-paint', cat: 'shop',
      html: `<div class="zad-art"><svg viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="60" cy="104" rx="42" ry="8" fill="rgba(0,0,0,.18)"/><path d="M22 34h76l-7 66a8 8 0 0 1-8 7H37a8 8 0 0 1-8-7z" fill="#fff"/><path d="M26 52h68l-4 40H30z" fill="#ffd400"/><ellipse cx="60" cy="34" rx="38" ry="9" fill="#222"/><ellipse cx="60" cy="32" rx="34" ry="6" fill="#e11d48"/><path d="M40 70c6-10 14-14 20-9s14 2 20-6" stroke="#e11d48" stroke-width="7" fill="none" stroke-linecap="round"/><text x="60" y="88" text-anchor="middle" font-size="11" font-weight="900" fill="#1f2937">ZOLIKOLOR</text></svg></div>
        <div class="zad-txt"><b class="zad-big">BIG</b><b class="zad-red">PROMO</b><b class="zad-pct">-35%</b><small>sur vos pots de peinture</small><span class="zad-cta">Savoir plus ›</span></div>` },
    { id: 'garba', brand: 'Chez Tantie Zouzou', dx: -25, dy: 18, cls: 'zad-garba', cat: 'maquis',
      html: `<div class="zad-txt"><small class="zad-kick">Garba du midi</small><b class="zad-big">Garba + alloco</b><b class="zad-price">1 000 F</b><small>Thon frais · piment à volonté · prêt en 5 min</small><span class="zad-cta">Je passe commande ›</span></div>
        <div class="zad-art"><svg viewBox="0 0 120 120" aria-hidden="true"><ellipse cx="60" cy="74" rx="50" ry="22" fill="#fff"/><ellipse cx="60" cy="70" rx="44" ry="17" fill="#fde68a"/>${[[38,66],[48,62],[58,70],[70,64],[80,70],[46,74],[66,76]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="3" fill="#f5f5dc" stroke="#e5d9a8"/>`).join('')}<path d="M70 58c8-6 20-6 26 2-8 4-18 4-26-2z" fill="#9ca3af"/><rect x="28" y="58" width="14" height="7" rx="3" fill="#f59e0b" transform="rotate(-20 35 61)"/><rect x="82" y="72" width="14" height="7" rx="3" fill="#f59e0b" transform="rotate(15 89 75)"/><circle cx="54" cy="58" r="3.5" fill="#dc2626"/></svg></div>` },
    { id: 'data', brand: 'Lagunet (exemple)', dx: 40, dy: -30, cls: 'zad-data', cat: 'shop',
      html: `<div class="zad-txt"><small class="zad-kick">Pass internet</small><b class="zad-big zad-go">5 Go</b><b class="zad-price">1 000 F · 7 jours</b><small>Activez avec le code *000#</small><span class="zad-cta">J'active ›</span></div>
        <div class="zad-art"><svg viewBox="0 0 120 120" aria-hidden="true"><rect x="38" y="14" width="44" height="88" rx="9" fill="#111827"/><rect x="42" y="22" width="36" height="70" rx="4" fill="#a78bfa"/><g fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"><path d="M46 52a20 20 0 0 1 28 0"/><path d="M51 59a12 12 0 0 1 18 0"/></g><circle cx="60" cy="67" r="4" fill="#fff"/><circle cx="96" cy="30" r="10" fill="#fde047"/><text x="96" y="34" text-anchor="middle" font-size="10" font-weight="900" fill="#4c1d95">+</text></svg></div>` },
    { id: 'pressing', brand: 'Pressing Linge d\'Or', dx: -12, dy: -45, cls: 'zad-press', cat: 'shop',
      html: `<div class="zad-art"><svg viewBox="0 0 120 120" aria-hidden="true"><path d="M30 34l18-12h24l18 12-8 14-8-4v52H46V44l-8 4z" fill="#fff"/><path d="M48 22c3 8 21 8 24 0" fill="none" stroke="#93c5fd" stroke-width="3"/>${[[24,84],[96,40],[100,90]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="7" fill="none" stroke="#bfdbfe" stroke-width="2.5"/>`).join('')}</svg></div>
        <div class="zad-txt"><small class="zad-kick">Le lundi seulement</small><b class="zad-pct">-20%</b><b class="zad-big">sur tout le linge</b><small>Repassage inclus · prêt en 24 h</small><span class="zad-cta">Voir l'adresse ›</span></div>` }
  ];
  /* =====================================================================
     RÉGIE — panneaux publicitaires virtuels
     À moins de rayon_m d'un point de vente : uniquement ses pubs (l'exclusivité passe avant tout).
     Ailleurs : campagnes « toute la ville » et celles proches (3 km), au plus 3 vues par jour et par campagne.
     Aucune position n'est envoyée : les campagnes actives sont téléchargées, le choix se fait sur le téléphone.
     ===================================================================== */
  var regie = { data: store.get('regie', { t: 0, rows: [] }), ctr: store.get('pubCtr', {}), seen: store.get('pubSeen', {}), day: store.get('pubDay', { d: '', v: {}, p: {} }), busy: false };
  const todayStr = () => new Date().toISOString().slice(0, 10);
  var CAMP_COL = { jaune: ['#ffe500', '#ffd000', '#111', '#e10e1e'], orange: ['#fb923c', '#c2410c', '#fff', '#fde047'], rouge: ['#ef4444', '#991b1b', '#fff', '#fde047'],
    vert: ['#22c55e', '#166534', '#fff', '#fde047'], bleu: ['#38bdf8', '#075985', '#fff', '#fde68a'], violet: ['#a855f7', '#4c1d95', '#fff', '#fde047'], noir: ['#262626', '#0a0a0a', '#fff', '#ffd000'] };
  var CAMP_CAT_IC = { resto: 'resto', maquis: 'bar', shop: 'shop', supermarche: 'cart', marche: 'market', hotel: 'hotel', station: 'fuel', pharma: 'cross', sante: 'clinic', service: 'star', autre: 'explore' };
  var CTA_TXT = { appel: 'Appeler', whatsapp: 'WhatsApp', itineraire: 'J’y vais' };
  // dessin d'une campagne à partir de son modèle (le même rendu sert à l'aperçu de l'espace commercial)
  function campHtml(c, tag) {
    const [c1, c2, ink, acc] = CAMP_COL[c.couleur] || CAMP_COL.jaune;
    if (c.modele === 'visuel') return `<div class="zad cz cz-visuel" style="--z1:${c1};--z2:${c2}"><span class="zad-tag">${tag || 'Publicité'}</span>${c.image ? `<img class="cz-full" src="${c.image}" alt="">` : '<span class="cz-empty">Votre visuel</span>'}</div>`;
    const art = c.image ? `<div class="cz-art photo"><img src="${c.image}" alt=""></div>` : `<div class="cz-art">${ic(CAMP_CAT_IC[c.cat] || 'explore')}</div>`;
    const txt = `<div class="cz-txt">${c.modele === 'service' ? `<small class="cz-kick">${esc(c.commerce)}</small>` : ''}<b class="cz-t">${esc(c.titre || 'Votre titre')}</b>${c.accroche ? `<b class="cz-acc">${esc(c.accroche)}</b>` : ''}${c.sous_titre ? `<small class="cz-sub">${esc(c.sous_titre)}</small>` : ''}<span class="cz-cta">${CTA_TXT[c.cta] || 'Appeler'} ›</span></div>`;
    return `<div class="zad cz cz-${c.modele || 'promo'}" style="--z1:${c1};--z2:${c2};--zi:${ink};--za:${acc}"><span class="zad-tag">${tag || 'Publicité'}</span>${c.modele === 'produit' ? art + txt : c.modele === 'resto' ? txt + art : art + txt}</div>`;
  }
  async function fetchRegie(force) {
    if (!sbOn() || regie.busy || (!force && Date.now() - regie.data.t < 30 * 60e3)) return;
    regie.busy = true;
    const r = await sb('/rest/v1/campagnes?select=id,commerce,cat,tel,whatsapp,lat,lon,rayon_m,exclusif,formule,debut,fin,modele,titre,sous_titre,accroche,cta,couleur,image&limit=400', { timeout: 20000 });
    regie.busy = false;
    if (r.ok && Array.isArray(r.data)) { regie.data = { t: Date.now(), rows: r.data }; try { store.set('regie', regie.data); } catch (_) {} lads.key = ''; if (current === 'screen-home') renderLive(); }
  }
  function regieDay() { if (regie.day.d !== todayStr()) regie.day = { d: todayStr(), v: {}, p: {} }; return regie.day; }
  function campsFor(pos) {
    const t = todayStr();
    const rows = (regie.data.rows || []).filter(c => String(c.debut).slice(0, 10) <= t && String(c.fin).slice(0, 10) >= t);
    if (!rows.length || !pos) return { list: rows.length ? rows.filter(c => /^ville/.test(c.formule)).slice(0, 5) : [], zone: false };
    const withD = rows.map(c => ({ c, d: Core.haversine(pos[0], pos[1], c.lat, c.lon) }));
    const inZone = withD.filter(x => x.d * 1000 <= x.c.rayon_m).sort((a, b) => a.d - b.d);
    if (inZone.length) {
      const ex = inZone.filter(x => x.c.exclusif);
      return { list: (ex.length ? [ex[0]] : inZone).map(x => x.c), zone: true };
    }
    const day = regieDay(), dest = state.tracking && state.tracking.destObj;
    const out = withD.filter(x => (regie.day.v[x.c.id] || 0) < 3 && (/^ville/.test(x.c.formule) || x.d <= 3 || (dest && Number.isFinite(dest.lat) && Core.haversine(dest.lat, dest.lon, x.c.lat, x.c.lon) <= 1)))
      .sort((a, b) => (/^ville/.test(b.c.formule) - /^ville/.test(a.c.formule)) || a.d - b.d).slice(0, 6);
    void day;
    return { list: out.map(x => x.c), zone: false };
  }
  // compteurs anonymes, envoyés additionnés toutes les 2 minutes
  function pubCount(id, k) {
    if (!id || String(id).startsWith('demo')) return;
    const e = regie.ctr[id] || (regie.ctr[id] = { v: 0, t: 0, a: 0, i: 0, p: 0 });
    e[k]++; store.set('pubCtr', regie.ctr);
  }
  async function pubFlush() {
    const arr = Object.entries(regie.ctr).filter(([, e]) => e.v + e.t + e.a + e.i + e.p).map(([id, e]) => ({ id, ...e }));
    if (!arr.length || !sbOn() || !navigator.onLine) return;
    const r = await sb('/rest/v1/rpc/pub_compter', { method: 'POST', body: { p: arr.slice(0, 40) } });
    if (r.ok) { arr.slice(0, 40).forEach(x => delete regie.ctr[x.id]); store.set('pubCtr', regie.ctr); }
  }
  setInterval(pubFlush, 120e3);
  // une vue = la pub affichée 1,5 s, bulle ouverte ; au plus une par 10 min et par campagne
  let viewT = null;
  function pubViewSoon(it) {
    clearTimeout(viewT);
    if (!it || it.demo || it.house) return;
    viewT = setTimeout(() => {
      if (current !== 'screen-home' || !live.open || document.visibilityState !== 'visible' || lads.items[lads.i] !== it) return;
      const last = regie.seen[it.id] || 0;
      if (Date.now() - last < 10 * 60e3) return;
      regie.seen[it.id] = Date.now(); store.set('pubSeen', regie.seen);
      const d = regieDay(); d.v[it.id] = (d.v[it.id] || 0) + 1; store.set('pubDay', d);
      pubCount(it.id, 'v');
    }, 1500);
  }
  // une visite = passer à moins de 60 m du point de vente dans les 2 h qui suivent une vue (une par jour)
  function pubVisits() {
    if (!state.pos || state.posStale) return;
    const d = regieDay(), now = Date.now();
    for (const c of regie.data.rows || []) {
      const seen = regie.seen[c.id];
      if (!seen || now - seen > 2 * 3600e3 || d.p[c.id]) continue;
      if (Core.haversine(state.pos[0], state.pos[1], c.lat, c.lon) <= 0.06) { d.p[c.id] = 1; store.set('pubDay', d); pubCount(c.id, 'p'); }
    }
  }

  var lads = { i: 0, key: '', timer: null, hold: false, holdT: null, items: [] };
  function renderLiveAds(tg) {
    const box = $('live-ads'); if (!box || !lads) return;
    const on = current === 'screen-home' && tg && tg.act === 'origin' && tg.stop;
    box.hidden = !on;
    pubVisits();
    if (!on) { clearInterval(lads.timer); lads.timer = null; lads.key = ''; return; }
    const pick = campsFor(state.pos);
    let items;
    if (pick.list.length) items = pick.list.map(c => ({ id: c.id, c, brand: c.commerce, lat: c.lat, lon: c.lon }));
    else if ((regie.data.rows || []).length) { // la régie a démarré : plus d'exemples fictifs, mais l'offre aux commerçants du quartier
      const s = tg.stop;
      items = [{ id: 'house', house: true, brand: 'ZUPA Pub', lat: s.lat, lon: s.lon, c: { commerce: 'ZUPA', cat: 'shop', modele: 'service', couleur: 'noir', titre: 'Votre panneau ici', accroche: '', sous_titre: 'Commerçants : bientôt sur la plateforme web ZUPA', cta: 'whatsapp' } }];
    } else { // pas encore de campagne réelle ici : exemples fictifs autour de l'arrêt
      const s = tg.stop, cosL = Math.cos(s.lat * Math.PI / 180);
      items = DEMO_ADS.map((a, k) => ({ id: 'demo' + k, demo: a, brand: a.brand, lat: s.lat + a.dy / 111320, lon: s.lon + a.dx / (111320 * cosL) }));
    }
    const key = items.map(x => x.id).join('|');
    if (lads.key !== key) {
      const prev = lads.items[lads.i] && lads.items[lads.i].id;
      lads.key = key; lads.items = items;
      lads.i = Math.max(0, items.findIndex(x => x.id === prev));
      $('lads-rail').innerHTML = items.map((it, k) => it.house ? `<button type="button" class="zad-btn" data-ad="${k}" aria-label="Votre publicité ici">${campHtml(it.c, 'ZUPA Pub')}</button>` : it.demo
        ? `<button type="button" class="zad ${it.demo.cls}" data-ad="${k}" aria-label="${esc(it.brand)} — publicité fictive"><span class="zad-tag">Pub fictive</span>${it.demo.html}</button>`
        : `<button type="button" class="zad-btn" data-ad="${k}" aria-label="${esc(it.brand)} — publicité">${campHtml(it.c)}</button>`).join('');
      $('lads-dots').innerHTML = items.length > 1 ? items.map((_, k) => `<i class="${k === lads.i ? 'on' : ''}"></i>`).join('') : '';
      requestAnimationFrame(() => { const r = $('lads-rail'); r.scrollLeft = r.clientWidth * lads.i; });
      pubViewSoon(items[lads.i]);
    }
    box.classList.toggle('zone', pick.zone);
    ladsCaption();
    if (!lads.timer) lads.timer = setInterval(() => { if (current === 'screen-home' && live.open && !lads.hold && document.visibilityState === 'visible' && lads.items.length > 1) ladsGo(lads.i + 1); }, 5000);
  }
  function ladsCaption() {
    const it = lads.items[lads.i]; if (!it || !state.pos) return;
    const m = Math.max(5, Math.round(dist(state.pos, it) * 1000 / 5) * 5);
    $('lads-cap').innerHTML = `${ic('pin')}<span>${m < 1000 ? `${m} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`} · <b>${esc(it.brand)}</b></span>`;
  }
  function ladsGo(i) {
    const rail = $('lads-rail'), n = lads.items.length; if (!n) return;
    lads.i = (i + n) % n;
    rail.scrollTo({ left: rail.clientWidth * lads.i, behavior: 'smooth' });
    ladsMark();
  }
  function ladsMark() { $('lads-dots').querySelectorAll('i').forEach((d, k) => d.classList.toggle('on', k === lads.i)); ladsCaption(); pubViewSoon(lads.items[lads.i]); }
  $('lads-rail').addEventListener('scroll', debounce(() => { const r = $('lads-rail'); const k = Math.round(r.scrollLeft / Math.max(1, r.clientWidth)); if (k !== lads.i) { lads.i = k; ladsMark(); } }, 80), { passive: true });
  $('lads-rail').addEventListener('pointerdown', () => { lads.hold = true; clearTimeout(lads.holdT); lads.holdT = setTimeout(() => { lads.hold = false; }, 10000); }, { passive: true });
  $('lads-rail').addEventListener('click', e => {
    const b = e.target.closest('[data-ad]'); if (!b) return;
    const it = lads.items[+b.dataset.ad]; if (!it) return;
    if (it.demo) { toast(`« ${it.brand} » est une publicité fictive : les vraies offres des commerces près de vous arrivent bientôt.`, 'info', 5000); return; }
    if (it.house) { toast('Bientôt : les commerçants pourront créer leur publicité sur la plateforme web ZUPA.', 'info', 5000); return; }
    campOpen(it.c);
  });
  // toucher une pub : les actions du commerce (chaque action est comptée, sans savoir qui l'a faite)
  function campOpen(c) {
    pubCount(c.id, 't');
    const tel = String(c.tel || '');
    const go = () => { pubCount(c.id, 'i'); setDestPlace({ name: c.commerce, lat: c.lat, lon: c.lon, icon: CAMP_CAT_IC[c.cat] || 'pin' }); show('screen-home'); runSearch(); };
    const acts = [];
    if (tel) acts.push({ icon: 'phone', label: `Appeler ${c.commerce}`, fn: () => { pubCount(c.id, 'a'); openExternal('tel:' + tel); } });
    if (tel && c.whatsapp) acts.push({ icon: 'chat', label: 'Écrire sur WhatsApp', fn: () => { pubCount(c.id, 'a'); openExternal(`https://wa.me/225${tel}?text=${encodeURIComponent(`Bonjour, j'ai vu votre publicité « ${c.titre} » sur ZUPA.`)}`); } });
    acts.push({ icon: 'route', label: 'Y aller', hint: state.pos ? `À ${fmtDist(Core.haversine(state.pos[0], state.pos[1], c.lat, c.lon))}` : '', fn: go });
    if (c.cta === 'itineraire') acts.unshift(acts.pop());
    if (c.cta === 'whatsapp' && acts.length > 2) acts.unshift(acts.splice(1, 1)[0]);
    openActions({ title: c.commerce, sub: [c.titre, c.accroche].filter(Boolean).join(' · ') + ' · Publicité', actions: acts });
  }
  setTimeout(() => fetchRegie(false), 5000);
  setInterval(() => { if (document.visibilityState === 'visible') fetchRegie(false); }, 10 * 60e3);

  // les anciens emplacements « Espace publicitaire » montrent aussi des exemples fictifs
  document.querySelectorAll('.ad-slot').forEach((el, k) => {
    const a = DEMO_ADS[(k + 1) % DEMO_ADS.length];
    el.classList.add('filled');
    el.innerHTML = `<button type="button" class="zad ${a.cls}" data-ad="${DEMO_ADS.indexOf(a)}" aria-label="${esc(a.brand)} — publicité fictive"><span class="zad-tag">Pub fictive</span>${a.html}</button>`;
    el.addEventListener('click', e => { const bt = e.target.closest('[data-ad]'); if (bt) toast(`« ${DEMO_ADS[+bt.dataset.ad].brand} » est une publicité fictive : les vraies offres arrivent bientôt.`, 'info', 5000); });
  });

  // La création des publicités se fera sur une plateforme web dédiée (hors de l'application).

  /* ---------- Démarrage ---------- */
  // un écran à carte plein écran ne doit jamais défiler lui-même
  document.querySelectorAll('.screen.immersive').forEach(el => el.addEventListener('scroll', () => { if (el.scrollTop) el.scrollTop = 0; }));
  loadOfflineMap();
  makeSheet('screen-results', 'res-sheet', [0.3, 0.55, 0.9], 1);
  makeSheet('screen-track', 'trk-sheet', [0.3, 0.55, 0.88], 0);
  makeSheet('screen-pharma-detail', 'pd-sheet', [0.3, 0.55, 0.9], 1);
  applyTheme();
  if ($('app-version')) $('app-version').textContent = CONFIG.version || '1.0.0';
  $('data-note').textContent = `${D.lines.length} trajets · ${D.stops.length} arrêts · Durées estimées, hors trafic.`;
  if (!D.lines.length) toast('Les données des bus n\'ont pas pu être chargées.', 'error', 8000);
  syncClear();
  renderHome();
  startGeo();
  setTimeout(() => { syncMine(); fetchCommunity(false); flushVisits(); frRefresh(false); syncLines(); fetchLines(false); }, 4000);
  renderLinesSection();
  setInterval(() => { if (document.visibilityState === 'visible') frRefresh(false); }, 120e3);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') frRefresh(false); });
  renderQuickPlaces(); syncBadge();
  renderPhTeaser();
  loadGardes();
})();
