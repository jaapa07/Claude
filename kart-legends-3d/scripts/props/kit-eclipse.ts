/**
 * Ferramentas compartilhadas pelas bibliotecas de cenário da Copa Eclipse
 * (neon, boreal, celeste, fortaleza, obstaculos). Só geometria: nada aqui grava arquivos.
 */
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { THREE, flat, ico, mix, warp, type ColorFn, type ColorLike, type V3 } from '../lib/geo';

export type Rand = () => number;
export type P2 = [number, number];

export const rr = (rand: Rand, a: number, b: number): number => a + (b - a) * rand();
export const ri = (rand: Rand, a: number, b: number): number => Math.min(b, Math.floor(rr(rand, a, b + 1)));
export const pick = <T>(rand: Rand, list: readonly T[]): T => list[Math.min(list.length - 1, Math.floor(rand() * list.length))]!;
export const TAU = Math.PI * 2;

/** Varia matiz/saturação/luminosidade de uma cor de forma sutil. */
export function vary(c: ColorLike, rand: Rand, amount = 0.05): THREE.Color {
  const out = new THREE.Color(c as THREE.ColorRepresentation);
  out.offsetHSL((rand() - 0.5) * amount * 0.6, (rand() - 0.5) * amount, (rand() - 0.5) * amount);
  return out;
}

/** Polígono regular no plano XZ. */
export function ngon(r: number, n: number, rot = 0, sx = 1, sz = 1): P2[] {
  const out: P2[] = [];
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU;
    out.push([Math.cos(a) * r * sx, Math.sin(a) * r * sz]);
  }
  return out;
}

/** Retângulo com cantos chanfrados no plano XZ (centrado). */
export function rectPts(w: number, d: number, ch = 0): P2[] {
  const x = w / 2, z = d / 2;
  if (ch <= 0) return [[-x, -z], [x, -z], [x, z], [-x, z]];
  return [[-x + ch, -z], [x - ch, -z], [x, -z + ch], [x, z - ch], [x - ch, z], [-x + ch, z], [-x, z - ch], [-x, -z + ch]];
}

export interface PrismOpts {
  /** Escala do contorno no topo (afunilamento). */
  top?: number;
  /** Deslocamento do topo em XZ. */
  shift?: P2;
  /** Tampas: padrão só a de cima. */
  cap?: 'top' | 'both' | 'none' | 'bottom';
  /** Metros por unidade de UV (u ao longo do perímetro, v ao longo da altura). */
  uv?: number;
  uvV?: number;
  /** Centro de deslocamento do contorno. */
  at?: P2;
}

/**
 * Prisma facetado a partir de um contorno XZ (estrelado em relação ao centroide):
 * paredes com UV em metros (texturas ladrilhadas) e tampas em leque.
 */
export function prism(pts: P2[], y0: number, y1: number, o: PrismOpts = {}): THREE.BufferGeometry {
  const top = o.top ?? 1, uvU = o.uv ?? 1, uvV = o.uvV ?? uvU, cap = o.cap ?? 'top';
  const [ax, az] = o.at ?? [0, 0];
  const [sx, sz] = o.shift ?? [0, 0];
  const n = pts.length;
  let cx = 0, cz = 0;
  for (const [x, z] of pts) { cx += x / n; cz += z / n; }
  const lo = pts.map(([x, z]) => new THREE.Vector3(x + ax, y0, z + az));
  const hi = pts.map(([x, z]) => new THREE.Vector3(cx + (x - cx) * top + ax + sx, y1, cz + (z - cz) * top + az + sz));
  const cLo = new THREE.Vector3(cx + ax, y0, cz + az), cHi = new THREE.Vector3(cx + ax + sx, y1, cz + az + sz);
  const pos: number[] = [], uv: number[] = [];
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, ua: P2, ub: P2, uc: P2, out: THREE.Vector3): void => {
    const nrm = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
    if (nrm.dot(out) < 0) { pos.push(a.x, a.y, a.z, c.x, c.y, c.z, b.x, b.y, b.z); uv.push(...ua, ...uc, ...ub); } else { pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z); uv.push(...ua, ...ub, ...uc); }
  };
  let run = 0;
  const mid = new THREE.Vector3((cLo.x + cHi.x) / 2, 0, (cLo.z + cHi.z) / 2);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const len = Math.hypot(pts[j]![0] - pts[i]![0], pts[j]![1] - pts[i]![1]);
    const u0 = run / uvU, u1 = (run + len) / uvU, v0 = -y0 / uvV, v1 = -y1 / uvV;
    const out = new THREE.Vector3((lo[i]!.x + lo[j]!.x) / 2 - mid.x, 0, (lo[i]!.z + lo[j]!.z) / 2 - mid.z);
    tri(lo[i]!, lo[j]!, hi[j]!, [u0, v0], [u1, v0], [u1, v1], out);
    tri(lo[i]!, hi[j]!, hi[i]!, [u0, v0], [u1, v1], [u0, v1], out);
    run += len;
  }
  const up = new THREE.Vector3(0, 1, 0), down = new THREE.Vector3(0, -1, 0);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if ((cap === 'top' || cap === 'both') && top > 0.001) tri(cHi, hi[i]!, hi[j]!, [cHi.x / uvU, cHi.z / uvU], [hi[i]!.x / uvU, hi[i]!.z / uvU], [hi[j]!.x / uvU, hi[j]!.z / uvU], up);
    if (cap === 'bottom' || cap === 'both') tri(cLo, lo[i]!, lo[j]!, [cLo.x / uvU, cLo.z / uvU], [lo[i]!.x / uvU, lo[i]!.z / uvU], [lo[j]!.x / uvU, lo[j]!.z / uvU], down);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  g.computeVertexNormals();
  return g;
}

