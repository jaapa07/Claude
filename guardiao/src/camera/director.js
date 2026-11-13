import { gsap } from 'gsap';

/** Direção de câmera sobre uma timeline GSAP pausada.
 *  Cada plano define início e fim explícitos (posição, alvo, lente), então o valor em t não depende do histórico:
 *  dá para saltar para qualquer frame e obter exatamente o mesmo enquadramento. */
export function shot(tl, cam, t0, t1, from, to = from, ease = 'sine.inOut') {
  const d = t1 - t0, o = { duration: d, ease, immediateRender: false };
  tl.fromTo(cam.p, { x: from.p[0], y: from.p[1], z: from.p[2] }, { x: to.p[0], y: to.p[1], z: to.p[2], ...o }, t0);
  tl.fromTo(cam.l, { x: from.l[0], y: from.l[1], z: from.l[2] }, { x: to.l[0], y: to.l[1], z: to.l[2], ...o }, t0);
  tl.fromTo(cam, { fov: from.fov ?? 40 }, { fov: to.fov ?? from.fov ?? 40, ...o }, t0);
}
export function newTimeline() { return gsap.timeline({ paused: true, defaults: { ease: 'none' } }); }
/** valor animado com início e fim explícitos (mesma garantia de determinismo dos planos). */
export function key(tl, obj, prop, t0, t1, a, b, ease = 'sine.inOut') { tl.fromTo(obj, { [prop]: a }, { [prop]: b, duration: t1 - t0, ease, immediateRender: false }, t0); }

/** Trajetória suave por pontos-chave no tempo: keys = [[t, x, y, z], ...] → fn(t, out).
 *  Interpolação Catmull-Rom entre os pontos, com o tempo de cada trecho suavizado. Função pura de t. */
export function pathFn(keys, ease = true) {
  const n = keys.length, P = (i) => keys[Math.min(n - 1, Math.max(0, i))];
  return (t, out) => {
    let i = 0; while (i < n - 2 && t > keys[i + 1][0]) i++;
    let u = Math.min(1, Math.max(0, (t - keys[i][0]) / (keys[i + 1][0] - keys[i][0]))); if (ease) u = u * u * (3 - 2 * u) * 0.5 + u * 0.5;
    const a = P(i - 1), b = P(i), c = P(i + 1), d = P(i + 2), u2 = u * u, u3 = u2 * u;
    const f = (k) => 0.5 * ((2 * b[k]) + (-a[k] + c[k]) * u + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * u2 + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * u3);
    return out.set(f(1), f(2), f(3));
  };
}

/** Posiciona a timeline em t forçando a reaplicação do plano ativo. Outras sequências escrevem na mesma câmera;
 *  sem isso o GSAP pularia a escrita quando o tempo pedido coincide com o último que ele renderizou. */
export function seek(tl, t) { tl.time(t > 0.02 ? t - 0.02 : t + 0.02, true); tl.time(t, true); }
