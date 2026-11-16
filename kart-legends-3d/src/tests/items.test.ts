import { beforeAll, describe, expect, it } from 'vitest';
import { ITEMS } from '@/data/items';
import { ITEM_IDS, type ItemId } from '@/data/ids';
import { createRng } from '@/game/core/rng';
import { itemWeights, rollItem } from '@/game/items/itemSystem';
import { PHYS, tuningFor } from '@/game/vehicles/kartTuning';
import { createHarness, initPhysics, ringTrack, type Harness } from './simHarness';

beforeAll(initPhysics);

function setup(opponents = 1): Harness {
  const h = createHarness({ data: ringTrack(60, 30), opponents });
  for (const k of h.sim.karts) if (!k.isPlayer) k.ai = false;
  h.follow = true;
  h.start();
  h.input.throttle = 1;
  h.run(3);
  return h;
}
function use(h: Harness, item: ItemId): void {
  h.sim.player!.item = item;
  h.input.item = true;
  h.run(1 / 60);
  h.input.item = false;
}
/** Coloca o adversário a `ahead` metros à frente (negativo = atrás) do jogador, com a mesma velocidade. */
function place(h: Harness, ahead: number, side = 0): void {
  const p = h.sim.player!, o = h.sim.karts[1]!;
  const fx = Math.sin(p.heading), fz = Math.cos(p.heading);
  o.body.setTranslation({ x: p.x + fx * ahead + fz * side, y: p.y, z: p.z + fz * ahead - fx * side }, true);
  o.body.setLinvel({ x: p.vx, y: 0, z: p.vz }, true);
  o.heading = p.heading; o.vx = p.vx; o.vz = p.vz;
  o.pathIndex = o.mainIndex = h.sim.track.main.wrap(p.mainIndex + Math.round(ahead / 2));
  // mesma volta e mesmos checkpoints do jogador (o teletransporte não valida checkpoints)
  o.lap = p.lap; o.checkpointsPassed = p.checkpointsPassed; o.nextCheckpoint = p.nextCheckpoint;
  h.run(1 / 60);
}

describe('caixas de item', () => {
  it('há seis itens definidos, com nome, duração e cooldown', () => {
    expect(ITEMS.map((i) => i.id)).toEqual([...ITEM_IDS]);
    expect(ITEMS.every((i) => i.name && i.cooldown > 0 && i.duration >= 0)).toBe(true);
  });

  it('pegar uma caixa sorteia um item e a caixa reaparece depois', () => {
    const h = setup(0);
    const k = h.sim.player!;
    const box = h.sim.items.boxes[2]!;
    k.body.setTranslation({ x: box.x, y: box.y, z: box.z }, true);
    h.run(0.1);
    expect(box.active).toBe(false);
    expect(h.events.some((e) => e.type === 'item_pickup')).toBe(true);
    expect(h.sim.hud().itemRolling).toBe(true);
    h.run(1.6);
    expect(k.item).not.toBeNull();
    expect(ITEM_IDS).toContain(k.item);
    h.run(3);
    expect(box.active).toBe(true);
  });

  it('a distribuição favorece velocidade/ataque para quem está atrás e defesa para o líder, sem item garantido', () => {
    const first = itemWeights(0), last = itemWeights(1);
    expect(last['pulso-solar']).toBeGreaterThan(first['pulso-solar']);
    expect(last['faisca-rastreadora']).toBeGreaterThan(first['faisca-rastreadora']);
    expect(first['bolha-guardia']).toBeGreaterThan(last['bolha-guardia']);
    const rng = createRng(3);
    const counts = new Map<ItemId, number>();
    for (let i = 0; i < 3000; i++) { const id = rollItem(rng, 1); counts.set(id, (counts.get(id) ?? 0) + 1); }
    for (const id of ITEM_IDS) expect(counts.get(id) ?? 0).toBeGreaterThan(60);
    expect(Math.max(...counts.values()) / 3000).toBeLessThan(0.45);
  });
});

