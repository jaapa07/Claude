/**
 * Ferramentas de modelagem compartilhadas pelos karts (e reutilizadas pelos itens):
 * loft de seções (cascos, bicos, carenagens), seções em "U" (banheiras/cascos abertos),
 * perfis extrudados, para-lamas, rodas, volante, assento, suspensão, escapamento, etc.
 */
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { THREE, Model, col, cyl, extrude, lathe, sphere, torus, tube, type ColorLike, type V3 } from '../lib/geo';

export type P2 = [number, number];

/* ------------------------------------------------------------------ loft */
export interface Ring { pts: P2[]; z?: number; m?: THREE.Matrix4 }

function area2(pts: P2[]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]!, q = pts[(i + 1) % pts.length]!;
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

/** Superfície lofted por anéis fechados com o mesmo número de pontos. Normais suaves, tampas planas. */
export function loft(rings: Ring[], o: { capStart?: boolean; capEnd?: boolean } = {}): THREE.BufferGeometry {
  const capStart = o.capStart ?? true, capEnd = o.capEnd ?? true;
  const n = rings[0]!.pts.length, R = rings.length;
  const P: THREE.Vector3[][] = rings.map((r) => r.pts.map(([x, y]) => {
    const v = new THREE.Vector3(x, y, r.m ? 0 : r.z ?? 0);
    return r.m ? v.applyMatrix4(r.m) : v;
  }));
  const cen = P.map((ring) => ring.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / n));
  const nrm0 = new THREE.Vector3(0, 0, 1);
  if (rings[0]!.m) nrm0.transformDirection(rings[0]!.m);
  const adv = cen[1]!.clone().sub(cen[0]!);
  const sign = area2(rings[0]!.pts) * adv.dot(nrm0) >= 0 ? 1 : -1;

  const pos = new Float32Array(R * n * 3);
  P.forEach((ring, i) => ring.forEach((p, j) => p.toArray(pos, (i * n + j) * 3)));
  const idx: number[] = [];
  const corner: P2[] = [];
  for (let i = 0; i < R - 1; i++) for (let j = 0; j < n; j++) {
    const j1 = (j + 1) % n;
    const a = i * n + j, b = i * n + j1, c = (i + 1) * n + j, d = (i + 1) * n + j1;
    const ua = [j / n, i / (R - 1)] as P2, ub = [(j + 1) / n, i / (R - 1)] as P2;
    const uc = [j / n, (i + 1) / (R - 1)] as P2, ud = [(j + 1) / n, (i + 1) / (R - 1)] as P2;
    if (sign > 0) { idx.push(a, b, c, b, d, c); corner.push(ua, ub, uc, ub, ud, uc); }
    else { idx.push(a, c, b, b, c, d); corner.push(ua, uc, ub, ub, uc, ud); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const nor = g.getAttribute('normal');
  const oP: number[] = [], oN: number[] = [], oU: number[] = [];
  idx.forEach((k, t) => {
    oP.push(pos[k * 3]!, pos[k * 3 + 1]!, pos[k * 3 + 2]!);
    oN.push(nor.getX(k), nor.getY(k), nor.getZ(k));
    oU.push(corner[t]![0], corner[t]![1]);
  });
  const cap = (ri: number, dir: THREE.Vector3): void => {
    const pts = rings[ri]!.pts;
    const tris = THREE.ShapeUtils.triangulateShape(pts.map(([x, y]) => new THREE.Vector2(x, y)), []);
    const ring = P[ri]!;
    const sum = new THREE.Vector3();
    for (const [a, b, c] of tris as [number, number, number][]) {
      sum.add(new THREE.Vector3().subVectors(ring[b]!, ring[a]!).cross(new THREE.Vector3().subVectors(ring[c]!, ring[a]!)));
    }
    const flip = sum.dot(dir) < 0;
    const nn = sum.clone().normalize().multiplyScalar(flip ? -1 : 1);
    for (const tri of tris as [number, number, number][]) {
      const order = flip ? [tri[0], tri[2], tri[1]] : tri;
      for (const k of order) {
        oP.push(ring[k]!.x, ring[k]!.y, ring[k]!.z);
        oN.push(nn.x, nn.y, nn.z);
        oU.push(pts[k]![0], pts[k]![1]);
      }
    }
  };
  if (capStart) cap(0, adv.clone().negate());
  if (capEnd) cap(R - 1, cen[R - 1]!.clone().sub(cen[R - 2]!));
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(new Float32Array(oP), 3));
  out.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(oN), 3));
  out.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(oU), 2));
  return out;
}

/**
 * Pinta por quadrilátero (pares de triângulos de um loft): cor única por face, com bordas nítidas
 * entre cores — ao contrário de `paint`, que interpola por vértice.
 */
export function quads(geo: THREE.BufferGeometry, fn: (c: THREE.Vector3, n: THREE.Vector3, k: number) => ColorLike, group = 6): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  const pos = g.getAttribute('position'), nor = g.getAttribute('normal');
  const arr = new Float32Array(pos.count * 3);
  const c = new THREE.Vector3(), n = new THREE.Vector3(), t = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += group) {
    const m = Math.min(group, pos.count - i);
    c.set(0, 0, 0); n.set(0, 0, 0);
    for (let k = 0; k < m; k++) { c.add(t.fromBufferAttribute(pos, i + k)); n.add(t.fromBufferAttribute(nor, i + k)); }
    c.multiplyScalar(1 / m); n.normalize();
    const cc = col(fn(c, n, i / group));
    for (let k = 0; k < m; k++) { arr[(i + k) * 3] = cc.r; arr[(i + k) * 3 + 1] = cc.g; arr[(i + k) * 3 + 2] = cc.b; }
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

/* -------------------------------------------------------------- seções */
export interface Sec {
  z: number; hw: number; y0: number; y1: number;
  /** raio dos cantos de cima / de baixo */
  r?: number; rb?: number;
  /** fator de largura no topo (1 = paredes retas) */
  wt?: number;
  /** abaulamento do topo / quilha do fundo */
  crown?: number; belly?: number;
  cx?: number;
  /** só para seções em U: espessura da parede e do piso */
  th?: number; fl?: number;
}

const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n: number): P2[] => {
  const out: P2[] = [];
  if (n <= 0) return [[cx + Math.cos((a0 + a1) / 2) * r * 1.08, cy + Math.sin((a0 + a1) / 2) * r * 1.08]];
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  return out;
};

