/**
 * Abre o jogo no Chromium headless, navega até uma corrida e salva capturas (inspeção manual/depuração).
 * Uso: npx tsx scripts/tools/play.ts <pasta-saida> [--track=<id>] [--url=http://localhost:5173] [--drive=8] [--quality=medium]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const out = args.find((a) => !a.startsWith('--')) ?? '.';
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? 'true']; }));
const url = String(flags.url ?? 'http://localhost:5173');
const track = String(flags.track ?? 'porto-lanternas');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const logs: string[] = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text().slice(0, 300)}`); });
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message.slice(0, 400)}`));
const shot = async (name: string): Promise<void> => { await page.screenshot({ path: path.join(out, `${name}.png`) }); console.log('captura', name); };
try {
  await page.addInitScript((q) => {
    localStorage.setItem('kl3d.settings.v1', JSON.stringify({ quality: q }));
  }, String(flags.quality ?? 'medium'));
  await page.goto(`${url}/?fast=1`);
  await page.getByTestId('btn-start').click({ timeout: 120000 });
  await page.getByTestId('screen-menu').waitFor();
  await page.waitForTimeout(2500);
  await shot('01-menu');
  await page.getByTestId('btn-play').click();
  await page.getByTestId('card-mode-quick').dblclick();
  await page.getByTestId(`card-track-${track}`).click();
  await shot('02-track');
  await page.getByTestId('btn-confirm').click();
  await page.getByTestId('card-difficulty-normal').dblclick();
  await page.getByTestId('screen-character').waitFor();
  await page.waitForTimeout(1500);
  await shot('03-character');
  await page.getByTestId('btn-confirm').click();
  await page.getByTestId('screen-kart').waitFor();
  await page.waitForTimeout(1500);
  await shot('04-kart');
  await page.getByTestId('btn-confirm').click();
  await page.getByTestId('hud').waitFor({ timeout: 60000 });
  await page.waitForFunction(() => document.querySelector('[data-testid="game-canvas"]')?.getAttribute('data-loading') === '0', undefined, { timeout: 120000 });
  await page.waitForTimeout(2500);
  await shot('05-countdown');
  await page.keyboard.down('KeyW');
  const drive = Number(flags.drive ?? 8);
  await page.waitForTimeout(4000 + drive * 400);
  await shot('06-race');
  await page.keyboard.down('KeyD'); await page.keyboard.down('Space');
  await page.waitForTimeout(1200);
  await shot('07-drift');
  await page.keyboard.up('KeyD'); await page.keyboard.up('Space');
  await page.waitForTimeout(drive * 600);
  await shot('08-race');
  await page.keyboard.up('KeyW');
} catch (e) {
  console.error('FALHA:', (e as Error).message.split('\n')[0]);
  await shot('erro');
} finally {
  console.log(logs.slice(0, 25).join('\n'));
  await browser.close();
}