/** Multiplica as UVs (para ladrilhar texturas em primitivas com UV 0..1). */
export function uvScale(geo: THREE.BufferGeometry, su: number, sv = su): THREE.BufferGeometry {
  const g = geo.clone();
  const uv = g.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  return g;
}

/** Projeção de UV em caixa (pela normal dominante), em metros/escala. Aplicar depois das transformações locais. */
export function uvBox(geo: THREE.BufferGeometry, scale = 1): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo.clone();
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  const pos = g.getAttribute('position'), nor = g.getAttribute('normal');
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const nx = Math.abs(nor.getX(i)), ny = Math.abs(nor.getY(i)), nz = Math.abs(nor.getZ(i));
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    if (ny >= nx && ny >= nz) { uv[i * 2] = x / scale; uv[i * 2 + 1] = z / scale; } else if (nx >= nz) { uv[i * 2] = z / scale; uv[i * 2 + 1] = -y / scale; } else { uv[i * 2] = x / scale; uv[i * 2 + 1] = -y / scale; }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

/** Painel plano voltado para +Z; `rect` = [u0, v0, u1, v1] em coordenadas de imagem (v0 = topo). */
export function panel(w: number, h: number, rect: [number, number, number, number] = [0, 0, 1, 1]): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.getAttribute('uv');
  const [u0, v0, u1, v1] = rect;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), v1 + uv.getY(i) * (v0 - v1));
  return g;
}

export interface BlobOpts { detail?: number; jitter?: number; s?: V3; faceted?: boolean; freq?: number; fn?: (p: THREE.Vector3) => void }

/** Volume orgânico (rocha, copa, nuvem, neve): icosaedro deformado por ondas coerentes. */
export function blob(r: number, rand: Rand, o: BlobOpts = {}): THREE.BufferGeometry {
  const jitter = o.jitter ?? 0.18, freq = o.freq ?? 1.6;
  const waves = Array.from({ length: 4 }, (_, k) => ({
    d: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize().multiplyScalar(freq * (1 + k * 0.7)),
    ph: rand() * TAU, a: 1 / (1 + k * 0.8),
  }));
  const s = o.s ?? [1, 1, 1];
  const g = warp(ico(1, o.detail ?? 2), (p) => {
    let k = 0;
    for (const w of waves) k += Math.sin(p.dot(w.d) + w.ph) * w.a;
    p.multiplyScalar(r * (1 + jitter * k * 0.6));
    p.set(p.x * s[0], p.y * s[1], p.z * s[2]);
    o.fn?.(p);
  });
  return o.faceted === false ? g : flat(g);
}

/** Degradê vertical com um leve escurecimento de "oclusão" nas faces voltadas para baixo. */
export function shade(a: ColorLike, b: ColorLike, y0: number, y1: number, under = 0.25): ColorFn {
  return (p, n) => {
    const c = mix(a, b, (p.y - y0) / (y1 - y0 || 1));
    return n.y < -0.2 ? c.multiplyScalar(1 - under * Math.min(1, -n.y)) : c;
  };
}

/** Cor por normal: `top` nas faces voltadas para cima (neve, musgo, grama), `side` no resto. */
export function capped(top: ColorLike, side: ColorLike | ColorFn, limit = 0.45): ColorFn {
  return (p, n) => (n.y > limit ? top : typeof side === 'function' ? side(p, n) : side);
}

/**
 * Contorno de um pórtico em arco (plano XY, para `extrude`): vão de largura `span` totalmente livre até `spring`
 * (nascença do arco) e arco de flecha `rise` acima disso; `side` = largura dos pés, `over` = massa acima do fecho.
 */
export function archOutline(span: number, spring: number, rise: number, side: number, over: number, seg = 14): P2[] {
  const half = span / 2, topY = spring + rise + over;
  const pts: P2[] = [[-half - side, 0], [-half - side, topY], [half + side, topY], [half + side, 0], [half, 0], [half, spring]];
  for (let i = 1; i < seg; i++) {
    const a = (i / seg) * Math.PI;
    pts.push([Math.cos(a) * half, spring + Math.sin(a) * rise]);
  }
  pts.push([-half, spring], [-half, 0]);
  return pts;
}

export interface LoftOpts { cap?: 'top' | 'both' | 'none' | 'bottom'; uv?: number; uvV?: number; smooth?: boolean }

/**
 * Casca entre anéis (contornos XZ com o mesmo número de pontos em alturas diferentes): torres, ilhas, picos, troncos.
 * `cap` fecha o primeiro anel ('bottom') e/ou o último ('top'). UV em metros/escala.
 */
