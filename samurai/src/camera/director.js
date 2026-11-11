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
