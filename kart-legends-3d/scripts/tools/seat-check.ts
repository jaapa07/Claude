/**
 * QA de encaixe piloto × kart: senta cada piloto em cada kart (nó `seat`, como em kartModel.ts), aplica as poses
 * de corrida (idle, drive, turn_*, drift_*, com a virada de cabeça aditiva do CharacterAnimator) e:
 *  1. renderiza folhas de contato por piloto (linhas = karts; colunas = vistas lateral, traseira-3/4 e de cima em
 *     várias poses), uma normal e uma "raio-X" (kart translúcido + vértices do piloto que entram no kart em vermelho);
 *  2. mede a interpenetração: cada vértice do piloto (com skin, em várias fases de cada clipe) é testado contra a
 *     malha do kart (BVH; dentro = o raio bate primeiro numa face de costas, em 2 de 3 direções) e a profundidade é a
 *     distância à superfície. Mãos, pernas e quadril (que tocam volante, banco e pedais de propósito) ficam fora
 *     do ranking principal.
 *
 * As posições do relatório são no espaço do piloto (o mesmo dos scripts de personagem).
 * Uso: npx tsx scripts/tools/seat-check.ts --out=/tmp/clipping [--chars=sora,ren] [--karts=mare] [--size=220]
 *      [--no-render] [--no-check] [--tag=antes] [--cols=0,1,4 (subconjunto das colunas)] [--top=60] [--profile]
 */
import { chromium } from 'playwright';
import http from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CHARACTER_IDS, KART_IDS } from '../../src/data/ids';

const root = path.resolve(import.meta.dirname, '../..');
const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k!, v ?? 'true']; }));
const out = path.resolve(String(flags.out ?? 'seat-check'));
const chars = flags.chars ? String(flags.chars).split(',') : [...CHARACTER_IDS];
const karts = flags.karts ? String(flags.karts).split(',') : [...KART_IDS];
const size = Number(flags.size ?? 220);
const tag = flags.tag ? `-${flags.tag}` : '';
const doRender = flags['no-render'] === undefined;
const doCheck = flags['no-check'] === undefined;
await mkdir(out, { recursive: true });

/** Colunas das folhas: [vista, clipe, instante (s)]. Vistas: side = lado esquerdo do piloto (+X), sideR, rear = traseira-3/4 esquerda, rearR, top. */
const ALL_COLUMNS: [string, string, number][] = [
  ['side', 'drive', 0.3], ['rear', 'drive', 0.3], ['top', 'drive', 0.3], ['rearR', 'idle', 1.2],
  ['rear', 'drift_left', 0.2], ['rearR', 'drift_right', 0.2], ['top', 'drift_left', 0.2],
  ['rear', 'turn_left', 0.25], ['rearR', 'turn_right', 0.25], ['sideR', 'drift_right', 0.6],
];
const COLUMNS = flags.cols ? String(flags.cols).split(',').map((i) => ALL_COLUMNS[Number(i)]!) : ALL_COLUMNS;
const POSES = ['idle', 'drive', 'turn_left', 'turn_right', 'drift_left', 'drift_right'];
/** Virada de cabeça aditiva do CharacterAnimator (steer = ±1 na curva/drift). */
const HEAD_YAW: Record<string, number> = { idle: 0, drive: 0, turn_left: 0.3, turn_right: -0.3, drift_left: 0.55, drift_right: -0.55 };

