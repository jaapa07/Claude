/**
 * Roda corridas sem navegador (só IA) para validar pistas e balanceamento.
 * Uso: npx tsx scripts/tools/sim-run.ts [--track=<id>] [--difficulty=hard] [--laps=3] [--racers=8] [--seed=1]
 */
import RAPIER from '@dimforge/rapier3d-compat';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { CHARACTERS } from '../../src/data/characters';
import { TRACK_IDS, type Difficulty, type TrackId } from '../../src/data/ids';
import { RaceSim } from '../../src/game/racing/raceSim';
import type { TrackData } from '../../src/game/tracks/trackTypes';

const flags = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? 'true']; }));
await RAPIER.init();
const tracks = (flags.track ? [flags.track] : [...TRACK_IDS]) as TrackId[];
const laps = Number(flags.laps ?? 3);
const racers = Number(flags.racers ?? 8);
const fmt = (ms: number): string => `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(2).padStart(5, '0')}`;

for (const trackId of tracks) {
  const data = JSON.parse(readFileSync(path.resolve(import.meta.dirname, `../../public/assets/tracks/${trackId}.json`), 'utf8')) as TrackData;
  const world = new RAPIER.World({ x: 0, y: 0, z: 0 });
  const sim = new RaceSim(RAPIER, world, data, {
    trackId, mode: 'quick', difficulty: (flags.difficulty ?? 'normal') as Difficulty, laps, seed: Number(flags.seed ?? 1),
    racers: CHARACTERS.slice(0, racers).map((c) => ({ characterId: c.id, kartId: c.kartId, isPlayer: false })),
  });
  sim.startCountdown();
  const counts: Record<string, number> = {};
  const t0 = Date.now();
  let steps = 0;
  while (sim.karts.some((k) => !k.finished) && sim.raceTime < laps * 150) {
    sim.step(); steps++;
    for (const e of sim.drainEvents()) {
      const key = e.type === 'respawn' ? `respawn:${e.reason}` : e.type === 'turbo' ? `turbo${e.level}` : e.type;
      counts[key] = (counts[key] ?? 0) + 1;
      if (flags.verbose && e.type === 'respawn') { const k = sim.karts[e.kart]!; console.log(`  t=${sim.raceTime.toFixed(1)} respawn ${e.reason} kart ${e.kart} idx ${k.mainIndex}`); }
    }
  }
  const res = sim.result();
  const done = res.results.filter((r) => r.totalTimeMs !== null);
  console.log(`\n${trackId} (${data.length} m) — ${done.length}/${racers} terminaram; ${steps} passos em ${Date.now() - t0} ms`);
  for (const r of res.results) {
    console.log(`  ${r.position}º ${r.characterId.padEnd(5)} ${r.kartId.padEnd(11)} ${r.totalTimeMs === null ? 'DNF (volta ' + sim.karts[r.racerIndex]!.lap + ', idx ' + sim.karts[r.racerIndex]!.mainIndex + ')' : fmt(r.totalTimeMs)}  melhor ${r.bestLapMs === null ? '-' : fmt(r.bestLapMs)}`);
  }
  console.log('  eventos:', Object.entries(counts).filter(([k]) => !['countdown', 'go', 'lap', 'finish', 'drift_start', 'drift_level', 'item_ready'].includes(k)).map(([k, v]) => `${k}=${v}`).join(' '));
  world.free();
}
