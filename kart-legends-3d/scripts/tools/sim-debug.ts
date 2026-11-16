import RAPIER from '@dimforge/rapier3d-compat';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { CHARACTERS } from '../../src/data/characters';
import type { Difficulty, TrackId } from '../../src/data/ids';
import { RaceSim } from '../../src/game/racing/raceSim';
import type { TrackData } from '../../src/game/tracks/trackTypes';

const flags = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, '').split('='); return [k, v ?? 'true']; }));
await RAPIER.init();
const trackId = flags.track as TrackId;
const data = JSON.parse(readFileSync(path.resolve(import.meta.dirname, `../../public/assets/tracks/${trackId}.json`), 'utf8')) as TrackData;
const sim = new RaceSim(RAPIER, new RAPIER.World({ x: 0, y: 0, z: 0 }), data, {
  trackId, mode: 'quick', difficulty: (flags.difficulty ?? 'normal') as Difficulty, laps: 3, seed: Number(flags.seed ?? 1),
  racers: CHARACTERS.slice(0, Number(flags.racers ?? 1)).map((c) => ({ characterId: c.id, kartId: c.kartId, isPlayer: false })),
});
sim.startCountdown();
const who = Number(flags.kart ?? 0);
let slow = 0, printed = 0;
while (sim.raceTime < Number(flags.time ?? 200) && printed < Number(flags.max ?? 40)) {
  sim.step();
  const k = sim.karts[who]!;
  const ev = sim.drainEvents().filter((e) => 'kart' in e && e.kart === who && !['drift_level', 'item_ready'].includes(e.type));
  slow = sim.phase === 'racing' && k.speed < 3 ? slow + 1 : 0;
  if ((flags.events && ev.length) || (slow > 30 && slow % 30 === 0)) {
    printed++;
    console.log(`t=${sim.raceTime.toFixed(2)} idx=${k.mainIndex} path=${k.pathId} lat=${k.lateral.toFixed(1)} y=${k.y.toFixed(2)} roadY=${sim.track.main.pos[k.mainIndex * 3 + 1]!.toFixed(2)} v=${k.speed.toFixed(1)} vl=${k.lateralSpeed.toFixed(1)} g=${k.grounded} n=(${k.nx.toFixed(2)},${k.ny.toFixed(2)},${k.nz.toFixed(2)}) surf=${k.surface} road=${k.onRoad} in=(${k.input.throttle},${k.input.brake},${k.input.steer.toFixed(2)}) ${ev.map((e) => e.type).join(',')}`);
  }
}
console.log('fim', sim.raceTime.toFixed(1), 'lap', sim.karts[who]!.lap, 'idx', sim.karts[who]!.mainIndex);
