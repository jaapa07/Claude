// planos.js: the 35 shots of the car documentary, shared by the 16:9 film and the 9:16 Reels cut.
// planos({ stage, Wd, c, CW, CH, T, vertical }) -> { SH, reset, word, pill }. In vertical mode every camera pulls back
// and widens a little, so the horizontal compositions still fit a tall frame.
import * as S from '../../../engine/stage.js';
import { PROFILE } from './mundo.js';
const { THREE, clamp, lerp, ease, spring, box } = S;
export function planos({ stage, Wd, c, CW, CH, T, vertical = false }) {
  const { car, rafael, workers, place, at: put } = Wd;
  const POSE = { stand: { facing: 0 }, work: { facing: 1, lean: 0.25, armL: [1.2, -0.6], armR: [0.9, -0.4] }, point: { facing: 1, armR: [-1.6, 0.1], armL: [0.2, -0.2] }, clap: k => ({ facing: 0, armL: [1.0 + 0.4 * Math.sin(k * 20), -1.6], armR: [-1.0 - 0.4 * Math.sin(k * 20), 1.6] }) };
  const U = car.userData;
  if (vertical) { const aim0 = stage.aim.bind(stage); stage.aim = (p, t, fov = 55) => { const k = 1.35; aim0([t[0] + (p[0] - t[0]) * k, t[1] + (p[1] - t[1]) * k, t[2] + (p[2] - t[2]) * k], t, Math.min(80, fov * 1.25)); }; }
// ---------- props made here ----------
const fac = Wd.sets.fac;
const engBlock = new THREE.Group(); engBlock.add(box(1.0, 0.6, 0.7, '#9aa0a8', 0, 0, 0, { metal: 0.7 }), box(1.0, 0.18, 0.7, '#7a8088', 0, 0.6, 0, { metal: 0.7 })); fac.add(engBlock);
const gearbox = box(0.7, 0.45, 0.5, '#6a7078', 0, 0, 0, { metal: 0.7 }); fac.add(gearbox);
const wires = new THREE.Group(); fac.add(wires); const wireLines = [];
['#ff3b30', '#ffcc4d', '#3a8cff', '#4fe08a'].forEach((col, k) => { const pts = []; for (let i = 0; i <= 40; i++) { const x = 2.0 - i * 0.1; pts.push(new THREE.Vector3(x, 0.75 + 0.05 * k + 0.08 * Math.sin(i * 0.7 + k), -0.6 + k * 0.4)); } const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 0.025, 6); const l = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 0.6 })); wires.add(l); wireLines.push(l); });
const cabin = new THREE.Group(); fac.add(cabin); cabin.position.set(0, 0, 8);
cabin.add(box(3, 0.05, 2.2, '#1a1c20', 0, 0.3, 0));
for (const z of [-0.45, 0.45]) { cabin.add(box(0.6, 0.12, 0.55, '#c49a6a', -0.3, 0.35, z, { rough: 0.7 })); const back = box(0.15, 0.75, 0.55, '#c49a6a', -0.62, 0.45, z, { rough: 0.7 }); back.rotation.z = 0.2; cabin.add(back); }
cabin.add(box(0.5, 0.45, 2.0, '#22252b', 0.75, 0.6, 0));
const wheelRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 24), S.mat('#111', { rough: 0.5 })); wheelRing.position.set(0.4, 0.95, -0.45); wheelRing.rotation.y = Math.PI / 2; wheelRing.rotation.x = 0.3; cabin.add(wheelRing);
const dashC = (() => { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 192; const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return { g: cv.getContext('2d'), tx }; })();
const dashScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.26), new THREE.MeshBasicMaterial({ map: dashC.tx })); dashScreen.position.set(0.5, 1.0, 0.1); dashScreen.rotation.y = -Math.PI / 2; dashScreen.rotation.x = 0; cabin.add(dashScreen);
const startBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 20), new THREE.MeshStandardMaterial({ color: '#c8372d', emissive: '#ff2a1a', emissiveIntensity: 0.4 })); startBtn.rotation.z = Math.PI / 2; startBtn.position.set(0.5, 0.82, 0.25); cabin.add(startBtn);
const airbag = new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), S.mat('#f4f1ea', { rough: 0.9 })); airbag.position.set(0.25, 0.95, -0.45); cabin.add(airbag);
const laptop = new THREE.Group(); laptop.add(box(0.4, 0.02, 0.28, '#2a2c33', 0, 0, 0)); const lscr = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.24), new THREE.MeshBasicMaterial({ color: '#0f2a1a' })); lscr.position.set(0, 0.14, -0.14); laptop.add(lscr); laptop.add(box(0.4, 0.26, 0.01, '#2a2c33', 0, 0.02, -0.145)); fac.add(laptop);
const cutter = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 12), S.mat('#c9ced6', { metal: 0.9 })); Wd.sets.eng.add(cutter);

