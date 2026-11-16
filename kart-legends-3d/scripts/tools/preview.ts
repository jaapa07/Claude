/**
 * Renderiza GLBs em PNG para inspeção visual (Chromium headless + three.js).
 * Uso: npx tsx scripts/tools/preview.ts saida.png a.glb[@clip:tempo] b.glb ...  [--views=front,side,back,top] [--size=420]
 * Cada GLB vira uma linha; cada vista, uma coluna. `@clip:tempo` aplica um clipe de animação no instante dado.
 */
import { chromium } from 'playwright';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const args = process.argv.slice(2);
const out = args.shift();
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const files = args.filter((a) => !a.startsWith('--'));
if (!out || files.length === 0) throw new Error('uso: preview.ts saida.png arquivo.glb[@clip:tempo] ...');
const views = String(flags.views ?? 'front,side,back,top').split(',');
const size = Number(flags.size ?? 420);

const mime: Record<string, string> = { '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.html': 'text/html', '.wasm': 'application/wasm', '.webp': 'image/webp' };
const html = `<!doctype html><html><body style="margin:0;background:#20242c">
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
const files = ${JSON.stringify(files)}, views = ${JSON.stringify(views)}, size = ${size};
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(size * views.length, size * files.length);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.autoClear = false; renderer.setClearColor(0x2a303a);
document.body.appendChild(renderer.domElement);
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const dirs = { front: [0.35, 0.35, 1], side: [1, 0.3, 0.05], back: [-0.4, 0.4, -1], top: [0.01, 1, 0.2], q: [0.8, 0.5, 0.8] };
renderer.clear();
for (let row = 0; row < files.length; row++) {
  const [file, anim] = files[row].split('@');
  const gltf = await loader.loadAsync('/' + file);
  const scene = new THREE.Scene(); scene.background = null;
  scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x4a4036, 1.1));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.4); sun.position.set(3, 6, 4); scene.add(sun);
  scene.add(gltf.scene);
  if (anim) {
    const [clipName, t] = anim.split(':');
    const clip = gltf.animations.find((c) => c.name === clipName);
    if (!clip) throw new Error('clipe ausente: ' + clipName + ' em ' + file + ' (tem: ' + gltf.animations.map((c) => c.name) + ')');
    const mixer = new THREE.AnimationMixer(gltf.scene); mixer.clipAction(clip).play(); mixer.setTime(Number(t ?? 0));
  }
  gltf.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(gltf.scene);
  const c = box.getCenter(new THREE.Vector3()); const r = box.getSize(new THREE.Vector3()).length() / 2 || 1;
  scene.add(new THREE.GridHelper(Math.ceil(r * 4), Math.ceil(r * 4), 0x556070, 0x39414d));
  views.forEach((v, colI) => {
    const cam = new THREE.PerspectiveCamera(32, 1, r / 50, r * 50);
    const d = new THREE.Vector3(...(dirs[v] ?? dirs.q)).normalize().multiplyScalar(r * 3.3);
    cam.position.copy(c).add(d); cam.lookAt(c);
    renderer.setViewport(colI * size, (files.length - 1 - row) * size, size, size);
    renderer.setScissor(colI * size, (files.length - 1 - row) * size, size, size); renderer.setScissorTest(true);
    renderer.clearDepth(); renderer.render(scene, cam);
  });
}
window.__done = true;
</script></body></html>`;

const server = http.createServer(async (req, res) => {
  const url = decodeURIComponent((req.url ?? '/').split('?')[0]!);
  if (url === '/') { res.writeHead(200, { 'content-type': 'text/html' }); res.end(html); return; }
  try {
    const file = path.join(root, url);
    if (!file.startsWith(root)) throw new Error('fora da raiz');
    res.writeHead(200, { 'content-type': mime[path.extname(file)] ?? 'application/octet-stream' });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise<void>((r) => server.listen(0, r));
const port = (server.address() as { port: number }).port;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: size * views.length, height: size * files.length } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction('window.__done === true', undefined, { timeout: 60000 }).catch(() => { throw new Error('render falhou: ' + errors.join(' | ')); });
  await page.locator('canvas').screenshot({ path: out });
  console.log(`ok ${out} (${files.length} modelo(s) × ${views.length} vista(s))`);
} finally {
  await browser.close();
  server.close();
}
