/**
 * Peças das rodas da loja (pneu + aro), modeladas no espaço NORMALIZADO do contrato de pneus:
 * eixo em X, face externa em +X (lado esquerdo do kart), raio externo 1 e largura total 1 (x ∈ [−0,5, 0,5]).
 * O jogo escala cada roda para o tamanho da roda original de cada kart (src/game/vehicles/tires.ts).
 */
import { THREE, Model, type ColorLike } from '../lib/geo';
import { bolt, latheX, quads, type P2 } from '../karts/common';

export const HW = 0.5;

export interface CarcassSpec {
  /** raio do talão (onde o pneu encontra o aro) */
  rim: number;
  /** raio da banda de rodagem (1 = toca o chão; menor quando há travas por cima) */
  r?: number;
  /** 0 = ombro quadrado, 1 = pneu balão */
  shoulder?: number;
  /** sulcos circunferenciais na banda */
  grooves?: number;
  seg?: number;
  mat?: string;
  col: ColorLike;
  /** cor da parede lateral (padrão = col) */
  wallCol?: ColorLike;
  /** repetições do padrão da textura da banda ao redor da roda */
  uvRepeat?: number;
}

/** Carcaça do pneu (sólido de revolução): parede interna → banda → parede externa. */
export function carcass(m: Model, s: CarcassSpec): Model {
  const r = s.r ?? 1, rr = s.rim, side = r - rr;
  const sh = 0.12 + (s.shoulder ?? 0.3) * 0.32;
  const prof: P2[] = [
    [rr - 0.01, -HW * 0.78], [rr + side * 0.18, -HW * 0.97],
    [r - side * (0.22 + sh * 0.3), -HW], [r - side * 0.06, -HW * (1 - sh * 0.55)], [r, -HW * (1 - sh)],
  ];
  const tread: P2[] = [];
  const gr = s.grooves ?? 0;
  const span = HW * (1 - sh) * 2;
  if (gr > 0) {
    for (let i = 1; i <= gr; i++) {
      const x = -span / 2 + (span * i) / (gr + 1), gw = span / (gr + 1) * 0.16;
      tread.push([r, x - gw * 1.5], [r - 0.035, x - gw], [r - 0.035, x + gw], [r, x + gw * 1.5]);
    }
  } else tread.push([r + 0.004, 0]);
  const full: P2[] = [...prof, ...tread, ...prof.map(([a, b]) => [a, -b] as P2).reverse()];
  const g = latheX(full, s.seg ?? 24);
  const uv = g.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (s.uvRepeat ?? 16), uv.getY(i));
  const wall = s.wallCol ?? s.col;
  m.add(g, s.mat ?? 'kart_tire', (p) => (Math.abs(p.x) > HW * 0.9 && Math.hypot(p.y, p.z) < r - side * 0.25 ? wall : s.col));
  return m;
}

/** Anel plano (faixa) na face externa, um pouco saltado para a cor ficar nítida. */
export function wallRing(m: Model, r0: number, r1: number, x: number, color: ColorLike | ((a: number) => ColorLike), mat = 'std', seg = 28): Model {
  const g = latheX([[r1, x], [r0, x]], seg);
  if (typeof color === 'function') {
    m.add(quads(g.toNonIndexed(), (c) => color((Math.atan2(c.z, c.y) + Math.PI * 2) % (Math.PI * 2))), mat);
  } else m.add(g, mat, color);
  return m;
}

export interface RimSpec {
  /** raio do lábio do aro */
  rr: number;
  col: ColorLike;
  mat?: string;
  /** cor do poço/fundo (visto entre os raios) */
  wellCol?: ColorLike;
  /** profundidade do fundo (x do disco de trás) */
  back?: number;
  seg?: number;
}

