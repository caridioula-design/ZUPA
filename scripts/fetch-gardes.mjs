// ZUPA — récupération automatique des pharmacies de garde d'Abidjan
//
// Sources, par ordre de priorité :
//   1. UNPPCI (unppci.org) : PDF mensuel officiel « Tour de garde » (toutes les semaines du mois, adresses, téléphones)
//   2. PDF déposés à la main dans le dossier gardes-pdf/ du dépôt (secours si le site UNPPCI change)
//   3. pharmacies-de-garde.ci : tableau HTML de la semaine en cours
//   4. annuaireci.com : page de la semaine (lecture générique)
// Résultat : www/data/gardes.json (semaine en cours + semaines suivantes connues).
// Les résultats de chaque source sont affichés comme annotations GitHub (::notice).
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const require = createRequire(import.meta.url);
const G = require('./gardes-lib.cjs');

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = join(ROOT, 'www/data/gardes.json');
const PDF_DIR = join(ROOT, 'gardes-pdf');
const TMP = mkdtempSync(join(tmpdir(), 'zupa-gardes-'));
const UA = { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) ZUPA/1.0 (+https://github.com/caridioula-design/ZUPA)', 'Accept-Language': 'fr-FR,fr;q=0.9' };
const today = new Date().toISOString().slice(0, 10);
const notice = (title, msg) => console.log(`::notice title=${title}::${String(msg).replace(/\r?\n/g, ' ')}`);
const warn = (title, msg) => console.log(`::warning title=${title}::${String(msg).replace(/\r?\n/g, ' ')}`);

async function get(url, binary = false) {
  const r = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(60000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} sur ${url}`);
  return binary ? Buffer.from(await r.arrayBuffer()) : await r.text();
}
function pdfToWeeks(buf, label) {
  const f = join(TMP, 'f' + Math.random().toString(36).slice(2) + '.pdf');
  writeFileSync(f, buf);
  const text = execFileSync('pdftotext', ['-layout', f, '-'], { maxBuffer: 64 << 20 }).toString('utf8');
  if (/INTERIEUR|INTÉRIEUR/i.test(text.slice(0, 3000)) && !/SECTION D['’]ADJAME|SECTION DE COCODY/i.test(text)) throw new Error('liste de l\'intérieur du pays, ignorée');
  const r = G.parseUnppciText(text);
  const n = r.semaines.reduce((a, w) => a + w.pharmacies.length, 0);
  notice(`PDF ${label}`, `${r.semaines.length} semaines, ${n} entrées (${r.semaines.map(w => `${w.du}→${w.au}: ${w.pharmacies.length}`).join(', ')})`);
  return r.semaines.filter(w => w.pharmacies.length >= 30);
}

const MOIS = ['JANVIER', 'FEVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOUT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DECEMBRE'];
const deacc = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();

/* 1. UNPPCI */
async function fromUnppci() {
  const home = await get('https://www.unppci.org/');
  const arts = [];
  const re = /href=["']([^"']*\?p=articles&(?:amp;)?id=(\d+))["'][^>]*>([\s\S]{0,300}?)<\/a>/gi;
  let m;
  while ((m = re.exec(home))) {
    const txt = deacc(m[3].replace(/<[^>]+>/g, ' '));
    if (/TOUR(S)? DE GARDE/.test(txt) && !/INTERIEUR/.test(txt)) arts.push({ id: +m[2], txt: txt.replace(/\s+/g, ' ').slice(0, 80) });
  }
  // mois en cours et mois suivant en priorité, puis les plus récents
  const d = new Date(), wanted = [MOIS[d.getMonth()], MOIS[(d.getMonth() + 1) % 12]];
  const uniq = [...new Map(arts.map(a => [a.id, a])).values()]
    .sort((a, b) => (wanted.some(w => b.txt.includes(w)) - wanted.some(w => a.txt.includes(w))) || b.id - a.id).slice(0, 3);
  notice('UNPPCI articles', uniq.map(a => `${a.id}: ${a.txt}`).join(' | ') || 'aucun article « Tour de garde » trouvé');
  const weeks = [];
  for (const a of uniq) {
    const html = await get(`https://www.unppci.org/?p=articles&id=${a.id}`);
    const cands = G.unppciPdfCandidates(html);
    notice(`UNPPCI article ${a.id}`, `PDF trouvés : ${cands.map(c => c.url.split('/').pop()).join(', ') || 'aucun'}`);
    for (const c of cands.slice(0, 4)) {
      try { weeks.push(...pdfToWeeks(await get(c.url, true), c.url.split('/').pop())); }
      catch (e) { warn('UNPPCI PDF', `${c.url} : ${e.message}`); }
    }
  }
  return weeks;
}

