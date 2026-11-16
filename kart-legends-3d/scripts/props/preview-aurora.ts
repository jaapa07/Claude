/**
 * Pré-visualização e verificação das bibliotecas de cenário da Copa Aurora.
 * Exporta cada objeto como GLB temporário e gera folhas de contato PNG (scripts/tools/preview.ts).
 *
 * Uso: npx tsx scripts/props/preview-aurora.ts [--theme=porto,bosque] [--only=id,id] [--no-render] [--per=6] [--size=330] [--views=front,q,back]
 * Saída: <scratchpad>/props-aurora/ (GLBs temporários + folhas `sheet-<tema>-<n>.png`); nada vai para public/assets/props.
 * Sempre imprime a tabela de verificação (triângulos, caixa envolvente, vão livre dos objetos com `span`).
 */
import { execFileSync } from 'node:child_process';
import { mkdir, rm, symlink } from 'node:fs/promises';
import path from 'node:path';
import { THREE, rng, type Model } from '../lib/geo';
import { GlbBuilder } from '../lib/glb';
import { BOSQUE_PROPS } from './bosque';
import { CANION_PROPS } from './canion';
import { CORRIDA_PROPS } from './corrida';
import { PORTO_PROPS } from './porto';
import { registerAuroraTextures } from './textures-aurora';
import type { PropLibrary } from './types';
import { VALE_PROPS } from './vale';

const ROOT = path.resolve(import.meta.dirname, '../..');
const OUT = process.env.AURORA_PREVIEW_DIR ?? '/tmp/claude-0/-home-user-Claude/63dcf86c-35a6-58f8-b340-e0296e5742d9/scratchpad/props-aurora';
/** O preview.ts só serve arquivos sob a raiz do projeto: um link simbólico em node_modules/.cache aponta para a pasta temporária. */
const LINK_REL = 'node_modules/.cache/aurora-props-preview';

const LIBS: Record<string, PropLibrary> = { porto: PORTO_PROPS, bosque: BOSQUE_PROPS, vale: VALE_PROPS, canion: CANION_PROPS, corrida: CORRIDA_PROPS };
/** Objetos que passam por cima da pista (recebem `span`). */
export const SPAN_IDS = new Set(['varal-lanternas', 'arco-pedra', 'arco-caverna', 'ponte-coberta', 'arco-rochoso', 'ruina-portal', 'bandeirolas']);
const BIG = new Set(['casa-porto', 'casa-porto-torre', 'farol', 'arvore-gigante', 'cachoeira', 'arco-caverna', 'moinho', 'celeiro', 'casa-fazenda', 'ponte-coberta', 'roda-dagua', 'mesa-rochosa', 'arco-rochoso', 'arco-pedra', 'arquibancada', 'ruina-portal']);

const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));
const themes = flags.theme ? String(flags.theme).split(',') : Object.keys(LIBS);
const only = flags.only ? new Set(String(flags.only).split(',')) : null;
const per = Number(flags.per ?? 6);