function shape(s: Sec, half: P2[]): P2[] {
  const h = s.y1 - s.y0 || 1e-6;
  const all = [...half, ...half.slice(1, -1).reverse().map(([x, y]) => [-x, y] as P2)];
  return all.map(([x, y]) => {
    const t = Math.min(1, Math.max(0, (y - s.y0) / h));
    const k = 1 - Math.min(1, (x / (s.hw || 1e-6)) ** 2);
    return [x * (1 + ((s.wt ?? 1) - 1) * t) + (s.cx ?? 0), y + (s.crown ?? 0) * k * t * t - (s.belly ?? 0) * k * (1 - t) * (1 - t)] as P2;
  });
}

/** Seção fechada: retângulo arredondado com conicidade, abaulamento e quilha. Anti-horário a partir do centro de baixo. */
export function rrPts(s: Sec, n = 3): P2[] {
  const hw = Math.max(0.004, s.hw), h = Math.max(0.004, s.y1 - s.y0);
  const rt = Math.max(0.001, Math.min(s.r ?? 0.05, hw * 0.98, h * 0.49));
  const rb = Math.max(0.001, Math.min(s.rb ?? s.r ?? 0.05, hw * 0.98, h * 0.49));
  const half: P2[] = [
    [0, s.y0], [(hw - rb) * 0.5, s.y0],
    ...arc(hw - rb, s.y0 + rb, rb, -Math.PI / 2, 0, n),
    [hw, (s.y0 + rb + s.y1 - rt) / 2],
    ...arc(hw - rt, s.y1 - rt, rt, 0, Math.PI / 2, n),
    [(hw - rt) * 0.5, s.y1], [0, s.y1],
  ];
  return shape({ ...s, hw }, half);
}

/** Seção em U (banheira/casco aberto em cima) com parede de espessura `th` e piso `fl`. */
export function tubPts(s: Sec, n = 3): P2[] {
  const hw = Math.max(0.01, s.hw), h = Math.max(0.02, s.y1 - s.y0);
  const th = Math.min(s.th ?? 0.04, hw * 0.6), fl = Math.min(s.fl ?? s.th ?? 0.04, h * 0.6);
  const rb = Math.max(0.002, Math.min(s.rb ?? s.r ?? 0.05, hw * 0.98, h * 0.8));
  const ri = Math.max(0.002, Math.min(rb - Math.min(th, fl) * 0.6, hw - th - 0.002, h - fl - 0.002));
  const e = Math.min(th * 0.3, 0.012);
  const half: P2[] = [
    [0, s.y0], [(hw - rb) * 0.5, s.y0],
    ...arc(hw - rb, s.y0 + rb, rb, -Math.PI / 2, 0, n),
    [hw, (s.y0 + rb + s.y1) / 2],
    [hw, s.y1 - e], [hw - e, s.y1], [hw - th + e, s.y1], [hw - th, s.y1 - e],
    [hw - th, (s.y0 + fl + ri + s.y1) / 2],
    ...arc(hw - th - ri, s.y0 + fl + ri, ri, 0, -Math.PI / 2, n),
    [(hw - th - ri) * 0.5, s.y0 + fl], [0, s.y0 + fl],
  ];
  return shape({ ...s, hw }, half);
}

const SEC_DEFAULTS: Required<Omit<Sec, 'z' | 'hw' | 'y0' | 'y1'>> = { r: 0.05, rb: -1, wt: 1, crown: 0, belly: 0, cx: 0, th: 0.04, fl: -1 };

/** Interpola seções-chave com Catmull-Rom (superfícies suaves a partir de poucas chaves). */
export function smoothSecs(keys: Sec[], sub = 4): Sec[] {
  const full = keys.map((k) => {
    const f = { ...SEC_DEFAULTS, ...k };
    if (f.rb < 0) f.rb = f.r;
    if (f.fl < 0) f.fl = f.th;
    return f as Required<Sec>;
  });
  if (sub <= 1) return full;
  const names = Object.keys(full[0]!) as (keyof Sec)[];
  const out: Sec[] = [];
  const cr = (p0: number, p1: number, p2: number, p3: number, t: number): number =>
    0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t);
  for (let i = 0; i < full.length - 1; i++) {
    const a = full[Math.max(0, i - 1)]!, b = full[i]!, c = full[i + 1]!, d = full[Math.min(full.length - 1, i + 2)]!;
    for (let k = 0; k < sub; k++) {
      const t = k / sub;
      const s = {} as Record<keyof Sec, number>;
      for (const nm of names) {
        const v = cr(a[nm], b[nm], c[nm], d[nm], t);
        // evita ultrapassar os valores vizinhos (sem ondulação)
        s[nm] = Math.min(Math.max(v, Math.min(b[nm], c[nm])), Math.max(b[nm], c[nm]));
      }
      out.push(s as Sec);
    }
  }
  out.push(full[full.length - 1]!);
  return out;
}

export interface ShellOpts { sub?: number; n?: number; capStart?: boolean; capEnd?: boolean }
/** Casco fechado a partir de seções-chave. */
export function shell(keys: Sec[], o: ShellOpts = {}): THREE.BufferGeometry {
  return loft(smoothSecs(keys, o.sub ?? 3).map((s) => ({ z: s.z, pts: rrPts(s, o.n ?? 3) })), o);
}
/** Banheira (seção em U) a partir de seções-chave. */
export function tubShell(keys: Sec[], o: ShellOpts = {}): THREE.BufferGeometry {
  return loft(smoothSecs(keys, o.sub ?? 3).map((s) => ({ z: s.z, pts: tubPts(s, o.n ?? 3) })), o);
}

/** Loft ao longo de um eixo arbitrário: seções (x→`ax`, y→`ay`) avançando em `az`. Usado em asas, raios, lâminas. */
export function shellAlong(keys: Sec[], ax: V3, ay: V3, az: V3, o: ShellOpts = {}): THREE.BufferGeometry {
  const g = shell(keys, o);
  const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(...ax), new THREE.Vector3(...ay), new THREE.Vector3(...az));
  g.applyMatrix4(m);
  if (m.determinant() < 0) flipWinding(g);
  return g;
}

