// world.js: renderer, pós-processamento (bloom + passe GLSL de distorção), o universo de fundo
// e o relógio do filme: world.seek(T) desenha qualquer instante, sempre do mesmo jeito.
import { THREE, W, H, EP_DUR, N_EPS, TOTAL, U, PAL, GLSL_NOISE, rng, clamp, sstep, ADD } from './core.js';
import { EffectComposer } from '../vendor/addons/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/addons/postprocessing/RenderPass.js';
import { ShaderPass } from '../vendor/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from '../vendor/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/addons/postprocessing/OutputPass.js';
import { makeCharacter } from './character.js';
import ep1 from './episodes/ep1.js';
import ep2 from './episodes/ep2.js';
import ep3 from './episodes/ep3.js';
import ep4 from './episodes/ep4.js';
import ep5 from './episodes/ep5.js';

// passe final: aberração cromática, glitch, alerta vermelho, distorção de transição, vinheta, grão e fade
const FX = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uAberr: { value: 0.0012 }, uGlitch: { value: 0 }, uAlert: { value: 0 }, uWarp: { value: 0 }, uFlash: { value: 0 }, uFade: { value: 1 }, uGrain: { value: 0.035 }, uVig: { value: 0.75 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
  fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime,uAberr,uGlitch,uAlert,uWarp,uFlash,uFade,uGrain,uVig; varying vec2 vUv; ${GLSL_NOISE}
    void main(){ vec2 uv=vUv, c=uv-.5; float w=uWarp, r=length(c);
      uv=.5+c*(1.-w*.4*(1.-r)); uv.x+=w*.012*sin(uv.y*70.+uTime*30.);
      float sl=floor(uv.y*28.), hr=hash21(vec2(sl,floor(uTime*17.)));
      uv.x+=uGlitch*step(.78,hr)*(hr-.89)*.5; uv.y+=uGlitch*step(.97,hash11(floor(uTime*9.)))*.03;
      vec2 d=c*(uAberr+w*.03+uGlitch*.008);
      vec3 col=vec3(texture2D(tDiffuse,uv+d).r,texture2D(tDiffuse,uv).g,texture2D(tDiffuse,uv-d).b);
      if(w>.01){ vec3 acc=col; for(int i=1;i<6;i++) acc+=texture2D(tDiffuse,.5+(uv-.5)*(1.-w*.07*float(i))).rgb; col=acc/6.; }
      col+=uFlash*vec3(.3,.55,1.)*(1.2-r);
      float v=smoothstep(.95,.3,length(c*vec2(1.,.72)));
      col*=mix(1.,v,uVig); col+=uAlert*vec3(1.,.04,.1)*(1.-v)*(.55+.45*sin(uTime*13.));
      col+=(hash21(uv*vec2(1080.,1920.)+fract(uTime)*91.)-.5)*uGrain;
      gl_FragColor=vec4(max(col,0.)*uFade,1.); }`,
};

function makeBackground() {
  const g = new THREE.Group(), r = rng(42);
  // nebulosa: esfera invertida com fbm azul/roxo
  const neb = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 24), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false,
    uniforms: { uTime: U.uTime, uGain: { value: 1 }, uA: { value: PAL.blue.clone() }, uB: { value: PAL.purple.clone() } },
    vertexShader: `varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float uTime,uGain; uniform vec3 uA,uB; varying vec3 vD; ${GLSL_NOISE}
      void main(){ vec3 p=vD*2.2+vec3(0.,uTime*.012,uTime*.02); float n=fbm(p); float m=fbm(p*1.7+7.);
        vec3 c=uA*pow(n,3.)*.22+uB*pow(m,3.2)*.2; c*=smoothstep(-.6,.5,vD.y*.5+n)*.9; gl_FragColor=vec4(c*uGain,1.); }`,
  }));
  neb.renderOrder = -10; g.add(neb);
  // estrelas
  const n = 9000, pos = new Float32Array(n * 3), sd = new Float32Array(n);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3(r() - .5, r() - .5, r() - .5).normalize().multiplyScalar(120 + r() * 220); pos.set(v.toArray(), i * 3); sd[i] = r(); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); sg.setAttribute('aS', new THREE.BufferAttribute(sd, 1));
  const stars = new THREE.Points(sg, new THREE.ShaderMaterial({
    ...ADD, depthTest: false, uniforms: { uTime: U.uTime, uGain: { value: 1 } },
    vertexShader: `attribute float aS; uniform float uTime; varying float vA,vS; void main(){ gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); gl_PointSize=1.5+aS*aS*4.5; vA=.45+.55*sin(uTime*(.6+aS*2.)+aS*60.); vS=aS; }`,
    fragmentShader: `uniform float uGain; varying float vA,vS; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d); gl_FragColor=vec4(mix(vec3(.55,.75,1.),vec3(.8,.6,1.),step(.8,vS))*a*vA*uGain,1.); }`,
  }));
  stars.renderOrder = -9; stars.frustumCulled = false; g.add(stars);
  // poeira próxima, repetida numa caixa em volta da câmera: dá sensação de velocidade
  const m = 5000, dp = new Float32Array(m * 3), ds = new Float32Array(m);
  for (let i = 0; i < m; i++) { dp.set([(r() - .5) * 40, (r() - .5) * 40, (r() - .5) * 40], i * 3); ds[i] = r(); }
  const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(dp, 3)); dg.setAttribute('aS', new THREE.BufferAttribute(ds, 1));
  const dust = new THREE.Points(dg, new THREE.ShaderMaterial({
    ...ADD, uniforms: { uTime: U.uTime, uPx: U.uPx, uCam: { value: new THREE.Vector3() }, uGain: { value: 1 } },
    vertexShader: `attribute float aS; uniform float uTime,uPx; uniform vec3 uCam; varying float vA,vS;
      void main(){ vec3 p=position+vec3(sin(uTime*.2+aS*9.),uTime*.15*(.3+aS),cos(uTime*.17+aS*7.))*.6; p=mod(p-uCam+20.,40.)-20.+uCam;
        vec4 mv=viewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv; gl_PointSize=max(1.,(.02+.05*aS*aS)*uPx/-mv.z);
        vA=smoothstep(20.,8.,-mv.z)*smoothstep(.5,2.5,-mv.z)*(.3+.7*aS); vS=aS; }`,
    fragmentShader: `uniform float uGain; varying float vA,vS; void main(){ float d=length(gl_PointCoord-.5); float a=smoothstep(.5,0.,d);
      gl_FragColor=vec4(mix(vec3(.2,.55,1.),vec3(.6,.35,1.),step(.75,vS))*a*a*vA*uGain*.8,1.); }`,
  }));
  dust.frustumCulled = false; g.add(dust);
  g.userData = { neb: neb.material.uniforms, stars: stars.material.uniforms, dust: dust.material.uniforms };
  return g;
}

export function createWorld(gsap) {
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(1); renderer.setClearColor(0x010207); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 900);
  const bg = makeBackground(); scene.add(bg);
  const char = makeCharacter(); scene.add(char.root);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.7, 0.6, 0.22); composer.addPass(bloom);
  const fx = new ShaderPass(FX); composer.addPass(fx);
  composer.addPass(new OutputPass());
  let scale = 0;
  function setScale(s) { if (s === scale) return; scale = s; renderer.setSize(Math.round(W * s), Math.round(H * s), false); composer.setSize(Math.round(W * s), Math.round(H * s)); }
  setScale(1);

  const ctx = { THREE, gsap, scene, camera, char, bg };
  const eps = [ep1, ep2, ep3, ep4, ep5].map((make, i) => {
    const e = make(ctx); e.index = i; e.group.visible = false; scene.add(e.group);
    e.S.cam = { x: 0, y: 1.6, z: 6, tx: 0, ty: 1.2, tz: 0, fov: 50, roll: 0, shake: 0.012, ...e.S.cam };
    e.S.fx = { fade: 1, alert: 0, glitch: 0, aberr: 0.0012, flash: 0, bloom: 0.7, neb: 1, stars: 1, dust: 1, ...e.S.fx };
    return e;
  });
  const master = gsap.timeline({ paused: true });
  eps.forEach((e, i) => { e.tl = gsap.timeline(); e.script(e.tl); master.add(e.tl, i * EP_DUR); });
  master.time(TOTAL); master.time(0);   // inicializa todos os tweens na ordem certa (permite pular para qualquer ponto)

  const tgt = new THREE.Vector3();
  function seek(T) {
    T = clamp(T, 0, TOTAL - 1e-4);
    const i = Math.min(N_EPS - 1, Math.floor(T / EP_DUR)), t = T - i * EP_DUR, e = eps[i];
    U.uTime.value = T; master.time(T);
    eps.forEach(o => o.group.visible = o === e);
    char.setForm(0); char.root.position.set(0, 0, 0); char.root.rotation.set(0, 0, 0); char.root.scale.setScalar(1);
    e.update(t, T);
    const c = e.S.cam, f = e.S.fx, sh = c.shake;
    camera.position.set(c.x + Math.sin(T * 0.83) * sh * 2, c.y + Math.sin(T * 1.17 + 1) * sh * 1.4, c.z + Math.cos(T * 0.71) * sh);
    tgt.set(c.tx, c.ty, c.tz); camera.up.set(Math.sin(c.roll), Math.cos(c.roll), 0); camera.lookAt(tgt);
    if (camera.fov !== c.fov) { camera.fov = c.fov; camera.updateProjectionMatrix(); }
    U.uPx.value = (H * scale) / (2 * Math.tan(THREE.MathUtils.degToRad(c.fov / 2)));
    bg.position.copy(camera.position); bg.userData.dust.uCam.value.copy(camera.position);
    bg.children[2].position.set(0, 0, 0).sub(bg.position);   // a poeira fica em coordenadas do mundo
    bg.userData.neb.uGain.value = f.neb; bg.userData.stars.uGain.value = f.stars; bg.userData.dust.uGain.value = f.dust;
    // transição entre episódios: distorção radial + clarão, com a troca de cena escondida no pico
    const b = Math.min(T, TOTAL - T) < 0.01 ? 9 : Math.abs(((T + EP_DUR / 2) % EP_DUR) - EP_DUR / 2), inside = T > 1 && T < TOTAL - 1;
    const warp = inside ? Math.pow(1 - sstep(0, 0.55, b), 1.6) : 0;
    const u = fx.uniforms; u.uTime.value = T; u.uWarp.value = warp; u.uFlash.value = f.flash + warp * 0.16; u.uAberr.value = f.aberr; u.uGlitch.value = f.glitch; u.uAlert.value = f.alert;
    u.uFade.value = f.fade * sstep(0, 0.9, T) * (1 - sstep(TOTAL - 0.9, TOTAL - 0.1, T)); bloom.strength = f.bloom + warp * 0.25;
    composer.render();
    return { ep: i, t };
  }
  return { canvas, seek, setScale, eps, renderer };
}