/** Lábio + poço + fundo do aro e a tampa interna (lado do chassi). */
export function rim(m: Model, s: RimSpec): Model {
  const rr = s.rr, back = s.back ?? -0.12;
  const prof: P2[] = [
    [rr + 0.012, 0.36], [rr + 0.03, 0.44], [rr + 0.006, 0.47], [rr - 0.035, 0.45], [rr - 0.055, 0.38],
    [rr * 0.9, back], [0.001, back],
  ];
  const well = s.wellCol ?? '#24272d';
  m.add(latheX(prof, s.seg ?? 24), s.mat ?? 'kart_metal', (p) => (p.x < 0.34 && Math.hypot(p.y, p.z) < rr * 0.93 ? well : s.col));
  m.add(latheX([[0.001, -0.38], [rr - 0.02, -0.38], [rr + 0.01, -0.32]], 16), 'matte', '#1e2126');
  return m;
}

/** Raio afunilado (prisma de 12 triângulos) do raio r0 ao r1, centrado no ângulo `a` (rad). */
export function beam(a: number, r0: number, r1: number, w0: number, w1: number, t: number, x: number, opts: { sweep?: number; t1?: number } = {}): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(t, 1, 1);
  const pos = g.getAttribute('position');
  const sweep = opts.sweep ?? 0, t1 = opts.t1 ?? t;
  for (let i = 0; i < pos.count; i++) {
    const k = pos.getY(i) + 0.5;
    const w = w0 + (w1 - w0) * k, th = t + (t1 - t) * k;
    pos.setXYZ(i, x + pos.getX(i) * (th / t), r0 + (r1 - r0) * k, pos.getZ(i) * w + sweep * k);
  }
  g.computeVertexNormals();
  g.rotateX(a);
  return g;
}

/** Cubo: cilindro com tampa arredondada na face externa. */
export function hub(m: Model, r: number, x0: number, x1: number, color: ColorLike, mat = 'kart_metal', seg = 14, capCol?: ColorLike): Model {
  const c = capCol ?? color;
  m.add(latheX([[r, x0], [r, x1 - r * 0.25], [r * 0.82, x1 - r * 0.05], [r * 0.4, x1], [0.001, x1 + 0.004]], seg), mat, (p) => (Math.hypot(p.y, p.z) < r * 0.7 && p.x > x1 - r * 0.12 ? c : color));
  return m;
}

/** Porcas/parafusos em círculo na face externa. */
export function boltCircle(m: Model, n: number, radius: number, x: number, size: number, color: ColorLike, mat = 'kart_metal', phase = 0.5): Model {
  for (let i = 0; i < n; i++) {
    const a = ((i + phase) / n) * Math.PI * 2;
    const g = bolt(size, size * 0.9, 'x');
    g.translate(x + size * 0.45, radius, 0);
    g.rotateX(a);
    m.add(g, mat, color);
  }
  return m;
}

/** Válvula: quebra a simetria e deixa o giro evidente. */
export function valve(m: Model, rr: number, x = 0.4): Model {
  const g = new THREE.CylinderGeometry(0.018, 0.024, 0.09, 5, 1, true);
  g.rotateZ(-Math.PI / 2);
  g.translate(x, rr * 0.86, 0);
  m.add(g, 'kart_metal', '#eef0f3');
  return m;
}

/** Ajusta o modelo ao contrato: largura exata 1 (centrada em x = 0) e raio externo exato 1. */
export function normalize(m: Model): Model {
  const b = m.bounds();
  let rmax = 0;
  const v = new THREE.Vector3();
  for (const p of m.parts) {
    const pos = p.geo.getAttribute('position');
    for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); rmax = Math.max(rmax, Math.hypot(v.y, v.z)); }
  }
  const cx = (b.min.x + b.max.x) / 2, w = b.max.x - b.min.x;
  const mat = new THREE.Matrix4().makeScale(1 / w, 1 / rmax, 1 / rmax).multiply(new THREE.Matrix4().makeTranslation(-cx, 0, 0));
  // applyMatrix4 da geometria já corrige as normais pela matriz normal
  return m.transform(mat);
}
