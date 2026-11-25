/**
 * Mede o FPS de corrida no Chromium com WebGL por software (SwiftShader), emulando um iPhone 14 na horizontal.
 * O kart do jogador vai no piloto automático (gancho ?e2e=1) e a contagem de quadros é feita na própria página
 * (requestAnimationFrame) em janelas de alguns segundos, depois da largada.
 * Uso: npx tsx scripts/tools/fps-bench.ts [--url=http://127.0.0.1:4173] [--tracks=a,b] [--quality=low] [--secs=12]
 *      [--shots=<pasta>] (salva uma captura por pista) [--runs=1] [--arena=<id>]
 *      [--static] (cenário parado: ms por quadro com a câmera da largada e +8 s, sem variação da corrida)
 */
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? 'true']; }));
const url = String(flags.url ?? 'http://127.0.0.1:4173');
const tracks = String(flags.tracks ?? 'porto-lanternas,vale-moinhos,cidade-neon,templo-esmeralda').split(',');
const quality = String(flags.quality ?? 'low');
const secs = Number(flags.secs ?? 12);
const runs = Number(flags.runs ?? 1);
const shots = flags.shots ? String(flags.shots) : null;
const arena = flags.arena ? String(flags.arena) : null;
const stat = !!flags.static;
if (shots) mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results: Record<string, number[]> = {};
try {
  for (let run = 0; run < runs; run++) {
    for (const track of arena ? [arena] : tracks) {
      // no modo parado, pixel ratio 0,6 fixa a resolução (a adaptativa não tem para onde descer): comparação justa
      const ctx = await browser.newContext({ ...devices['iPhone 14 landscape'], ...(stat ? { deviceScaleFactor: 0.6 } : {}) });
      const page = await ctx.newPage();
      await page.addInitScript((q) => { localStorage.setItem('kl3d.settings.v1', JSON.stringify({ quality: q })); localStorage.setItem('kl3d.save', JSON.stringify({ version: 2, unlocked: { characters: [], karts: [], cups: ['aurora', 'eclipse', 'meteoro'] }, coins: 0, owned: { characters: [], karts: [], tires: [], cosmetics: [] }, trophies: {}, records: {}, stats: {} })); }, quality);
      await page.goto(`${url}/?fast=1&e2e=1`);
      await page.getByTestId('btn-start').click({ timeout: 180_000 });
      await page.getByTestId('screen-menu').waitFor();
      await page.getByTestId('btn-play').click();
      // a escolha de 1/2 jogadores só existe no computador
      if (await page.getByTestId('screen-players').isVisible().catch(() => false)) {
        await page.getByTestId('card-players-1').click();
        await page.getByTestId('btn-confirm').click();
      }
      if (arena) {
        await page.getByTestId('card-mode-battle').click();
        await page.getByTestId('btn-confirm').click();
        await page.getByTestId('card-battle-estoura-balao').click();
        await page.getByTestId('btn-confirm').click();
        await page.getByTestId(`card-arena-${arena}`).click();
        await page.getByTestId('btn-confirm').click();
        await page.getByTestId('card-difficulty-easy').click();
        await page.getByTestId('btn-confirm').click();
      } else {
        await page.getByTestId('card-mode-quick').click();
        await page.getByTestId('btn-confirm').click();
        await page.getByTestId(`card-track-${track}`).click();
        await page.getByTestId('btn-confirm').click();
        await page.getByTestId('card-difficulty-easy').click();
        await page.getByTestId('btn-confirm').click();
      }
      for (const s of ['character', 'kart']) {
        await page.getByTestId(`screen-${s}`).waitFor();
        await page.getByTestId('btn-confirm').click();
      }
      await page.getByTestId('hud').waitFor({ timeout: 180_000 });
      await page.waitForFunction(() => document.querySelector('[data-testid="game-canvas"]')?.getAttribute('data-loading') === '0', undefined, { timeout: 180_000 });
      await page.waitForFunction(() => (window as unknown as { __kl3d?: { snapshot: () => { phase: string } } }).__kl3d?.snapshot().phase !== 'intro', undefined, { timeout: 180_000 });
      if (stat) {
        // cenário parado: mesma câmera da largada (e 8 s de corrida adiantados), laço de quadros desligado; mede o
        // tempo de N renderizações seguidas com a resolução fixada — sem a variação da corrida e da resolução adaptativa
        const ms = await page.evaluate(`(async () => {
          const k = window.__kl3d, f = window.__kl3dFrames, out = [];
          for (const ahead of [3.4, 8]) {
            k.fastForward(ahead);
            await new Promise((r) => setTimeout(r, 1500));
            f.manual(true);
            const s = k.snapshot(), c = f.camera();
            const target = [s.x, c.pos[1] - 2.2, s.z];
            const gl = document.querySelector('canvas').getContext('webgl2');
            for (let i = 0; i < 3; i++) f.view(c.pos, target);
            gl.finish();
            const t0 = performance.now();
            for (let i = 0; i < 12; i++) f.view(c.pos, target);
            gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
            out.push((performance.now() - t0) / 12);
            f.manual(false);
          }
          return out;
        })()`) as number[];
        const size = await page.evaluate('(() => { const c = document.querySelector("canvas"); return c.width + "x" + c.height; })()') as string;
        const v = ms.reduce((a, b) => a + b, 0) / ms.length;
        (results[track] ??= []).push(Math.round(v * 10) / 10);
        console.log(`${track}: ${ms.map((x) => x.toFixed(1)).join(' / ')} ms por quadro (largada / +8 s), canvas ${size}  STATIC`);
        if (shots && run === 0) await page.screenshot({ path: path.join(shots, `${track}-${quality}-static.png`) });
        await ctx.close();
        continue;
      }
      await page.evaluate(() => { const k = (window as unknown as { __kl3d: { fastForward: (s: number) => void; setAutopilot: (on: boolean) => void } }).__kl3d; k.fastForward(3.4); k.setAutopilot(true); });
      await page.waitForTimeout(3000);
      // texto puro: o tsx injeta auxiliares (__name) em funções nomeadas que não existem na página
      const fps = await page.evaluate(`new Promise((resolve) => {
        let frames = 0; const t0 = performance.now();
        const tick = () => { frames++; if (performance.now() - t0 < ${secs * 1000}) requestAnimationFrame(tick); else resolve(frames / ((performance.now() - t0) / 1000)); };
        requestAnimationFrame(tick);
      })`) as number;
      (results[track] ??= []).push(Math.round(fps * 100) / 100);
      console.log(`${track}: ${fps.toFixed(2)} FPS`);
      if (shots && run === 0) await page.screenshot({ path: path.join(shots, `${track}-${quality}.png`) });
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}
const mean = (a: number[]): number => a.reduce((s, x) => s + x, 0) / a.length;
console.log(JSON.stringify({ quality, secs, runs, fps: Object.fromEntries(Object.entries(results).map(([k, v]) => [k, { runs: v, mean: Math.round(mean(v) * 100) / 100 }])) }, null, 1));