export function loft(levels: { y: number; pts: P2[] }[], o: LoftOpts = {}): THREE.BufferGeometry {
  const uvU = o.uv ?? 1, uvV = o.uvV ?? uvU, cap = o.cap ?? 'none';
  const n = levels[0]!.pts.length;
  const pos: number[] = [], uv: number[] = [];
  let area = 0;
  const base = levels.find((l) => l.pts.some(([x, z]) => Math.hypot(x, z) > 1e-4))!.pts;
  for (let i = 0; i < n; i++) { const a = base[i]!, b = base[(i + 1) % n]!; area += a[0] * b[1] - b[0] * a[1]; }
  const rising = levels[levels.length - 1]!.y >= levels[0]!.y;
  const flip = (area > 0) === rising;
  const put = (a: number[], b: number[], c: number[], ua: P2, ub: P2, uc: P2, f: boolean): void => {
    if (f) { pos.push(...a, ...c, ...b); uv.push(...ua, ...uc, ...ub); } else { pos.push(...a, ...b, ...c); uv.push(...ua, ...ub, ...uc); }
  };
  let per = 0;
  for (let i = 0; i < n; i++) per += Math.hypot(base[(i + 1) % n]![0] - base[i]![0], base[(i + 1) % n]![1] - base[i]![1]);
  let vRun = 0;
  for (let l = 0; l < levels.length - 1; l++) {
    const A = levels[l]!, B = levels[l + 1]!;
    let slant = 0;
    for (let i = 0; i < n; i++) slant += Math.hypot(B.pts[i]![0] - A.pts[i]![0], B.y - A.y, B.pts[i]![1] - A.pts[i]![1]) / n;
    const v0 = -vRun / uvV, v1 = -(vRun + slant) / uvV;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const u0 = ((i / n) * per) / uvU, u1 = (((i + 1) / n) * per) / uvU;
      const a = [A.pts[i]![0], A.y, A.pts[i]![1]], b = [A.pts[j]![0], A.y, A.pts[j]![1]];
      const c = [B.pts[j]![0], B.y, B.pts[j]![1]], d = [B.pts[i]![0], B.y, B.pts[i]![1]];
      put(a, b, c, [u0, v0], [u1, v0], [u1, v1], flip);
      put(a, c, d, [u0, v0], [u1, v1], [u0, v1], flip);
    }
    vRun += slant;
  }
  const fan = (L: { y: number; pts: P2[] }, f: boolean): void => {
    let cx = 0, cz = 0;
    for (const [x, z] of L.pts) { cx += x / n; cz += z / n; }
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      put([cx, L.y, cz], [L.pts[i]![0], L.y, L.pts[i]![1]], [L.pts[j]![0], L.y, L.pts[j]![1]], [cx / uvU, cz / uvU], [L.pts[i]![0] / uvU, L.pts[i]![1] / uvU], [L.pts[j]![0] / uvU, L.pts[j]![1] / uvU], f);
    }
  };
  if (cap === 'top' || cap === 'both') fan(levels[levels.length - 1]!, (area > 0) === rising);
  if (cap === 'bottom' || cap === 'both') fan(levels[0]!, (area > 0) !== rising);
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2));
  if (o.smooth) { g = mergeVertices(g, 1e-4); g.computeVertexNormals(); g = g.toNonIndexed(); } else g.computeVertexNormals();
  return g;
}

/** Anel irregular: raio modulado por ondas (para ilhas, rochas e troncos orgânicos). */
export function wobbleRing(r: number, n: number, rand: Rand, amount = 0.15, lobes = 3): (scale: number, twist?: number) => P2[] {
  const ws = Array.from({ length: 3 }, (_, k) => ({ f: lobes + k * 2 - 1 + Math.floor(rand() * 2), ph: rand() * TAU, a: amount / (1 + k) }));
  return (scale, twist = 0) => {
    const out: P2[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      let k = 1;
      for (const w of ws) k += Math.sin(a * w.f + w.ph + twist) * w.a;
      out.push([Math.cos(a) * r * k * scale, Math.sin(a) * r * k * scale]);
    }
    return out;
  };
}

/** Sólido de revolução com UV em metros (ao contrário de `lathe`, a textura não estica entre pontos distantes do perfil). */
export function revolve(profile: [number, number][], seg = 16, o: LoftOpts = {}): THREE.BufferGeometry {
  return loft(profile.map(([r, y]) => ({ y, pts: ngon(Math.max(r, 0.001), seg) })), { smooth: true, ...o });
}

/** Rotação Y que vira o +Z local para fora no ângulo `a` (posição = cos a, sen a). */
export const fora = (a: number): number => Math.PI / 2 - a;
export const polar = (a: number, r: number, y: number): V3 => [Math.cos(a) * r, y, Math.sin(a) * r];

/** Ângulos de Euler (XYZ) que levam o eixo +Y local à direção `d` (para espetar peças numa superfície). */
export function alignY(d: V3): V3 {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...d).normalize());
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
  return [e.x, e.y, e.z];
}
