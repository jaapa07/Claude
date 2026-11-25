/** Modelos dos itens e objetos de corrida. Cada função devolve a entrada do manifesto. */
import { Model, box, cone, cyl, flat, ico, lathe, mix, rng, sphere, torus, tube, THREE, type V3 } from '../lib/geo';
import { bolt, cbox, gear, leafBlade, plateXY, plateXZ, profileX, quads, rod, shell, type P2 } from '../karts/common';
import { ItemBuilder, quat, sampled, spin, texPlane, wave, type ItemEntry } from './util';

/** Estrela-bússola de 8 pontas no plano XY. */
function compassStar(R: number, thick: number): THREE.BufferGeometry {
  const pts: P2[] = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.PI / 2;
    const r = i % 2 ? R * 0.2 : i % 4 === 0 ? R : R * 0.52;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return plateXY(pts, thick, thick * 0.3);
}
/** Gema facetada (eixo Y). */
function gem(profile: P2[], sides: number): THREE.BufferGeometry {
  return flat(lathe(profile, sides));
}

export async function itemBox(): Promise<ItemEntry> {
  const it = new ItemBuilder('item-box');
  const float = it.group('float');
  // cristal: prisma octogonal lapidado, translúcido, com faces em tons alternados
  const crystal = new Model();
  crystal.add(quads(gem([[0.001, -0.6], [0.3, -0.4], [0.47, -0.1], [0.47, 0.1], [0.3, 0.4], [0.001, 0.6]], 8), (c) => {
    const a = Math.atan2(c.z, c.x);
    return mix(mix('#22c8ff', '#9a5cff', 0.5 + 0.5 * Math.sin(a * 2)), '#ffe36a', Math.max(0, c.y) * 1.1);
  }), 'item_crystal');
  // arestas (moldura) para a silhueta ler bem
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * Math.PI * 2 - Math.PI / 8;
    const c = Math.cos(a), s = Math.sin(a);
    crystal.add(rod([c * 0.47, 0.1, -s * 0.47], [c * 0.3, 0.4, -s * 0.3], 0.011, 0.011, 4), 'glow_white', '#e8fbff');
    crystal.add(rod([c * 0.47, -0.1, -s * 0.47], [c * 0.3, -0.4, -s * 0.3], 0.011, 0.011, 4), 'glow_white', '#e8fbff');
  }
  crystal.add(flat(cone(0.06, 0.1, 8)), 'glow_white', '#ffffff', { p: [0, 0.6, 0] });
  crystal.add(flat(cone(0.06, 0.1, 8).rotateX(Math.PI)), 'glow_white', '#ffffff', { p: [0, -0.6, 0] });
  const nCrystal = it.part('crystal', crystal, { parent: float });
  // glifo: estrela-bússola (frente e verso) com aro
  const glyph = new Model();
  glyph.add(compassStar(0.33, 0.07), 'item_glow_yellow', '#ffd23f');
  glyph.add(torus(0.15, 0.02, 5, 20), 'item_glow_orange', '#ff9a2e');
  glyph.add(sphere(0.045, 10, 6), 'glow_white', '#ffffff');
  const nGlyph = it.part('glyph', glyph, { parent: float });
  // anel orbitando, com contas
  const ring = new Model();
  ring.add(torus(0.6, 0.022, 6, 36), 'glow_cyan', '#a8f3ff');
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    ring.add(flat(ico(0.06, 0)), 'item_glow_yellow', '#ffd23f', { p: [Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0] });
  }
  const tilt = quat([1, 0, 0.35], 1.25);
  const nRing = it.part('ring', ring, { parent: float, r: tilt });
  it.add(
    sampled(float, 'translation', 4, (ph) => [0, 0.08 * wave(ph), 0]),
    spin(nCrystal, [0, 1, 0], 4, 1),
    spin(nGlyph, [0, 1, 0], 4, -1),
    spin(nRing, [0, 0, 1], 4, 2, tilt),
  );
  it.clip('loop', 4);
  return it.save('Origem no centro do cristal (1,2 m de altura); o runtime posiciona acima da pista.');
}

export async function pulsoSolar(): Promise<ItemEntry> {
  const it = new ItemBuilder('pulso-solar');
  const core = new Model();
  core.add(ico(0.2, 2), 'item_glow_yellow', (p) => mix('#fff0a0', '#ffb22e', (1 - p.y / 0.2) * 0.5));
  core.add(torus(0.215, 0.012, 5, 24).rotateX(Math.PI / 2), 'glow_white', '#fff3c0');
  const nCore = it.part('core', core);
  const rays = (len: number, off: number, colr: string): Model => {
    const m = new Model();
    const dirs = ico(1, 0).getAttribute('position');
    const seen = new Set<string>();
    for (let i = 0; i < dirs.count; i++) {
      const d = new THREE.Vector3().fromBufferAttribute(dirs, i).normalize();
      const key = d.toArray().map((v) => v.toFixed(2)).join();
      if (seen.has(key)) continue;
      seen.add(key);
      const g = flat(cone(0.055, len, 5).translate(0, off + len / 2, 0));
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d));
      m.add(g, 'item_glow_orange', colr);
    }
    return m;
  };
  const nA = it.part('rays_a', rays(0.22, 0.24, '#ffb02e'));
  const base = quat([1, 0.3, 0.2], 0.62);
  const nB = it.part('rays_b', rays(0.12, 0.22, '#ff6a1a'), { r: base });
  it.add(
    spin(nA, [0, 1, 0], 2, 1),
    spin(nB, [0.2, 1, 0.1], 2, -1, base),
    sampled(nCore, 'scale', 2, (ph) => { const s = 1 + 0.1 * wave(ph, 2); return [s, s, s]; }),
  );
  it.clip('loop', 2);
  return it.save('Pequeno sol (≈0,9 m de ponta a ponta), origem no centro.');
}

