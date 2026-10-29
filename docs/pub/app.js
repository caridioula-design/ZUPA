/* ZUPA PUB — espace annonceurs (connexion Supabase Auth, données via fonctions sécurisées) */
(() => {
  'use strict';
  const SB = { url: 'https://nxayxkrrwpdhnqznjzhb.supabase.co', key: 'sb_publishable_L5_kBI28iwPKV0OD-JugBA_VevMSUXe' };
  if (window.ZP_TEST && window.ZP_TEST.sb) Object.assign(SB, window.ZP_TEST.sb);
  const ICONS = {"resto":"M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z","bar":"M21 5V3H3v2l8 9v5H6v2h12v-2h-5v-5l8-9zM7.43 7L5.66 5h12.69l-1.78 2H7.43z","shop":"M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z","cart":"M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1.003 1.003 0 0 0 20 4H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z","market":"M20 4H4v2h16V4zm1 10v-2l-1-5H4l-1 5v2h1v6h10v-6h4v6h2v-6h1zm-9 4H6v-4h6v4z","hotel":"M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z","fuel":"M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 10H6V5h6v5zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z","cross":"M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z","clinic":"M10 4h4v2h2V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2h2V4zm10 4H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-4 8h-3v3h-2v-3H8v-2h3v-3h2v3h3v2z","star":"M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z","explore":"M12 10.9c-.61 0-1.1.49-1.1 1.1s.49 1.1 1.1 1.1c.61 0 1.1-.49 1.1-1.1s-.49-1.1-1.1-1.1zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm2.19 12.19L6 18l3.81-8.19L18 6l-3.81 8.19z","pin":"M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z","locate":"M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3A8.994 8.994 0 0 0 13 3.06V1h-2v2.06A8.994 8.994 0 0 0 3.06 11H1v2h2.06A8.994 8.994 0 0 0 11 20.94V23h2v-2.06A8.994 8.994 0 0 0 20.94 13H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z","close":"M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z","trash":"M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z","plus":"M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z","check":"M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z","phone":"M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z","chat":"M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z","route":"M19 15.18V7c0-2.21-1.79-4-4-4s-4 1.79-4 4v10c0 1.1-.9 2-2 2s-2-.9-2-2V8.82C8.16 8.4 9 7.3 9 6c0-1.66-1.34-3-3-3S3 4.34 3 6c0 1.3.84 2.4 2 2.82V17c0 2.21 1.79 4 4 4s4-1.79 4-4V7c0-1.1.9-2 2-2s2 .9 2 2v8.18A2.996 2.996 0 0 0 18 21c1.66 0 3-1.34 3-3 0-1.3-.84-2.4-2-2.82z","search":"M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z","edit":"M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z","refresh":"M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z","clock":"M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z","user":"M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z","image":"M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z","chevron":"M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z","back":"M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z","info":"M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z","logout":"M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z","pause":"M6 19h4V5H6v14zm8-14v14h4V5h-4z","play":"M8 5v14l11-7z","eye":"M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z","wallet":"M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z","map":"M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"};
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ic = n => ICONS[n] ? `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n]}"/></svg>` : '';
  const F = n => Math.round(n || 0).toLocaleString('fr-FR').replace(/ | /g, ' ');
  const fmtD = d => new Date(String(d).slice(0, 10) + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  const store = { get(k, d) { try { const v = localStorage.getItem('zp:' + k); return v == null ? d : JSON.parse(v); } catch (_) { return d; } }, set(k, v) { try { v == null ? localStorage.removeItem('zp:' + k) : localStorage.setItem('zp:' + k, JSON.stringify(v)); } catch (_) {} } };
  const debounce = (f, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; };
  const hav = (a, b, c, d) => { const R = 6371e3, r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  function paintIcons(root = document) { root.querySelectorAll('[class^="ic-"]').forEach(el => { const n = el.className.slice(3); el.outerHTML = ic(n); }); }

  function toast(msg, type = 'info', ms = 4000) {
    const el = document.createElement('div'); el.className = `toast ${type}`; el.textContent = msg; el.setAttribute('role', type === 'error' ? 'alert' : 'status');
    $('toasts').appendChild(el); setTimeout(() => el.remove(), ms);
  }
  function modal(html, bind) {
    $('modal-in').innerHTML = html; $('modal').hidden = false; paintIcons($('modal-in'));
    const close = () => { $('modal').hidden = true; $('modal-in').innerHTML = ''; };
    $('modal-in').querySelectorAll('[data-close]').forEach(b => b.onclick = close);
    if (bind) bind($('modal-in'), close);
    return close;
  }
  $('modal').addEventListener('click', e => { if (e.target === $('modal')) { $('modal').hidden = true; } });
  const confirmBox = (title, text, okTxt = 'Confirmer', danger) => new Promise(res => modal(`<h2>${esc(title)}</h2><p class="muted">${esc(text)}</p><div class="modal-acts"><button class="btn ghost" data-close>Annuler</button><button class="btn ${danger ? 'danger ghost' : 'primary'}" id="cf-ok">${esc(okTxt)}</button></div>`, (m, close) => {
    m.querySelector('[data-close]').onclick = () => { close(); res(false); };
    $('cf-ok').onclick = () => { close(); res(true); };
  }));

  /* ---------- session (Supabase Auth, retour par l'URL) ---------- */
  let ses = store.get('session', null);
  const HERE = location.origin + location.pathname;
  async function api(path, opts = {}) {
    const headers = { apikey: SB.key, 'Content-Type': 'application/json', ...(opts.headers || {}) };
    try {
      const r = await fetch(SB.url + path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined, cache: 'no-store' });
      const t = await r.text(); let d = null; try { d = t ? JSON.parse(t) : null; } catch (_) { d = t; }
      return { ok: r.ok, status: r.status, data: d };
    } catch (_) { return { ok: false, status: 0, data: null, net: true }; }
  }
  async function token() {
    if (!ses) return null;
    if (ses.access && Date.now() < ses.exp - 60e3) return ses.access;
    const r = await api('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: ses.refresh } });
    if (r.ok && r.data && r.data.access_token) { ses = { ...ses, access: r.data.access_token, refresh: r.data.refresh_token || ses.refresh, exp: Date.now() + (r.data.expires_in || 3600) * 1000 }; store.set('session', ses); return ses.access; }
    if (r.status >= 400 && r.status < 500) { logout(true); }
    return null;
  }
  async function rpc(fn, body) {
    const t = await token(); if (!t) return { ok: false, status: 401, data: null };
    return api('/rest/v1/rpc/' + fn, { method: 'POST', body: body || {}, headers: { Authorization: 'Bearer ' + t } });
  }
  const errTxt = r => r.net ? 'Pas de connexion internet.' : r.status === 404 ? 'ZUPA PUB n’est pas encore activé sur le serveur (supabase/zupapub.sql).' : (r.data && (r.data.message || r.data.msg || r.data.error_description)) || `Erreur ${r.status}`;
  function logout(silent) {
    if (ses && ses.access) api('/auth/v1/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + ses.access } });
    ses = null; store.set('session', null); st.moi = null; st.camps = null;
    if (!silent) toast('Vous êtes déconnecté.');
    showPublic();
  }
  async function fromUrl() {
    if (!/access_token=|error_description=/.test(location.hash)) return false;
    const q = new URLSearchParams(location.hash.slice(1));
    history.replaceState(null, '', location.pathname + location.search);
    if (q.get('error_description')) { toast('Connexion annulée : ' + q.get('error_description').replace(/\+/g, ' '), 'error', 7000); return false; }
    ses = { access: q.get('access_token'), refresh: q.get('refresh_token'), exp: Date.now() + (+q.get('expires_in') || 3600) * 1000 };
    const u = await api('/auth/v1/user', { headers: { Authorization: 'Bearer ' + ses.access } });
    if (u.ok && u.data) { const m = u.data.user_metadata || {}; ses.email = u.data.email || ''; ses.name = m.full_name || m.name || ''; ses.avatar = m.avatar_url || m.picture || ''; }
    store.set('session', ses);
    return true;
  }
  $('login-google').onclick = () => { location.href = `${SB.url}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(HERE)}`; };
  $('login-mail').onsubmit = async e => {
    e.preventDefault();
    const email = $('login-email').value.trim(); if (!email) return;
    const b = e.target.querySelector('button'); b.classList.add('loading');
    const r = await api(`/auth/v1/otp?redirect_to=${encodeURIComponent(HERE)}`, { method: 'POST', body: { email, create_user: true } });
    b.classList.remove('loading');
    if (r.ok) modal(`<h2>Vérifiez votre boîte e-mail</h2><p class="muted">Un lien de connexion a été envoyé à <b>${esc(email)}</b>. Ouvrez-le sur cet appareil pour entrer dans votre espace.</p><div class="modal-acts"><button class="btn primary" data-close>Compris</button></div>`);
    else toast(r.status === 429 ? 'Trop de demandes : réessayez dans quelques minutes.' : 'Envoi impossible : ' + errTxt(r), 'error', 6000);
  };

  /* ---------- état ---------- */
  const st = { moi: null, camps: null, view: 'tableau', draft: null, mv: null };
  const CATS = [['resto', 'Restaurant'], ['maquis', 'Maquis / bar'], ['shop', 'Boutique'], ['supermarche', 'Supermarché'], ['marche', 'Marché'], ['hotel', 'Hôtel'], ['station', 'Station-service'], ['pharma', 'Pharmacie'], ['sante', 'Santé'], ['service', 'Service'], ['autre', 'Autre']];
  const CAT_IC = { resto: 'resto', maquis: 'bar', shop: 'shop', supermarche: 'cart', marche: 'market', hotel: 'hotel', station: 'fuel', pharma: 'cross', sante: 'clinic', service: 'star', autre: 'explore' };
  const COLS = { jaune: ['#ffe500', '#ffd000', '#111', '#e10e1e'], orange: ['#fb923c', '#c2410c', '#fff', '#fde047'], rouge: ['#ef4444', '#991b1b', '#fff', '#fde047'], vert: ['#22c55e', '#166534', '#fff', '#fde047'], bleu: ['#38bdf8', '#075985', '#fff', '#fde68a'], violet: ['#a855f7', '#4c1d95', '#fff', '#fde047'], noir: ['#262626', '#0a0a0a', '#fff', '#ffd000'] };
  const MODS = [['promo', 'Promotion'], ['produit', 'Produit + photo'], ['resto', 'Plat / menu'], ['service', 'Service']];
  const CTA = { appel: 'Appeler', whatsapp: 'WhatsApp', itineraire: 'J’y vais' };
  const ST = { active: 'En ligne', pause: 'En pause', a_valider: 'À valider', refusee: 'Refusée', terminee: 'Terminée' };
  const etabs = () => (st.moi && st.moi.etablissements) || [];
  const etabOf = id => etabs().find(e => e.id === id) || etabs()[0] || null;
  const etabName = id => { const e = etabOf(id); return e ? e.nom : (st.moi.profil ? st.moi.profil.nom : ''); };
  const etabIc = e => e && e.logo ? `<img src="${e.logo}" alt="">` : `<span class="etab-ic">${ic(CAT_IC[(e && e.cat) || 'shop'] || 'shop')}</span>`;
  const tarif = code => ((st.moi && st.moi.tarifs) || []).find(t => t.code === code) || { siege: { prix: 25000 }, city: { prix: 15000 }, pack5: { prix: 60000 } }[code];

  function campHtml(c, commerce) {
    const [c1, c2, ink, acc] = COLS[c.couleur] || COLS.jaune;
    if (c.modele === 'visuel') return `<div class="zad cz cz-visuel" style="--z1:${c1};--z2:${c2}"><span class="zad-tag">Publicité</span>${c.image ? `<img class="cz-full" src="${c.image}" alt="">` : '<span class="cz-empty">Votre visuel</span>'}</div>`;
    const art = c.image ? `<div class="cz-art photo"><img src="${c.image}" alt=""></div>` : `<div class="cz-art">${ic(CAT_IC[c.cat] || 'explore')}</div>`;
    const txt = `<div class="cz-txt">${c.modele === 'service' ? `<small class="cz-kick">${esc(commerce || '')}</small>` : ''}<b class="cz-t">${esc(c.titre || 'Votre titre')}</b>${c.accroche ? `<b class="cz-acc">${esc(c.accroche)}</b>` : ''}${c.sous_titre ? `<small class="cz-sub">${esc(c.sous_titre)}</small>` : ''}<span class="cz-cta">${CTA[c.cta] || 'Appeler'} ›</span></div>`;
    return `<div class="zad cz cz-${c.modele || 'promo'}" style="--z1:${c1};--z2:${c2};--zi:${ink};--za:${acc}"><span class="zad-tag">Publicité</span>${c.modele === 'produit' ? art + txt : c.modele === 'resto' ? txt + art : art + txt}</div>`;
  }
  // image : recadrée au gabarit (1000 × 800 pour un visuel complet), compressée en JPEG
  function loadImage(file, w, h, maxChars = 650000) {
    return new Promise((res, rej) => {
      if (!/^image\//.test(file.type)) { rej(new Error('Choisissez une image (JPG, PNG ou WebP).')); return; }
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d'), k = Math.max(w / img.width, h / img.height);
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, (w - img.width * k) / 2, (h - img.height * k) / 2, img.width * k, img.height * k);
        let q = 0.86, out = cv.toDataURL('image/jpeg', q);
        while (out.length > maxChars && q > 0.4) { q -= 0.08; out = cv.toDataURL('image/jpeg', q); }
        res({ data: out, exact: img.width === w && img.height === h, srcW: img.width, srcH: img.height });
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Image illisible.')); };
      img.src = url;
    });
  }

  /* ---------- navigation ---------- */
  function showPublic() { $('boot').hidden = true; $('v-app').hidden = true; $('v-public').hidden = false; }
  async function showApp() {
    $('boot').hidden = true; $('v-public').hidden = true; $('v-app').hidden = false;
    const av = $('av'); av.innerHTML = ses.avatar ? `<img src="${esc(ses.avatar)}" alt="" referrerpolicy="no-referrer">` : esc((ses.name || ses.email || '?').charAt(0).toUpperCase());
    $('menu-who').textContent = [ses.name, ses.email].filter(Boolean).join(' · ');
    await loadMoi();
    go(location.hash.replace('#', '') || 'tableau', true);
  }
  async function loadMoi() {
    const r = await rpc('zp_moi');
    if (!r.ok) { if (r.status !== 401) $('view').innerHTML = `<div class="empty"><h2>Service indisponible</h2><p class="muted">${esc(errTxt(r))}</p><button class="btn primary" onclick="location.reload()">Réessayer</button></div>`; return false; }
    st.moi = r.data; renderSolde(); return true;
  }
  function renderSolde() { const p = st.moi && st.moi.profil; $('solde-v').textContent = p ? F(p.solde) : '—'; }
  const VIEWS = ['tableau', 'nouvelle', 'carte', 'compte', 'profil'];
  function go(v, replace) {
    if (!VIEWS.includes(v)) v = 'tableau';
    if (!st.moi) return;
    if (!st.moi.profil && v !== 'profil') { v = 'profil'; }
    if (st.view === 'nouvelle' && v !== 'nouvelle' && st.draft && st.draft.dirty && !confirm('Quitter sans publier cette campagne ?')) return;
    if (st.view === 'nouvelle' && v !== 'nouvelle' && st.draft && st.draft.editId) st.draft = null;
    st.view = v;
    if (replace) history.replaceState(null, '', '#' + v); else history.pushState(null, '', '#' + v);
    document.querySelectorAll('[data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === v && b.closest('.tabs,.bottom-tabs')));
    $('menu').hidden = true;
    ({ tableau: viewTableau, nouvelle: viewNouvelle, carte: viewCarte, compte: viewCompte, profil: viewProfil })[v]();
    window.scrollTo({ top: 0 });
  }
  window.addEventListener('popstate', () => { if (/access_token=|error_description=/.test(location.hash)) return; if (ses && st.moi) { const v = location.hash.replace('#', '') || 'tableau'; st.view = v; go(v, true); } });
  document.addEventListener('click', e => {
    const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); go(g.dataset.go); return; }
    if (e.target.closest('#av')) { $('menu').hidden = !$('menu').hidden; return; }
    if (!e.target.closest('#menu')) $('menu').hidden = true;
  });
  $('logout').onclick = () => logout();

  const demoBand = () => st.moi && st.moi.demo ? `<div class="demo-band">${ic('info')}<span><b>Version de démonstration.</b> Les campagnes passent en ligne tout de suite et se paient avec un crédit de démonstration. Le paiement par Mobile Money arrive bientôt.</span></div>` : '';

  /* ---------- tableau de bord ---------- */
  async function viewTableau() {
    const V = $('view');
    V.innerHTML = `<div class="view-h"><div><h1>Mes campagnes</h1><p class="muted">${esc(st.moi.profil.nom)}${etabs().length > 1 ? ` · ${etabs().length} établissements` : ''}</p></div><button class="btn primary" data-go="nouvelle">${ic('plus')}Nouvelle campagne</button></div>${demoBand()}<div id="tb-body" class="loading-page" style="min-height:30vh">Chargement…</div>`;
    const r = await rpc('zp_mes_campagnes');
    if (st.view !== 'tableau') return;
    if (!r.ok) { $('tb-body').innerHTML = `<p class="muted">${esc(errTxt(r))}</p>`; return; }
    st.camps = r.data || [];
    renderTableau();
  }
  function campStatut(c) { const today = new Date().toISOString().slice(0, 10); return c.statut === 'active' && String(c.fin).slice(0, 10) < today ? 'terminee' : c.statut; }
  function renderTableau() {
    const B = $('tb-body'); if (!B) return; B.className = '';
    const all = st.camps, ES = etabs();
    if (st.filtre && !ES.some(e => e.id === st.filtre)) st.filtre = null;
    const cs = st.filtre ? all.filter(c => c.etablissement_id === st.filtre) : all;
    const filt = ES.length > 1 && all.length ? `<div class="filters chips" id="tb-filt"><button type="button" data-f="" class="${!st.filtre ? 'on' : ''}">Tous les établissements</button>${ES.map(e => `<button type="button" data-f="${esc(e.id)}" class="${st.filtre === e.id ? 'on' : ''}">${esc(e.nom)} · ${all.filter(c => c.etablissement_id === e.id).length}</button>`).join('')}</div>` : '';
    if (!all.length) { B.innerHTML = `<div class="empty"><h2>Aucune campagne pour l'instant</h2><p class="muted">Placez votre point de vente sur la carte, choisissez votre visuel : votre publicité s'affiche aussitôt dans ZUPA autour de votre commerce.</p><button class="btn primary" data-go="nouvelle">${ic('plus')}Créer ma première campagne</button></div>`; return; }
    const tot = k => cs.reduce((a, c) => a + ((c.stats && c.stats[k]) || 0), 0);
    const actives = cs.filter(c => campStatut(c) === 'active').length;
    B.innerHTML = filt + `<div class="kpis">
        <div class="kpi"><small>Campagnes en ligne</small><b>${actives}</b></div>
        <div class="kpi"><small>Vues</small><b>${F(tot('vues'))}</b></div>
        <div class="kpi"><small>Touchers et appels</small><b>${F(tot('touchers') + tot('appels'))}</b></div>
        <div class="kpi"><small>Visites en boutique</small><b>${F(tot('visites'))}</b></div>
      </div>
      <div class="camps">${cs.map(c => {
        const s = campStatut(c), pn = c.panneaux || [], city = pn.filter(p => p.type === 'city'), siege = pn.find(p => p.type === 'siege');
        const x = c.stats || {};
        return `<article class="camp" data-c="${esc(c.id)}">
          <div class="camp-prev">${campHtml({ ...c, cat: (etabOf(c.etablissement_id) || st.moi.profil).cat }, etabName(c.etablissement_id))}</div>
          <div class="camp-b">
            <div class="camp-t"><h3>${esc(c.nom)}</h3><span class="st ${s}">${ST[s] || s}</span></div>
            <div class="camp-meta"><span>${ic('shop')}<b>${esc(etabName(c.etablissement_id))}</b></span><span>${ic('pin')}${esc(c.siege_nom)}</span><span>${ic('clock')}jusqu'au ${fmtD(c.fin)}</span><span>${ic('map')}${siege ? esc(siege.code) : ''}${city.length ? ` + ${city.length} emplacement${city.length > 1 ? 's' : ''}` : ''}</span><span>${c.portee === 'pays' ? 'Zone C : tout le pays' : 'Zone C : la ville'}</span></div>
            <div class="camp-stats"><div><small>Vues</small><b>${F(x.vues)}</b></div><div><small>Touchers</small><b>${F(x.touchers)}</b></div><div><small>Appels</small><b>${F(x.appels)}</b></div><div><small>Visites</small><b>${F(x.visites)}</b></div></div>
            <div class="camp-acts">
              <button class="btn sm ghost" data-a="carte">${ic('map')}Carte</button>
              <button class="btn sm ghost" data-a="stats">${ic('eye')}Statistiques</button>
              <button class="btn sm ghost" data-a="ajout">${ic('plus')}Emplacements</button>
              ${s === 'active' ? `<button class="btn sm ghost" data-a="pause">${ic('pause')}Pause</button>` : s === 'pause' ? `<button class="btn sm ghost" data-a="reprendre">${ic('play')}Reprendre</button>` : ''}
              <button class="btn sm ghost" data-a="prolonger">${ic('refresh')}+1 mois</button>
              <button class="btn sm ghost" data-a="modifier">${ic('edit')}Visuel</button>
              <button class="btn sm ghost danger" data-a="supprimer" aria-label="Supprimer">${ic('trash')}</button>
            </div>
          </div></article>`;
      }).join('')}</div>`;
  }
  $('view').addEventListener('click', async e => {
    const f = e.target.closest('#tb-filt [data-f]'); if (f) { st.filtre = f.dataset.f || null; renderTableau(); return; }
    const b = e.target.closest('[data-a]'); if (!b) return;
    const card = b.closest('[data-c]'); if (!card) return;
    const c = (st.camps || []).find(x => x.id === card.dataset.c); if (!c) return;
    const a = b.dataset.a;
    const act = async (action, ok) => { b.classList.add('loading'); const r = await rpc('zp_campagne_action', { p_id: c.id, p_action: action }); b.classList.remove('loading'); if (!r.ok) { toast(errTxt(r), 'error', 6000); return; } toast(ok, 'success'); await loadMoi(); viewTableau(); };
    if (a === 'pause') act('pause', 'Campagne en pause : elle ne s’affiche plus.');
    else if (a === 'reprendre') act('reprendre', 'Campagne de nouveau en ligne.');
    else if (a === 'prolonger') { if (await confirmBox('Prolonger d’un mois', `Le panneau Géopub@siège reste en ligne 30 jours de plus pour ${F(tarif('siege').prix)} F, payés avec votre solde (${F(st.moi.profil.solde)} F).`, 'Prolonger')) act('prolonger', 'Campagne prolongée d’un mois.'); }
    else if (a === 'supprimer') { if (await confirmBox('Supprimer la campagne', 'Elle disparaît de l’application avec ses panneaux et ses statistiques. Le montant payé n’est pas remboursé.', 'Supprimer', true)) act('supprimer', 'Campagne supprimée.'); }
    else if (a === 'carte') showCampMap(c);
    else if (a === 'stats') showStats(c);
    else if (a === 'ajout') addPanels(c);
    else if (a === 'modifier') { st.draft = draftFrom(c); st.draft.editId = c.id; go('nouvelle'); }
  });
  function showCampMap(c) {
    modal(`<h2>${esc(c.nom)}</h2><p class="muted" style="margin:0 0 10px">Panneaux et zones d'influence</p><div class="map" id="cm-map" style="height:380px"></div>
      <div class="zones-mini"><span><i style="background:var(--za)"></i>A · 200 m</span><span><i style="background:var(--zb)"></i>B · 500 m</span><span><i style="background:var(--city)"></i>Emplacement · 100 m</span></div>
      <div class="modal-acts"><button class="btn primary" data-close>Fermer</button></div>`, () => {
      const m = mkMap('cm-map', [c.siege_lat, c.siege_lon], 15);
      const pts = [];
      (c.panneaux || []).forEach(p => {
        if (p.type === 'siege') { zonesOn(m, p.lat, p.lon); }
        else L.circle([p.lat, p.lon], { radius: 100, color: '#7c3aed', weight: 1.5, fillOpacity: .15 }).addTo(m);
        L.marker([p.lat, p.lon], { icon: pinIcon(p.type === 'siege' ? '#d93a2b' : '#7c3aed') }).bindTooltip(`${esc(p.code)}${p.nom ? ' · ' + esc(p.nom) : ''}`).addTo(m);
        pts.push([p.lat, p.lon]);
      });
      if (pts.length > 1) m.fitBounds(L.latLngBounds(pts).pad(0.3));
    });
  }
  async function showStats(c) {
    const r = await rpc('zp_campagne_stats', { p_id: c.id });
    const days = r.ok ? r.data || [] : [];
    const max = Math.max(1, ...days.map(d => d.vues));
    const sum = k => days.reduce((a, d) => a + (d[k] || 0), 0);
    modal(`<h2>Statistiques · ${esc(c.nom)}</h2><p class="muted" style="margin:0">60 derniers jours · chiffres anonymes, aucune donnée sur les personnes</p>
      ${days.length ? `<div class="spark" title="Vues par jour">${days.map(d => `<i style="height:${(d.vues / max * 100).toFixed(0)}%" title="${fmtD(d.jour)} : ${d.vues} vues"></i>`).join('')}</div><p class="hint">Vues par jour, du ${fmtD(days[0].jour)} au ${fmtD(days[days.length - 1].jour)}</p>` : '<p class="muted">Pas encore de vue : la campagne s’affiche dès qu’un utilisateur de ZUPA passe dans ses zones.</p>'}
      <div class="camp-stats" style="margin-top:12px"><div><small>Vues</small><b>${F(sum('vues'))}</b></div><div><small>Touchers</small><b>${F(sum('touchers'))}</b></div><div><small>Appels</small><b>${F(sum('appels'))}</b></div><div><small>Itinéraires</small><b>${F(sum('itineraires'))}</b></div></div>
      <p class="hint">Une <b>vue</b> = la publicité affichée au moins 1,5 seconde. Une <b>visite</b> = un utilisateur passé à moins de 60 m de votre point de vente dans les 2 heures qui suivent une vue (${F(sum('visites'))} visites).</p>
      <div class="modal-acts"><button class="btn primary" data-close>Fermer</button></div>`);
  }
  function addPanels(c) {
    const pts = [];
    let sem = 1;
    const prix = () => cityPrice(pts.length, sem);
    modal(`<h2>Ajouter des emplacements</h2><p class="muted" style="margin:0 0 10px">Touchez la carte pour poser un panneau Géopub@city (rayon 100 m, affichage ×2). ${F(tarif('city').prix)} F par semaine, ou ${F(tarif('pack5').prix)} F les 5.</p>
      <div class="map" id="ap-map" style="height:320px"></div><ul class="city-list" id="ap-list"></ul>
      <label>Durée</label><div class="dur"><input class="input" type="number" id="ap-sem" min="1" max="52" value="1"><span class="muted">semaine(s)</span></div>
      <p class="recap after" id="ap-tot"></p>
      <div class="modal-acts"><button class="btn ghost" data-close>Annuler</button><button class="btn primary" id="ap-ok">Payer et ajouter</button></div>`, (m, close) => {
      const map = mkMap('ap-map', [c.siege_lat, c.siege_lon], 14);
      zonesOn(map, c.siege_lat, c.siege_lon, true);
      occOn(map, { filter: p => !p.moi });
      (c.panneaux || []).filter(p => p.type === 'city').forEach(p => L.circle([p.lat, p.lon], { radius: 100, color: '#7c3aed', weight: 1, fillOpacity: .08, dashArray: '4 4' }).addTo(map));
      const layer = L.layerGroup().addTo(map);
      const draw = () => {
        layer.clearLayers();
        pts.forEach((p, i) => { L.circle([p.lat, p.lon], { radius: 100, color: '#7c3aed', weight: 1.5, fillOpacity: .18 }).addTo(layer); L.marker([p.lat, p.lon], { icon: pinIcon('#7c3aed', i + 1) }).addTo(layer); });
        $('ap-list').innerHTML = pts.map((p, i) => `<li><code>#${i + 1}</code><input value="${esc(p.nom)}" data-i="${i}" placeholder="Nom de l'emplacement (facultatif)" maxlength="80"><button type="button" data-del="${i}" aria-label="Retirer">${ic('close')}</button></li>`).join('');
        const t = prix(), solde = st.moi.profil.solde;
        $('ap-tot').className = 'recap after' + (t > solde ? ' bad' : '');
        $('ap-tot').innerHTML = pts.length ? `<b>${F(t)} F</b> pour ${pts.length} emplacement${pts.length > 1 ? 's' : ''} × ${sem} semaine${sem > 1 ? 's' : ''}${pts.length >= 5 ? ' (tarif pack appliqué)' : ''} · solde ${F(solde)} F` : 'Aucun emplacement pour l’instant.';
        $('ap-ok').disabled = !pts.length || t > solde;
      };
      map.on('click', e => { if (pts.length >= 50) return; const o = occAt(e.latlng.lat, e.latlng.lng)[0]; if (o) toast(`Dans la zone A de « ${o.p.commerce} » (${Math.round(o.d)} m) : vos pubs ne s'y afficheront pas.`, 'error', 6000); pts.push({ lat: +e.latlng.lat.toFixed(6), lon: +e.latlng.lng.toFixed(6), nom: '' }); draw(); });
      $('ap-list').addEventListener('input', e => { const i = e.target.dataset.i; if (i != null) pts[i].nom = e.target.value; });
      $('ap-list').addEventListener('click', e => { const d = e.target.closest('[data-del]'); if (d) { pts.splice(+d.dataset.del, 1); draw(); } });
      $('ap-sem').oninput = () => { sem = Math.max(1, Math.min(52, +$('ap-sem').value || 1)); draw(); };
      $('ap-ok').onclick = async () => {
        $('ap-ok').classList.add('loading');
        const r = await rpc('zp_panneaux_ajouter', { p_id: c.id, p: { panneaux: pts, semaines: sem } });
        $('ap-ok').classList.remove('loading');
        if (!r.ok) { toast(errTxt(r), 'error', 6000); return; }
        close(); toast(`${r.data} emplacement${r.data > 1 ? 's' : ''} ajouté${r.data > 1 ? 's' : ''} à « ${c.nom} ».`, 'success'); await loadMoi(); viewTableau();
      };
      draw();
    });
  }

  /* ---------- cartes ---------- */
  function mkMap(id, center, z) {
    const m = L.map(id, { zoomControl: true, attributionControl: true }).setView(center, z);
    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(m);
    setTimeout(() => m.invalidateSize(), 60);
    return m;
  }
  function pinIcon(color, n) {
    return L.divIcon({ className: '', iconSize: [28, 38], iconAnchor: [14, 38], html: `<svg viewBox="0 0 24 34" width="28" height="38"><path d="M12 0C5.4 0 0 5.3 0 11.9 0 20.6 12 34 12 34s12-13.4 12-22.1C24 5.3 18.6 0 12 0z" fill="${color}" stroke="rgba(0,0,0,.35)"/>${n ? `<text x="12" y="16" text-anchor="middle" font-size="11" font-weight="700" fill="#fff" font-family="Poppins,sans-serif">${n}</text>` : '<circle cx="12" cy="12" r="4.3" fill="#fff"/>'}</svg>` });
  }
  function zonesOn(map, lat, lon, light) {
    const g = L.layerGroup().addTo(map);
    L.circle([lat, lon], { radius: 500, color: '#c9a800', weight: 1, fillColor: '#f2e94e', fillOpacity: light ? .12 : .28, interactive: false }).addTo(g);
    L.circle([lat, lon], { radius: 200, color: '#d93a2b', weight: 1, fillColor: '#ec8f86', fillOpacity: light ? .15 : .4, interactive: false }).addTo(g);
    return g;
  }

  /* ---------- panneaux déjà loués ---------- */
  const occ = { t: 0, list: [] };
  async function loadOcc(force) {
    if (!force && Date.now() - occ.t < 3 * 60e3) return occ.list;
    const r = await rpc('zp_occupation');
    if (r.ok && Array.isArray(r.data)) { occ.list = r.data; occ.t = Date.now(); }
    return occ.list;
  }
  // dessine les panneaux sur une carte : sièges (zone A 200 m) et emplacements city (100 m), les vôtres en orange
  function occOn(map, opts = {}) {
    const g = L.layerGroup().addTo(map);
    loadOcc().then(list => {
      list.filter(p => !opts.filter || opts.filter(p)).forEach(p => {
        const col = p.moi ? '#E97234' : p.type === 'siege' ? '#64748b' : '#7c3aed';
        const R = p.type === 'siege' ? 200 : 100;
        L.circle([p.lat, p.lon], { radius: R, color: col, weight: 1.2, dashArray: p.moi ? null : '5 5', fillColor: col, fillOpacity: p.moi ? .12 : .1, interactive: false }).addTo(g);
        if (p.type === 'siege' && opts.zoneB) L.circle([p.lat, p.lon], { radius: 500, color: col, weight: .8, dashArray: '2 6', fill: false, interactive: false }).addTo(g);
        L.circleMarker([p.lat, p.lon], { radius: p.type === 'siege' ? 6 : 4.5, color: '#fff', weight: 2, fillColor: col, fillOpacity: 1 })
          .bindTooltip(`<b>${esc(p.commerce)}</b>${p.moi ? ' (vous)' : ''}<br>${p.type === 'siege' ? 'Géopub@siège · zone A 200 m' : 'Géopub@city · 100 m'}<br>${esc(p.code)} · jusqu'au ${fmtD(p.fin)}`).addTo(g);
      });
      if (opts.done) opts.done(list);
    });
    return g;
  }
  // sièges d'autres annonceurs dont la zone A (200 m) couvre ce point
  const occAt = (lat, lon, rad = 200) => occ.list.filter(p => !p.moi && p.type === 'siege').map(p => ({ p, d: hav(lat, lon, p.lat, p.lon) })).filter(x => x.d <= rad).sort((a, b) => a.d - b.d);

  function viewCarte() {
    $('view').innerHTML = `<div class="view-h"><div><h1>Carte des panneaux</h1><p class="muted">Panneaux déjà loués par les annonceurs : choisissez les emplacements libres pour être vu sans partage.</p></div><button class="btn primary" data-go="nouvelle">${ic('plus')}Nouvelle campagne</button></div>
      <section class="card">
        <div class="map-tools"><div class="search"><input class="input" id="cr-q" placeholder="Aller à un quartier, une rue… (ex. Cocody Angré)" autocomplete="off"><div class="sug" id="cr-sug" hidden></div></div></div>
        <div class="chips" id="cr-f" style="margin-bottom:10px"><button type="button" data-f="all" class="on">Tous</button><button type="button" data-f="siege">Géopub@siège</button><button type="button" data-f="city">Géopub@city</button><button type="button" data-f="moi">Mes panneaux</button></div>
        <div class="map" id="cr-map" style="height:min(70vh,620px)"></div>
        <div class="zones-mini"><span><i style="background:#64748b"></i>Siège d'un autre annonceur : zone A 200 m (zone B 500 m en pointillés)</span><span><i style="background:#7c3aed"></i>Emplacement Géopub@city : 100 m</span><span><i style="background:#E97234"></i>Vos panneaux</span></div>
        <p class="hint" id="cr-n"></p>
      </section>`;
    const m = mkMap('cr-map', [5.33, -4.02], 12);
    let layer = null, f = 'all';
    const draw = () => {
      if (layer) layer.remove();
      layer = occOn(m, { zoneB: true, filter: p => f === 'all' || (f === 'moi' ? p.moi : p.type === f), done: list => {
        const s = list.filter(p => p.type === 'siege').length, c = list.length - s, mine = list.filter(p => p.moi).length;
        $('cr-n').textContent = `${s} panneau${s > 1 ? 'x' : ''} siège et ${c} emplacement${c > 1 ? 's' : ''} city loués · dont ${mine} à vous.`;
        const pts = list.filter(p => f === 'all' || (f === 'moi' ? p.moi : p.type === f)).map(p => [p.lat, p.lon]);
        if (pts.length && !m._fitted) { m.fitBounds(L.latLngBounds(pts).pad(0.25), { maxZoom: 15 }); m._fitted = true; }
      } });
    };
    loadOcc(true).then(draw);
    $('cr-f').onclick = e => { const b = e.target.closest('[data-f]'); if (!b) return; f = b.dataset.f; $('cr-f').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); m._fitted = false; draw(); };
    const q = $('cr-q');
    q.addEventListener('input', debounce(async () => {
      const v = q.value.trim(); if (v.length < 3) { $('cr-sug').hidden = true; return; }
      const res = await geocode(v); $('cr-sug')._res = res;
      $('cr-sug').innerHTML = res.length ? res.map((x, i) => `<button type="button" data-i="${i}">${esc(x.name || x.display_name.split(',')[0])}<small>${esc(x.display_name)}</small></button>`).join('') : '<button type="button" disabled>Aucun résultat</button>';
      $('cr-sug').hidden = false;
    }, 350));
    $('cr-sug').onclick = e => { const b = e.target.closest('[data-i]'); if (!b) return; const x = $('cr-sug')._res[+b.dataset.i]; $('cr-sug').hidden = true; m.setView([+x.lat, +x.lon], 16); };
  }

  /* ---------- nouvelle campagne ---------- */
  const cityPrice = (n, sem) => n <= 0 ? 0 : sem * Math.min(n * tarif('city').prix, Math.floor(n / 5) * tarif('pack5').prix + (n % 5) * tarif('city').prix);
  function draftFrom(c) {
    return { etab: c.etablissement_id || (etabs()[0] && etabs()[0].id), layout: null, aLayout: !!c.a_layout, nom: c.nom, portee: c.portee, siege: { nom: c.siege_nom, lat: c.siege_lat, lon: c.siege_lon }, mode: 'editeur', modele: c.modele === 'visuel' ? 'promo' : c.modele,
      titre: c.titre || '', accroche: c.accroche || '', sous_titre: c.sous_titre || '', cta: c.cta, couleur: c.couleur, photo: c.modele !== 'visuel' ? c.image : null, visuel: c.modele === 'visuel' ? c.image : null, cat: st.moi.profil.cat,
      panneaux: [], mois: 1, semaines: 1, imgChanged: false };
  }
  function newDraft() {
    const p = st.moi.profil, e = etabs()[0] || {};
    return { etab: e.id, layout: null, nom: '', portee: 'ville', siege: e.lat ? { nom: e.nom, lat: e.lat, lon: e.lon } : null, mode: 'editeur', modele: 'promo', titre: '', accroche: '', sous_titre: '', cta: (e.whatsapp ?? p.whatsapp) && (e.tel || p.tel) ? 'whatsapp' : 'appel', fresh: true, couleur: 'jaune', photo: null, visuel: null, cat: e.cat || p.cat, panneaux: [], mois: 1, semaines: 1, dirty: false };
  }
  let wz = { map: null, siegeMk: null, zones: null, cityLayer: null };
  function viewNouvelle() {
    if (wz.ed && st.draft) { try { st.draft.layout = wz.ed.get(); } catch (_) {} }
    if (!st.draft || (!st.draft.editId && st.draft.done)) st.draft = newDraft();
    const d = st.draft, ed = !!d.editId, E = etabOf(d.etab);
    $('view').innerHTML = `<div class="view-h"><div><h1>${ed ? 'Modifier la campagne' : 'Nouvelle campagne'}</h1><p class="muted">${ed ? 'Visuel, nom et portée. Les panneaux restent en place.' : 'Votre panneau Géopub@siège est inclus. Ajoutez des emplacements si vous voulez.'}</p></div></div>${demoBand()}
    <div class="wiz">
      <div class="wiz-l">
        <section class="card">
          <div class="step-h"><i>${ed ? '·' : 1}</i><h2>Établissement</h2></div>
          <p class="muted" style="margin:0">La publicité s'affiche au nom de cet établissement, avec son téléphone.</p>
          <div class="etab-pick" id="wz-etab">${etabs().map(x => `<button type="button" data-e="${esc(x.id)}" class="${x.id === d.etab ? 'on' : ''}">${etabIc(x)}${esc(x.nom)}</button>`).join('')}<button type="button" data-go="profil" class="btn sm ghost">${ic('plus')}Ajouter un établissement</button></div>
        </section>
        <section class="card"${ed ? ' hidden' : ''}>
          <div class="step-h"><i>2</i><h2>Le point de vente</h2></div>
          <p class="muted" style="margin:0">Cherchez l'adresse ou touchez la carte à l'endroit exact du commerce : c'est là que se trouve votre panneau Géopub@siège.</p>
          <div class="map-tools"><div class="search"><input class="input" id="wz-q" placeholder="Quartier, rue, repère… (ex. Treichville avenue 16)" autocomplete="off"><div class="sug" id="wz-sug" hidden></div></div><button class="btn ghost" id="wz-gps" type="button" title="Ma position">${ic('locate')}</button></div>
          <div class="map" id="wz-map"></div>
          <p class="occ-note" id="wz-occ" hidden></p>
          <div class="zones-mini"><span><i style="background:var(--za)"></i>Zone A · 200 m : vos pubs uniquement</span><span><i style="background:var(--zb)"></i>Zone B · 500 m : affichage ×3</span><span><i style="background:var(--zc)"></i>Zone C : ${d.portee === 'pays' ? 'tout le pays' : 'toute la ville'}</span><span><i style="background:#64748b"></i>Panneaux déjà loués</span></div>
          <label for="wz-snom">Nom du point de vente</label><input class="input" id="wz-snom" maxlength="80" value="${esc(d.siege ? d.siege.nom : '')}" placeholder="ex. ${esc(E ? E.nom : st.moi.profil.nom)} Treichville">
        </section>
        <section class="card">
          <div class="step-h"><i>${ed ? 1 : 3}</i><h2>Portée de la zone C</h2></div>
          <p class="muted" style="margin:0">Au-delà de 500 m, votre publicité tourne avec les autres, durée d'affichage normale.</p>
          <div class="chips" id="wz-portee" style="margin-top:10px"><button type="button" data-v="ville" class="${d.portee === 'ville' ? 'on' : ''}">Toute la ville</button><button type="button" data-v="pays" class="${d.portee === 'pays' ? 'on' : ''}">Tout le pays</button></div>
        </section>
        <section class="card">
          <div class="step-h"><i>${ed ? 2 : 4}</i><h2>Votre publicité</h2></div>
          <label for="wz-nom">Nom de la campagne <small>(visible par vous seul)</small></label><input class="input" id="wz-nom" maxlength="60" value="${esc(d.nom)}" placeholder="ex. Promo de rentrée">
          <div class="row"><div><label for="wz-cta">Quand on touche la pub</label><select class="input" id="wz-cta">${Object.entries({ appel: 'Appeler', whatsapp: 'Écrire sur WhatsApp', itineraire: 'Y aller (itinéraire)' }).map(([k, l]) => `<option value="${k}"${d.cta === k ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
          <div><label>Affiche déjà prête ?</label><button class="btn ghost block" type="button" id="wz-imp">${ic('image')}Importer (1000 × 800)</button><input type="file" id="wz-vis" accept="image/*" hidden></div></div>
          <p class="hint">Choisissez un modèle (promotion, menu, catalogue de prix…) puis modifiez tout : textes, photos, couleurs, position des éléments. Une affiche importée devient le fond : vous pouvez encore y ajouter des textes et images.</p>
          <div id="wz-editeur"></div>
        </section>
        <section class="card"${ed ? ' hidden' : ''}>
          <div class="step-h"><i>5</i><h2>Emplacements supplémentaires <small class="muted" style="font-weight:500;font-size:.85rem">(facultatif)</small></h2></div>
          <p class="muted" style="margin:0">Panneaux Géopub@city sur un itinéraire ou près d'un autre point de vente : 100 m, affichage 2 fois plus long. Activez l'ajout puis touchez la carte.</p>
          <div class="map-tools"><button class="btn ghost" id="wz-city-on" type="button">${ic('plus')}Poser des emplacements sur la carte</button></div>
          <ul class="city-list" id="wz-city"></ul>
          <label>Durée des emplacements</label><div class="dur"><input class="input" type="number" id="wz-sem" min="1" max="52" value="${d.semaines}"><span class="muted">semaine(s) · ${F(tarif('city').prix)} F l'emplacement, ${F(tarif('pack5').prix)} F les 5</span></div>
        </section>
      </div>
      <aside class="wiz-r">
        <section class="card prev-card"><h2>Aperçu dans ZUPA</h2><div class="phone"><p class="cap">${ic('pin')}<span>120 m · <b>${esc(E ? E.nom : st.moi.profil.nom)}</b></span></p><div id="wz-prev"></div></div></section>
        <section class="card recap" id="wz-recap"></section>
      </aside>
    </div>`;
    wz = { map: null, siegeMk: null, zones: null, cityLayer: null, cityOn: false, ed: null };
    if (!ed) initWizMap();
    bindWiz();
    renderPrev(); renderRecap(); renderCity();
    if (d.mode === 'editeur') mountEditor();
  }
  // éditeur : à partir de la mise en page enregistrée, du visuel importé ou du modèle rapide
  async function mountEditor() {
    const d = st.draft, box = $('wz-editeur'); if (!box || wz.ed) return;
    let init = d.layout;
    if (!init && d.editId && d.aLayout) {
      box.innerHTML = '<p class="muted">Chargement de la mise en page…</p>';
      const r = await rpc('zp_campagne_layout', { p_id: d.editId });
      if (st.draft !== d || d.mode !== 'editeur') return;
      if (r.ok && r.data && r.data.objs) init = d.layout = r.data;
    }
    const E = etabOf(d.etab);
    if (!init) {
      // ancienne campagne : son visuel devient le fond, ou ses textes sont repris dans le modèle « Promotion »
      if (d.editId && d.modele === 'visuel' || (d.editId && d.visuel)) init = { v: 1, bg: { k: 'img', src: d.visuel || d.photo }, objs: [] };
      else init = ZPEditor.fromTemplate({ couleur: d.couleur, titre: d.titre, accroche: d.accroche, sous_titre: d.sous_titre || etabName(d.etab), cta: CTA[d.cta], photo: d.photo });
    }
    const data = { commerce: E ? E.nom : st.moi.profil.nom, tel: (E && E.tel) || st.moi.profil.tel, adresse: E && E.adresse, couleur: d.couleur, titre: d.titre, accroche: d.accroche, sous_titre: d.sous_titre };
    wz.ed = ZPEditor.mount(box, init, { logo: E && E.logo, data, gallery: !!d.fresh && !d.layout, toast: m => toast(m, 'error'), onChange: () => { d.dirty = true; d.fresh = false; prevSoon(); renderRecap(); } });
    renderRecap();
    prevSoon();
  }
  const prevSoon = debounce(async () => {
    if (!wz.ed || !$('wz-prev')) return;
    const d = st.draft; d.edImage = await wz.ed.export(400000);
    renderPrev();
  }, 450);
  function initWizMap() {
    const d = st.draft;
    const m = wz.map = mkMap('wz-map', d.siege ? [d.siege.lat, d.siege.lon] : [5.33, -4.02], d.siege ? 16 : 12);
    occOn(m, { filter: p => !p.moi || !d.editId, done: () => { if (d.siege) occWarn(); } });
    wz.cityLayer = L.layerGroup().addTo(m);
    m.on('click', e => {
      const p = { lat: +e.latlng.lat.toFixed(6), lon: +e.latlng.lng.toFixed(6) };
      if (wz.cityOn) {
        if (d.panneaux.length >= 50) { toast('50 emplacements au maximum.', 'error'); return; }
        const o = occAt(p.lat, p.lon)[0];
        if (o) toast(`Attention : cet emplacement est dans la zone A de « ${o.p.commerce} » (${Math.round(o.d)} m). Là-bas, seules ses pubs s'affichent : choisissez un endroit libre.`, 'error', 7000);
        d.panneaux.push({ ...p, nom: '' }); d.dirty = true; renderCity(); renderRecap(); return;
      }
      d.siegeManual = true; setSiege(p.lat, p.lon); reverse(p.lat, p.lon);
    });
    if (d.siege) setSiege(d.siege.lat, d.siege.lon, true);
  }
  function occWarn() {
    const d = st.draft, el = $('wz-occ'); if (!el || !d.siege) return;
    const near = occAt(d.siege.lat, d.siege.lon, 400);
    const inA = near.filter(x => x.d <= 200);
    el.hidden = !near.length;
    el.className = 'occ-note' + (inA.length ? ' bad' : '');
    el.innerHTML = near.length ? `${ic('info')}<span>${inA.length ? `<b>Zone déjà occupée :</b> ${inA.map(x => `« ${esc(x.p.commerce)} » à ${Math.round(x.d)} m`).join(', ')}. Vos zones A se chevauchent : déplacez le point de vente si possible, ou acceptez de partager ce secteur.` : `<b>Voisins :</b> ${near.map(x => `« ${esc(x.p.commerce)} » à ${Math.round(x.d)} m`).join(', ')}. Vos zones B (500 m) se croiseront, mais votre zone A reste à vous.`}</span>` : '';
  }
  function setSiege(lat, lon, keep) {
    const d = st.draft, m = wz.map;
    if (!$('wz-snom').value.trim()) $('wz-snom').value = etabName(d.etab);
    d.siege = { ...(d.siege || {}), lat, lon, nom: $('wz-snom').value.trim() || (d.siege && d.siege.nom) || '' }; d.dirty = true;
    if (wz.zones) wz.zones.remove(); wz.zones = zonesOn(m, lat, lon);
    if (!wz.siegeMk) { wz.siegeMk = L.marker([lat, lon], { icon: pinIcon('#d93a2b'), draggable: true }).addTo(m); wz.siegeMk.on('dragend', () => { const p = wz.siegeMk.getLatLng(); setSiege(+p.lat.toFixed(6), +p.lng.toFixed(6)); }); }
    else wz.siegeMk.setLatLng([lat, lon]);
    if (!keep) m.setView([lat, lon], Math.max(m.getZoom(), 16));
    occWarn();
    renderRecap();
  }
  // recherche d'adresse (OpenStreetMap Nominatim, limitée à la Côte d'Ivoire)
  async function geocode(q) {
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=ci&limit=6&accept-language=fr&q=${encodeURIComponent(q)}`);
      return r.ok ? await r.json() : [];
    } catch (_) { return []; }
  }
  async function reverse(lat, lon) {
    const cur = $('wz-snom').value.trim(); if (cur && cur !== etabName(st.draft.etab)) return;
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=17&accept-language=fr&lat=${lat}&lon=${lon}`);
      const j = r.ok ? await r.json() : null; const a = j && j.address;
      if (a && ($('wz-snom').value.trim() === etabName(st.draft.etab) || !$('wz-snom').value.trim())) { const q = a.suburb || a.neighbourhood || a.quarter || a.city_district || a.town || a.city || ''; if (q) { $('wz-snom').value = `${etabName(st.draft.etab)} ${q}`.slice(0, 80); st.draft.siege.nom = $('wz-snom').value; renderRecap(); } }
    } catch (_) {}
  }
  function bindWiz() {
    const d = st.draft;
    const upd = () => { d.dirty = true; renderPrev(); renderRecap(); };
    const q = $('wz-q');
    if (q) {
      q.addEventListener('input', debounce(async () => {
        const v = q.value.trim(); if (v.length < 3) { $('wz-sug').hidden = true; return; }
        const res = await geocode(v);
        $('wz-sug').innerHTML = res.length ? res.map((x, i) => `<button type="button" data-i="${i}">${esc(x.name || x.display_name.split(',')[0])}<small>${esc(x.display_name)}</small></button>`).join('') : '<button type="button" disabled>Aucun résultat : touchez directement la carte.</button>';
        $('wz-sug').hidden = false; $('wz-sug')._res = res;
      }, 350));
      $('wz-sug').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b) return; const x = $('wz-sug')._res[+b.dataset.i]; $('wz-sug').hidden = true; q.value = x.name || x.display_name.split(',')[0]; setSiege(+(+x.lat).toFixed(6), +(+x.lon).toFixed(6)); reverse(+x.lat, +x.lon); wz.map.setView([+x.lat, +x.lon], 17); toast('Ajustez le repère rouge sur l’entrée exacte du commerce.', 'info', 5000); });
      $('wz-gps').onclick = () => {
        if (!navigator.geolocation) return;
        $('wz-gps').classList.add('loading');
        navigator.geolocation.getCurrentPosition(p => { $('wz-gps').classList.remove('loading'); setSiege(+p.coords.latitude.toFixed(6), +p.coords.longitude.toFixed(6)); reverse(p.coords.latitude, p.coords.longitude); if (p.coords.accuracy > 60) toast(`Position à ± ${Math.round(p.coords.accuracy)} m : vérifiez le repère sur la carte.`, 'info', 6000); },
          () => { $('wz-gps').classList.remove('loading'); toast('Position indisponible : touchez la carte.', 'error'); }, { enableHighAccuracy: true, timeout: 15000 });
      };
      $('wz-snom').oninput = () => { if (d.siege) d.siege.nom = $('wz-snom').value; d.dirty = true; renderRecap(); };
      $('wz-city-on').onclick = () => { wz.cityOn = !wz.cityOn; $('wz-city-on').classList.toggle('primary', wz.cityOn); $('wz-city-on').classList.toggle('ghost', !wz.cityOn); $('wz-city-on').innerHTML = wz.cityOn ? `${ic('check')}Terminé : la carte place à nouveau le point de vente` : `${ic('plus')}Poser des emplacements sur la carte`; if (wz.cityOn) { $('wz-map').scrollIntoView({ behavior: 'smooth', block: 'center' }); toast('Touchez la carte pour poser chaque emplacement (100 m).', 'info'); } };
      $('wz-sem').oninput = () => { d.semaines = Math.max(1, Math.min(52, +$('wz-sem').value || 1)); renderRecap(); };
      $('wz-city').addEventListener('input', e => { const i = e.target.dataset.i; if (i != null) d.panneaux[i].nom = e.target.value; });
      $('wz-city').addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (b) { d.panneaux.splice(+b.dataset.del, 1); renderCity(); renderRecap(); } });
    }
    $('wz-etab').onclick = e => {
      const b = e.target.closest('[data-e]'); if (!b) return;
      d.etab = b.dataset.e; d.dirty = true;
      const E = etabOf(d.etab);
      if (!d.editId && E && E.lat && (!d.siege || !d.siegeManual)) { d.siege = { nom: E.nom, lat: E.lat, lon: E.lon }; }
      if (E) d.cat = E.cat;
      viewNouvelle();
    };
    $('wz-portee').onclick = e => { const b = e.target.closest('[data-v]'); if (!b) return; d.portee = b.dataset.v; $('wz-portee').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); const z = document.querySelector('.zones-mini span:last-child'); if (z) z.lastChild.textContent = 'Zone C : ' + (d.portee === 'pays' ? 'tout le pays' : 'toute la ville'); upd(); };
    $('wz-nom').oninput = () => { d.nom = $('wz-nom').value; d.dirty = true; renderRecap(); };
    $('wz-cta').onchange = () => { d.cta = $('wz-cta').value; upd(); };
    $('wz-imp').onclick = () => $('wz-vis').click();
    $('wz-vis').onchange = async () => {
      const f = $('wz-vis').files[0]; $('wz-vis').value = ''; if (!f || !wz.ed) return;
      try { const r = await loadImage(f, 1000, 800); wz.ed.setBgImage(r.data); if (!r.exact) toast(`Image de ${r.srcW} × ${r.srcH} px recadrée au format 1000 × 800.`, 'info', 5000); else toast('Affiche importée : ajoutez des textes ou des images si vous voulez.', 'success'); }
      catch (x) { toast(x.message, 'error'); }
    };
  }
  function draftCamp() {
    const d = st.draft;
    const cat = (etabOf(d.etab) || st.moi.profil).cat;
    return { modele: 'visuel', cta: d.cta, couleur: d.couleur, cat, image: d.edImage || null };
  }
  function renderPrev() { if ($('wz-prev')) $('wz-prev').innerHTML = campHtml(draftCamp(), etabName(st.draft.etab)); }
  function renderCity() {
    const d = st.draft, ul = $('wz-city'); if (!ul) return;
    ul.innerHTML = d.panneaux.map((p, i) => `<li><code>#${i + 1}</code><input value="${esc(p.nom)}" data-i="${i}" placeholder="Nom de l'emplacement (ex. Gare Sud)" maxlength="80"><button type="button" data-del="${i}" aria-label="Retirer l'emplacement ${i + 1}">${ic('close')}</button></li>`).join('');
    if (!wz.cityLayer) return;
    wz.cityLayer.clearLayers();
    d.panneaux.forEach((p, i) => { L.circle([p.lat, p.lon], { radius: 100, color: '#7c3aed', weight: 1.5, fillOpacity: .18, interactive: false }).addTo(wz.cityLayer); L.marker([p.lat, p.lon], { icon: pinIcon('#7c3aed', i + 1) }).addTo(wz.cityLayer); });
  }
  function problem() {
    const d = st.draft;
    if (!d.editId) {
      if (!d.siege || d.siege.lat == null) return 'Placez votre point de vente sur la carte.';
      if (!d.siege.nom || d.siege.nom.trim().length < 2) return 'Donnez un nom au point de vente.';
    }
    if (!d.etab && etabs().length) return 'Choisissez l\u2019établissement.';
    if (!wz.ed) return 'Préparez votre visuel.';
    return '';
  }
  function renderRecap() {
    const d = st.draft, R = $('wz-recap'); if (!R) return;
    const p = st.moi.profil, pb = problem();
    if (d.editId) {
      R.innerHTML = `<h2>Enregistrer</h2><p class="muted" style="margin:4px 0 12px">Aucun frais : seuls le visuel, le nom et la portée changent.</p>${pb ? `<p class="after bad">${esc(pb)}</p>` : ''}<button class="btn primary block" id="wz-go" ${pb ? 'disabled' : ''}>Enregistrer les modifications</button><button class="btn ghost block" id="wz-cancel" style="margin-top:8px">Annuler</button>`;
    } else {
      const ps = d.mois * tarif('siege').prix, n = d.panneaux.length, pc = cityPrice(n, d.semaines), tot = ps + pc, after = p.solde - tot;
      const packs = Math.floor(n / 5);
      R.innerHTML = `<h2>Récapitulatif</h2>
        <table><tr><td>Géopub@siège<br><small class="muted">${esc((d.siege && d.siege.nom) || 'point de vente')}</small><div class="dur" style="margin-top:6px"><input class="input" type="number" id="wz-mois" min="1" max="12" value="${d.mois}" style="min-height:36px;width:70px"><span class="muted" style="font-size:.84rem">mois</span></div></td><td>${F(ps)} F</td></tr>
        ${n ? `<tr><td>${n} emplacement${n > 1 ? 's' : ''} Géopub@city × ${d.semaines} sem.${packs ? `<br><small class="muted">dont ${packs} pack${packs > 1 ? 's' : ''} de 5</small>` : ''}</td><td>${F(pc)} F</td></tr>` : ''}
        <tr class="tot"><td>Total</td><td>${F(tot)} F</td></tr></table>
        <p class="after${after < 0 ? ' bad' : ''}">Solde : ${F(p.solde)} F → ${after < 0 ? `il manque ${F(-after)} F` : `${F(after)} F après paiement`}</p>
        ${pb ? `<p class="after bad">${esc(pb)}</p>` : ''}${wz.ed && wz.ed.empties() ? `<p class="after">${wz.ed.empties()} cadre${wz.ed.empties() > 1 ? 's' : ''} photo vide${wz.ed.empties() > 1 ? 's' : ''} : ${wz.ed.empties() > 1 ? 'ils n\u2019apparaîtront' : 'il n\u2019apparaîtra'} pas sur la pub (double-cliquez dessus pour ajouter la photo).</p>` : ''}
        <button class="btn primary block" id="wz-go" ${pb || after < 0 ? 'disabled' : ''}>Payer ${F(tot)} F et publier</button>
        ${after < 0 ? `<button class="btn ghost block" data-go="compte" style="margin-top:8px">Recharger mon solde</button>` : ''}
        <p class="hint">${st.moi.demo ? 'Démo : la campagne passe en ligne immédiatement.' : 'La campagne est vérifiée par ZUPA avant sa mise en ligne.'} Durée du siège : ${d.mois * 30} jours.</p>`;
      $('wz-mois').oninput = () => { d.mois = Math.max(1, Math.min(12, +$('wz-mois').value || 1)); const v = $('wz-mois').value; renderRecap(); const i = $('wz-mois'); i.focus(); i.value = v; };
    }
    $('wz-go').onclick = publish;
    if ($('wz-cancel')) $('wz-cancel').onclick = () => { st.draft = null; go('tableau'); };
  }
  async function publish() {
    const d = st.draft, pb = problem(); if (pb) { toast(pb, 'error'); return; }
    const b = $('wz-go'); b.classList.add('loading');
    if (wz.ed) { d.layout = wz.ed.get(); d.edImage = await wz.ed.export(); d.imgChanged = true; }
    const c = draftCamp();
    const body = { nom: (d.nom || d.titre || (d.siege && d.siege.nom) || 'Ma campagne').trim(), etablissement_id: d.etab || null, portee: d.portee, modele: c.modele, titre: c.titre, accroche: c.accroche, sous_titre: c.sous_titre, cta: c.cta, couleur: c.couleur };
    body.layout = d.layout;
    let r;
    if (d.editId) { if (d.imgChanged) body.image = c.image || ''; r = await rpc('zp_campagne_modifier', { p_id: d.editId, p: body }); }
    else { Object.assign(body, { image: c.image || '', siege: d.siege, mois: d.mois, semaines: d.semaines, panneaux: d.panneaux }); r = await rpc('zp_campagne_creer', { p: body }); }
    b.classList.remove('loading');
    if (!r.ok) { toast(errTxt(r), 'error', 7000); return; }
    toast(d.editId ? 'Campagne modifiée.' : st.moi.demo ? 'Campagne en ligne ! Elle s’affiche dans ZUPA autour de votre point de vente.' : 'Campagne envoyée : elle sera en ligne après vérification.', 'success', 6000);
    st.draft = null; await loadMoi(); go('tableau');
  }

  /* ---------- solde ---------- */
  async function viewCompte() {
    const p = st.moi.profil;
    $('view').innerHTML = `<div class="view-h"><div><h1>Mon solde</h1><p class="muted">Vos campagnes se paient avec ce solde.</p></div></div>${demoBand()}
      <div class="acc">
        <div class="wallet"><small>Solde disponible</small><b id="w-solde">${F(p.solde)} F</b>
          ${st.moi.demo ? `<button class="btn primary" id="w-demo">${ic('plus')}Recharger ${F(st.moi.recharge_demo)} F (démo)</button>` : ''}
          <p style="margin:14px 0 0;font-size:.82rem;opacity:.8">Bientôt : rechargez par Mobile Money.</p>
          <div class="mm"><span>Orange Money</span><span>MTN MoMo</span><span>Wave</span><span>Moov Money</span></div></div>
        <section class="card"><h2>Mouvements</h2><div id="mv" class="muted" style="margin-top:10px">Chargement…</div></section>
      </div>`;
    if ($('w-demo')) $('w-demo').onclick = async () => {
      const b = $('w-demo'); b.classList.add('loading');
      const r = await rpc('zp_recharger_demo'); b.classList.remove('loading');
      if (!r.ok) { toast(errTxt(r), 'error', 6000); return; }
      st.moi.profil.solde = r.data; renderSolde(); $('w-solde').textContent = F(r.data) + ' F'; toast('Solde rechargé (démonstration).', 'success'); loadMv();
    };
    loadMv();
  }
  async function loadMv() {
    const r = await rpc('zp_mouvements_liste'); if (!$('mv')) return;
    const L2 = r.ok ? r.data || [] : [];
    $('mv').className = '';
    $('mv').innerHTML = L2.length ? `<table class="mv">${L2.map(m => `<tr><td>${esc(m.libelle)}<small>${new Date(m.created_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</small></td><td class="${m.montant > 0 ? 'plus' : ''}">${m.montant > 0 ? '+' : '−'}${F(Math.abs(m.montant))} F</td></tr>`).join('')}</table>` : '<p class="muted">Aucun mouvement.</p>';
  }

  /* ---------- profil ---------- */
  function etabForm(e, neuf) {
    e = e || { nom: '', cat: 'shop', tel: '', whatsapp: true, adresse: '', logo: null };
    return `<label for="ef-nom">Nom de l'établissement</label><input class="input" id="ef-nom" required minlength="2" maxlength="60" value="${esc(e.nom)}" placeholder="ex. Quincaillerie du Port">
      <div class="row"><div><label for="ef-cat">Activité</label><select class="input" id="ef-cat">${CATS.map(([k, l]) => `<option value="${k}"${e.cat === k ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
      <div><label for="ef-tel">Téléphone</label><input class="input" id="ef-tel" inputmode="tel" value="${esc(e.tel || '')}" placeholder="07 07 07 07 07"></div></div>
      <label style="display:flex;gap:10px;align-items:center;font-weight:500;color:var(--text)"><input type="checkbox" id="ef-wa" ${e.whatsapp !== false ? 'checked' : ''} style="width:18px;height:18px">Ce numéro reçoit les messages WhatsApp</label>
      <label for="ef-adr">Adresse ou repère <small>(facultatif)</small></label><input class="input" id="ef-adr" maxlength="120" value="${esc(e.adresse || '')}" placeholder="ex. Treichville, avenue 16">
      <div class="logo-pick" style="margin-top:14px"><div class="lp" id="ef-lp">${e.logo ? `<img src="${e.logo}" alt="">` : ic('image')}</div><div><button class="btn sm ghost" type="button" id="ef-logo-b">${e.logo ? 'Changer le logo' : 'Ajouter un logo'}</button><p class="hint" style="margin-top:4px">Carré, 256 × 256 px. Il sert aussi dans l'éditeur de visuel.</p></div><input type="file" id="ef-logo" accept="image/*" hidden></div>
      ${neuf ? '' : `<label>Emplacement <small>(facultatif : il servira de point de vente par défaut)</small></label><div class="map" id="ef-map" style="height:220px"></div><p class="hint" id="ef-pos">${e.lat ? 'Touchez la carte pour déplacer le repère.' : 'Touchez la carte à l’endroit de l’établissement.'}</p>`}`;
  }
  function bindEtabForm(e, root) {
    const f = { logo: e ? e.logo : null, logoChanged: false, lat: e && e.lat, lon: e && e.lon };
    root.querySelector('#ef-logo-b').onclick = () => root.querySelector('#ef-logo').click();
    root.querySelector('#ef-logo').onchange = async () => { try { const r = await loadImage(root.querySelector('#ef-logo').files[0], 256, 256, 150000); f.logo = r.data; f.logoChanged = true; root.querySelector('#ef-lp').innerHTML = `<img src="${f.logo}" alt="">`; } catch (x) { toast(x.message, 'error'); } };
    if (root.querySelector('#ef-map')) {
      const m = mkMap('ef-map', f.lat ? [f.lat, f.lon] : [5.33, -4.02], f.lat ? 16 : 12);
      let mk = f.lat ? L.marker([f.lat, f.lon], { icon: pinIcon('#d93a2b') }).addTo(m) : null;
      m.on('click', ev => { f.lat = +ev.latlng.lat.toFixed(6); f.lon = +ev.latlng.lng.toFixed(6); if (mk) mk.setLatLng(ev.latlng); else mk = L.marker(ev.latlng, { icon: pinIcon('#d93a2b') }).addTo(m); root.querySelector('#ef-pos').textContent = 'Emplacement enregistré avec l’établissement.'; });
    }
    return () => {
      const tel = root.querySelector('#ef-tel').value.replace(/\D/g, '').replace(/^225(?=\d{10}$)/, '');
      const nom = root.querySelector('#ef-nom').value.trim();
      if (nom.length < 2) { toast('Indiquez le nom de l’établissement.', 'error'); return null; }
      if (tel && !/^\d{8,12}$/.test(tel)) { toast('Numéro de téléphone invalide.', 'error'); return null; }
      const body = { nom, cat: root.querySelector('#ef-cat').value, tel, whatsapp: root.querySelector('#ef-wa').checked, adresse: root.querySelector('#ef-adr').value.trim() };
      if (e && e.id) body.id = e.id;
      if (f.logoChanged) body.logo = f.logo || '';
      if (f.lat) { body.lat = f.lat; body.lon = f.lon; }
      return body;
    };
  }
  function openEtab(e) {
    modal(`<h2>${e ? 'Modifier l’établissement' : 'Nouvel établissement'}</h2><p class="muted" style="margin:0">Quincaillerie, boulangerie, restaurant… chaque établissement a ses propres campagnes.</p>${etabForm(e)}
      <div class="modal-acts">${e ? '<button class="btn ghost danger" id="ef-del" type="button">Supprimer</button><span style="flex:1"></span>' : ''}<button class="btn ghost" data-close>Annuler</button><button class="btn primary" id="ef-ok" type="button">Enregistrer</button></div>`, (m, close) => {
      const read = bindEtabForm(e, m);
      m.querySelector('#ef-ok').onclick = async () => {
        const body = read(); if (!body) return;
        const b = m.querySelector('#ef-ok'); b.classList.add('loading');
        const r = await rpc('zp_etab_enregistrer', { p: body }); b.classList.remove('loading');
        if (!r.ok) { toast(errTxt(r), 'error', 6000); return; }
        close(); await loadMoi(); toast(e ? 'Établissement modifié.' : 'Établissement ajouté.', 'success'); viewProfil();
      };
      if (m.querySelector('#ef-del')) m.querySelector('#ef-del').onclick = async () => {
        if (etabs().length <= 1) { toast('Gardez au moins un établissement.', 'error'); return; }
        if (!confirm(`Supprimer « ${e.nom} » ?`)) return;
        const r = await rpc('zp_etab_supprimer', { p_id: e.id });
        if (!r.ok) { toast(errTxt(r), 'error', 7000); return; }
        close(); await loadMoi(); toast('Établissement supprimé.', 'success'); viewProfil();
      };
    });
  }
  function viewProfil() {
    const p = st.moi.profil, neuf = !p;
    if (neuf) {
      $('view').innerHTML = `<div class="view-h"><div><h1>Bienvenue sur ZUPA PUB</h1><p class="muted">Présentez-vous, puis votre premier établissement. Vous pourrez en ajouter d'autres ensuite (quincaillerie, boulangerie…).</p></div></div>
        ${st.moi.demo ? `<div class="demo-band">${ic('wallet')}<span><b>Démo :</b> un crédit de bienvenue est ajouté à votre solde dès l'enregistrement.</span></div>` : ''}
        <form class="card" id="pf" style="max-width:720px">
          <h2>Vous</h2>
          <div class="row"><div><label for="pf-nom">Nom de l'annonceur <small>(vous ou votre entreprise)</small></label><input class="input" id="pf-nom" required minlength="2" maxlength="60" value="${esc(ses.name || '')}" placeholder="ex. Groupe Koné"></div>
          <div><label for="pf-tel">Votre téléphone</label><input class="input" id="pf-tel" inputmode="tel" placeholder="07 07 07 07 07"></div></div>
          <h2 style="margin-top:22px">Votre premier établissement</h2>
          ${etabForm(null, true)}
          <div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap"><button class="btn primary" type="submit" id="pf-ok">Enregistrer et continuer</button><button class="btn ghost" type="button" id="pf-out">Se déconnecter</button></div>
        </form>`;
      const read = bindEtabForm(null, $('pf'));
      $('pf-out').onclick = () => logout();
      $('pf').onsubmit = async ev => {
        ev.preventDefault();
        const eb = read(); if (!eb) return;
        const nom = $('pf-nom').value.trim() || eb.nom, tel = $('pf-tel').value.replace(/\D/g, '').replace(/^225(?=\d{10}$)/, '') || eb.tel;
        if (tel && !/^\d{8,12}$/.test(tel)) { toast('Numéro de téléphone invalide.', 'error'); return; }
        $('pf-ok').classList.add('loading');
        const r = await rpc('zp_profil', { p: { nom, tel, cat: eb.cat, whatsapp: eb.whatsapp, adresse: eb.adresse, etablissement: eb } });
        $('pf-ok').classList.remove('loading');
        if (!r.ok) { toast(errTxt(r), 'error', 6000); return; }
        st.moi = r.data; renderSolde();
        toast(`Compte créé.${st.moi.demo ? ` ${F(st.moi.profil.solde)} F de crédit de démonstration offerts.` : ''}`, 'success', 6000);
        go('nouvelle');
      };
      return;
    }
    $('view').innerHTML = `<div class="view-h"><div><h1>Profil</h1><p class="muted">Votre compte annonceur et vos établissements.</p></div></div>
      <section class="card" style="margin-bottom:16px"><div class="view-h" style="margin:0"><div><h2>Mes établissements</h2><p class="muted" style="margin:2px 0 0">Chaque publicité s'affiche au nom d'un établissement, avec son téléphone.</p></div><button class="btn primary" type="button" id="et-add">${ic('plus')}Ajouter</button></div>
        <div class="etabs">${etabs().map(e => `<button type="button" class="etab" data-et="${esc(e.id)}" style="border:0;text-align:left;cursor:pointer"><span class="lp">${e.logo ? `<img src="${e.logo}" alt="">` : ic(CAT_IC[e.cat] || 'shop')}</span><div><b>${esc(e.nom)}</b><small>${esc((CATS.find(c => c[0] === e.cat) || ['', ''])[1])}${e.tel ? ' · ' + esc(e.tel) : ''}</small><small>${(st.camps || []).filter(c => c.etablissement_id === e.id).length} campagne(s)</small></div>${ic('edit')}</button>`).join('')}<button type="button" class="etab-add" id="et-add2">${ic('plus')} Nouvel établissement</button></div>
      </section>
      <form class="card" id="pf" style="max-width:720px">
        <h2>Compte annonceur</h2>
        <div class="row"><div><label for="pf-nom">Nom de l'annonceur</label><input class="input" id="pf-nom" required minlength="2" maxlength="60" value="${esc(p.nom)}"></div>
        <div><label for="pf-tel">Téléphone</label><input class="input" id="pf-tel" inputmode="tel" value="${esc(p.tel || '')}"></div></div>
        <label>E-mail de connexion</label><input class="input" value="${esc(p.email || ses.email || '')}" disabled>
        <label for="pf-desc">Présentation <small>(facultatif)</small></label><textarea class="input" id="pf-desc" maxlength="400">${esc(p.description || '')}</textarea>
        <div style="margin-top:16px"><button class="btn primary" type="submit" id="pf-ok">Enregistrer</button></div>
      </form>`;
    $('et-add').onclick = $('et-add2').onclick = () => openEtab(null);
    $('view').querySelectorAll('[data-et]').forEach(b => b.onclick = () => openEtab(etabs().find(e => e.id === b.dataset.et)));
    $('pf').onsubmit = async ev => {
      ev.preventDefault();
      const tel = $('pf-tel').value.replace(/\D/g, '').replace(/^225(?=\d{10}$)/, '');
      if ($('pf-nom').value.trim().length < 2) { toast('Indiquez votre nom.', 'error'); return; }
      if (tel && !/^\d{8,12}$/.test(tel)) { toast('Numéro de téléphone invalide.', 'error'); return; }
      $('pf-ok').classList.add('loading');
      const r = await rpc('zp_profil', { p: { nom: $('pf-nom').value.trim(), tel, cat: p.cat, whatsapp: p.whatsapp, adresse: p.adresse, description: $('pf-desc').value.trim() } });
      $('pf-ok').classList.remove('loading');
      if (!r.ok) { toast(errTxt(r), 'error', 6000); return; }
      st.moi = r.data; renderSolde(); toast('Profil enregistré.', 'success');
    };
  }

  /* ---------- démarrage ---------- */
  window.addEventListener('hashchange', async () => { if (/access_token=/.test(location.hash) && await fromUrl()) showApp(); });
  paintIcons();
  (async () => {
    await fromUrl();
    if (ses && ses.refresh) await showApp(); else showPublic();
  })();
})();
