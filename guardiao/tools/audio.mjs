// Regrava a trilha mixada usada pela prévia (public/audio/trilha.mp3) a partir da síntese do próprio app.
// Rode depois de mudar src/audio/ ou public/script.json:  node tools/audio.mjs
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { startServer, GL, ROOT } from './server.mjs';
const { chromium } = createRequire(import.meta.url)('playwright');
const server = await startServer(5800 + Math.floor(Math.random() * 90)), browser = await chromium.launch({ args: GL }), page = await browser.newPage({ viewport: { width: 540, height: 960 } });
await page.goto(server.url + '?render=1&scale=0.35'); await page.waitForFunction(() => window.__film?.ready, null, { timeout: 300000 });
const wav = path.join(ROOT, 'out', 'trilha.wav'), mp3 = path.join(ROOT, 'public', 'audio', 'trilha.mp3'); fs.mkdirSync(path.dirname(wav), { recursive: true }); fs.mkdirSync(path.dirname(mp3), { recursive: true });
fs.writeFileSync(wav, Buffer.from(await page.evaluate(() => window.__film.audioWavBase64()), 'base64'));
const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libmp3lame', '-b:a', '192k', mp3], { stdio: 'inherit' }); fs.rmSync(wav);
await browser.close(); await server.close(); console.log(r.status === 0 ? mp3 : 'falhou'); process.exit(r.status ?? 1);