export async function bolhaGuardia(): Promise<ItemEntry> {
  const it = new ItemBuilder('bolha-guardia');
  const shellM = new Model();
  const sph = sphere(1, 28, 16);
  const uv = sph.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i) * 1.5);
  shellM.add(sph, 'item_bubble', '#ffffff');
  const nShell = it.part('shell', shellM);
  const ring = new Model();
  ring.add(torus(1.03, 0.022, 5, 40).rotateX(Math.PI / 2), 'glow_cyan', '#b6f6ff');
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    ring.add(flat(cyl(0.06, 0.06, 0.03, 6)), 'glow_white', '#eaffff', { p: [Math.cos(a) * 1.03, 0, Math.sin(a) * 1.03], r: [0, -a, Math.PI / 2] });
  }
  const nRing = it.part('ring', ring);
  const tilt = quat([1, 0, 0], 1.1);
  const ring2 = new Model();
  ring2.add(torus(1.015, 0.012, 4, 36).rotateX(Math.PI / 2), 'glow_cyan', '#7fe6f5');
  const nRing2 = it.part('ring_b', ring2, { r: tilt });
  it.add(
    spin(nShell, [0, 1, 0], 3, 1),
    spin(nRing, [0, 1, 0], 3, -1),
    spin(nRing2, [0, 1, 0], 3, 1, tilt),
    sampled(nShell, 'scale', 3, (ph) => { const s = 1 + 0.02 * wave(ph, 3); return [s, s, s]; }),
  );
  it.clip('loop', 3);
  return it.save('Esfera de raio 1 m (unitária), origem no centro; o runtime escala em volta do kart.');
}

export async function nevoaPrisma(): Promise<ItemEntry> {
  const it = new ItemBuilder('nevoa-prisma');
  const lobes: [number, number, number, number, string, string][] = [
    [0, 0.5, 0, 0.62, 'item_mist_a', '#b06cff'], [0.85, 0.4, 0.2, 0.5, 'item_mist_b', '#4fd0ff'], [-0.8, 0.42, -0.25, 0.52, 'item_mist_c', '#ff6ab8'],
    [0.3, 0.38, 0.85, 0.46, 'item_mist_c', '#ff86c8'], [-0.35, 0.36, -0.9, 0.45, 'item_mist_b', '#62dcff'], [-0.75, 0.33, 0.7, 0.4, 'item_mist_a', '#a060ff'],
    [0.8, 0.33, -0.7, 0.42, 'item_mist_a', '#c080ff'], [1.15, 0.26, -0.15, 0.3, 'item_mist_c', '#ff78c0'], [-1.15, 0.26, 0.2, 0.3, 'item_mist_b', '#70e0ff'],
    [0.1, 0.24, -1.2, 0.27, 'item_mist_c', '#ff9ad0'], [-0.1, 0.24, 1.22, 0.27, 'item_mist_b', '#86e6ff'],
  ];
  const groups = [new Model(), new Model(), new Model()];
  lobes.forEach(([x, y, z, r, mat, c], i) => {
    const g = ico(r, 2);
    g.scale(1.12, 0.78, 1.12);
    groups[i % 3]!.add(g, mat, (p) => mix(c, '#ffffff', Math.max(0, p.y / r) * 0.25), { p: [x, y, z] });
  });
  const spark = new Model();
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4, rr = 0.5 + (i % 4) * 0.25;
    spark.add(flat(ico(0.05 + (i % 3) * 0.015, 0)), i % 2 ? 'glow_magenta' : 'glow_cyan', i % 2 ? '#ffc4ee' : '#c4f8ff', { p: [Math.cos(a) * rr, 0.75 + (i % 3) * 0.16, Math.sin(a) * rr] });
  }
  const nodes = groups.map((m, i) => it.part(`lobes_${i}`, m));
  const nSpark = it.part('sparkles', spark);
  nodes.forEach((n, i) => {
    it.add(sampled(n, 'scale', 3, (ph) => { const s = 1 + 0.06 * wave(ph, 1, i / 3); return [s, 1 + 0.1 * wave(ph, 1, i / 3 + 0.25), s]; }));
    it.add(sampled(n, 'translation', 3, (ph) => [0, 0.04 * wave(ph, 1, i / 3), 0]));
  });
  it.add(spin(nSpark, [0, 1, 0], 3, 1), sampled(nSpark, 'translation', 3, (ph) => [0, 0.08 * wave(ph, 2), 0]));
  it.clip('loop', 3);
  return it.save('Nuvem baixa de ≈3 m de diâmetro, origem no chão ao centro.');
}

