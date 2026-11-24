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
const TYPES: Record<string, ManifestEntry['type']> = { '.glb': 'model', '.webp': 'image', '.png': 'image', '.ogg': 'audio', '.m4a': 'audio', '.json': 'data' };

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
  // resumo legível na raiz do projeto
  const groups = new Map<string, ManifestEntry[]>();
  for (const e of entries) { const g = e.path.split('/')[0]!; groups.set(g, [...(groups.get(g) ?? []), e]); }
  const kb = (n: number): string => `${(n / 1024).toFixed(0)} kB`;
  let md = `# Manifesto de assets — KART LEGENDS 3D\n\nGerado por \`scripts/build-manifest.ts\` a partir de \`public/assets\`. O registro completo, com todos os campos\n(id, nome, tipo, caminho, formato, origem, autor, licença, tamanho, status de validação e local de uso), está em\n\`public/assets/manifest.json\`. A validação automática é \`npm run validate:assets\`.\n\n`;
  md += `- **Total:** ${entries.length} arquivos, ${(entries.reduce((s, e) => s + e.bytes, 0) / 1048576).toFixed(1)} MB\n- **Autor de todos os recursos:** ${AUTHOR}\n- **Licença:** ${LICENSE}\n- **Recursos de terceiros:** nenhum\n\n`;
  md += '| Pasta | Arquivos | Tamanho | Origem | Onde é usado |\n|---|---:|---:|---|---|\n';
  for (const [g, list] of groups) md += `| \`${g}/\` | ${list.length} | ${kb(list.reduce((s, e) => s + e.bytes, 0))} | ${list[0]!.origin} | ${list[0]!.usedIn} |\n`;
  for (const [g, list] of groups) {
    if (g === 'textures' || g === 'audio') continue;
    md += `\n## ${g}/\n\n| Arquivo | Tipo | Tamanho |\n|---|---|---:|\n`;
    for (const e of list) md += `| \`${e.path}\` | ${e.type} | ${kb(e.bytes)} |\n`;
  }
  md += `\n## audio/ e textures/\n\n${groups.get('audio')?.length ?? 0} arquivos de áudio (lista e durações em \`public/assets/audio/audio-manifest.json\` e \`docs/AUDIO.md\`) e ${groups.get('textures')?.length ?? 0} texturas (todas também embutidas nos GLB que as usam).\n`;
  await writeFile(path.resolve(ASSETS_DIR, '../../ASSET_MANIFEST.md'), md);
  const total = entries.reduce((s, e) => s + e.bytes, 0);
  console.log(`manifesto: ${entries.length} recursos, ${(total / 1048576).toFixed(1)} MB (status "pendente" até rodar validate:assets)`);
}
