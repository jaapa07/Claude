/** Gera public/assets/manifest.json: registro de TODOS os recursos da build, com origem, autor e licença. */
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
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

const RULES: { dir: string; origin: string; usedIn: string; perFile?: boolean }[] = [
  { dir: 'characters', origin: 'scripts/build-characters.ts (modelagem, rig e animação por script)', usedIn: 'Pilotos na corrida, vitrine e pódio' },
  { dir: 'karts', origin: 'scripts/build-karts.ts (modelagem por script)', usedIn: 'Veículos na corrida, vitrine e pódio' },
  { dir: 'tracks', origin: 'scripts/build-tracks.ts (traçado autorado + cenário)', usedIn: 'Pistas e dados de corrida' },
  { dir: 'arenas', origin: 'scripts/build-arenas.ts (arena autorada + cenário das bibliotecas)', usedIn: 'Arenas do modo Batalha' },
  { dir: 'props', origin: 'scripts/build-tracks.ts (partes móveis de cenário e obstáculos)', usedIn: 'Cenário animado e obstáculos dinâmicos' },
  { dir: 'tires', origin: 'scripts/build-tires.ts (modelagem por script)', usedIn: 'Rodas da loja, equipáveis em qualquer kart' },
  { dir: 'items', origin: 'scripts/build-items.ts (modelagem por script)', usedIn: 'Itens, placas de turbo, rampas, pórtico, troféus e pódio' },
  { dir: 'textures', origin: 'scripts (texturas procedurais e arte vetorial próprias)', usedIn: 'Materiais dos modelos (também embutidas nos GLB)' },
  { dir: 'vfx', origin: 'scripts/build-vfx.ts (arte vetorial própria)', usedIn: 'Sistema de partículas' },
  { dir: 'ui', origin: 'scripts/build-items.ts, scripts/build-tires.ts e scripts/capture-ui.ts (arte vetorial e capturas do próprio jogo)', usedIn: 'Interface (retratos, ícones, miniaturas)' },
  { dir: 'audio', origin: 'scripts/build-audio.ts (síntese procedural própria)', usedIn: 'Música, efeitos e ambiência' },
  // Pastas com recursos de terceiros: origem/autor/licença POR ARQUIVO em <pasta>/sources.json
  { dir: 'env', origin: 'scripts/build-env.ts (HDRIs do Poly Haven, CC0)', usedIn: 'Mapas de ambiente (reflexos e luz ambiente) das pistas, arenas e menus', perFile: true },
  { dir: 'detail', origin: 'scripts/build-env.ts (texturas PBR do Poly Haven, CC0, e relevo derivado das texturas próprias)', usedIn: 'Relevo dos pisos, rochas, madeira e metal (qualidade Média/Alta)', perFile: true },
  { dir: 'fonts', origin: 'Fonte tipográfica de terceiros (ver sources.json)', usedIn: 'Logotipo e títulos da interface', perFile: true },
];

/** Licenças aceitas para recursos de terceiros (uso comercial e redistribuição livres). */
export const THIRD_PARTY_LICENSES = ['CC0-1.0', 'OFL-1.1'];
export const ALLOWED_LICENSES = [LICENSE, ...THIRD_PARTY_LICENSES];

