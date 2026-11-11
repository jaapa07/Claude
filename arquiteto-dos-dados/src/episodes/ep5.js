// EPISÓDIO 5: O PRÓXIMO NÍVEL
// 0-5 Rodrigo caminha pela ponte holográfica · 5-10 fragmentos de código viram sistemas, robôs, aplicações e IA
// 10-15 a câmera orbita enquanto as partículas explodem e formam um símbolo · 15-20 o universo escurece e surge o letreiro
import { THREE, PAL, V3, U, rng, lerp, sstep, pulse, clamp, makeCodeField, makeLabel, GLSL_NOISE, ADD } from '../core.js';

export default function ep5({ char }) {
  const group = new THREE.Group(), r = rng(505);
  const S = {
    cam: { x: 0.8, y: 1.45, z: -7.2, tx: 0, ty: 1.3, tz: -12.5, shake: 0.014 }, fx: { neb: 0.75 },
    z: -12.5, walk: 1, m: 0, cloud: 0, orbit: 0, face: 0, arms: 0, look: 0, dim: 1, end: 0,
  };

  // ------------------------------------------------------------ ponte holográfica: as placas se materializam à frente dele
  const bu = { uTime: U.uTime, uFront: { value: 0 }, uOpacity: { value: 1 } };
  const bridge = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 70, 1, 1), new THREE.ShaderMaterial({
    ...ADD, side: THREE.DoubleSide, uniforms: bu, extensions: { derivatives: true },
    vertexShader: `varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform float uTime,uFront,uOpacity; varying vec3 vW; ${GLSL_NOISE}
      void main(){ float tile=floor(vW.z/.7); float ap=smoothstep(0.,1.,(uFront-vW.z)/2.5-hash11(tile+3.)*.8); if(ap<.001) discard;
        vec2 q=vec2(vW.x/.433,vW.z/.7); vec2 g=abs(fract(q-.5)-.5)/fwidth(q); float l=1.-min(min(g.x,g.y),1.);
        float rail=smoothstep(.05,.0,abs(abs(vW.x)-1.22)); float front=smoothstep(.5,0.,abs(ap-.5))*step(ap,.98);
        float wave=.5+.5*sin(vW.z*1.4-uTime*3.); float back=exp(-max(uFront-vW.z-6.,0.)*.035);
        vec3 c=vec3(.12,.5,1.)*(l*.45+.05+wave*.05)+vec3(.3,.85,1.)*rail*.45+vec3(.6,.9,1.)*front*.8*hash11(tile);
        gl_FragColor=vec4(c*ap*back*uOpacity,1.); }`,
  }));
  bridge.rotation.x = -Math.PI / 2; bridge.position.set(0, 0, -15); group.add(bridge);
  const py = []; for (let z = -48; z <= 18; z += 6) for (const s of [-1.24, 1.24]) py.push(s, 0, z, s, -45, z);
  const pylons = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(py, 3)), new THREE.LineBasicMaterial({ color: PAL.blue, ...ADD, opacity: 0.35 })); group.add(pylons);

  // ------------------------------------------------------------ o universo de informações lá embaixo: mar de pontos + código
  const GN = 170, sea = new Float32Array(GN * GN * 3); for (let i = 0; i < GN; i++) for (let j = 0; j < GN; j++) sea.set([(i - GN / 2) * 0.8 + (r() - .5) * .3, 0, (j - GN / 2) * 0.8 - 10 + (r() - .5) * .3], (i * GN + j) * 3);
  const ocean = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(sea, 3)), new THREE.ShaderMaterial({
    ...ADD, uniforms: { uTime: U.uTime, uPx: U.uPx, uOpacity: { value: 1 } },
    vertexShader: `uniform float uTime,uPx; varying float vH,vD; void main(){ vec3 p=position; float h=sin(p.x*.22+uTime*.7)*cos(p.z*.19-uTime*.5)+.5*sin(p.x*.6-p.z*.5+uTime*1.1);
      p.y=-9.+h*1.3; vec4 mv=viewMatrix*modelMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=max(1.2,(.07+.05*h)*uPx/-mv.z); vH=h; vD=-mv.z; }`,
    fragmentShader: `uniform float uOpacity; varying float vH,vD; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d);
      gl_FragColor=vec4(mix(vec3(.1,.3,1.),vec3(.55,.3,1.),smoothstep(-.6,1.,vH))*a*(.35+.4*vH)*exp(-vD*.018)*uOpacity,1.); }`,
  }));
  ocean.frustumCulled = false; group.add(ocean);
  const code = makeCodeField({ count: 520, seed: 9, box: [46, 22, 60], size: [0.25, 0.7], drift: [0.3, 0.2, 0], near: 4 }); group.add(code);

  // ------------------------------------------------------------ nuvem que se transforma: código -> sistemas -> robô -> aplicação -> IA -> explosão -> símbolo
  const N = 8000, rnd = r, pick = (...a) => a[Math.floor(rnd() * a.length)];
  const line = (out, n, a, b, j = 0.012) => { for (let i = 0; i < n; i++) { const t = rnd(); out.push(lerp(a[0], b[0], t) + (rnd() - .5) * j, lerp(a[1], b[1], t) + (rnd() - .5) * j, lerp(a[2] ?? 0, b[2] ?? 0, t) + (rnd() - .5) * j); } };
  const box = (out, n, c, s) => { for (let i = 0; i < n; i++) { const p = [rnd() - .5, rnd() - .5, rnd() - .5], a = Math.floor(rnd() * 3); p[a] = rnd() < .5 ? -.5 : .5; if (rnd() < .55) { const b = (a + 1 + Math.floor(rnd() * 2)) % 3; p[b] = rnd() < .5 ? -.5 : .5; } out.push(c[0] + p[0] * s[0], c[1] + p[1] * s[1], c[2] + p[2] * s[2]); } };
  const ball = (out, n, c, rad, fill = 0) => { for (let i = 0; i < n; i++) { const v = V3(rnd() - .5, rnd() - .5, rnd() - .5).normalize().multiplyScalar(rad * (fill ? Math.pow(rnd(), .4) : 1)); out.push(c[0] + v.x, c[1] + v.y, c[2] + v.z); } };
  const ring = (out, n, rx, ry, rot = 0, c = [0, 0]) => { for (let i = 0; i < n; i++) { const a = rnd() * 6.283, x = Math.cos(a) * rx, y = Math.sin(a) * ry; out.push(c[0] + x * Math.cos(rot) - y * Math.sin(rot), c[1] + x * Math.sin(rot) + y * Math.cos(rot), (rnd() - .5) * .05); } };
  const fit = a => { const o = new Float32Array(N * 3), n = a.length / 3; for (let i = 0; i < N; i++) { const k = (i * 7919) % n; o.set([a[k * 3], a[k * 3 + 1], a[k * 3 + 2]], i * 3); } return o; };
  const shapes = [];
  { const o = []; for (let k = 0; k < 46; k++) { const x = (rnd() - .5) * 2.4, y = (rnd() - .5) * 2.3, z = (rnd() - .5) * .8, l = .25 + rnd() * .8; line(o, 30, [x, y, z], [x + l, y, z]); } shapes.push(o); }                 // linhas de código
  { const o = []; for (const x of [-0.9, 0, 0.9]) { box(o, 500, [x, 0, 0], [.72, 2.1, .5]); for (let k = 0; k < 9; k++) { const y = -0.9 + k * 0.225; line(o, 26, [x - .28, y, .26], [x + .16, y, .26]); ball(o, 5, [x + .26, y, .26], .02); } } shapes.push(o); }   // racks de servidores
  { const o = []; box(o, 700, [0, .8, 0], [.8, .6, .55]); ball(o, 120, [-.2, .85, .29], .075); ball(o, 120, [.2, .85, .29], .075); line(o, 40, [-.18, .64, .29], [.18, .64, .29]); line(o, 50, [0, 1.1, 0], [0, 1.38, 0]); ball(o, 80, [0, 1.42, 0], .07);
    box(o, 900, [0, -.1, 0], [1.0, 1.0, .55]); ring(o, 120, .2, .2, 0, [0, -.05]); for (const s of [-1, 1]) { box(o, 300, [s * .72, -.05, 0], [.22, .85, .25]); ball(o, 70, [s * .72, -.58, 0], .11); box(o, 320, [s * .27, -1.0, 0], [.3, .72, .3]); } shapes.push(o); }                  // robô
  { const o = [], w = .72, h = 1.25; for (const [a, b] of [[[-w, -h], [w, -h]], [[w, -h], [w, h]], [[w, h], [-w, h]], [[-w, h], [-w, -h]]]) line(o, 420, a, b);
    line(o, 160, [-w, h - .28], [w, h - .28]); ball(o, 60, [0, h - .14, 0], .04); for (let k = 0; k < 3; k++) { const y = .55 - k * .52; for (const [a, b] of [[[-.56, y], [.56, y]], [[.56, y], [.56, y - .36]], [[.56, y - .36], [-.56, y - .36]], [[-.56, y - .36], [-.56, y]]]) line(o, 110, a, b); line(o, 60, [-.44, y - .12], [.1, y - .12]); line(o, 40, [-.44, y - .24], [-.1, y - .24]); }
    for (const x of [-.4, 0, .4]) ring(o, 60, .07, .07, 0, [x, -h + .16]); shapes.push(o); }                                                                                                                                         // aplicação
  { const o = []; ball(o, 2600, [0, 0, 0], 1.15); const nn = []; for (let k = 0; k < 16; k++) { const v = V3(rnd() - .5, rnd() - .5, rnd() - .5).normalize().multiplyScalar(.25 + rnd() * .75); nn.push(v); ball(o, 40, v.toArray(), .05, 1); }
    for (let k = 0; k < 26; k++) { const a = pick(...nn), b = pick(...nn); line(o, 45, a.toArray(), b.toArray()); } shapes.push(o); }                                                                                                 // inteligência artificial
  { const o = []; for (let i = 0; i < N; i++) { const v = V3(rnd() - .5, rnd() - .5, rnd() - .5).normalize().multiplyScalar(2 + Math.pow(rnd(), .6) * 6); o.push(v.x, v.y * .8 + .3, v.z); } shapes.push(o); }                         // explosão
  { const o = []; for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3 + Math.PI / 6, b = a + Math.PI / 3; line(o, 330, [Math.cos(a) * 1.3, Math.sin(a) * 1.3], [Math.cos(b) * 1.3, Math.sin(b) * 1.3], .02); }
    ring(o, 900, 1.85, .62, 0.62); ring(o, 900, 1.85, .62, -0.62); line(o, 300, [-.46, -.08], [0, .58], .02); line(o, 300, [.46, -.08], [0, .58], .02); line(o, 300, [0, .58], [0, -.62], .02); ball(o, 260, [0, .58, 0], .09, 1);
    for (const [x, y] of [[-.46, -.08], [.46, -.08], [0, -.62]]) ball(o, 150, [x, y, 0], .07, 1); shapes.push(o); }                                                                                                                  // símbolo
  const mg = new THREE.BufferGeometry(), sd = new Float32Array(N); for (let i = 0; i < N; i++) sd[i] = rnd();
  shapes.forEach((s, i) => mg.setAttribute(i ? 'a' + i : 'position', new THREE.BufferAttribute(fit(s), 3))); mg.setAttribute('aS', new THREE.BufferAttribute(sd, 1));
  const mu = { uTime: U.uTime, uPx: U.uPx, uM: { value: 0 }, uOpacity: { value: 0 } };
  const cloud = new THREE.Points(mg, new THREE.ShaderMaterial({
    ...ADD, uniforms: mu,
    vertexShader: `attribute vec3 a1,a2,a3,a4,a5,a6; attribute float aS; uniform float uTime,uPx,uM; varying float vS,vE;
      float w(float m,float j){ return max(0.,1.-abs(m-j)); }
      void main(){ float m=clamp(uM+(aS-.5)*.35*step(.001,fract(uM))*(1.-abs(fract(uM)-.5)*2.),0.,6.); float i=floor(m), f=fract(m); f=f*f*(3.-2.*f); m=i+f;
        vec3 p=position*w(m,0.)+a1*w(m,1.)+a2*w(m,2.)+a3*w(m,3.)+a4*w(m,4.)+a5*w(m,5.)+a6*w(m,6.);
        float mid=1.-abs(f-.5)*2.; p+=vec3(sin(aS*90.+uTime*3.),cos(aS*70.+uTime*2.6),sin(aS*50.+uTime*2.2))*(.01+mid*.14);
        vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=max(1.5,(.03+.03*aS+mid*.03)*uPx/-mv.z); vS=aS; vE=smoothstep(4.,5.,m)*(1.-smoothstep(5.,6.,m)); }`,
    fragmentShader: `uniform float uOpacity,uM; varying float vS,vE; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d);
      vec3 c=mix(vec3(.15,.55,1.),vec3(.6,.35,1.),step(.7,vS)); c=mix(c,vec3(.75,.95,1.),smoothstep(5.2,6.,uM)*.6+vE*.5); gl_FragColor=vec4(c*a*a*uOpacity*.3,1.); }`,
  }));
  cloud.frustumCulled = false;
  const cg = new THREE.Group(); cg.add(cloud); group.add(cg);
  const tags = ['CÓDIGO', 'SISTEMAS', 'ROBÔS', 'APLICAÇÕES', 'INTELIGÊNCIA ARTIFICIAL'].map(s => { const l = makeLabel(s, { size: 0.26, font: '700 52px Orbitron', color: '#cfeaff' }); l.position.set(0, 1.7, 0); cg.add(l); return l; });

  function script(tl) {
    const c = S.cam, f = S.fx;
    tl.to(S, { z: 0, duration: 9.4, ease: 'none' }, 0).to(S, { walk: 0, duration: 0.7, ease: 'power1.out' }, 9.1)
      .to(c, { x: 0.55, y: 1.6, z: -3.4, ty: 1.35, tz: -8.9, duration: 4.4, ease: 'none' }, 0)
      .to(S, { cloud: 1, duration: 1.2 }, 4.0)
      .to(c, { x: 0.4, y: 1.9, z: 0.3, ty: 2.7, tz: -6.6, duration: 1.9, ease: 'sine.inOut' }, 4.4).to(c, { x: 0.3, y: 2.0, z: 6.9, ty: 2.6, tz: 0, duration: 3.3, ease: 'none' }, 6.3)
      .to(S, { m: 1, duration: 0.6, ease: 'power1.inOut' }, 5.2).to(S, { m: 2, duration: 0.6, ease: 'power1.inOut' }, 6.4)
      .to(S, { m: 3, duration: 0.6, ease: 'power1.inOut' }, 7.6).to(S, { m: 4, duration: 0.6, ease: 'power1.inOut' }, 8.8)
      .to(S, { look: 1, duration: 1.2, ease: 'power2.inOut' }, 9.0).to(S, { arms: 1, duration: 0.8, ease: 'power2.out' }, 9.8)
      .to(S, { m: 5, duration: 1.1, ease: 'power3.out' }, 10.0).to(f, { flash: 0.5, duration: 0.08 }, 10.0).to(f, { flash: 0, duration: 0.9 }, 10.08)
      .to(S, { m: 6, duration: 2.3, ease: 'power2.inOut' }, 11.6)
      .to(S, { orbit: 1, duration: 6.6, ease: 'sine.inOut' }, 9.6).to(S, { face: 1, duration: 1.5 }, 11.4)
      .to(S, { arms: 0, duration: 1.6, ease: 'power2.inOut' }, 13.6)
      .to(S, { dim: 0, duration: 1.9, ease: 'power1.inOut' }, 14.8).to(S, { end: 1, duration: 2.4, ease: 'power2.inOut' }, 14.6).to(f, { neb: 0.1, stars: 0.25, dust: 0.2, duration: 2 }, 14.8);
  }

  function update(t, T) {
    const z = S.z, th = S.orbit * Math.PI * 2, c = S.cam;
    if (t > 9.6) { const rad = lerp(6.9, 7.6, S.orbit) + S.end * 2.2, k = sstep(0, 0.12, S.orbit); c.x = lerp(0.3, Math.sin(th) * rad, k); c.z = lerp(6.9, Math.cos(th) * rad, k); c.y = 2.0 + S.orbit * 0.7; c.tx = 0; c.ty = 2.6 + S.end * 0.3; c.tz = 0; }
    bu.uFront.value = z + 5 + sstep(9, 12, t) * 30; bu.uOpacity.value = lerp(0.25, 1, S.dim); pylons.material.opacity = 0.3 * S.dim;
    ocean.material.uniforms.uOpacity.value = lerp(0.12, 1, S.dim); code.userData.u.uOrigin.value.set(0, -9, z); code.userData.u.uOpacity.value = lerp(0.06, 0.6, S.dim);
    cg.position.set(0, 3.55 + Math.sin(T * 1.1) * 0.06 + S.end * 1.5, z - 0.3); cg.rotation.y = S.face * th + (1 - S.face) * Math.sin(T * 0.5) * 0.35 + sstep(11.6, 20, t) * 0;
    mu.uM.value = S.m; mu.uOpacity.value = S.cloud * lerp(0.5, 1, S.dim); cloud.visible = S.cloud > 0.001;
    tags.forEach((l, i) => { l.material.opacity = S.cloud * Math.max(0, 1 - Math.abs(S.m - i) * 2.2) * (t < 10 ? 1 : 0); l.visible = l.material.opacity > 0.01; });
    // Rodrigo caminha em direção à câmera; ao parar, ergue os braços e olha para cima
    char.root.position.set(0, 0, z); char.setForm(1);
    const w = S.walk, a = S.arms, ph = z * 2.7, base = char.walk(ph, w, { spine: [-0.1 * S.look, 0] });
    base.head = [-0.38 * S.look, 0];
    if (a > 0.001) { base.armL = [lerp(base.armL[0], -0.5, a), lerp(0.1, 1.15, a), lerp(base.armL[2], -0.25, a)]; base.armR = [lerp(base.armR[0], -0.5, a), lerp(-0.1, -1.15, a), lerp(base.armR[2], -0.25, a)]; }
    char.pose(base);
  }
  return { group, S, script, update };
}
