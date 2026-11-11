// character.js: o avatar de Rodrigo Hajime. Um boneco articulado feito de primitivas, com traje preto,
// linhas luminosas azuis e óculos holográficos. A mesma instância é usada nos cinco episódios.
// Para personalizar (por exemplo a partir de uma foto de referência), ajuste APARENCIA.
import { THREE, PAL, U, GLSL_NOISE, rng, lerp, ADD } from './core.js';

export const APARENCIA = { pele: 0xd9a37e, cabelo: 0x0c0a0c, traje: 0x07090f, luz: 0x2f9bff, oculos: 0x4fe0ff };

const formU = { value: 1 };   // 0 = invisível, 1 = formado (dissolve por ruído, com borda de energia)
function mat(color, { rim = 0.9, emis = 0, rimColor = PAL.blue } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uRim: { value: rimColor.clone().multiplyScalar(rim) }, uEmis: { value: new THREE.Color(color).multiplyScalar(emis) }, uForm: formU, uTime: U.uTime },
    vertexShader: `varying vec3 vN,vW,vV,vL; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vL=position; vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); gl_Position=projectionMatrix*viewMatrix*w; }`,
    fragmentShader: `uniform vec3 uColor,uRim,uEmis; uniform float uForm,uTime; varying vec3 vN,vW,vV,vL; ${GLSL_NOISE}
      void main(){ float n=noise3(vL*14.+3.); float edge=uForm*1.2-n-.1; if(edge<0.) discard;
        vec3 N=normalize(vN); float l=max(dot(N,normalize(vec3(.35,.8,.5))),0.)*1.3+max(dot(N,normalize(vec3(-.7,.25,-.5))),0.)*.6+.35;
        float fr=pow(1.-max(dot(N,normalize(vV)),0.),2.6);
        vec3 c=uColor*l+uRim*fr+uEmis; c+=vec3(.25,.65,1.)*smoothstep(.1,0.,edge)*step(uForm,.995)*2.5;
        gl_FragColor=vec4(c,1.); }`,
  });
}

