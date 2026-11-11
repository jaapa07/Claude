// EPISÓDIO 4: A ERA DA INTELIGÊNCIA
// 0-5 a IA surge como uma esfera de partículas · 5-10 Rodrigo liga seus fluxos a agentes inteligentes
// 10-15 as interfaces preveem falhas, acham anomalias e corrigem rotas · 15-20 uma nova cidade se constrói diante dele
import { THREE, PAL, V3, U, rng, lerp, sstep, pulse, clamp, canvas2d, makeHolo, makeFlows, makeLabel, makeGrid, makeNode, makeCity, makePoints, GLSL_NOISE, ADD } from '../core.js';

export default function ep4({ char }) {
  const group = new THREE.Group(), r = rng(404);
  const C0 = V3(0, 5.4, -7), R = 3.1;
  const S = {
    cam: { x: 0, y: 5.0, z: 2.2, tx: 0, ty: 5.4, tz: -7, shake: 0.012 }, fx: { neb: 0.55, bloom: 0.75 },
    ai: 0, conn: 0, hud: 0, city: 0, rise: 0, arms: 0, look: 0.3,
  };
  const grid = makeGrid({ cell: 2.5, color: PAL.purple }); group.add(grid);

  // ------------------------------------------------------------ a esfera da IA
  const NP = 110000, dir = new Float32Array(NP * 3), start = new Float32Array(NP * 3), sd = new Float32Array(NP);
  for (let i = 0; i < NP; i++) {
    const y = 1 - 2 * (i + .5) / NP, rad = Math.sqrt(1 - y * y), a = i * 2.399963, shell = Math.pow(r(), 0.35);
    dir.set([Math.cos(a) * rad * shell, y * shell, Math.sin(a) * rad * shell], i * 3);
    const b = r() * 6.283, rr = 8 + r() * 30; start.set([Math.cos(b) * rr, (r() - .3) * 30, Math.sin(b) * rr - 10], i * 3); sd[i] = r();
  }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(dir, 3)); sg.setAttribute('aStart', new THREE.BufferAttribute(start, 3)); sg.setAttribute('aS', new THREE.BufferAttribute(sd, 1));
  const su = { uTime: U.uTime, uPx: U.uPx, uForm: { value: 0 }, uC: { value: C0.clone() }, uR: { value: R }, uPulse: { value: 0 } };
  const sphere = new THREE.Points(sg, new THREE.ShaderMaterial({
    ...ADD, uniforms: su,
    vertexShader: `attribute vec3 aStart; attribute float aS; uniform float uTime,uPx,uForm,uR,uPulse; uniform vec3 uC; varying float vA,vN,vS; ${GLSL_NOISE}
      void main(){ vec3 d=position; float n=fbm(normalize(d)*2.4+vec3(0.,uTime*.22,uTime*.1)); float n2=noise3(normalize(d)*7.-uTime*.5);
        float rad=uR*(1.+.42*(n-.5)+.07*n2+.05*sin(uTime*2.2)+uPulse*.12*sin(length(d)*9.-uTime*6.));
        vec3 p=d*rad; float a=uTime*.18+d.y*.9*sin(uTime*.27); p.xz=mat2(cos(a),-sin(a),sin(a),cos(a))*p.xz;
        float f=clamp(uForm*1.6-aS*.6,0.,1.); f=f*f*(3.-2.*f); vec3 s=aStart; float sa=(1.-f)*2.; s.xz=mat2(cos(sa),-sin(sa),sin(sa),cos(sa))*s.xz;
        vec3 q=mix(s,p+uC,f); vec4 mv=viewMatrix*modelMatrix*vec4(q,1.); gl_Position=projectionMatrix*mv;
        gl_PointSize=max(1.2,(.028+.03*aS*aS)*uPx/-mv.z); vN=n; vS=aS; vA=(.25+.75*f)*(.5+n2*.9)*smoothstep(.0,.2,uForm); }`,
    fragmentShader: `varying float vA,vN,vS; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d);
      vec3 c=mix(vec3(.1,.42,1.),vec3(.62,.3,1.),smoothstep(.35,.65,vN)); c=mix(c,vec3(.6,.95,1.),step(.93,vS)); gl_FragColor=vec4(c*a*a*vA*.23,1.); }`,
  }));
  sphere.frustumCulled = false; group.add(sphere);
  const heart = makePoints(new Float32Array([0, 0, 0]), { size: 4.5, color: new THREE.Color(0.2, 0.4, 1), opacity: 0 }); group.add(heart);

  // ------------------------------------------------------------ fluxos de Rodrigo, agentes e conexões
  const ZC = 3.2, pipeN = [];
  for (let i = 0; i < 5; i++) { const n = makeNode(0.11, i % 2 ? PAL.cyan : PAL.blue, 'box'); n.position.set((i - 2) * 0.55, 1.5 + Math.abs(i - 2) * -0.06, ZC - 1.3); group.add(n); pipeN.push(n); }
  const AG = ['MONITOR', 'ROTEADOR', 'REPARO', 'PREVISÃO', 'VALIDAÇÃO', 'ALERTA', 'APRENDIZ', 'ORQUESTRA'];
  const agents = AG.map((s, i) => {
    const a = Math.PI * (0.08 + 0.84 * i / (AG.length - 1)), p = V3(-Math.cos(a) * 4.4, C0.y - 1.0 + Math.sin(a) * 3.6 + (i % 2) * 0.5, C0.z + 2.6 + Math.sin(a) * 1.2);
    const n = makeNode(0.24, i % 2 ? PAL.violet : PAL.cyan, 'octa'); n.position.copy(p); group.add(n);
    const l = makeLabel(s, { size: 0.2, font: '700 44px Rajdhani', color: '#e6dcff' }); l.position.set(p.x, p.y - 0.42, p.z); group.add(l);
    return { p, n, l, delay: 0.4 + i * 0.3 };
  });
  const fl = [];
  for (let i = 0; i < 4; i++) fl.push({ a: pipeN[i].position, b: pipeN[i + 1].position, c: pipeN[i].position.clone().lerp(pipeN[i + 1].position, .5).add(V3(0, 0.12, 0)), color: PAL.cyan, n: 6, speed: 0.6, delay: 0 });
  agents.forEach((g, i) => {
    const s = pipeN[i % 5].position; fl.push({ a: s, b: g.p, c: s.clone().lerp(g.p, .5).add(V3(g.p.x * 0.3, 0.5, 1.2)), color: i % 2 ? PAL.violet : PAL.cyan, n: 14, speed: 0.3, delay: g.delay });
    fl.push({ a: g.p, b: C0, c: g.p.clone().lerp(C0, .5).add(V3(0, 1.2, 0.8)), color: i % 2 ? PAL.purple : PAL.blue, n: 16, speed: 0.4, delay: g.delay + 0.9 });
    if (i < AG.length - 1) fl.push({ a: g.p, b: agents[i + 1].p, c: g.p.clone().lerp(agents[i + 1].p, .5).add(V3(0, 0.5, 1)), color: PAL.silver, n: 4, speed: 0.3, delay: g.delay + 1.5 });
  });
  const flows = makeFlows(fl, { size: 0.085, lineOpacity: 0.5 }); group.add(flows);

  // ------------------------------------------------------------ interfaces preditivas (canvas -> hologramas)
  const mk = (w, h, x, y, z, ry) => { const [c, g] = canvas2d(640, 400), m = makeHolo(w, w * 400 / 640, c); m.position.set(x, y, z); m.rotation.y = ry; group.add(m); return { c, g, m }; };
  const panels = [mk(1.75, 0, -1.02, 3.35, 1.4, 0.22), mk(1.75, 0, 1.02, 3.35, 1.4, -0.22), mk(2.1, 0, 0, 4.75, 0.9, 0)];
  const frame = (g, title, color = '#3fd8ff') => { g.clearRect(0, 0, 640, 400); g.fillStyle = 'rgba(6,14,40,.8)'; g.strokeStyle = color; g.lineWidth = 3; g.beginPath(); g.roundRect(3, 3, 634, 394, 12); g.fill(); g.stroke();
    g.fillStyle = color; g.font = '700 26px Orbitron'; g.textBaseline = 'middle'; g.textAlign = 'left'; g.fillText(title, 22, 34); g.fillRect(22, 56, 596, 2); };
  const tagc = (g, s, color, y = 366) => { g.font = '700 30px Rajdhani'; g.fillStyle = color; g.textAlign = 'left'; g.fillText(s, 22, y); };
  const sig = x => 0.5 + 0.22 * Math.sin(x * 1.7) + 0.12 * Math.sin(x * 4.3 + 1) + 0.06 * Math.sin(x * 9.1);
  function drawPanels(t) {
    const RED = '#ff3355', CY = '#3fd8ff', OK = '#7dffb0';
    { const { g, m } = panels[0]; frame(g, 'PREVISÃO DE FALHAS');                       // série temporal + previsão
      const now = 420, fixed = t > 12.9; g.lineWidth = 3; g.strokeStyle = CY; g.beginPath();
      for (let x = 22; x <= now; x += 4) { const v = sig((x + t * 60) / 60); g[x === 22 ? 'moveTo' : 'lineTo'](x, 300 - v * 200); } g.stroke();
      g.setLineDash([8, 7]); g.strokeStyle = fixed ? OK : RED; g.beginPath();
      for (let x = now; x <= 618; x += 4) { const v = sig((x + t * 60) / 60) + (fixed ? 0 : Math.exp(-Math.pow((x - 540) / 34, 2)) * 0.45); g[x === now ? 'moveTo' : 'lineTo'](x, 300 - v * 200); } g.stroke(); g.setLineDash([]);
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = 2; g.beginPath(); g.moveTo(now, 70); g.lineTo(now, 330); g.stroke();
      if (!fixed && t > 10.8) { g.strokeStyle = RED; g.lineWidth = 3; g.beginPath(); g.arc(540, 130, 22 + 6 * Math.sin(t * 9), 0, 6.283); g.stroke(); }
      tagc(g, t < 10.8 ? 'analisando padrões…' : fixed ? '✓ FALHA EVITADA' : '⚠ FALHA PREVISTA EM 04:12', t < 10.8 ? CY : fixed ? OK : RED); m.userData.tex.needsUpdate = true; }
    { const { g, m } = panels[1]; frame(g, 'ANOMALIAS', '#b46bff');                      // nuvem de pontos com um intruso
      const rr = rng(9); for (let i = 0; i < 90; i++) { const x = 60 + rr() * 520, y = 90 + rr() * 220, w = Math.sin(t * 2 + i) * 3; g.fillStyle = 'rgba(160,200,255,.75)'; g.fillRect(x + w, y, 7, 7); }
      const found = t > 11.6, iso = t > 13.4, ax = 452, ay = 152;
      g.fillStyle = found && !iso ? RED : iso ? OK : 'rgba(160,200,255,.75)'; g.fillRect(ax - 7, ay - 7, 15, 15);
      if (found) { g.strokeStyle = iso ? OK : RED; g.lineWidth = 3; g.beginPath(); g.arc(ax, ay, 26 + (iso ? 0 : 8 * Math.sin(t * 10)), 0, 6.283); g.stroke(); g.beginPath(); g.moveTo(ax + 30, ay - 30); g.lineTo(ax + 80, ay - 66); g.stroke(); }
      const sx = 22 + ((t * 170) % 600); g.fillStyle = 'rgba(180,107,255,.35)'; g.fillRect(sx, 62, 5, 268);
      tagc(g, !found ? 'varrendo 12.480 eventos…' : iso ? '✓ ANOMALIA ISOLADA' : '⚠ ANOMALIA DETECTADA', !found ? '#b46bff' : iso ? OK : RED); m.userData.tex.needsUpdate = true; }
    { const { g, m } = panels[2]; frame(g, 'ROTAS DE DADOS');                            // grafo: rota quebra e é refeita
      const P = { A: [70, 200], B: [250, 130], C: [430, 130], D: [570, 200], E: [320, 290] }, broke = t > 12.2, fixed = t > 13.6;
      const edge = (a, b, col, w = 4, dash = false) => { g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash ? [10, 8] : []); g.beginPath(); g.moveTo(...P[a]); g.lineTo(...P[b]); g.stroke(); g.setLineDash([]); };
      edge('A', 'B', CY); edge('B', 'C', broke ? RED : CY, 4, broke); edge('C', 'D', broke && !fixed ? 'rgba(120,140,180,.5)' : CY);
      edge('A', 'E', fixed ? OK : 'rgba(120,140,180,.45)', fixed ? 6 : 3); edge('E', 'D', fixed ? OK : 'rgba(120,140,180,.45)', fixed ? 6 : 3);
      if (broke) { g.strokeStyle = RED; g.lineWidth = 6; g.beginPath(); g.moveTo(322, 112); g.lineTo(358, 148); g.moveTo(358, 112); g.lineTo(322, 148); g.stroke(); }
      for (const k in P) { g.fillStyle = '#061030'; g.strokeStyle = '#fff'; g.lineWidth = 3; g.beginPath(); g.arc(...P[k], 17, 0, 6.283); g.fill(); g.stroke(); }
      const path = fixed ? ['A', 'E', 'D'] : ['A', 'B', 'C', 'D'], u = (t * 0.7) % 1, seg = Math.min(path.length - 2, Math.floor(u * (path.length - 1))), f = u * (path.length - 1) - seg;
      if (!broke || fixed) { const a = P[path[seg]], b = P[path[seg + 1]]; g.fillStyle = '#fff'; g.beginPath(); g.arc(lerp(a[0], b[0], f), lerp(a[1], b[1], f), 9, 0, 6.283); g.fill(); }
      tagc(g, !broke ? 'rotas estáveis' : fixed ? '✓ ROTA CORRIGIDA' : '⚠ ROTA INTERROMPIDA', !broke ? CY : fixed ? OK : RED); m.userData.tex.needsUpdate = true; }
  }

  // ------------------------------------------------------------ a nova cidade
  const city = makeCity({ seed: 21, cols: 30, rows: 44, cell: 3.8, avenue: 5, hBase: 3, hVar: 20, spires: 0.16, color: PAL.purple, color2: PAL.cyan, origin: [0, 0, -12] }); group.add(city);
  city.userData.u.uFog.value = 0.008;

  function script(tl) {
    const c = S.cam;
    tl.to(S, { ai: 1, duration: 4.6, ease: 'power1.inOut' }, 0.2)
      .to(c, { x: 0.8, y: 2.3, z: 9.6, ty: 3.9, tz: -4, duration: 5.2, ease: 'power2.inOut' }, 0.6)
      .to(S, { arms: 1, duration: 1, ease: 'power2.inOut' }, 5).to(S, { conn: 6.5, duration: 6, ease: 'none' }, 5.1)
      .to(S, { hud: 1, duration: 2.2, ease: 'none' }, 9.9).to(S, { arms: 0.45, duration: 1.2, ease: 'power2.inOut' }, 10.2)
      .to(c, { x: 0.1, y: 2.6, z: 9.2, ty: 3.8, duration: 4.6, ease: 'sine.inOut' }, 10)
      .to(S, { hud: 0, duration: 1.0 }, 14.6)
      .to(S.fx, { flash: 0.3, duration: 0.1 }, 15).to(S.fx, { flash: 0, duration: 0.9 }, 15.1)
      .to(S, { rise: 1, duration: 4.4, ease: 'power2.inOut' }, 14.8).to(S, { city: 4.4, duration: 5.2, ease: 'power1.out' }, 14.8)
      .to(S, { arms: 0, look: 1, duration: 1.8, ease: 'power2.inOut' }, 15)
      .to(c, { x: 0, y: 2.0, z: 9.8, ty: 5.8, tz: -22, duration: 4.6, ease: 'power2.inOut' }, 15);
  }

  function update(t, T) {
    const C = su.uC.value.set(C0.x, C0.y + S.rise * 8.5, C0.z - S.rise * 16); su.uForm.value = S.ai; su.uR.value = R * (1 + S.rise * 0.9); su.uPulse.value = pulse(t, 10, 15, 1);
    heart.position.copy(C); heart.userData.u.uOpacity.value = S.ai * 0.12 * (1 + S.rise);
    grid.userData.u.uOpacity.value = 0.45;
    const fade = 1 - S.rise;
    flows.userData.u.uReveal.value = S.conn; flows.userData.u.uOpacity.value = fade; flows.visible = S.conn > 0 && fade > 0.01;
    pipeN.forEach((n, i) => { const k = sstep(4.6 + i * 0.1, 5.3 + i * 0.1, t) * fade; n.scale.setScalar(k); n.visible = k > 0.01; n.rotation.y = T * 0.8; });
    agents.forEach((g, i) => { const k = sstep(g.delay, g.delay + 0.6, S.conn) * fade; g.n.scale.setScalar(k * (1 + 0.1 * Math.sin(T * 2.5 + i))); g.n.visible = k > 0.01; g.n.rotation.set(T * 0.4 + i, T * 0.7, 0); g.n.position.y = g.p.y + Math.sin(T * 1.3 + i) * 0.08; g.l.material.opacity = k; });
    const ph = S.hud; panels.forEach((p, i) => { const k = sstep(i * 0.25, i * 0.25 + 0.5, ph); p.m.visible = k > 0.001; p.m.userData.u.uReveal.value = k; p.m.userData.u.uOpacity.value = 1.15; p.m.position.y += 0; });
    if (ph > 0.001) drawPanels(t);
    city.userData.u.uGrow.value = S.city; city.visible = S.city > 0;
    char.root.position.set(0, 0, ZC); char.root.rotation.y = Math.PI; char.setForm(1);
    const a = S.arms, w = Math.sin(T * 2.2), w2 = Math.sin(T * 1.6 + 1);
    char.pose({ armL: [lerp(0.05, -1.35 + w * 0.25, a), lerp(0.1, 0.35, a), lerp(-0.12, -0.7 + w2 * 0.3, a)], armR: [lerp(0.05, -1.55 - w2 * 0.25, a), lerp(-0.1, -0.35, a), lerp(-0.12, -0.6 - w * 0.3, a)],
      spine: [-0.06 * a - 0.1 * S.look, w * 0.05 * a], head: [-0.42 * S.look, w2 * 0.08 * a], bob: Math.sin(T * 1.6) * 0.004 });
  }
  return { group, S, script, update };
}
