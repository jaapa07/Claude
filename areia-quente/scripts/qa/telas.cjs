// Auditoria de telas no celular: em vários tamanhos de iPhone (inclusive Safari com a barra visível), abre todas as telas
// e lista botões fora da tela. Uso: npm run build && node scripts/qa/telas.cjs   (SIZES=844x390,667x320 para escolher)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const DIST = path.join(__dirname, '..', '..', 'dist');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.glb': 'model/gltf-binary', '.woff2': 'font/woff2', '.woff': 'font/woff', '.mp3': 'audio/mpeg' };
const SIZES = (process.env.SIZES || '667x375,780x360,844x390,932x430,844x330,667x320').split(',').map((s) => s.split('x').map(Number));
const OUT = path.join(__dirname, '..', '..', 'docs', 'qa', 'telas') + '/';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  const report = [];
  for (const [w, h] of SIZES) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, hasTouch: true, isMobile: true, deviceScaleFactor: 1, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
    const page = await ctx.newPage();
    await page.route('http://game.local/**', (r) => { const f = path.join(DIST, decodeURIComponent(new URL(r.request().url()).pathname)); if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' }); r.fulfill({ status: 200, body: fs.readFileSync(f), contentType: TYPES[path.extname(f)] || 'application/octet-stream' }); });
    await page.goto('http://game.local/celular.html');
    await page.waitForFunction(() => window.__game?.flow.scene === 'title', null, { timeout: 180000 });
    const audit = (name) => page.evaluate((name) => {
      const sel = '.btn, .mtile, .tbar button, .opt, .size-pick .a, .arena-pick .a, .tcard .arrow, .sw, .k, .at, .it, [data-a]';
      const bad = [];
      for (const e of document.querySelectorAll('#ui ' + sel.split(', ').join(', #ui '))) {
        const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || e.closest('[style*="display: none"]')) continue;
        const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
        const inside = r.top >= -1 && r.bottom <= innerHeight + 1 && r.left >= -1 && r.right <= innerWidth + 1;
        if (inside) continue;
        // alcançável por rolagem?
        let sc = false; for (let p = e.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowY; if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight + 2) { sc = true; break; } }
        bad.push(`${(e.textContent || e.className).trim().slice(0, 24)}${sc ? ' (rolando)' : ' ✘FORA'} [${Math.round(r.top)}..${Math.round(r.bottom)} / ${innerHeight}]`);
      }
      // sobreposição: botão principal coberto por outro elemento?
      return { name, bad };
    }, name);
    const F = (fn, arg) => page.evaluate(fn, arg);
    const go = async (name, fn, arg, wait = 1500) => { try { await F(fn, arg); await sleep(wait); await page.waitForFunction(() => !window.__game.flow.busy, null, { timeout: 60000 }); await sleep(600); const a = await audit(name); report.push({ size: `${w}x${h}`, ...a }); await page.screenshot({ path: `${OUT}${w}x${h}_${name}.png` }); } catch (e) { report.push({ size: `${w}x${h}`, name, bad: ['ERRO ' + e.message.slice(0, 80)] }); } };
    await go('titulo', () => {});
    await go('menu', () => window.__game.flow.mainMenu());
    await go('times_amistoso', () => { const f = window.__game.flow; f.setup.mode = 'friendly'; f.teamSelect(false); });
    await go('times_copa', () => window.__game.flow.cupNew());
    await go('times_carreira', () => window.__game.flow.teamSelect(false, false, true));
    await go('times_treino', () => window.__game.flow.teamSelect(true));
    await go('copa_chave', () => { const f = window.__game.flow; f.setup.home = f.setup.home; f.cupStart(); });
    await go('desafios', () => window.__game.flow.challenges());
    await go('conquistas', () => window.__game.flow.achievements());
    await go('opcoes', () => window.__game.flow.options());
    await go('creditos', () => window.__game.flow.credits());
    await go('carreira_hub', () => { const f = window.__game.flow; f.setup.home = f.setup.home; f.career = null; f.teamSelect(false, false, true); });
    await go('carreira_hub2', () => { const f = window.__game.flow; window.__game.input.virtualKey('Enter', true); window.__game.input.virtualKey('Enter', false); }, null, 3000);
    await go('carreira_elenco', () => window.__game.flow.careerSquad());
    await go('carreira_historico', () => window.__game.flow.careerHistory());
    // partida: pausa, táticas, substituições, resultado
    await go('partida', () => { const f = window.__game.flow; Object.assign(f.setup, { homeDevices: ['kb'], awayDevices: [], mode: 'friendly', arena: 'copacabana' }); f.tick = undefined; f.loading(); }, null, 1000);
    await page.waitForFunction(() => window.__game.flow.match && window.__game.flow.scene === 'match', null, { timeout: 180000 }).catch(() => {});
    await go('pausa', () => { const m = window.__game.flow.match; m.hud.cinema(false); m.state = 'play'; window.__game.flow.pause(); });
    await go('taticas', () => window.__game.flow.tactics());
    await go('substituicoes', () => window.__game.flow.subs());
    await go('intervalo', () => { const f = window.__game.flow; f.unpause(); f.halftimePanel(true); });
    await go('resultado', () => { const f = window.__game.flow, m = f.match; f.halftimePanel(false); m.teams[0].score = 2; m.period = 3; m.clock = m.periodLen - 0.1; m.state = 'play'; window.__game.speed = 6; }, null, 1000);
    await page.waitForFunction(() => !!document.querySelector('.results'), null, { timeout: 120000 }).catch(() => {});
    await F(() => { window.__game.speed = 1; });
    await go('resultado2', () => {});
    await ctx.close();
  }
  await b.close();
  for (const r of report) if (r.bad.length) console.log(r.size, r.name, '→', r.bad.join(' | '));
  const bad = report.filter((r) => r.bad.some((x) => /FORA|ERRO/.test(x))).length;
  console.log('telas auditadas:', report.length, 'com problema:', bad);
  process.exit(bad ? 1 : 0);
})();
