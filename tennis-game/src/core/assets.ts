import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

const BASE = 'assets/';
const gltfLoader = new GLTFLoader();
// The WebAssembly mesh decoder is only needed for the compressed .glb files (not in the sandbox-safe build).
const meshoptReady = import.meta.env.VITE_JSON_MODELS
  ? Promise.resolve()
  : import('three/examples/jsm/libs/meshopt_decoder.module.js').then((m) => { gltfLoader.setMeshoptDecoder(m.MeshoptDecoder); }).catch(() => {});
const texLoader = new THREE.TextureLoader();
import { isMobile } from './platform';

/** Phones (iOS Safari above all) kill the tab when GPU memory runs out: keep textures small there. */
const MOBILE_MAX = 512;
function shrinkForMobile(t: THREE.Texture, max: number) {
  const img = t.image as HTMLImageElement | undefined;
  if (!isMobile || !img || !img.width) return;
  const big = Math.max(img.width, img.height);
  if (big <= max) return;
  const k = max / big;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(img.width * k));
  c.height = Math.max(1, Math.round(img.height * k));
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  t.image = c;
  t.needsUpdate = true;
}

/** Sandbox-safe model format (see scripts/glb-to-json.mjs): rebuild a GLB in memory, textures load as same-origin files. */
async function loadJsonModel(url: string): Promise<GLTF> {
  const res = await fetch(url + '.json');
  if (!res.ok) throw new Error(`${res.status} ao baixar ${url}.json`);
  const { gltf, bin } = (await res.json()) as { gltf: Record<string, unknown>; bin: string };
  const raw = atob(bin);
  const binBytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) binBytes[i] = raw.charCodeAt(i);
  const pad = (n: number) => (n + 3) & ~3;
  const jsonBytes = new TextEncoder().encode(JSON.stringify(gltf));
  const jLen = pad(jsonBytes.length), bLen = pad(binBytes.length);
  const out = new ArrayBuffer(12 + 8 + jLen + (bLen ? 8 + bLen : 0));
  const dv = new DataView(out);
  const u8 = new Uint8Array(out);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, out.byteLength, true);
  dv.setUint32(12, jLen, true); dv.setUint32(16, 0x4e4f534a, true);
  u8.set(jsonBytes, 20); u8.fill(0x20, 20 + jsonBytes.length, 20 + jLen);
  if (bLen) { dv.setUint32(20 + jLen, bLen, true); dv.setUint32(24 + jLen, 0x004e4942, true); u8.set(binBytes, 28 + jLen); }
  const base = new URL('.', new URL(url, document.baseURI)).href;
  return gltfLoader.parseAsync(out, base);
}

class AssetStore {
  /** Optional extra animation clips (retargeted Mixamo moves); empty when the file is absent. */
  extraClips: THREE.AnimationClip[] = [];
  async loadExtraClips(path: string) {
    try {
      const r = await fetch(BASE + path);
      if (!r.ok) return;
      const arr = (await r.json()) as unknown[];
      this.extraClips = arr.map((j) => THREE.AnimationClip.parse(j as Parameters<typeof THREE.AnimationClip.parse>[0]));
    } catch { /* optional */ }
  }

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
    const load = import.meta.env.VITE_JSON_MODELS ? loadJsonModel(BASE + path) : meshoptReady.then(() => gltfLoader.loadAsync(BASE + path));
    if (!this.pending.has(path)) this.pending.set(path, load.then((g) => (this.gltf.set(path, g), g)));
    return this.pending.get(path) as Promise<GLTF>;
  }

  loadTex(path: string): Promise<THREE.Texture> {
    if (this.tex.has(path)) return Promise.resolve(this.tex.get(path)!);
    if (!this.pending.has(path))
      this.pending.set(path, texLoader.loadAsync(BASE + path).then((t) => {
        t.colorSpace = /_color|felt|sponsor|banner|grip|strings/.test(path) ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        t.anisotropy = isMobile ? 2 : 8;
        shrinkForMobile(t, /court_lines/.test(path) ? 1024 : MOBILE_MAX);
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
        shrinkForMobile(t, 1024);
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
    ...['harbor', 'clay', 'lawn', 'neon'].flatMap((v) => [`textures/banner_${v}.webp`, `textures/wallads_${v}.webp`]),
    'textures/board_speed.png', 'textures/board_clock.png',
    ...['grass', 'worn', 'clay', 'hard', 'carpet'].flatMap((m) => [`textures/${m}_color.webp`, `textures/${m}_normal.webp`, `textures/${m}_rough.webp`]),
  ],
};
