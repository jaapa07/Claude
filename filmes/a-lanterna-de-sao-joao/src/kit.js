// Shared kit: paper tint, cut, window lights, jointed silhouettes (nurse, boy on a bike, bus, driver, Dona Zélia)
import * as THREE from 'three';
import { sheet, text } from './paper.js';
import { TAU, clamp, lerp } from './lib.js';

export const PAPER = '#9a9a9a', BASE = new THREE.Color(PAPER).r;
export const tint = (m, hex, k = 1) => { m.material.color.set(hex).multiplyScalar(k / BASE); return m; };
export const cut = (x, fn) => { x.save(); x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000'; x.strokeStyle = '#000'; fn(); x.restore(); };

// A window light: an unlit plane behind a cut hole. k = 0 (dark room) … 1 (lit). Never casts or receives shadows.
const WOFF = new THREE.Color('#0a1028');
export function winLight(S, x, y, z, w, h, col = '#ffb45a', gain = 2.4, off = WOFF) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: off.clone() }));
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = false;
  const on = new THREE.Color(col).multiplyScalar(gain), off2 = off.clone();
  m.userData.set = (k, fl = 1) => { m.material.color.copy(off2).lerp(on, clamp(k)).multiplyScalar(k > 0 ? lerp(1, fl, clamp(k)) : 1); };
  m.userData.set(0); S.scene.add(m); return m;
}
// soft additive glow disc (for lamps, flashlights, the oven mouth)
export function glow(S, r, col = '#ffd590') {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.ShaderMaterial({ uniforms: { col: { value: new THREE.Color(col) }, k: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
    fragmentShader: 'varying vec2 vUv; uniform vec3 col; uniform float k; void main(){ float r = length(vUv - .5) * 2.; gl_FragColor = vec4(col * k * (pow(max(0., 1. - r), 3.) * .8 + pow(max(0., 1. - r * 3.5), 2.) * .9), 1.); }' }));
  m.renderOrder = 12; m.userData.set = k => { m.material.uniforms.k.value = k; }; S.scene.add(m); return m;
}

// —— jointed silhouettes: every part is its own sheet anchored at its joint; animate rotation only ——
const part = (U, o) => sheet({ U, trans: .05, ppm: 14000, finish: { rimPx: 2, underPx: 2 }, ...o });
const leg = (x, len, w, shoe = true) => { x.beginPath(); x.roundRect(-w / 2, -len, w, len + w * .5, w * .45); x.fill(); if (shoe) { x.beginPath(); x.ellipse(w * .45, -len + w * .25, w * .95, w * .5, 0, 0, TAU); x.fill(); } };
const arm = (x, len, w) => { x.beginPath(); x.roundRect(-w / 2, -len, w, len + w * .4, w * .5); x.fill(); x.beginPath(); x.arc(0, -len, w * .7, 0, TAU); x.fill(); };

