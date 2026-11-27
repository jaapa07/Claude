import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const BASE = 'assets/';
const gltfLoader = new GLTFLoader();
gltfLoader.setMeshoptDecoder(MeshoptDecoder);
const texLoader = new THREE.TextureLoader();

class AssetStore {
  gltf = new Map<string, GLTF>();
  tex = new Map<string, THREE.Texture>();
  hdr = new Map<string, THREE.Texture>();
  private pending = new Map<string, Promise<unknown>>();

  async loadAll(list: { gltf?: string[]; tex?: string[]; hdr?: string[] }, onProgress?: (f: number) => void) {
    const jobs: Promise<unknown>[] = [];
    let done = 0;
    const total = (list.gltf?.length ?? 0) + (list.tex?.length ?? 0) + (list.hdr?.length ?? 0);
    const tick = () => onProgress?.(++done / Math.max(1, total));
    for (const g of list.gltf ?? []) jobs.push(this.loadGltf(g).then(tick));
    for (const t of list.tex ?? []) jobs.push(this.loadTex(t).then(tick));
    for (const h of list.hdr ?? []) jobs.push(this.loadHdr(h).then(tick));
    await Promise.all(jobs);
  }

  loadGltf(path: string): Promise<GLTF> {
    if (this.gltf.has(path)) return Promise.resolve(this.gltf.get(path)!);
    const url = BASE + (import.meta.env.VITE_JSON_MODELS ? path.replace(/\.glb$/, '.glb.json') : path);
    if (!this.pending.has(path)) this.pending.set(path, gltfLoader.loadAsync(url).then((g) => (this.gltf.set(path, g), g)));
    return this.pending.get(path) as Promise<GLTF>;
  }

  loadTex(path: string): Promise<THREE.Texture> {
    if (this.tex.has(path)) return Promise.resolve(this.tex.get(path)!);
    if (!this.pending.has(path))
      this.pending.set(path, texLoader.loadAsync(BASE + path).then((t) => {
        t.colorSpace = /_color|felt|sponsor|banner|grip|strings/.test(path) ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        t.anisotropy = 8;
        this.tex.set(path, t);
        return t;
      }));
    return this.pending.get(path) as Promise<THREE.Texture>;
  }

  /** Sky panoramas (tone-mapped equirectangular JPEGs) used for background and image-based lighting. */
  loadHdr(path: string): Promise<THREE.Texture> {
    if (this.hdr.has(path)) return Promise.resolve(this.hdr.get(path)!);
    if (!this.pending.has(path))
      this.pending.set(path, texLoader.loadAsync(BASE + path).then((t) => {
        t.mapping = THREE.EquirectangularReflectionMapping;
        t.colorSpace = THREE.SRGBColorSpace;
        this.hdr.set(path, t);
        return t;
      }));
    return this.pending.get(path) as Promise<THREE.Texture>;
  }

  g(path: string): GLTF {
    const g = this.gltf.get(path);
    if (!g) throw new Error('asset not loaded: ' + path);
    return g;
  }
  t(path: string, repeat?: number): THREE.Texture {
    const t = this.tex.get(path);
    if (!t) throw new Error('texture not loaded: ' + path);
    if (repeat) {
      const c = t.clone();
      c.wrapS = c.wrapT = THREE.RepeatWrapping;
      c.repeat.set(repeat, repeat);
      c.needsUpdate = true;
      return c;
    }
    return t;
  }
}

export const Assets = new AssetStore();

export const CORE_ASSETS = {
  gltf: [
    'models/athlete_m.glb', 'models/athlete_f.glb', 'models/anims.glb', 'models/crowd_m.glb', 'models/crowd_f.glb',
    'models/hair_simpleparted.glb', 'models/hair_long.glb', 'models/hair_buns.glb', 'models/hair_buzzed.glb', 'models/hair_beard.glb',
    'models/props/racket.glb', 'models/props/ball.glb', 'models/props/net.glb', 'models/props/umpire_chair.glb', 'models/props/bench.glb',
    'models/props/potted_plant_01.glb', 'models/props/potted_plant_04.glb', 'models/props/shrub_01.glb', 'models/props/flood_lights.glb',
    'models/props/plastic_crate_01.glb', 'models/props/planter_box_01.glb',
  ],
  tex: [
    'textures/court_lines.png', 'textures/fx_dot.png', 'textures/court_zone.png', 'textures/grass_wear.png', 'textures/grass_stripes.png', 'textures/sponsor_atlas.webp',
    'textures/fabric_normal.webp', 'textures/concrete_color.webp', 'textures/concrete_normal.webp', 'textures/metal_color.webp',
    ...['harbor', 'clay', 'lawn', 'neon'].map((v) => `textures/banner_${v}.webp`),
    ...['grass', 'worn', 'clay', 'hard', 'carpet'].flatMap((m) => [`textures/${m}_color.webp`, `textures/${m}_normal.webp`, `textures/${m}_rough.webp`]),
  ],
};