export function flipWinding(g: THREE.BufferGeometry): THREE.BufferGeometry {
  for (const name of ['position', 'normal', 'uv', 'color']) {
    const at = g.getAttribute(name);
    if (!at) continue;
    const a = at.array as Float32Array, s = at.itemSize;
    for (let i = 0; i < a.length; i += 3 * s) for (let k = 0; k < s; k++) {
      const t = a[i + s + k]!; a[i + s + k] = a[i + 2 * s + k]!; a[i + 2 * s + k] = t;
    }
  }
  return g;
}

/* ------------------------------------------------------- perfis e placas */
/** Perfil lateral: contorno em (z, y) extrudado ao longo de X (largura `w`, centrado). */
export function profileX(ptsZY: P2[], w: number, bevel = 0): THREE.BufferGeometry {
  const g = extrude(ptsZY.map(([z, y]) => [-z, y] as P2), w - 2 * bevel, bevel);
  g.applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI / 2));
  return g;
}
/** Placa em planta: contorno em (x, z) com espessura `t` em Y (centrada). */
export function plateXZ(ptsXZ: P2[], t: number, bevel = 0): THREE.BufferGeometry {
  const g = extrude(ptsXZ.map(([x, z]) => [x, -z] as P2), t - 2 * bevel, bevel);
  g.applyMatrix4(new THREE.Matrix4().makeRotationX(-Math.PI / 2));
  return g;
}
/** Placa de frente: contorno em (x, y) com espessura em Z. */
export function plateXY(ptsXY: P2[], t: number, bevel = 0): THREE.BufferGeometry {
  return extrude(ptsXY, t - 2 * bevel, bevel);
}

/**
 * Para-lama: faixa em arco em torno do eixo X. Ângulo medido a partir de +Y em direção a +Z (graus).
 * `sec(t)` devolve [meia-largura, espessura, deslocamento radial extra, cx].
 */
export function fender(r: number, a0: number, a1: number, sec: (t: number) => { hw: number; th: number; dr?: number; cx?: number; crown?: number }, seg = 10): THREE.BufferGeometry {
  const rings: Ring[] = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const a = THREE.MathUtils.degToRad(a0 + (a1 - a0) * t);
    const s = sec(t);
    const rr = r + (s.dr ?? 0);
    rings.push({
      pts: rrPts({ z: 0, hw: s.hw, y0: rr, y1: rr + s.th, r: s.th * 0.45, cx: s.cx ?? 0, crown: s.crown ?? 0 }, 0),
      m: new THREE.Matrix4().makeRotationX(a),
    });
  }
  return loft(rings);
}

/* ------------------------------------------------------- peças simples */
/** Caixa chanfrada barata (44 triângulos, facetada). */
export function cbox(w: number, h: number, d: number, c = 0): THREE.BufferGeometry {
  if (c <= 0) return new THREE.BoxGeometry(w, h, d);
  const k = Math.min(c, w * 0.45, h * 0.45, d * 0.45);
  const pts: THREE.Vector3[] = [];
  for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) {
    pts.push(new THREE.Vector3(sx * (w / 2 - k), sy * h / 2, sz * (d / 2 - k)));
    pts.push(new THREE.Vector3(sx * w / 2, sy * (h / 2 - k), sz * (d / 2 - k)));
    pts.push(new THREE.Vector3(sx * (w / 2 - k), sy * (h / 2 - k), sz * d / 2));
  }
  const g = new ConvexGeometry(pts);
  const n = g.getAttribute('position').count;
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  return g;
}

/** Cilindro (ou cone) entre dois pontos. */
export function rod(a: V3, b: V3, r0: number, r1 = r0, seg = 6): THREE.BufferGeometry {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const d = vb.clone().sub(va);
  const g = cyl(r1, r0, d.length(), seg);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  g.applyMatrix4(new THREE.Matrix4().compose(va.clone().add(vb).multiplyScalar(0.5), q, new THREE.Vector3(1, 1, 1)));
  return g;
}

/** Mola helicoidal entre dois pontos. */
export function spring(a: V3, b: V3, r: number, coils = 5, wire = 0.012): THREE.BufferGeometry {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const d = vb.clone().sub(va), len = d.length();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const pts: V3[] = [];
  const steps = coils * 5;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, ang = t * coils * Math.PI * 2;
    const p = new THREE.Vector3(Math.cos(ang) * r, t * len, Math.sin(ang) * r).applyQuaternion(q).add(va);
    pts.push([p.x, p.y, p.z]);
  }
  return tube(pts, wire, steps, 3);
}

/** Parafuso sextavado com o eixo em `axis`. */
export function bolt(r = 0.014, h = 0.012, axis: 'x' | 'y' | 'z' = 'y'): THREE.BufferGeometry {
  // tronco sextavado sem a base (16 triângulos)
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, -h / 2, Math.sin(a) * r), new THREE.Vector3(Math.cos(a) * r * 0.85, h / 2, Math.sin(a) * r * 0.85));
  }
  const pos: number[] = [];
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3): void => { pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); };
  for (let i = 0; i < 6; i++) {
    const b0 = pts[i * 2]!, t0 = pts[i * 2 + 1]!, b1 = pts[((i + 1) % 6) * 2]!, t1 = pts[((i + 1) % 6) * 2 + 1]!;
    tri(b0, t0, t1); tri(b0, t1, b1);
  }
  for (let i = 1; i < 5; i++) tri(pts[1]!, pts[(i + 1) * 2 + 1]!, pts[i * 2 + 1]!);
  const g: THREE.BufferGeometry = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  g.computeVertexNormals();
  if (axis === 'x') g.rotateZ(-Math.PI / 2);
  if (axis === 'z') g.rotateX(Math.PI / 2);
  return g;
}

/** Sólido de revolução com eixo em X. Perfil [raio, x]; a normal fica à direita do sentido do perfil. */
export function latheX(profile: P2[], seg = 24): THREE.BufferGeometry {
  const g = lathe(profile, seg);
  g.applyMatrix4(new THREE.Matrix4().makeRotationZ(-Math.PI / 2));
  return g;
}
/** Sólido de revolução com eixo em Z (perfil [raio, z]). */
export function latheZ(profile: P2[], seg = 24): THREE.BufferGeometry {
  const g = lathe(profile, seg);
  g.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
  return g;
}

