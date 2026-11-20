/**
 * Gera TODO o áudio do Kart Legends 3D por síntese procedural própria:
 *   síntese (TypeScript) → WAV float → ffmpeg (libvorbis) → OGG em public/assets/audio/**
 * e escreve public/assets/audio/audio-manifest.json.
 *
 * Uso: `npm run assets:audio`  (ou `npx tsx scripts/build-audio.ts [--only=id,id] [--verbose]`)
 * Determinístico: toda aleatoriedade vem de RNG com semente derivada do id do arquivo.
 */
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  AMBIENCE_IDS,
  LOOP_IDS,
  MUSIC_IDS,
  SFX_IDS,
  ambienceFile,
  loopFile,
  musicFile,
  sfxFile,
} from '../src/game/audio/audioIds';
import { Stereo, db, encodeWav, normalizePeak, normalizeRms, softLimit, stats, toDb, trimTail } from './audio/dsp';
import { renderSong } from './audio/music';
import { renderAmbience, renderLoop, renderSfx } from './audio/sfx';
import { SONGS } from './audio/songs';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS = path.join(ROOT, 'public', 'assets');
const AUTHOR = 'Equipe Kart Legends 3D (síntese procedural própria)';
const LICENSE = 'Original do projeto';

type Kind = 'music' | 'sfx' | 'loop' | 'ambience';

interface Entry {
  id: string;
  kind: Kind;
  /** Caminho relativo a public/assets (o mesmo que se passa a `assetUrl`). */
  file: string;
  durationSec: number;
  loop: boolean;
  bytes: number;
  peakDb: number;
  rmsDb: number;
  author: string;
  license: string;
}

interface Job {
  id: string;
  kind: Kind;
  file: string;
  loop: boolean;
  render: () => Stereo;
}

const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.slice(7).split(',');
const verbose = args.includes('--verbose');

function jobs(): Job[] {
  const list: Job[] = [];
  for (const id of MUSIC_IDS) {
    const song = SONGS.find((s) => s.id === id);
    if (!song) throw new Error(`Música sem composição: ${id}`);
    list.push({
      id, kind: 'music', file: musicFile(id), loop: song.loop,
      render: () => {
        const r = renderSong(song);
        if (verbose) console.log(`    ${id}: ${r.bars} compassos; níveis brutos dos barramentos (dB):`, r.busLevels);
        return r.buf;
      },
    });
  }
  for (const id of SFX_IDS) {
    list.push({ id, kind: 'sfx', file: sfxFile(id), loop: false, render: () => normalizePeak(trimTail(renderSfx(id)), -1) });
  }
  for (const id of LOOP_IDS) {
    list.push({ id, kind: 'loop', file: loopFile(id), loop: true, render: () => normalizePeak(renderLoop(id), -1) });
  }
  for (const id of AMBIENCE_IDS) {
    list.push({
      id: `amb_${id}`, kind: 'ambience', file: ambienceFile(id), loop: true,
      render: () => softLimit(normalizeRms(renderAmbience(id), -25), db(-1), 0.5),
    });
  }
  return list;
}

/** Falha se o áudio estiver mudo, clipado ou (em loops) com degrau na emenda. */
function validate(job: Job, buf: Stereo): { peakDb: number; rmsDb: number } {
  const s = stats(buf);
  const peakDb = toDb(s.peak);
  const rmsDb = toDb(s.rms);
  const problems: string[] = [];
  for (let i = 0; i < buf.length; i++) {
    if (!Number.isFinite(buf.l[i]) || !Number.isFinite(buf.r[i])) {
      problems.push('contém NaN/Infinity');
      break;
    }
  }
  if (rmsDb < -45 || peakDb < -30) problems.push(`mudo ou baixo demais (pico ${peakDb.toFixed(1)} dB, RMS ${rmsDb.toFixed(1)} dB)`);
  if (s.peak > db(-0.9)) problems.push(`clipado (pico ${peakDb.toFixed(2)} dBFS)`);
  if (job.loop) {
    // A emenda do loop não pode ter salto maior do que os saltos normais entre amostras vizinhas.
    let maxStep = 0;
    for (let i = 1; i < buf.length; i++) {
      const d = Math.max(Math.abs(buf.l[i] - buf.l[i - 1]), Math.abs(buf.r[i] - buf.r[i - 1]));
      if (d > maxStep) maxStep = d;
    }
    const last = buf.length - 1;
    const seam = Math.max(Math.abs(buf.l[0] - buf.l[last]), Math.abs(buf.r[0] - buf.r[last]));
    if (seam > maxStep * 1.05 + 1e-4) problems.push(`emenda do loop com clique (${seam.toFixed(4)} > ${maxStep.toFixed(4)})`);
  }
  if (problems.length) throw new Error(`${job.file}: ${problems.join('; ')}`);
  return { peakDb: Math.round(peakDb * 10) / 10, rmsDb: Math.round(rmsDb * 10) / 10 };
}

