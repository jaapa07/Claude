/**
 * Pré-visualização e verificação das bibliotecas de cenário da Copa Eclipse.
 *
 *   npx tsx scripts/props/preview-eclipse.ts                 → folhas de contato de tudo
 *   npx tsx scripts/props/preview-eclipse.ts neon celeste    → só essas bibliotecas
 *   npx tsx scripts/props/preview-eclipse.ts predio-neon --seeds=1,2,3,4,5,6
 *   npx tsx scripts/props/preview-eclipse.ts --check         → tabela (triângulos, limites, vão livre) sem renderizar
 *
 * Os GLBs são temporários e ficam no diretório de rascunho (fora de `public/`). Como `scripts/tools/preview.ts`
 * só serve arquivos de dentro do projeto, um link simbólico temporário em `node_modules/.cache` aponta para lá.
 */
import { spawnSync } from 'node:child_process';
import { mkdir, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import { Model, rng, THREE } from '../lib/geo';
import { GlbBuilder } from '../lib/glb';
import { BOREAL_PROPS } from './boreal';
import { CELESTE_PROPS } from './celeste';
import { FORTALEZA_PROPS } from './fortaleza';
import { NEON_PROPS } from './neon';
import { OBSTACULO_PROPS } from './obstaculos';
import { registerEclipseTextures } from './textures-eclipse';
import type { PropDef, PropLibrary } from './types';

const ROOT = path.resolve(import.meta.dirname, '../..');
const OUT = process.env.ECLIPSE_PREVIEW_DIR ?? '/tmp/claude-0/-home-user-Claude/63dcf86c-35a6-58f8-b340-e0296e5742d9/scratchpad/props-eclipse';
const LINK = path.join(ROOT, 'node_modules/.cache/props-eclipse');
const LIBS: Record<string, PropLibrary> = { neon: NEON_PROPS, boreal: BOREAL_PROPS, celeste: CELESTE_PROPS, fortaleza: FORTALEZA_PROPS, obstaculos: OBSTACULO_PROPS };
/** Objetos cuja geometria desce abaixo do chão de propósito (ilhas suspensas e bordas de ilha). */
const BELOW_GROUND = new Set(['ilha-flutuante', 'ilha-pequena', 'cachoeira-celeste', 'martelo-pendulo']);
const SPAN_IDS = new Set(['tunel-neon', 'portico-neon', 'arco-gelo', 'ruina-arco-celeste', 'pergola-celeste', 'portao-fortaleza', 'salao-arco']);

const args = process.argv.slice(2);
const flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k!, v ?? '1']; }));
const filters = args.filter((a) => !a.startsWith('--'));
const seeds = String(flags.seeds ?? '7').split(',').map(Number);
const per = Number(flags.per ?? 6);

interface Entry { lib: string; id: string; def: PropDef }
const entries: Entry[] = [];
for (const [lib, props] of Object.entries(LIBS)) {
  for (const [id, def] of Object.entries(props)) {
    if (filters.length === 0 || filters.includes(lib) || filters.includes(id)) entries.push({ lib, id, def });
  }
}

/** Menor altura de geometria dentro do vão |x| < span/2 (amostra vértices, arestas e centro de cada triângulo). */
function clearance(model: Model, span: number): number {
  let low = Infinity;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), p = new THREE.Vector3();
  const half = span / 2 - 0.01;
  for (const part of model.parts) {
    const pos = part.geo.getAttribute('position');
    for (let i = 0; i < pos.count; i += 3) {
      a.fromBufferAttribute(pos, i); b.fromBufferAttribute(pos, i + 1); c.fromBufferAttribute(pos, i + 2);
      for (let s = 0; s <= 6; s++) for (let t = 0; t <= 6 - s; t++) {
        p.set(0, 0, 0).addScaledVector(a, s / 6).addScaledVector(b, t / 6).addScaledVector(c, (6 - s - t) / 6);
        if (Math.abs(p.x) < half && p.y > 0.06 && p.y < low) low = p.y;
      }
    }
  }
  return low;
}