export async function faiscaRastreadora(): Promise<ItemEntry> {
  const it = new ItemBuilder('faisca-rastreadora');
  const body = new Model();
  const core = sphere(0.14, 14, 10);
  core.scale(1, 1, 1.7);
  body.add(core, 'item_glow_red', (p) => mix('#ff3a1e', '#ffc23a', (p.z + 0.24) / 0.48));
  body.add(flat(cone(0.075, 0.2, 6).rotateX(Math.PI / 2)), 'item_glow_yellow', '#ffe07a', { p: [0, 0, 0.3] });
  body.add(torus(0.15, 0.022, 5, 16), 'kart_metal', '#5a2a22', { p: [0, 0, -0.06] });
  body.add(torus(0.125, 0.018, 5, 16), 'kart_metal', '#5a2a22', { p: [0, 0, 0.12] });
  for (let i = 0; i < 4; i++) {
    const fin = profileX([[0.08, 0.1], [-0.12, 0.13], [-0.34, 0.34], [-0.3, 0.14], [-0.22, 0.08]], 0.03, 0.008);
    fin.rotateZ((i / 4) * Math.PI * 2 + Math.PI / 4);
    body.add(flat(fin), 'paint', '#e2452a');
    const edge = profileX([[-0.16, 0.2], [-0.33, 0.33], [-0.3, 0.2]], 0.036, 0.004);
    edge.rotateZ((i / 4) * Math.PI * 2 + Math.PI / 4);
    body.add(edge, 'item_glow_yellow', '#ffd23f');
  }
  const nBody = it.part('body', body);
  const tail = new Model();
  tail.add(cone(0.1, 0.5, 10).rotateX(-Math.PI / 2), 'item_glow_orange', (p) => mix('#ffd23f', '#ff3a1e', (-p.z - 0.2) / 0.5), { p: [0, 0, -0.45] });
  tail.add(cone(0.055, 0.34, 8).rotateX(-Math.PI / 2), 'item_glow_yellow', '#fff0a0', { p: [0, 0, -0.36] });
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26;
    tail.add(flat(ico(0.03 - i * 0.003, 0)), 'item_glow_yellow', '#ffc44a', { p: [Math.cos(a) * 0.09, Math.sin(a) * 0.09, -0.5 - i * 0.07] });
  }
  const nTail = it.part('tail', tail);
  it.add(
    spin(nBody, [0, 0, 1], 0.8, 1),
    spin(nTail, [0, 0, 1], 0.8, -2),
    sampled(nTail, 'scale', 0.8, (ph) => [1 + 0.12 * wave(ph, 4), 1 + 0.12 * wave(ph, 4), 1 + 0.25 * wave(ph, 4, 0.25)]),
  );
  it.clip('loop', 0.8);
  return it.save('Projétil apontando para +Z (≈1,0 m com a cauda), origem no centro do núcleo.');
}

export async function ondaVento(): Promise<ItemEntry> {
  const it = new ItemBuilder('onda-vento');
  // fitas em espiral: seção achatada varrida ao longo de um arco que se abre até o raio 1
  const ribbon = (phase: number, y: number): THREE.BufferGeometry => {
    const pts: V3[] = [];
    for (let i = 0; i <= 14; i++) {
      const t = i / 14, a = phase + t * Math.PI * 1.25, r = 0.55 + 0.45 * t;
      pts.push([Math.cos(a) * r, y + 0.1 * Math.sin(t * Math.PI), Math.sin(a) * r]);
    }
    const g = tube(pts, (t) => 0.012 + 0.075 * Math.sin(Math.PI * t) ** 0.7, 28, 6);
    // achata na vertical em torno da linha central
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) pos.setY(i, y + (pos.getY(i) - y) * 0.42);
    g.computeVertexNormals();
    return g;
  };
  const a = new Model(), b = new Model();
  for (let i = 0; i < 3; i++) a.add(ribbon((i / 3) * Math.PI * 2, 0), 'item_wind', (p) => mix('#e6fff3', '#9cf0c3', Math.hypot(p.x, p.z)));
  for (let i = 0; i < 3; i++) b.add(ribbon((i / 3) * Math.PI * 2 + 1, 0.22), 'item_wind', (p) => mix('#ffffff', '#7fe0b4', Math.hypot(p.x, p.z)), { s: [0.8, 1, 0.8] });
  const ring = new Model();
  ring.add(torus(0.99, 0.014, 4, 40).rotateX(Math.PI / 2), 'glow_green', '#c8ffe2');
  const nA = it.part('swirl_a', a), nB = it.part('swirl_b', b), nR = it.part('ring', ring);
  it.add(
    spin(nA, [0, 1, 0], 1, -1), spin(nB, [0, 1, 0], 1, -2), spin(nR, [0, 1, 0], 1, 1),
    sampled(nB, 'translation', 1, (ph) => [0, 0.05 * wave(ph), 0]),
  );
  it.clip('loop', 1);
  return it.save('Anel/espiral de raio 1 m (unitário) no plano XZ, origem no centro; o runtime expande.');
}