/** Espelha um modelo em X (corrige o sentido dos triângulos). */
export function mirrorX(m: Model): Model {
  const out = m.clone();
  const mat = new THREE.Matrix4().makeScale(-1, 1, 1);
  for (const p of out.parts) { p.geo.applyMatrix4(mat); flipWinding(p.geo); }
  return out;
}
/** Adiciona `part` e o seu espelho em X. */
export function both(target: Model, part: Model): Model {
  target.addModel(part);
  target.addModel(mirrorX(part));
  return target;
}

/* ---------------------------------------------------------------- rodas */
export interface WheelSpec {
  r: number; w: number;
  /** raio do aro em relação ao raio da roda (padrão 0,62) */
  rim?: number;
  spokes: number;
  /** meia-largura tangencial do raio no cubo e no aro, e espessura axial (frações do raio do aro) */
  sw0?: number; sw1?: number; st?: number;
  /** inclinação tangencial dos raios (rad) */
  sweep?: number;
  /** raios duplos (afastamento angular em rad) */
  twin?: number;
  rimCol: ColorLike; spokeCol: ColorLike; hubCol: ColorLike; wellCol?: ColorLike; tireCol?: ColorLike; lugCol?: ColorLike;
  rimMat?: string; spokeMat?: string; hubMat?: string;
  /** travas da banda: quantidade (0 = liso com sulcos), altura e proporção */
  lugs?: number; lugH?: number; lugLen?: number; lugRows?: 1 | 2;
  grooves?: number;
  /** pneu balão (ombro bem redondo) */
  balloon?: boolean;
  /** parafusos no anel do aro */
  beadBolts?: number; beadCol?: ColorLike;
  /** dentes de engrenagem em volta do cubo */
  hubTeeth?: number;
  /** disco cheio (roda aerodinâmica) com `spokes` aletas em relevo */
  disc?: boolean; discCol?: ColorLike;
  /** setores coloridos pintados na parede lateral do pneu (ex.: boia) */
  wallSectors?: [ColorLike, ColorLike]; wallSectorCount?: number;
  /** faixa na parede lateral */
  wallBand?: ColorLike;
  hubR?: number;
  nuts?: number;
}

export const TIRE_MAT = 'kart_tire';

