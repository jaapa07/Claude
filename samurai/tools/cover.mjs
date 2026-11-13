// Capa da série (1080×1920): renderiza um frame sem HUD e aplica a tipografia de capa.
//   node tools/cover.mjs [ep] [t] [saida.jpg]      padrão: ep 1, t 18.9 → videos/capa.jpg
//   node tools/cover.mjs --raw 3 7.6 out/c.jpg     só o frame, sem título (para escolher a cena)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { startServer } from '../server.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const args = process.argv.slice(2), raw = args[0] === '--raw'; if (raw) args.shift();
const [ep = '1', t = '18.9', out = 'videos/capa.jpg'] = args;
const server = await startServer(5188);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
page.on('pageerror', (e) => { console.error(e.message); process.exit(1); });
await page.goto('http://localhost:5188/?render=1'); await page.waitForFunction(() => window.__sam?.ready, null, { timeout: 180000 });
await page.evaluate(([e, f]) => window.__sam.renderFrame(e, f), [Number(ep), Math.round(Number(t) * 60)]);
await page.evaluate((raw) => {
  const hud = document.getElementById('hud');
  hud.innerHTML = raw ? '' : `
    <div class="cv-shade"></div>
    <div class="cv-top"><span>MINISSÉRIE ORIGINAL</span><i></i><span>5 EPISÓDIOS</span></div>
    <div class="cv-title"><small>O SAMURAI</small><small>QUE ROUBOU</small><b>O TEMPO</b>
      <svg viewBox="0 0 800 20"><path d="M4 12 C 120 2, 260 18, 400 9 S 690 4, 796 12"/></svg></div>
    <div class="cv-tag">O tempo não se possui. Se vive.</div>`;
  const st = document.createElement('style'); st.textContent = `
    .cv-shade { position: absolute; inset: 0; background: linear-gradient(180deg, #05071266 0%, #05071200 22%, #05071200 48%, #050712d9 78%, #050712f2 100%); }
    .cv-top { position: absolute; top: 96px; left: 0; right: 0; display: flex; justify-content: center; align-items: center; gap: 22px; font: 700 30px 'DM Sans'; letter-spacing: .34em; color: #f2c04e; }
    .cv-top i { width: 10px; height: 10px; background: #f2c04e; transform: rotate(45deg); }
    .cv-title { position: absolute; left: 50px; right: 50px; top: 1240px; text-align: center; font-family: 'Cinzel', serif; color: #fff; text-shadow: 0 6px 40px #000, 0 0 90px #3fa8ffaa; }
    .cv-title small { display: block; font-weight: 700; font-size: 88px; line-height: 1.08; letter-spacing: .08em; }
    .cv-title b { display: block; font-weight: 900; font-size: 172px; line-height: 1.05; letter-spacing: .03em; color: #ffe9b0; text-shadow: 0 6px 40px #000, 0 0 80px #f2a53a; }
    .cv-title svg { width: 760px; margin-top: 14px; } .cv-title path { fill: none; stroke: #f2c04e; stroke-width: 4; stroke-linecap: round; }
    .cv-tag { position: absolute; left: 0; right: 0; top: 1745px; text-align: center; font: 500 38px 'DM Sans'; letter-spacing: .12em; color: #e9e6df; }`;
  document.head.appendChild(st);
}, raw);
fs.mkdirSync(path.dirname(out), { recursive: true });
await page.screenshot({ path: out, type: 'jpeg', quality: 93 });
await browser.close(); server.close(); console.log(out);