export async function cristalSalto(): Promise<ItemEntry> {
  const it = new ItemBuilder('cristal-salto');
  const base = new Model();
  base.add(lathe([[0.001, 0], [0.2, 0], [0.22, 0.03], [0.16, 0.06], [0.001, 0.06]] as P2[], 12), 'kart_metal', '#c9d4ea');
  base.add(torus(0.2, 0.014, 4, 16).rotateX(Math.PI / 2), 'glow_cyan', '#b9d6ff', { p: [0, 0.03, 0] });
  it.part('base', base);
  const sp = new Model();
  sp.add(tube(Array.from({ length: 41 }, (_, i) => [Math.cos(i * 0.628) * 0.11, (i / 40) * 0.3, Math.sin(i * 0.628) * 0.11] as V3), 0.02, 60, 6), 'kart_metal', '#e3e9f5');
  const nSpring = it.part('spring', sp, { t: [0, 0.05, 0] });
  const top = it.group('top', { t: [0, 0.36, 0] });
  const cr = new Model();
  cr.add(quads(gem([[0.001, 0], [0.13, 0.12], [0.17, 0.26], [0.1, 0.46], [0.001, 0.56]], 6), (c) => mix('#3f78ff', '#b9d6ff', c.y / 0.56 * 0.8 + 0.2 * Math.sin(Math.atan2(c.z, c.x) * 3))), 'item_crystal_blue');
  cr.add(flat(ico(0.05, 0)), 'glow_white', '#ffffff', { p: [0, 0.27, 0] });
  cr.add(lathe([[0.001, -0.03], [0.14, -0.03], [0.15, 0.0], [0.1, 0.03], [0.001, 0.03]] as P2[], 10), 'kart_metal', '#c9d4ea');
  it.part('crystal', cr, { parent: top });
  const wings: ReturnType<ItemBuilder['group']>[] = [];
  for (const sg of [1, -1]) {
    const w = new Model();
    for (let i = 0; i < 3; i++) {
      const g = leafBlade(0.3 - i * 0.06, 0.1 - i * 0.015, 0.12, 4);
      g.rotateY(sg * Math.PI / 2);
      g.rotateZ(sg * (0.25 + i * 0.32));
      w.add(g, 'item_wing', i === 0 ? '#ffffff' : i === 1 ? '#dbe8ff' : '#b9d0ff');
    }
    wings.push(it.part(`wing_${sg > 0 ? 'l' : 'r'}`, w, { parent: top, t: [sg * 0.13, 0.2, 0] }));
  }
  const dur = 1.2;
  it.add(
    sampled(top, 'translation', dur, (ph) => [0, 0.36 + 0.09 * wave(ph), 0]),
    sampled(nSpring, 'scale', dur, (ph) => [1, 1 + 0.3 * wave(ph), 1]),
    spin(top, [0, 1, 0], dur, 1),
    sampled(wings[0]!, 'rotation', dur, (ph) => quat([0, 0, 1], 0.45 * wave(ph, 2))),
    sampled(wings[1]!, 'rotation', dur, (ph) => quat([0, 0, 1], -0.45 * wave(ph, 2))),
  );
  it.clip('loop', dur);
  return it.save('Cristal alado sobre mola (≈1,0 m de altura), origem na base.');
}

/**
 * Raio Corrente: um segmento de raio unitário ao longo de +Z (z = 0 → 1), em zigue-zague, com núcleo
 * branco e halo verde-limão. O runtime estica em Z até o alvo e gira em torno do eixo para tremeluzir.
 */
export async function raioCorrente(): Promise<ItemEntry> {
  const it = new ItemBuilder('raio-corrente');
  const r = rng(0x5a17);
  const path = (amp: number, seed: number): V3[] => {
    const pts: V3[] = [[0, 0, 0]];
    for (let i = 1; i < 9; i++) {
      const a = (i * 2.399 + seed) % (Math.PI * 2);
      const k = amp * (0.55 + 0.45 * r());
      pts.push([Math.cos(a) * k, Math.sin(a) * k, i / 9]);
    }
    pts.push([0, 0, 1]);
    return pts;
  };
  /** Varre cada trecho reto do zigue-zague com um bastão (cantos vivos, como um raio). */
  const zigzag = (m: Model, pts: V3[], rad: number, mat: string, c: string): void => {
    for (let i = 1; i < pts.length; i++) m.add(rod(pts[i - 1]!, pts[i]!, rad, rad, 5), mat, c);
  };
  const main = new Model();
  const mainPts = path(0.12, 0);
  zigzag(main, mainPts, 0.045, 'item_bolt', '#d4ff3a');
  zigzag(main, mainPts, 0.022, 'glow_white', '#ffffff');
  const nMain = it.part('bolt', main);
  const fork = new Model();
  zigzag(fork, path(0.18, 1.3), 0.02, 'item_bolt', '#efff9a');
  const nFork = it.part('fork', fork);
  // faíscas nas pontas (o runtime as deixa sobre o kart de origem e o atingido)
  const ends = new Model();
  for (const z of [0, 1]) {
    ends.add(flat(ico(0.1, 0)), 'glow_white', '#ffffff', { p: [0, 0, z] });
    ends.add(torus(0.13, 0.015, 4, 14), 'item_bolt', '#d4ff3a', { p: [0, 0, z] });
  }
  it.part('ends', ends);
  it.add(spin(nMain, [0, 0, 1], 0.4, 1), spin(nFork, [0, 0, 1], 0.4, -2));
  it.clip('loop', 0.4);
  return it.save('Segmento de raio unitário de z = 0 a z = 1 (≈0,3 m de espessura); o runtime estica entre os karts.');
}

/**
 * Cometa Guia: casca brilhante em volta do kart (nariz arredondado à frente) e cauda de fogo
 * rosa → laranja para trás (−Z), com fitas em espiral e uma estrela-guia na ponta.
 */