// ---------- per-shot helpers ----------
function reset() {
  for (const k of ['laserTable', 'sheet', 'laserHead', 'cutLine', 'press', 'probe', 'screenM', 'conveyor']) Wd[k].visible = false;
  engBlock.visible = gearbox.visible = wires.visible = cabin.visible = laptop.visible = cutter.visible = false;
  Wd.robots.forEach(o => o.r.visible = false); Wd.spark(0, [0, -50, 0], 0); Wd.spray(0, '#888', [[0, -50, 0]], 0); Wd.puff(0, 0);
  Wd.wrench.visible = false; car.visible = false; car.position.set(0, 0, 0); car.rotation.set(0, 0, 0); U.state('paint');
  Wd.desksS.forEach(d => d.visible = true); Wd.blockSkin.material.opacity = 0.35; Wd.engine.visible = true; airbag.scale.setScalar(0.01); Wd.factoryDoor.visible = true;
  place('fac');
}
const factory = () => { Wd.use('fac', 'fac', 1.0); };
function screenText(cv, lines, col = '#4fe08a') { const g = cv.g; g.fillStyle = '#0b1210'; g.fillRect(0, 0, 512, 288); g.fillStyle = col; g.font = '700 34px "JetBrains Mono"'; lines.forEach((s, i) => g.fillText(s, 24, 60 + i * 46)); cv.tx.needsUpdate = true; }
function drawDash(t, on) { const g = dashC.g; g.fillStyle = '#05070b'; g.fillRect(0, 0, 512, 192); if (on > 0) { g.globalAlpha = clamp(on); g.strokeStyle = '#5fd0ff'; g.lineWidth = 8; g.beginPath(); g.arc(110, 110, 70, Math.PI * 0.8, Math.PI * (0.8 + 1.4 * clamp(on))); g.stroke(); g.fillStyle = '#ffffff'; g.font = '700 46px Oswald'; g.fillText(Math.round(900 * clamp(on)) + '', 75, 125); g.fillStyle = '#5fd0ff'; g.fillRect(230, 60, 250 * clamp(on), 22); g.fillRect(230, 100, 180 * clamp(on), 22); g.globalAlpha = 1; } dashC.tx.needsUpdate = true; }

