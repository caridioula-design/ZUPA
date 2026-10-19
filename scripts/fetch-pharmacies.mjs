// ZUPA — télécharge les pharmacies du Grand Abidjan depuis OpenStreetMap
// et régénère www/data/pharmacies.js. En cas d'échec, le fichier existant est conservé.
import { createRequire } from 'node:module';
import { writeFileSync, readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const PC = require('../www/js/pharma-core.js');

const OUT = new URL('../www/data/pharmacies.js', import.meta.url);
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter'
];

async function download() {
  for (const url of ENDPOINTS) {
    try {
      console.log('Overpass :', url);
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'ZUPA-build/1.0 (github.com/caridioula-design/zupa)' },
        body: 'data=' + encodeURIComponent(PC.queryBBox()),
        signal: AbortSignal.timeout(180000)
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return await r.json();
    } catch (e) { console.warn('  échec :', e.message); }
  }
  return null;
}

const json = await download();
const list = json ? PC.fromOsm(json) : [];
if (list.length < 20) {
  console.warn(`Seulement ${list.length} pharmacies reçues : fichier existant conservé.`);
  process.exit(0);
}
list.sort((a, b) => a.name.localeCompare(b.name, 'fr'));
const old = readFileSync(OUT, 'utf8');
const body = JSON.stringify({ updated: new Date().toISOString(), list });
writeFileSync(OUT, `/* ZUPA — pharmacies du Grand Abidjan (© contributeurs OpenStreetMap, ODbL).
   Fichier régénéré par scripts/fetch-pharmacies.mjs (GitHub Actions). */
window.ZUPA_PHARMA = ${body};
`);
const prev = (old.match(/"id":/g) || []).length;
console.log(`${list.length} pharmacies enregistrées (avant : ${prev}).`);