export async function cometaGuia(): Promise<ItemEntry> {
  const it = new ItemBuilder('cometa-guia');
  const shellM = new Model();
  const nose = sphere(1, 24, 14);
  nose.scale(1.15, 0.85, 1.45);
  shellM.add(nose, 'item_comet', (p) => mix('#ffd0ea', '#ff6fae', 0.5 - p.z * 0.35), { p: [0, 0.55, 0.2] });
  const nShell = it.part('shell', shellM);
  const tail = new Model();
  tail.add(cone(1.05, 4.6, 18).rotateX(-Math.PI / 2), 'item_comet_tail', (p) => mix('#ff6fae', '#ffb22e', (-p.z - 0.6) / 4.6), { p: [0, 0.55, -2.9] });
  tail.add(cone(0.55, 3.2, 12).rotateX(-Math.PI / 2), 'glow_white', (p) => mix('#fff3c0', '#ffc46a', (-p.z - 0.6) / 3.2), { p: [0, 0.55, -2.2] });
  const nTail = it.part('tail', tail);
  const ribbons = new Model();
  for (let i = 0; i < 3; i++) {
    const pts: V3[] = [];
    for (let j = 0; j <= 16; j++) {
      const t = j / 16, a = (i / 3) * Math.PI * 2 + t * Math.PI * 2.2, rr = 1.05 * (1 - t) + 0.1;
      pts.push([Math.cos(a) * rr, 0.55 + Math.sin(a) * rr * 0.8, 0.4 - t * 5]);
    }
    ribbons.add(tube(pts, (t) => 0.06 * (1 - t) + 0.01, 32, 5), 'glow_magenta', '#ffc4ee');
  }
  const nRib = it.part('ribbons', ribbons);
  const star = new Model();
  star.add(compassStar(0.32, 0.08), 'item_glow_yellow', '#ffe36a');
  star.add(sphere(0.08, 10, 6), 'glow_white', '#ffffff');
  const nStar = it.part('star', star, { t: [0, 0.75, 1.75] });
  it.add(
    spin(nRib, [0, 0, 1], 0.6, -1),
    spin(nStar, [0, 0, 1], 0.6, 1),
    sampled(nTail, 'scale', 0.6, (ph) => [1 + 0.06 * wave(ph, 2), 1 + 0.06 * wave(ph, 2), 1 + 0.1 * wave(ph, 3)]),
    sampled(nShell, 'scale', 0.6, (ph) => { const k = 1 + 0.03 * wave(ph, 2); return [k, k, k]; }),
  );
  it.clip('loop', 0.6);
  return it.save('Aura do kart em modo cometa: casca de ≈2,3 m em volta do kart e cauda de ≈5 m para −Z; origem no chão sob o kart.');
}

export async function boostPad(): Promise<ItemEntry> {
  const it = new ItemBuilder('boost-pad');
  const m = new Model();
  const W = 4, L = 6;
  // placa com borda chanfrada
  m.add(plateXZ([[-W / 2, -L / 2], [W / 2, -L / 2], [W / 2, L / 2], [-W / 2, L / 2]], 0.05, 0.02), 'kart_metal', '#2a2f3d', { p: [0, 0.025, 0] });
  m.add(box(W - 0.5, 0.012, L - 0.4), 'matte', '#161a24', { p: [0, 0.052, 0] });
  // setas chevron apontando para +Z
  const chev = (z: number, s: number): P2[] => ([[0, 0.75], [1.45, -0.35], [1.45, -0.9], [0, 0.2], [-1.45, -0.9], [-1.45, -0.35]] as P2[]).map(([x, y]) => [x * s, z + y * s] as P2);
  [-1.85, -0.35, 1.15].forEach((z, i) => {
    m.add(plateXZ(chev(z, 1), 0.03, 0.008), i === 0 ? 'item_glow_orange' : 'item_glow_yellow', i === 0 ? '#ff7a1e' : i === 1 ? '#ffb22e' : '#ffe36a', { p: [0, 0.07, 0] });
  });
  // trilhos laterais com luzes e parafusos
  for (const sg of [1, -1]) {
    m.add(shell([{ z: -L / 2 + 0.05, hw: 0.11, y0: 0.03, y1: 0.12, r: 0.04, cx: sg * (W / 2 - 0.13) }, { z: L / 2 - 0.05, hw: 0.11, y0: 0.03, y1: 0.12, r: 0.04, cx: sg * (W / 2 - 0.13) }], { sub: 1, n: 2 }), 'kart_metal', '#3d4660');
    for (let i = 0; i < 6; i++) {
      m.add(cbox(0.1, 0.03, 0.42, 0.01), 'glow_cyan', '#8fefff', { p: [sg * (W / 2 - 0.13), 0.125, -2.4 + i * 0.96] });
      if (i < 5) m.add(bolt(0.035, 0.03), 'kart_metal', '#aab3c8', { p: [sg * (W / 2 - 0.13), 0.125, -1.92 + i * 0.96] });
    }
  }
  for (const z of [-L / 2 + 0.12, L / 2 - 0.12]) m.add(texPlane(W - 0.6, 0.18, 10, 0.5).rotateX(-Math.PI / 2), 'item_hazard', '#ffffff', { p: [0, 0.06, z] });
  it.part('pad', m);
  return it.save('Placa de 4 × 6 m rente ao chão (altura 0,14 m), origem no centro, setas para +Z.');
}

