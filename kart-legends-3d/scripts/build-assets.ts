/**
 * Reconstrói TODOS os assets do jogo a partir dos scripts de autoria, na ordem certa.
 * Uso: npx tsx scripts/build-assets.ts [--skip-audio]
 * (As miniaturas da interface dependem do jogo rodando: `npm run dev` + `npx tsx scripts/capture-ui.ts`.)
 */
import { spawnSync } from 'node:child_process';

const steps: [string, string][] = [
  ['Atlas de partículas', 'scripts/build-vfx.ts'],
  ['Personagens', 'scripts/build-characters.ts'],
  ['Karts', 'scripts/build-karts.ts'],
  ['Rodas da loja', 'scripts/build-tires.ts'],
  ['Itens e objetos de corrida', 'scripts/build-items.ts'],
  ['Pistas e cenário', 'scripts/build-tracks.ts'],
  ...(process.argv.includes('--skip-audio') ? [] : [['Áudio', 'scripts/build-audio.ts'] as [string, string], ['Áudio AAC (Safari)', 'scripts/build-audio-aac.ts'] as [string, string]]),
  ['Manifesto', 'scripts/build-manifest.ts'],
];
for (const [label, script] of steps) {
  console.log(`\n=== ${label} (${script}) ===`);
  const r = spawnSync('npx', ['tsx', script], { stdio: 'inherit' });
  if (r.status !== 0) { console.error(`Falhou: ${script}`); process.exit(r.status ?? 1); }
}
console.log('\nAssets reconstruídos. Rode "npm run validate:assets" para validar.');
