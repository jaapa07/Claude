/** Gera public/assets/manifest.json: registro de TODOS os recursos da build, com origem, autor e licença. */
import { readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ASSETS_DIR } from './lib/textures';

export interface ManifestEntry {
  id: string;
  name: string;
  type: 'model' | 'texture' | 'image' | 'audio' | 'data';
  path: string;
  format: string;
  origin: string;
  author: string;
  license: string;
  bytes: number;
  status: 'validado' | 'pendente';
  usedIn: string;
}

export const AUTHOR = 'Equipe Kart Legends 3D';
export const LICENSE = 'Original do projeto (todos os direitos da equipe; sem conteúdo de terceiros)';

const RULES: { dir: string; origin: string; usedIn: string }[] = [
  { dir: 'characters', origin: 'scripts/build-characters.ts (modelagem, rig e animação por script)', usedIn: 'Pilotos na corrida, vitrine e pódio' },
  { dir: 'karts', origin: 'scripts/build-karts.ts (modelagem por script)', usedIn: 'Veículos na corrida, vitrine e pódio' },
  { dir: 'tracks', origin: 'scripts/build-tracks.ts (traçado autorado + cenário)', usedIn: 'Pistas e dados de corrida' },
  { dir: 'props', origin: 'scripts/build-tracks.ts (partes móveis de cenário e obstáculos)', usedIn: 'Cenário animado e obstáculos dinâmicos' },
  { dir: 'items', origin: 'scripts/build-items.ts (modelagem por script)', usedIn: 'Itens, placas de turbo, rampas, pórtico, troféus e pódio' },
  { dir: 'textures', origin: 'scripts (texturas procedurais e arte vetorial próprias)', usedIn: 'Materiais dos modelos (também embutidas nos GLB)' },
  { dir: 'vfx', origin: 'scripts/build-vfx.ts (arte vetorial própria)', usedIn: 'Sistema de partículas' },
  { dir: 'ui', origin: 'scripts/build-items.ts e scripts/capture-ui.ts (arte vetorial e capturas do próprio jogo)', usedIn: 'Interface (retratos, ícones, miniaturas)' },
  { dir: 'audio', origin: 'scripts/build-audio.ts (síntese procedural própria)', usedIn: 'Música, efeitos e ambiência' },
];
const TYPES: Record<string, ManifestEntry['type']> = { '.glb': 'model', '.webp': 'image', '.png': 'image', '.ogg': 'audio', '.json': 'data' };

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...await walk(p)); else out.push(p);
  }
  return out;
}

export async function buildManifest(): Promise<ManifestEntry[]> {
  const files = (await walk(ASSETS_DIR)).filter((f) => path.basename(f) !== 'manifest.json').sort();
  const entries: ManifestEntry[] = [];
  for (const f of files) {
    const rel = path.relative(ASSETS_DIR, f).split(path.sep).join('/');
    const rule = RULES.find((r) => rel.startsWith(`${r.dir}/`));
    if (!rule) throw new Error(`Arquivo fora das pastas conhecidas de assets: ${rel}`);
    const ext = path.extname(f);
    const type = rule.dir === 'textures' ? 'texture' : TYPES[ext];
    if (!type) throw new Error(`Formato de asset não reconhecido: ${rel}`);
    entries.push({
      id: rel.replace(/\.[a-z0-9]+$/, '').replace(/\//g, ':'),
      name: path.basename(f, ext),
      type, path: rel, format: ext.slice(1), origin: rule.origin, author: AUTHOR, license: LICENSE,
      bytes: (await stat(f)).size, status: 'pendente', usedIn: rule.usedIn,
    });
  }
  return entries;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const entries = await buildManifest();
  await writeFile(path.join(ASSETS_DIR, 'manifest.json'), JSON.stringify({ version: 1, generatedBy: 'scripts/build-manifest.ts', assets: entries }, null, 1));
  const total = entries.reduce((s, e) => s + e.bytes, 0);
  console.log(`manifesto: ${entries.length} recursos, ${(total / 1048576).toFixed(1)} MB (status "pendente" até rodar validate:assets)`);
}
