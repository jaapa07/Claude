// EPISÓDIO 3: A ARQUITETURA INVISÍVEL
// 0-5 a câmera se afasta e revela a rede de empresas · 5-10 Rodrigo manipula ETL 3D e bancos PostgreSQL
// 10-15 cada integração concluída acende uma região · 15-20 a rede se curva e vira um planeta iluminado
import { THREE, PAL, V3, U, rng, lerp, sstep, pulse, clamp, makeFlows, makeLabel, makeGrid, makeNode, GLSL_NOISE, ADD } from '../core.js';

export default function ep3({ char }) {
  const group = new THREE.Group(), r = rng(303);
  const S = {
    cam: { x: 0, y: 1.0, z: -9, tx: 0, ty: 0.7, tz: -18, shake: 0.01 }, fx: { neb: 0.6 },
    reveal: 0, form: 0, etl: 0, arms: 0, lit: -1, morph: 0, planet: 0, look: 0, beams: 0,
  };
  const grid = makeGrid({ cell: 2, color: PAL.blue }); group.add(grid);

  // ------------------------------------------------------------ a rede: nós no plano, com destino na esfera
  const N = 560, C = V3(0, 9.5, -16), R = 6.2, X0 = -17, X1 = 17, Z0 = -36, Z1 = 3;
  const REG = [[-10, -6], [9, -9], [-3, -18], [11, -24], [-11, -27], [2, -32]].map(([x, z]) => V3(x, 0, z)), TK = [0, 0.9, 1.7, 2.5, 3.2, 3.8];
  const nodes = [];
  for (let i = 0; i < N; i++) {
    const x = lerp(X0, X1, r()), z = lerp(Z0, Z1, r()), p = V3(x, 0.05 + r() * 0.25, z);
    const lon = (x - X0) / (X1 - X0) * Math.PI * 2, lat = Math.asin(clamp((z - Z0) / (Z1 - Z0) * 2 - 1, -0.98, 0.98));
    const s = V3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)).multiplyScalar(R).add(C);
    let k = 0, best = 1e9; REG.forEach((c, j) => { const d = c.distanceTo(p); if (d < best) { best = d; k = j; } });
    nodes.push({ p, s, lit: TK[k] + best * 0.11 + r() * 0.15, sd: r(), big: r() < 0.12 });
  }
  const links = [];
  nodes.forEach((a, i) => { const near = nodes.map((b, j) => [a.p.distanceToSquared(b.p), j]).filter(d => d[1] !== i).sort((x, y) => x[0] - y[0]).slice(0, 3); near.forEach(([d, j], q) => { if (j > i || q === 0) links.push([i, j]); }); });
  const attrs = (list) => { const n = list.length, pos = new Float32Array(n * 3), sph = new Float32Array(n * 3), inf = new Float32Array(n * 3); list.forEach((o, i) => { pos.set(o.p.toArray(), i * 3); sph.set(o.s.toArray(), i * 3); inf.set([o.lit, o.sd, o.big ? 2.2 : 1], i * 3); });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSph', new THREE.BufferAttribute(sph, 3)); g.setAttribute('aInf', new THREE.BufferAttribute(inf, 3)); return g; };
  const nu = { uTime: U.uTime, uPx: U.uPx, uMorph: { value: 0 }, uLit: { value: -1 }, uSpin: { value: 0 }, uC: { value: C }, uReveal: { value: 0 }, uOrigin: { value: V3(0, 0, -9) } };
  const MORPH = `uniform float uMorph,uSpin; uniform vec3 uC; attribute vec3 aSph; attribute vec3 aInf;
    vec3 place(){ float m=clamp(uMorph*1.25-aInf.y*.25,0.,1.); m=m*m*(3.-2.*m); vec3 s=aSph-uC; float a=uSpin; s.xz=mat2(cos(a),-sin(a),sin(a),cos(a))*s.xz;
      return mix(position,s+uC,m)+vec3(0.,sin(3.14159*m)*(1.5+aInf.y*4.),0.); }`;
  const pts = new THREE.Points(attrs(nodes), new THREE.ShaderMaterial({
    ...ADD, uniforms: nu,
    vertexShader: `${MORPH} uniform float uTime,uPx,uLit,uReveal; uniform vec3 uOrigin; varying float vL,vS,vR;
      void main(){ vec3 p=place(); vec4 mv=viewMatrix*modelMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
        vL=smoothstep(aInf.x,aInf.x+.5,uLit); float flash=smoothstep(.6,0.,abs(uLit-aInf.x-.25))*step(aInf.x,uLit);
        vR=smoothstep(0.,6.,uReveal*60.-distance(position,uOrigin)); vS=aInf.y;
        gl_PointSize=max(2.,(.16+.2*vL+.5*flash)*aInf.z*(.8+.2*sin(uTime*3.+aInf.y*40.))*uPx/-mv.z); }`,
    fragmentShader: `varying float vL,vS,vR; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d); float core=smoothstep(.18,0.,d);
      vec3 c=mix(vec3(.3,.36,.55),mix(vec3(.15,.55,1.),vec3(.35,.9,1.),step(.6,vS)),vL); gl_FragColor=vec4((c*a*a+vec3(1.)*core*vL*.6)*vR,1.); }`,
  }));
  const lg = attrs(links.flatMap(([i, j]) => { const l = Math.max(nodes[i].lit, nodes[j].lit); return [{ ...nodes[i], lit: l }, { ...nodes[j], lit: l }]; }));
  const lines = new THREE.LineSegments(lg, new THREE.ShaderMaterial({
    ...ADD, uniforms: nu,
    vertexShader: `${MORPH} uniform float uLit,uReveal,uTime; uniform vec3 uOrigin; varying float vL,vR;
      void main(){ gl_Position=projectionMatrix*viewMatrix*modelMatrix*vec4(place(),1.); vL=smoothstep(aInf.x,aInf.x+.6,uLit); vR=smoothstep(0.,6.,uReveal*60.-distance(position,uOrigin)); }`,
    fragmentShader: `varying float vL,vR; void main(){ gl_FragColor=vec4(mix(vec3(.13,.16,.28),vec3(.1,.45,1.),vL)*vR,1.); }`,
  }));
  pts.frustumCulled = lines.frustumCulled = false; group.add(lines, pts);

  const EMP = ['INDÚSTRIA', 'TRANSPORTADORA', 'VAREJO', 'E-COMMERCE', 'ERP', 'TMS', 'WMS', 'BANCO', 'PORTO', 'MARKETPLACE', 'FISCO', 'CD SUL'];
  const tags = EMP.map((s, i) => { const n = nodes[(i * 41 + 7) % N], l = makeLabel(s, { size: 0.42, font: '700 44px Rajdhani', color: '#9fc6ff' }); l.position.copy(n.p).add(V3(0, 0.6, 0)); l.userData.lit = n.lit; group.add(l); return l; });

  // planeta: núcleo escuro (esconde o lado de trás) + atmosfera de fresnel
  const core = new THREE.Mesh(new THREE.SphereGeometry(R * 0.975, 48, 32), new THREE.ShaderMaterial({
    transparent: true, uniforms: { uTime: U.uTime, uOpacity: { value: 0 } },
    vertexShader: `varying vec3 vN,vV,vP; void main(){ vP=position; vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uTime,uOpacity; varying vec3 vN,vV,vP; ${GLSL_NOISE}
      void main(){ float fr=pow(1.-max(dot(normalize(vN),normalize(vV)),0.),3.); float n=fbm(normalize(vP)*3.+7.);
        vec3 c=vec3(.005,.012,.04)+vec3(.02,.08,.22)*smoothstep(.45,.7,n)+vec3(.1,.4,1.)*fr*.7; gl_FragColor=vec4(c,uOpacity); }`,
  }));
  const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.12, 48, 32), new THREE.ShaderMaterial({
    ...ADD, side: THREE.BackSide, uniforms: { uOpacity: { value: 0 } },
    vertexShader: `varying vec3 vN,vV; void main(){ vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uOpacity; varying vec3 vN,vV; void main(){ float f=pow(max(dot(normalize(vN),-normalize(vV)),0.),.0)*pow(1.-abs(dot(normalize(vN),normalize(vV))),0.)*0.+pow(clamp(dot(-normalize(vN),normalize(vV)),0.,1.),3.5);
      gl_FragColor=vec4(mix(vec3(.1,.4,1.),vec3(.5,.3,1.),f)*f*1.6*uOpacity,1.); }`,
  }));
  core.position.copy(C); atmo.position.copy(C); group.add(core, atmo);

  // ------------------------------------------------------------ ETL 3D e bancos PostgreSQL diante de Rodrigo
  const ZC = 6.2, etl = new THREE.Group(); group.add(etl);
  const blocks = ['EXTRACT', 'TRANSFORM', 'LOAD'].map((s, i) => {
    const g = makeNode(0.26, [PAL.cyan, PAL.violet, PAL.blue][i], i === 1 ? 'ico' : 'box'), l = makeLabel(s, { size: 0.17, font: '700 44px Orbitron', color: '#dff3ff' }); l.position.y = 0.48; g.add(l);
    g.userData.home = V3((i - 1) * 0.95, 2.35 + (i === 1 ? 0.18 : 0), ZC - 1.5); g.userData.from = V3((r() - .5) * 3, 1.2 + r() * 2.5, ZC - 2.5 - r()); etl.add(g); return g;
  });
  const dbs = [-1, 1].map(sx => {
    const g = new THREE.Group();
    for (let k = 0; k < 3; k++) { const d = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.24, 0.24, 0.13, 20)), new THREE.LineBasicMaterial({ color: PAL.cyan, ...ADD })); d.position.y = k * 0.17; g.add(d);
      const f = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.11, 20), new THREE.MeshBasicMaterial({ color: 0x0a2a66, transparent: true, opacity: 0.6 })); f.position.y = k * 0.17; g.add(f); }
    const l = makeLabel('PostgreSQL', { size: 0.15, font: '700 44px Rajdhani', color: '#9fe0ff' }); l.position.y = -0.22; g.add(l);
    g.position.set(sx * 1.25, 1.45, ZC - 1.15); etl.add(g); return g;
  });
  const H = i => blocks[i].userData.home, D = i => dbs[i].position.clone().add(V3(0, 0.2, 0));
  const pipe = makeFlows([
    { a: D(0), b: H(0), c: D(0).lerp(H(0), .5).add(V3(-0.3, 0.3, 0)), color: PAL.cyan, n: 10, speed: 0.5, delay: 0 }, { a: H(0), b: H(1), c: H(0).clone().lerp(H(1), .5).add(V3(0, 0.3, 0)), color: PAL.cyan, n: 10, speed: 0.5, delay: 0.5 },
    { a: H(1), b: H(2), c: H(1).clone().lerp(H(2), .5).add(V3(0, 0.3, 0)), color: PAL.violet, n: 10, speed: 0.5, delay: 1 }, { a: H(2), b: D(1), c: H(2).clone().lerp(D(1), .5).add(V3(0.3, 0.3, 0)), color: PAL.blue, n: 10, speed: 0.5, delay: 1.5 },
  ], { size: 0.06, lineOpacity: 0.8 }); etl.add(pipe);
  const beams = makeFlows(REG.map((c, i) => ({ a: H(i % 3), b: c, c: H(i % 3).clone().lerp(c, .45).add(V3(0, 5 + i * 0.4, 0)), color: i % 2 ? PAL.cyan : PAL.violet, n: 26, speed: 0.33, delay: TK[i] })), { size: 0.13, lineOpacity: 0.9 }); group.add(beams);

  function script(tl) {
    const c = S.cam;
    tl.to(S, { reveal: 1, duration: 5, ease: 'power1.out' }, 0)
      .to(c, { y: 8.2, z: 12.5, ty: 1.2, tz: -8, duration: 5.2, ease: 'power2.inOut' }, 0.2)
      .to(S, { form: 1, duration: 1.2 }, 4.3)
      .to(c, { x: 0.9, y: 2.9, z: 11.0, ty: 2.0, tz: -3, duration: 2.6, ease: 'power2.inOut' }, 5.2)
      .to(S, { etl: 1, duration: 3, ease: 'power2.inOut' }, 5.4).to(S, { arms: 1, duration: 0.9, ease: 'power2.inOut' }, 5.2)
      .to(S, { beams: 1, duration: 0.3 }, 10.2)
      .to(S, { lit: 6.5, duration: 6.3, ease: 'none' }, 10.2)
      .to(c, { x: -0.4, y: 5.4, z: 12.6, ty: 1.2, tz: -9, duration: 4.4, ease: 'power1.inOut' }, 10)
      .to(S, { arms: 0.1, duration: 1.4, ease: 'power2.inOut' }, 14.6)
      .to(S, { morph: 1, duration: 3.6, ease: 'power2.inOut' }, 15).to(S, { planet: 1, duration: 1.8 }, 17.2)
      .to(S.fx, { flash: 0.25, duration: 0.1 }, 15.6).to(S.fx, { flash: 0, duration: 0.9 }, 15.7)
      .to(S, { look: 1, duration: 2, ease: 'power2.inOut' }, 15.3)
      .to(c, { x: 0, y: 2.6, z: 13.2, ty: 7.4, tz: -16, duration: 4.2, ease: 'power2.inOut' }, 15);
  }

  function update(t, T) {
    nu.uReveal.value = S.reveal; nu.uLit.value = S.lit; nu.uMorph.value = S.morph; nu.uSpin.value = S.morph * (T * 0.22);
    grid.userData.u.uOpacity.value = 0.5 * (1 - S.morph);
    tags.forEach((l, i) => { l.material.opacity = sstep(1.5, 4, t) * (1 - sstep(15, 15.8, t)) * (0.45 + 0.55 * sstep(l.userData.lit, l.userData.lit + 0.5, S.lit)); l.visible = t < 15.8; });
    core.material.uniforms.uOpacity.value = S.planet; core.visible = S.planet > 0.001; atmo.material.uniforms.uOpacity.value = S.planet;
    etl.visible = t > 5.2; etl.traverse(o => { if (o.material && o !== pipe) { } });
    const fadeE = sstep(5.2, 6, t) * (1 - sstep(15, 16.5, t) * 0.75);
    blocks.forEach((g, i) => { const k = sstep(i * 0.2, 0.6 + i * 0.2, S.etl), kk = k * k * (3 - 2 * k); g.position.lerpVectors(g.userData.from, g.userData.home, kk); g.position.y += Math.sin(T * 1.8 + i * 2) * 0.03;
      g.rotation.set((1 - kk) * 3 + (i === 1 ? T * 0.6 : 0), T * 0.5 * (i === 1 ? 1 : 0.25) + (1 - kk) * 4, 0); g.scale.setScalar(fadeE * (1 + 0.1 * sstep(TK[i] - 0.1, TK[i] + 0.1, S.lit) * Math.max(0, 1 - (S.lit - TK[i])))); });
    dbs.forEach((g, i) => { g.scale.setScalar(fadeE * sstep(0.3, 0.9, S.etl)); g.rotation.y = T * 0.4 * (i ? -1 : 1); });
    pipe.userData.u.uReveal.value = Math.max(0, S.etl * 5 - 2); pipe.userData.u.uOpacity.value = fadeE;
    beams.userData.u.uReveal.value = Math.max(0, S.lit) ; beams.visible = S.beams > 0; beams.userData.u.uOpacity.value = S.beams * (1 - sstep(15, 16.2, t));
    // Rodrigo de costas, mãos nas interfaces; no fim, olha para o planeta
    char.root.position.set(0, 0, ZC); char.root.rotation.y = Math.PI; char.setForm(S.form);
    const a = S.arms, w = Math.sin(T * 2.1), w2 = Math.sin(T * 1.5 + 2);
    char.pose({ armL: [lerp(0.05, -1.5 + w * 0.3, a), lerp(0.1, 0.3 + w2 * 0.15, a), lerp(-0.12, -0.8 + w2 * 0.25, a)], armR: [lerp(0.05, -1.45 - w2 * 0.3, a), lerp(-0.1, -0.3 - w * 0.15, a), lerp(-0.12, -0.75 - w * 0.25, a)],
      spine: [-0.05 * a - 0.12 * S.look, w * 0.06 * a], head: [-0.1 * a - 0.5 * S.look, w2 * 0.1 * a], bob: Math.sin(T * 1.6) * 0.004 });
  }
  return { group, S, script, update };
}