export function buildWheel(s: WheelSpec): Model {
  const m = new Model();
  const hw = s.w / 2, r = s.r, rr = r * (s.rim ?? 0.62);
  const tireCol = s.tireCol ?? '#3a3d44';
  const sh = s.balloon ? 0.5 : 0.24; // quanto o ombro "come" da largura
  const side = r - rr;
  /* pneu */
  const prof: P2[] = [
    [rr - 0.004, -hw * 0.76], [rr + side * 0.3, -hw],
    [r - side * (s.balloon ? 0.34 : 0.26), -hw * (s.balloon ? 0.97 : 0.99)],
    [r - side * 0.08, -hw * (1 - sh * 0.45)], [r - 0.004, -hw * (1 - sh)],
  ];
  const tread: P2[] = [];
  const gr = s.grooves ?? 0;
  if (gr > 0) {
    const span = hw * (1 - sh) * 2;
    for (let i = 1; i <= gr; i++) {
      const x = -span / 2 + (span * i) / (gr + 1), gw = Math.min(0.012, span / (gr * 5));
      tread.push([r, x - gw * 1.6], [r - 0.012, x - gw], [r - 0.012, x + gw], [r, x + gw * 1.6]);
    }
  } else tread.push([r, -hw * (1 - sh) * 0.5], [r + 0.002, 0], [r, hw * (1 - sh) * 0.5]);
  const full: P2[] = [...prof, ...tread, ...prof.map(([a, b]) => [a, -b] as P2).reverse()];
  const tire = latheX(full, 20);
  // uv: u repete o padrão da banda; v ao longo do perfil
  const uv = tire.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 14, uv.getY(i));
  const sectors = s.wallSectors, nsec = s.wallSectorCount ?? 8;
  m.add(tire, TIRE_MAT, (p) => {
    const rad = Math.hypot(p.y, p.z);
    const onWall = Math.abs(p.x) > hw * 0.8 && rad < r - side * 0.2 && rad > rr + side * 0.08;
    if (onWall && sectors && p.x > 0) {
      const a = (Math.atan2(p.z, p.y) + Math.PI) / (Math.PI * 2);
      return sectors[Math.floor(a * nsec) % 2]!;
    }
    if (onWall && s.wallBand && rad > rr + side * 0.3 && rad < r - side * 0.3) return s.wallBand;
    return tireCol;
  });
  if (sectors || s.wallBand) {
    // anel sólido na parede externa para a pintura ficar nítida
    const rA = rr + side * 0.2, rB = r - side * 0.32;
    const band = latheX([[rB + 0.004, hw * 0.97], [rB, hw * 1.0], [rA, hw * 0.985], [rA - 0.004, hw * 0.95]] as P2[], sectors ? nsec * 4 : 28);
    m.add(band, 'std', (p) => {
      if (!sectors) return s.wallBand!;
      const a = (Math.atan2(p.z, p.y) + Math.PI + 1e-4) / (Math.PI * 2);
      return sectors[Math.floor(a * nsec + 0.02) % 2]!;
    });
  }
  /* travas da banda */
  const lugs = s.lugs ?? 14;
  if (lugs > 0) {
    const lugH = s.lugH ?? 0.014, rows = s.lugRows ?? 2;
    const lugLen = ((Math.PI * 2 * r) / lugs) * (s.lugLen ?? 0.5);
    const lw = hw * (1 - sh) * (rows === 2 ? 1.0 : 1.7);
    for (let i = 0; i < lugs * rows; i++) {
      const sideSign = rows === 2 ? (i % 2 ? 1 : -1) : 0;
      const a = (Math.floor(i / rows) + (i % 2) * 0.5) / lugs * Math.PI * 2;
      const g = cbox(lw, lugH * 2, lugLen);
      g.rotateY(sideSign * 0.32);
      g.translate(sideSign * hw * (1 - sh) * 0.52, r - lugH * 0.55, 0);
      g.rotateX(a);
      m.add(g, 'rubber', s.lugCol ?? '#4a4e57');
    }
  }
  /* aro: lábio + poço + fundo (visto pelo lado +X) */
  const lip = hw * 0.8;
  const rimProf: P2[] = [
    [rr + 0.006, lip - 0.03], [rr + 0.012, lip], [rr + 0.004, lip + 0.012], [rr - 0.016, lip + 0.008],
    [rr - 0.03, lip - 0.02], [rr * 0.85, -hw * 0.28], [0.001, -hw * 0.28],
  ];
  const wellCol = s.wellCol ?? '#2b2f36';
  m.add(latheX(rimProf, 16), s.rimMat ?? 'kart_metal', (p) => (p.x < lip - 0.03 && Math.hypot(p.y, p.z) < rr * 0.87 ? wellCol : s.rimCol));
  // lado de dentro (voltado para o chassi): tampa simples
  m.add(latheX([[0.001, -hw * 0.72], [rr - 0.01, -hw * 0.72], [rr + 0.004, -hw * 0.6]], 14), 'matte', '#24272d');
  if (s.beadBolts) {
    for (let i = 0; i < s.beadBolts; i++) {
      const a = (i / s.beadBolts) * Math.PI * 2;
      const g = bolt(Math.max(0.008, rr * 0.05), 0.014, 'x');
      g.translate(lip + 0.012, rr - 0.012, 0);
      g.rotateX(a);
      m.add(g, 'kart_metal', s.beadCol ?? '#d7dbe2');
    }
  }
  /* raios */
  const hubR = rr * (s.hubR ?? 0.26);
  const sx = lip - 0.035; // posição axial da face dos raios
  const st = rr * (s.st ?? 0.2);
  if (s.disc) {
    m.add(latheX([[rr - 0.028, sx - 0.01], [rr * 0.6, sx + 0.02], [hubR, sx + 0.03], [0.001, sx + 0.03]], 28), s.spokeMat ?? 'paint', s.discCol ?? s.spokeCol);
  }
  const twin = s.twin ?? 0;
  for (let i = 0; i < s.spokes; i++) for (const tw of twin ? [-twin, twin] : [0]) {
    const a = (i / s.spokes) * Math.PI * 2 + tw;
    const w0 = rr * (s.sw0 ?? 0.11), w1 = rr * (s.sw1 ?? 0.07);
    const r0 = hubR * 0.6, r1 = rr - 0.022;
    const sweep = s.sweep ?? 0;
    const keys: Sec[] = [
      { z: r0, hw: st / 2, y0: -w0, y1: w0, r: Math.min(w0, st) * 0.4 },
      { z: (r0 + r1) / 2, hw: st * 0.42, y0: -(w0 + w1) / 2 + sweep * (r1 - r0) * 0.35, y1: (w0 + w1) / 2 + sweep * (r1 - r0) * 0.35, r: Math.min(w1, st) * 0.4, cx: s.disc ? 0.012 : -st * 0.12 },
      { z: r1, hw: st * 0.36, y0: -w1 + sweep * (r1 - r0), y1: w1 + sweep * (r1 - r0), r: Math.min(w1, st) * 0.4, cx: s.disc ? 0 : -st * 0.05 },
    ];
    const g = shell(keys, { sub: 1, n: 0, capStart: false, capEnd: false });
    g.translate(sx + (s.disc ? 0.02 : 0), 0, 0);
    g.rotateX(a);
    m.add(g, s.spokeMat ?? 'paint', s.spokeCol);
  }
  /* cubo */
  m.add(latheX([[hubR, sx - st * 0.6], [hubR, sx + st * 0.35], [hubR * 0.86, sx + st * 0.62], [hubR * 0.42, sx + st * 0.78], [0.001, sx + st * 0.8]], 12), s.hubMat ?? 'kart_metal', s.hubCol);
  const nuts = s.nuts ?? 5;
  for (let i = 0; i < nuts; i++) {
    const a = ((i + 0.5) / nuts) * Math.PI * 2;
    const g = bolt(hubR * 0.16, 0.016, 'x');
    g.translate(sx + st * 0.62 + 0.004, hubR * 0.62, 0);
    g.rotateX(a);
    m.add(g, 'kart_metal', '#e6e9ee');
  }
  if (s.hubTeeth) {
    for (let i = 0; i < s.hubTeeth; i++) {
      const a = (i / s.hubTeeth) * Math.PI * 2;
      const g = cbox(st * 0.7, hubR * 0.5, hubR * 0.42);
      g.translate(sx - st * 0.05, hubR * 1.18, 0);
      g.rotateX(a);
      m.add(g, s.hubMat ?? 'kart_metal', s.hubCol);
    }
    m.add(latheX([[hubR * 1.05, sx - st * 0.4], [hubR * 1.05, sx + st * 0.3], [hubR * 0.9, sx + st * 0.3]], 18), s.hubMat ?? 'kart_metal', s.hubCol);
  }
  // válvula (quebra a simetria e deixa a rotação evidente)
  m.add(rod([lip - 0.02, rr * 0.8, 0], [lip + 0.012, rr * 0.86, 0], 0.007, 0.005, 6), 'kart_metal', '#f2f2f2');
  return m;
}

