import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { NOISE, GLOBAL } from '../effects/glsl.js';

export const WIDTH = 1080, HEIGHT = 1920, FPS = 60;

// Final "lens" pass: grading, time-freeze tint, ripple distortion, glitch, chromatic
// aberration, flash/fade, vignette, film grain. All driven by per-frame uniforms.
const FinalShader = {
  uniforms: {
    tDiffuse: { value: null }, uTime: { value: 0 }, uAspect: { value: WIDTH / HEIGHT },
    uChroma: { value: 0.0015 }, uVignette: { value: 0.55 }, uGrain: { value: 0.05 },
    uGlitch: { value: 0 }, uFreeze: { value: 0 }, uFlash: { value: 0 }, uFade: { value: 0 },
    uFlashColor: { value: new THREE.Color(1, 1, 1) },
    uRipple: { value: new THREE.Vector4(0.5, 0.5, 0, 0) }, // center xy, radius, strength
    uTint: { value: new THREE.Color(1, 1, 1) }, uSat: { value: 1 }, uContrast: { value: 1.05 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uTime, uAspect, uChroma, uVignette, uGrain, uGlitch, uFreeze, uFlash, uFade, uSat, uContrast;
    uniform vec3 uFlashColor, uTint; uniform vec4 uRipple; varying vec2 vUv;
    ${NOISE}
    void main(){
      vec2 uv = vUv;
      // shock ripple
      if (uRipple.w > 0.0) {
        vec2 d = (uv - uRipple.xy) * vec2(1.0, 1.0 / uAspect);
        float r = length(d);
        float band = exp(-pow((r - uRipple.z) * 14.0, 2.0));
        uv += normalize(d + 1e-5) * band * uRipple.w * 0.05 * vec2(1.0, uAspect);
      }
      // block glitch
      if (uGlitch > 0.0) {
        float row = floor(uv.y * 48.0); float tt = floor(uTime * 24.0);
        float g = step(1.0 - uGlitch * 0.5, hash12(vec2(row, tt)));
        uv.x += (hash12(vec2(row * 3.1, tt)) - 0.5) * 0.12 * g * uGlitch;
        float blk = step(1.0 - uGlitch * 0.25, hash12(floor(uv * vec2(12.0, 22.0)) + tt));
        uv += (hash33(vec3(floor(uv * 9.0), tt)).xy - 0.5) * 0.04 * blk;
      }
      vec2 dir = (uv - 0.5);
      float ca = uChroma + uGlitch * 0.012;
      vec3 col;
      col.r = texture2D(tDiffuse, uv + dir * ca).r;
      col.g = texture2D(tDiffuse, uv).g;
      col.b = texture2D(tDiffuse, uv - dir * ca).b;
      // grade
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, uSat);
      col = (col - 0.5) * uContrast + 0.5;
      col *= uTint;
      // time-freeze: cold, desaturated, with frozen scanlines
      vec3 frozen = vec3(l) * vec3(0.62, 0.82, 1.18) + vec3(0.0, 0.02, 0.05);
      frozen += 0.03 * sin(vUv.y * 900.0) * uFreeze;
      col = mix(col, frozen, uFreeze * 0.8);
      // scanlines + rgb noise during glitch
      col += uGlitch * 0.08 * (hash12(vUv * 800.0 + uTime) - 0.5);
      col *= 1.0 - uGlitch * 0.15 * step(0.5, fract(vUv.y * 320.0));
      // vignette
      vec2 v = (vUv - 0.5) * vec2(1.0, 1.25);
      col *= mix(1.0, smoothstep(0.85, 0.2, length(v)), uVignette);
      // grain
      col += (hash12(vUv * vec2(1931.0, 1373.0) + fract(uTime * 7.13) * 100.0) - 0.5) * uGrain;
      col = mix(col, uFlashColor, clamp(uFlash, 0.0, 1.0));
      col *= 1.0 - clamp(uFade, 0.0, 1.0);
      gl_FragColor = vec4(max(col, 0.0), 1.0);
    }`,
};

export const DEFAULT_POST = () => ({
  bloom: 0.9, bloomRadius: 0.55, bloomThreshold: 0.85, exposure: 1.0,
  chroma: 0.0015, vignette: 0.55, grain: 0.045, glitch: 0, freeze: 0, flash: 0, fade: 0,
  flashColor: [1, 1, 1], ripple: [0.5, 0.5, 0, 0], tint: [1, 1, 1], sat: 1, contrast: 1.05,
});

export class Engine {
  constructor(outCanvas, { scale = 0.5 } = {}) {
    this.out = outCanvas;
    this.out.width = WIDTH; this.out.height = HEIGHT;
    this.ctx = this.out.getContext('2d');
    this.gl = document.createElement('canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.gl, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(1);
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.9, 0.55, 0.72);
    this.final = new ShaderPass(FinalShader);
    this.output = new OutputPass();
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.output);   // tone mapping + sRGB
    this.composer.addPass(this.final);    // lens effects in display space
    this.setScale(scale);
  }
  setScale(s) {
    this.scale = s;
    const w = Math.round(WIDTH * s), h = Math.round(HEIGHT * s);
    GLOBAL.uScale.value = h / 2; // px per unit of NDC height
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
  }
  applyPost(p, time) {
    this.bloom.strength = p.bloom; this.bloom.radius = p.bloomRadius; this.bloom.threshold = p.bloomThreshold;
    this.renderer.toneMappingExposure = p.exposure;
    const u = this.final.uniforms;
    u.uTime.value = time; u.uChroma.value = p.chroma; u.uVignette.value = p.vignette; u.uGrain.value = p.grain;
    u.uGlitch.value = p.glitch; u.uFreeze.value = p.freeze; u.uFlash.value = p.flash; u.uFade.value = p.fade;
    u.uFlashColor.value.setRGB(...p.flashColor); u.uRipple.value.set(...p.ripple); u.uTint.value.setRGB(...p.tint);
    u.uSat.value = p.sat; u.uContrast.value = p.contrast;
  }
  // Render one 3D frame + 2D overlay into the 1080x1920 output canvas.
  render(scene, camera, post, time, drawOverlay) {
    camera.aspect = WIDTH / HEIGHT; camera.updateProjectionMatrix();
    this.renderPass.scene = scene; this.renderPass.camera = camera;
    this.applyPost(post, time);
    this.composer.render();
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    c.drawImage(this.gl, 0, 0, WIDTH, HEIGHT);
    if (drawOverlay) drawOverlay(c);
  }
  compile(scene, camera) { this.renderer.compile(scene, camera); }
}
