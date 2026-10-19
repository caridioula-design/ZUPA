/* ==========================================================================
   MONBUS — moteur d'itinéraires (sans DOM, testable seul)
   ========================================================================== */
const Core = (() => {
  'use strict';

  const CFG = {
    WALK_KMH: 4.5,          // vitesse de marche
    BUS_KMH: 16,            // vitesse moyenne d'un bus en ville (arrêts compris)
    DWELL_MIN: 0.5,         // temps perdu à chaque arrêt
    TRANSFER_MIN: 8,        // pénalité d'attente pour une correspondance
    DETOUR: 1.3,            // la marche réelle est ~30 % plus longue qu'à vol d'oiseau
    MAX_RADIUS_KM: 2,       // rayon de recherche des arrêts de départ
    MAX_ORIGIN_STOPS: 25,
    CLUSTER_KM: 0.6,        // même nom + < 600 m => même arrêt physique
    NBR_KM: 0.4,            // voisinage piéton
    TRANSFER_WALK_KM: 0.3,  // marche max. entre deux arrêts lors d'une correspondance
    DEST_WALK_KM: 0.4,      // on accepte de descendre à un arrêt voisin de la destination
    PLACE_WALK_KM: 0.8,     // lieu quelconque : arrêts à moins de 800 m
    ORIGIN_STOP_WALK_KM: 0.3
  };
  const GENERIC = new Set(['arret']);
  const VEH = { bus: 'Bus', gbaka: 'Gbaka', woro: 'Woro-woro' };

  const norm = s => String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[’'`]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ').trim();

  const RAD = Math.PI / 180;
  function haversine(lat1, lon1, lat2, lon2) {
    const dLat = (lat2 - lat1) * RAD, dLon = (lon2 - lon1) * RAD;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(x)));
  }

  const SMALL = /^(de|du|des|la|le|les|a|à|et|d|l)$/i;
  const titleCase = s => s.replace(/\S+/g, (w, i) =>
    i > 0 && SMALL.test(w) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1));

  function parseName(name) {
    const m = /^\s*(?:bus|gbaka|woro[- ]?woro)\s*([^:]*?)\s*:\s*(.*)$/i.exec(name);
    if (!m) return { num: name.trim(), title: '' };
    return { num: m[1].trim() || name.trim(), title: titleCase(m[2].trim()) };
  }
  const numSort = (a, b) => (parseInt(a, 10) - parseInt(b, 10)) || String(a).localeCompare(String(b));
  const isValidStop = s => s && typeof s.name === 'string' && s.name.trim() &&
    Number.isFinite(+s.lat) && Number.isFinite(+s.lon) && Math.abs(+s.lat) <= 90 && Math.abs(+s.lon) <= 180;

  /* ---------- Construction du réseau ---------- */
  /* Où insérer un point dans une ligne pour le moindre détour ?
     Retourne l'indice d'insertion et les arrêts voisins. */
  function insertionPoint(stops, lat, lon) {
    const d = s => haversine(s.lat, s.lon, lat, lon);
    let best = { index: 0, cost: d(stops[0]) };                     // avant le premier arrêt
    const end = d(stops[stops.length - 1]);
    if (end < best.cost) best = { index: stops.length, cost: end }; // après le dernier
    for (let i = 0; i + 1 < stops.length; i++) {
      const a = stops[i], b = stops[i + 1];
      const cost = d(a) + d(b) - haversine(a.lat, a.lon, b.lat, b.lon);
      if (cost < best.cost) best = { index: i + 1, cost };
    }
    best.prev = stops[best.index - 1] || null;
    best.next = stops[best.index] || null;
    best.nearestKm = Math.min(...stops.map(d));
    return best;
  }

  /* custom : arrêts ajoutés par l'utilisateur
     [{ id, name, lat, lon, links: [nom complet du trajet, ...] }] */
  function build(raw, custom) {
    const lines = [], clusters = [], byKey = new Map(), seen = new Set();
    const customList = (Array.isArray(custom) ? custom : []).filter(isValidStop);
    const customByLine = new Map();
    customList.forEach(cs => (cs.links || []).forEach(ln => {
      const k = norm(ln);
      if (!customByLine.has(k)) customByLine.set(k, []);
      customByLine.get(k).push(cs);
    }));
    const linkedCustom = new Set();
    let skipped = 0, duplicates = 0;

    const clusterFor = s => {
      const generic = GENERIC.has(s.key);
      let arr = byKey.get(s.key);
      if (!arr) byKey.set(s.key, arr = []);
      const lim = generic ? 0.05 : CFG.CLUSTER_KM;
      for (const c of arr) {
        if (haversine(c.lat, c.lon, s.lat, s.lon) <= lim) {
          c.lat = (c.lat * c.n + s.lat) / (c.n + 1);
          c.lon = (c.lon * c.n + s.lon) / (c.n + 1);
          c.n++;
          c.names.set(s.name, (c.names.get(s.name) || 0) + 1);
          if (s.custom) c.custom = true;
          return c;
        }
      }
      const base = s.key.replace(/\s+/g, '-') || 'arret';
      const c = { id: base + (arr.length ? '~' + (arr.length + 1) : ''), key: s.key, lat: s.lat, lon: s.lon, n: 1,
        names: new Map([[s.name, 1]]), lineSet: new Set(), generic, custom: false };
      if (s.custom) c.custom = true;
      arr.push(c); clusters.push(c);
      return c;
    };

    for (const l of Array.isArray(raw) ? raw : []) {
      if (!l || typeof l.name !== 'string' || !Array.isArray(l.stops)) { skipped++; continue; }
      let valid = l.stops.filter(isValidStop);
      const ck = norm(l.name);
      if (customByLine.has(ck) && valid.length >= 2) {
        valid = valid.slice();
        for (const cs of customByLine.get(ck)) {
          const ip = insertionPoint(valid, +cs.lat, +cs.lon);
          valid.splice(ip.index, 0, { name: cs.name, lat: +cs.lat, lon: +cs.lon, custom: true });
          linkedCustom.add(cs);
        }
      }
      if (valid.length < 2) { skipped++; continue; }
      const sig = l.name + '|' + valid.map(s => s.name).join('>');
      if (seen.has(sig)) { duplicates++; continue; }   // ex. Bus 39 présent deux fois
      seen.add(sig);
      const parsed = parseName(l.name);
      const num = l.ref ? String(l.ref) : parsed.num, title = parsed.title;
      const kind = l.kind || (/^\s*gbaka/i.test(l.name) ? 'gbaka' : /^\s*woro/i.test(l.name) ? 'woro' : 'bus');
      const line = { id: lines.length, name: l.name, num, title, kind, veh: VEH[kind] || 'Bus', cost: Number(l.cost) || null, stops: [], cum: [0] };
      valid.forEach((s, i) => {
        const name = s.name.trim(), lat = +s.lat, lon = +s.lon;
        const c = clusterFor({ name, key: norm(name), lat, lon, custom: !!s.custom });
        c.lineSet.add(num);
        line.stops.push({ id: c.id, name, lat, lon });
        if (i > 0) {
          const p = line.stops[i - 1];
          line.cum.push(line.cum[i - 1] + haversine(p.lat, p.lon, lat, lon));
        }
      });
      lines.push(line);
    }

    // Arrêts ajoutés sans ligne (ou dont la ligne n'existe pas) : points seuls, utilisables à pied
    customList.filter(cs => !linkedCustom.has(cs)).forEach(cs => {
      const name = cs.name.trim();
      clusterFor({ name, key: norm(name), lat: +cs.lat, lon: +cs.lon, custom: true });
    });

    const byId = new Map(), occ = new Map();
    for (const c of clusters) {
      c.name = [...c.names.entries()].sort((a, b) => b[1] - a[1])[0][0];
      c.lines = [...c.lineSet].sort(numSort);
      const dup = byKey.get(c.key).filter(x => !x.generic).length > 1;
      c.label = dup ? `${c.name} (bus ${c.lines.slice(0, 3).join(', ')})` : c.name;
      c.searchKey = norm(c.label);
      delete c.names; delete c.lineSet;
      byId.set(c.id, c);
    }
    lines.forEach(line => line.stops.forEach((s, i) => {
      let a = occ.get(s.id);
      if (!a) occ.set(s.id, a = []);
      a.push({ line, i });
    }));

    // Voisinage piéton (balayage trié par latitude)
    const sorted = [...clusters].sort((a, b) => a.lat - b.lat);
    const nbr = new Map(clusters.map(c => [c.id, []]));
    const dLat = CFG.NBR_KM / 111;
    for (let x = 0; x < sorted.length; x++) {
      const a = sorted[x];
      for (let y = x + 1; y < sorted.length; y++) {
        const b = sorted[y];
        if (b.lat - a.lat > dLat) break;
        const d = haversine(a.lat, a.lon, b.lat, b.lon);
        if (d <= CFG.NBR_KM) { nbr.get(a.id).push({ id: b.id, d }); nbr.get(b.id).push({ id: a.id, d }); }
      }
    }
    nbr.forEach(v => v.sort((p, q) => p.d - q.d));

    const stops = clusters.filter(c => !c.generic)
      .sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' }));

    return { lines, stops, all: clusters, byId, occ, nbr, skipped, duplicates };
  }

  /* ---------- Recherche d'arrêts ---------- */
  function searchStops(D, q, limit = 8) {
    const k = norm(q);
    if (!k) return [];
    const toks = k.split(' ');
    const res = [];
    for (const s of D.stops) {
      const key = s.searchKey;
      const i = key.indexOf(k);
      let score;
      if (i === 0) score = 0;
      else if (i > 0 && key[i - 1] === ' ') score = 1;
      else if (i > 0) score = 3;
      else {
        const words = key.split(' ');
        if (!toks.every(t => words.some(w => w.startsWith(t)))) continue;
        score = 2;
      }
      res.push([score, s]);
    }
    res.sort((a, b) => a[0] - b[0] || a[1].label.length - b[1].label.length);
    return res.slice(0, limit).map(r => r[1]);
  }

  function resolveStop(D, text) {
    const k = norm(text);
    if (!k) return null;
    const byLabel = D.stops.find(s => s.searchKey === k);
    if (byLabel) return byLabel;
    const byName = D.stops.filter(s => s.key === k);
    return byName.length === 1 ? byName[0] : null;
  }

  function nearbyStops(D, lat, lon, maxKm = 1, limit = 5) {
    const out = [];
    for (const s of D.stops) {
      const d = haversine(lat, lon, s.lat, s.lon);
      if (d <= maxKm) out.push({ stop: s, d });
    }
    out.sort((a, b) => a.d - b.d);
    return out.slice(0, limit);
  }

  /* ---------- Calcul d'itinéraires (direct + 1 correspondance) ---------- */
  const walkMin = km => km / CFG.WALK_KMH * 60;
  const rideMin = (line, i, j) => (line.cum[j] - line.cum[i]) / CFG.BUS_KMH * 60 + (j - i) * CFG.DWELL_MIN;

  /* opts.kinds : modes autorisés, ex. ['bus','gbaka'] (tous par défaut) */
  /* destination : identifiant d'arrêt, ou un lieu quelconque { lat, lon } (pharmacie, adresse…) */
  function findRoutes(D, origin, destArg, opts) {
    const kinds = opts && Array.isArray(opts.kinds) && opts.kinds.length ? new Set(opts.kinds) : null;
    const occOf = id => { const a = D.occ.get(id) || []; return kinds ? a.filter(o => kinds.has(o.line.kind)) : a; };
    const place = destArg && typeof destArg === 'object';
    const destId = place ? null : destArg;
    const dest = place ? destArg : D.byId.get(destId);
    if (!dest || !Number.isFinite(dest.lat)) return { status: 'badDest', routes: [] };
    if (!place && origin.stopId === destId) return { status: 'near', routes: [], walkKm: 0 };
    const crow = haversine(origin.lat, origin.lon, dest.lat, dest.lon);
    if (crow < (place ? 0.6 : 0.35)) return { status: 'near', routes: [], walkKm: crow };

    // Arrêts de départ possibles
    let oc;
    if (origin.stopId && D.byId.has(origin.stopId)) {
      oc = [{ id: origin.stopId, walk: 0 }].concat(
        (D.nbr.get(origin.stopId) || []).filter(n => n.d <= CFG.ORIGIN_STOP_WALK_KM)
          .map(n => ({ id: n.id, walk: n.d * CFG.DETOUR })));
    } else {
      oc = D.all.map(s => ({ id: s.id, walk: haversine(origin.lat, origin.lon, s.lat, s.lon) * CFG.DETOUR }))
        .filter(c => c.walk <= CFG.MAX_RADIUS_KM * CFG.DETOUR)
        .sort((a, b) => a.walk - b.walk).slice(0, CFG.MAX_ORIGIN_STOPS);
    }
    if (!oc.length) return { status: 'noStops', routes: [] };

    // Arrêts d'arrivée possibles (destination + voisins proches) -> marche finale en km
    const destMap = new Map();
    if (place) {
      for (const s of D.all) {
        const d = haversine(dest.lat, dest.lon, s.lat, s.lon);
        if (d <= CFG.PLACE_WALK_KM) destMap.set(s.id, d * CFG.DETOUR);
      }
      if (!destMap.size) return { status: 'noDestStops', routes: [] };
    } else {
      destMap.set(destId, 0);
      for (const n of D.nbr.get(destId) || []) if (n.d <= CFG.DEST_WALK_KM) destMap.set(n.id, n.d * CFG.DETOUR);
    }

    const best = new Map();
    const keep = (key, r) => { const cur = best.get(key); if (!cur || r.totalMin < cur.totalMin) best.set(key, r); };

    // 1) Trajets directs
    for (const o of oc) {
      const w1 = walkMin(o.walk);
      for (const { line, i } of occOf(o.id)) {
        const st = line.stops;
        for (let j = i + 1; j < st.length; j++) {
          const we = destMap.get(st[j].id);
          if (we === undefined) continue;
          keep('D' + line.id, {
            totalMin: w1 + rideMin(line, i, j) + walkMin(we), walkStartKm: o.walk, walkEndKm: we,
            transfers: 0, legs: [{ line, from: i, to: j, walkBeforeKm: 0 }]
          });
        }
      }
    }

    // 2) Avec une correspondance : on indexe d'abord tout ce qui mène à la destination
    const reach = new Map(); // stopId -> Map(lineId -> {line,k,j,min,we})
    for (const [did, we] of destMap) {
      for (const { line, i: j } of occOf(did)) {
        for (let k = 0; k < j; k++) {
          const sid = line.stops[k].id;
          const min = rideMin(line, k, j) + walkMin(we);
          let m = reach.get(sid);
          if (!m) reach.set(sid, m = new Map());
          const cur = m.get(line.id);
          if (!cur || min < cur.min) m.set(line.id, { line, k, j, min, we });
        }
      }
    }
    for (const o of oc) {
      const w1 = walkMin(o.walk);
      for (const { line: l1, i } of occOf(o.id)) {
        const st = l1.stops;
        for (let m = i + 1; m < st.length; m++) {
          const sid = st[m].id;
          if (destMap.has(sid)) break;                // déjà arrivé : c'est un direct
          const r1 = rideMin(l1, i, m);
          const tcands = [{ id: sid, d: 0 }].concat((D.nbr.get(sid) || []).filter(n => n.d <= CFG.TRANSFER_WALK_KM));
          for (const tc of tcands) {
            const lm = reach.get(tc.id);
            if (!lm) continue;
            const tw = tc.d * CFG.DETOUR;
            for (const e of lm.values()) {
              if (e.line.num === l1.num) continue;
              keep('T' + l1.id + '-' + e.line.id, {
                totalMin: w1 + r1 + walkMin(tw) + CFG.TRANSFER_MIN + e.min,
                walkStartKm: o.walk, walkEndKm: e.we, transfers: 1,
                legs: [{ line: l1, from: i, to: m, walkBeforeKm: 0 }, { line: e.line, from: e.k, to: e.j, walkBeforeKm: tw }]
              });
            }
          }
        }
      }
    }

    // 3) Deux correspondances (uniquement si rien d'autre n'a été trouvé)
    if (!best.size) {
      const first = new Map(); // stopId -> {l1,i,m,min,walk}
      for (const o of oc) {
        const w1 = walkMin(o.walk);
        for (const { line: l1, i } of occOf(o.id)) {
          for (let m = i + 1; m < l1.stops.length; m++) {
            const sid = l1.stops[m].id, min = w1 + rideMin(l1, i, m);
            const cur = first.get(sid);
            if (!cur || min < cur.min) first.set(sid, { l1, i, m, min, walk: o.walk });
          }
        }
      }
      for (const [aid, f] of first) {
        for (const { line: l2, i: a } of occOf(aid)) {
          if (l2.num === f.l1.num) continue;
          for (let b = a + 1; b < l2.stops.length; b++) {
            const sid = l2.stops[b].id;
            const tcands = [{ id: sid, d: 0 }].concat((D.nbr.get(sid) || []).filter(n => n.d <= CFG.TRANSFER_WALK_KM));
            for (const tc of tcands) {
              const lm = reach.get(tc.id);
              if (!lm) continue;
              const tw = tc.d * CFG.DETOUR;
              for (const e of lm.values()) {
                if (e.line.num === l2.num || e.line.num === f.l1.num) continue;
                keep('TT' + f.l1.id + '-' + l2.id + '-' + e.line.id, {
                  totalMin: f.min + CFG.TRANSFER_MIN + rideMin(l2, a, b) + walkMin(tw) + CFG.TRANSFER_MIN + e.min,
                  walkStartKm: f.walk, walkEndKm: e.we, transfers: 2,
                  legs: [{ line: f.l1, from: f.i, to: f.m, walkBeforeKm: 0 },
                         { line: l2, from: a, to: b, walkBeforeKm: 0 },
                         { line: e.line, from: e.k, to: e.j, walkBeforeKm: tw }]
                });
              }
            }
          }
        }
      }
    }

    const all = [...best.values()].map(finalize).sort((a, b) => a.totalMin - b.totalMin);
    const dedupe = arr => { const s = new Set(); return arr.filter(r => !s.has(r.sig) && s.add(r.sig)); };
    const directs = dedupe(all.filter(r => r.transfers === 0)).slice(0, 6);
    const bestDirect = directs.length ? directs[0].totalMin : Infinity;
    const transfers = dedupe(all.filter(r => r.transfers === 1))
      .filter(r => r.totalMin < bestDirect * 0.8)
      .slice(0, directs.length ? 3 : 6);
    const twice = dedupe(all.filter(r => r.transfers === 2)).slice(0, 4);
    const routes = directs.concat(transfers, (directs.length || transfers.length) ? [] : twice);
    return { status: routes.length ? 'ok' : 'none', routes };
  }

  function finalize(r) {
    r.legs.forEach(l => {
      l.stops = l.line.stops.slice(l.from, l.to + 1);
      l.km = l.line.cum[l.to] - l.line.cum[l.from];
      l.board = l.stops[0];
      l.alight = l.stops[l.stops.length - 1];
    });
    r.nStops = r.legs.reduce((a, l) => a + l.to - l.from, 0);
    r.cost = r.legs.reduce((a, l) => a + (l.line.cost || 0), 0) || null;
    r.totalMin = Math.max(1, Math.round(r.totalMin));
    r.sig = r.legs.map(l => l.line.num).join('>');
    return r;
  }

  return { CFG, norm, haversine, build, insertionPoint, parseName, searchStops, resolveStop, nearbyStops, findRoutes, walkMin, rideMin };
})();
if (typeof module !== 'undefined') module.exports = Core;
