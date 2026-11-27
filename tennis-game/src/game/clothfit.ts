import * as THREE from 'three';

// The base athletes are bare, muscular bodies; the kit is painted on in the shader. Painted on as-is, every ab, pec
// and toe shows through the shirt, shorts and shoes. This builds a "clothed" copy of the bind pose: under the kit the
// surface is Taubin-smoothed (keeps volume, removes muscle relief and toes) and gets matching smooth normals. The
// outfit shader reads them as `aClothPos` / `aClothN`.

const done = new WeakSet<THREE.BufferGeometry>();

function clothWeight(x: number, y: number, z: number, scale: number): number {
  const ys = y / scale, ax = Math.abs(x);
  const ss = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  const band = (v: number, a: number, b: number, f: number) => ss(a - f, a + f, v) * (1 - ss(b - f, b + f, v));
  const torso = band(ys, 0.86, 1.47 - 0.03 * ss(0, 0.09, z), 0.04) * (1 - ss(0.24, 0.29, ax));
  const sleeve = band(ys, 1.3, 1.62, 0.03) * band(ax, 0.15, 0.34, 0.02);
  const shorts = band(ys, 0.6, 0.97, 0.04) * (1 - ss(0.29, 0.33, ax));
  const shoe = 1 - ss(0.1, 0.16, ys);
  return Math.max(torso * 0.95, sleeve * 0.8, shorts * 0.9, shoe);
}

export function fitClothing(geo: THREE.BufferGeometry, scale: number) {
  if (done.has(geo) || geo.getAttribute('aClothPos')) return;
  done.add(geo);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const n = pos.count;
  // weld duplicated vertices (UV seams) so smoothing does not tear the mesh
  const key = new Map<string, number>();
  const weld = new Int32Array(n);
  let m = 0;
  for (let i = 0; i < n; i++) {
    const k = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
    let w = key.get(k);
    if (w === undefined) { w = m++; key.set(k, w); }
    weld[i] = w;
  }
  const P = new Float32Array(m * 3);
  for (let i = 0; i < n; i++) { const w = weld[i] * 3; P[w] = pos.getX(i); P[w + 1] = pos.getY(i); P[w + 2] = pos.getZ(i); }
  const nb: Set<number>[] = Array.from({ length: m }, () => new Set<number>());
  const idx = geo.index;
  const tri = idx ? idx.count : n;
  for (let t = 0; t < tri; t += 3) {
    const a = weld[idx ? idx.getX(t) : t], b = weld[idx ? idx.getX(t + 1) : t + 1], c = weld[idx ? idx.getX(t + 2) : t + 2];
    nb[a].add(b); nb[a].add(c); nb[b].add(a); nb[b].add(c); nb[c].add(a); nb[c].add(b);
  }
  const W = new Float32Array(m);
  for (let v = 0; v < m; v++) W[v] = clothWeight(P[v * 3], P[v * 3 + 1], P[v * 3 + 2], scale);
  const adj = nb.map((s) => Int32Array.from(s));
  const cur = P.slice();
  const tmp = new Float32Array(m * 3);
  const step = (f: number) => {
    for (let v = 0; v < m; v++) {
      const a = adj[v], w = W[v];
      if (!a.length || w <= 0) { tmp[v * 3] = cur[v * 3]; tmp[v * 3 + 1] = cur[v * 3 + 1]; tmp[v * 3 + 2] = cur[v * 3 + 2]; continue; }
      let sx = 0, sy = 0, sz = 0;
      for (let j = 0; j < a.length; j++) { const u = a[j] * 3; sx += cur[u]; sy += cur[u + 1]; sz += cur[u + 2]; }
      const k = f * w, inv = 1 / a.length;
      tmp[v * 3] = cur[v * 3] + k * (sx * inv - cur[v * 3]);
      tmp[v * 3 + 1] = cur[v * 3 + 1] + k * (sy * inv - cur[v * 3 + 1]);
      tmp[v * 3 + 2] = cur[v * 3 + 2] + k * (sz * inv - cur[v * 3 + 2]);
    }
    cur.set(tmp);
  };
  for (let it = 0; it < 60; it++) { step(0.6); step(-0.605); }
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const w = weld[i] * 3; out[i * 3] = cur[w]; out[i * 3 + 1] = cur[w + 1]; out[i * 3 + 2] = cur[w + 2]; }
  // normals of the smoothed surface (computed on a temporary geometry with the same topology)
  const g2 = new THREE.BufferGeometry();
  g2.setAttribute('position', new THREE.BufferAttribute(out, 3));
  if (idx) g2.setIndex(idx);
  g2.computeVertexNormals();
  const nrm = g2.getAttribute('normal') as THREE.BufferAttribute;
  // average normals across welded seams, then blend with the original normals by the cloth weight
  const acc = new Float32Array(m * 3);
  for (let i = 0; i < n; i++) { const w = weld[i] * 3; acc[w] += nrm.getX(i); acc[w + 1] += nrm.getY(i); acc[w + 2] += nrm.getZ(i); }
  const on = geo.getAttribute('normal') as THREE.BufferAttribute;
  const outN = new Float32Array(n * 3);
  const v3 = new THREE.Vector3(), o3 = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    const w = weld[i];
    v3.set(acc[w * 3], acc[w * 3 + 1], acc[w * 3 + 2]).normalize();
    o3.set(on.getX(i), on.getY(i), on.getZ(i));
    o3.lerp(v3, Math.min(1, W[w] * 1.2)).normalize();
    outN[i * 3] = o3.x; outN[i * 3 + 1] = o3.y; outN[i * 3 + 2] = o3.z;
  }
  geo.setAttribute('aClothPos', new THREE.BufferAttribute(out, 3));
  geo.setAttribute('aClothN', new THREE.BufferAttribute(outN, 3));
}
