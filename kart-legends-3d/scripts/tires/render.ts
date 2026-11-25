/**
 * Renderização das rodas da loja em Chromium headless + three.js (mesma abordagem de scripts/tools/preview.ts):
 * usada pelos ícones de interface (build-tires.ts) e pela ferramenta de inspeção (tools/preview-tires.ts).
 * Os karts recebem o pneu pelo helper REAL do jogo (src/game/vehicles/tires.ts, transpilado na hora).
 */
import { chromium, type Browser, type Page } from 'playwright';
import ts from 'typescript';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');

/** Uma célula da grade: um pneu sozinho ou um kart (opcionalmente com pneu), visto de `dir`. */
export interface Cell {
  tire?: string | null;
  kart?: string;
  dir: [number, number, number];
  /** zoom (>1 aproxima) */
  zoom?: number;
  /** enquadra só esta roda do kart (ex.: 'wheel_fl') */
  focus?: string;
  label?: string;
}

const PAGE = `<!doctype html><html><body style="margin:0;background:transparent">
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { applyTires } from '/__tires.js';
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const cache = new Map();
const load = (p) => { if (!cache.has(p)) cache.set(p, loader.loadAsync(p)); return cache.get(p); };
window.renderGrid = async ({ cells, size, cols, background }) => {
  const rows = Math.ceil(cells.length / cols);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size * cols, size * rows);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.autoClear = false;
  renderer.setClearColor(background ?? 0x000000, background === null ? 0 : 1);
  document.body.innerHTML = ''; document.body.appendChild(renderer.domElement);
  const env = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  renderer.setClearColor(background ?? 0x000000, background === null ? 0 : 1);
  renderer.setScissorTest(true);
  renderer.setScissor(0, 0, size * cols, size * rows); renderer.clear();
  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const scene = new THREE.Scene(); scene.environment = env; scene.environmentIntensity = 0.55;
    scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x4a4036, 1.2));
    const sun = new THREE.DirectionalLight(0xfff1d6, 2.6); sun.position.set(4, 6, 5); scene.add(sun);
    const fill = new THREE.DirectionalLight(0xb8ccff, 0.8); fill.position.set(-5, 2, -3); scene.add(fill);
    let obj;
    if (cell.kart) {
      obj = (await load('/public/assets/karts/' + cell.kart + '.glb')).scene.clone(true);
      applyTires(obj, cell.tire ? await load('/public/assets/tires/' + cell.tire + '.glb') : null);
    } else obj = (await load('/public/assets/tires/' + cell.tire + '.glb')).scene.clone(true);
    scene.add(obj);
    obj.updateMatrixWorld(true);
    const target = cell.focus ? obj.getObjectByName(cell.focus) : obj;
    const box = new THREE.Box3().setFromObject(target);
    const c = box.getCenter(new THREE.Vector3()); const r = (box.getSize(new THREE.Vector3()).length() / 2 || 1) / (cell.zoom ?? 1);
    if (cell.kart && !cell.focus) {
      const g = new THREE.GridHelper(4, 8, 0x556070, 0x39414d); scene.add(g);
    }
    const cam = new THREE.PerspectiveCamera(30, 1, r / 50, r * 60);
    cam.position.copy(c).add(new THREE.Vector3(...cell.dir).normalize().multiplyScalar(r * 3.6)); cam.lookAt(c);
    const x = (i % cols) * size, y = (rows - 1 - Math.floor(i / cols)) * size;
    renderer.setViewport(x, y, size, size); renderer.setScissor(x, y, size, size);
    renderer.clear(); renderer.render(scene, cam);
  }
  return true;
};
window.__ready = true;
</script></body></html>`;

const mime: Record<string, string> = { '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.html': 'text/html', '.webp': 'image/webp' };

export class TireRenderer {
  private server!: http.Server;
  private browser!: Browser;
  private page!: Page;
  private errors: string[] = [];

  async start(): Promise<this> {
    const src = await readFile(path.join(root, 'src/game/vehicles/tires.ts'), 'utf8');
    const helper = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
    this.server = http.createServer(async (req, res) => {
      const url = decodeURIComponent((req.url ?? '/').split('?')[0]!);
      if (url === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(PAGE); return; }
      if (url === '/__tires.js') { res.writeHead(200, { 'content-type': 'text/javascript' }); res.end(helper); return; }
      try {
        const file = path.join(root, url);
        if (!file.startsWith(root)) throw new Error('fora da raiz');
        const body = await readFile(file);
        res.writeHead(200, { 'content-type': mime[path.extname(file)] ?? 'application/octet-stream' });
        res.end(body);
      } catch { res.writeHead(404); res.end(); }
    });
    await new Promise<void>((r) => this.server.listen(0, r));
    const port = (this.server.address() as { port: number }).port;
    this.browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
    this.page = await this.browser.newPage({ viewport: { width: 400, height: 400 } });
    this.page.on('pageerror', (e) => this.errors.push(e.message));
    this.page.on('console', (m) => { if (m.type() === 'error') this.errors.push(m.text()); });
    await this.page.goto(`http://127.0.0.1:${port}/`);
    await this.page.waitForFunction('window.__ready === true', undefined, { timeout: 60000 }).catch(() => { throw new Error('página não carregou: ' + this.errors.join(' | ')); });
    return this;
  }

  /** Renderiza a grade e devolve o PNG. `background` null = transparente. */
  async grid(cells: Cell[], size: number, cols: number, background: number | null = 0x2a303a): Promise<Buffer> {
    const rows = Math.ceil(cells.length / cols);
    await this.page.setViewportSize({ width: size * cols, height: size * rows });
    await this.page.evaluate((cfg) => (window as unknown as { renderGrid: (c: unknown) => Promise<boolean> }).renderGrid(cfg), { cells, size, cols, background })
      .catch((e: Error) => { throw new Error(`render falhou: ${e.message} ${this.errors.join(' | ')}`); });
    return this.page.locator('canvas').screenshot({ omitBackground: background === null });
  }

  async stop(): Promise<void> {
    await this.browser?.close();
    this.server?.close();
  }
}
