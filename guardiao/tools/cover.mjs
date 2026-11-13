// Capa do filme (1080×1920): renderiza um quadro sem legendas e aplica a tipografia de capa.
//   node tools/cover.mjs [t] [saida.jpg]        padrão: t = 15.7 → videos/capa.jpg
//   node tools/cover.mjs --raw 31.5 out/c.jpg   só o quadro, sem título (para escolher a cena)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { startServer, GL } from './server.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const args = process.argv.slice(2), raw = args[0] === '--raw'; if (raw) args.shift();
const [t = '15.7', out = 'videos/capa.jpg'] = args;
const server = await startServer(5900 + Math.floor(Math.random() * 90));
const browser = await chromium.launch({ args: GL }), page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', (e) => { console.error(e.message); process.exit(1); });
await page.goto(server.url + '?render=1'); await page.waitForFunction(() => window.__film?.ready, null, { timeout: 300000 });
await page.evaluate((n) => window.__film.renderFrame(n), Math.round(Number(t) * 60));
await page.evaluate((raw) => {
  const hud = document.getElementById('hud');
  hud.innerHTML = raw ? '' : `<div class="cv-shade"></div>
    <div class="cv-top"><span>CURTA ANIMADO ORIGINAL</span></div>
    <div class="cv-title"><small>O ÚLTIMO</small><b>GUARDIÃO</b><small>DAS ESTRELAS</small>
      <svg viewBox="0 0 800 30"><path d="M40 15 H360 M440 15 H760"/><path class="st" d="M400 2 L404 11 L414 15 L404 19 L400 28 L396 19 L386 15 L396 11 Z"/></svg></div>
    <div class="cv-tag">Às vezes, o infinito começa dentro de você.</div>`;
  const st = document.createElement('style'); st.textContent = `
    .cv-shade { position: absolute; inset: 0; background: linear-gradient(180deg, #04061288 0%, #04061200 20%, #04061200 50%, #040612cc 76%, #040612f5 100%); }
    .cv-top { position: absolute; top: 100px; left: 0; right: 0; text-align: center; font: 700 30px 'DM Sans'; letter-spacing: .36em; color: #ffd27a; text-shadow: 0 2px 16px #000; }
    .cv-title { position: absolute; left: 40px; right: 40px; top: 1210px; text-align: center; font-family: 'Cinzel', serif; color: #fff; text-shadow: 0 6px 40px #000, 0 0 90px #3f7cffaa; }
    .cv-title small { display: block; font-weight: 700; font-size: 84px; line-height: 1.1; letter-spacing: .1em; }
    .cv-title b { display: block; font-weight: 900; font-size: 158px; line-height: 1.06; letter-spacing: .02em; color: #ffe6a8; text-shadow: 0 6px 40px #000, 0 0 80px #f2a53a; }
    .cv-title svg { width: 780px; margin-top: 20px; } .cv-title path { fill: none; stroke: #ffd27a; stroke-width: 3; stroke-linecap: round; } .cv-title path.st { fill: #ffd27a; stroke: none; }
    .cv-tag { position: absolute; left: 0; right: 0; top: 1760px; text-align: center; font: 500 36px 'DM Sans'; letter-spacing: .1em; color: #e9e6df; }`;
  document.head.appendChild(st);
}, raw);
fs.mkdirSync(path.dirname(out), { recursive: true });
await page.screenshot({ path: out, type: 'jpeg', quality: 93 });
await browser.close(); await server.close(); console.log(out);
