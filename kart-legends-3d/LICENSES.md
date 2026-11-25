# Licenças — KART LEGENDS 3D

## Conteúdo do jogo

Os recursos em `public/assets` (modelos 3D, rigs, animações, texturas, ícones, retratos, miniaturas,
músicas, efeitos sonoros e ambiências) foram **criados para este projeto** pelos scripts em `scripts/`, com a
exceção dos poucos arquivos de terceiros listados em "Recursos de terceiros" abaixo (todos CC0 ou SIL OFL 1.1):

| Tipo | Como foi produzido |
|---|---|
| Modelos, rigs e animações (GLB) | Modelagem por script (`scripts/characters`, `scripts/karts`, `scripts/items`, `scripts/props`, `scripts/tracks`) |
| Texturas | Geração procedural e arte vetorial próprias |
| Retratos, ícones de piloto, miniaturas de kart e de pista | Capturas do próprio jogo (`scripts/capture-ui.ts`) |
| Ícones de item | Arte vetorial própria |
| Músicas, efeitos e ambiências | Composição e síntese por código (`scripts/build-audio.ts`) |

Fora os arquivos da seção seguinte, não há recursos de terceiros, bancos de assets, amostras de áudio ou fontes
externas na build.

## Recursos de terceiros

Baixados e convertidos por `scripts/build-env.ts` (originais em `.cache/polyhaven/`, fora do git; a saída e o
registro por arquivo ficam em `public/assets/env/sources.json` e `public/assets/detail/sources.json`), ou copiados
de um pacote npm (fonte). Todos permitem uso comercial e redistribuição; a origem, o autor e a licença de cada
arquivo também estão no `public/assets/manifest.json`, e `npm run validate:assets` recusa qualquer licença fora de
CC0-1.0 / OFL-1.1 ou recurso de terceiros sem fonte rastreável.

