/** Mede o equilíbrio entre karts: posição média de chegada por kart em várias pistas e sementes (só IA). */
import RAPIER from '@dimforge/rapier3d-compat';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { CHARACTERS } from '../../src/data/characters';
import { TRACK_IDS, type Difficulty } from '../../src/data/ids';
import { RaceSim } from '../../src/game/racing/raceSim';
import type { TrackData } from '../../src/game/tracks/trackTypes';

await RAPIER.init();
const difficulty = (process.argv[2] ?? 'hard') as Difficulty;
const seeds = Number(process.argv[3] ?? 3);
const sum = new Map<string, number>(), wins = new Map<string, number>();
const turbo = [0, 0, 0];
let races = 0, shortcuts = 0;
for (const trackId of TRACK_IDS) {
  const data = JSON.parse(readFileSync(path.resolve(import.meta.dirname, `../../public/assets/tracks/${trackId}.json`), 'utf8')) as TrackData;
  for (let seed = 1; seed <= seeds; seed++) {
    // grid rotacionado a cada semente para não favorecer quem larga na frente
    const order = CHARACTERS.map((_, i) => CHARACTERS[(i + seed * 3) % CHARACTERS.length]!);
    const sim = new RaceSim(RAPIER, new RAPIER.World({ x: 0, y: 0, z: 0 }), data, {
      trackId, mode: 'quick', difficulty, laps: 3, seed, racers: order.map((c) => ({ characterId: c.id, kartId: c.kartId, isPlayer: false })),
    });
    sim.startCountdown();
    while (sim.karts.some((k) => !k.finished) && sim.raceTime < 400) {
      sim.step();
      for (const e of sim.drainEvents()) if (e.type === 'turbo' && e.level <= 3) turbo[e.level - 1]!++;
      for (const k of sim.karts) if (k.pathId >= 0) shortcuts++;
    }
    races++;
    for (const r of sim.result().results) {
      sum.set(r.kartId, (sum.get(r.kartId) ?? 0) + r.position);
      if (r.position === 1) wins.set(r.kartId, (wins.get(r.kartId) ?? 0) + 1);
    }
    sim.world.free();
  }
}
console.log(`${races} corridas (${difficulty}); miniturbos por nível: ${turbo.join('/')}; passos em atalhos: ${shortcuts}`);
for (const [k, v] of [...sum].sort((a, b) => a[1] - b[1])) console.log(`  ${k.padEnd(11)} posição média ${(v / races).toFixed(2)}  vitórias ${wins.get(k) ?? 0}`);
