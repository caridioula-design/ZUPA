/* ==========================================================================
   ZUPA — conversion des lignes de bus OpenStreetMap vers www/data/bus.js
   (rues-cote-d-ivoire.openalfa.com affiche ces mêmes données OSM : le numéro
   à la fin de ses adresses est l'identifiant de la relation OSM)
   ========================================================================== */
const OsmConvert = (() => {
  'use strict';
  // Grand Abidjan (Anyama, Bingerville, Songon, Port-Bouët compris) : sud, ouest, nord, est
  const BBOX = [5.15, -4.30, 5.62, -3.70];
  const QUERY = `[out:json][timeout:240];
rel["type"="route"]["route"~"^(bus|trolleybus|minibus|share_taxi)$"](${BBOX.join(',')});
out body;
node(r);
out body qt;`;
  const ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
  ];

  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const num = v => { const m = /(\d+(?:[.,]\d+)?)/.exec(String(v || '')); return m ? Math.round(parseFloat(m[1].replace(',', '.'))) : null; };

  function kindOf(t) {
    const n = (t.name || '').toLowerCase();
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

  async function download(onStatus) {
    let lastErr;
    for (const url of ENDPOINTS) {
      try {
        onStatus && onStatus(`Interrogation de ${new URL(url).host}…`);
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 260000);
        const r = await fetch(url, { method: 'POST', body: 'data=' + encodeURIComponent(QUERY),
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
    const nodes = new Map();
    json.elements.forEach(e => { if (e.type === 'node') nodes.set(e.id, e); });
    const lines = [], skipped = [];
    for (const r of json.elements) {
      if (r.type !== 'relation') continue;
      const t = r.tags || {};
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
      } else {
        name = `${kind === 'gbaka' ? 'Gbaka' : 'Wôrô-wôrô'}: ${title}`;
      }
      const cost = num(t.charge) || (kind === 'bus' && /^\d+$/.test(ref) ? (+ref >= 200 ? 500 : 200) : null);
      lines.push({ name, ref, kind, cost, osm: r.id, url: `https://www.openstreetmap.org/relation/${r.id}`, stops });
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
    for (const kind of ['gbaka', 'woro']) {
      const list = lines.filter(l => l.kind === kind).sort((a, b) => ends(a).localeCompare(ends(b)) || a.name.localeCompare(b.name, 'fr'));
      const refs = new Map();
      list.forEach(l => {
        const k = ends(l);
        if (!refs.has(k)) refs.set(k, (kind === 'gbaka' ? 'G' : 'W') + (refs.size + 1));
        l.ref = refs.get(k);
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
      if (old) { updated.push(l); return Object.assign({}, l, { name: old.name, cost: old.cost != null ? old.cost : l.cost }); }
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
    const slim = lines.map(l => Object.assign({ name: l.name, ref: l.ref }, l.kind && l.kind !== 'bus' ? { kind: l.kind } : {}, { cost: l.cost ?? null, osm: l.osm || null,
      stops: l.stops.map(s => ({ name: s.name, lat: s.lat, lon: s.lon })) }));
    return "/* ZUPA — lignes de bus SOTRA, gbaka et wôrô-wôrô d'Abidjan (© contributeurs OpenStreetMap, ODbL) */\nwindow.ZUPA_BUS = " + JSON.stringify(slim) + ';\n';
  }

  return { BBOX, QUERY, download, convert, merge, readBusFile, writeBusFile, numberUnnumbered, extractFromIndex, injectIntoIndex, idOf };
})();
if (typeof module !== 'undefined') module.exports = OsmConvert;
