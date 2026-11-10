// extra.js: what parts 3-5 add to the house. The father's suit (dry or soaked), the camera on its tripod, the water
// (a stain on the dining ceiling, drops, the flooded forbidden bathroom, the puddle under its door), the fork,
// grandpa's newspaper, the new photo on the bathroom wall, and the 2D overlays these parts share.
import * as S from '../engine/stage.js';
import { canvasTex } from './world.js';
const { THREE, clamp, lerp, ease, box, mat } = S;

export const SUIT = '#1d2230', SUIT_WET = '#11151f';
export const SEAT = -0.16, seats = { dad: [-1.6, 0], you: [0.3, 0.9], gf: [-0.6, 0.9], mom: [0.5, -0.9], grandpa: [-0.4, -0.9] };
// standing on the hall stairs: the height of the step under z
export const stairY = z => { const i = Math.floor((-z - 6.2 + 0.14) / 0.28); return i < 0 ? 0 : 0.18 * (Math.min(i, 11) + 1); };

export function extras(Wd) {
  const X = {};
  // the father: plain shirt (part 3 until he comes back), the suit, the soaked suit
  X.suit = (on = true, wet = false) => { Wd.dad.o.mark = on ? { type: 'terno', color: wet ? SUIT_WET : SUIT, wet } : { type: 'stache', color: '#6b6f78' }; };

  // ---------- dining: the camera on its tripod, the ceiling stain, the drops, the fork, the pudding ----------
  const cam = new THREE.Group();
  for (let i = 0; i < 3; i++) { const a = i * 2.1; const leg = box(0.025, 1.25, 0.025, '#222', 0, 0, 0); leg.position.set(Math.sin(a) * 0.16, 0.6, Math.cos(a) * 0.16); leg.rotation.set(Math.cos(a) * 0.14, 0, -Math.sin(a) * 0.14); cam.add(leg); }
  cam.add(box(0.26, 0.17, 0.14, '#2b2d33', 0, 1.22, 0, { metal: 0.3 }));
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 14), mat('#111', { metal: 0.6, rough: 0.2 })); lens.rotation.x = Math.PI / 2; lens.position.set(0, 1.3, -0.11); cam.add(lens);
  X.led = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff2a2a' })); X.led.position.set(0.09, 1.36, -0.075); cam.add(X.led);
  cam.position.set(0.0, 0, 2.35); Wd.dining.add(cam); X.cam = cam;
  const stainC = canvasTex(256, 256); { const g = stainC.g, gr = g.createRadialGradient(128, 128, 10, 128, 128, 126); gr.addColorStop(0, 'rgba(90,70,40,0.95)'); gr.addColorStop(0.7, 'rgba(120,95,60,0.7)'); gr.addColorStop(1, 'rgba(120,95,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); }
  X.stain = new THREE.Mesh(new THREE.CircleGeometry(0.7, 24), new THREE.MeshBasicMaterial({ map: stainC.tx, transparent: true, depthWrite: false }));
  X.stain.rotation.x = Math.PI / 2; X.stain.position.set(-0.3, 2.785, -0.4); Wd.dining.add(X.stain);
  const dropM = new THREE.MeshStandardMaterial({ color: '#9fd4ff', emissive: '#4aa8ff', emissiveIntensity: 0.6, roughness: 0.1, metalness: 0.2 });
  X.drops = []; for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), dropM); d.scale.set(0.8, 1.4, 0.8); Wd.dining.add(d); X.drops.push(d); }
  const ringM = new THREE.MeshBasicMaterial({ color: '#cfeaff', transparent: true, depthWrite: false, side: THREE.DoubleSide });
  X.rings = X.drops.map(() => { const r = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.045, 18), ringM.clone()); r.rotation.x = -Math.PI / 2; Wd.dining.add(r); return r; });
  // drop i: falls from the stain at time t0 onto (x, y, z); a ring spreads where it lands
  X.drop = (i, t, t0, [x, y, z], fall = 0.45) => {
    const d = X.drops[i], r = X.rings[i], k = (t - t0) / fall;
    d.visible = k >= 0 && k < 1; r.visible = k >= 1 && k < 2.2;
    if (d.visible) d.position.set(x, lerp(2.76, y, k * k), z);
    if (r.visible) { const q = (k - 1) / 1.2; r.position.set(x, y + 0.004, z); r.scale.setScalar(1 + q * 3); r.material.opacity = 0.9 * (1 - q); }
  };
  X.fork = box(0.02, 0.01, 0.18, '#c9ccd1', 0, 0, 0, { metal: 0.8, rough: 0.3 }); Wd.dining.add(X.fork);
  X.pudim = new THREE.Group(); { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.03, 18), mat('#f7f4ee', { rough: 0.4 })); X.pudim.add(pl); const b = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.09, 18), mat('#e9b85a', { rough: 0.5 })); b.position.y = 0.06; X.pudim.add(b); const top = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.12, 0.012, 18), mat('#7a3a12', { rough: 0.2 })); top.position.y = 0.11; X.pudim.add(top); }
  X.pudim.position.set(-0.3, 0.77, -0.4); Wd.dining.add(X.pudim);
  X.emptyPlate = new THREE.Group(); { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.03, 16), mat('#f7f4ee', { rough: 0.4 })); X.emptyPlate.add(pl); const smear = new THREE.Mesh(new THREE.CircleGeometry(0.05, 10), mat('#7a3a12', { rough: 0.2 })); smear.rotation.x = -Math.PI / 2; smear.position.set(0.03, 0.017, 0.02); X.emptyPlate.add(smear); }
  X.emptyPlate.position.set(0.3, 0.775, 0.4); Wd.dining.add(X.emptyPlate);

  // the dining room has no wall behind the camera side: close it, so shots looking that way see a wall, not a void
  Wd.dining.add(box(6, 2.8, 0.1, '#c8a77c', 0, 0, 3.0), box(6, 0.9, 0.04, '#7a5638', 0, 0, 2.93));

  // ---------- grandpa's newspaper (follows him into any set) ----------
  X.paper = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.36), new THREE.MeshStandardMaterial({ color: '#e8e4d8', emissive: '#e8e4d8', emissiveIntensity: 0.15, side: THREE.DoubleSide }));
  X.paperOn = (set, x, y, z, rx = -0.1, ry = 0) => { set.add(X.paper); X.paper.visible = true; X.paper.position.set(x, y, z); X.paper.rotation.set(rx, ry, 0); };

  // ---------- the flood: water in the bathroom, overflowing bowl, a puddle on the landing ----------
  const waterM = new THREE.MeshStandardMaterial({ color: '#5f9fc4', emissive: '#1d4a66', emissiveIntensity: 0.4, transparent: true, opacity: 0.72, roughness: 0.08, metalness: 0.3 });
  X.water = new THREE.Mesh(new THREE.PlaneGeometry(2.98, 2.98, 16, 16), waterM); X.water.rotation.x = -Math.PI / 2; Wd.bath.add(X.water);
  const base = X.water.geometry.attributes.position.array.slice();
  X.flood = (t, level) => {           // level in m above the floor; ripples so it reads as water
    X.water.visible = level > 0.003; X.water.position.y = level;
    const p = X.water.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.array[i * 3 + 2] = base[i * 3 + 2] + 0.012 * Math.sin(base[i * 3] * 7 + t * 3) * Math.cos(base[i * 3 + 1] * 6 - t * 2.3);
    p.needsUpdate = true;
  };
  X.overflow = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.02, 16), waterM); X.overflow.position.set(0, 0.45, 0.12); Wd.toilet.add(X.overflow);
  X.spill = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.42), waterM); X.spill.position.set(0, 0.24, 0.33); Wd.toilet.add(X.spill);
  X.overflowOn = (t, on) => { X.overflow.visible = X.spill.visible = on; if (on) X.overflow.position.y = 0.45 + 0.008 * Math.sin(t * 9); };
  X.puddle = new THREE.Mesh(new THREE.CircleGeometry(1, 28), waterM); X.puddle.rotation.x = -Math.PI / 2; Wd.up.add(X.puddle);
  X.puddleOn = k => { X.puddle.visible = k > 0.01; X.puddle.position.set(0.3, 0.006, -1.95 + 0.55 * k); X.puddle.scale.set(0.5 + 0.7 * k, 0.15 + 0.6 * k, 1); };

  // ---------- the new photo on the bathroom wall: you, him (in the suit) and grandpa, soaked ----------
  const ph = canvasTex(256, 200); X.paintPhoto = () => { const g = ph.g; g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, 256, 200); g.fillStyle = '#8fb6cf'; g.fillRect(12, 12, 232, 160);
    const man = (cx, hgt, body, suit) => { g.lineCap = 'round'; g.strokeStyle = '#15171c'; g.lineWidth = 11; const top = 172 - hgt; g.beginPath(); g.moveTo(cx, top + 26); g.lineTo(cx, 140); g.moveTo(cx, 140); g.lineTo(cx - 14, 170); g.moveTo(cx, 140); g.lineTo(cx + 14, 170); g.moveTo(cx, top + 34); g.lineTo(cx - 22, top + 8); g.moveTo(cx, top + 34); g.lineTo(cx + 22, top + 8); g.stroke();
      g.strokeStyle = body; g.lineWidth = suit ? 14 : 9; g.beginPath(); g.moveTo(cx, top + 28); g.lineTo(cx, 138); g.stroke(); if (suit) { g.strokeStyle = '#c8372d'; g.lineWidth = 4; g.beginPath(); g.moveTo(cx, top + 30); g.lineTo(cx, top + 56); g.stroke(); }
      g.fillStyle = '#15171c'; g.beginPath(); g.arc(cx, top + 12, 15, 0, 7); g.fill(); g.fillStyle = '#f1ede4'; g.beginPath(); g.arc(cx, top + 12, 11, 0, 7); g.fill();
      g.fillStyle = '#15171c'; g.beginPath(); g.arc(cx, top + 16, 4, 0, Math.PI); g.fill();
      g.fillStyle = '#d9f0ff'; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(cx - 16 + k * 11, top + 40 + (k % 2) * 30, 3, 0, 7); g.fill(); } };
    man(70, 120, '#2f6fd6', false); man(130, 138, SUIT, true); man(190, 108, '#8a6a4a', false);
    g.fillStyle = '#15171c'; g.font = '700 18px Oswald'; g.textAlign = 'center'; g.fillText('O DIA DA ENCHENTE', 128, 192); ph.tx.needsUpdate = true; }; X.paintPhoto();
  X.photo = new THREE.Group(); X.photo.add(box(0.56, 0.46, 0.03, '#5a3a24', 0, -0.23, 0));
  const pp = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.4), new THREE.MeshStandardMaterial({ map: ph.tx, emissive: '#ffffff', emissiveMap: ph.tx, emissiveIntensity: 0.25, roughness: 0.9 })); pp.position.z = 0.02; X.photo.add(pp);
  X.photo.position.set(1.0, 1.55, -1.47); Wd.bath.add(X.photo);

  // every seek starts from here: nothing left on from the shot before
  X.reset = () => {
    X.cam.visible = false; X.stain.visible = false; X.drops.forEach(d => d.visible = false); X.rings.forEach(r => r.visible = false);
    X.fork.visible = false; X.pudim.visible = false; X.emptyPlate.visible = false; X.paper.visible = false;
    X.water.visible = false; X.overflowOn(0, false); X.puddle.visible = false; X.photo.visible = false;
    Wd.plates.forEach(p => p.visible = true); Wd.pot.visible = true; Wd.potSteam(0, 0); Wd.mist(0, 0);
    Wd.bathInDoor.userData.open(0); Wd.forbidden.userData.open(0); Wd.bathDoor.userData.open(0); Wd.lever.rotation.z = 0;
    Wd.forbLight.intensity = 0; Wd.forbLight.visible = false; Wd.forbGlow.visible = false;
    Wd.can.position.set(0.25, 0.04, -0.3); Wd.can.rotation.set(0, 0.6, Math.PI / 2);
    Wd.grandpa.o.mark = { type: 'stache', color: '#8a6a4a', color2: '#d9d9d9' };
  };
  return X;
}