/* 2. PDF déposés dans le dépôt */
function fromRepoPdfs() {
  if (!existsSync(PDF_DIR)) return [];
  const weeks = [];
  for (const f of readdirSync(PDF_DIR).filter(f => /\.pdf$/i.test(f))) {
    try { weeks.push(...pdfToWeeks(readFileSync(join(PDF_DIR, f)), f)); } catch (e) { warn('PDF du dépôt', `${f} : ${e.message}`); }
  }
  return weeks;
}

/* 3 et 4. Sites web (semaine en cours) */
async function fromHtml(label, url, parser) {
  const r = parser(await get(url));
  notice(label, `${r.pharmacies.length} pharmacies, période ${r.periode ? r.periode.du + '→' + r.periode.au : 'non trouvée'}`);
  if (!r.periode || r.pharmacies.length < 30) return [];
  return [{ du: r.periode.du, au: r.periode.au, pharmacies: r.pharmacies }];
}

const sources = [
  ['UNPPCI', () => fromUnppci()],
  ['PDF du dépôt', async () => fromRepoPdfs()],
  ['pharmacies-de-garde.ci', () => fromHtml('pharmacies-de-garde.ci', 'https://www.pharmacies-de-garde.ci/liste-des-pharmacies-de-garde-a-abidjan-votre-permanence/', G.parsePdgHtml)],
  ['annuaireci.com', () => fromHtml('annuaireci.com', 'https://annuaireci.com/pharmacies-de-garde/abidjan/', G.parseGenericHtml)]
];

const byWeek = new Map(); // du -> { semaine, source }
const found = {};
for (const [name, fn] of sources) {
  try {
    const weeks = await fn();
    found[name] = weeks;
    for (const w of weeks) {
      if (w.au < today && w.au < addDays(today, -1)) continue;
      const cur = byWeek.get(w.du);
      // priorité à la première source (officielle) ; une source suivante ne complète que les semaines manquantes
      if (!cur) byWeek.set(w.du, { semaine: w, source: name });
    }
  } catch (e) { warn(name, e.message); found[name] = []; }
}
function addDays(s, n) { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }

// Contrôle croisé de la semaine en cours entre les sources
const curDu = [...byWeek.keys()].find(du => du <= today && today <= byWeek.get(du).semaine.au);
if (curDu) {
  const key = n => G.pharmacyName(n).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const ref = new Set(byWeek.get(curDu).semaine.pharmacies.map(p => key(p.nom)));
  for (const [name, weeks] of Object.entries(found)) {
    const w = weeks.find(x => x.du === curDu);
    if (!w || name === byWeek.get(curDu).source) continue;
    const common = w.pharmacies.filter(p => ref.has(key(p.nom))).length;
    notice('Contrôle', `${name} : ${common}/${w.pharmacies.length} pharmacies communes avec ${byWeek.get(curDu).source} pour la semaine du ${curDu}`);
  }
}

// Fusion avec le fichier existant : on garde les semaines encore valables qu'aucune source n'a renvoyées
let old = null;
try { old = JSON.parse(readFileSync(OUT, 'utf8')); } catch (_) {}
for (const w of (old && Array.isArray(old.semaines) ? old.semaines : old && old.du ? [old] : [])) {
  if (w && w.du && w.au >= today && !byWeek.has(w.du) && Array.isArray(w.pharmacies) && w.pharmacies.length) byWeek.set(w.du, { semaine: w, source: w.source || (old && old.source) || 'précédent' });
}

const semaines = [...byWeek.values()].map(({ semaine, source }) => ({ du: semaine.du, au: semaine.au, source, pharmacies: semaine.pharmacies }))
  .sort((a, b) => a.du.localeCompare(b.du));
if (!semaines.length) {
  warn('Pharmacies de garde', 'aucune liste récupérée : fichier inchangé');
  process.exit(0);
}
const cur = G.currentWeek(semaines, today) || semaines[semaines.length - 1];
const out = {
  source: [...new Set(semaines.map(w => w.source))].join(', '),
  maj: today,
  // semaine en cours (compatibilité avec ZUPA 1.0.0)
  du: cur.du, au: cur.au, pharmacies: cur.pharmacies,
  semaines
};
const json = JSON.stringify(out, null, 1);
const prev = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
const strip = s => s.replace(/"maj": "[^"]*",?/, '');
if (strip(prev) === strip(json)) { notice('Pharmacies de garde', 'aucun changement'); process.exit(0); }
writeFileSync(OUT, json + '\n');
notice('Pharmacies de garde', `${semaines.length} semaine(s) : ${semaines.map(w => `${w.du}→${w.au} (${w.pharmacies.length}, ${w.source})`).join(' ; ')}`);
