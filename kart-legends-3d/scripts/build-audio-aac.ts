/**
 * Cópia AAC (.m4a) de cada áudio Ogg, para navegadores que não decodificam Ogg Vorbis (Safari no iPhone).
 * Saída: public/assets/audio/aac/<mesmo caminho>.m4a. O gerenciador de áudio usa a cópia só se o Ogg falhar.
 * Uso: npx tsx scripts/build-audio-aac.ts   (requer ffmpeg no PATH)
 */
import { spawnSync } from 'node:child_process';
import { mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { ASSETS_DIR } from './lib/textures';

const AUDIO = path.join(ASSETS_DIR, 'audio');
const OUT = path.join(AUDIO, 'aac');

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (p !== OUT) out.push(...await walk(p)); } else if (e.name.endsWith('.ogg')) out.push(p);
  }
  return out;
}

const files = await walk(AUDIO);
for (const f of files) {
  const rel = path.relative(AUDIO, f).replace(/\.ogg$/, '.m4a');
  const dest = path.join(OUT, rel);
  await mkdir(path.dirname(dest), { recursive: true });
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', f, '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', dest], { stdio: 'inherit' });
  if (r.status !== 0) { console.error(`ffmpeg falhou: ${f}`); process.exit(1); }
}
console.log(`${files.length} arquivos AAC em ${path.relative(process.cwd(), OUT)}`);
