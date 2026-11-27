import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, SMAAEffect, VignetteEffect, ToneMappingEffect, ToneMappingMode, BrightnessContrastEffect, HueSaturationEffect } from 'postprocessing';

export type Quality = 'low' | 'medium' | 'high';

export class Renderer {
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 400);
  private bloom: BloomEffect;
  private renderPass: RenderPass;
  private grade: HueSaturationEffect;
  private bc: BrightnessContrastEffect;
  quality: Quality = 'high';

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false, depth: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.id = 'gl';

    this.composer = new EffectComposer(this.renderer, { frameBufferType: THREE.HalfFloatType });
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(this.renderPass);
    this.bloom = new BloomEffect({ intensity: 0.7, luminanceThreshold: 0.82, luminanceSmoothing: 0.25, mipmapBlur: true, radius: 0.7 });
    const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    const vignette = new VignetteEffect({ offset: 0.32, darkness: 0.42 });
    this.grade = new HueSaturationEffect({ saturation: 0.12 });
    this.bc = new BrightnessContrastEffect({ contrast: 0.06 });
    const smaa = new SMAAEffect();
    this.composer.addPass(new EffectPass(this.camera, this.bloom, tone, this.grade, this.bc, vignette, smaa));

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  setExposure(e: number) {
    this.renderer.toneMappingExposure = e;
  }

  setGrade(saturation: number, contrast: number) {
    this.grade.saturation = saturation;
    this.bc.contrast = contrast;
  }

  setQuality(q: Quality) {
    this.quality = q;
    const pr = Math.min(window.devicePixelRatio, q === 'high' ? 2 : q === 'medium' ? 1.25 : 1);
    this.renderer.setPixelRatio(pr);
    this.renderer.shadowMap.enabled = q !== 'low';
    this.bloom.intensity = q === 'low' ? 0 : 0.7;
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    // keep the whole court in view on narrow screens
    this.camera.fov = w / h < 1 ? 60 : w / h < 1.4 ? 50 : 42;
    this.camera.updateProjectionMatrix();
  }

  render(dt: number) {
    this.composer.render(dt);
  }
}
