// ZUPA — contrôle de la carte hors ligne : en-tête, emprise, une tuile au centre d'Abidjan
import { PMTiles, FileSource } from 'pmtiles';
import { openAsBlob, existsSync, statSync } from 'node:fs';
const f = 'www/maps/abidjan.pmtiles';
if (!existsSync(f)) { console.log('::warning title=Carte hors ligne::absente : la carte en ligne sera utilisée'); process.exit(0); }
const blob = await openAsBlob(f);
const pm = new PMTiles(new FileSource(new File([blob], 'abidjan.pmtiles')));
const h = await pm.getHeader();
const lon = -4.02, lat = 5.33, z = 14;
const x = Math.floor((lon + 180) / 360 * 2 ** z);
const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * 2 ** z);
const t = await pm.getZxy(z, x, y);
const mb = (statSync(f).size / 1e6).toFixed(1);
console.log(`::notice title=Carte hors ligne::${mb} Mo, zooms ${h.minZoom}-${h.maxZoom}, emprise ${h.minLon},${h.minLat} → ${h.maxLon},${h.maxLat}, ${h.numAddressedTiles} tuiles, tuile z14 du Plateau : ${t ? t.data.byteLength + ' octets' : 'ABSENTE'}`);
