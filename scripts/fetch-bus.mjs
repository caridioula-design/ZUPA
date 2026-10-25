// ZUPA — lignes de bus SOTRA, gbaka et wôrô-wôrô depuis OpenStreetMap -> www/data/bus.js
// Les lignes OSM remplacent celles de même identifiant ; les autres sont gardées. Garde-fou contre une réponse incomplète.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const O = require('../tools/osm.js');
const FILE = 'www/data/bus.js';
const old = O.readBusFile(readFileSync(FILE, 'utf8'));
const count = (ls, k) => ls.filter(l => (l.kind || 'bus') === k).length;
let json;
try { json = await O.download(m => console.log(m)); }
catch (e) { console.log(`::warning title=Lignes OSM::téléchargement impossible (${e.message || e}) : fichier conservé`); process.exit(0); }
let masters = 0;
try { const mj = await O.download(m => console.log(m), O.QUERY_MASTER); masters = mj.elements.length; json.elements.push(...mj.elements); }
catch (e) { console.log(`::warning title=Lignes OSM::fiches tarif/fréquence indisponibles (${e.message || e}) : lignes mises à jour sans elles`); }
const { lines, skipped } = O.convert(json);
const m = O.merge(old, lines, { kinds: ['bus', 'gbaka', 'woro', 'bateau'] });
const busOld = count(old, 'bus'), busNew = count(m.lines, 'bus');
if (busNew < busOld * 0.8) { console.log(`::warning title=Lignes OSM::seulement ${busNew} trajets de bus reçus (avant ${busOld}) : fichier conservé`); process.exit(0); }
writeFileSync(FILE, O.writeBusFile(m.lines));
const stops = new Set(m.lines.flatMap(l => l.stops.map(s => s.name + '|' + s.lat.toFixed(4) + ',' + s.lon.toFixed(4)))).size;
console.log(`::notice title=Lignes OSM::${busNew} trajets de bus (avant ${busOld}), ${count(m.lines, 'gbaka')} gbaka, ${count(m.lines, 'woro')} wôrô-wôrô, ${count(m.lines, 'bateau')} bateaux-bus, ${stops} arrêts · ${masters} fiches · tarif ${m.lines.filter(l => l.cost).length}, fréquence ${m.lines.filter(l => l.every).length}, horaires ${m.lines.filter(l => l.hours).length} · ${m.added.length} nouveaux, ${m.updated.length} mis à jour, ${skipped.length} ignorés`);