export function makeCharacter() {
  const A = APARENCIA, suit = mat(A.traje, { rim: 0.5 }), skin = mat(A.pele, { rim: 0.35 }), hair = mat(A.cabelo, { rim: 0.5, rimColor: PAL.purple });
  const glow = mat(A.luz, { rim: 0, emis: 1.5 }), visor = mat(A.oculos, { rim: 0, emis: 1.8 }), boot = mat(0x0d1220, { rim: 0.6 });
  const root = new THREE.Group(), J = {};
  const add = (parent, geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };
  const grp = (parent, x = 0, y = 0, z = 0) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const cap = (r, l) => new THREE.CapsuleGeometry(r, l, 6, 14);

  J.hips = grp(root, 0, 0.97, 0);
  add(J.hips, cap(0.155, 0.08), suit, 0, 0.02, 0).scale.set(1.12, 1, 0.82);
  add(J.hips, new THREE.TorusGeometry(0.17, 0.012, 6, 28), glow, 0, 0.1, 0).rotation.x = Math.PI / 2;   // cinto de luz

  J.spine = grp(J.hips, 0, 0.1, 0);
  const torso = add(J.spine, cap(0.17, 0.3), suit, 0, 0.27, 0); torso.scale.set(1.18, 1, 0.78);
  add(J.spine, cap(0.1, 0.34), suit, 0, 0.5, 0).rotation.z = Math.PI / 2;                                // ombros
  // linhas luminosas do traje: peito em V, coluna e gola
  for (const s of [-1, 1]) { const l = add(J.spine, new THREE.BoxGeometry(0.012, 0.3, 0.012), glow, s * 0.075, 0.36, 0.128); l.rotation.z = s * 0.26; }
  add(J.spine, new THREE.BoxGeometry(0.012, 0.42, 0.012), glow, 0, 0.3, -0.135);
  add(J.spine, new THREE.OctahedronGeometry(0.03, 0), glow, 0, 0.2, 0.145);
  add(J.spine, new THREE.TorusGeometry(0.075, 0.01, 6, 24), glow, 0, 0.6, 0).rotation.x = Math.PI / 2;

  J.neck = grp(J.spine, 0, 0.62, 0);
  add(J.neck, new THREE.CylinderGeometry(0.05, 0.055, 0.1, 12), skin, 0, 0.03, 0);
  J.head = grp(J.neck, 0, 0.1, 0);
  add(J.head, new THREE.SphereGeometry(0.125, 24, 18), skin, 0, 0.1, 0).scale.set(0.92, 1.1, 1);
  const hr = add(J.head, new THREE.SphereGeometry(0.135, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.52), hair, 0, 0.115, -0.012); hr.scale.set(0.97, 1.1, 1.05);
  add(J.head, new THREE.BoxGeometry(0.16, 0.05, 0.12), hair, 0, 0.215, 0.03).rotation.x = -0.25;       // topete
  for (const s of [-1, 1]) add(J.head, new THREE.SphereGeometry(0.022, 8, 8), skin, s * 0.118, 0.095, 0);
  // óculos holográficos: duas lentes luminosas, ponte e hastes
  for (const s of [-1, 1]) {
    const lens = add(J.head, new THREE.BoxGeometry(0.082, 0.04, 0.006), visor, s * 0.05, 0.115, 0.122); lens.rotation.y = s * 0.12;
    add(J.head, new THREE.BoxGeometry(0.006, 0.008, 0.11), glow, s * 0.108, 0.118, 0.07);
  }
  add(J.head, new THREE.BoxGeometry(0.02, 0.008, 0.006), visor, 0, 0.118, 0.126);

  for (const [k, s] of [['L', 1], ['R', -1]]) {
    const sh = J['arm' + k] = grp(J.spine, s * 0.265, 0.5, 0);
    add(sh, cap(0.052, 0.2), suit, 0, -0.15, 0);
    add(sh, new THREE.TorusGeometry(0.056, 0.008, 6, 20), glow, 0, -0.06, 0).rotation.x = Math.PI / 2;
    const el = J['elbow' + k] = grp(sh, 0, -0.3, 0);
    add(el, cap(0.044, 0.19), suit, 0, -0.13, 0);
    add(el, new THREE.TorusGeometry(0.048, 0.01, 6, 20), glow, 0, -0.22, 0).rotation.x = Math.PI / 2;  // pulseira
    J['hand' + k] = add(el, new THREE.SphereGeometry(0.046, 12, 10), skin, 0, -0.3, 0); J['hand' + k].scale.set(0.8, 1.15, 0.6);

    const leg = J['leg' + k] = grp(J.hips, s * 0.095, -0.04, 0);
    add(leg, cap(0.074, 0.3), suit, 0, -0.22, 0);
    add(leg, new THREE.BoxGeometry(0.01, 0.34, 0.01), glow, s * 0.074, -0.22, 0);
    const kn = J['knee' + k] = grp(leg, 0, -0.45, 0);
    add(kn, cap(0.06, 0.3), suit, 0, -0.2, 0);
    add(kn, new THREE.BoxGeometry(0.105, 0.075, 0.24), boot, 0, -0.44, 0.045);
    add(kn, new THREE.BoxGeometry(0.108, 0.012, 0.245), glow, 0, -0.475, 0.045);
  }

  // pose: valores em radianos; tudo o que não for passado volta ao neutro
  const P0 = { armL: [0.05, 0.1, -0.12], armR: [0.05, -0.1, -0.12], legL: [0, 0], legR: [0, 0], spine: [0, 0], head: [0, 0], bob: 0 };
  function pose(p = {}) {
    const q = { ...P0, ...p };
    for (const k of ['L', 'R']) {
      const a = q['arm' + k], l = q['leg' + k];
      J['arm' + k].rotation.set(a[0], 0, a[1]); J['elbow' + k].rotation.set(a[2], 0, 0);
      J['leg' + k].rotation.set(l[0], 0, 0); J['knee' + k].rotation.set(l[1], 0, 0);
    }
    J.spine.rotation.set(q.spine[0], q.spine[1], 0); J.head.rotation.set(q.head[0], q.head[1], 0); J.hips.position.y = 0.97 + q.bob;
  }
  // ciclo de caminhada + respiração, somados sobre uma pose base
  function walk(phase, amt = 1, base = {}) {
    const s = Math.sin(phase), c = Math.cos(phase), k = v => Math.max(0, v);
    return {
      ...base,
      legL: [s * 0.5 * amt, k(-c) * 0.75 * amt], legR: [-s * 0.5 * amt, k(c) * 0.75 * amt],
      armL: base.armL ?? [-s * 0.42 * amt + 0.05, 0.1, -0.2 - k(-s) * 0.3 * amt], armR: base.armR ?? [s * 0.42 * amt + 0.05, -0.1, -0.2 - k(s) * 0.3 * amt],
      bob: Math.abs(c) * 0.035 * amt - 0.02 * amt, spine: [0.05 * amt + (base.spine?.[0] ?? 0), s * 0.07 * amt + (base.spine?.[1] ?? 0)],
    };
  }
  pose();

  // pontos na superfície do personagem (pose neutra, coordenadas locais do root), para a cena em que ele se forma de partículas
  function sample(n, seed = 5) {
    root.updateMatrixWorld(true);
    const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), r = rng(seed), meshes = [];
    root.traverse(o => { if (o.isMesh) { o.geometry.computeBoundingSphere(); const sc = new THREE.Vector3().setFromMatrixScale(o.matrixWorld); meshes.push([o, (o.geometry.boundingSphere.radius * (sc.x + sc.y + sc.z) / 3) ** 2]); } });
    const tot = meshes.reduce((a, m) => a + m[1], 0), out = new Float32Array(n * 3), v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
    let k = 0;
    for (const [o, w] of meshes) {
      const cnt = Math.round(n * w / tot), pos = o.geometry.attributes.position, idx = o.geometry.index, tri = (idx ? idx.count : pos.count) / 3, m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
      for (let i = 0; i < cnt && k < n; i++, k++) {
        const t = Math.floor(r() * tri) * 3; for (let j = 0; j < 3; j++) v[j].fromBufferAttribute(pos, idx ? idx.getX(t + j) : t + j);
        let a = r(), b = r(); if (a + b > 1) { a = 1 - a; b = 1 - b; }
        const p = v[0].clone().multiplyScalar(1 - a - b).addScaledVector(v[1], a).addScaledVector(v[2], b).applyMatrix4(m);
        out.set([p.x, p.y, p.z], k * 3);
      }
    }
    for (; k < n; k++) out.set([out[(k % 97) * 3], out[(k % 97) * 3 + 1], out[(k % 97) * 3 + 2]], k * 3);
    return out;
  }

  // nuvem que converge para a silhueta: uP 0 (espalhada) -> 1 (no corpo)
  function makeAssembly(n = 9000) {
    const target = sample(n), r = rng(11), start = new Float32Array(n * 3), sd = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = r() * 6.283, rad = 2.5 + r() * 7, y = (r() - .2) * 7;
      start.set([Math.cos(a) * rad, y, Math.sin(a) * rad], i * 3); sd[i] = r();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(target, 3)); g.setAttribute('aStart', new THREE.BufferAttribute(start, 3)); g.setAttribute('aS', new THREE.BufferAttribute(sd, 1));
    const m = new THREE.ShaderMaterial({
      ...ADD, uniforms: { uTime: U.uTime, uPx: U.uPx, uP: { value: 0 }, uOpacity: { value: 1 } },
      vertexShader: `attribute vec3 aStart; attribute float aS; uniform float uP,uPx,uTime; varying float vA,vS;
        void main(){ float p=clamp((uP*1.5-aS*.5),0.,1.); p=p*p*(3.-2.*p); float ang=(1.-p)*(2.5+aS*3.);
          vec3 s=aStart; s.xz=mat2(cos(ang),-sin(ang),sin(ang),cos(ang))*s.xz; s.y+=sin(uTime*1.3+aS*30.)*.3;
          vec3 q=mix(s,position,p)+ (1.-p)*.0 + p*vec3(sin(uTime*7.+aS*90.),cos(uTime*6.+aS*70.),sin(uTime*5.+aS*50.))*.006;
          vec4 mv=modelViewMatrix*vec4(q,1.); gl_Position=projectionMatrix*mv; gl_PointSize=max(1.5,(.02+.022*aS)*(1.+(1.-p)*1.5)*uPx/-mv.z);
          vA=smoothstep(0.,.15,uP)*(.45+.55*p); vS=aS; }`,
      fragmentShader: `uniform float uOpacity; varying float vA,vS; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d);
        gl_FragColor=vec4(mix(vec3(.12,.5,1.),vec3(.45,.9,1.),vS)*a*a*vA*uOpacity*.28,1.); }`,
    });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.userData.u = m.uniforms; return pts;
  }

  return { root, J, pose, walk, sample, makeAssembly, setForm: v => { formU.value = v; root.visible = v > 0.001; } };
}
