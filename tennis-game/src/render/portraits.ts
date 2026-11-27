import * as THREE from 'three';
import { Athlete, type AnimName } from '../game/athlete';
import { Assets } from '../core/assets';
import type { PlayerDef } from '../data/content';

// Renders portraits of the real 3D athletes (head shots for menus, full body for the VS screen)
// with a small offscreen WebGL renderer, once at boot.
export const Portraits = new Map<string, { head: string; body: string }>();

export async function renderPortraits(players: PlayerDef[]) {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 1.1;
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
    r.setSize(256, 256, false);
    cam.aspect = 1;
    cam.fov = 24;
    cam.updateProjectionMatrix();
    cam.position.set(head.x + 0.18, head.y + 0.02, head.z + 1.25);
    cam.lookAt(head.x, head.y - 0.12, head.z);
    r.setClearColor(0x000000, 0);
    r.render(scene, cam);
    const headUrl = r.domElement.toDataURL('image/png');
    // full body, heroic low angle
    pose('arms_folded', 0.4);
    a.root.rotation.y = 0.25;
    r.setSize(400, 720, false);
    cam.aspect = 400 / 720;
    cam.fov = 30;
    cam.updateProjectionMatrix();
    cam.position.set(0.3, 0.75, 3.7);
    cam.lookAt(0, 1.0, 0);
    r.render(scene, cam);
    const bodyUrl = r.domElement.toDataURL('image/png');
    Portraits.set(p.id, { head: headUrl, body: bodyUrl });
    scene.remove(a.root);
    await new Promise((res) => setTimeout(res, 0));
  }
  r.dispose();
  r.forceContextLoss();
}