describe('efeito de cada item', () => {
  it('Pulso Solar: aceleração temporária acima da velocidade máxima', () => {
    const h = setup(0);
    const k = h.sim.player!;
    use(h, 'pulso-solar');
    expect(k.boostTime).toBeGreaterThan(2);
    h.run(0.8);
    expect(k.speed).toBeGreaterThan(tuningFor(k.kartId).topSpeed * 1.15);
    expect(k.item).toBeNull();
    expect(k.itemsUsed).toBe(1);
  });

  it('Bolha Guardiã: absorve um impacto e se desfaz', () => {
    const h = setup(1);
    const o = h.sim.karts[1]!;
    o.shield = 8;
    place(h, 14);
    use(h, 'faisca-rastreadora');
    h.run(1.5);
    expect(h.events.some((e) => e.type === 'shield_break' && e.kart === 1)).toBe(true);
    expect(o.spinTime).toBe(0);
    expect(o.shield).toBe(0);
  });

  it('Névoa Prisma: fica na pista e faz rodar quem a atravessa', () => {
    const h = setup(1);
    place(h, -16);
    use(h, 'nevoa-prisma');
    expect(h.sim.items.hazards).toHaveLength(1);
    const o = h.sim.karts[1]!;
    // o adversário vem atrás, na mesma linha, e acelera para dentro da névoa
    o.ai = false; o.input.throttle = 1;
    const hz = h.sim.items.hazards[0]!;
    h.input.throttle = 1;
    for (let i = 0; i < 180 && o.spinTime <= 0; i++) {
      o.body.setLinvel({ x: (hz.x - o.x) * 3, y: 0, z: (hz.z - o.z) * 3 }, true);
      h.sim.step(); h.events.push(...h.sim.drainEvents());
    }
    expect(h.events.some((e) => e.type === 'hit' && e.kart === 1 && e.cause === 'nevoa')).toBe(true);
    expect(o.hitsTaken).toBe(1);
  });

  it('Faísca Rastreadora: persegue e atinge o piloto à frente', () => {
    const h = setup(1);
    place(h, 30, 4);
    use(h, 'faisca-rastreadora');
    expect(h.sim.items.projectiles).toHaveLength(1);
    expect(h.sim.items.projectiles[0]!.target).toBe(1);
    h.run(2.5);
    expect(h.events.some((e) => e.type === 'hit' && e.kart === 1 && e.cause === 'faisca')).toBe(true);
    expect(h.sim.items.projectiles).toHaveLength(0);
  });

  it('Faísca Rastreadora: pode ser destruída pela Onda de Vento (defesa)', () => {
    const h = setup(1);
    const o = h.sim.karts[1]!;
    place(h, 34);
    use(h, 'faisca-rastreadora');
    for (let i = 0; i < 120; i++) {
      h.run(1 / 60);
      const pr = h.sim.items.projectiles[0];
      if (pr && Math.hypot(pr.x - o.x, pr.z - o.z) < 11) break;
    }
    expect(h.sim.items.projectiles).toHaveLength(1);
    // o alvo usa a onda de vento quando a faísca chega perto
    o.item = 'onda-vento'; o.input.item = true;
    h.run(1 / 60);
    o.input.item = false;
    expect(h.sim.items.projectiles).toHaveLength(0);
    h.run(1);
    expect(o.hitsTaken).toBe(0);
  });

  it('Onda de Vento: empurra os adversários próximos para longe', () => {
    const h = setup(1);
    place(h, 0, 5);
    const p = h.sim.player!, o = h.sim.karts[1]!;
    const before = Math.hypot(o.x - p.x, o.z - p.z);
    use(h, 'onda-vento');
    expect(h.events.some((e) => e.type === 'pushed' && e.kart === 1)).toBe(true);
    h.run(0.5);
    expect(Math.hypot(o.x - p.x, o.z - p.z)).toBeGreaterThan(before + 2.5);
  });

  it('Cristal de Salto: tira o kart do chão', () => {
    const h = setup(0);
    const k = h.sim.player!;
    const y0 = k.y;
    use(h, 'cristal-salto');
    let peak = 0;
    for (let i = 0; i < 60; i++) { h.run(1 / 60); peak = Math.max(peak, k.y - y0); }
    expect(peak).toBeGreaterThan(1.2);
    expect(h.events.some((e) => e.type === 'jump')).toBe(true);
    h.run(1.5);
    expect(k.grounded).toBe(true);
  });

  it('ser atingido faz rodar, tira o controle por um instante e dá invulnerabilidade depois', () => {
    const h = setup(1);
    place(h, 16);
    const o = h.sim.karts[1]!;
    use(h, 'faisca-rastreadora');
    h.run(1.2);
    expect(o.spinTime + o.invuln).toBeGreaterThan(0);
    h.run(PHYS.spinTime + 0.2);
    expect(o.spinTime).toBe(0);
    expect(o.invuln).toBeGreaterThan(0);
  });

  it('respeita o cooldown antes de sortear outro item', () => {
    const h = setup(0);
    const k = h.sim.player!;
    use(h, 'pulso-solar');
    expect(k.itemCooldown).toBeGreaterThan(1);
    const box = h.sim.items.boxes[0]!;
    k.body.setTranslation({ x: box.x, y: box.y, z: box.z }, true);
    h.run(0.1);
    expect(box.active).toBe(true);
  });
});
