# Licenças — KART LEGENDS 3D

## Conteúdo do jogo

Todos os recursos em `public/assets` (modelos 3D, rigs, animações, texturas, ícones, retratos, miniaturas,
músicas, efeitos sonoros e ambiências) foram **criados para este projeto** pelos scripts em `scripts/`:

| Tipo | Como foi produzido |
|---|---|
| Modelos, rigs e animações (GLB) | Modelagem por script (`scripts/characters`, `scripts/karts`, `scripts/items`, `scripts/props`, `scripts/tracks`) |
| Texturas | Geração procedural e arte vetorial próprias |
| Retratos, ícones de piloto, miniaturas de kart e de pista | Capturas do próprio jogo (`scripts/capture-ui.ts`) |
| Ícones de item | Arte vetorial própria |
| Músicas, efeitos e ambiências | Composição e síntese por código (`scripts/build-audio.ts`) |

Não há recursos de terceiros, bancos de assets, amostras de áudio ou fontes externas na build.
Nomes de pilotos, pistas, itens e marcas fictícias que aparecem em placas são originais; nenhum personagem,
pista, música, modelo ou interface de outra franquia foi copiado. Autor e licença de cada arquivo estão
registrados em `public/assets/manifest.json` e são conferidos por `npm run validate:assets`.

## Bibliotecas de código (dependências npm)

| Biblioteca | Licença |
|---|---|
| react, react-dom | MIT |
| three | MIT |
| @react-three/fiber, @react-three/drei, @react-three/rapier, @react-three/postprocessing | MIT |
| @dimforge/rapier3d-compat | Apache-2.0 |
| postprocessing | Zlib |
| zustand | MIT |
| suspend-react, three-stdlib | MIT |

Ferramentas de desenvolvimento (não entram na build): vite, typescript, vitest, @playwright/test, eslint,
typescript-eslint, tsx (MIT / Apache-2.0); @gltf-transform (MIT); meshoptimizer (MIT); sharp (Apache-2.0).
O `ffmpeg` do sistema é usado só para codificar o áudio gerado.
