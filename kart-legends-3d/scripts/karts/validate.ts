/**
 * Valida os GLBs dos karts contra o contrato (docs/CONTRACTS.md, seção 3).
 * Uso: npx tsx scripts/karts/validate.ts   (sai com código 1 se houver falha)
 */
import path from 'node:path';
import { stat } from 'node:fs/promises';
import type { Node } from '@gltf-transform/core';
import { createIO } from '../lib/glb';
import { ASSETS_DIR } from '../lib/textures';
import { THREE } from '../lib/geo';
import { KART_DEFS } from './index';

const REQUIRED = ['body', 'wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr', 'steering', 'seat', 'exhaust_l', 'exhaust_r'];
const io = await createIO();
let failures = 0;

function worldMatrix(n: Node): THREE.Matrix4 {
  return new THREE.Matrix4().fromArray(n.getWorldMatrix());
}
/** Caixa envolvente (no espaço de `space`⁻¹ · mundo) de todas as malhas sob `n`; devolve também triângulos e raio YZ máximo. */
function measure(n: Node, inv: THREE.Matrix4): { box: THREE.Box3; tris: number; radYZ: number; maxAbsX: number } {
  const box = new THREE.Box3();
  let tris = 0, radYZ = 0, maxAbsX = 0;
  const v = new THREE.Vector3();
  n.traverse((c) => {
    const mesh = c.getMesh();
    if (!mesh) return;
    const m = inv.clone().multiply(worldMatrix(c));
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute('POSITION')!;
      const idx = prim.getIndices();
      tris += (idx ? idx.getCount() : pos.getCount()) / 3;
      const el = [0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, el);
        v.set(el[0]!, el[1]!, el[2]!).applyMatrix4(m);
        box.expandByPoint(v);
        radYZ = Math.max(radYZ, Math.hypot(v.y, v.z));
        maxAbsX = Math.max(maxAbsX, Math.abs(v.x));
      }
    }
  });
  return { box, tris, radYZ, maxAbsX };
}