// ---------- 2D inserts ----------
function sketch(c, k, zoom = 1, alpha = 1) {        // the first pencil drawing of the car, drawn stroke by stroke
  if (alpha <= 0) return; c.save(); c.globalAlpha = clamp(alpha);
  c.fillStyle = '#f2ecdc'; c.fillRect(0, 0, CW, CH); c.strokeStyle = 'rgba(40,60,120,0.12)'; c.lineWidth = 2; for (let y = 60; y < CH; y += 48) { c.beginPath(); c.moveTo(0, y); c.lineTo(CW, y); c.stroke(); }
  c.translate(CW / 2, CH * 0.62); c.scale((vertical ? 200 : 260) * zoom, -(vertical ? 200 : 260) * zoom);
  const pts = PROFILE.concat([PROFILE[0]]); let len = 0; const seg = []; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); len += d; }
  let left = len * clamp(k * 1.6); c.strokeStyle = '#2a2e36'; c.lineWidth = 0.022; c.lineCap = 'round'; c.beginPath(); c.moveTo(...pts[0]);
  for (let i = 1; i < pts.length && left > 0; i++) { const f = Math.min(1, left / seg[i - 1]); c.lineTo(lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)); left -= seg[i - 1]; } c.stroke();
  const wk = clamp(k * 1.6 - 1); if (wk > 0) { for (const x of [1.42, -1.38]) { c.beginPath(); c.arc(x, 0.36, 0.36, 0, Math.PI * 2 * wk); c.stroke(); c.beginPath(); c.arc(x, 0.36, 0.2, 0, Math.PI * 2 * wk); c.stroke(); } c.beginPath(); c.moveTo(0.45, 0.97); c.lineTo(lerp(0.45, -1.55, wk), lerp(0.97, 1.03, wk)); c.stroke(); }
  c.restore();
}
function dims(c, k) {       // wheelbase and weight distribution, drawn over the side view
  if (k <= 0) return; const p = v => { const q = car.localToWorld(new THREE.Vector3(...v)).project(stage.camera); return [(q.x + 1) / 2 * CW, (1 - q.y) / 2 * CH]; };
  const a = p([1.42, 0.0, 0.95]), b = p([-1.38, 0.0, 0.95]); c.save(); c.globalAlpha = clamp(k * 2); c.strokeStyle = '#ffcc4d'; c.fillStyle = '#ffcc4d'; c.lineWidth = 4;
  const y = Math.max(a[1], b[1]) + 60; c.beginPath(); c.moveTo(a[0], y); c.lineTo(lerp(a[0], b[0], clamp(k)), y); c.stroke(); c.font = '700 44px "JetBrains Mono"'; c.textAlign = 'center'; c.fillText('2.800 mm', (a[0] + b[0]) / 2, y + 56);
  c.fillStyle = '#5fd0ff'; c.fillText('50% · 50%', (a[0] + b[0]) / 2, y - 330); c.restore();
}
function pill(c, s, k) { if (k <= 0) return; c.save(); c.globalAlpha = clamp(k); c.font = '700 38px Oswald'; const w = c.measureText(s).width + 60; c.fillStyle = 'rgba(217,59,48,0.92)'; c.beginPath(); c.roundRect(60, vertical ? 120 : 70, w, 66, 33); c.fill(); c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.fillText(s, 90, vertical ? 155 : 105); c.restore(); }
function word(c, t) {       // one word at a time, centred (the 3D-explainer style)
  for (const L of T.lines) for (let i = 0; i < L.words.length; i++) { const x = L.words[i], nx = L.words[i + 1]; const end = nx ? nx.s : x.e + 0.25;
    if (t >= x.s - 0.02 && t < end) { const s = x.w.replace(/[.,;:!?]+$/, '').toUpperCase(), k = clamp((t - x.s + 0.02) / 0.08); c.save(); c.font = `700 ${vertical ? 104 : 88}px Oswald`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round'; c.lineWidth = 14; c.strokeStyle = '#0b0c0f'; const sc = 0.85 + 0.15 * k; c.translate(CW / 2, CH * (vertical ? 0.7 : 0.8)); c.scale(sc, sc); c.strokeText(s, 0, 0); c.fillStyle = '#ffffff'; c.fillText(s, 0, 0); c.restore(); return; } }
}

  // ---------- the 35 shots (indices match prompts_visuais.txt) ----------
const SH = [
  // 1 · the idea
  (t, u) => { Wd.use('city', 'night', 1.7); Wd.cityTraffic(t); stage.aim([7 - u * 0.3, 16 - u * 0.5, 36 - u * 3], [0, 9, -40 - u * 3], 52); },
  (t, u) => { Wd.use('office', 'night', 1.3); place('office', rafael); put(rafael, -0.6, 0, -2.2, POSE.stand); stage.aim([0.6, 1.5, 2.0 - u * 0.12], [-0.4, 1.4, -3], 50); },
  (t, u) => { Wd.use('office', 'night', 1.3); stage.aim([0.6, 2.2, -1.25], [0.6, 0.8, -1.3], 40); return { fx: c => sketch(c, (u - 1.0) / 6, 1, (u - 0.5) / 0.6) }; },
  (t, u) => { Wd.use('office', 'night', 1.3); stage.aim([0.6, 2.2, -1.25], [0.6, 0.8, -1.3], 40); return { fx: c => sketch(c, 0.6 + u / 4, 1 + u * 0.12, 1 - clamp((u - 7.1) / 0.6)) }; },
  // 2 · design and engineering
  (t, u) => { Wd.use('studio', 'studio', 0.7); place('studio', ...workers); workers.forEach((w, i) => put(w, -5 + i * 2.2, 0, 2.9, POSE.work)); stage.aim([-6 + u * 0.6, 1.8, 7], [-2 + u * 0.6, 1.4, -2], 50); },
  (t, u) => { Wd.use('studio', 'night', 1.0); Wd.carIn('studio', 0, 0.12, 0, t * 0.4); U.state('wire'); Wd.desksS.forEach(d => d.visible = false); stage.aim([5.2, 2.4, 5.2], [0, 0.7, 0], 44); },
  (t, u) => { Wd.use('tunnel', 'night', 1.6); Wd.carIn('tunnel', 0, 0, 0, Math.PI); U.state('clay', { glassOn: false, lightsOn: false }); Wd.flow(t); stage.aim([2 - u * 0.3, 1.2, 6.5], [0, 0.7, 0], 46); },
  (t, u) => { Wd.use('studio', 'night', 1.0); Wd.carIn('studio', 0, 0.12, 0, 0); U.state('wire'); Wd.desksS.forEach(d => d.visible = false); stage.aim([0, 2.2, 7.0], [0, 0.55, 0], 36); return { fx: c => dims(c, u / 2.5) }; },
  // 3 · chassis and body
  (t, u) => { factory(); Wd.laserTable.visible = Wd.sheet.visible = Wd.laserHead.visible = true; Wd.laserTable.position.set(0, 0, 0); Wd.sheet.position.set(0, 0.9, 0); const k = clamp(u / 6), i = Math.min(PROFILE.length - 1, Math.floor(k * (PROFILE.length - 1))), f = k * (PROFILE.length - 1) - i, a = PROFILE[i], b = PROFILE[Math.min(PROFILE.length - 1, i + 1)];
    const hx = lerp(a[0], b[0], f) * 0.45, hz = (lerp(a[1], b[1], f) - 0.75) * 0.9; Wd.laserHead.position.set(hx, 1.25, hz); Wd.spark(t, [hx, 0.93, hz]);
    Wd.cutLine.visible = true; Wd.cutLine.geometry.setFromPoints(PROFILE.slice(0, i + 1).map(([x, y]) => new THREE.Vector3(x * 0.45, 0.935, (y - 0.75) * 0.9)).concat([new THREE.Vector3(hx, 0.935, hz)])); stage.aim([1.6, 1.6, 1.6], [0, 0.9, 0], 44); },
  (t, u) => { factory(); Wd.press.visible = true; Wd.press.position.set(0, 0, 0); const k = u < 2.5 ? ease(u / 2.5) : (u < 3.2 ? 1 : 1 - ease((u - 3.2) / 2)); Wd.ram.position.y = lerp(3.6, 0.65, k); Wd.panel.scale.y = u > 2.4 ? 3 : 1; Wd.panel.position.y = 0.55; stage.aim([4.5, 2.2, 5.5 + (u > 2.4 && u < 2.6 ? 0.05 : 0)], [0, 1.6, 0], 44); },
  (t, u) => { factory(); Wd.conveyor.visible = true; Wd.carIn('fac', 0, 0.35, 0, 0); U.state('bare', { glassOn: false, wheelsOn: false, edgesOn: true }); Wd.robots.forEach(o => o.r.visible = true); Wd.poseRobots(t); const tips = Wd.robots.map(o => { const v = new THREE.Vector3(); o.tip.getWorldPosition(v); return [v.x, v.y, v.z]; }); Wd.spark(t, tips);
    const a = u * 0.12; stage.aim([Math.sin(a + 0.6) * 7, 3.0, Math.cos(a + 0.6) * 7], [0, 1.0, 0], 46); },
  (t, u) => { factory(); Wd.conveyor.visible = true; Wd.carIn('fac', 0, 0.35, 0, 0); U.state('bare', { glassOn: false, wheelsOn: false, edgesOn: true }); place('fac', workers[0]); put(workers[0], 1.4, 0, 1.6, Object.assign({}, POSE.work, { facing: -1 })); Wd.probe.visible = true; Wd.probe.position.set(1.2 + 0.1 * Math.sin(u), 1.6, 0.95); Wd.screenM.visible = true; Wd.screenM.position.set(2.8, 1.6, 1.6); Wd.screenM.rotation.y = -0.6; screenText(Wd.screen, ['MEDIÇÃO', 'X  +0,08 mm', 'Y  -0,05 mm', 'Z  +0,02 mm', 'STATUS: OK']); stage.aim([3.6, 1.8, 3.6], [1.4, 1.2, 0.8], 42); },
  (t, u) => { factory(); Wd.conveyor.visible = true; Wd.carIn('fac', 0, 0.35, -3 + u * 0.5, 0); Wd.conveyor.position.z = car.position.z; U.state('bare', { glassOn: false, wheelsOn: false, edgesOn: true }); stage.aim([6.5, 1.4, 4.0], [0, 0.9, car.position.z], 40); },
  // 4 · the engine
  (t, u) => { Wd.use('eng', 'night', 1.2); Wd.blockSkin.material.opacity = 1; Wd.pistons.forEach(p => p.visible = false); Wd.rods.forEach(r => r.visible = false); Wd.crank.visible = false; Wd.head.visible = false; Wd.turbo.visible = false; Wd.radiator.visible = false; cutter.visible = true; cutter.position.set(-0.7 + (u % 2) * 0.7, 2.0 - Math.min(0.3, u * 0.1), 0); cutter.rotation.y = t * 30; stage.aim([2.4, 2.4, 2.6], [0, 1.4, 0], 40); },
  (t, u) => { Wd.use('eng', 'night', 1.2); Wd.crank.visible = false; Wd.head.visible = false; Wd.turbo.visible = false; Wd.radiator.visible = false; Wd.runEngine(0, 0, 0); Wd.pistons.forEach((p, i) => { p.visible = true; p.position.y += Math.max(0, 1.2 - (u - i * 1.1)) ; }); Wd.rods.forEach((r, i) => { r.visible = true; r.position.y += Math.max(0, 1.2 - (u - i * 1.1)); }); stage.aim([1.6, 2.6, 2.2], [0, 1.4, 0], 40); },
  (t, u) => { Wd.use('eng', 'night', 1.2); Wd.head.visible = false; Wd.turbo.visible = false; Wd.radiator.visible = false; Wd.pistons.forEach(p => p.visible = true); Wd.rods.forEach(r => r.visible = true); Wd.crank.visible = true; Wd.runEngine(u * 0.05, 1, 0); Wd.crank.position.y = -0.55 + Math.max(0, 1.5 - u * 0.5); stage.aim([2.0, 0.6, 2.6], [0, 0.9, 0], 42); },
  (t, u) => { Wd.use('eng', 'night', 1.2); Wd.head.visible = true; Wd.turbo.visible = false; Wd.radiator.visible = false; Wd.crank.visible = true; Wd.runEngine(0, 0, Math.max(0, 1.2 - u * 0.6)); Wd.wrench.visible = true; Wd.wrench.position.set(0.4, 2.15, 0.6); Wd.wrench.rotation.y = Math.sin(u * 3) * 0.6; stage.aim([1.4, 2.6, 2.0], [0.2, 2.0, 0], 38); },
  (t, u) => { Wd.use('eng', 'night', 1.2); Wd.wrench.visible = false; [Wd.head, Wd.turbo, Wd.crank].forEach(o => o.visible = true); Wd.radiator.visible = false; Wd.pistons.forEach(p => p.visible = true); Wd.rods.forEach(r => r.visible = true); Wd.runEngine(t, 0.6, 0); const a = u * 0.35; stage.aim([Math.sin(a) * 3.6, 2.2, Math.cos(a) * 3.6], [0, 1.2, 0], 44); },
  // 5 · systems
  (t, u) => { factory(); Wd.carIn('fac', 0, 0.9, 0, 0); U.state('bare', { glassOn: false, edgesOn: true, roll: t * 3 }); place('fac', workers[1]); put(workers[1], 2.6, 0, 1.2, Object.assign({}, POSE.work, { facing: -1 })); stage.aim([2.0, 1.2, 3.2], [1.42, 1.1, 0.86], 44); },
  (t, u) => { factory(); Wd.carIn('fac', 0, 1.6, 0, 0); U.state('bare', { glassOn: false, edgesOn: true }); gearbox.visible = true; gearbox.position.set(-0.2, lerp(0, 1.55, ease(u / 4)), 0); stage.aim([3.5, 0.4, 3.0], [0, 1.6, 0], 50); },
  (t, u) => { factory(); Wd.carIn('fac', 0, 0.35, 0, 0); U.state('bare', { glassOn: false, wheelsOn: false, edgesOn: true }); wires.visible = true; wires.position.set(0, 0.35, 0); wireLines.forEach((l, i) => l.geometry.setDrawRange(0, Math.floor(l.geometry.index.count * clamp(u / 4 - i * 0.1) / 6) * 6)); stage.aim([0.6, 3.4, 3.2], [0, 0.9, 0], 44); },
  (t, u) => { factory(); Wd.carIn('fac', 0, 1.4, 0, 0); U.state('bare', { glassOn: false, edgesOn: true }); engBlock.visible = true; engBlock.position.set(1.5, lerp(0, 1.55, ease(u / 5)), 0); place('fac', ...workers.slice(0, 2)); put(workers[0], 2.8, 0, 1.6, Object.assign({}, POSE.work, { facing: -1 })); put(workers[1], 2.8, 0, -1.6, Object.assign({}, POSE.work, { facing: -1 })); stage.aim([5.5, 0.9, 4.5], [1.2, 1.6, 0], 46); return { fx: c => {} }; },
  // 6 · paint
  (t, u) => { Wd.use('booth', 'studio', 0.8); Wd.carIn('booth', 0, 0, 0, 0); U.state(u > 1.5 ? 'primer' : 'bare', { glassOn: false, wheelsOn: false }); Wd.spray(t, '#a9adb4', [[1.2, 2.4, 1.2], [-1.2, 2.4, -1.2], [0, 2.6, 0]]); stage.aim([4.5 - u * 0.4, 2.2, 4.8], [0, 0.8, 0], 46); },
  (t, u) => { Wd.use('booth', 'studio', 0.8); Wd.carIn('booth', 0, 0, 0, 0); U.state('primer', { glassOn: false, wheelsOn: false }); place('booth', workers[2]); Wd.sets.booth.add(workers[2].mesh); put(workers[2], 1.0, 0, 1.4, Object.assign({}, POSE.work, { facing: -1, armL: [1.3 + 0.2 * Math.sin(t * 10), -0.5] })); stage.aim([2.2, 1.3, 2.8], [0.8, 0.9, 0.6], 40); },
  (t, u) => { Wd.use('booth', 'studio', 0.8); Wd.carIn('booth', 0, 0, 0, 0); U.state(u > 2 ? 'paint' : 'primer', { glassOn: false, wheelsOn: false, lightsOn: false }); Wd.spray(t, '#1d3f8a', [[1.0, 2.4, 1.1], [-1.0, 2.4, -1.1], [0, 2.6, 0.5]]); const a = 0.6 + u * 0.15; stage.aim([Math.sin(a) * 6, 2.4, Math.cos(a) * 6], [0, 0.7, 0], 44); },
  (t, u) => { Wd.use('booth', 'studio', 0.85); Wd.carIn('booth', 0, 0, 0, 0); U.state('paint', { glassOn: u > 1.5, wheelsOn: u > 3, lightsOn: u > 0.5 }); const a = -0.5 + u * 0.18; stage.aim([Math.sin(a) * 5.5 + 1.5, 0.9, Math.cos(a) * 5.5], [0.8, 0.6, 0], 40); },
  // 7 · interior
  (t, u) => { factory(); cabin.visible = true; drawDash(t, 0); stage.aim([-1.0, 1.9, 9.6 + 0.0 * u], [0, 0.6, 8], 50); },
  (t, u) => { factory(); cabin.visible = true; drawDash(t, (u - 1.0) / 1.5); stage.aim([-0.6, 1.25, 8.2], [0.5, 0.95, 8.0], 40); },
  (t, u) => { factory(); cabin.visible = true; drawDash(t, 1); airbag.scale.setScalar(u > 2.5 ? ease(clamp((u - 2.5) / 0.4)) : 0.01); stage.aim([-0.7, 1.35, 7.0], [0.3, 0.95, 7.6], 44); },
  (t, u) => { factory(); Wd.carIn('fac', 0, 0, 0, 0); U.state('paint'); place('fac', ...workers.slice(0, 2)); put(workers[0], 2.6, 0, 1.6, Object.assign({}, POSE.work, { facing: -1 })); put(workers[1], 3.2, 0, 1.2, POSE.stand); laptop.visible = true; laptop.position.set(2.9, 0.9, 1.8); lscr.material.color.set(u > 2 ? '#1f8a4f' : '#0f2a1a'); stage.aim([5.2, 1.8, 4.6], [1.8, 0.9, 1.0], 42); },
  // 8 · first start and tests
  (t, u) => { factory(); cabin.visible = true; const on = (u - 1.6) / 1.2; startBtn.material.emissiveIntensity = u > 1.4 ? 2.5 : 0.4; drawDash(t, on); stage.aim([-0.25, 1.05, 8.15], [0.5, 0.92, 8.2], 34); },
  (t, u) => { Wd.use('dyno', 'night', 1.2); Wd.carIn('dyno', 0, 0.2, 0, 0); U.state('paint'); Wd.puff(t); place('dyno', ...workers); workers.forEach((w, i) => put(w, -1 + i * 1.3, 0, -3.5, POSE.clap(t + i))); stage.aim([-5.6, 1.1, 3.6], [-1.6, 0.6, 0], 44); },
  (t, u) => { if (u < 4) { Wd.use('dyno', 'night', 1.2); Wd.carIn('dyno', 0, 0.2, 0, 0); U.state('paint', { roll: t * 20 }); Wd.rollers.forEach(r => r.rotation.y = -t * 30); screenText(Wd.dynoScreen, ['DINAMÔMETRO', 'POTÊNCIA ' + Math.round(lerp(120, 420, clamp(u / 3.5))) + ' cv', 'TORQUE  ' + Math.round(lerp(200, 530, clamp(u / 3.5))) + ' Nm']); stage.aim([3.8, 1.2, 4.2], [0, 0.7, 0], 44); }
    else { Wd.use('road', 'sunset', 1.0); Wd.factoryDoor.visible = false; Wd.carIn('road', 0, 0.12, 40 - (u - 4) * 30, Math.PI / 2); U.state('paint', { roll: t * 30 }); stage.aim([4.5, 1.0, car.position.z + 4], [0, 0.6, car.position.z - 1], 46); } },
  // 9 · the dream
  (t, u) => { Wd.use('road', 'sunset', 1.0); Wd.carIn('road', 0, 0.12, -13 + u * 1.2, -Math.PI / 2); U.state('paint', { roll: t * 1.2 }); place('road', rafael); put(rafael, 3.6, 0, -5, POSE.stand); stage.aim([5.5, 1.6, 6], [0, 1.0, -9], 48); },
  (t, u) => { Wd.use('road', 'sunset', 1.0); Wd.factoryDoor.visible = false; const drive = u < 4.5; const z = drive ? 10 - u * 9 : -30.5; Wd.carIn('road', 0, 0.12, z, Math.PI / 2); U.state('paint', { roll: drive ? t * 25 : 0 });
    if (drive) stage.aim([4.2, 1.1, z + 3.5], [0, 0.6, z - 2], 48); else stage.aim([3.8 - (u - 4.5) * 0.15, 0.7, -27.5], [0, 0.55, -30.5], 36); },
];


  return { SH, reset, word, pill, sketch };
}
