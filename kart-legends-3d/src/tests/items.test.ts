import { beforeAll, describe, expect, it } from 'vitest';
import { ITEMS } from '@/data/items';
import { ITEM_IDS, type ItemId } from '@/data/ids';
import { createRng } from '@/game/core/rng';
import { CHAIN_FIRST_RANGE, CHAIN_LINKS, COMET_MIN_RANK, itemWeights, rollItem } from '@/game/items/itemSystem';
import { spinOut } from '@/game/vehicles/kartPhysics';
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
/**
 * Coloca o adversário `idx` `ahead` metros à frente do jogador AO LONGO da pista, a `lateral` m do
 * centro, na direção da pista e com a velocidade `speed`; acerta voltas e checkpoints para a posição.
 */
function placeOnTrack(h: Harness, idx: number, ahead: number, lateral = 0, speed = 0): void {
  const p = h.sim.player!, o = h.sim.karts[idx]!, main = h.sim.track.main, cps = h.sim.track.data.checkpoints;
  const i = main.wrap(p.mainIndex + Math.round(ahead / h.sim.track.data.spacing));
  const pt = { x: 0, y: 0, z: 0 };
  main.point(i, lateral, pt);
  const hd = main.heading[i]!;
  o.heading = hd; o.vx = Math.sin(hd) * speed; o.vz = Math.cos(hd) * speed;
  o.body.setTranslation({ x: pt.x, y: p.y, z: pt.z }, true);
  o.body.setLinvel({ x: o.vx, y: 0, z: o.vz }, true);
  o.pathIndex = o.mainIndex = i;
  o.invuln = 0; o.spinTime = 0;
  let c = 0;
  cps.forEach((cp, j) => { if (cp <= i) c = j; });
  o.checkpointsPassed = c; o.nextCheckpoint = (c + 1) % cps.length;
  o.lap = p.lap + (i < p.mainIndex ? 1 : 0);
}