// ---------- 2D overlays ----------
const { W: CW } = S;
export function gauge(c, v, t) {
  const x = 640, y = 120, wd = 400, ht = 108, hot = v >= 90, sh = hot ? Math.sin(t * 50) * 3 : 0;
  c.save(); c.translate(sh, 0); c.fillStyle = 'rgba(8,9,12,0.62)'; c.beginPath(); c.roundRect(x, y, wd, ht, 18); c.fill();
  c.font = '700 30px "JetBrains Mono"'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = '#f3eee4'; c.fillText('PRESSÃO', x + 24, y + 30);
  c.textAlign = 'right'; c.fillStyle = hot ? '#ff5a4f' : '#ffcc4d'; c.font = '700 40px "JetBrains Mono"'; c.fillText(v + '%', x + wd - 22, y + 32);
  c.fillStyle = 'rgba(255,255,255,0.15)'; c.beginPath(); c.roundRect(x + 24, y + 62, wd - 48, 26, 13); c.fill();
  const gr = c.createLinearGradient(x + 24, 0, x + wd - 24, 0); gr.addColorStop(0, '#4fe08a'); gr.addColorStop(0.6, '#ffcc4d'); gr.addColorStop(1, '#ff4b3e');
  c.fillStyle = gr; c.beginPath(); c.roundRect(x + 24, y + 62, (wd - 48) * clamp(v / 100), 26, 13); c.fill(); c.restore();
}
// PK: [[t, value], ...] -> the gauge value at t (each step eases in over 0.35 s)
export const pressureOf = PK => t => { let v = PK[0][1]; for (let i = 1; i < PK.length; i++) { const [tk, vk] = PK[i]; if (t >= tk - 0.35) v = lerp(PK[i - 1][1], vk, ease((t - tk + 0.35) / 0.35)); } return Math.round(v); };
export function pill(c, s, y) { c.save(); c.font = '700 44px Oswald'; const wd = c.measureText(s).width + 70; c.fillStyle = '#d93b30'; c.beginPath(); c.roundRect(540 - wd / 2, y - 40, wd, 80, 40); c.fill(); c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(s, 540, y + 2); c.restore(); }
export function title(c, rows) {        // rows: [[text, y, colour], ...], auto-fit to the frame
  c.save(); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  for (const [s, y, col] of rows) { let fs = 140; c.font = `700 ${fs}px Oswald`; while (c.measureText(s).width > 940 && fs > 60) { fs -= 6; c.font = `700 ${fs}px Oswald`; } c.lineWidth = 16; c.strokeStyle = '#0b0c0f'; c.strokeText(s, 540, y); c.fillStyle = col; c.fillText(s, 540, y); }
  c.restore();
}
// a big comic word (PRRRT, 10, HAJIME): pops in with a spring and shakes
export function bang(c, s, k, { y = 820, col = '#ffcc4d', size = 220, rot = -0.08, shake = 0 } = {}) {
  if (k <= 0) return; const sc = clamp(S.spring(k * 1.3), 0, 1.2); c.save(); c.translate(540 + shake * Math.sin(k * 80) * 8, y); c.rotate(rot); c.scale(sc, sc);
  c.font = `700 ${size}px Oswald`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = 22; c.strokeStyle = '#0b0c0f'; c.strokeText(s, 0, 0); c.fillStyle = col; c.fillText(s, 0, 0); c.restore();
}
// a timer box (the 5-minute speech)
export function timer(c, secs, t) {
  const m = Math.floor(secs / 60), s = Math.floor(secs % 60), str = `${m}:${String(s).padStart(2, '0')}`, hot = secs < 70;
  c.save(); c.fillStyle = 'rgba(8,9,12,0.62)'; c.beginPath(); c.roundRect(40, 250, 300, 120, 18); c.fill();
  c.font = '700 26px "JetBrains Mono"'; c.fillStyle = '#f3eee4'; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillText('DISCURSO', 64, 284);
  c.font = '700 54px "JetBrains Mono"'; c.fillStyle = hot ? '#ff5a4f' : '#ffffff'; c.fillText(str, 64, 334); c.restore();
}
// the photo: the frame already drawn, copied into a white border, tilted, on a dark table
const snap = document.createElement('canvas'); snap.width = 1080; snap.height = 1920;
export function polaroid(c, k, caption) {
  const g = snap.getContext('2d'); g.drawImage(c.canvas, 0, 0);
  c.save(); c.fillStyle = '#1a1310'; c.fillRect(0, 0, CW, 1920);
  const sc = lerp(1.0, 0.78, ease(k)); c.translate(540, 800); c.rotate(lerp(0, -0.05, ease(k))); c.scale(sc, sc);
  c.fillStyle = '#f7f4ee'; c.shadowColor = 'rgba(0,0,0,0.6)'; c.shadowBlur = 40; c.fillRect(-560, -760, 1120, 1600); c.shadowBlur = 0;
  c.drawImage(snap, 0, 300, 1080, 1180, -520, -720, 1040, 1136);
  c.fillStyle = '#2a2420'; c.font = '700 64px Oswald'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(caption, 0, 520); c.restore();
}
