/**
 * Gera as pistas: public/assets/tracks/<id>.glb + <id>.json, as partes móveis de cenário e os obstáculos.
 * Uso: npx tsx scripts/build-tracks.ts [--no-props] [--only=<id>] [--layout=<arquivo.png>]
 * Com --only, grava só aquela pista e os obstáculos que ela usa (sem regravar modelos animados já existentes,
 * compartilhados com outras pistas) e atualiza a entrada dela em tracks-manifest.json.
 */
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { GlbBuilder } from './lib/glb';
import { ASSETS_DIR } from './lib/textures';
import type { PropLibrary } from './props/types';
import { buildTrack, type BuildReport } from './tracks/build';
import { TRACK_DEFS } from './tracks/defs';
import { samplePath } from './tracks/sample';
import { registerTrackTextures } from './tracks/textures';
import { rng } from './lib/geo';

const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => { const [k, v] = a.slice(2).split('='); return [k, v ?? 'true']; }));
const only = flags.only as string | undefined;

async function loadProps(): Promise<PropLibrary> {
  const { ALL_PROPS, registerPropTextures } = await import('./props/index');
  await registerPropTextures();
  return ALL_PROPS;
}

/** Planta baixa das pistas (para conferir o traçado autorado); com --only, só aquela pista. Grade de 4 colunas. */
async function layout(file: string): Promise<void> {
  const cell = 520;
  const defs = TRACK_DEFS.filter((d) => !only || d.id === only);
  const cols = Math.min(4, defs.length), rows = Math.ceil(defs.length / 4);
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cell * cols}" height="${cell * rows}"><rect width="100%" height="100%" fill="#1d2129"/>`;
  defs.forEach((def, k) => {
    const s = samplePath(def.points, true);
    const ox = (k % 4) * cell + cell / 2, oz = Math.floor(k / 4) * cell + cell / 2;
    const sc = 0.95;
    const colors: Record<string, string> = { asphalt: '#c9ccd4', dirt: '#b98a56', grass: '#6fae62', sand: '#e6cf8a', ice: '#9fe3ff' };
    for (let i = 0; i < s.n; i++) {
      const a = s.pos[i]!, b = s.pos[(i + 1) % s.n]!;
      const c = s.gap[i] ? '#ff3b6b' : s.bridge[i] ? '#ffd24d' : colors[s.surface[i]!];
      svg += `<line x1="${ox + a.x * sc}" y1="${oz + a.z * sc}" x2="${ox + b.x * sc}" y2="${oz + b.z * sc}" stroke="${c}" stroke-width="${s.halfWidth[i]! * 2 * sc}" stroke-linecap="round"/>`;
    }
    for (const sh of def.shortcuts ?? []) {
      const pts = sh.points.map((p) => `${ox + p.x * sc},${oz + p.z * sc}`).join(' ');
      svg += `<polyline points="${pts}" fill="none" stroke="#ff9d2e" stroke-width="3" stroke-dasharray="6 4"/>`;
    }
    for (const [tag, i] of s.tags) {
      const p = s.pos[i]!;
      svg += `<circle cx="${ox + p.x * sc}" cy="${oz + p.z * sc}" r="3" fill="#111"/><text x="${ox + p.x * sc + 6}" y="${oz + p.z * sc - 6}" font-size="13" fill="#fff" font-family="sans-serif">${tag} y${p.y.toFixed(0)}</text>`;
    }
    const p0 = s.pos[0]!, t0 = s.tan[0]!;
    svg += `<line x1="${ox + p0.x * sc}" y1="${oz + p0.z * sc}" x2="${ox + (p0.x + t0.x * 40) * sc}" y2="${oz + (p0.z + t0.z * 40) * sc}" stroke="#39ff88" stroke-width="4"/>`;
    svg += `<text x="${ox - cell / 2 + 10}" y="${oz - cell / 2 + 22}" font-size="18" fill="#ffd24d" font-family="sans-serif">${def.id} — ${(s.n * 2)} m</text>`;
  });
  svg += '</svg>';
  await sharp(Buffer.from(svg)).png().toFile(file);
  console.log('planta:', file);
}

if (flags.layout) {
  await layout(String(flags.layout));
} else {
  await registerTrackTextures();
  const props = flags['no-props'] ? null : await loadProps();
  const reports: BuildReport[] = [];
  for (const def of TRACK_DEFS) {
    if (only && def.id !== only) continue;
    const t0 = Date.now();
    const r = await buildTrack(def, { props, keepExistingAnimated: !!only });
    reports.push(r);
    console.log(`${r.id}: ${r.length} m, ${r.triangles} tri, glb ${(r.glbBytes / 1024).toFixed(0)} kB, json ${(r.jsonBytes / 1024).toFixed(0)} kB, ${r.props} objetos (${r.animated} animados, ${r.colliders} colisores) em ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    for (const w of r.warnings) console.warn(`  aviso: ${w}`);
  }
  if (props) {
    // modelos dos obstáculos: todos, ou (com --only) só os que a pista usa
    const { OBSTACLE_IDS } = await import('./props/index');
    const used = new Set(TRACK_DEFS.filter((d) => !only || d.id === only).flatMap((d) => (d.obstacles ?? []).map((o) => o.model)));
    for (const id of used) if (!OBSTACLE_IDS.includes(id)) throw new Error(`obstáculo "${id}" não está nas bibliotecas de obstáculos (props/<id>.glb não seria gerado)`);
    for (const id of OBSTACLE_IDS) {
      if (only && !used.has(id)) continue;
      const b = new GlbBuilder();
      b.node(id, { mesh: b.mesh(id, props[id]!.build(rng(9))) });
      await b.save(path.join(ASSETS_DIR, 'props', `${id}.glb`));
    }
    // relatório: com --only, atualiza só a entrada da pista e mantém as demais (na ordem de TRACK_DEFS)
    const file = path.join(ASSETS_DIR, 'tracks', 'tracks-manifest.json');
    const prev: BuildReport[] = only && existsSync(file) ? JSON.parse(await readFile(file, 'utf8')) as BuildReport[] : [];
    const byId = new Map(prev.map((r) => [r.id, r]));
    for (const r of reports) byId.set(r.id, r);
    const merged = TRACK_DEFS.map((d) => byId.get(d.id)).filter((r): r is BuildReport => !!r);
    await writeFile(file, JSON.stringify(merged, null, 2));
  }
}