console.log('kart         tris   bytes   rF     rR     seat                 comp.  larg.  minY corpo  resultado');
for (const def of KART_DEFS) {
  const file = path.join(ASSETS_DIR, 'karts', `${def.id}.glb`);
  const errs: string[] = [];
  const check = (ok: boolean, msg: string): void => { if (!ok) errs.push(msg); };
  const doc = await io.read(file);
  const bytes = (await stat(file)).size;
  const nodes = new Map(doc.getRoot().listNodes().map((n) => [n.getName(), n]));
  for (const name of REQUIRED) check(nodes.has(name), `nó ausente: ${name}`);
  if (errs.length) { console.log(`${def.id}: ${errs.join('; ')}`); failures++; continue; }
  const pos = (name: string): THREE.Vector3 => new THREE.Vector3().setFromMatrixPosition(worldMatrix(nodes.get(name)!));
  const I = new THREE.Matrix4();

  const seat = pos('seat');
  check(seat.y >= 0.3 && seat.y <= 0.42, `seat.y fora de 0,30–0,42: ${seat.y.toFixed(3)}`);
  check(seat.z >= -0.25 && seat.z <= -0.05, `seat.z fora de −0,25..−0,05: ${seat.z.toFixed(3)}`);
  check(Math.abs(seat.x) < 1e-4, 'seat fora do centro');
  check(!nodes.get('seat')!.getMesh() && !nodes.get('exhaust_l')!.getMesh() && !nodes.get('exhaust_r')!.getMesh(), 'seat/exhaust devem ser nós vazios');

  // volante: posição, eixo Z local inclinado ~25°, aro de raio 0,15
  const st = nodes.get('steering')!;
  const sp = pos('steering');
  const want = seat.clone().add(new THREE.Vector3(0, 0.5, 0.42));
  check(sp.distanceTo(want) <= 0.02, `volante a ${(sp.distanceTo(want) * 100).toFixed(1)} cm de seat+(0,0.50,0.42)`);
  const stM = worldMatrix(st);
  const zAxis = new THREE.Vector3(0, 0, 1).transformDirection(stM);
  const tilt = THREE.MathUtils.radToDeg(Math.atan2(-zAxis.y, zAxis.z));
  check(Math.abs(tilt - 25) <= 6 && Math.abs(zAxis.x) < 1e-3, `inclinação do volante ${tilt.toFixed(1)}° (esperado ~25°)`);
  const sm = measure(st, stM.clone().invert());
  const rimR = Math.max(sm.box.max.x, -sm.box.min.x);
  check(rimR >= 0.15 && rimR <= 0.22, `raio externo do volante ${rimR.toFixed(3)} (aro de 0,15 + tubo/pegas)`);
  check(Math.abs(sm.box.max.z) < 0.08 && Math.abs(sm.box.min.z) < 0.08, 'volante não está no plano XY local');
  const q = st.getRotation();
  check(Math.abs(q[0]) + Math.abs(q[1]) + Math.abs(q[2]) < 1e-6, 'nó steering deve ter rotação local neutra (o pivô carrega a inclinação)');

  // rodas
  const radii: Record<string, number> = {};
  let tris = 0, maxX = 0, minZ = Infinity, maxZ = -Infinity;
  for (const key of ['fl', 'fr', 'rl', 'rr']) {
    const n = nodes.get(`wheel_${key}`)!;
    const wp = pos(`wheel_${key}`);
    const wm = measure(n, worldMatrix(n).invert());
    radii[key] = wm.radYZ;
    tris += wm.tris;
    check(wm.radYZ >= 0.27 - 1e-3 && wm.radYZ <= 0.36 + 0.03, `raio da roda ${key} fora de 0,27–0,36: ${wm.radYZ.toFixed(3)}`);
    // o raio medido inclui as travas da banda (até 2,6 cm); o centro fica a "raio nominal" do chão
    check(wp.y <= wm.radYZ + 1e-3 && wp.y >= wm.radYZ - 0.03, `roda ${key}: centro y=${wp.y.toFixed(3)} × raio ${wm.radYZ.toFixed(3)} (não toca y=0)`);
    const wq = n.getRotation();
    check(Math.abs(wq[0]) + Math.abs(wq[1]) + Math.abs(wq[2]) < 1e-6, `roda ${key}: nó com rotação (eixo X local deve coincidir com o X do kart)`);
    check((key[1] === 'l') === (wp.x > 0), `roda ${key} do lado errado (esquerda = +X)`);
    check((key[0] === 'f') === (wp.z > 0), `roda ${key} na ponta errada (frente = +Z)`);
    const cx = (wm.box.max.y + wm.box.min.y) / 2, cz = (wm.box.max.z + wm.box.min.z) / 2;
    check(Math.abs(cx) < 0.012 && Math.abs(cz) < 0.012, `roda ${key}: malha descentrada do eixo (${cx.toFixed(3)}, ${cz.toFixed(3)})`);
    const world = measure(n, I);
    check(world.box.min.y > -0.03, `roda ${key} afunda no chão: ${world.box.min.y.toFixed(3)}`);
    maxX = Math.max(maxX, world.maxAbsX); minZ = Math.min(minZ, world.box.min.z); maxZ = Math.max(maxZ, world.box.max.z);
  }
  check(Math.abs(pos('wheel_fl').x + pos('wheel_fr').x) < 1e-4 && Math.abs(pos('wheel_rl').x + pos('wheel_rr').x) < 1e-4, 'rodas assimétricas');

  // corpo
  const bm = measure(nodes.get('body')!, I);
  tris += bm.tris + sm.tris;
  check(bm.box.min.y >= 0.06 - 1e-3, `chassi abaixo de y=0,06: ${bm.box.min.y.toFixed(3)}`);
  const length = Math.max(maxZ, bm.box.max.z) - Math.min(minZ, bm.box.min.z);
  const width = 2 * Math.max(maxX, bm.maxAbsX);
  check(length >= 2.1 && length <= 2.55, `comprimento ${length.toFixed(2)} fora de ~2,3 (2,10–2,55)`);
  check(width >= 1.35 && width <= 1.6, `largura ${width.toFixed(2)} fora de ~1,5 (1,35–1,60)`);
  check(tris >= 8000 && tris <= 18000, `triângulos fora do orçamento 8k–18k: ${tris}`);
  check(bytes <= 500_000, `GLB acima de 500 kB: ${bytes}`);
  for (const ex of ['exhaust_l', 'exhaust_r']) {
    const e = pos(ex);
    check((ex === 'exhaust_l') === (e.x > 0), `${ex} do lado errado`);
    check(bm.box.containsPoint(e) || bm.box.distanceToPoint(e) < 0.03, `${ex} longe do corpo`);
  }
  if (errs.length) failures++;
  console.log(`${def.id.padEnd(11)} ${String(tris).padStart(6)} ${String(bytes).padStart(7)}  ${radii.fl!.toFixed(3)}  ${radii.rl!.toFixed(3)}  (${seat.x.toFixed(2)}, ${seat.y.toFixed(2)}, ${seat.z.toFixed(2)})  ${length.toFixed(2)}   ${width.toFixed(2)}   ${bm.box.min.y.toFixed(3)}       ${errs.length ? 'FALHA: ' + errs.join('; ') : 'ok'}`);
}
if (failures) { console.error(`${failures} kart(s) com falha`); process.exit(1); }
console.log('todos os karts conformes');
