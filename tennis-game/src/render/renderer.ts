import * as THREE from 'three';
import { N8AOPostPass } from 'n8ao';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, SMAAEffect, VignetteEffect, ToneMappingEffect, ToneMappingMode, BrightnessContrastEffect, HueSaturationEffect } from 'postprocessing';

export type Quality = 'low' | 'medium' | 'high';

export class Renderer {
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 16 / 9, 0.1, 400);
  private bloom: BloomEffect;
  private ao: InstanceType<typeof N8AOPostPass>;
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
    // ambient occlusion (contact darkening in stands, under the net, around feet) - high quality only
    this.ao = new N8AOPostPass(this.scene, this.camera, 1, 1);
    this.ao.configuration.aoRadius = 1.4;
    this.ao.configuration.distanceFalloff = 0.6;
    this.ao.configuration.intensity = 2.2;
    this.ao.configuration.halfRes = true;
    this.ao.configuration.denoiseSamples = 4;
    this.ao.configuration.gammaCorrection = false;
    this.composer.addPass(this.ao);
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

  private basePR = 1;
  private dynScale = 1;
  /** low = direct render (no post-processing), for phones. */
  private direct = false;

  setQuality(q: Quality) {
    this.quality = q;
    this.basePR = Math.min(window.devicePixelRatio, q === 'high' ? 2 : q === 'medium' ? 1.5 : 1);
    this.direct = q === 'low';
    this.renderer.toneMapping = this.direct ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
    this.renderer.shadowMap.type = q === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.bloom.intensity = q === 'low' ? 0 : 0.7;
    this.ao.enabled = q === 'high';
    this.applyPR();
  }

  setDynamicScale(s: number) { this.dynScale = s; this.applyPR(); }

  private applyPR() {
    this.renderer.setPixelRatio(Math.max(0.5, this.basePR * this.dynScale));
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
    if (this.direct) this.renderer.render(this.scene, this.camera);
    else this.composer.render(dt);
  }
}