/* -------------------------------------------------------------- volante */
export interface SteeringSpec {
  rimCol: ColorLike; spokeCol: ColorLike; hubCol: ColorLike;
  style?: 'three' | 'helm' | 'gear' | 'yoke' | 'four' | 'leaf';
  accent?: ColorLike;
}
/** Volante no plano XY local, aro de raio 0,15 m, centro na origem; coluna sai por +Z (para longe do piloto). */
export function buildSteering(s: SteeringSpec): Model {
  const m = new Model();
  const R = 0.15, style = s.style ?? 'three';
  if (style === 'yoke') {
    // manche: dois arcos laterais + barra inferior
    for (const sg of [1, -1]) {
      const g = torus(R, 0.019, 8, 14, Math.PI * 0.62);
      g.rotateZ(sg > 0 ? -Math.PI * 0.31 : Math.PI - Math.PI * 0.31);
      m.add(g, 'rubber', s.rimCol);
      m.add(sphere(0.022, 8, 6), 'rubber', s.rimCol, { p: [sg * R * Math.cos(Math.PI * 0.31), R * Math.sin(Math.PI * 0.31), 0] });
      m.add(sphere(0.022, 8, 6), 'rubber', s.rimCol, { p: [sg * R * Math.cos(Math.PI * 0.31), -R * Math.sin(Math.PI * 0.31), 0] });
    }
  } else {
    m.add(torus(R, style === 'helm' ? 0.016 : 0.019, 6, 22), style === 'helm' || style === 'leaf' ? 'kart_wood' : 'rubber', s.rimCol);
  }
  const spokeAngles = style === 'three' || style === 'leaf' ? [0, 130, 230] : style === 'four' ? [50, 130, 230, 310]
    : style === 'yoke' ? [90, 270, 180] : style === 'helm' ? [0, 60, 120, 180, 240, 300] : [0, 72, 144, 216, 288];
  for (const deg of spokeAngles) {
    const a = THREE.MathUtils.degToRad(deg - 90);
    const len = style === 'helm' ? R + 0.045 : R - 0.008;
    const g = style === 'helm' ? cyl(0.009, 0.012, len, 7) : cbox(0.03, len, 0.012, 0.005);
    g.translate(0, len / 2, style === 'helm' ? 0 : 0.012);
    g.rotateZ(a);
    m.add(g, style === 'helm' ? 'kart_wood' : 'kart_metal', s.spokeCol);
    if (style === 'helm') {
      const k = sphere(0.016, 8, 6);
      k.translate(0, len + 0.006, 0);
      k.rotateZ(a);
      m.add(k, 'kart_wood', s.accent ?? s.spokeCol);
    }
  }
  if (style === 'gear') {
    for (let i = 0; i < 12; i++) {
      const g = cbox(0.026, 0.024, 0.03);
      g.translate(0, R + 0.02, 0);
      g.rotateZ((i / 12) * Math.PI * 2);
      m.add(g, 'kart_metal', s.rimCol);
    }
  }
  // cubo e emblema
  m.add(latheZ([[0.001, -0.02], [0.03, -0.02], [0.042, -0.008], [0.042, 0.02], [0.03, 0.03]].map(([a, b]) => [a, -b] as P2).reverse() as P2[], 14), 'kart_metal', s.hubCol);
  m.add(cyl(0.034, 0.034, 0.008, 12).rotateX(Math.PI / 2), 'glossy', s.accent ?? s.rimCol, { p: [0, 0, -0.03] });
  // marca do topo (deixa o giro legível)
  m.add(cbox(0.02, 0.012, 0.042, 0.004), 'glossy', s.accent ?? '#ffffff', { p: [0, R, 0] });
  return m;
}

/** Coluna de direção (fica no `body`): do centro do volante para a frente/baixo, ao longo do eixo inclinado. */
export function steeringColumn(center: V3, len: number, color: ColorLike, tilt = 25): Model {
  const m = new Model();
  const t = THREE.MathUtils.degToRad(tilt);
  const dir: V3 = [0, -Math.sin(t), Math.cos(t)];
  const a: V3 = [center[0], center[1] + dir[1] * 0.02, center[2] + dir[2] * 0.02];
  const b: V3 = [center[0], center[1] + dir[1] * len, center[2] + dir[2] * len];
  m.add(rod(a, b, 0.02, 0.024, 10), 'kart_metal', color);
  m.add(rod(a, [a[0], a[1] + dir[1] * 0.06, a[2] + dir[2] * 0.06], 0.032, 0.03, 10), 'matte', '#26292f');
  return m;
}

/* --------------------------------------------------------------- assento */
export interface SeatSpec { seat: V3; col: ColorLike; trim: ColorLike; shellCol?: ColorLike; width?: number; backH?: number; mat?: string; lean?: number; headrest?: boolean }
/** Assento concha: o quadril do piloto apoia em `seat` (topo da almofada). */
export function buildSeat(s: SeatSpec): Model {
  const m = new Model();
  const [sx, sy, sz] = s.seat;
  const hw = (s.width ?? 0.5) / 2, backH = s.backH ?? 0.5, mat = s.mat ?? 'cloth';
  const shellCol = s.shellCol ?? s.trim;
  // base (concha por baixo) + almofada
  m.add(shell([
    { z: sz - 0.2, hw: hw + 0.04, y0: sy - 0.1, y1: sy + 0.02, r: 0.04 },
    { z: sz, hw: hw + 0.05, y0: sy - 0.11, y1: sy - 0.01, r: 0.04 },
    { z: sz + 0.24, hw: hw + 0.03, y0: sy - 0.09, y1: sy - 0.02, r: 0.03 },
    { z: sz + 0.3, hw: hw * 0.9, y0: sy - 0.07, y1: sy - 0.03, r: 0.02 },
  ], { sub: 1, n: 1 }), 'paint', shellCol);
  m.add(shell([
    { z: sz - 0.14, hw: hw - 0.02, y0: sy - 0.05, y1: sy, r: 0.03, crown: 0.0 },
    { z: sz + 0.05, hw: hw - 0.01, y0: sy - 0.05, y1: sy, r: 0.03 },
    { z: sz + 0.22, hw: hw - 0.03, y0: sy - 0.05, y1: sy + 0.012, r: 0.03, crown: 0.01 },
    { z: sz + 0.27, hw: hw - 0.06, y0: sy - 0.05, y1: sy - 0.01, r: 0.02 },
  ], { sub: 1, n: 1 }), mat, s.col);
  // abas laterais
  for (const sg of [1, -1]) {
    m.add(shell([
      { z: sz - 0.18, hw: 0.035, y0: sy - 0.06, y1: sy + 0.16, r: 0.03, cx: sg * (hw + 0.012) },
      { z: sz, hw: 0.035, y0: sy - 0.06, y1: sy + 0.1, r: 0.03, cx: sg * (hw + 0.02) },
      { z: sz + 0.2, hw: 0.03, y0: sy - 0.06, y1: sy + 0.035, r: 0.025, cx: sg * (hw + 0.012) },
      { z: sz + 0.26, hw: 0.02, y0: sy - 0.06, y1: sy - 0.01, r: 0.015, cx: sg * hw },
    ], { sub: 1, n: 1 }), 'paint', shellCol);
  }
  // encosto: loft de baixo para cima, inclinado para trás
  const lean = THREE.MathUtils.degToRad(s.lean ?? 12);
  const back = new Model();
  back.add(shellAlong([
    { z: -0.06, hw: hw + 0.03, y0: -0.07, y1: 0.0, r: 0.03 },
    { z: backH * 0.35, hw: hw + 0.05, y0: -0.08, y1: 0.0, r: 0.035 },
    { z: backH * 0.8, hw: hw + 0.01, y0: -0.07, y1: 0.0, r: 0.035 },
    { z: backH, hw: hw * 0.72, y0: -0.05, y1: -0.005, r: 0.02 },
  ], [1, 0, 0], [0, 0, 1], [0, 1, 0], { sub: 2, n: 1 }), 'paint', shellCol);
  back.add(shellAlong([
    { z: 0.0, hw: hw - 0.03, y0: -0.02, y1: 0.022, r: 0.02 },
    { z: backH * 0.4, hw: hw - 0.01, y0: -0.02, y1: 0.028, r: 0.02, crown: 0.008 },
    { z: backH * 0.8, hw: hw - 0.05, y0: -0.02, y1: 0.024, r: 0.02 },
    { z: backH * 0.95, hw: hw * 0.55, y0: -0.02, y1: 0.012, r: 0.012 },
  ], [1, 0, 0], [0, 0, 1], [0, 1, 0], { sub: 2, n: 2 }), mat, s.col);
  // costuras/faixas
  for (const x of [-hw * 0.45, hw * 0.45]) {
    back.add(cbox(0.014, backH * 0.6, 0.008, 0.003), mat, s.trim, { p: [x, backH * 0.45, 0.028] });
  }
  if (s.headrest) {
    back.add(cbox(hw * 1.1, 0.12, 0.07, 0.03), mat, s.col, { p: [0, backH + 0.05, -0.02] });
  }
  back.transform({ p: [sx, sy - 0.01, sz - 0.17], r: [-lean, 0, 0] });
  m.addModel(back);
  return m;
}

