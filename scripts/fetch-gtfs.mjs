// ZUPA — réseau de transport d'Abidjan au format GTFS (DigitalTransport4Africa, dépôt GitLab abidjan_2)
// Télécharge, lit la licence, convertit chaque ligne (trajet le plus complet par sens) -> www/data/gtfs.js
import { writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
const PROJECT = 'digitaltransport/data/africa/abidjan_2';
const API = `https://gitlab.com/api/v4/projects/${encodeURIComponent(PROJECT)}`;
const RAW = p => `https://gitlab.com/${PROJECT}/-/raw/main/${p.split('/').map(encodeURIComponent).join('/')}`;
const note = (lvl, msg) => console.log(`::${lvl} title=GTFS Abidjan::${msg}`);
const get = async (url, bin) => { const r = await fetch(url); if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`); return bin ? Buffer.from(await r.arrayBuffer()) : r.text(); };
try {
  // 1. inventaire du dépôt
  let files = [];
  for (let page = 1; page < 20; page++) {
    const r = await fetch(`${API}/repository/tree?recursive=true&per_page=100&page=${page}`);
    if (!r.ok) throw new Error('liste du dépôt : HTTP ' + r.status);
    const part = await r.json(); files = files.concat(part.filter(f => f.type === 'blob').map(f => f.path));
    if (!r.headers.get('x-next-page')) break;
  }
  console.log('Fichiers :\n' + files.join('\n'));
  // 2. licence
  let licence = 'inconnue';
  for (const f of files.filter(f => /(^|\/)(licen[cs]e|readme)[^/]*$/i.test(f)).slice(0, 4)) {
    const t = await get(RAW(f));
    const hit = t.split('\n').filter(l => /licen|creative|cc[- ]by|odbl|commercial|attribution/i.test(l)).slice(0, 6).join(' | ');
    console.log(`--- ${f} ---\n${t.slice(0, 1500)}`);
    if (hit) licence = (licence === 'inconnue' ? '' : licence + ' / ') + `${f} : ${hit.slice(0, 300)}`;
  }
  // 3. GTFS : zip ou fichiers .txt du dossier le plus récent
  const dir = '/tmp/gtfs'; mkdirSync(dir, { recursive: true });
  const zips = files.filter(f => /gtfs.*\.zip$|\.zip$/i.test(f) && /2023|gtfs/i.test(f)).sort();
  const txts = files.filter(f => /\/(stops|routes|trips|stop_times|agency)\.txt$/i.test(f));
  if (txts.length >= 4) {
    const base = txts[0].replace(/[^/]+$/, '');
    for (const n of ['agency', 'routes', 'trips', 'stop_times', 'stops']) { const f = files.find(x => x === base + n + '.txt'); if (f) writeFileSync(join(dir, n + '.txt'), await get(RAW(f))); }
    console.log('GTFS (texte) : ' + base);
  } else if (zips.length) {
    const z = zips[zips.length - 1]; writeFileSync('/tmp/gtfs.zip', await get(RAW(z), true));
    execSync(`unzip -o -j -q /tmp/gtfs.zip -d ${dir}`); console.log('GTFS (zip) : ' + z);
  } else throw new Error('aucun fichier GTFS trouvé');
  // 4. lecture CSV
  const csv = name => {
    const p = join(dir, name + '.txt'); if (!existsSync(p)) return [];
    const text = readFileSync(p, 'utf8').replace(/^﻿/, ''); const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) { const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true; else if (c === ',') { row.push(cur); cur = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.length > 1 || row[0]) rows.push(row); row = []; } else cur += c; }
    if (cur || row.length) { row.push(cur); rows.push(row); }
    const h = rows.shift().map(x => x.trim()); return rows.map(r => Object.fromEntries(h.map((k, i) => [k, (r[i] || '').trim()])));
  };
  const agency = csv('agency'), routes = csv('routes'), trips = csv('trips'), st = csv('stop_times'), stops = csv('stops');
  const S = new Map(stops.map(s => [s.stop_id, s])), A = new Map(agency.map(a => [a.agency_id, a.agency_name]));
  const byTrip = new Map(); for (const x of st) { if (!byTrip.has(x.trip_id)) byTrip.set(x.trip_id, []); byTrip.get(x.trip_id).push(x); }
  const types = {}; routes.forEach(r => { const k = `${A.get(r.agency_id) || r.agency_id || '?'} · type ${r.route_type}`; types[k] = (types[k] || 0) + 1; });
  note('notice', `${agency.length} exploitants, ${routes.length} lignes, ${trips.length} trajets, ${stops.length} arrêts · ${Object.entries(types).map(([k, v]) => `${k} : ${v}`).join(' ; ').slice(0, 700)}`);
  note('notice', `Licence : ${licence.slice(0, 600)}`);
  // 5. conversion : une ligne ZUPA par ligne et par sens (le trajet qui dessert le plus d'arrêts)
  const kindOf = r => { const a = (A.get(r.agency_id) || '') + ' ' + r.route_short_name + ' ' + r.route_long_name + ' ' + (r.route_desc || '');
    if (/bateau|lagun|ferry|boat/i.test(a) || r.route_type === '4' || /^10\d\d$|^12\d\d$/.test(r.route_type)) return null;
    if (/gbaka|minicar|mini[- ]?bus/i.test(a)) return 'gbaka';
    if (/w[oô]r[oô]/i.test(a) || /taxi/i.test(a)) return 'woro';
    if (/sotra|bus|express/i.test(a) || r.route_type === '3' || r.route_type === '700') return 'bus';
    return 'gbaka'; };
  const lines = [], perKind = {};
  for (const r of routes) {
    const kind = kindOf(r); if (!kind) continue;
    const best = {};
    for (const t of trips.filter(t => t.route_id === r.route_id)) { const d = t.direction_id || '0'; const n = (byTrip.get(t.trip_id) || []).length; if (!best[d] || n > best[d].n) best[d] = { t, n }; }
    for (const { t } of Object.values(best)) {
      const seq = (byTrip.get(t.trip_id) || []).sort((a, b) => +a.stop_sequence - +b.stop_sequence)
        .map(x => S.get(x.stop_id)).filter(s => s && s.stop_name && Number.isFinite(+s.stop_lat))
        .map(s => ({ name: s.stop_name.replace(/\s+/g, ' ').trim(), lat: +(+s.stop_lat).toFixed(6), lon: +(+s.stop_lon).toFixed(6) }))
        .filter((s, i, a) => !i || s.name !== a[i - 1].name);
      if (seq.length < 2) continue;
      const ref = (r.route_short_name || r.route_id).trim();
      const label = kind === 'bus' ? 'Bus' : kind === 'gbaka' ? 'Gbaka' : 'Wôrô-wôrô';
      lines.push({ name: `${label} ${ref}: ${seq[0].name} → ${seq[seq.length - 1].name}`, ref, kind, cost: null, gtfs: r.route_id, stops: seq });
      perKind[kind] = (perKind[kind] || 0) + 1;
    }
  }
  writeFileSync('www/data/gtfs.js', `/* ZUPA — réseau d'Abidjan (GTFS, DigitalTransport4Africa, ${PROJECT}). Licence : voir gtfs.licence. */
window.ZUPA_GTFS = ${JSON.stringify({ source: `https://gitlab.com/${PROJECT}`, licence, updated: new Date().toISOString(), lines })};
`);
  note('notice', `${lines.length} trajets convertis (${Object.entries(perKind).map(([k, v]) => k + ' ' + v).join(', ')})`);
} catch (e) { note('warning', 'récupération impossible : ' + (e.message || e)); }