// person: kind 'nurse' | 'boy' | 'driver' | 'helper'. Local origin at the feet (y = 0); hip at HIP.
export function person(S, kind, z, col = '#101830') {
  const { U } = S, g = new THREE.Group(), H = .034, HIP = H * .47, SH = H * .79;
  const body = part(U, { w: .03, h: .05, ay: -.022, z: 0, draw: x => {
    x.fillStyle = PAPER; x.translate(0, -.022);
    const hr = H * .085, hy = H * .9;
    x.beginPath(); x.arc(0, hy, hr, 0, TAU); x.fill();                                        // head
    x.fillRect(-hr * .35, hy - hr * 1.6, hr * .7, hr * .8);                                    // neck
    if (kind === 'nurse') {
      x.beginPath(); x.arc(-hr * .7, hy + hr * .5, hr * .55, 0, TAU); x.fill();               // bun
      x.beginPath(); x.moveTo(-hr * 1.1, hy + hr * .55); x.lineTo(hr * 1.1, hy + hr * .55); x.lineTo(hr * .8, hy + hr * 1.5); x.lineTo(-hr * .8, hy + hr * 1.5); x.closePath(); x.fill();   // cap
      x.beginPath(); x.moveTo(-H * .11, SH); x.lineTo(H * .11, SH); x.lineTo(H * .15, H * .3); x.lineTo(-H * .15, H * .3); x.closePath(); x.fill();   // dress
      x.beginPath(); x.roundRect(-H * .2, H * .42, H * .11, H * .14, H * .02); x.fill();      // bag
      x.lineWidth = H * .015; x.strokeStyle = PAPER; x.beginPath(); x.moveTo(-H * .15, H * .55); x.lineTo(H * .05, SH); x.stroke();
      cut(x, () => { x.fillRect(-hr * .15, hy + hr * .85, hr * .3, hr * .5); x.fillRect(-hr * .32, hy + hr * 1.02, hr * .64, hr * .16); });   // the cross on the cap
    } else if (kind === 'boy') {
      x.beginPath(); x.arc(0, hy + hr * .2, hr * 1.05, Math.PI, 0); x.fill(); x.fillRect(0, hy + hr * .1, hr * 1.7, hr * .3);   // cap
      x.beginPath(); x.moveTo(-H * .1, SH); x.lineTo(H * .1, SH); x.lineTo(H * .11, HIP); x.lineTo(-H * .11, HIP); x.closePath(); x.fill();
      x.beginPath(); x.roundRect(-H * .19, H * .47, H * .14, H * .17, H * .02); x.fill();     // newspaper bag
      x.lineWidth = H * .015; x.strokeStyle = PAPER; x.beginPath(); x.moveTo(-H * .12, H * .62); x.lineTo(H * .07, SH); x.stroke();
      cut(x, () => { x.lineWidth = H * .008; for (const yy of [.53, .57]) { x.beginPath(); x.moveTo(-H * .17, H * yy); x.lineTo(-H * .07, H * yy); x.stroke(); } });
    } else if (kind === 'driver' || kind === 'carteiro') {
      if (kind === 'carteiro') { x.beginPath(); x.roundRect(-H * .22, H * .36, H * .16, H * .2, H * .02); x.fill(); x.lineWidth = H * .018; x.strokeStyle = PAPER; x.beginPath(); x.moveTo(-H * .14, H * .56); x.lineTo(H * .08, SH); x.stroke(); }
      x.fillRect(-hr * 1.1, hy + hr * .45, hr * 2.2, hr * .6); x.fillRect(-hr * .2, hy + hr * .35, hr * 1.9, hr * .25);   // flat cap
      x.beginPath(); x.moveTo(-H * .12, SH); x.lineTo(H * .12, SH); x.lineTo(H * .14, HIP); x.lineTo(-H * .13, HIP); x.closePath(); x.fill();
    } else {
      x.beginPath(); x.arc(0, hy + hr * .3, hr * 1.1, Math.PI * .9, TAU * 1.02); x.fill();       // hair
      x.beginPath(); x.moveTo(-H * .1, SH); x.lineTo(H * .1, SH); x.lineTo(H * .16, H * .28); x.lineTo(-H * .16, H * .28); x.closePath(); x.fill();   // apron dress
    }
  } });
  const legW = H * .075, legL = HIP;
  const mkLeg = () => part(U, { w: .012, h: .028, ax: 0, ay: .0045, draw: x => { x.fillStyle = PAPER; x.translate(0, .0045); leg(x, legL, legW); } });
  const mkArm = () => part(U, { w: .01, h: .02, ax: 0, ay: .006, draw: x => { x.fillStyle = PAPER; x.translate(0, .006); arm(x, H * .33, H * .06); } });
  const lb = mkLeg(), lf = mkLeg(), ab = mkArm(), af = mkArm();
  // cut sheets are centred: move the body so its local y=0 is the feet
  body.position.set(0, 0, 0);
  lb.position.set(0, HIP, -.0006); lf.position.set(0, HIP, .0006); ab.position.set(0, SH, -.0008); af.position.set(0, SH, .0008);
  for (const m of [lb, lf, ab, af]) tint(m, col, kind === 'boy' ? 1 : 1); tint(body, col);
  ab.material.color.multiplyScalar(.75); lb.material.color.multiplyScalar(.75);
  g.add(lb, ab, body, lf, af); g.position.z = z; S.scene.add(g);
  const P = { g, body, lb, lf, ab, af, H, HIP, SH, k: 1,
    // phase: walking cycle in radians; amp: 0 standing … 1 walking; dir: +1 facing right, −1 left
    pose(px, py, o = {}) {
      const dir = o.dir ?? 1, ph = o.ph ?? 0, amp = o.amp ?? 0;
      const k = o.k ?? P.k; g.position.x = px; g.position.y = py + amp * Math.abs(Math.sin(ph)) * H * .03 * k; g.scale.set(dir * k, k, 1);
      lb.rotation.z = amp * .42 * Math.sin(ph); lf.rotation.z = -amp * .42 * Math.sin(ph);
      ab.rotation.z = -amp * .35 * Math.sin(ph) + (o.armB ?? 0); af.rotation.z = amp * .35 * Math.sin(ph) + (o.armF ?? 0);
      if (o.legB !== undefined) lb.rotation.z = o.legB; if (o.legF !== undefined) lf.rotation.z = o.legF;
      body.rotation.z = o.lean ?? 0; g.visible = o.vis ?? true;
    } };
  return P;
}

