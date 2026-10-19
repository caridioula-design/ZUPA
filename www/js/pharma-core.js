/* ==========================================================================
   ZUPA — pharmacies : données OpenStreetMap, horaires, pharmacies de garde
   (sans DOM : utilisé par l'application et par scripts/fetch-pharmacies.mjs)
   ========================================================================== */
const PharmaCore = (() => {
  'use strict';

  // Grand Abidjan : sud, ouest, nord, est
  const BBOX = [5.15, -4.30, 5.62, -3.70];

  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[’'`]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
  // « Pharmacie de la Paix » ≈ « Pharmacie la Paix » ≈ « PHCIE DE LA PAIX »
  const STOP = new Set(['pharmacie', 'pharmacy', 'phcie', 'pharma', 'ph', 'de', 'du', 'des', 'la', 'le', 'les', 'l', 'd', 'et', 'grande', 'nouvelle']);
  const nameKey = s => norm(s).split(' ').filter(w => w && !STOP.has(w)).join(' ');

  const RAD = Math.PI / 180;
  const haversine = (a, b, c, d) => {
    const x = Math.sin((c - a) * RAD / 2) ** 2 + Math.cos(a * RAD) * Math.cos(c * RAD) * Math.sin((d - b) * RAD / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(x)));
  };

  /* ---------- Requêtes Overpass ---------- */
  const queryBBox = (bbox = BBOX) => `[out:json][timeout:120];
(node["amenity"="pharmacy"](${bbox.join(',')});way["amenity"="pharmacy"](${bbox.join(',')}););
out center tags;`;
  const queryAround = (lat, lon, m = 4000) => `[out:json][timeout:25];
(node["amenity"="pharmacy"](around:${m},${lat},${lon});way["amenity"="pharmacy"](around:${m},${lat},${lon}););
out center tags;`;

  function fromOsm(json) {
    const out = [];
    for (const e of (json && json.elements) || []) {
      const lat = e.lat ?? (e.center && e.center.lat), lon = e.lon ?? (e.center && e.center.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      const t = e.tags || {};
      if (t.disused || t['disused:amenity'] || t.abandoned) continue;
      let name = (t.name || t['name:fr'] || t.brand || '').trim().replace(/\s+/g, ' ');
      if (!name) name = 'Pharmacie';
      else if (!/pharma|phcie/i.test(name)) name = 'Pharmacie ' + name;
      const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
      out.push({
        id: e.type[0] + e.id, name,
        lat: +lat.toFixed(6), lon: +lon.toFixed(6),
        phone: (t.phone || t['contact:phone'] || t['contact:mobile'] || '').trim() || null,
        street: street || t['addr:place'] || null,
        commune: (t['addr:city'] || t['addr:suburb'] || t['addr:district'] || t['is_in:city'] || '').trim() || null,
        hours: (t.opening_hours || '').trim() || null,
        operator: (t.operator || '').trim() || null
      });
    }
    return out;
  }

  /* ---------- Horaires (sous-ensemble du format opening_hours d'OSM) ---------- */
  const DAYS = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'];
  function parseDays(tok) {
    const set = new Set();
    for (const part of tok.split(',')) {
      const m = /^(mo|tu|we|th|fr|sa|su)(?:-(mo|tu|we|th|fr|sa|su))?$/.exec(part.trim());
      if (!m) return null;
      let a = DAYS.indexOf(m[1]); const b = DAYS.indexOf(m[2] || m[1]);
      set.add(a);
      while (a !== b) { a = (a + 1) % 7; set.add(a); }
    }
    return set;
  }
  const toMin = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(t); return m ? (+m[1]) * 60 + (+m[2]) : NaN; };

  /* Retourne { open: true/false/null, text } pour une date donnée */
  function openingStatus(hours, date = new Date()) {
    if (!hours) return { open: null };
    const h = hours.trim();
    if (/^24\/7$/.test(h)) return { open: true, allDay: true };
    const week = Array.from({ length: 7 }, () => null); // jour -> liste d'intervalles [deb, fin] ou []
    let understood = false;
    for (let rule of h.split(';')) {
      rule = rule.trim().toLowerCase();
      if (!rule) continue;
      let days = new Set([0, 1, 2, 3, 4, 5, 6]), rest = rule;
      const m = /^([a-z,\- ]+?)\s+(.*)$/.exec(rule);
      if (m && /^(mo|tu|we|th|fr|sa|su)/.test(m[1])) {
        const d = parseDays(m[1].replace(/\s+/g, ''));
        if (!d) continue;
        days = d; rest = m[2];
      } else if (/^(ph|sh|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|easter|week)/.test(rule)) continue;
      let iv;
      if (/^(off|closed)$/.test(rest)) iv = [];
      else if (rest === '24/7' || rest === '00:00-24:00') iv = [[0, 1440]];
      else {
        iv = [];
        for (const span of rest.split(',')) {
          const p = /^(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\+?$/.exec(span.trim());
          if (!p) { iv = null; break; }
          iv.push([toMin(p[1]), toMin(p[2])]);
        }
        if (!iv) continue;
      }
      days.forEach(d => { week[d] = iv; });
      understood = true;
    }
    if (!understood) return { open: null };
    const day = date.getDay(), now = date.getHours() * 60 + date.getMinutes();
    const prev = (day + 6) % 7;
    const inToday = (week[day] || []).some(([a, b]) => b > a ? now >= a && now < b : now >= a);
    const fromYesterday = (week[prev] || []).some(([a, b]) => b <= a && now < b); // ex. 20:00-08:00
    const open = inToday || fromYesterday;
    // prochaine fermeture / ouverture du jour, pour l'affichage
    let next = null;
    if (open) {
      const cur = (week[day] || []).find(([a, b]) => b > a ? now >= a && now < b : now >= a) || (week[prev] || []).find(([a, b]) => b <= a && now < b);
      if (cur && !(cur[0] === 0 && cur[1] >= 1440)) next = { close: cur[1] % 1440 };
    } else {
      const later = (week[day] || []).filter(([a]) => a > now).sort((x, y) => x[0] - y[0])[0];
      if (later) next = { opens: later[0] };
    }
    const allDay = (week[day] || []).some(([a, b]) => a === 0 && b >= 1440);
    return { open, allDay, next, known: week[day] !== null };
  }
  const fmtHM = m => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}h${String(m % 60).padStart(2, '0')}`;

  /* ---------- Pharmacies de garde ----------
     gardes.json : { du: "AAAA-MM-JJ", au: "AAAA-MM-JJ", source, maj, pharmacies: [{ nom, commune, tel, lat?, lon?, osm? }] } */
  const dayStr = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  function gardeState(g, date = new Date()) {
    if (!g || !g.du || !g.au || !Array.isArray(g.pharmacies) || !g.pharmacies.length) return 'none';
    const t = dayStr(date);
    if (t < g.du) return 'future';
    if (t > g.au) return 'expired';
    return 'current';
  }

  /* Associe les pharmacies de garde aux pharmacies connues (par identifiant OSM, nom ou position).
     Retourne la liste complète enrichie de .garde (et les pharmacies de garde inconnues ajoutées). */
  function applyGardes(list, g) {
    const out = list.map(p => Object.assign({}, p, { garde: null }));
    if (!g || !Array.isArray(g.pharmacies)) return out;
    const byId = new Map(out.map(p => [p.id, p]));
    const byKey = new Map();
    out.forEach(p => { const k = nameKey(p.name); if (!k) return; if (!byKey.has(k)) byKey.set(k, []); byKey.get(k).push(p); });
    g.pharmacies.forEach((e, i) => {
      const k = nameKey(e.nom);
      let p = e.osm && byId.get(e.osm);
      if (!p && k) {
        const cands = byKey.get(k) || [];
        if (cands.length === 1) p = cands[0];
        else if (cands.length > 1) {
          // homonymes : on prend la plus proche des coordonnées données, sinon celle de la bonne commune
          if (Number.isFinite(e.lat)) p = cands.slice().sort((a, b) => haversine(a.lat, a.lon, e.lat, e.lon) - haversine(b.lat, b.lon, e.lat, e.lon))[0];
          else if (e.commune) p = cands.find(c => norm(c.commune).includes(norm(e.commune))) || null;
        }
      }
      if (!p && Number.isFinite(e.lat) && Number.isFinite(e.lon)) {
        p = out.find(c => haversine(c.lat, c.lon, e.lat, e.lon) < 0.05) || null;
        if (!p) {
          p = { id: 'g' + i, name: /pharma/i.test(e.nom) ? e.nom : 'Pharmacie ' + e.nom, lat: e.lat, lon: e.lon, phone: e.tel || null, street: e.adresse || null, commune: e.commune || null, hours: null, operator: null };
          out.push(p);
        }
      }
      if (!p) { // position inconnue : affichée sans distance
        p = { id: 'g' + i, name: /pharma/i.test(e.nom) ? e.nom : 'Pharmacie ' + e.nom, lat: null, lon: null, phone: e.tel || null, street: e.adresse || null, commune: e.commune || null, hours: null, operator: null };
        out.push(p);
      }
      p.garde = { commune: e.commune || null, tel: e.tel || null };
      if (!p.phone && e.tel) p.phone = e.tel;
      if (!p.commune && e.commune) p.commune = e.commune;
    });
    return out;
  }

  /* Fusionne deux listes (données intégrées + données récentes), sans doublon */
  function mergeLists(a, b) {
    const m = new Map();
    for (const p of a || []) m.set(p.id, p);
    for (const p of b || []) m.set(p.id, Object.assign({}, m.get(p.id) || {}, p));
    return [...m.values()];
  }

  /* Texte d'une liste de garde collée (une pharmacie par ligne) -> entrées gardes.json
     Formats acceptés : « Pharmacie X - Commune - 27 22 xx xx xx » ou lignes de titre de commune « COCODY » */
  function parseGardeText(text) {
    const out = [];
    let commune = null;
    for (let line of String(text || '').split(/\r?\n/)) {
      line = line.replace(/^[\s•*\-–·\d.)]+(?=[A-Za-zÀ-ÿ])/, '').trim();
      if (!line) continue;
      const phoneM = line.match(/(\+?225[\s.]?)?(\d{2}[\s.]?){4}\d{2}/);
      const isTitle = !phoneM && !/pharma|phcie/i.test(line) && line.length < 40 && line === line.toUpperCase();
      if (isTitle) { commune = line.replace(/[:\-–]+$/, '').trim().toLowerCase().replace(/(^|[\s-])\S/g, c => c.toUpperCase()); continue; }
      const tel = phoneM ? phoneM[0].replace(/[^\d+]/g, '').replace(/^(\d{10})$/, '$1') : null;
      let rest = phoneM ? line.replace(phoneM[0], '') : line;
      const parts = rest.split(/\s+[-–|:]\s+|\s*\|\s*|\t+/).map(x => x.trim()).filter(Boolean);
      const nom = (parts.shift() || '').replace(/[,;:\-–]+$/, '').trim();
      if (!nom) continue;
      out.push({ nom, commune: commune || null, adresse: parts.join(', ') || null, tel });
    }
    return out;
  }

  return { BBOX, norm, nameKey, haversine, queryBBox, queryAround, fromOsm, openingStatus, fmtHM, gardeState, applyGardes, mergeLists, parseGardeText, dayStr };
})();
if (typeof module !== 'undefined') module.exports = PharmaCore;
