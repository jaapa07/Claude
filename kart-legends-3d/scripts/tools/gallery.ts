/**
 * Capturas reais de gameplay (build servida em --url) em docs/screenshots e medição de FPS por pista.
 * Uso: npx tsx scripts/tools/gallery.ts [--url=http://127.0.0.1:4173] [--quality=medium] [--tracks=a,b]
 */
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { TRACK_IDS } from '../../src/data/ids';

const flags = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? 'true']; }));
const url = String(flags.url ?? 'http://127.0.0.1:4173');
const quality = String(flags.quality ?? 'medium');
const tracks = flags.tracks ? String(flags.tracks).split(',') : [...TRACK_IDS];
const out = path.resolve(import.meta.dirname, '../../docs/screenshots');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const fpsReport: Record<string, number> = {};
const errors: string[] = [];

for (const track of tracks) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => errors.push(`${track}: ${e.message}`));
  await page.addInitScript((q) => {
    localStorage.setItem('kl3d.settings.v1', JSON.stringify({ quality: q }));
    // save com tudo liberado só para a galeria (as pistas da Copa Eclipse começam bloqueadas)
    localStorage.setItem('kl3d.save', JSON.stringify({ version: 1, unlocked: { characters: ['nilo', 'boro', 'lumi', 'kora', 'tiko', 'mavi', 'runi', 'zera'], karts: ['flecha', 'engrenagem', 'cometa', 'broto', 'faisca', 'mare', 'duna', 'geada'], cups: ['aurora', 'eclipse'] }, trophies: { aurora: 'gold', eclipse: null }, records: {}, stats: {} }));
  }, quality);
  await page.goto(`${url}/?fast=1&e2e=1`);
  await page.getByTestId('btn-start').click({ timeout: 180000 });
  await page.getByTestId('btn-play').click();
  await page.getByTestId('card-mode-quick').click(); await page.getByTestId('btn-confirm').click();
  await page.getByTestId(`card-track-${track}`).click(); await page.getByTestId('btn-confirm').click();
  await page.getByTestId('card-difficulty-normal').click(); await page.getByTestId('btn-confirm').click();
  const who = ['nilo', 'boro', 'lumi', 'kora', 'tiko', 'mavi', 'runi', 'zera'][tracks.indexOf(track) % 8]!;
  await page.getByTestId(`card-character-${who}`).click(); await page.getByTestId('btn-confirm').click();
  await page.getByTestId('btn-confirm').click();
  await page.waitForFunction(() => !!(window as unknown as { __kl3d?: unknown }).__kl3d, undefined, { timeout: 180000 });
  await page.waitForFunction(() => document.querySelector('[data-testid="game-canvas"]')?.getAttribute('data-loading') === '0', undefined, { timeout: 180000 });
  const ff = (s: number): Promise<void> => page.evaluate((x) => { (window as unknown as { __kl3d: { fastForward: (n: number) => void } }).__kl3d.fastForward(x); }, s);
  await page.evaluate(() => { (window as unknown as { __kl3d: { setAutopilot: (b: boolean) => void } }).__kl3d.setAutopilot(true); });
  await page.waitForFunction(() => (window as unknown as { __kl3d: { snapshot: () => { phase: string } } }).__kl3d.snapshot().phase !== 'intro', undefined, { timeout: 120000 });
  await ff(3.2 + 9);
  await page.waitForTimeout(6000);
  await page.screenshot({ path: path.join(out, `corrida-${track}-1.png`) });
  await ff(22);
  await page.waitForTimeout(6000);
  await page.screenshot({ path: path.join(out, `corrida-${track}-2.png`) });
  fpsReport[track] = Number(await page.getByTestId('game-canvas').getAttribute('data-fps'));
  console.log(track, 'fps (software)', fpsReport[track]);
  if (track === tracks[0]) {
    for (let i = 0; i < 40; i++) { await ff(10); if (await page.getByTestId('screen-results').isVisible()) break; await page.waitForTimeout(300); }
    await page.getByTestId('screen-results').waitFor({ timeout: 120000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: path.join(out, 'resultados.png') });
    await page.getByTestId('btn-continue').click();
    await page.getByTestId('screen-podium').waitFor();
    await page.waitForTimeout(9000);
    await page.screenshot({ path: path.join(out, 'podio.png') });
  }
  await page.close();
}
writeFileSync(path.join(out, 'fps-software.json'), JSON.stringify({ renderer: 'SwiftShader (WebGL por software, sem GPU)', resolution: '1280x720', quality, fps: fpsReport }, null, 2));
console.log(errors.length ? `ERROS: ${errors.join(' | ')}` : 'sem erros de página');
await browser.close();