export async function ramp(): Promise<ItemEntry> {
  const it = new ItemBuilder('ramp');
  const m = new Model();
  // cunha: x −0,5..0,5; z −0,5..0,5; y 0 → 1 em z = +0,5
  const side: P2[] = [[-0.5, 0], [0.5, 0], [0.5, 1], [-0.5, 0.02]];
  m.add(profileX(side, 0.92), 'item_planks', '#b88a55');
  // deque (superfície) com faixa central de setas
  const slope = Math.atan2(1, 1), len = Math.SQRT2;
  const deck = texPlane(0.9, len, 1, 1.4).rotateX(-Math.PI / 2);
  m.add(deck, 'item_planks', '#d9a86a', { p: [0, 0.505, 0], r: [-slope, 0, 0] });
  for (let i = 0; i < 3; i++) {
    const t = -0.42 + i * 0.36;
    m.add(plateXZ([[0, 0.12], [0.2, -0.04], [0.2, -0.12], [0, 0.04], [-0.2, -0.12], [-0.2, -0.04]], 0.01), 'item_glow_yellow', '#ffc23a', { p: [0, 0.512 + t * Math.sin(slope) * 1.0, t * Math.cos(slope) * 1.0], r: [-slope, 0, 0] });
  }
  // longarinas laterais com listras de aviso + treliça
  for (const sg of [1, -1]) {
    const x = sg * 0.48;
    m.add(profileX([[-0.5, 0], [0.5, 0], [0.5, 1.04], [0.46, 1.04], [-0.5, 0.07]], 0.04), 'kart_metal', '#6a7592', { p: [x, 0, 0] });
    const fascia = texPlane(len, 0.09, 8, 0.5);
    fascia.rotateY(sg * Math.PI / 2);
    m.add(fascia, 'item_hazard', '#ffffff', { p: [sg * 0.502, 0.5 - 0.015, 0], r: [-slope * 1, 0, 0] });
    for (const z of [-0.1, 0.2, 0.46]) {
      const h = z + 0.5;
      m.add(cbox(0.012, h - 0.08, 0.05), 'kart_metal', '#7c869c', { p: [sg * 0.503, (h - 0.08) / 2, z] });
    }
    m.add(rod([sg * 0.503, 0.02, -0.1], [sg * 0.503, 0.6, 0.2], 0.014, 0.014, 4), 'kart_metal', '#7c869c');
    m.add(rod([sg * 0.503, 0.02, 0.2], [sg * 0.503, 0.86, 0.46], 0.014, 0.014, 4), 'kart_metal', '#7c869c');
  }
  // testeira traseira (face alta) com listras
  m.add(texPlane(0.92, 0.16, 6, 0.5).rotateY(0), 'item_hazard', '#ffffff', { p: [0, 0.9, 0.501] });
  m.add(box(0.94, 0.04, 0.03), 'kart_metal', '#4a5266', { p: [0, 1.0, 0.49] });
  // lábio de entrada
  m.add(profileX([[-0.5, 0], [-0.42, 0], [-0.42, 0.1], [-0.5, 0.02]], 0.96), 'kart_metal', '#ffb22e');
  // encaixa exatamente no cubo unitário (o runtime escala em x, y, z)
  const bb = m.bounds();
  const sz = bb.getSize(new THREE.Vector3());
  m.transform(new THREE.Matrix4().makeScale(1 / sz.x, 1 / sz.y, 1 / sz.z).multiply(new THREE.Matrix4().makeTranslation(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2)));
  it.part('ramp', m);
  return it.save('Rampa unitária 1 × 1 × 1 m (x,z em −0,5..0,5; sobe de y=0 em z=−0,5 a y=1 em z=+0,5); origem no chão ao centro; o runtime escala em x,y,z.');
}