interface SourceInfo { origin: string; author: string; license: string }
async function perFileSources(dir: string): Promise<Record<string, SourceInfo>> {
  try {
    return JSON.parse(await readFile(path.join(ASSETS_DIR, dir, 'sources.json'), 'utf8')) as Record<string, SourceInfo>;
  } catch {
    throw new Error(`${dir}/sources.json ausente: rode o script que gera a pasta ${dir}/`);
  }
}
const TYPES: Record<string, ManifestEntry['type']> = { '.glb': 'model', '.webp': 'image', '.png': 'image', '.ogg': 'audio', '.m4a': 'audio', '.json': 'data', '.woff2': 'data', '.txt': 'data' };

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
  const sources = new Map<string, Record<string, SourceInfo>>();
  for (const f of files) {
    const rel = path.relative(ASSETS_DIR, f).split(path.sep).join('/');
    const rule = RULES.find((r) => rel.startsWith(`${r.dir}/`));
    if (!rule) throw new Error(`Arquivo fora das pastas conhecidas de assets: ${rel}`);
    const ext = path.extname(f);
    const type = rule.dir === 'textures' ? 'texture' : TYPES[ext];
    if (!type) throw new Error(`Formato de asset não reconhecido: ${rel}`);
    let credit: SourceInfo = { origin: rule.origin, author: AUTHOR, license: LICENSE };
    if (rule.perFile) {
      if (!sources.has(rule.dir)) sources.set(rule.dir, await perFileSources(rule.dir));
      const c = sources.get(rule.dir)![path.basename(f)];
      if (!c) throw new Error(`Sem origem/licença registrada em ${rule.dir}/sources.json: ${rel}`);
      credit = c;
    }
    entries.push({
      id: rel.replace(/\.[a-z0-9]+$/, '').replace(/\//g, ':'),
      name: path.basename(f, ext),
      type, path: rel, format: ext.slice(1), origin: credit.origin, author: credit.author, license: credit.license,
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
  const third = entries.filter((e) => e.license !== LICENSE);
  let md = `# Manifesto de assets — KART LEGENDS 3D\n\nGerado por \`scripts/build-manifest.ts\` a partir de \`public/assets\`. O registro completo, com todos os campos\n(id, nome, tipo, caminho, formato, origem, autor, licença, tamanho, status de validação e local de uso), está em\n\`public/assets/manifest.json\`. A validação automática é \`npm run validate:assets\`.\n\n`;
  md += `- **Total:** ${entries.length} arquivos, ${(entries.reduce((s, e) => s + e.bytes, 0) / 1048576).toFixed(1)} MB\n- **Autor dos recursos próprios:** ${AUTHOR}\n- **Licença dos recursos próprios:** ${LICENSE}\n- **Recursos de terceiros:** ${third.length} arquivos (${THIRD_PARTY_LICENSES.join(', ')}), listados abaixo com autor e origem\n\n`;
  md += '| Pasta | Arquivos | Tamanho | Origem | Onde é usado |\n|---|---:|---:|---|---|\n';
  for (const [g, list] of groups) md += `| \`${g}/\` | ${list.length} | ${kb(list.reduce((s, e) => s + e.bytes, 0))} | ${list[0]!.origin} | ${list[0]!.usedIn} |\n`;
  for (const [g, list] of groups) {
    if (g === 'textures' || g === 'audio') continue;
    md += `\n## ${g}/\n\n| Arquivo | Tipo | Tamanho |\n|---|---|---:|\n`;
    for (const e of list) md += `| \`${e.path}\` | ${e.type} | ${kb(e.bytes)} |\n`;
  }
  md += '\n## Recursos de terceiros\n\n| Arquivo | Licença | Autor | Origem |\n|---|---|---|---|\n';
  for (const e of third) md += `| \`${e.path}\` | ${e.license} | ${e.author} | ${e.origin} |\n`;
  md += `\n## audio/ e textures/\n\n${groups.get('audio')?.length ?? 0} arquivos de áudio (lista e durações em \`public/assets/audio/audio-manifest.json\` e \`docs/AUDIO.md\`) e ${groups.get('textures')?.length ?? 0} texturas (todas também embutidas nos GLB que as usam).\n`;
  await writeFile(path.resolve(ASSETS_DIR, '../../ASSET_MANIFEST.md'), md);
  const total = entries.reduce((s, e) => s + e.bytes, 0);
  console.log(`manifesto: ${entries.length} recursos, ${(total / 1048576).toFixed(1)} MB (status "pendente" até rodar validate:assets)`);
}