function check(): boolean {
  let ok = true;
  const rows: string[] = [];
  const budget = (r: number): number => (r >= 5 ? 5000 : r >= 1.5 ? 2500 : 600);
  for (const { lib, id, def } of entries) {
    let tris = 0, minY = Infinity, maxY = -Infinity, maxR = 0, animTris = 0;
    const notes: string[] = [];
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const m = def.build(rng(seed), SPAN_IDS.has(id) ? 16 : undefined);
      const b = m.bounds();
      tris = Math.max(tris, m.triangleCount());
      minY = Math.min(minY, b.min.y); maxY = Math.max(maxY, b.max.y);
      maxR = Math.max(maxR, Math.abs(b.min.x), Math.abs(b.max.x), Math.abs(b.min.z), Math.abs(b.max.z));
      for (const part of m.parts) {
        const pos = part.geo.getAttribute('position');
        for (let i = 0; i < pos.array.length; i++) if (!Number.isFinite(pos.array[i]!)) { notes.push('NaN'); ok = false; break; }
      }
      if (def.animated) animTris = Math.max(animTris, def.animated.build(rng(seed)).triangleCount());
    }
    const total = tris + animTris;
    if (total > 5000 || total > budget(def.radius) * 1.0 && total > 5000) { notes.push('TRIS>5000'); ok = false; }
    if (!BELOW_GROUND.has(id) && (minY < -0.3 || minY > 0.05)) { notes.push('minY fora de [-0.3, 0.05]'); ok = false; }
    if (SPAN_IDS.has(id)) {
      for (const span of [16, 24]) {
        const low = Math.min(...[1, 2, 3].map((s) => clearance(def.build(rng(s), span), span)));
        notes.push(`vão ${span}: livre ${low === Infinity ? '∞' : low.toFixed(2)} m`);
        if (low < 6) { notes.push('VÃO < 6 m'); ok = false; }
      }
    }
    if (lib === 'obstaculos' && !def.collider) { notes.push('SEM COLLIDER'); ok = false; }
    rows.push([lib, id.padEnd(24), String(tris).padStart(5), def.animated ? `+${animTris}`.padStart(5) : '    -', minY.toFixed(2).padStart(7), maxY.toFixed(1).padStart(6), maxR.toFixed(1).padStart(6),
      `r=${def.radius}`.padEnd(7), def.collider ? `col ${def.collider.radius}×${def.collider.height}`.padEnd(13) : 'sem col      ', def.animated ? def.animated.motion.kind.padEnd(5) : '     ', notes.join('; ')].join(' | '));
  }
  console.log('lib | id | tris | anim | minY | maxY | meiaLarg | raio | colisor | mov | notas');
  console.log(rows.join('\n'));
  console.log(ok ? `\nOK: ${entries.length} objetos verificados` : '\nFALHAS encontradas');
  return ok;
}

async function render(): Promise<void> {
  await registerEclipseTextures();
  await mkdir(OUT, { recursive: true });
  await mkdir(path.dirname(LINK), { recursive: true });
  await rm(LINK, { force: true });
  await symlink(OUT, LINK);
  try {
    const files: { lib: string; file: string }[] = [];
    for (const { lib, id, def } of entries) {
      for (const seed of seeds) {
        const b = new GlbBuilder();
        const span = SPAN_IDS.has(id) ? Number(flags.span ?? 16) : undefined;
        b.node(id, { mesh: b.mesh(id, def.build(rng(seed), span)) });
        if (def.animated) b.node(`${id}-anim`, { mesh: b.mesh(`${id}-anim`, def.animated.build(rng(seed))), t: def.animated.pivot });
        const name = `${id}${seeds.length > 1 ? `-s${seed}` : ''}.glb`;
        await b.save(path.join(OUT, name));
        files.push({ lib: filters.includes(id) && seeds.length > 1 ? id : lib, file: `node_modules/.cache/props-eclipse/${name}` });
      }
    }
    const groups = new Map<string, string[]>();
    for (const f of files) groups.set(f.lib, [...(groups.get(f.lib) ?? []), f.file]);
    for (const [lib, list] of groups) {
      for (let i = 0; i < list.length; i += per) {
        const chunk = list.slice(i, i + per);
        const out = path.join(OUT, `${lib}-${String(i / per + 1).padStart(2, '0')}.png`);
        const r = spawnSync('npx', ['tsx', 'scripts/tools/preview.ts', out, ...chunk, `--views=${flags.views ?? 'front,q,back'}`, `--size=${flags.size ?? 400}`], { cwd: ROOT, stdio: 'inherit' });
        if (r.status !== 0) throw new Error(`preview falhou em ${out}`);
        console.log(`  ${chunk.map((c) => path.basename(c, '.glb')).join(', ')}`);
      }
    }
  } finally {
    await rm(LINK, { force: true });
  }
}

if (flags.check) {
  if (!check()) process.exitCode = 1;
} else {
  await render();
}