export async function finishArch(): Promise<ItemEntry> {
  const it = new ItemBuilder('finish-arch');
  const m = new Model();
  const span = 20, clear = 7, tw = 1.3, top = 9.0;
  for (const sg of [1, -1]) {
    const cx = sg * (span / 2 + tw / 2);
    // sapata + torre treliçada
    m.add(cbox(tw + 0.7, 0.5, 2.0, 0.12), 'kart_metal', '#3a4256', { p: [cx, 0.25, 0] });
    for (const [dx, dz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as P2[]) {
      m.add(rod([cx + dx * tw * 0.45, 0.4, dz * 0.55], [cx + dx * tw * 0.45, top - 0.2, dz * 0.55], 0.09, 0.09, 6), 'paint', '#e2452a');
    }
    for (let i = 0; i < 6; i++) {
      const y0 = 0.6 + i * 1.3, y1 = y0 + 1.3;
      for (const dz of [0.55, -0.55]) {
        m.add(rod([cx - tw * 0.45, y0, dz], [cx + tw * 0.45, y1, dz], 0.04, 0.04, 4), 'kart_metal', '#f3ead7');
        m.add(rod([cx - tw * 0.45, y1, dz], [cx + tw * 0.45, y1, dz], 0.04, 0.04, 4), 'kart_metal', '#f3ead7');
      }
      for (const dx of [0.45, -0.45]) m.add(rod([cx + dx * tw, y0, -0.55], [cx + dx * tw, y1, 0.55], 0.035, 0.035, 4), 'kart_metal', '#f3ead7');
    }
    // capitel com lanterna e bandeira
    m.add(cbox(tw + 0.5, 0.3, 1.7, 0.08), 'paint', '#1d2a4d', { p: [cx, top, 0] });
    m.add(flat(ico(0.32, 1)), 'glow_warm', '#ffe08a', { p: [cx, top + 0.45, 0] });
    m.add(rod([cx, top + 0.7, 0], [cx, top + 2.3, 0], 0.045, 0.03, 6), 'kart_metal', '#c9ced6');
    const fl = texPlane(1.3, 0.8, 1.5, 1);
    m.add(fl, 'item_checker', '#ffffff', { p: [cx + sg * 0.68, top + 1.85, 0] });
    // painel lateral com estrela-bússola
    for (const fz of [1, -1]) {
      m.add(compassStar(0.5, 0.06), 'glow_warm', '#ffd23f', { p: [cx, 3.6, fz * 0.62] });
      m.add(cbox(tw * 0.8, 1.5, 0.05, 0.03), 'paint', '#1d2a4d', { p: [cx, 3.6, fz * 0.58] });
    }
  }
  // viga-letreiro: vão livre até y = 7
  const beamH = top - clear - 0.15, beamY = clear + beamH / 2, beamW = span + tw * 2;
  m.add(cbox(beamW, beamH, 0.9, 0.08), 'paint', '#1d2a4d', { p: [0, beamY, 0] });
  for (const fz of [1, -1]) {
    const ry = fz > 0 ? 0 : Math.PI;
    m.add(texPlane(14, 1.05), 'item_sign', '#ffffff', { p: [0, beamY + 0.32, fz * 0.455], r: [0, ry, 0] });
    m.add(texPlane(span + 2, 0.55, 40, 1), 'item_checker', '#ffffff', { p: [0, clear + 0.31, fz * 0.455], r: [0, ry, 0] });
    for (const sx of [1, -1]) {
      m.add(texPlane(3.4, 1.05, 6, 2), 'item_checker', '#ffffff', { p: [sx * 9.0, beamY + 0.32, fz * 0.455], r: [0, ry, 0] });
      m.add(compassStar(0.36, 0.05), 'glow_warm', '#ffd23f', { p: [sx * 7.3, beamY + 0.32, fz * 0.47] });
    }
    // refletores
    for (let i = 0; i < 9; i++) {
      const x = -8 + i * 2;
      m.add(lathe([[0.1, 0], [0.2, -0.22], [0.16, -0.22], [0.001, -0.04]].reverse() as P2[], 8), 'kart_metal', '#3a4256', { p: [x, clear + 0.02, fz * 0.3], r: [fz * 0.35, 0, 0] });
      m.add(cyl(0.15, 0.15, 0.02, 8), 'glow_white', '#fff6d6', { p: [x, clear - 0.19, fz * 0.375], r: [fz * 0.35, 0, 0] });
    }
  }
  m.add(cbox(beamW + 0.3, 0.14, 1.1, 0.04), 'paint', '#ffd23f', { p: [0, top - 0.1, 0] });
  // coroa central
  m.add(gear(0.75, 12, 0.3, 0.3, 0.14), 'paint', '#ffd23f', { p: [0, top + 0.55, 0] });
  for (const fz of [1, -1]) m.add(compassStar(0.52, 0.08), 'glow_white', '#fff8dc', { p: [0, top + 0.55, fz * 0.17] });
  it.part('arch', m);
  return it.save('Pórtico com vão livre de 20 m × 7 m; origem no chão ao centro; a pista passa ao longo de Z.');
}

export async function trophy(kind: 'gold' | 'silver' | 'bronze'): Promise<ItemEntry> {
  const it = new ItemBuilder(`trophy-${kind}`);
  const mat = `item_${kind}`;
  const [c, cl, cd] = kind === 'gold' ? ['#f2c230', '#ffe58a', '#b8860b'] : kind === 'silver' ? ['#c9d1dc', '#f2f6fb', '#8a94a3'] : ['#c98445', '#eab07a', '#8a4f20'];
  const m = new Model();
  // base de madeira escura + placa
  m.add(lathe([[0.001, 0], [0.15, 0], [0.15, 0.02], [0.135, 0.035], [0.125, 0.085], [0.11, 0.1], [0.001, 0.1]] as P2[], 8), 'glossy', '#3a2416');
  m.add(cbox(0.1, 0.045, 0.012, 0.006), mat, cl, { p: [0, 0.058, 0.118] });
  // haste torneada
  m.add(lathe([[0.001, 0.1], [0.075, 0.1], [0.06, 0.125], [0.03, 0.16], [0.045, 0.2], [0.028, 0.23], [0.035, 0.27], [0.001, 0.27]] as P2[], 14), mat, c);
  // taça (parede dupla: fora e dentro)
  m.add(lathe([[0.035, 0.27], [0.1, 0.31], [0.135, 0.39], [0.15, 0.5], [0.158, 0.56], [0.148, 0.565], [0.138, 0.5], [0.12, 0.4], [0.08, 0.33], [0.001, 0.31]], 18), mat, (p) => mix(c, cl, (p.y - 0.27) / 0.3));
  m.add(torus(0.155, 0.012, 5, 18).rotateX(Math.PI / 2), mat, cl, { p: [0, 0.56, 0] });
  m.add(torus(0.137, 0.008, 4, 18).rotateX(Math.PI / 2), mat, cd, { p: [0, 0.4, 0] });
  // alças em forma de asa
  for (const sg of [1, -1]) {
    m.add(tube([[sg * 0.145, 0.52, 0], [sg * 0.25, 0.54, 0], [sg * 0.26, 0.42, 0], [sg * 0.17, 0.35, 0], [sg * 0.115, 0.33, 0]], (t) => 0.018 - 0.006 * t, 14, 6), mat, c);
    m.add(flat(ico(0.022, 0)), mat, cl, { p: [sg * 0.262, 0.5, 0] });
  }
  // emblema: estrela-bússola na frente e atrás
  for (const fz of [1, -1]) m.add(compassStar(0.075, 0.016), mat, cl, { p: [0, 0.45, fz * 0.143], r: [fz * -0.16, 0, 0] });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    m.add(flat(ico(0.012, 0)), mat, cl, { p: [Math.cos(a) * 0.128, 0.09, Math.sin(a) * 0.128] });
  }
  it.part('trophy', m);
  return it.save('Taça de ≈0,58 m, origem na base.');
}