/* ----------------------------------------------------------- suspensão */
export interface SuspSpec {
  /** centro da roda */
  wheel: V3; wheelW: number;
  /** pontos de fixação no chassi: braço (dois pontos, mesma altura) e topo do amortecedor */
  inner: number; armY: number; armDz?: number; topY: number; topX?: number;
  armCol: ColorLike; springCol: ColorLike;
  upper?: boolean;
}
/** Braços triangulares + manga de eixo + mola/amortecedor para a roda em +X (use `both` para espelhar). */
export function buildSuspension(s: SuspSpec): Model {
  const m = new Model();
  const [wx, wy, wz] = s.wheel;
  const ux = wx - s.wheelW / 2 - 0.035; // manga de eixo, colada na face interna da roda
  const dz = s.armDz ?? 0.14;
  const low: V3 = [ux, Math.max(0.1, wy - 0.09), wz];
  m.add(rod([s.inner, s.armY, wz - dz], low, 0.016, 0.014, 5), 'kart_metal', s.armCol);
  m.add(rod([s.inner, s.armY, wz + dz], low, 0.016, 0.014, 5), 'kart_metal', s.armCol);
  if (s.upper ?? true) {
    const up: V3 = [ux, wy + 0.08, wz];
    m.add(rod([s.inner, s.armY + 0.13, wz - dz * 0.8], up, 0.013, 0.012, 5), 'kart_metal', s.armCol);
    m.add(rod([s.inner, s.armY + 0.13, wz + dz * 0.8], up, 0.013, 0.012, 5), 'kart_metal', s.armCol);
  }
  // manga + ponta de eixo + disco de freio
  m.add(cbox(0.05, 0.24, 0.07), 'kart_metal', '#3a3f48', { p: [ux, wy, wz] });
  m.add(rod([ux, wy, wz], [wx - s.wheelW * 0.3, wy, wz], 0.03, 0.03, 8), 'kart_metal', '#555b66');
  m.add(rod([ux + 0.03, wy, wz], [ux + 0.042, wy, wz], 0.12, 0.12, 12), 'kart_metal', '#8d939d');
  m.add(cbox(0.05, 0.08, 0.09), 'glossy', s.springCol, { p: [ux + 0.03, wy + 0.085, wz + 0.05] });
  // mola + amortecedor
  const a: V3 = [ux - 0.02, wy - 0.04, wz], b: V3 = [s.topX ?? s.inner, s.topY, wz];
  m.add(rod(a, b, 0.013, 0.013, 5), 'kart_metal', '#c9ced6');
  const lerp = (t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  m.add(spring(lerp(0.12), lerp(0.88), 0.032, 4, 0.009), 'glossy', s.springCol);
  m.add(rod(lerp(0.05), lerp(0.13), 0.036, 0.036, 6), 'kart_metal', '#3a3f48');
  return m;
}

/* -------------------------------------------------------- outras peças */
/** Escapamento ao longo de pontos; ponta alargada. Devolve a ponta (último ponto). */
export function exhaustPipe(m: Model, pts: V3[], r: number, col: ColorLike, tipCol: ColorLike = '#2a2c30', mat = 'kart_metal'): V3 {
  m.add(tube(pts, r, Math.max(6, pts.length * 3), 7), mat, col);
  const n = pts.length;
  const a = new THREE.Vector3(...pts[n - 2]!), b = new THREE.Vector3(...pts[n - 1]!);
  const d = b.clone().sub(a).normalize();
  const t0 = b.clone().addScaledVector(d, -0.05), t1 = b.clone().addScaledVector(d, 0.03);
  m.add(rod(t0.toArray() as V3, t1.toArray() as V3, r * 1.15, r * 1.4, 9), mat, col);
  m.add(rod(b.clone().addScaledVector(d, 0.024).toArray() as V3, b.clone().addScaledVector(d, 0.031).toArray() as V3, r * 1.2, r * 1.2, 9), 'matte', tipCol);
  return t1.toArray() as V3;
}

/** Farol redondo olhando para +Z, centro na origem. */
export function headlight(r: number, shellCol: ColorLike, ringCol: ColorLike = '#e8eaee', glow = 'glow_warm', glowCol: ColorLike = '#fff3c4'): Model {
  const m = new Model();
  m.add(latheZ([[0.001, -r * 1.3], [r * 0.5, -r * 1.2], [r * 0.95, -r * 0.5], [r, 0], [r * 1.08, 0.01]] as P2[], 14), 'paint', shellCol);
  m.add(torus(r * 1.02, r * 0.11, 5, 14), 'kart_metal', ringCol, { p: [0, 0, 0.012] });
  m.add(latheZ([[r * 0.98, -0.005], [r * 0.7, -r * 0.16], [0.001, -r * 0.22]].map(([a, b]) => [a, -b] as P2) as P2[], 14), glow, glowCol);
  return m;
}

/** Pedais + apoio, no piso em (0, y, z). */
export function pedals(y: number, z: number, col: ColorLike = '#c9ced6'): Model {
  const m = new Model();
  for (const [x, c] of [[0.11, col], [-0.11, col]] as [number, ColorLike][]) {
    m.add(rod([x, y, z + 0.04], [x, y + 0.11, z - 0.01], 0.008, 0.008, 6), 'kart_metal', '#555b66');
    m.add(cbox(0.07, 0.1, 0.014, 0.006), 'kart_metal', c, { p: [x, y + 0.13, z - 0.015], r: [-0.5, 0, 0] });
    for (const dy of [-0.025, 0, 0.025]) m.add(cbox(0.06, 0.008, 0.006), 'rubber', '#30333a', { p: [x, y + 0.13 + dy * 0.88, z - 0.024 - dy * 0.48], r: [-0.5, 0, 0] });
  }
  return m;
}

/** Placa redonda com número (disco texturizado olhando para +Z; gire/posicione com `x`). */
export function numberPlate(m: Model, mat: string, r: number, x: { p: V3; r?: V3 }, backCol: ColorLike = '#e8e2d2'): void {
  const disc = new THREE.CircleGeometry(r, 14);
  const uv = disc.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i)); // glTF: v cresce para baixo
  m.add(disc, mat, '#ffffff', x);
  const back = cyl(r * 1.08, r * 1.08, 0.014, 14);
  back.rotateX(Math.PI / 2);
  back.translate(0, 0, -0.009);
  m.add(back, 'kart_metal', backCol, x);
}

