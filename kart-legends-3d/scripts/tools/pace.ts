/** Ritmo de um piloto de IA sozinho (sem itens nem tráfego) por dificuldade e pista. */
import RAPIER from '@dimforge/rapier3d-compat';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { TRACK_IDS, type Difficulty } from '../../src/data/ids';
import { RaceSim } from '../../src/game/racing/raceSim';
import type { TrackData } from '../../src/game/tracks/trackTypes';

await RAPIER.init();
for (const trackId of TRACK_IDS) {
  const data = JSON.parse(readFileSync(path.resolve(import.meta.dirname, `../../public/assets/tracks/${trackId}.json`), 'utf8')) as TrackData;
  const row: string[] = [];
  for (const difficulty of ['easy', 'normal', 'hard'] as Difficulty[]) {
    const sim = new RaceSim(RAPIER, new RAPIER.World({ x: 0, y: 0, z: 0 }), data, { trackId, mode: 'timetrial', difficulty, laps: 3, seed: 3, racers: [{ characterId: 'nilo', kartId: 'flecha', isPlayer: false }] });
    sim.startCountdown();
    let turbos = 0;
    while (!sim.karts[0]!.finished && sim.raceTime < 400) { sim.step(); for (const e of sim.drainEvents()) if (e.type === 'turbo') turbos++; }
    row.push(`${difficulty} ${(sim.karts[0]!.finishTime / 1000).toFixed(1)}s (${turbos} turbos)`);
    sim.world.free();
  }
  console.log(trackId.padEnd(22), row.join('  '));
}
