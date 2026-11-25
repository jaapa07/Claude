/**
 * Mede o FPS de corrida no Chromium com WebGL por software (SwiftShader), emulando um iPhone 14 na horizontal.
 * O kart do jogador vai no piloto automático (gancho ?e2e=1) e a contagem de quadros é feita na própria página
 * (requestAnimationFrame) em janelas de alguns segundos, depois da largada.
 * Uso: npx tsx scripts/tools/fps-bench.ts [--url=http://127.0.0.1:4173] [--tracks=a,b] [--quality=low] [--secs=12]
 *      [--shots=<pasta>] (salva uma captura por pista) [--runs=1]
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
if (shots) mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results: Record<string, number[]> = {};
try {
  for (let run = 0; run < runs; run++) {
    for (const track of arena ? [arena] : tracks) {
      const ctx = await browser.newContext({ ...devices['iPhone 14 landscape'] });
      const page = await ctx.newPage();
      await page.addInitScript((q) => { localStorage.setItem('kl3d.settings.v1', JSON.stringify({ quality: q })); }, quality);
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
        await page.getByTestId(`card-arena-${arena}`).click();
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