const mime: Record<string, string> = { '.js': 'text/javascript', '.glb': 'model/gltf-binary', '.html': 'text/html', '.wasm': 'application/wasm', '.webp': 'image/webp' };
const html = `<!doctype html><html><body style="margin:0;background:#20242c">
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/","three-mesh-bvh":"/node_modules/three-mesh-bvh/build/index.module.js"}}</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { MeshBVH } from 'three-mesh-bvh';
const COLUMNS = ${JSON.stringify(COLUMNS)}, POSES = ${JSON.stringify(POSES)}, HEAD_YAW = ${JSON.stringify(HEAD_YAW)};
const size = ${size};
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const CORE = new Set(['root', 'hips', 'legL', 'legR', 'shinL', 'shinR', 'handL', 'handR']);
const kartCache = new Map();
async function loadKart(id) {
  if (kartCache.has(id)) return kartCache.get(id);
  const g = await loader.loadAsync('/public/assets/karts/' + id + '.glb');
  const scene = g.scene; scene.updateMatrixWorld(true);
  const seat = scene.getObjectByName('seat');
  // malha única do kart no espaço do kart, para a BVH
  const tris = [];
  const v = new THREE.Vector3();
  scene.traverse((o) => {
    if (!o.isMesh) return;
    const pos = o.geometry.getAttribute('position'), idx = o.geometry.index;
    const n = idx ? idx.count : pos.count;
    for (let i = 0; i < n; i++) { v.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(o.matrixWorld); tris.push(v.x, v.y, v.z); }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3));
  const bvh = new MeshBVH(geo);
  const k = { id, scene, seat, bvh, box: new THREE.Box3().setFromObject(scene) };
  kartCache.set(id, k);
  return k;
}
async function loadChar(id) {
  const g = await loader.loadAsync('/public/assets/characters/' + id + '.glb');
  const scene = g.scene;
  const mixer = new THREE.AnimationMixer(scene);
  const head = scene.getObjectByName('head');
  const skinned = []; scene.traverse((o) => { if (o.isSkinnedMesh) { skinned.push(o); o.frustumCulled = false; } });
  // osso dominante de cada vértice
  const dom = skinned.map((m) => {
    const si = m.geometry.getAttribute('skinIndex'), sw = m.geometry.getAttribute('skinWeight');
    const out = new Array(si.count);
    for (let i = 0; i < si.count; i++) {
      let best = 0, bw = -1;
      for (let c = 0; c < 4; c++) { const w = sw.getComponent(i, c); if (w > bw) { bw = w; best = si.getComponent(i, c); } }
      out[i] = m.skeleton.bones[best].name;
    }
    return out;
  });
  const pose = (clip, t) => {
    mixer.stopAllAction();
    const c = g.animations.find((a) => a.name === clip);
    if (!c) throw new Error('clipe ausente ' + clip + ' em ' + id);
    mixer.clipAction(c).play(); mixer.setTime(t);
    if (head) head.rotateY(HEAD_YAW[clip] ?? 0);
    scene.updateMatrixWorld(true);
  };
  return { id, scene, mixer, skinned, dom, pose, clips: g.animations };
}
const DIRS = [new THREE.Vector3(0, 1, 0), new THREE.Vector3(0.83, 0.2, 0.52).normalize(), new THREE.Vector3(-0.6, -0.25, -0.76).normalize()];
const ray = new THREE.Ray(), tmp = new THREE.Vector3(), hitTarget = {};
function inside(bvh, p) {
  let votes = 0;
  for (let d = 0; d < 3; d++) {
    ray.origin.copy(p); ray.direction.copy(DIRS[d]);
    const hit = bvh.raycastFirst(ray, THREE.DoubleSide);
    if (hit && hit.face.normal.dot(DIRS[d]) > 0) votes++;
    if (d === 0 && votes === 0) return false; // atalho: o primeiro raio já diz que está fora
    if (votes >= 2) return true;
    if (d === 1 && votes === 0) return false;
  }
  return votes >= 2;
}
/** Vértices do piloto dentro do kart (já sentado e posado). Devolve [x,y,z,profundidade,osso] (espaço do kart). */
function penetration(ch, k) {
  const res = [];
  const v = new THREE.Vector3();
  const box = k.box.clone().expandByScalar(0.01);
  ch.skinned.forEach((m, mi) => {
    const pos = m.geometry.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i); m.applyBoneTransform(i, v); v.applyMatrix4(m.matrixWorld);
      if (!box.containsPoint(v)) continue;
      if (!inside(k.bvh, v)) continue;
      const cp = k.bvh.closestPointToPoint(v, hitTarget);
      const l = ch.scene.worldToLocal(v.clone());
      res.push([v.x, v.y, v.z, cp ? cp.distance : 0, ch.dom[mi][i], l.x, l.y, l.z]);
    }
  });
  return res;
}
function seatChar(ch, k) { k.seat.add(ch.scene); k.scene.updateMatrixWorld(true); }

window.runCheck = async (charIds, kartIds, phases) => {
  const report = [];
  for (const cid of charIds) {
    const ch = await loadChar(cid);
    for (const kid of kartIds) {
      const k = await loadKart(kid);
      seatChar(ch, k);
      for (const clip of POSES) {
        const dur = ch.clips.find((a) => a.name === clip).duration;
        let worst = null;
        for (let f = 0; f < phases; f++) {
          const t = (f / phases) * dur;
          ch.pose(clip, t); k.scene.updateMatrixWorld(true);
          const pts = penetration(ch, k);
          const byBone = {};
          let acc = 0, accMax = 0, coreMax = 0, coreAt = '';
          const accPts = [];
          for (const p of pts) {
            const core = CORE.has(p[4]);
            if (core) { if (p[3] > coreMax) { coreMax = p[3]; coreAt = p[4] + ' @ ' + [p[0], p[1], p[2]].map((v) => v.toFixed(2)).join(','); } continue; }
            const b = byBone[p[4]] ?? (byBone[p[4]] = { n: 0, max: 0, sx: 0, sy: 0, sz: 0, lx: 0, ly: 0, lz: 0, ymin: 9 });
            if (p[3] < 0.008) continue; // toque raso (< 8 mm) não conta
            b.n++; b.max = Math.max(b.max, p[3]); b.sx += p[0]; b.sy += p[1]; b.sz += p[2]; b.lx += p[5]; b.ly += p[6]; b.lz += p[7]; b.ymin = Math.min(b.ymin, p[6]);
            acc++; accMax = Math.max(accMax, p[3]); accPts.push(p);
          }
          const score = accPts.reduce((s, p) => s + p[3], 0);
          if (!worst || score > worst.score) {
            const bones = Object.entries(byBone).filter(([, b]) => b.n > 0).map(([name, b]) => ({ name, n: b.n, maxCm: +(b.max * 100).toFixed(1), at: [+(b.sx / b.n).toFixed(3), +(b.sy / b.n).toFixed(3), +(b.sz / b.n).toFixed(3)], loc: [+(b.lx / b.n).toFixed(3), +(b.ly / b.n).toFixed(3), +(b.lz / b.n).toFixed(3)], locYmin: +b.ymin.toFixed(3) })).sort((a, b) => b.n - a.n);
            worst = { char: cid, kart: kid, clip, t: +t.toFixed(3), score: +score.toFixed(3), verts: acc, maxCm: +(accMax * 100).toFixed(1), coreMaxCm: +(coreMax * 100).toFixed(1), coreAt, bones };
          }
        }
        report.push(worst);
      }
    }
    ch.scene.removeFromParent();
  }
  return report;
};

window.runSheet = async (cid, kartIds) => {
  const ch = await loadChar(cid);
  const ks = []; for (const kid of kartIds) ks.push(await loadKart(kid));
  const cols = COLUMNS.length, rows = ks.length;
  const canvas = document.createElement('canvas');
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, canvas });
  renderer.setSize(size * cols, size * rows);
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.autoClear = false;
  document.body.appendChild(canvas);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x4a4036, 1.2));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.3); sun.position.set(3, 6, 4); scene.add(sun);
  const back = new THREE.DirectionalLight(0xbfd8ff, 1.0); back.position.set(-3, 4, -5); scene.add(back);
  const dirs = { side: [1, 0.18, 0.02], sideR: [-1, 0.18, 0.02], rear: [0.75, 0.45, -1], rearR: [-0.75, 0.45, -1], top: [0.001, 1, -0.12] };
  const shots = {};
  for (const xray of [false, true]) {
    renderer.setClearColor(xray ? 0x15181d : 0x2a303a);
    renderer.setScissorTest(false); renderer.clear(); renderer.setScissorTest(true);
    ks.forEach((k, row) => {
      scene.add(k.scene); seatChar(ch, k);
      const mats = [];
      if (xray) k.scene.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh) { mats.push([o, o.material]); const m = o.material.clone(); m.transparent = true; m.opacity = 0.22; m.depthWrite = false; o.material = m; } });
      COLUMNS.forEach(([view, clip, t], col) => {
        ch.pose(clip, t); k.scene.updateMatrixWorld(true);
        let pts = null;
        if (xray) {
          const pen = penetration(ch, k).filter((p) => p[3] >= 0.008);
          const pos = new Float32Array(pen.length * 3), colr = new Float32Array(pen.length * 3);
          pen.forEach((p, i) => { pos.set([p[0], p[1], p[2]], i * 3); const core = CORE.has(p[4]); colr.set(core ? [1, 0.85, 0.1] : [1, 0.05, 0.05], i * 3); });
          const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(colr, 3));
          pts = new THREE.Points(g, new THREE.PointsMaterial({ size: 3, sizeAttenuation: false, vertexColors: true, depthTest: false, toneMapped: false }));
          pts.renderOrder = 10; scene.add(pts);
        }
        const target = k.seat.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.45, -0.2));
        const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
        cam.position.copy(target).add(new THREE.Vector3(...dirs[view]).normalize().multiplyScalar(view === 'top' ? 2.9 : 2.5)); cam.lookAt(target);
        const x = col * size, y = (rows - 1 - row) * size;
        renderer.setViewport(x, y, size, size); renderer.setScissor(x, y, size, size);
        renderer.clearDepth(); renderer.render(scene, cam);
        if (pts) { scene.remove(pts); pts.geometry.dispose(); pts.material.dispose(); }
      });
      for (const [o, m] of mats) o.material = m;
      scene.remove(k.scene);
    });
    shots[xray ? 'xray' : 'solid'] = canvas.toDataURL('image/png');
  }
  renderer.dispose(); canvas.remove();
  ch.scene.removeFromParent();
  return shots;
};
/** Perfil do encosto: para cada kart, a profundidade (z, espaço do piloto) da primeira superfície atrás do piloto. */
window.runProfile = async (kartIds, xs, ys) => {
  const out = {};
  for (const kid of kartIds) {
    const k = await loadKart(kid);
    const probe = new THREE.Object3D(); k.seat.add(probe); k.scene.updateMatrixWorld(true);
    const rows = [];
    for (const y of ys) {
      const row = [];
      for (const x of xs) {
        const o = probe.localToWorld(new THREE.Vector3(x, y, -0.12));
        const d = probe.localToWorld(new THREE.Vector3(x, y, -1.2)).sub(o).normalize();
        ray.origin.copy(o); ray.direction.copy(d);
        const hit = k.bvh.raycastFirst(ray, THREE.DoubleSide);
        row.push(hit && hit.distance < 1.1 ? +probe.worldToLocal(hit.point.clone()).z.toFixed(3) : null);
      }
      rows.push(row);
    }
    probe.removeFromParent();
    out[kid] = rows;
  }
  return out;
};
window.__ready = true;
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
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });

interface Row { char: string; kart: string; clip: string; t: number; score: number; verts: number; maxCm: number; coreMaxCm: number; coreAt: string; bones: { name: string; n: number; maxCm: number; at: number[]; loc: number[]; locYmin: number }[] }
try {
  const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction('window.__ready === true', undefined, { timeout: 60000 }).catch(() => { throw new Error('página falhou: ' + errors.join(' | ')); });

  if (flags.profile !== undefined) {
    const xs = [-0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.3], ys = Array.from({ length: 12 }, (_, i) => +(0.1 + i * 0.1).toFixed(2));
    const prof = await page.evaluate(async ([k, x, y]) => (window as unknown as { runProfile: (k: string[], x: number[], y: number[]) => Promise<Record<string, (number | null)[][]>> }).runProfile(k, x, y), [karts, xs, ys] as [string[], number[], number[]]);
    console.log('encosto: z da primeira superfície atrás do piloto (espaço do piloto); colunas x = ' + xs.join(' '));
    for (const [kid, rows] of Object.entries(prof)) {
      console.log(kid);
      rows.forEach((r, i) => console.log(`  y=${ys[i]!.toFixed(1)}  ` + r.map((z) => (z === null ? '   -  ' : z.toFixed(2).padStart(6))).join(' ')));
    }
  }
  if (doRender) {
    for (const id of chars) {
      const shots = await page.evaluate(async ([c, k]) => (window as unknown as { runSheet: (c: string, k: string[]) => Promise<Record<string, string>> }).runSheet(c, k), [id, karts] as [string, string[]]);
      for (const [kind, url] of Object.entries(shots)) {
        const file = path.join(out, `${id}${tag}-${kind}.png`);
        await writeFile(file, Buffer.from(url.split(',')[1]!, 'base64'));
      }
      console.log(`folha ${id}: ${path.join(out, `${id}${tag}-{solid,xray}.png`)}`);
    }
    console.log('colunas: ' + COLUMNS.map(([v, c]) => `${v}/${c}`).join(' | ') + '; linhas: ' + karts.join(', '));
  }
  if (doCheck) {
    const rows: Row[] = [];
    for (const id of chars) {
      const r = await page.evaluate(async ([c, k]) => (window as unknown as { runCheck: (c: string[], k: string[], n: number) => Promise<Row[]> }).runCheck(c, k, 6), [[id], karts] as [string[], string[]]);
      rows.push(...r);
      process.stdout.write(`checado ${id}\n`);
    }
    await writeFile(path.join(out, `report${tag}.json`), JSON.stringify(rows, null, 1));
    const bad = rows.filter((r) => r.verts > 0).sort((a, b) => b.score - a.score);
    console.log(`\n${bad.length} de ${rows.length} combinações (piloto × kart × pose) com acessório/tronco/cabeça dentro do kart (> 8 mm):`);
    for (const r of bad.slice(0, Number(flags.top ?? 60))) {
      const bones = r.bones.slice(0, 4).map((b) => `${b.name}×${b.n} (${b.maxCm} cm @ piloto ${b.loc.join(',')} ymin ${b.locYmin})`).join('; ');
      console.log(`  ${r.char.padEnd(6)} ${r.kart.padEnd(10)} ${r.clip.padEnd(11)} t=${r.t.toFixed(2)} vértices=${String(r.verts).padStart(4)} máx=${r.maxCm.toFixed(1).padStart(4)} cm  ${bones}`);
    }
    const core = rows.filter((r) => r.coreMaxCm > 3).sort((a, b) => b.coreMaxCm - a.coreMaxCm);
    console.log(`\nquadril/pernas/mãos (contato esperado) com mais de 3 cm: ${core.length}; piores: ` + core.slice(0, 8).map((r) => `${r.char}/${r.kart}/${r.clip} ${r.coreMaxCm} cm (${r.coreAt})`).join(', '));
  }
  if (errors.length) console.warn('avisos da página: ' + errors.join(' | '));
} finally {
  await browser.close();
  server.close();
}