describe('caixas de item', () => {
  it('há oito itens definidos, com nome, duração e cooldown', () => {
    expect(ITEMS).toHaveLength(8);
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

  it('o Cometa Guia só sai para a metade de trás; o Raio Corrente é raro para o líder', () => {
    for (const r of [0, 0.2, 0.4, COMET_MIN_RANK - 0.01]) expect(itemWeights(r)['cometa-guia']).toBe(0);
    expect(itemWeights(1)['cometa-guia']).toBeGreaterThan(itemWeights(0.6)['cometa-guia']);
    expect(itemWeights(1)['raio-corrente']).toBeGreaterThan(itemWeights(0)['raio-corrente'] * 5);
    const rng = createRng(11);
    const lead = new Map<ItemId, number>(), back = new Map<ItemId, number>();
    for (let i = 0; i < 4000; i++) {
      const a = rollItem(rng, 0), b = rollItem(rng, 1);
      lead.set(a, (lead.get(a) ?? 0) + 1); back.set(b, (back.get(b) ?? 0) + 1);
    }
    expect(lead.get('cometa-guia') ?? 0).toBe(0);
    expect(rollItemShare(lead, 'raio-corrente')).toBeLessThan(0.03);
    expect(rollItemShare(back, 'cometa-guia')).toBeGreaterThan(0.12);
    expect(rollItemShare(back, 'raio-corrente')).toBeGreaterThan(0.08);
  });
});

function rollItemShare(m: Map<ItemId, number>, id: ItemId): number {
  return (m.get(id) ?? 0) / [...m.values()].reduce((a, b) => a + b, 0);
}

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

describe('Raio Corrente', () => {
  it('freia o piloto à frente por um instante, sem fazê-lo rodar, e ele recupera depois', () => {
    const h = setup(1);
    const o = h.sim.karts[1]!;
    o.ai = true; // a IA dele mantém o kart na pista
    placeOnTrack(h, 1, 30, 2, h.sim.player!.speed * 0.95);
    h.run(0.5);
    const before = o.speed;
    use(h, 'raio-corrente');
    expect(h.events.some((e) => e.type === 'zapped' && e.kart === 1 && e.link === 0)).toBe(true);
    expect(o.slowTime).toBeGreaterThan(CHAIN_LINKS[0].time - 0.1);
    expect(o.slowFactor).toBe(CHAIN_LINKS[0].factor);
    expect(o.spinTime).toBe(0);
    h.run(1 / 60);
    expect(o.speed).toBeLessThan(before * 0.85);
    h.run(1);
    expect(o.speed).toBeLessThan(o.tuning.topSpeed * CHAIN_LINKS[0].factor + 0.5);
    h.run(CHAIN_LINKS[0].time);
    expect(o.slowTime).toBe(0);
    expect(o.slowFactor).toBe(1);
    h.run(2.5);
    expect(o.speed).toBeGreaterThan(o.tuning.topSpeed * CHAIN_LINKS[0].factor + 4);
    expect(o.hitsTaken).toBe(0);
  });

  it('salta para os próximos à frente, cada elo mais fraco, no máximo três', () => {
    const h = setup(4);
    const ks = h.sim.karts;
    for (const k of ks) if (!k.isPlayer) { k.ai = false; k.input.throttle = 0; }
    placeOnTrack(h, 1, 24, -3);
    placeOnTrack(h, 2, 56, 3);
    placeOnTrack(h, 3, 84, 0);
    placeOnTrack(h, 4, 110, 0);
    h.run(1 / 60);
    use(h, 'raio-corrente');
    const zaps = h.events.filter((e) => e.type === 'zapped');
    expect(zaps.map((e) => (e.type === 'zapped' ? [e.kart, e.link] : []))).toEqual([[1, 0], [2, 1], [3, 2]]);
    expect(ks[1]!.slowFactor).toBeLessThan(ks[2]!.slowFactor);
    expect(ks[2]!.slowFactor).toBeLessThan(ks[3]!.slowFactor);
    expect(ks[1]!.slowTime).toBeGreaterThan(ks[2]!.slowTime);
    expect(ks[4]!.slowTime).toBe(0);
    expect(h.sim.items.arcs).toHaveLength(3);
  });

  it('não alcança quem está longe demais', () => {
    const h = setup(1);
    h.sim.karts[1]!.ai = false;
    placeOnTrack(h, 1, CHAIN_FIRST_RANGE + 30);
    h.run(1 / 60);
    use(h, 'raio-corrente');
    expect(h.events.some((e) => e.type === 'zapped')).toBe(false);
    expect(h.sim.karts[1]!.slowTime).toBe(0);
  });

  it('a Bolha Guardiã estoura e aterra o raio: nem o protegido nem os seguintes sofrem', () => {
    const h = setup(2);
    const [, a, b] = h.sim.karts;
    a!.ai = false; b!.ai = false;
    placeOnTrack(h, 1, 24);
    placeOnTrack(h, 2, 50);
    a!.shield = 8;
    h.run(1 / 60);
    use(h, 'raio-corrente');
    expect(h.events.some((e) => e.type === 'shield_break' && e.kart === 1)).toBe(true);
    expect(a!.shield).toBe(0);
    expect(a!.slowTime).toBe(0);
    expect(b!.slowTime).toBe(0);
    expect(h.events.some((e) => e.type === 'zapped')).toBe(false);
  });
});

describe('Cometa Guia', () => {
  it('pilota sozinho pela linha ideal, acima da velocidade máxima, e devolve o controle no fim', () => {
    const h = setup(0);
    const k = h.sim.player!;
    h.follow = false;
    use(h, 'cometa-guia');
    expect(k.comet).toBeGreaterThan(3);
    // o jogador "esterça" tudo para um lado: o piloto automático ignora
    h.input.steer = 1; h.input.throttle = 0; h.input.brake = 1;
    const start = k.progress;
    let maxLat = 0;
    for (let i = 0; i < 180; i++) { h.run(1 / 60); maxLat = Math.max(maxLat, Math.abs(k.lateral)); }
    expect(maxLat).toBeLessThan(5);
    expect(k.speed).toBeGreaterThan(k.tuning.topSpeed * 1.15);
    expect((k.progress - start) * h.sim.track.data.spacing).toBeGreaterThan(85);
    h.run(0.6);
    expect(k.comet).toBe(0);
    expect(h.events.some((e) => e.type === 'comet_end' && e.kart === 0)).toBe(true);
    // controle de volta: freando, o kart perde velocidade
    const v = k.speed;
    h.run(0.8);
    expect(k.speed).toBeLessThan(v - 8);
  });

  it('é imune a giros (faísca, névoa, obstáculos) e ao vento enquanto dura', () => {
    const h = setup(1);
    const k = h.sim.player!, o = h.sim.karts[1]!;
    use(h, 'cometa-guia');
    expect(spinOut(k, () => undefined, 'faisca')).toBe(false);
    expect(k.spinTime).toBe(0);
    placeOnTrack(h, 1, 0, 6);
    o.ai = false;
    h.run(1 / 60);
    o.item = 'onda-vento'; o.input.item = true;
    h.run(1 / 60);
    o.input.item = false;
    expect(h.events.some((e) => e.type === 'pushed' && e.kart === 0)).toBe(false);
  });

  it('tira do caminho o rival que encosta, sem fazê-lo rodar', () => {
    const h = setup(1);
    const o = h.sim.karts[1]!;
    o.ai = false; o.input.throttle = 0.4;
    placeOnTrack(h, 1, 22, 1);
    h.run(1 / 60);
    use(h, 'cometa-guia');
    const lat0 = o.lateral;
    for (let i = 0; i < 150 && !h.events.some((e) => e.type === 'rammed'); i++) h.run(1 / 60);
    expect(h.events.some((e) => e.type === 'rammed' && e.kart === 1 && e.by === 0)).toBe(true);
    h.run(0.4);
    expect(Math.abs(o.lateral - lat0)).toBeGreaterThan(2);
    expect(o.spinTime).toBe(0);
    expect(o.hitsTaken).toBe(0);
  });

  it('a Bolha Guardiã absorve o empurrão do cometa', () => {
    const h = setup(1);
    const o = h.sim.karts[1]!;
    o.ai = false; o.input.throttle = 0.4; o.shield = 8;
    placeOnTrack(h, 1, 22, 1);
    h.run(1 / 60);
    use(h, 'cometa-guia');
    for (let i = 0; i < 150 && o.shield > 0; i++) h.run(1 / 60);
    expect(h.events.some((e) => e.type === 'shield_break' && e.kart === 1)).toBe(true);
    expect(h.events.some((e) => e.type === 'rammed')).toBe(false);
  });
});