async function hasVorbis(): Promise<boolean> {
  const { stdout } = await run('ffmpeg', ['-hide_banner', '-encoders']);
  return /\blibvorbis\b/.test(stdout);
}

async function main(): Promise<void> {
  const t0 = Date.now();
  if (!(await hasVorbis())) {
    throw new Error('O ffmpeg local não tem o codificador libvorbis; instale um ffmpeg com Vorbis para gerar os .ogg.');
  }
  const tmp = await mkdtemp(path.join(tmpdir(), 'kl3d-audio-'));
  const all = jobs();
  const selected = only ? all.filter((j) => only.includes(j.id)) : all;
  if (!selected.length) throw new Error(`Nada para gerar (ids válidos: ${all.map((j) => j.id).join(', ')})`);

  await mkdir(path.join(ASSETS, 'audio', 'music'), { recursive: true });
  await mkdir(path.join(ASSETS, 'audio', 'sfx'), { recursive: true });
  if (!only) {
    // Remove .ogg antigos que não fazem mais parte da lista.
    const keep = new Set(all.map((j) => path.join(ASSETS, j.file)));
    for (const dir of ['music', 'sfx']) {
      const full = path.join(ASSETS, 'audio', dir);
      for (const name of await readdir(full)) {
        const p = path.join(full, name);
        if (name.endsWith('.ogg') && !keep.has(p)) await rm(p);
      }
    }
  }

  const entries: Entry[] = [];
  const encodes: Promise<void>[] = [];
  let running = 0;
  const waiters: (() => void)[] = [];
  const acquire = async (): Promise<void> => {
    while (running >= 4) await new Promise<void>((res) => waiters.push(res));
    running++;
  };
  const release = (): void => {
    running--;
    waiters.shift()?.();
  };

  try {
    for (const job of selected) {
      const t = Date.now();
      const buf = job.render();
      const level = validate(job, buf);
      const wav = path.join(tmp, `${job.id}.wav`);
      const out = path.join(ASSETS, job.file);
      await writeFile(wav, encodeWav(buf));
      const entry: Entry = {
        id: job.id, kind: job.kind, file: job.file,
        durationSec: Math.round((buf.length / 44100) * 1000) / 1000,
        loop: job.loop, bytes: 0, ...level, author: AUTHOR, license: LICENSE,
      };
      entries.push(entry);
      await acquire();
      encodes.push(
        run('ffmpeg', [
          '-y', '-hide_banner', '-loglevel', 'error', '-i', wav,
          '-map_metadata', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact',
          '-metadata', `title=Kart Legends 3D — ${job.id}`,
          '-metadata', `artist=${AUTHOR}`,
          '-metadata', `license=${LICENSE}`,
          '-c:a', 'libvorbis', '-q:a', '4', out,
        ])
          .then(async () => {
            entry.bytes = (await stat(out)).size;
            if (entry.bytes < 1500) throw new Error(`${job.file}: arquivo codificado pequeno demais (${entry.bytes} bytes)`);
            await rm(wav);
          })
          .finally(release),
      );
      console.log(
        `  ${job.file.padEnd(34)} ${entry.durationSec.toFixed(2).padStart(7)} s  pico ${level.peakDb.toFixed(1).padStart(5)} dB  RMS ${level.rmsDb.toFixed(1).padStart(5)} dB  (${Date.now() - t} ms)`,
      );
    }
    await Promise.all(encodes);
  } finally {
    await Promise.allSettled(encodes);
    await rm(tmp, { recursive: true, force: true });
  }

  const totalBytes = entries.reduce((s, e) => s + e.bytes, 0);
  if (!only) {
    const manifest = {
      generatedBy: 'scripts/build-audio.ts',
      author: AUTHOR,
      license: LICENSE,
      codec: 'Ogg Vorbis (libvorbis -q:a 4), 44,1 kHz, estéreo',
      totalBytes,
      files: entries,
    };
    await writeFile(path.join(ASSETS, 'audio', 'audio-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  }
  console.log(
    `\n${entries.length} arquivos, ${(totalBytes / 1048576).toFixed(2)} MB, ${((Date.now() - t0) / 1000).toFixed(1)} s${only ? ' (parcial: manifesto não atualizado)' : ''}`,
  );
}

main().catch((err: unknown) => {
  console.error(`\nERRO ao gerar áudio: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