// bicycle: frame + two wheels that turn by distance ÷ radius
export function bike(S, z, col = '#101830') {
  const { U } = S, g = new THREE.Group(), R = .0072;
  const wheel = () => part(U, { w: R * 2.2, h: R * 2.2, draw: x => { x.fillStyle = PAPER; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill();
    cut(x, () => { x.beginPath(); x.arc(0, 0, R * .82, 0, TAU); x.fill(); }); x.lineWidth = R * .06; x.strokeStyle = PAPER;
    for (let k = 0; k < 8; k++) { const a = k * TAU / 16; x.beginPath(); x.moveTo(Math.cos(a) * R * .85, Math.sin(a) * R * .85); x.lineTo(-Math.cos(a) * R * .85, -Math.sin(a) * R * .85); x.stroke(); }
    x.beginPath(); x.arc(0, 0, R * .14, 0, TAU); x.fill(); } });
  const frame = part(U, { w: .04, h: .03, draw: x => { x.strokeStyle = PAPER; x.fillStyle = PAPER; x.lineWidth = .0011; x.lineCap = 'round';
    const B = [-.0115, 0], F = [.0115, 0], C = [-.001, 0], Se = [-.0045, .0105], Hd = [.0085, .0125];
    x.beginPath(); x.moveTo(...B); x.lineTo(...C); x.lineTo(...Se); x.lineTo(...B); x.moveTo(...C); x.lineTo(...Hd); x.lineTo(...F); x.moveTo(...Se); x.lineTo(Hd[0] - .001, Hd[1] - .001); x.stroke();
    x.beginPath(); x.ellipse(Se[0] - .0005, Se[1] + .0012, .0028, .0008, 0, 0, TAU); x.fill(); x.beginPath(); x.moveTo(Hd[0] - .002, Hd[1] + .002); x.lineTo(Hd[0] + .0008, Hd[1] + .0018); x.stroke();
    x.beginPath(); x.roundRect(.0105, .009, .006, .0035, .0005); x.fill(); } });   // a basket of newspapers
  const wb = wheel(), wf = wheel(); wb.position.set(-.0115, R, 0); wf.position.set(.0115, R, 0); frame.position.set(0, R, .0004);
  for (const m of [wb, wf, frame]) tint(m, col); g.add(wb, wf, frame); g.position.z = z; S.scene.add(g);
  return { g, R, set(px, py, dir, dist) { g.position.set(px, py, z); g.scale.x = dir; wb.rotation.z = wf.rotation.z = -dist / R; } };
}

// bus: body with cut windows (lit inside by one plane behind) and two wheels; headlight disc
export function bus(S, z, col = '#0e1530') {
  const { U } = S, g = new THREE.Group(), L = .1, Hb = .036, R = .0065;
  const body = part(U, { w: L * 1.06, h: Hb * 1.2, ppm: 9000, draw: x => { x.fillStyle = PAPER;
    x.beginPath(); x.roundRect(-L / 2, -Hb * .42, L, Hb, Hb * .12); x.fill();
    cut(x, () => { for (let k = 0; k < 6; k++) x.fillRect(-L / 2 + L * (.06 + k * .135), Hb * .08, L * .1, Hb * .3); x.fillRect(L * .36, Hb * .08, L * .1, Hb * .3);
      x.beginPath(); x.arc(-L * .3, -Hb * .42, R * 1.25, 0, Math.PI); x.fill(); x.beginPath(); x.arc(L * .3, -Hb * .42, R * 1.25, 0, Math.PI); x.fill(); });
    x.fillRect(-L / 2, -Hb * .08, L, Hb * .025);
    text(x, '1', L * .41, Hb * .47, Hb * .2, '"Cormorant"', { fill: PAPER }); } });
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(L * .96, Hb * .34), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd79a').multiplyScalar(1.8) }));
  inside.position.set(0, Hb * .23, -.0015);
  const wheel = () => part(U, { w: R * 2.2, h: R * 2.2, draw: x => { x.fillStyle = PAPER; x.beginPath(); x.arc(0, 0, R, 0, TAU); x.fill(); cut(x, () => { for (let k = 0; k < 5; k++) { const a = k * TAU / 5; x.beginPath(); x.arc(Math.cos(a) * R * .5, Math.sin(a) * R * .5, R * .17, 0, TAU); x.fill(); } }); } });
  const wb = wheel(), wf = wheel(); wb.position.set(-L * .3, -Hb * .42, .0005); wf.position.set(L * .3, -Hb * .42, .0005);
  tint(body, col); tint(wb, col, .8); tint(wf, col, .8);
  const head = glow(S, .016, '#ffe2a8'); head.position.set(L * .5, -Hb * .2, .002); S.scene.remove(head);
  const drv = person(S, 'driver', 0, '#0a0f22'); S.scene.remove(drv.g); drv.k = .8; drv.pose(L * .36, -Hb * .32, { dir: 1 }); drv.g.position.z = -.001;
  g.add(inside, drv.g, body, wb, wf, head); g.position.z = z; S.scene.add(g);
  return { g, L, Hb, R, head, set(px, py, dist, k = 1) { g.position.set(px, py + Hb * .42 + R * .2, z); wb.rotation.z = wf.rotation.z = -dist / R; head.userData.set(k * 1.6); inside.material.color.set('#ffd79a').multiplyScalar(1.8 * k); } };
}
