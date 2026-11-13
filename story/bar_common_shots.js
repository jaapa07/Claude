// bar_common_shots.js: shots both bar series reuse (the facade, the table, faces, the walk to the back, the corridor,
// the bathroom door, the queue). Each takes the part's ctx and returns a (t, u) => {} shot.
export function shots(ctx) {
  const { X, POSE, stage, THREE, clamp, lerp, ease } = ctx; const Wd = X.Wd, TB = X.TB;
  const S = {};
  S.facade = (o = {}) => (t, u) => { stage.use('street'); Wd.hideAll(); X.hideSticks(); const k = ease(clamp(u / (o.dur || 2.4))); stage.aim([lerp(-2.5, -1.0, k), lerp(1.2, 1.9, k), lerp(14, o.close ? 7.5 : 10.5, k)], [0, lerp(2.0, 2.9, k), -1.4], 50); };
  S.sky = () => (t, u) => { stage.use('street'); Wd.hideAll(); X.hideSticks(); stage.aim([3, 0.6, 7], [-4, 13 + u, -20], 62); };
  S.wide = (o = {}) => (t, u) => { X.table(t, o); const k = ease(clamp(u / 2.5)); stage.aim([lerp(2.5, 1.9, k), lerp(2.2, 1.75, k), lerp(3.3, 2.5, k)], [0.55, 0.9, 0.1], 52); };
  S.wideFront = (o = {}) => (t, u) => { X.table(t, o); const k = ease(clamp(u / 2.5)); stage.aim([TB[0] + 0.3, lerp(1.6, 1.5, k), TB[1] + lerp(2.6, 2.1, k)], [TB[0], 0.95, TB[1] - 0.2], 52); };
  S.youFace = (o = {}) => (t, u) => { X.table(t, o); if (X.f3) X.f3.mesh.visible = false; const k = ease(clamp(u / (o.dur || 2))); const sh = o.shake ? o.shake * Math.sin(t * 60) : 0; X.face(X.you, lerp(o.d0 || 1.0, o.d1 || 0.75, k), 0.04 + sh, 0.24, o.fov || 42, [0, -0.1, 0]); };
  S.friendFace = (who, o = {}) => (t, u) => { X.table(t, o); const h = X.head(who), s = who === X.f1 ? 1 : -1; stage.aim([h.x + s * 0.7, h.y + 0.08, h.z + 1.15], [h.x, h.y - 0.04, h.z], o.fov || 42); };
  S.belly = (o = {}) => (t, u) => { X.table(t, Object.assign({ you: POSE.belly }, o)); const h = X.head(X.you); const sh = 0.01 * Math.sin(t * 70) * Math.max(0, 1 - u); stage.aim([h.x + 0.5 + sh, h.y - 0.35, h.z + 0.75], [h.x, h.y - 0.42, h.z], 40); };
  S.zoomOut = (o = {}) => (t, u) => { X.table(t, o); const k = ease(clamp(u / 2.3)); stage.aim([TB[0] + 0.9, lerp(1.85, 1.65, k), TB[1] + lerp(1.6, 1.15, k)], [X.seat.you[0], 0.95, X.seat.you[1]], lerp(50, 32, k)); };
  S.legs = (o = {}) => (t, u) => { X.table(t, o); stage.aim([X.seat.you[0] + 0.9, 0.35, X.seat.you[1] + 0.6], [X.seat.you[0], 0.3, X.seat.you[1]], 46); };
  // standing up and the walk to the back (stiff tiny steps) along the path table -> corridor mouth
  const path = u => { const a = new THREE.Vector3(TB[0] + 0.3, 0, TB[1] - 0.9), b = new THREE.Vector3(2.2, 0, -2.6), c = new THREE.Vector3(3.4, 0, -4.3); return u < 0.5 ? a.lerp(b, u * 2) : b.lerp(c, (u - 0.5) * 2); };
  S.walkStiff = (who, x, z, t, facing = 1) => { who.walk(t * 0.55, { speed: 0.45, stride: 0.22, facing }); who.mesh.position.set(x, 0, z); who.mesh.visible = true; };
  S.standUp = (o = {}) => (t, u) => { X.table(t, Object.assign({ youOn: false }, o)); const k = ease(clamp(u / 0.8)); X.put(X.you, X.seat.you[0], lerp(X.SEAT, 0, k), X.seat.you[1] - 0.2 * k, POSE.stiff); stage.aim([TB[0] + 1.8, 1.3, TB[1] - 1.0], [X.seat.you[0], 1.0, X.seat.you[1]], 44); };
  S.track = (p0, p1) => (t, u) => { X.table(t, { youOn: false }); const p = path(lerp(p0, p1, clamp(u / 2))); S.walkStiff(X.you, p.x, p.z, t, 1); stage.aim([p.x + 1.7, 1.3, p.z + 0.7], [p.x, 1.0, p.z], 46); };
  S.feet = (p0, p1) => (t, u) => { X.table(t, { youOn: false }); const p = path(lerp(p0, p1, clamp(u / 2))); S.walkStiff(X.you, p.x, p.z, t, 1); stage.aim([p.x + 1.3, 0.3, p.z + 0.9], [p.x, 0.32, p.z], 46); };
  S.walkFace = (p0, p1) => (t, u) => { X.table(t, { youOn: false }); const p = path(lerp(p0, p1, clamp(u / 2))); S.walkStiff(X.you, p.x, p.z, t, 0); const h = X.head(X.you); stage.aim([h.x - 0.25, h.y + 0.02, h.z - 0.85], [h.x, h.y - 0.02, h.z], 40); };
  S.waiter = (p0) => (t, u) => { X.table(t, { youOn: false }); const p = path(p0 + 0.1 * clamp(u / 1.5)); const k = clamp((u - 0.2) / 0.8); X.put(X.you, p.x - 0.3 * Math.sin(Math.PI * k), 0, p.z, Object.assign({}, POSE.stiff, { facing: -1 })); X.waiter.walk(t, { speed: 1.4, facing: -1 }); X.waiter.mesh.position.set(lerp(3.6, 0.6, clamp(u / 1.6)), 0, p.z - 0.5); X.waiter.mesh.visible = true; stage.aim([p.x + 0.2, 1.5, p.z + 1.9], [p.x, 1.1, p.z], 52); };
  S.corridor = () => (t, u) => { X.bar(t); const z = lerp(-4.6, -8.2, clamp(u / 2.6)); X.you.walk(t * 0.55, { speed: 0.45, stride: 0.22, facing: 0 }); X.you.mesh.position.set(3.4, 0, z); X.you.mesh.visible = true; Wd.corBulb.intensity = Math.sin(t * 37) > 0.6 ? 1.0 : 4; stage.aim([3.35, 1.55, -10.6], [3.4, 1.1, -5.5], 40); };
  // the bathroom door from the corridor; door: radians open (into the bathroom), who: someone at the door
  S.doorOut = (o = {}) => (t, u) => { X.bar(t); Wd.bdoor.userData.open(-(typeof o.door === 'function' ? o.door(u) : (o.door || 0))); if (o.you) { const a = o.you(u); X.put(X.you, a[0], 0, a[1], o.pose || POSE.stiff); } X.queue(t, o.queue || 0); const cam = o.cam || [3.95, 1.4, -8.3]; stage.aim(cam, o.look || [2.85, 1.2, -9.95], o.fov || 48); };
  // inside: the face on the toilet
  S.bathFace = (o = {}) => (t, u) => { X.bath(t, o); const k = ease(clamp(u / (o.dur || 2))); const [x, z] = X.toiletAt(); const h = X.head(X.you); const sh = o.shake ? o.shake * Math.sin(t * 60) : 0; const zMax = -9.1 - h.z; stage.aim([h.x + 0.1 + sh, h.y + 0.04, h.z + Math.min(zMax, lerp(o.d0 || 0.85, o.d1 || 0.65, k) + (X.meia ? 0.25 : 0))], [h.x, h.y - 0.03, h.z], o.fov || (X.meia ? 48 : 42)); };
  S.bathWide = (o = {}) => (t, u) => { X.bath(t, o); const [x, z] = X.toiletAt(); const dx = Math.min(1.2, 2.65 - x); stage.aim([x + dx, 1.55, Math.min(-9.1, z + 0.95)], [x + 0.2, 0.75, z - 0.2], 60); };
  return S;
}
// the mission HUD (red frame, MISSÃO, a distance counting down)
export function missionHUD(c, t, dist, done) {
  const txt = (s, x, y, font, fill) => { c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = fill; c.fillText(s, x, y); };
  c.save(); const pulse = 0.5 + 0.5 * Math.sin(t * 9);
  c.strokeStyle = `rgba(255,60,50,${0.35 + 0.25 * pulse})`; c.lineWidth = 10; c.strokeRect(36, 36, 1008, 1848);
  for (const [x, y, sx, sy] of [[60, 60, 1, 1], [1020, 60, -1, 1], [60, 1860, 1, -1], [1020, 1860, -1, -1]]) { c.strokeStyle = '#ff3b30'; c.lineWidth = 12; c.beginPath(); c.moveTo(x, y + sy * 90); c.lineTo(x, y); c.lineTo(x + sx * 90, y); c.stroke(); }
  c.fillStyle = 'rgba(8,9,12,0.72)'; c.beginPath(); c.roundRect(150, 260, 780, 170, 24); c.fill();
  txt('MISSÃO: BANHEIRO', 540, 310, '700 60px Oswald', '#ff5a4f'); txt(done ? 'ALVO ALCANÇADO ✓' : `DISTÂNCIA: ${dist.toFixed(1).replace('.', ',')} m`, 540, 385, '700 46px "JetBrains Mono"', done ? '#4fe08a' : '#f3eee4');
  c.restore();
}