function seedOf(id: string, k = 0): number {
  let h = 2166136261 + k * 977;
  for (const ch of id) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Algum ponto da malha invade o vão livre |x| < span/2, 0.05 < y < clear? */
function intrudes(model: Model, span: number, clear: number): number {
  let bad = 0;
  const v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const p = new THREE.Vector3();
  const inside = (q: THREE.Vector3): boolean => Math.abs(q.x) < span / 2 - 0.01 && q.y > 0.05 && q.y < clear - 0.01;
  for (const part of model.parts) {
    const pos = part.geo.getAttribute('position');
    for (let i = 0; i < pos.count; i += 3) {
      for (let k = 0; k < 3; k++) v[k]!.fromBufferAttribute(pos, i + k);
      let hit = false;
      for (let a = 0; a <= 4 && !hit; a++) for (let b = 0; b <= 4 - a && !hit; b++) {
        p.set(0, 0, 0).addScaledVector(v[0]!, a / 4).addScaledVector(v[1]!, b / 4).addScaledVector(v[2]!, (4 - a - b) / 4);
        hit = inside(p);
      }
      if (hit) bad++;
    }
  }
  return bad;
}

await registerAuroraTextures();
await mkdir(OUT, { recursive: true });
await mkdir(path.join(ROOT, 'node_modules/.cache'), { recursive: true });
await rm(path.join(ROOT, LINK_REL), { force: true });
await symlink(OUT, path.join(ROOT, LINK_REL));

let problems = 0;
const rows: string[] = [];
for (const theme of themes) {
  const lib = LIBS[theme];
  if (!lib) throw new Error(`tema desconhecido: ${theme}`);
  const glbs: string[] = [];
  for (const [id, def] of Object.entries(lib)) {
    if (only && !only.has(id)) continue;
    const isSpan = SPAN_IDS.has(id);
    const issues: string[] = [];
    const model = def.build(rng(seedOf(id)), isSpan ? 20 : undefined);
    const anim = def.animated?.build(rng(seedOf(id, 1)));
    const tris = model.triangleCount() + (anim?.triangleCount() ?? 0);
    const b = model.bounds();
    const limit = BIG.has(id) ? 5000 : 2500;
    if (tris > limit) issues.push(`triângulos ${tris} > ${limit}`);
    if (tris < 60) issues.push(`triângulos ${tris} < 60`);
    if (b.min.y < -0.3 || b.min.y > 0.05) issues.push(`minY=${b.min.y.toFixed(2)}`);
    for (const part of model.parts) {
      const pos = part.geo.getAttribute('position');
      for (let i = 0; i < pos.array.length; i++) if (!Number.isFinite(pos.array[i]!)) { issues.push(`NaN em ${part.mat}`); break; }
    }
    // variação: outra semente deve produzir geometria diferente
    const alt = def.build(rng(seedOf(id, 7)), isSpan ? 20 : undefined).bounds();
    if (alt.min.distanceTo(b.min) + alt.max.distanceTo(b.max) < 1e-6 && !def.animated) issues.push('sem variação por rand (caixa idêntica)');
    let clearTxt = '';
    if (isSpan) {
      for (const span of [16, 24]) {
        const sm = def.build(rng(seedOf(id, span)), span);
        const hit = intrudes(sm, span, 6);
        const sb = sm.bounds();
        if (hit > 0) issues.push(`span=${span}: ${hit} triângulo(s) dentro do vão livre`);
        if (sb.min.x > -span / 2 || sb.max.x < span / 2) issues.push(`span=${span}: não cobre o vão`);
        if (sb.min.y < -0.3 || sb.min.y > 0.05) issues.push(`span=${span}: minY=${sb.min.y.toFixed(2)}`);
      }
      clearTxt = 'span';
    }
    if (def.collider && isSpan) issues.push('objeto com span não deve ter collider');
    const sz = b.getSize(new THREE.Vector3());
    rows.push(`${theme.padEnd(8)} ${id.padEnd(24)} ${String(tris).padStart(5)}  ${sz.x.toFixed(1).padStart(5)}×${sz.y.toFixed(1).padStart(5)}×${sz.z.toFixed(1).padStart(5)}  minY ${b.min.y.toFixed(2).padStart(5)}  r=${String(def.radius).padEnd(4)} ${clearTxt.padEnd(4)} ${def.animated ? `anim:${def.animated.motion.kind}` : ''.padEnd(9)} ${def.collider ? `col ${def.collider.radius}/${def.collider.height}` : '-'} ${issues.length ? `  !! ${issues.join('; ')}` : ''}`);
    problems += issues.length;

    if (!flags['no-render']) {
      const gb = new GlbBuilder();
      const root = gb.node(id, { mesh: gb.mesh(id, model) });
      if (anim && def.animated) gb.node(`${id}-movel`, { parent: root, t: def.animated.pivot, mesh: gb.mesh(`${id}-movel`, anim) });
      const file = `${theme}--${id}.glb`;
      await gb.save(path.join(OUT, file));
      glbs.push(`${LINK_REL}/${file}`);
    }
  }
  if (!flags['no-render']) {
    for (let i = 0; i < glbs.length; i += per) {
      const sheet = path.join(OUT, `sheet-${theme}-${String(i / per + 1).padStart(2, '0')}${only ? '-only' : ''}.png`);
      execFileSync('npx', ['tsx', 'scripts/tools/preview.ts', sheet, ...glbs.slice(i, i + per), `--views=${flags.views ?? 'front,q,back'}`, `--size=${flags.size ?? 330}`], { cwd: ROOT, stdio: 'inherit' });
    }
  }
}
console.log(rows.join('\n'));
console.log(problems === 0 ? `\nOK: ${rows.length} objeto(s) sem problemas.` : `\nFALHAS: ${problems} problema(s).`);
if (problems > 0) process.exitCode = 1;
