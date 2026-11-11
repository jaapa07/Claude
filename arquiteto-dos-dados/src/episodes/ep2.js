// EPISÓDIO 2: O CAOS DOS DADOS
// 0-5 mensagens JSON/XML/HTTP voando sem controle · 5-10 erros 500, timeouts e alertas vermelhos
// 10-15 Rodrigo organiza tudo em um fluxo no estilo do Apache NiFi · 15-20 a rede estabiliza em energia azul
import { THREE, PAL, V3, U, rng, lerp, sstep, pulse, clamp, codeAtlas, CODE, makeHolo, makeFlows, makeLabel, makeGrid, makePoints, processorCanvas, GLSL_NOISE, ADD } from '../core.js';

export default function ep2({ char }) {
  const group = new THREE.Group(), r = rng(202);
  const S = {
    cam: { x: -1.2, y: 5.2, z: 10.5, tx: 0, ty: 4.6, tz: -3, shake: 0.06, roll: 0.06 }, fx: { glitch: 0.25, aberr: 0.004, neb: 0.5, dust: 0.6 },
    order: 0, cards: 0, lanes: 0, form: 0, arms: 0, net: 0, chaos: 1, err: 0, energy: 0,
  };
  group.add(makeGrid({ cell: 2.5, color: PAL.purple }));

  // o fluxo: processadores em cartões e as conexões entre eles
  const WZ = -3, PROC = [
    ['ConsumeKafka', 'kafka · eventos', -1.75, 7.9], ['ListenHTTP', 'http · webhooks', 1.75, 7.9], ['RepairXmlJson', 'conserta payloads', 0, 6.45],
    ['RouteOnAttribute', 'roteia por tipo', 0, 5.0], ['JoltTransformJSON', 'json -> json', -1.75, 3.55], ['JsonToXmlTemplate', 'json -> xml', 1.75, 3.55],
    ['PutDatabaseRecord', 'postgresql', -1.75, 2.1], ['InvokeHTTP', 'api do cliente', 1.75, 2.1],
  ];
  const cards = PROC.map(([n, s, x, y], i) => {
    const m = makeHolo(1.72, 0.645, processorCanvas(n, s, i === 2 || i === 5 ? '#b46bff' : '#3fd8ff')); m.position.set(x, y, WZ); group.add(m); return m;
  });
  const P = i => V3(PROC[i][2], PROC[i][3], WZ + 0.02);
  const LANES = [[0, 2], [1, 2], [2, 3], [3, 4], [3, 5], [4, 6], [5, 7]].map(([a, b]) => {
    const pa = P(a).add(V3(0, -0.34, 0)), pb = P(b).add(V3(0, 0.34, 0)); return { a: pa, b: pb, c: V3(pa.x, pb.y + 0.25, WZ + 0.02) };
  });
  const lanes = makeFlows(LANES.map((l, i) => ({ ...l, color: PAL.cyan, n: 0, delay: i * 0.25 })), { lineOpacity: 0.8 }); group.add(lanes);

  // enxame de mensagens: no caos elas rodopiam; em ordem viram pacotes correndo pelas conexões
  const { tex, widths } = codeAtlas();
  const kinds = CODE.map(s => /^[{\["]/.test(s) ? 0 : /^</.test(s) ? 1 : /^(GET|POST|PUT|HTTP|Content|Authorization|x-|curl)/.test(s) ? 2 : -1);
  const rows = kinds.map((k, i) => [k, i]).filter(a => a[0] >= 0), NM = 420;
  const seed = new Float32Array(NM * 12), corner = new Float32Array(NM * 8), info = new Float32Array(NM * 16), la = new Float32Array(NM * 12), lc = new Float32Array(NM * 12), lb = new Float32Array(NM * 12), col = new Float32Array(NM * 12), idx = [];
  for (let i = 0; i < NM; i++) {
    const [kind, row] = rows[Math.floor(r() * rows.length)], sd = [r(), r(), r()], s = r(), ln = LANES[i % LANES.length], c = [PAL.cyan, PAL.violet, PAL.silver][kind];
    [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]].forEach((q, k) => {
      const j = i * 4 + k; seed.set(sd, j * 3); corner.set(q, j * 2); info.set([row, widths[row], 0.1 + s * 0.11, s], j * 4);
      la.set(ln.a.toArray(), j * 3); lc.set(ln.c.toArray(), j * 3); lb.set(ln.b.toArray(), j * 3); col.set([c.r, c.g, c.b], j * 3);
    });
    idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  }
  const mg = new THREE.BufferGeometry();
  for (const [n, a, k] of [['position', seed, 3], ['aCorner', corner, 2], ['aInfo', info, 4], ['aA', la, 3], ['aC', lc, 3], ['aB', lb, 3], ['color', col, 3]]) mg.setAttribute(n, new THREE.BufferAttribute(a, k));
  mg.setIndex(idx);
  const mu = { map: { value: tex }, uTime: U.uTime, uOrder: { value: 0 }, uAlert: { value: 0 }, uChaos: { value: 1 }, uOpacity: { value: 1 } };
  const swarm = new THREE.Mesh(mg, new THREE.ShaderMaterial({
    ...ADD, uniforms: mu,
    vertexShader: `attribute vec2 aCorner; attribute vec4 aInfo; attribute vec3 aA,aC,aB,color; uniform float uTime,uOrder,uAlert,uChaos,uOpacity; varying vec2 vUv; varying vec3 vC; varying float vA,vK;
      vec3 bez(vec3 a,vec3 c,vec3 b,float t){ float u=1.-t; return u*u*a+2.*u*t*c+t*t*b; }
      void main(){ float s=aInfo.w, tt=uTime*(.35+s*.9)*uChaos+s*20.;
        vec3 ch=vec3(sin(tt*1.3+position.x*6.28)*(2.+5.5*s), 4.8+sin(tt*1.1+position.y*6.28)*4.6, -5.+cos(tt*.9+position.z*6.28)*5.5);
        ch+=vec3(sin(tt*4.1+s*40.),cos(tt*3.3+s*20.),sin(tt*2.7+s*70.))*(.5+uAlert*.9);
        float k=smoothstep(s*.62,s*.62+.38,uOrder); float lt=fract(s*7.+uTime*.14*(.7+s)); vec3 ln=bez(aA,aC,aB,lt);
        vec3 c=mix(ch,ln,k*k*(3.-2.*k)); vec4 mv=viewMatrix*modelMatrix*vec4(c,1.);
        float ang=(1.-k)*(tt*1.7+s*30.); vec2 q=aCorner*vec2(aInfo.y*64.*aInfo.z,aInfo.z)*mix(1.,.16,k); q=mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*q; mv.xy+=q;
        gl_Position=projectionMatrix*mv; vUv=vec2((aCorner.x+.5)*aInfo.y,1.-(aInfo.x+.5-aCorner.y)/64.);
        float red=uAlert*step(.5,fract(s*13.))*(.55+.45*sin(uTime*18.+s*50.));
        vC=mix(mix(color,vec3(1.,.1,.2),red),vec3(.3,.8,1.),k); vK=k;
        vA=uOpacity*smoothstep(2.5,6.,-mv.z)*mix(.42,sin(3.14159*lt)*.8,k); }`,
    fragmentShader: `uniform sampler2D map; varying vec2 vUv; varying vec3 vC; varying float vA,vK;
      void main(){ float t=texture2D(map,vUv).r; gl_FragColor=vec4(vC*t*vA,1.); }`,
  }));
  swarm.frustumCulled = false; group.add(swarm);

  // conexões quebradas (caos) e a rede de energia (ordem)
  const broken = []; for (let i = 0; i < 46; i++) { const a = V3((r() - .5) * 13, 0.8 + r() * 8, -8 + r() * 9), b = V3((r() - .5) * 13, 0.8 + r() * 8, -8 + r() * 9); broken.push({ a, b, c: a.clone().lerp(b, .5).add(V3(0, (r() - .5) * 5, 0)), color: i % 2 ? PAL.silver : PAL.violet, n: 6, speed: 0.5 + r(), delay: r() * 1.5 }); }
  const brk = makeFlows(broken, { lineOpacity: 0.3, size: 0.08 }); group.add(brk);
  const netL = [], hubs = [];
  for (let i = 0; i < 40; i++) { const a = r() * 6.283, rad = 6 + r() * 12, p = V3(Math.cos(a) * rad, 0.4 + r() * 11, WZ - 2 - Math.abs(Math.sin(a)) * rad * 0.8); hubs.push(p); const s = P([6, 7, 0, 1, 3][i % 5]); netL.push({ a: s, b: p, c: s.clone().lerp(p, .5).add(V3(0, 2 + r() * 3, 1)), color: i % 4 ? PAL.blue : PAL.cyan, n: 8, speed: 0.2 + r() * 0.25, delay: r() * 2.2 }); }
  for (let i = 0; i < 70; i++) { const a = hubs[Math.floor(r() * 40)], b = hubs[Math.floor(r() * 40)]; if (a !== b) netL.push({ a, b, c: a.clone().lerp(b, .5).add(V3(0, 1 + r() * 2, 0)), color: i % 3 ? PAL.blue : PAL.cyan, n: 4, speed: 0.15 + r() * 0.2, delay: 1.2 + r() * 2.5 }); }
  const net = makeFlows(netL, { lineOpacity: 0.45, size: 0.1 }); group.add(net);
  const hubPts = makePoints(new Float32Array(hubs.flatMap(p => p.toArray())), { size: 0.3, color: PAL.cyan, twinkle: 0.5, opacity: 0 }); group.add(hubPts);

  // alertas vermelhos
  const ERR = ['500 INTERNAL SERVER ERROR', 'TIMEOUT 30000 ms', 'ECONNRESET', '503 SERVICE UNAVAILABLE', '429 TOO MANY REQUESTS', 'CONNECTION REFUSED', 'NullPointerException', 'MALFORMED XML', 'SSL HANDSHAKE FAILED', 'QUEUE FULL', '502 BAD GATEWAY', 'UNEXPECTED TOKEN }', '500', 'TIMEOUT', '⚠ FALHA', '404 NOT FOUND'];
  const errs = ERR.map((s, i) => { const l = makeLabel(s, { size: 0.3 + r() * 0.3, color: '#ff3355', font: '700 56px "JetBrains Mono"', glow: 24 });
    l.position.set((r() - .5) * 5.2, 2 + r() * 6.5, -4 + r() * 6); l.userData = { ...l.userData, at: 5 + (i / ERR.length) * 4.4 + r() * 0.3, dur: 1.2 + r() * 1.6, s: l.scale.clone() }; group.add(l); return l; });

  function script(tl) {
    const c = S.cam, f = S.fx;
    tl.to(c, { x: 1.4, y: 4.4, z: 7.2, roll: -0.05, duration: 5, ease: 'sine.inOut' }, 0)
      .to(f, { glitch: 1, aberr: 0.007, alert: 0.9, duration: 0.5 }, 5).to(c, { shake: 0.13, roll: 0.04, duration: 0.6 }, 5)
      .to(S, { err: 1, duration: 0.3 }, 5)
      .to(c, { x: 0.95, y: 2.35, z: 6.6, ty: 4.2, roll: 0, duration: 3.2, ease: 'power2.inOut' }, 7.2)
      .to(S, { form: 1, duration: 1.3 }, 8.0)
      .to(S, { arms: 1, duration: 1.0, ease: 'power2.inOut' }, 9.6)
      .to(f, { alert: 0, glitch: 0, aberr: 0.0012, duration: 2.2, ease: 'power1.inOut' }, 10.2).to(c, { shake: 0.012, duration: 2 }, 10.2)
      .to(S, { err: 0, duration: 1.2 }, 10.2).to(S, { chaos: 0.35, duration: 2.5 }, 10)
      .to(S, { cards: 1, duration: 3.6, ease: 'none' }, 10.3)
      .to(S, { lanes: 4, duration: 4, ease: 'none' }, 11)
      .to(S, { order: 1, duration: 4.2, ease: 'power1.inOut' }, 10.9)
      .to(f, { flash: 0.3, duration: 0.1 }, 15).to(f, { flash: 0, duration: 0.8 }, 15.1)
      .to(S, { net: 6, duration: 5, ease: 'none' }, 14.8).to(S, { energy: 1, duration: 1.5 }, 15)
      .to(S, { arms: 0.25, duration: 1.6, ease: 'power2.inOut' }, 15.2)
      .to(c, { x: 0, y: 3.4, z: 12.5, ty: 5, duration: 4.8, ease: 'power2.inOut' }, 15);
  }

  function update(t, T) {
    mu.uOrder.value = S.order; mu.uAlert.value = S.fx.alert; mu.uChaos.value = S.chaos + 0.65 * (1 - sstep(10, 12, t)); 
    const bu = brk.userData.u; bu.uReveal.value = 4; bu.uTintAmt.value = S.fx.alert; bu.uJitter.value = 0.15 + S.fx.alert * 0.6; bu.uOpacity.value = (0.5 + 0.5 * Math.sin(T * 23) * S.fx.alert) * (1 - sstep(10.5, 13.5, t)); brk.visible = t < 13.5;
    cards.forEach((m, i) => { const k = sstep(i / 9, i / 9 + 0.2, S.cards); m.visible = k > 0.001; m.userData.u.uReveal.value = k; m.userData.u.uOpacity.value = 0.75 + S.energy * 0.2 * Math.sin(T * 3 - i); });
    lanes.userData.u.uReveal.value = S.lanes; lanes.visible = S.lanes > 0; lanes.userData.u.uLine.value = 0.6 + S.energy * 0.4;
    net.userData.u.uReveal.value = S.net; net.visible = S.net > 0; hubPts.userData.u.uOpacity.value = sstep(1, 4, S.net);
    errs.forEach((l, i) => { const { at, dur, s } = l.userData, k = pulse(t, at, at + dur, 0.12) * S.err, fl = Math.sin(T * 40 + i * 7) > -0.4 ? 1 : 0.25;
      l.visible = k > 0.01; l.material.opacity = k * fl; l.scale.copy(s).multiplyScalar(0.8 + 0.3 * k + 0.04 * Math.sin(T * 30 + i)); l.position.x += 0; });
    // Rodrigo de costas para a câmera, regendo as interfaces
    char.root.position.set(0, 0, 1.7); char.root.rotation.y = Math.PI; char.setForm(S.form);
    const a = S.arms, w = Math.sin(T * 2.3), w2 = Math.sin(T * 1.7 + 1), g = pulse(t, 10, 15.2, 1);
    char.pose({ armL: [lerp(0.05, -2.0 + w * 0.35 * g, a), lerp(0.1, 0.45 + w2 * 0.2 * g, a), lerp(-0.12, -0.7 - w2 * 0.3 * g, a)], armR: [lerp(0.05, -1.8 - w2 * 0.4 * g, a), lerp(-0.1, -0.5 + w * 0.2 * g, a), lerp(-0.12, -0.6 + w * 0.3 * g, a)],
      spine: [-0.08 * a, w * 0.08 * g], head: [-0.25 * a, w2 * 0.12 * g], bob: Math.sin(T * 1.6) * 0.004 });
  }
  return { group, S, script, update };
}
