// ZUPA — vérifie la base partagée des lieux depuis la compilation (aucune donnée n'est créée)
import fs from 'node:fs';
const cfg = fs.readFileSync('www/js/config.js', 'utf8');
const url = (cfg.match(/supabaseUrl:\s*['"]([^'"]*)/) || [])[1], key = (cfg.match(/supabaseKey:\s*['"]([^'"]*)/) || [])[1];
const note = (lvl, msg) => console.log(`::${lvl} title=Base partagée des lieux::${msg}`);
if (!url || !key) { note('notice', 'non configurée'); process.exit(0); }
const H = { apikey: key, 'Content-Type': 'application/json' };
if (!key.startsWith('sb_')) H.Authorization = 'Bearer ' + key;
const call = async (path, opt = {}) => { try { const r = await fetch(url + path, { headers: { ...H, ...(opt.headers || {}) }, method: opt.method || 'GET', body: opt.body }); return { s: r.status, t: (await r.text()).slice(0, 160) }; } catch (e) { return { s: 0, t: String(e) }; } };
const out = [];
const read = await call('/rest/v1/lieux?select=id,name&limit=1');
out.push(`lecture ${read.s === 200 ? 'OK' : 'ÉCHEC ' + read.s + ' ' + read.t}`);
const dev = await call('/rest/v1/lieux?select=device&limit=1');
out.push(`colonne device ${dev.s >= 400 ? 'protégée' : 'LISIBLE (à corriger)'}`);
const bad = await call('/rest/v1/lieux', { method: 'POST', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ id: '00000000-0000-4000-8000-000000000000', cat: 'wc', name: 'Test', lat: 48.85, lon: 2.35, device: '00000000-0000-4000-8000-000000000001' }) });
out.push(`ajout ${bad.s === 400 && /lat_check/.test(bad.t) ? 'autorisé, contrôles actifs' : bad.s === 401 || bad.s === 403 ? 'REFUSÉ (droits manquants) ' + bad.t : 'réponse inattendue ' + bad.s + ' ' + bad.t}`);
const upd = await call('/rest/v1/lieux?id=eq.00000000-0000-4000-8000-000000000000', { method: 'PATCH', body: JSON.stringify({ name: 'x' }) });
out.push(`modification ${upd.s >= 400 ? 'interdite' : 'POSSIBLE (à corriger)'}`);
const popu = await call('/rest/v1/rpc/lieux_populaires', { method: 'POST', body: JSON.stringify({ p_lat: 5.33, p_lon: -4.01, p_km: 5 }) });
out.push(popu.s === 200 ? 'amis et lieux populaires OK' : popu.s === 404 ? 'AMIS NON INSTALLÉS : exécutez supabase/amis.sql' : 'amis : réponse ' + popu.s + ' ' + popu.t);
const blq = await call('/rest/v1/rpc/bloques_liste', { method: 'POST', body: JSON.stringify({ p_secret: '00000000-0000-4000-8000-0000000000ff' }) });
out.push(blq.s === 404 ? 'BLOCAGE NON INSTALLÉ : relancez supabase/amis.sql' : 'blocage OK');
const ok = blq.s !== 404 && popu.s === 200 && read.s === 200 && dev.s >= 400 && bad.s === 400 && upd.s >= 400;
note(ok ? 'notice' : 'warning', out.join(' · '));