| Arquivo | Recurso | Fonte | Autor(es) | Licença | Tamanho |
|---|---|---|---|---|---:|
| `env/venice_sunset.webp` | Venice Sunset (HDRI → mapa de ambiente 512×256) | https://polyhaven.com/a/venice_sunset | Greg Zaal | CC0 1.0 | 11 kB |
| `env/forest_grove.webp` | Forest Grove (HDRI → mapa de ambiente 512×256) | https://polyhaven.com/a/forest_grove | Dimitrios Savva, Jarod Guest | CC0 1.0 | 50 kB |
| `env/meadow_2.webp` | Meadow 2 (HDRI → mapa de ambiente 512×256) | https://polyhaven.com/a/meadow_2 | Sergej Majboroda | CC0 1.0 | 23 kB |
| `env/goegap.webp` | Goegap (HDRI → mapa de ambiente 512×256) | https://polyhaven.com/a/goegap | Greg Zaal | CC0 1.0 | 28 kB |
| `env/shanghai_bund.webp` | Shanghai Bund (HDRI → mapa de ambiente 512×256) | https://polyhaven.com/a/shanghai_bund | Greg Zaal | CC0 1.0 | 13 kB |
| `env/winter_lake_01.webp` | Winter Lake 01 (HDRI → mapa de ambiente 512×256) | https://polyhaven.com/a/winter_lake_01 | Sergej Majboroda | CC0 1.0 | 11 kB |
| `env/kloppenheim_06_puresky.webp` | Kloppenheim 06 (Pure Sky) (HDRI → mapa de ambiente 512×256) | https://polyhaven.com/a/kloppenheim_06_puresky | Greg Zaal, Jarod Guest | CC0 1.0 | 10 kB |
| `env/approaching_storm.webp` | Approaching Storm (HDRI → mapa de ambiente 512×256) | https://polyhaven.com/a/approaching_storm | Greg Zaal | CC0 1.0 | 12 kB |
| `env/secluded_beach.webp` | Secluded Beach (HDRI → mapa de ambiente 512×256) | https://polyhaven.com/a/secluded_beach | Greg Zaal, Rico Cilliers | CC0 1.0 | 26 kB |
| `env/rainforest_trail.webp` | Rainforest Trail (HDRI → mapa de ambiente 512×256) | https://polyhaven.com/a/rainforest_trail | Dimitrios Savva, Jarod Guest | CC0 1.0 | 55 kB |
| `env/the_sky_is_on_fire.webp` | The Sky Is On Fire (HDRI → mapa de ambiente 512×256) | https://polyhaven.com/a/the_sky_is_on_fire | Greg Zaal, Rico Cilliers | CC0 1.0 | 12 kB |
| `env/rogland_clear_night.webp` | Rogland Clear Night (HDRI → mapa de ambiente 512×256) | https://polyhaven.com/a/rogland_clear_night | Greg Zaal | CC0 1.0 | 30 kB |
| `env/studio_small_09.webp` | Studio Small 09 (HDRI → mapa de ambiente 512×256) | https://polyhaven.com/a/studio_small_09 | Sergej Majboroda | CC0 1.0 | 5 kB |
| `detail/asphalt_n.webp` | Asphalt 02 (mapa de normal 512 px) | https://polyhaven.com/a/asphalt_02 | Rob Tuytel | CC0 1.0 | 97 kB |
| `detail/asphalt_r.webp` | Asphalt 02 (mapa de rugosidade 256 px) | https://polyhaven.com/a/asphalt_02 | Rob Tuytel | CC0 1.0 | 16 kB |
| `detail/rock_n.webp` | Rock Face (mapa de normal 512 px) | https://polyhaven.com/a/rock_face | Greg Zaal, Dario Barresi | CC0 1.0 | 112 kB |
| `detail/sand_n.webp` | Coast Sand 01 (mapa de normal 512 px) | https://polyhaven.com/a/coast_sand_01 | Rob Tuytel | CC0 1.0 | 106 kB |
| `detail/snow_n.webp` | Snow 02 (mapa de normal 512 px) | https://polyhaven.com/a/snow_02 | Rob Tuytel | CC0 1.0 | 99 kB |
| `detail/dirt_n.webp` | Dirt (mapa de normal 512 px) | https://polyhaven.com/a/dirt | Charlotte Baglioni | CC0 1.0 | 106 kB |
| `detail/grass_n.webp` | Leafy Grass (mapa de normal 512 px) | https://polyhaven.com/a/leafy_grass | Charlotte Baglioni | CC0 1.0 | 136 kB |
| `detail/planks_n.webp` | Wood Planks (mapa de normal 512 px) | https://polyhaven.com/a/wood_planks | Amal Kumar | CC0 1.0 | 21 kB |
| `detail/bark_n.webp` | Bark Brown 02 (mapa de normal 512 px) | https://polyhaven.com/a/bark_brown_02 | Rob Tuytel | CC0 1.0 | 125 kB |
| `detail/volcanic_n.webp` | Rock Ground (mapa de normal 512 px) | https://polyhaven.com/a/rock_ground | Rob Tuytel | CC0 1.0 | 151 kB |
| `detail/concrete_n.webp` | Concrete Floor 02 (mapa de normal 512 px) | https://polyhaven.com/a/concrete_floor_02 | Rob Tuytel | CC0 1.0 | 41 kB |
| `fonts/lilita-one-latin.woff2` | Fonte "Lilita One", subconjunto latino (logotipo e títulos) | npm `@fontsource/lilita-one@5.3.0` (https://fontsource.org/fonts/lilita-one) | Juan Montoreano | SIL OFL 1.1 | 10 kB |
| `fonts/OFL-lilita-one.txt` | Texto da licença da fonte (exigido pela OFL) | idem | Juan Montoreano | SIL OFL 1.1 | 4 kB |

Poly Haven (https://polyhaven.com/license): todos os HDRIs e texturas são CC0 (domínio público), sem exigência de
atribuição — os autores são creditados aqui por cortesia. Os mapas `detail/trk_*_n.webp`, `detail/aur_*_n.webp` e
`detail/ecl_pedra_n.webp` são **próprios**: relevo derivado das texturas do projeto pelo mesmo script.

Avaliados e **não usados**: os mapas de normal e matcaps do pacote npm `@pmndrs/assets` (declarado CC0, mas o
repositório de origem `emmelleppi/normal-maps` não tem licença) e a fonte Inter desse pacote (OFL, mas o subconjunto
não traz os acentos do português).
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
| Fonte Lilita One (@fontsource/lilita-one, arquivo copiado para `public/assets/fonts`) | SIL OFL 1.1 |

Ferramentas de desenvolvimento (não entram na build): vite, typescript, vitest, @playwright/test, eslint,
typescript-eslint, tsx (MIT / Apache-2.0); @gltf-transform (MIT); meshoptimizer (MIT); sharp (Apache-2.0).
O `ffmpeg` do sistema é usado só para codificar o áudio gerado.
