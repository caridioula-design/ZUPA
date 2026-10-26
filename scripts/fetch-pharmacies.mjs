// ZUPA — télécharge depuis OpenStreetMap les pharmacies et les villes de Côte d'Ivoire
// et régénère www/data/pharmacies.js et www/data/villes.js. En cas d'échec, les fichiers existants sont conservés.
import { createRequire } from 'node:module';
import { writeFileSync, readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const PC = require('../www/js/pharma-core.js');

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];
async function overpass(query) {
  for (const url of ENDPOINTS) {
    try {
      console.log('Overpass :', url);
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'ZUPA-build/1.0 (github.com/caridioula-design/ZUPA)' },
        body: 'data=' + encodeURIComponent(query),
        signal: AbortSignal.timeout(240000)
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) { console.warn('  échec :', e.message); }
  }
  return null;
}
const out = (f) => new URL('../www/data/' + f, import.meta.url);

// Pharmacies
const pj = await overpass(PC.queryCountry());
const list = pj ? PC.fromOsm(pj) : [];
if (list.length >= 100) {
  list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const prev = (readFileSync(out('pharmacies.js'), 'utf8').match(/"id":/g) || []).length;
  writeFileSync(out('pharmacies.js'), `/* ZUPA — pharmacies de Côte d'Ivoire (© contributeurs OpenStreetMap, ODbL).
   Fichier régénéré par scripts/fetch-pharmacies.mjs (GitHub Actions). */
window.ZUPA_PHARMA = ${JSON.stringify({ updated: new Date().toISOString(), list })};
`);
  console.log(`::notice title=Pharmacies OSM::${list.length} pharmacies en Côte d'Ivoire (avant : ${prev})`);
} else console.log(`::warning title=Pharmacies OSM::${list.length} reçues : fichier conservé`);

// Villes, villages et quartiers
const vj = await overpass(PC.queryPlaces());
const places = vj ? vj.elements.filter(e => e.tags && e.tags.name && Number.isFinite(e.lat))
  .map(e => [e.tags['name:fr'] || e.tags.name, e.tags.place, +e.lat.toFixed(4), +e.lon.toFixed(4)]) : [];
if (places.length >= 500) {
  writeFileSync(out('villes.js'), `/* ZUPA — villes, villages et quartiers de Côte d'Ivoire (© contributeurs OpenStreetMap, ODbL) */
window.ZUPA_VILLES = ${JSON.stringify(places)};
`);
  console.log(`::notice title=Villes OSM::${places.length} lieux`);
} else console.log(`::warning title=Villes OSM::${places.length} reçus : fichier conservé`);

// Paiya : hôtels, restaurants, toilettes publiques, commerces du Grand Abidjan
const PY = require('../www/js/paiya-core.js');
const yj = await overpass(PY.queryBBox());
const lieux = yj ? PY.fromOsm(yj) : [];
if (lieux.length >= 200) {
  const n = c => lieux.filter(p => p.cat === c).length;
  writeFileSync(out('paiya.js'), `/* ZUPA — Paiya : hôtels, restaurants, toilettes, commerces du Grand Abidjan (© contributeurs OpenStreetMap, ODbL) */
window.ZUPA_PAIYA = ${JSON.stringify({ updated: new Date().toISOString(), list: lieux })};
`);
  console.log(`::notice title=Paiya OSM::${lieux.length} lieux (${Object.keys(PY.CATS).map(c => PY.CATS[c].label.toLowerCase() + ' ' + n(c)).join(', ')})`);
} else console.log(`::warning title=Paiya OSM::${lieux.length} reçus : fichier conservé`);

// Écoles du Grand Abidjan : primaires et collèges (distances pratiques des annonces Imo)
{
  const B = PY.BBOX; // [sud, ouest, nord, est]
  const ej = await overpass(`[out:json][timeout:180];nwr["amenity"~"^(school|kindergarten)$"](${B.join(',')});out center tags;`);
  // p = préscolaire et primaire (maternelle, CP1 à CM2) ; c = collège et lycée (6e à la terminale)
  // écoles professionnelles, techniques supérieures, de formation… : ni l'un ni l'autre
  const HORS = /m[ée]tier|professionn|formation|sup[ée]rieur|universit|institut|bijouterie|beaux[- ]arts|conduite|couture|coiffure|informatique|police|gendarmerie|infirmi|sant[ée]|commerce|gestion|hôtel|hotel|musique|danse|langue|anglais|coran|bible|th[ée]olog|s[ée]minaire|enseignement technique|\bcet\b|\bceti\b|\blet\b|\bbts\b/;
  const kindOf = t => {
    const n = (t.name || t['name:fr'] || '').toLowerCase(), sc = (t.school || t['school:type'] || '').toLowerCase(), isced = String(t['isced:level'] || '');
    if (HORS.test(n)) return null;
    if (/coll[eè]ge|lyc[ée]e|\bceg\b|\bcepg\b|secondaire/.test(n) || /secondary/.test(sc) || /(^|[;,\s-])[23]/.test(isced)) return 'c';
    if (t.amenity === 'kindergarten' || /\bepp\b|e\.p\.p|primaire|maternelle|pr[ée]scolaire|jardin d.enfant|groupe scolaire|\bg\.?s\.?\b|\bepv\b|[ée]cole (catholique|m[ée]thodiste|islamique|confessionnelle|priv[ée]e)/.test(n) || /primary|kindergarten|preschool/.test(sc) || /(^|[;,\s-])[01]/.test(isced)) return 'p';
    if (!sc && /(^|\s)([ée]cole|ecole|cours)\b/.test(n)) return 'p'; // « École Les Lauriers » : école privée de quartier, le plus souvent primaire
    return null;
  };
  const ecoles = ej ? ej.elements.map(e => {
    const t = e.tags || {}, lat = e.lat ?? (e.center && e.center.lat), lon = e.lon ?? (e.center && e.center.lon);
    const name = (t.name || t['name:fr'] || '').trim().replace(/\s+/g, ' ');
    const k = name && Number.isFinite(lat) ? kindOf(t) : null;
    return k ? [name.slice(0, 70), k, +lat.toFixed(5), +lon.toFixed(5)] : null;
  }).filter(Boolean) : [];
  if (ecoles.length >= 100) {
    writeFileSync(out('ecoles.js'), `/* ZUPA — écoles primaires (p) et collèges/lycées (c) du Grand Abidjan (© contributeurs OpenStreetMap, ODbL) */
window.ZUPA_ECOLES = ${JSON.stringify({ updated: new Date().toISOString(), list: ecoles })};
`);
    console.log(`::notice title=Écoles OSM::${ecoles.filter(e => e[1] === 'p').length} écoles primaires, ${ecoles.filter(e => e[1] === 'c').length} collèges et lycées`);
  } else console.log(`::warning title=Écoles OSM::${ecoles.length} reçues : fichier conservé`);
}
