/* ==========================================================================
   ZUPA — lecture des listes de pharmacies de garde
   - PDF mensuel de l'UNPPCI (texte extrait par « pdftotext -layout »)
   - tableau HTML de pharmacies-de-garde.ci
   - page d'annuaireci.com (lecture générique)
   ========================================================================== */
'use strict';

const MONTHS = { JANVIER: 1, FEVRIER: 2, MARS: 3, AVRIL: 4, MAI: 5, JUIN: 6, JUILLET: 7, AOUT: 8, SEPTEMBRE: 9, OCTOBRE: 10, NOVEMBRE: 11, DECEMBRE: 12 };
const deacc = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const ymd = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const clean = s => String(s || '').replace(/[’‘`]/g, "'").replace(/[«»“”]/g, '"').replace(/\s+/g, ' ').trim();
const PHONE = /(?:\+?225[\s.]?)?\b\d{2}(?:[\s.]?\d{2}){4}\b/g;

// Accents absents des listes en majuscules
const ACCENTS = { adjame: 'Adjamé', attecoube: 'Attécoubé', sante: 'Santé', therese: 'Thérèse', esperance: 'Espérance', pres: 'près',
  marche: 'Marché', ecole: 'École', eglise: 'Église', cite: 'Cité', generale: 'Générale', general: 'Général', hopital: 'Hôpital',
  fraternite: 'Fraternité', trinite: 'Trinité', amitie: 'Amitié', unite: 'Unité', liberte: 'Liberté', prosperite: 'Prospérité',
  felicite: 'Félicité', fidelite: 'Fidélité', charite: 'Charité', verite: 'Vérité', eternel: 'Éternel', etoile: 'Étoile', etoiles: 'Étoiles',
  elite: 'Élite', esperanto: 'Espéranto', bethel: 'Béthel', genese: 'Genèse', priere: 'Prière', lumiere: 'Lumière', riviere: 'Rivière',
  mere: 'Mère', pere: 'Père', frere: 'Frère', freres: 'Frères', celeste: 'Céleste', benediction: 'Bénédiction', beatrice: 'Béatrice',
  helene: 'Hélène', genevieve: 'Geneviève', therapie: 'Thérapie', securite: 'Sécurité', republique: 'République', etat: 'État',
  koumassi: 'Koumassi', bouet: 'Bouët', gendarmerie: 'Gendarmerie', ecoles: 'Écoles', prefecture: 'Préfecture', sejour: 'Séjour',
  deguerpi: 'Déguerpi', akouedo: 'Akouédo', akeikoi: 'Akéikoi', abobote: 'Abobotè', tresor: 'Trésor', etage: 'Étage', etages: 'Étages',
  allee: 'Allée', ancien: 'Ancien', entree: 'Entrée', carre: 'Carré', resurrection: 'Résurrection', zenith: 'Zénith', medicale: 'Médicale', medical: 'Médical' };
const accent = s => s.replace(/\p{L}+/gu, w => { const r = ACCENTS[w.toLowerCase()]; if (!r) return w; return w[0] === w[0].toUpperCase() ? r[0].toUpperCase() + r.slice(1) : r.toLowerCase(); });

function titleCase(s) {
  return clean(s).toLowerCase()
    .replace(/(^|[\s'(\/-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase())
    .replace(/\b(?:(De|Du|Des|La|Le|Les|Et|Au|Aux|En|Entre|Pres|Sur|Vers)(?=\s)|(D'|L')(?=\p{L}))/gu, w => w.toLowerCase())
    .replace(/\b(Ii|Iii|Iv|Pk|Cie|Sicogi|Sideci|Sogefiha|Chu|Epp|Fsu|Sotra|Cnps|Bae|Cma)\b/g, w => w.toUpperCase())
    .replace(/^./, c => c.toUpperCase())
    .replace(/[\s\S]*/, accent);
}

/* Nom d'officine lisible : « PHCIE DU CENTRE (NLLE) » -> « Pharmacie du Centre » */
function pharmacyName(raw) {
  let s = clean(raw).replace(/\s*[-–—\/,]+\s*$/, '');
  s = s.replace(/\((?:\s*(?:NLLE|NVLLE|NOUVELLE|NOUV\.?)\s*)\)/gi, '').replace(/\(\s*EX[^)]*\)/gi, '');
  s = s.replace(/^\s*(PH(AR)?CIE|PHIE|PHARMACIE)\.?\s+/i, '');
  let n = titleCase(s).replace(/\s+/g, ' ').trim()
    .replace(/^(?:(De|Du|Des|La|Le|Les)(?=\s)|(D'|L')(?=\p{L}))/u, w => w.toLowerCase())
    .replace(/\b(\p{L}(?:\.\p{L})+\.?)/gu, w => w.toUpperCase());   // sigles : B.S.A
  return 'Pharmacie ' + n;
}

const SECTION_COMMUNE = [
  [/ABOBO/, 'Abobo'], [/ADJAME/, 'Adjamé'], [/COCODY/, 'Cocody'], [/KOUMASSI/, 'Koumassi'], [/MARCORY/, 'Marcory'],
  [/PLATEAU/, 'Plateau'], [/PORT[\s-]*BOUET/, 'Port-Bouët'], [/TREICHVILLE/, 'Treichville'], [/YOPOUGON/, 'Yopougon'],
  [/ATTECOUBE/, 'Attécoubé'], [/ANYAMA/, 'Anyama'], [/BINGERVILLE/, 'Bingerville'], [/SONGON/, 'Songon']
];
// sous-titres qui sont en fait une autre commune
const QUARTIER_COMMUNE = [[/^ANYAMA/, 'Anyama'], [/^ATTECOUBE/, 'Attécoubé'], [/ALEPE|MONTEZO|BROFODOUME/, 'Alépé'], [/^BINGERVILLE/, 'Bingerville'], [/^SONGON/, 'Songon']];
function communeOf(section, quartier) {
  const q = deacc(quartier).toUpperCase(), s = deacc(section).toUpperCase();
  for (const [re, c] of QUARTIER_COMMUNE) if (re.test(q)) return c;
  for (const [re, c] of SECTION_COMMUNE) if (re.test(s)) return c;
  for (const [re, c] of SECTION_COMMUNE) if (re.test(q)) return c;
  return null;
}

/* Une entrée : « PHCIE X / M. Y – TEL. 07 .. / 27 .. / ADRESSE » (éventuellement sur plusieurs lignes) */
function parseEntry(text) {
  const t = clean(text);
  const telM = /\bT[EÉ]L\b\s*\.?\s*:?\s*/i.exec(t);
  let head = telM ? t.slice(0, telM.index) : t;
  let after = telM ? t.slice(telM.index + telM[0].length) : '';
  head = head.replace(/\s*[-–—\/]+\s*$/, '');
  let name, owner = '', addr = '';
  const parts = head.split('/').map(x => x.trim()).filter(Boolean);
  name = parts.shift() || head;
  if (telM) owner = parts.join(' / ');
  else { owner = (parts[0] && /^(M\.|MM\.|MME|MLLE|DR)/i.test(parts[0])) ? parts.shift() : ''; addr = parts.join(' / '); }
  if (!owner) { // « PHCIE ALIF NOUVELLE MME TRAORE … »
    const m = /\s[-–]?\s*\b(M\.|MM\.|MME|MLLE|DR\.?)\s/i.exec(name);
    if (m) { owner = name.slice(m.index).replace(/^\s*[-–]\s*/, ''); name = name.slice(0, m.index); }
  }
  const tels = [];
  if (after) {
    after = after.replace(/T[EÉ]L\s*\.?\s*:?/gi, ' ');
    let m; PHONE.lastIndex = 0;
    while ((m = PHONE.exec(after))) tels.push(m[0].replace(/[^\d]/g, '').replace(/^225(?=\d{10}$)/, ''));
    addr = after.replace(PHONE, ' ').replace(/(\s*[\/,;:–-]\s*){2,}/g, ' / ').replace(/^[\s\/,;:–-]+|[\s\/,;:–-]+$/g, '').trim();
  }
  owner = clean(owner).replace(/^[\s\/–-]+|[\s\/–-]+$/g, '');
  return {
    nom: pharmacyName(name),
    responsable: owner ? titleCase(owner).replace(/^(Mlle|Mme|Dr|M)\.?\s*/i, (m, a) => ({ m: 'M. ', mme: 'Mme ', mlle: 'Mlle ', dr: 'Dr ' }[a.toLowerCase()])) : null,
    tel: tels[0] || null, tels: [...new Set(tels)],
    adresse: addr ? titleCase(addr) : null
  };
}

function weekFrom(line) {
  const L = deacc(line).toUpperCase();
  const m = /SEMAINE DU\s+\w+\s+(\d{1,2})(?:ER)?\s*([A-Z]+)?\s+AU\s+\w+\s+(\d{1,2})(?:ER)?\s+([A-Z]+)\s+(\d{4})/.exec(L);
  if (!m) return null;
  const y2 = +m[5], m2 = MONTHS[m[4]];
  if (!m2) return null;
  let m1 = m[2] && MONTHS[m[2]] ? MONTHS[m[2]] : m2, y1 = y2;
  if (+m[1] > +m[3] && m1 === m2) m1 = m2 - 1;
  if (m1 < 1) { m1 = 12; y1 = y2 - 1; }
  if (m1 > m2) y1 = y2 - 1;
  return { du: ymd(y1, m1, +m[1]), au: ymd(y2, m2, +m[3]) };
}

/* Texte « pdftotext -layout » du PDF UNPPCI -> { semaines: [{ du, au, pharmacies }] } */
function parseUnppciText(text) {
  const weeks = new Map();
  let week = null, section = '', quartier = '', cur = null;
  const flush = () => {
    if (cur && week) {
      const e = parseEntry(cur.lines.join(' '));
      e.commune = communeOf(cur.section, cur.quartier);
      e.quartier = cur.quartier ? titleCase(cur.quartier.replace(/\s*\/\s*/g, ' / ')) : null;
      const w = weeks.get(week.du);
      if (!w.pharmacies.some(p => p.nom === e.nom && p.tel === e.tel)) w.pharmacies.push(e);
    }
    cur = null;
  };
  const ENTRY = /^(?:SECTEUR\s+(\d+)\s+)?(PH(AR)?CIE|PHIE|PHARMACIE)\b/i;
  const rows = String(text).replace(/\f/g, '\n').split(/\n/);
  let prevBlank = true, prevWasHeader = false;
  for (let i = 0; i < rows.length; i++) {
    const line = rows[i];
    const s = line.trim();
    if (!s) { prevBlank = true; continue; }
    const wasBlank = prevBlank, afterHeader = prevWasHeader;
    prevBlank = false; prevWasHeader = false;
    const lead = line.length - line.trimStart().length;
    const wk = /SEMAINE DU/i.test(s) && weekFrom(s);
    if (wk) {
      flush();
      if (!week || week.du !== wk.du) { section = ''; quartier = ''; }
      week = wk;
      if (!weeks.has(wk.du)) weeks.set(wk.du, { du: wk.du, au: wk.au, pharmacies: [] });
      continue;
    }
    if (/TOUR DE GARDE|^PERMANENCE/i.test(s)) { flush(); prevWasHeader = true; continue; }
    const em = ENTRY.exec(s);
    const isEntry = !!em && lead < 20;
    const plain = s.length <= 60 && !/T[EÉ]L\b/i.test(s) && !/\d{2}\s\d{2}\s\d{2}/.test(s) && !/^(PH(AR)?CIE|PHIE|PHARMACIE)\b/i.test(s);
    // titre centré, ou titre à gauche isolé (après une ligne vide ou un titre) suivi d'une officine
    let nextIsEntry = false;
    for (let j = i + 1; j < rows.length; j++) { const n = rows[j].trim(); if (n) { nextIsEntry = ENTRY.test(n); break; } }
    const isHeader = !isEntry && plain && (lead >= 25 || ((wasBlank || afterHeader || !cur) && nextIsEntry && s === s.toUpperCase()));
    if (isHeader) {
      flush(); prevWasHeader = true;
      if (/^SECTION\b/i.test(s)) { section = s.replace(/^SECTION\s+(D['’]\s*|DE\s+|DU\s+|DES\s+)?/i, ''); quartier = ''; }
      else { quartier = s; if (!section) section = s; }
      continue;
    }
    if (isEntry) {
      flush();
      cur = { lines: [em[1] ? s.replace(/^SECTEUR\s+\d+\s+/i, '') : s], section, quartier: em[1] ? `${quartier && !/^YOPOUGON$/i.test(quartier) ? quartier + ' – ' : ''}Secteur ${em[1]}` : quartier };
      continue;
    }
    if (cur) cur.lines.push(s);
  }
  flush();
  return { semaines: [...weeks.values()].sort((a, b) => a.du.localeCompare(b.du)) };
}

/* ---------- HTML ---------- */
const decode = s => String(s).replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&apos;|&#8217;|&rsquo;/g, "'").replace(/&quot;/g, '"')
  .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n)).replace(/\s+/g, ' ').trim();

/* Période « du Samedi 17 Octobre au Vendredi 23 Octobre 2026 » */
function periodFrom(text) {
  const L = deacc(text).toUpperCase();
  const m = /DU\s+(?:[A-Z]+\s+)?(\d{1,2})(?:ER)?\s*([A-Z]+)?\s+AU\s+(?:[A-Z]+\s+)?(\d{1,2})(?:ER)?\s+([A-Z]+)\s+(\d{4})/.exec(L);
  if (!m) return null;
  return weekFrom(`SEMAINE DU X ${m[1]}${m[2] ? ' ' + m[2] : ''} AU X ${m[3]} ${m[4]} ${m[5]}`);
}

/* pharmacies-de-garde.ci : tableau « Commune et quartier | Pharmacie | Médecin et contact » */
function parsePdgHtml(html) {
  const period = periodFrom(decode((/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi.exec(html) || [])[1] || '') + ' ' + decode(html).slice(0, 4000));
  const out = [];
  let lastCommune = '';
  for (const row of html.match(/<tr[\s\S]*?<\/tr>/gi) || []) {
    const cells = (row.match(/<t[dh][^>]*>[\s\S]*?<\/t[dh]>/gi) || []).map(decode);
    if (cells.length < 2) continue;
    let [zone, nom, contact = ''] = cells.length >= 3 ? cells : ['', cells[0], cells[1]];
    if (!/pharma|phcie/i.test(nom) || /^pharmacie de garde$/i.test(nom)) continue;
    zone = zone || lastCommune; lastCommune = zone;
    const z = zone.split(/\s+-\s+/);
    const e = parseEntry(`${nom} / ${contact}`);
    e.commune = communeOf(z[0], z[1] || '') || titleCase(z[0]);
    e.quartier = z[1] ? titleCase(z[1]) : (z[0] && communeOf('', z[0]) !== titleCase(z[0]) ? titleCase(z[0]) : null);
    out.push(e);
  }
  return { periode: period, pharmacies: out };
}

/* annuaireci.com : lecture générique (blocs contenant « Pharmacie » et un numéro) */
function parseGenericHtml(html) {
  const text = html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ');
  const period = periodFrom(decode(text).slice(0, 20000));
  const out = [];
  const blocks = text.split(/<\/(?:li|tr|article|div|p|h[2-5])>/i).map(decode);
  let commune = '';
  for (const b of blocks) {
    if (!b) continue;
    const c = communeOf(b.length < 40 ? b : '', '');
    if (c && b.length < 40) { commune = c; continue; }
    if (b.length > 400 || !/pharma|phcie/i.test(b)) continue;
    PHONE.lastIndex = 0;
    if (!PHONE.test(b)) continue;
    const m = /(pharmacie|phcie)\s+[^\d|•\n]{2,60}?(?=\s*(?:[-–|,:\/]|\bT[ée]l|\bM\.|\bMme|\bDr|\d))/i.exec(b);
    if (!m) continue;
    const e = parseEntry(b.slice(m.index));
    e.commune = e.commune || communeOf(b, '') || commune || null;
    if (!out.some(x => x.nom === e.nom)) out.push(e);
  }
  return { periode: period, pharmacies: out };
}

/* Trouver le PDF du mois dans la page d'article UNPPCI (liens, onclick, scripts…) */
function unppciPdfCandidates(html, base = 'https://www.unppci.org/') {
  const urls = new Set();
  const re = /(?:https?:\/\/(?:www\.)?unppci\.org\/)?(?:\.\/)?(uploads\/[\w\-./%]+?\.pdf)/gi;
  let m;
  while ((m = re.exec(html))) {
    const ctx = decode(html.slice(Math.max(0, m.index - 400), m.index + 300)).toUpperCase();
    urls.add(JSON.stringify({ url: new URL(m[1], base).href, ctx: deacc(ctx) }));
  }
  const list = [...urls].map(JSON.parse);
  const score = c => (/GARDE/.test(c.ctx) ? 2 : 0) + (/INTERIEUR/.test(c.ctx) ? -3 : 0) + (/SEMAINE/.test(c.ctx) ? -1 : 0)
    + (/VOEUX|EXPO|TRONC|COLLECTE/.test(c.ctx) ? -5 : 0);
  return list.sort((a, b) => score(b) - score(a));
}

/* Semaine en cours (ou prochaine) d'une liste de semaines */
function currentWeek(semaines, today) {
  const t = today || new Date().toISOString().slice(0, 10);
  return semaines.find(w => w.du <= t && t <= w.au) || semaines.find(w => w.du > t) || null;
}

module.exports = { parseUnppciText, parseEntry, pharmacyName, parsePdgHtml, parseGenericHtml, unppciPdfCandidates, currentWeek, periodFrom, weekFrom, communeOf, titleCase };
