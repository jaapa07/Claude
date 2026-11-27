import * as THREE from 'three';
import { Athlete, type AnimName } from '../game/athlete';
import { Assets } from '../core/assets';
import type { PlayerDef } from '../data/content';

// Renders portraits of the real 3D athletes (head shots for menus, full body for the VS screen).
// They are drawn with the game's own renderer into an offscreen float target (a second WebGL context would double
// GPU memory, which makes iOS Safari kill the page), then tone-mapped (ACES, like the game) and encoded in JS.
export const Portraits = new Map<string, { head: string; body: string }>();

let mainRenderer: THREE.WebGLRenderer | null = null;
export function setPortraitRenderer(r: THREE.WebGLRenderer) { mainRenderer = r; }

const EXPOSURE = 1.1;
function rrt(v: number) { return (v * (v + 0.0245786) - 0.000090537) / (v * (0.983729 * v + 0.432951) + 0.238081); }
function srgb(c: number) { c = Math.min(1, Math.max(0, c)); return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }

function capture(r: THREE.WebGLRenderer, scene: THREE.Scene, cam: THREE.Camera, w: number, h: number): string {
  const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.FloatType, samples: 4 });
  const prevT = r.getRenderTarget();
  const prevC = r.getClearColor(new THREE.Color());
  const prevA = r.getClearAlpha();
  const prevBg = scene.background;
  r.setRenderTarget(rt);
  r.setClearColor(0x000000, 0);
  r.clear();
  r.render(scene, cam);
  const px = new Float32Array(w * h * 4);
  r.readRenderTargetPixels(rt, 0, 0, w, h, px);
  r.setRenderTarget(prevT);
  r.setClearColor(prevC, prevA);
  scene.background = prevBg;
  rt.dispose();
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h);
  const k = EXPOSURE / 0.6;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = ((h - 1 - y) * w + x) * 4, o = (y * w + x) * 4;
      const a = px[i + 3];
      if (a <= 0) continue;
      // un-premultiply edges, then three.js' ACES filmic fit
      const r0 = (px[i] / Math.max(a, 1e-4)) * k, g0 = (px[i + 1] / Math.max(a, 1e-4)) * k, b0 = (px[i + 2] / Math.max(a, 1e-4)) * k;
      const ri = rrt(0.59719 * r0 + 0.35458 * g0 + 0.04823 * b0);
      const gi = rrt(0.076 * r0 + 0.90834 * g0 + 0.01566 * b0);
      const bi = rrt(0.0284 * r0 + 0.13383 * g0 + 0.83777 * b0);
      img.data[o] = 255 * srgb(1.60475 * ri - 0.53108 * gi - 0.07367 * bi);
      img.data[o + 1] = 255 * srgb(-0.10208 * ri + 1.10813 * gi - 0.00605 * bi);
      img.data[o + 2] = 255 * srgb(-0.00327 * ri - 0.07276 * gi + 1.07602 * bi);
      img.data[o + 3] = 255 * Math.min(1, a);
    }
  }
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

export async function renderPortraits(players: PlayerDef[]) {
  const r = mainRenderer;
  if (!r) return;
  const scene = new THREE.Scene();
  const hdr = Assets.hdr.get('sky/harbor.jpg');
  if (hdr) {
    const pm = new THREE.PMREMGenerator(r);
    scene.environment = pm.fromEquirectangular(hdr).texture;
    scene.environmentIntensity = 0.7;
    pm.dispose();
  }
  const key = new THREE.DirectionalLight('#fff4e6', 3.2);
  key.position.set(1.5, 2.5, 3);
  const rim = new THREE.DirectionalLight('#7fc8ff', 3.5);
  rim.position.set(-2.5, 2, -2);
  scene.add(key, rim, new THREE.AmbientLight('#ffffff', 0.25));
  const cam = new THREE.PerspectiveCamera(24, 1, 0.1, 20);

  for (const p of players) {
    const a = new Athlete(p);
    scene.add(a.root);
    const pose = (name: AnimName, t: number) => {
      a.play(name, { fade: 0 });
      const act = a.actions.get(name)!;
      act.time = t * act.getClip().duration;
      a.mixer.update(0);
      a.root.updateMatrixWorld(true);
    };
    // head shot
    pose('idle', 0.3);
    a.root.rotation.y = -0.35;
    const head = new THREE.Vector3();
    a.bones.get('Head')!.getWorldPosition(head);
    cam.aspect = 1;
    cam.fov = 24;
    cam.updateProjectionMatrix();
    cam.position.set(head.x + 0.18, head.y + 0.02, head.z + 1.25);
    cam.lookAt(head.x, head.y - 0.12, head.z);
    const headUrl = capture(r, scene, cam, 256, 256);
    // full body, heroic low angle
    pose('arms_folded', 0.4);
    a.root.rotation.y = 0.25;
    cam.aspect = 400 / 720;
    cam.fov = 30;
    cam.updateProjectionMatrix();
    cam.position.set(0.3, 0.75, 3.7);
    cam.lookAt(0, 1.0, 0);
    const bodyUrl = capture(r, scene, cam, 400, 720);
    Portraits.set(p.id, { head: headUrl, body: bodyUrl });
    scene.remove(a.root);
    a.dispose();
    await new Promise((res) => setTimeout(res, 0));
  }
  (scene.environment as THREE.Texture | null)?.dispose();
}
