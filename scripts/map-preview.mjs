// ZUPA — aperçu de la carte hors ligne (navigateur sans internet), pour vérifier le rendu
import { chromium } from 'playwright-core';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.pmtiles': 'application/octet-stream' };
const srv = createServer(async (q, r) => {
  try { const p = join('www', decodeURIComponent(new URL(q.url, 'http://x').pathname)); const b = await readFile(p.endsWith('/') ? p + 'index.html' : p); r.writeHead(200, { 'Content-Type': TYPES[extname(p)] || 'application/octet-stream' }); r.end(b); }
  catch { r.writeHead(404); r.end(); }
}).listen(8099);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH });
const out = [];
for (const theme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2, geolocation: { latitude: 5.3245, longitude: -4.0195, accuracy: 10 }, permissions: ['geolocation'], locale: 'fr-FR', colorScheme: theme });
  await ctx.route(u => !u.href.startsWith('http://localhost:8099'), r => r.abort()); // hors ligne
  const pg = await ctx.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  await pg.goto('http://localhost:8099/index.html');
  await pg.waitForTimeout(2500);
  await pg.click('[data-geo="fix"]').catch(() => {});
  await pg.waitForTimeout(5000);
  const file = `dist/apercu-carte-${theme}.png`;
  await pg.screenshot({ path: file });
  out.push(file + (errs.length ? ' (erreurs : ' + errs.join(' | ').slice(0, 200) + ')' : ''));
  await ctx.close();
}
await browser.close(); srv.close();
console.log('::notice title=Aperçu carte::' + out.join(' ; '));