export async function podium(): Promise<ItemEntry> {
  const it = new ItemBuilder('podium');
  const m = new Model();
  const W = 4.2, D = 4.4;
  const places: [number, number, number, string][] = [[0, 1.0, 1, '#f2c230'], [-4.2, 0.6, 2, '#cfd6e0'], [4.2, 0.3, 3, '#cf8a4a']];
  for (const [x, h, rank, colr] of places) {
    // bloco com topo exatamente em y = h
    m.add(plateXZ([[-W / 2, -D / 2], [W / 2, -D / 2], [W / 2, D / 2], [-W / 2, D / 2]], h - 0.06, 0.03), 'paint', '#24345e', { p: [x, (h - 0.06) / 2, 0] });
    m.add(plateXZ([[-W / 2 - 0.06, -D / 2 - 0.06], [W / 2 + 0.06, -D / 2 - 0.06], [W / 2 + 0.06, D / 2 + 0.06], [-W / 2 - 0.06, D / 2 + 0.06]], 0.06, 0.02), 'kart_metal', colr, { p: [x, h - 0.04, 0] });
    // tapete (rente ao topo) e guias para as rodas
    m.add(box(W - 0.9, 0.012, D - 0.5), 'cloth', '#b3262e', { p: [x, h - 0.006, 0] });
    // frente: placa com a colocação + faixa quadriculada
    const pr = Math.min(0.42, h * 0.42);
    m.add(texPlane(pr * 2, pr * 2), `item_rank${rank}`, '#ffffff', { p: [x, (h - 0.06) / 2 + 0.01, D / 2 + 0.006] });
    m.add(texPlane(W - 0.2, 0.1, 21, 0.5), 'item_checker', '#ffffff', { p: [x, h - 0.12, D / 2 + 0.004] });
    m.add(texPlane(W - 0.2, 0.1, 21, 0.5), 'item_checker', '#ffffff', { p: [x, h - 0.12, -D / 2 - 0.004], r: [0, Math.PI, 0] });
    for (const sx of [1, -1]) m.add(compassStar(Math.min(0.2, h * 0.25), 0.03), 'glow_warm', '#ffd23f', { p: [x + sx * 1.3, (h - 0.06) / 2, D / 2 + 0.01] });
  }
  // colunas traseiras com tochas e arco de louros atrás do 1º lugar
  for (const sx of [1, -1]) {
    const x = sx * 2.1, z = -D / 2 - 0.35;
    m.add(lathe([[0.001, 0], [0.26, 0], [0.26, 0.12], [0.16, 0.2], [0.14, 2.6], [0.2, 2.7], [0.24, 2.82], [0.001, 2.82]] as P2[], 10), 'paint', '#f3ead7', { p: [x, 0, z] });
    m.add(flat(ico(0.24, 1)), 'glow_warm', '#ffcf5a', { p: [x, 3.08, z] });
    m.add(torus(0.2, 0.03, 4, 10).rotateX(Math.PI / 2), 'kart_metal', '#f2c230', { p: [x, 2.84, z] });
  }
  const arcPts: V3[] = [];
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI; arcPts.push([Math.cos(a) * 2.1, 2.9 + Math.sin(a) * 1.0, -D / 2 - 0.35]); }
  m.add(tube(arcPts, 0.07, 20, 6), 'kart_metal', '#f2c230');
  for (let i = 1; i < 10; i++) {
    const a = (i / 10) * Math.PI, sgn = i < 5 ? 1 : -1;
    const g = leafBlade(0.42, 0.2, 0.15, 3);
    m.add(g, 'leaf', i % 2 ? '#4caf50' : '#7fcf5a', { p: [Math.cos(a) * 2.1, 2.9 + Math.sin(a) * 1.0, -D / 2 - 0.33], r: [Math.PI / 2 - 0.3, 0, a - Math.PI / 2 + sgn * 0.5] });
  }
  m.add(compassStar(0.5, 0.08), 'glow_warm', '#ffe08a', { p: [0, 3.9, -D / 2 - 0.33] });
  // degraus frontais (decorativos) e holofotes nos cantos
  for (const sx of [1, -1]) {
    const x = sx * (4.2 + W / 2 + 0.25);
    m.add(cyl(0.12, 0.16, 0.5, 8), 'kart_metal', '#3a4256', { p: [x, 0.25, D / 2 - 0.2] });
    m.add(flat(ico(0.16, 0)), 'glow_cyan', '#a8f3ff', { p: [x, 0.62, D / 2 - 0.2] });
  }
  it.part('podium', m);
  return it.save('Topos planos: 1º (0, 1.0, 0), 2º (−4.2, 0.6, 0), 3º (4.2, 0.3, 0); cada plataforma 4,2 × 4,4 m; origem no chão.');
}
