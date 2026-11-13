import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TimePostShader } from '../shaders/post.js';

export const W = 1080, H = 1920, FPS = 60;

/** Palco: renderer 9:16 nativo (1080×1920 lógicos), cena, câmera e cadeia de pós-processamento. */
export class Stage {
  constructor(canvas, scale = 1) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(40, W / H, 0.3, 30000);
    this.composer = new EffectComposer(this.renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 0 }));
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.5, 0.6, 1.0);
    this.composer.addPass(this.bloom);
    this.post = new ShaderPass(TimePostShader);
    this.composer.addPass(this.post);
    this.composer.addPass(new OutputPass());
    this.fx = this.post.uniforms;
    this.setScale(scale);
  }
  setScale(scale) {                                   // resolução interna: 1 = 1080×1920 (exportação); <1 = prévia fluida
    this.scale = scale;
    const w = Math.round(W * scale), h = Math.round(H * scale);
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
  }
  /** Zera os efeitos de tela; cada episódio redefine o que usa, a cada frame (estado puro em função de t). */
  resetFx(t) {
    const u = this.fx;
    u.uTime.value = t; u.uFreeze.value = 0; u.uWarp.value = 0; u.uRays.value = 0; u.uFade.value = 0; u.uSplit.value = 0; u.uFold.value = 0;
    u.uWave.value[2] = -1; u.uWave2.value[2] = -1; u.uFlash.value[3] = 0; u.uVignette.value = 0.9; u.uSat.value = 1.08;
    this.bloom.strength = 0.5;
  }
  /** Projeta um ponto do mundo para coordenadas de tela 0..1 (para ondas e raios). */
  project(v, out = [0, 0]) {
    const p = _v.copy(v).project(this.camera);
    out[0] = p.x * 0.5 + 0.5; out[1] = p.y * 0.5 + 0.5;
    return out;
  }
  wave(slot, worldPos, radius, amp) {
    const u = slot === 2 ? this.fx.uWave2.value : this.fx.uWave.value;
    this.project(worldPos, u); u[2] = radius; u[3] = amp;
  }
  flash(r, g, b, a) { const f = this.fx.uFlash.value; f[0] = r; f[1] = g; f[2] = b; f[3] = a; }
  render() { this.composer.render(); }
}
const _v = new THREE.Vector3();