/** Fileira de parafusos entre dois pontos. */
export function boltRow(m: Model, a: V3, b: V3, n: number, r = 0.012, axis: 'x' | 'y' | 'z' = 'y', col: ColorLike = '#d9dce2', mat = 'kart_metal'): void {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    m.add(bolt(r, r * 0.9, axis), mat, col, { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t] });
  }
}

/** Tubo com pontos espelhados em X (barras, para-choques, gaiolas). */
export function bar(m: Model, pts: V3[], r: number, col: ColorLike, mat = 'kart_metal', mirror = false, radial = 6, perPt = 4): void {
  m.add(tube(pts, r, Math.max(4, pts.length * perPt), radial), mat, col);
  if (mirror) m.add(tube(pts.map(([x, y, z]) => [-x, y, z] as V3), r, Math.max(4, pts.length * perPt), radial), mat, col);
}

export const deg = (d: number): number => THREE.MathUtils.degToRad(d);

/** Índice angular (0..n-1) do quadrilátero `k` de um loft com `n` pontos por anel. */
export const ringJ = (k: number, n: number): number => k % n;
/** Verdadeiro para os dois quadriláteros centrais do topo de uma seção `rrPts` com `n` cantos (faixa central). */
export function topStripe(k: number, corner = 3, width = 1): boolean {
  const N = 4 * Math.max(0, corner) + 12;
  const j = k % N;
  return j >= N / 2 - width && j < N / 2 + width;
}

/** Engrenagem no plano XY (eixo Z), com furo central. */
export function gear(rOut: number, teeth: number, thick: number, hole = rOut * 0.3, depth = rOut * 0.2, bevel = 0): THREE.BufferGeometry {
  const pts: P2[] = [];
  const rIn = rOut - depth;
  for (let i = 0; i < teeth; i++) {
    const a = (i / teeth) * Math.PI * 2, st = (Math.PI * 2) / teeth;
    for (const [f, r] of [[0.0, rIn], [0.18, rOut], [0.5, rOut], [0.68, rIn]] as P2[]) pts.push([Math.cos(a + f * st) * r, Math.sin(a + f * st) * r]);
  }
  const h: P2[] = [];
  for (let i = 0; i < 10; i++) { const a = -(i / 10) * Math.PI * 2; h.push([Math.cos(a) * hole, Math.sin(a) * hole]); }
  return extrude(pts, thick - 2 * bevel, bevel, [h]);
}

/** Estepe simplificado (pneu + aro liso), eixo em X. */
export function spareWheel(r: number, w: number, rimCol: ColorLike, tireCol: ColorLike = '#3a3d44'): Model {
  const m = new Model();
  const hw = w / 2, rr = r * 0.58;
  const prof: P2[] = [[rr, -hw * 0.75], [rr + (r - rr) * 0.4, -hw], [r - 0.02, -hw * 0.8], [r, -hw * 0.4], [r, hw * 0.4], [r - 0.02, hw * 0.8], [rr + (r - rr) * 0.4, hw], [rr, hw * 0.75]];
  m.add(latheX(prof, 16), 'rubber', tireCol);
  m.add(latheX([[rr + 0.005, hw * 0.7], [rr * 0.8, hw * 0.5], [rr * 0.3, hw * 0.55], [0.001, hw * 0.6]], 12), 'kart_metal', rimCol);
  m.add(latheX([[0.001, -hw * 0.6], [rr * 0.8, -hw * 0.5], [rr + 0.005, -hw * 0.7]], 12), 'kart_metal', rimCol);
  for (let i = 0; i < 10; i++) {
    const g = cbox(w * 0.5, 0.03, (Math.PI * 2 * r) / 20);
    g.translate(i % 2 ? hw * 0.35 : -hw * 0.35, r, 0);
    g.rotateX((i / 10) * Math.PI * 2);
    m.add(g, 'rubber', '#4a4e57');
  }
  return m;
}

/** Folha (lâmina com nervura) no plano XZ: base na origem, ponta em +Z. Material `leaf` (dupla face). */
export function leafBlade(len: number, wid: number, curl = 0.2, seg = 6): THREE.BufferGeometry {
  const pos: number[] = [];
  const row = (t: number): THREE.Vector3[] => {
    const w = wid * Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.04)) ** 0.8 * 0.5;
    const y = curl * len * t * t, z = len * t;
    return [new THREE.Vector3(-w, y + w * 0.35, z), new THREE.Vector3(0, y, z), new THREE.Vector3(w, y + w * 0.35, z)];
  };
  for (let i = 0; i < seg; i++) {
    const a = row(i / seg), b = row((i + 1) / seg);
    for (const k of [0, 1]) {
      const q = [a[k]!, a[k + 1]!, b[k + 1]!, a[k]!, b[k + 1]!, b[k]!];
      // triângulos com a face para +Y
      for (const idx of [0, 2, 1, 3, 5, 4]) pos.push(q[idx]!.x, q[idx]!.y, q[idx]!.z);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  const merged = mergeVertices(g);
  merged.computeVertexNormals();
  return merged.toNonIndexed();
}
