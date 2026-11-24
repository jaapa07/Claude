/**
 * Gera retratos, ícones e miniaturas da interface a partir de CAPTURAS REAIS do jogo (modo estúdio):
 * ui/portraits/<personagem>.webp (512), ui/icons/<personagem>.webp (128), ui/karts/<kart>.webp (512),
 * ui/tracks/<pista>.webp (640×360). Requer o jogo servido (padrão http://localhost:5173).
 * Uso: npx tsx scripts/capture-ui.ts [--url=...] [--only=character|kart|track] [--ids=capi,tuca]
 * `--ids` limita a captura aos identificadores listados (de qualquer tipo).
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { CHARACTER_IDS, KART_IDS, TRACK_IDS } from '../src/data/ids';
import { ASSETS_DIR } from './lib/textures';

const flags = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? 'true']; }));
const url = String(flags.url ?? 'http://localhost:5173');
const only = flags.only as string | undefined;
const ids = flags.ids ? new Set(String(flags.ids).split(',')) : null;
const pick = <T extends string>(list: readonly T[]): T[] => list.filter((id) => !ids || ids.has(id));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

async function capture(studio: string, width: number, height: number, transparent: boolean): Promise<Buffer> {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript((q) => localStorage.setItem('kl3d.settings.v1', JSON.stringify({ quality: q })), studio.startsWith('track') ? 'medium' : 'high');
  await page.goto(`${url}/?studio=${studio}`);
  await page.addStyleTag({ content: '.ui-layer, .scene-loading { display: none !important; } html, body, #root { background: transparent !important; }' });
  await page.waitForSelector('[data-testid="game-canvas"][data-mode="studio"] canvas', { timeout: 60000 });
  await page.waitForFunction(() => document.querySelector('[data-testid="game-canvas"]')?.getAttribute('data-loading') === '0', undefined, { timeout: 120000 });
  await page.waitForTimeout(studio.startsWith('track') ? 12000 : 2500);
  if (errors.length) throw new Error(`erro na página (${studio}): ${errors[0]}`);
  const shot = await page.screenshot({ omitBackground: transparent, type: 'png', timeout: 180000, animations: 'disabled' });
  await page.close();
  return shot;
}

const save = async (rel: string, img: ReturnType<typeof sharp>): Promise<void> => {
  const file = path.join(ASSETS_DIR, rel);
  await mkdir(path.dirname(file), { recursive: true });
  await img.webp({ quality: 88, alphaQuality: 95 }).toFile(file);
};

try {
  if (!only || only === 'character') {
    for (const id of pick(CHARACTER_IDS)) {
      const png = await capture(`character:${id}`, 640, 640, true);
      await save(`ui/portraits/${id}.webp`, sharp(png).resize(512, 512));
      await save(`ui/icons/${id}.webp`, sharp(png).extract({ left: 150, top: 40, width: 340, height: 340 }).resize(128, 128));
      console.log('personagem', id);
    }
  }
  if (!only || only === 'kart') {
    for (const id of pick(KART_IDS)) {
      await save(`ui/karts/${id}.webp`, sharp(await capture(`kart:${id}`, 640, 640, true)).resize(512, 512));
      console.log('kart', id);
    }
  }
  if (!only || only === 'track') {
    for (const id of pick(TRACK_IDS)) {
      await save(`ui/tracks/${id}.webp`, sharp(await capture(`track:${id}`, 960, 540, false)).resize(640, 360));
      console.log('pista', id);
    }
  }
} finally {
  await browser.close();
}
