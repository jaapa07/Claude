/**
 * Kit de modelagem da Copa Meteoro: reaproveita o kit da Aurora (put, tone, blob, tube, rod, beam…) e
 * acrescenta o UV triplanar dos materiais `met_*`/lava. Todo `build` termina com `finMet(m)`.
 */
import { THREE, fin, type Model } from './aurora-kit';

export * from './aurora-kit';

/** Tamanho (m) de uma repetição da textura por material (UV triplanar em escala de mundo). */
const TRI: Record<string, number> = {
  met_painel: 3, met_palha: 1.6, met_basalto: 3, met_templo: 3, met_chapa: 3, lava: 6, lava_fall: 5,
};

/** Finaliza o modelo: UV triplanar por triângulo nos materiais da Copa Meteoro e da Aurora. */
export function finMet(m: Model): Model {
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (const part of m.parts) {
    const size = TRI[part.mat];
    if (!size) continue;
    const g = part.geo;
    const pos = g.getAttribute('position');
    let uv = g.getAttribute('uv');
    if (!uv) { uv = new THREE.BufferAttribute(new Float32Array(pos.count * 2), 2); g.setAttribute('uv', uv); }
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
      n.copy(b).sub(a).cross(c.clone().sub(a));
      const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z);
      const D = ax >= ay && ax >= az ? 0 : ay >= az ? 1 : 2;
      const iu = D === 0 ? 2 : 0, iv = D === 1 ? 2 : 1;
      for (let k = 0; k < 3; k++) {
        const p = k === 0 ? a : k === 1 ? b : c;
        uv.setXY(i + k, p.getComponent(iu) / size, p.getComponent(iv) / size);
      }
    }
  }
  return fin(m);
}

/** Pontos de um arco circular no plano XY (para frondes, cipós e arcos). */
export function arcPts(r: number, a0: number, a1: number, n: number, cx = 0, cy = 0, z = 0): [number, number, number][] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / n;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r, z];
  });
}
