// EPISÓDIO 1: O PRIMEIRO CÓDIGO
// 0-5 voo pelo escuro enquanto a cidade de código se ergue · 5-10 partículas formam Rodrigo diante do terminal
// 10-15 o toque dispara os fluxos de dados · 15-20 a estrutura luminosa com a inscrição
import { THREE, PAL, V3, rng, lerp, sstep, pulse, clamp, canvas2d, makeHolo, makeCodeField, makeCity, makeGrid, makeFlows, makeNode, makeLabel, makePoints, CODE, ADD, U } from '../core.js';

export default function ep1({ char }) {
  const group = new THREE.Group(), r = rng(101);
  const S = {
    cam: { x: 0, y: 16, z: 95, tx: 0, ty: 6, tz: 0 }, fx: { fade: 1, neb: 0.1, stars: 0.3, dust: 0.3 },
    grow: 0, code: 0, asm: 0, form: 0, term: 0, touch: 0, flows: 0, ripple: 0, struct: 0, text: 0, armR: 0,
  };

  const city = makeCity({ seed: 7, cols: 36, rows: 46, cell: 3.4, avenue: 4.2, hVar: 15, origin: [0, 0, 18], plaza: 9 });
  const grid = makeGrid({ cell: 3.4, color: PAL.blue });
  const code = makeCodeField({ count: 620, seed: 3, box: [44, 30, 70], size: [0.18, 0.5], drift: [0, 0.5, 0], near: 3 });
  group.add(city, grid, code);

  const asm = char.makeAssembly(11000); group.add(asm);

  // terminal holográfico: código sendo digitado
  const [tc, tx] = canvas2d(768, 448);
  const term = makeHolo(1.25, 0.73, tc); term.position.set(0, 1.12, 0.62); term.rotation.x = -0.32; group.add(term);
  function drawTerm(t) {
    tx.clearRect(0, 0, 768, 448);
    tx.fillStyle = 'rgba(8,24,60,.55)'; tx.strokeStyle = '#3fd8ff'; tx.lineWidth = 3; tx.beginPath(); tx.roundRect(3, 3, 762, 442, 10); tx.fill(); tx.stroke();
    tx.fillStyle = '#3fd8ff'; tx.fillRect(3, 3, 762, 34); tx.fillStyle = '#021030'; tx.font = '700 20px "JetBrains Mono"'; tx.textBaseline = 'middle'; tx.fillText('rodrigo@nifi:~/fluxos  $', 14, 21);
    tx.font = '500 19px "JetBrains Mono"';
    const typed = Math.max(0, t - 8.4) * 46; let acc = 0;
    for (let i = 0; i < 13; i++) {
      const s = CODE[(i * 5 + 2) % CODE.length].slice(0, 58), n = clamp(typed - acc, 0, s.length); acc += s.length;
      tx.fillStyle = i % 4 === 1 ? '#b46bff' : i % 3 === 0 ? '#ffffff' : '#7fdcff'; tx.fillText(s.slice(0, n), 16, 62 + i * 29);
      if (n > 0 && n < s.length) { tx.fillStyle = '#fff'; tx.fillRect(18 + tx.measureText(s.slice(0, n)).width, 50 + i * 29, 11, 22); }
    }
    if (S.touch > 0) { const g = tx.createRadialGradient(560, 250, 0, 560, 250, 60 + S.ripple * 520); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.85, `rgba(120,220,255,${(1 - S.ripple) * .9})`); g.addColorStop(1, 'rgba(255,255,255,0)'); tx.fillStyle = g; tx.fillRect(0, 0, 768, 448); }
    term.userData.tex.needsUpdate = true;
  }

  // servidores e APIs em volta, e os fluxos entre eles
  const NAMES = ['API', 'ERP', 'TMS', 'KAFKA', 'POSTGRES', 'WMS', 'SFTP', 'REST', 'S3', 'CRM', 'MQTT', 'ETL', 'OAUTH', 'WEBHOOK'];
  const nodes = [], nodeG = new THREE.Group(); group.add(nodeG);
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI * 0.08 + (i / 25) * Math.PI * 1.16, rad = 4.2 + r() * 6.5, p = V3(Math.cos(a) * rad, 0.8 + r() * 7.5, -Math.sin(a) * rad * 0.9 - 0.5);
    const n = makeNode(0.2 + r() * 0.16, i % 3 === 0 ? PAL.purple : i % 3 === 1 ? PAL.cyan : PAL.blue, i % 2 ? 'box' : 'octa'); n.position.copy(p); nodeG.add(n);
    if (i < NAMES.length) { const l = makeLabel(NAMES[i], { size: 0.22, font: '700 48px Rajdhani', color: '#bfe6ff' }); l.position.set(p.x, p.y + 0.5, p.z); nodeG.add(l); n.userData.label = l; }
    nodes.push({ p, n, delay: r() * 1.6 });
  }
  const src = V3(0.25, 1.2, 0.62), fl = [];
  nodes.forEach((n, i) => fl.push({ a: src, b: n.p, c: V3(n.p.x * 0.4, n.p.y + 1.5 + r() * 2, n.p.z * 0.3 + 1), color: i % 3 ? PAL.cyan : PAL.violet, n: 9, speed: 0.22 + r() * 0.2, delay: n.delay }));
  for (let k = 0; k < 150; k++) {
    const a = nodes[Math.floor(r() * nodes.length)], b = nodes[Math.floor(r() * nodes.length)]; if (a === b) continue;
    const mid = a.p.clone().add(b.p).multiplyScalar(0.5); mid.y += 1 + r() * 3; mid.z += (r() - .5) * 3;
    fl.push({ a: a.p, b: b.p, c: mid, color: [PAL.blue, PAL.cyan, PAL.purple][k % 3], n: 5, speed: 0.15 + r() * 0.3, delay: 0.8 + Math.max(a.delay, b.delay) + r() * 1.5 });
  }
  const flows = makeFlows(fl, { size: 0.11, lineOpacity: 0.3 }); group.add(flows);

  // estrutura luminosa atrás dele: anéis, feixes e o painel com a inscrição
  const st = new THREE.Group(); st.position.set(0, 0, -4.2); group.add(st);
  const rings = [];
  for (let i = 0; i < 4; i++) {
    const g = new THREE.TorusGeometry(2.55 + i * 0.36, 0.018 + (i === 0 ? 0.02 : 0), 6, 120, Math.PI * (1.2 + (i % 2) * 0.5));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: [PAL.cyan, PAL.blue, PAL.purple, PAL.silver][i], ...ADD })); m.position.y = 5.6; st.add(m); rings.push(m);
  }
  const beams = [];
  for (let i = 0; i < 9; i++) {
    const x = (i - 4) * 0.85, m = new THREE.Mesh(new THREE.PlaneGeometry(0.05 + (i % 2) * 0.05, 1), new THREE.MeshBasicMaterial({ color: i % 2 ? PAL.blue : PAL.cyan, ...ADD, opacity: 0.55 }));
    m.position.set(x, 0, -0.4 - Math.abs(i - 4) * 0.25); st.add(m); beams.push(m);
  }
  const [ic, ix] = canvas2d(1536, 512);
  ix.strokeStyle = '#3fd8ff'; ix.lineWidth = 4; ix.strokeRect(10, 10, 1516, 492);
  for (const [x, y] of [[10, 10], [1526, 10], [10, 502], [1526, 502]]) { ix.fillStyle = '#fff'; ix.fillRect(x - 10, y - 10, 20, 20); }
  ix.textAlign = 'center'; ix.textBaseline = 'middle'; ix.fillStyle = '#fff'; ix.shadowColor = '#1f7bff'; ix.shadowBlur = 14;
  ix.font = '900 150px Orbitron'; ix.fillText('RODRIGO HAJIME', 768, 190);
  ix.fillStyle = '#3fd8ff'; ix.fillRect(418, 300, 700, 4);
  ix.font = '700 62px Orbitron'; ix.fillStyle = '#9fdcff'; ix.fillText('DATA INTEGRATION ANALYST', 768, 390);
  const title = makeHolo(4.7, 4.7 / 3, ic); title.position.set(0, 5.6, 0.2); st.add(title);
  const halo = makePoints((() => { const a = new Float32Array(1500 * 3); for (let i = 0; i < 1500; i++) { const an = r() * 6.283, rd = 2.4 + r() * 2.6; a.set([Math.cos(an) * rd, 5.6 + Math.sin(an) * rd, (r() - .5) * 1.5], i * 3); } return a; })(), { size: 0.05, color: PAL.cyan, twinkle: 1 });
  st.add(halo);

  function script(tl) {
    const c = S.cam;
    tl.to(S, { grow: 4.6, duration: 6.2, ease: 'power1.out' }, 0.2)
      .to(S, { code: 1, duration: 4, ease: 'none' }, 0.3)
      .to(S.fx, { neb: 0.7, stars: 1, dust: 0.7, duration: 5 }, 0)
      .to(c, { z: 12, y: 3.2, ty: 2.2, duration: 5.2, ease: 'power2.inOut' }, 0)
      .to(c, { z: 5.0, y: 1.75, ty: 1.3, x: 0.5, duration: 4.5, ease: 'power2.inOut' }, 5.0)
      .to(S, { asm: 1, duration: 3.4, ease: 'power1.inOut' }, 5.1)
      .to(S, { form: 1, duration: 1.3, ease: 'power1.inOut' }, 7.7)
      .to(S, { term: 1, duration: 0.9, ease: 'power2.out' }, 8.3)
      .to(S, { armR: 1, duration: 0.9, ease: 'power2.inOut' }, 9.8)
      .set(S, { touch: 1 }, 10.7)
      .to(S, { ripple: 1, duration: 1.2, ease: 'power2.out' }, 10.7)
      .to(S.fx, { flash: 0.35, duration: 0.08 }, 10.7).to(S.fx, { flash: 0, duration: 0.6 }, 10.78)
      .to(S, { flows: 6, duration: 6, ease: 'none' }, 10.7)
      .to(c, { z: 8.4, y: 2.5, ty: 2.4, x: -0.6, duration: 4.6, ease: 'power1.inOut' }, 10.4)
      .to(S, { armR: 0.15, duration: 1.2, ease: 'power2.inOut' }, 13.2)
      .to(S, { struct: 1, duration: 2.4, ease: 'power2.out' }, 14.8)
      .to(S, { text: 1, duration: 1.2, ease: 'power1.inOut' }, 15.9)
      .to(c, { z: 10.6, y: 1.5, ty: 3.7, x: 0, duration: 3.2, ease: 'power2.inOut' }, 14.6)
      .to(S.fx, { flash: 0.25, duration: 0.1 }, 15.9).to(S.fx, { flash: 0, duration: 0.8 }, 16.0);
  }

  function update(t, T) {
    city.userData.u.uGrow.value = S.grow; grid.userData.u.uOpacity.value = sstep(0.5, 3, t) * 0.8;
    code.userData.u.uReveal.value = S.code; code.userData.u.uOrigin.value.set(0, 8, S.cam.z - 30); code.userData.u.uOpacity.value = lerp(1, 0.4, sstep(5, 9, t)) * lerp(1, 0.5, sstep(14.5, 16.5, t));
    asm.userData.u.uP.value = S.asm; asm.userData.u.uOpacity.value = 1 - sstep(8.3, 9.6, t) * 0.92; asm.visible = t > 5;
    char.setForm(S.form);
    const br = Math.sin(T * 1.6) * 0.012, a = S.armR;
    char.pose({ armR: [lerp(0.05, -1.25, a), lerp(-0.1, -0.12, a), lerp(-0.12, -0.35, a)], armL: [0.05 + br, 0.1, -0.15], spine: [br + a * 0.05, -a * 0.12], head: [lerp(0.12, -0.18, sstep(15, 17, t)) + (a > 0.5 && t < 14 ? 0.1 : 0), 0], bob: br * 0.3 });
    term.userData.u.uReveal.value = S.term; term.visible = S.term > 0.01; term.userData.u.uOpacity.value = lerp(1, 0.55, sstep(15, 17, t));
    if (term.visible) drawTerm(t);
    flows.userData.u.uReveal.value = S.flows; flows.visible = S.flows > 0;
    nodes.forEach(n => { const k = sstep(n.delay, n.delay + 0.7, S.flows); n.n.scale.setScalar(k * (1 + 0.08 * Math.sin(T * 3 + n.delay * 9))); n.n.rotation.y = T * 0.5 + n.delay; n.n.visible = k > 0.01; if (n.n.userData.label) n.n.userData.label.material.opacity = k * 0.9; });
    st.visible = S.struct > 0.001;
    rings.forEach((m, i) => { m.rotation.z = T * (0.25 + i * 0.12) * (i % 2 ? -1 : 1) + i; m.scale.setScalar(lerp(0.2, 1, S.struct)); m.material.opacity = S.struct * 0.55; });
    beams.forEach((m, i) => { const h = S.struct * (9 + (i % 3) * 2.5) * sstep(i * 0.04, 0.5 + i * 0.04, S.struct); m.scale.y = Math.max(0.001, h); m.position.y = h / 2; m.material.opacity = 0.16 + 0.06 * Math.sin(T * 4 + i); });
    title.userData.u.uReveal.value = S.text; title.visible = S.text > 0.001; title.userData.u.uOpacity.value = 0.8; halo.userData.u.uOpacity.value = S.struct;
  }
  return { group, S, script, update };
}
