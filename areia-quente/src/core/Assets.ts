import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

const BASE = import.meta.env.BASE_URL;
export const A = (p: string) => `${BASE}assets/${p}`;

export type Item = { kind: 'gltf' | 'tex' | 'json'; url: string; srgb?: boolean; repeat?: boolean };

/** Carregador central com progresso real em bytes/itens e cache. */
export class Assets {
  gltfs = new Map<string, GLTF>();
  texs = new Map<string, THREE.Texture>();
  jsons = new Map<string, any>();
  private gl = new GLTFLoader();
  private tl = new THREE.TextureLoader();
  private pending = new Map<string, Promise<unknown>>();

  async loadAll(items: Item[], onProgress?: (f: number) => void) {
    const todo = items.filter((i) => !this.has(i));
    let done = 0;
    const partial = new Map<string, number>();
    const report = () => {
      if (!onProgress) return;
      let s = done;
      partial.forEach((v) => (s += v));
      onProgress(todo.length ? Math.min(1, s / todo.length) : 1);
    };
    report();
    await Promise.all(
      todo.map((it) =>
        this.load(it, (f) => {
          partial.set(it.url, f);
          report();
        }).then(() => {
          partial.delete(it.url);
          done++;
          report();
        }),
      ),
    );
    onProgress?.(1);
  }

  has(i: Item) {
    return i.kind === 'gltf' ? this.gltfs.has(i.url) : i.kind === 'tex' ? this.texs.has(i.url) : this.jsons.has(i.url);
  }

  load(it: Item, prog?: (f: number) => void): Promise<unknown> {
    if (this.pending.has(it.url)) return this.pending.get(it.url)!;
    let p: Promise<unknown>;
    if (it.kind === 'gltf') {
      p = new Promise((res, rej) =>
        this.gl.load(A(it.url), (g) => { this.gltfs.set(it.url, g); res(g); }, (e) => e.total && prog?.(e.loaded / e.total), rej),
      );
    } else if (it.kind === 'tex') {
      p = new Promise((res, rej) =>
        this.tl.load(A(it.url), (t) => {
          if (it.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
          if (it.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
          t.anisotropy = 8;
          this.texs.set(it.url, t);
          res(t);
        }, undefined, rej),
      );
    } else {
      p = fetch(A(it.url)).then((r) => r.json()).then((j) => { this.jsons.set(it.url, j); return j; });
    }
    this.pending.set(it.url, p);
    return p;
  }

  gltf(url: string) {
    const g = this.gltfs.get(url);
    if (!g) throw new Error('gltf não carregado: ' + url);
    return g;
  }
  tex(url: string) {
    const t = this.texs.get(url);
    if (!t) throw new Error('textura não carregada: ' + url);
    return t;
  }
  json(url: string) {
    return this.jsons.get(url);
  }
  /** Textura sob demanda (ex.: uniformes) com cache. */
  texAsync(url: string, srgb = true): Promise<THREE.Texture> {
    if (this.texs.has(url)) return Promise.resolve(this.texs.get(url)!);
    return this.load({ kind: 'tex', url, srgb }).then(() => this.texs.get(url)!);
  }
}

export const assets = new Assets();
