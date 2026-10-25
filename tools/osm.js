/* ==========================================================================
   ZUPA — conversion des lignes de bus OpenStreetMap vers www/data/bus.js
   (rues-cote-d-ivoire.openalfa.com affiche ces mêmes données OSM : le numéro
   à la fin de ses adresses est l'identifiant de la relation OSM)
   ========================================================================== */
const OsmConvert = (() => {
  'use strict';
  // Grand Abidjan (Anyama, Bingerville, Songon, Port-Bouët compris) : sud, ouest, nord, est
  const BBOX = [5.15, -4.30, 5.62, -3.70];
  const ROUTES = `rel["type"="route"]["route"~"^(bus|trolleybus|minibus|share_taxi|ferry)$"](${BBOX.join(',')})`;
  // 1) trajets (un par sens) + leurs arrêts — la requête qui fonctionne depuis le début
  const QUERY = `[out:json][timeout:240];
${ROUTES};
out body;
node(r);
out body qt;`;
  // 2) fiches « route_master » qui regroupent aller et retour : tarif, fréquence, horaires (facultatif)
  const QUERY_MASTER = `[out:json][timeout:180];
${ROUTES};
rel(br)["type"="route_master"];
out body;`;
  const ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
  ];

  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const num = v => { const m = /(\d+(?:[.,]\d+)?)/.exec(String(v || '')); return m ? Math.round(parseFloat(m[1].replace(',', '.'))) : null; };
  // fréquence OSM « interval » : « 30 », « 00:30 », « 1:00 » -> minutes
  const minutes = v => { const s = String(v || '').trim(); if (!s) return null; const m = /^(\d{1,2}):(\d{2})/.exec(s); const n = m ? +m[1] * 60 + +m[2] : num(s); return n && n > 0 && n <= 240 ? n : null; };

  function kindOf(t) {
    const n = (t.name || '').toLowerCase();
    if (t.route === 'ferry' || /bateau|ferry/.test(n)) return 'bateau';
    if (/^\s*gbaka/.test(n)) return 'gbaka';
    if (/woro/.test(n)) return 'woro';
    if (t.route === 'minibus') return 'gbaka';
    if (t.route === 'share_taxi') return 'woro';
    return 'bus';
  }
  function titleOf(t) {
    if (t.from && t.to) return `${t.from.trim()} → ${t.to.trim()}`;
    const n = (t.name || '').replace(/\s*(->|=>|-->)\s*/g, ' → ');
    const i = n.indexOf(':');
    return (i >= 0 ? n.slice(i + 1) : n).trim();
  }
  function isDead(t) {
    return !!(t.disused || t['disused:route'] || t.construction || t['construction:route'] || t.abandoned ||
      /construction|en projet|abandonn/i.test(t.name || ''));
  }
  const padRef = r => /^\d$/.test(r) ? '0' + r : r;

  async function download(onStatus, query = QUERY) {
    let lastErr;
    // deux tours sur tous les serveurs (les 504 d'Overpass sont souvent passagers)
    for (const [round, url] of [...ENDPOINTS.map(u => [0, u]), ...ENDPOINTS.map(u => [1, u])]) {
      if (round && url === ENDPOINTS[0]) await new Promise(r => setTimeout(r, 45000));
      try {
        onStatus && onStatus(`Interrogation de ${new URL(url).host}…`);
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 260000);
        const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(query),
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: ctl.signal });
        clearTimeout(timer);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (!j || !Array.isArray(j.elements)) throw new Error('réponse inattendue');
        return j;
      } catch (e) { lastErr = e; onStatus && onStatus(`Échec sur ${new URL(url).host} (${e.message || e}), essai suivant…`); }
    }
    throw lastErr || new Error('aucun serveur disponible');
  }

  function convert(json) {
    const nodes = new Map(), master = new Map();
    json.elements.forEach(e => { if (e.type === 'node') nodes.set(e.id, e); });
    // fiches route_master : leurs informations valent pour chaque trajet qu'elles regroupent
    json.elements.forEach(e => { if (e.type === 'relation' && e.tags && e.tags.type === 'route_master') (e.members || []).forEach(m => { if (m.type === 'relation') master.set(m.ref, e.tags); }); });
    const lines = [], skipped = [];
    for (const r of json.elements) {
      if (r.type !== 'relation' || (r.tags && r.tags.type === 'route_master')) continue;
      const mt = master.get(r.id) || {};
      const t = Object.assign({}, ...['charge', 'interval', 'opening_hours', 'operator', 'network'].filter(k => mt[k]).map(k => ({ [k]: mt[k] })), r.tags || {});
      if (isDead(t)) { skipped.push({ id: r.id, name: t.name, reason: 'ligne en construction ou abandonnée' }); continue; }
      const mem = (r.members || []).filter(m => m.type === 'node');
      const pick = re => mem.filter(m => re.test(m.role || ''));
      let sel = pick(/^stop/);
      if (sel.length < 2) sel = pick(/^platform/);
      if (sel.length < 2) sel = mem;
      const stops = [];
      for (const m of sel) {
        const n = nodes.get(m.ref);
        if (!n || !Number.isFinite(n.lat) || !Number.isFinite(n.lon)) continue;
        const name = n.tags && (n.tags.name || n.tags['name:fr'] || n.tags.official_name);
        if (!name) continue;
        const nm = name.trim().replace(/\s+/g, ' ');
        if (stops.length && stops[stops.length - 1].name === nm) continue;
        stops.push({ name: nm, lat: +n.lat.toFixed(6), lon: +n.lon.toFixed(6) });
      }
      if (stops.length < 2) { skipped.push({ id: r.id, name: t.name, reason: 'moins de 2 arrêts nommés' }); continue; }
      const kind = kindOf(t);
      const title = titleOf(t) || `${stops[0].name} → ${stops[stops.length - 1].name}`;
      let ref = null, name;
      if (kind === 'bus') {
        ref = padRef(String(t.ref || (/(\d{1,4})/.exec(t.name || '') || [])[1] || '?').trim());
        name = `Bus ${ref}: ${title}`;
      } else if (kind === 'bateau') {
        ref = t.ref ? String(t.ref).trim() : null;
        name = `Bateau${ref ? ' ' + ref : ''}: ${title}`;
      } else {
        name = `${kind === 'gbaka' ? 'Gbaka' : 'Wôrô-wôrô'}: ${title}`;
      }
      const cost = num(t.charge) || (kind === 'bus' && /^\d+$/.test(ref) ? (+ref >= 200 ? 500 : 200) : null);
      const line = { name, ref, kind, cost, osm: r.id, url: `https://www.openstreetmap.org/relation/${r.id}`, stops };
      const every = minutes(t.interval); if (every) line.every = every;
      if (t.opening_hours) line.hours = String(t.opening_hours).trim().slice(0, 80);
      if (t.operator) line.operator = String(t.operator).trim().slice(0, 40);
      lines.push(line);
    }
    numberUnnumbered(lines);
    return { lines, skipped };
  }

  /* Gbakas / woro-woros : pas de numéro officiel -> G1, G2… / W1, W2…
     L'aller et le retour (mêmes extrémités dans le titre « A → B ») partagent le numéro. */
  function numberUnnumbered(lines) {
    const ends = l => {
      const parts = (l.name.split(':').slice(1).join(':') || '').split('→').map(norm).filter(Boolean);
      return parts.length >= 2 ? [parts[0], parts[parts.length - 1]].sort().join('|')
        : [norm(l.stops[0].name), norm(l.stops[l.stops.length - 1].name)].sort().join('|');
    };
    for (const kind of ['gbaka', 'woro', 'bateau']) {
      const list = lines.filter(l => l.kind === kind).sort((a, b) => ends(a).localeCompare(ends(b)) || a.name.localeCompare(b.name, 'fr'));
      const refs = new Map();
      list.forEach(l => {
        const k = ends(l);
        if (kind === 'bateau' && l.ref) return;
        if (!refs.has(k)) refs.set(k, ({ gbaka: 'G', woro: 'W', bateau: 'B' })[kind] + (refs.size + 1));
        l.ref = refs.get(k);
        if (kind === 'bateau') l.name = l.name.replace(/^Bateau[^:]*:/, `Bateau ${l.ref}:`);
      });
    }
    // bus sans numéro : SN1, SN2… (aller et retour ensemble)
    const sn = new Map();
    lines.filter(l => l.kind === 'bus' && (!l.ref || l.ref === '?' || /^s\/n$/i.test(l.ref))).forEach(l => {
      const k = ends(l);
      if (!sn.has(k)) sn.set(k, 'SN' + (sn.size + 1));
      l.ref = sn.get(k);
      l.name = l.name.replace(/^Bus [^:]*:/, `Bus ${l.ref}:`);
    });
    return lines;
  }

  const idOf = l => Number(l.osm || ((/-(\d+)$/.exec(l.url || '') || [])[1]) || 0);

  /* Fusion : les lignes OSM remplacent celles de même identifiant (en gardant l'ancien nom pour ne pas
     casser les arrêts ajoutés par les utilisateurs), les autres anciennes lignes sont conservées. */
  function merge(existing, fresh, opts = {}) {
    const keepKinds = opts.kinds || ['bus', 'gbaka', 'woro'];
    const f = fresh.filter(l => keepKinds.includes(l.kind || 'bus'));
    const byId = new Map(existing.map(l => [idOf(l), l]));
    const freshIds = new Set(f.map(l => l.osm));
    const added = [], updated = [];
    const out = f.map(l => {
      const old = byId.get(l.osm);
      if (old) { updated.push(l); return Object.assign({}, l, { name: old.name, cost: l.cost != null ? l.cost : old.cost }); }
      added.push(l); return l;
    });
    const kept = existing.filter(l => !freshIds.has(idOf(l)));
    return { lines: out.concat(kept), added, updated, kept };
  }

  function extractFromIndex(html) {
    const open = '<script type="application/json" id="bus-data">';
    const a = html.indexOf(open);
    if (a < 0) throw new Error('ce fichier ne contient pas de données MONBUS');
    const b = html.indexOf('<\/script>', a);
    return { data: JSON.parse(html.slice(a + open.length, b)), a: a + open.length, b };
  }
  function injectIntoIndex(html, lines) {
    const { a, b } = extractFromIndex(html);
    const json = JSON.stringify(lines).replace(/<\//g, '<\\/');
    return html.slice(0, a) + json + html.slice(b);
  }

  /* Lecture / écriture de www/data/bus.js */
  function readBusFile(text) {
    const t = String(text).trim();
    if (/^[\[{]/.test(t)) { const j = JSON.parse(t); return Array.isArray(j) ? j : j.lines; }
    const a = t.indexOf('['), b = t.lastIndexOf(']');
    if (!/ZUPA_BUS/.test(t) || a < 0 || b < a) throw new Error('fichier bus.js ZUPA attendu');
    return JSON.parse(t.slice(a, b + 1));
  }
  function writeBusFile(lines) {
    const slim = lines.map(l => Object.assign({ name: l.name, ref: l.ref }, l.kind && l.kind !== 'bus' ? { kind: l.kind } : {}, { cost: l.cost ?? null, osm: l.osm || null },
      l.every ? { every: l.every } : {}, l.hours ? { hours: l.hours } : {}, l.operator ? { operator: l.operator } : {},
      { stops: l.stops.map(s => ({ name: s.name, lat: s.lat, lon: s.lon })) }));
    return "/* ZUPA — bus SOTRA, gbaka, wôrô-wôrô et bateaux-bus d'Abidjan (© contributeurs OpenStreetMap, ODbL) */\nwindow.ZUPA_BUS = " + JSON.stringify(slim) + ';\n';
  }

  return { BBOX, QUERY, QUERY_MASTER, download, convert, merge, readBusFile, writeBusFile, numberUnnumbered, extractFromIndex, injectIntoIndex, idOf };
})();
if (typeof module !== 'undefined') module.exports = OsmConvert;
