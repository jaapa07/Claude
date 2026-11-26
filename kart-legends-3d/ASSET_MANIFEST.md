# Manifesto de assets — KART LEGENDS 3D

Gerado por `scripts/build-manifest.ts` a partir de `public/assets`. O registro completo, com todos os campos
(id, nome, tipo, caminho, formato, origem, autor, licença, tamanho, status de validação e local de uso), está em
`public/assets/manifest.json`. A validação automática é `npm run validate:assets`.

- **Total:** 476 arquivos, 151.3 MB
- **Autor dos recursos próprios:** Equipe Kart Legends 3D
- **Licença dos recursos próprios:** Original do projeto (todos os direitos da equipe; sem conteúdo de terceiros)
- **Recursos de terceiros:** 67 arquivos (CC0-1.0, OFL-1.1), listados abaixo com autor e origem

| Pasta | Arquivos | Tamanho | Origem | Onde é usado |
|---|---:|---:|---|---|
| `arenas/` | 6 | 4169 kB | scripts/build-arenas.ts (arena autorada + cenário das bibliotecas) | Arenas do modo Batalha |
| `audio/` | 147 | 14301 kB | Kenney — Interface Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): back_002.ogg; nível ajustado em 0.0 dB (RMS casado com o efeito "ui_back" do jogo), 44,1 kHz estéreo, cópia AAC para o Safari — scripts/build-kits.ts | Música, efeitos e ambiência |
| `characters/` | 15 | 5233 kB | scripts/build-characters.ts (modelagem, rig e animação por script) | Pilotos na corrida, vitrine e pódio |
| `detail/` | 22 | 1290 kB | Poly Haven — textura "Asphalt 02" (https://polyhaven.com/a/asphalt_02), mapa de normal (OpenGL) 1k reduzido por scripts/build-env.ts | Relevo dos pisos, rochas, madeira e metal (qualidade Média/Alta) |
| `env/` | 15 | 291 kB | Poly Haven — HDRI "Approaching Storm" (https://polyhaven.com/a/approaching_storm), 1k .hdr reduzido a 512×256 por scripts/build-env.ts | Mapas de ambiente (reflexos e luz ambiente) das pistas, arenas e menus |
| `fonts/` | 3 | 15 kB | Texto da licença SIL Open Font License 1.1 da fonte Lilita One (@fontsource/lilita-one@5.3.0), distribuído junto com a fonte como a licença exige | Logotipo e títulos da interface |
| `items/` | 17 | 714 kB | scripts/build-items.ts (modelagem por script) | Itens, placas de turbo, rampas, pórtico, troféus e pódio |
| `karts/` | 9 | 1692 kB | scripts/build-karts.ts (modelagem por script) | Veículos na corrida, vitrine e pódio |
| `kits/` | 4 | 1062 kB | Kenney — Particle Pack 1.1 (https://kenney.nl/assets, CC0 1.0): smoke_04.png, smoke_07.png, dirt_02.png, fire_01.png, flame_05.png, muzzle_02.png, star_06.png, star_08.png, star_09.png, circle_02.png, light_01.png, spark_02.png, scorch_02.png, trace_04.png, twirl_01.png, magic_03.png; reduzidos a 128 px e montados num atlas 4×4 — scripts/build-kits.ts | Cenário extra das pistas e arenas (arquibancadas, barreiras, carros, árvores, pedras) e sprites de partículas |
| `props/` | 27 | 651 kB | scripts/build-tracks.ts (partes móveis de cenário e obstáculos) | Cenário animado e obstáculos dinâmicos |
| `textures/` | 101 | 1415 kB | scripts (texturas procedurais e arte vetorial próprias) | Materiais dos modelos (também embutidas nos GLB) |
| `tires/` | 8 | 183 kB | scripts/build-tires.ts (modelagem por script) | Rodas da loja, equipáveis em qualquer kart |
| `tracks/` | 36 | 122412 kB | scripts/build-tracks.ts (traçado autorado + cenário) | Pistas e dados de corrida |
| `ui/` | 65 | 1462 kB | scripts/build-items.ts, scripts/build-tires.ts e scripts/capture-ui.ts (arte vetorial e capturas do próprio jogo) | Interface (retratos, ícones, miniaturas) |
| `vfx/` | 1 | 25 kB | scripts/build-vfx.ts (arte vetorial própria) | Sistema de partículas |

## arenas/

| Arquivo | Tipo | Tamanho |
|---|---|---:|
| `arenas/cratera-lunar.dress.json` | data | 1 kB |
| `arenas/cratera-lunar.glb` | model | 375 kB |
| `arenas/cratera-lunar.json` | data | 28 kB |
| `arenas/praca-coreto.dress.json` | data | 2 kB |
| `arenas/praca-coreto.glb` | model | 3749 kB |
| `arenas/praca-coreto.json` | data | 15 kB |

## characters/

| Arquivo | Tipo | Tamanho |
|---|---|---:|
| `characters/boro.glb` | model | 357 kB |
| `characters/capi.glb` | model | 335 kB |
| `characters/characters-manifest.json` | data | 23 kB |
| `characters/kaito.glb` | model | 373 kB |
| `characters/kora.glb` | model | 360 kB |
| `characters/lumi.glb` | model | 353 kB |
| `characters/mavi.glb` | model | 370 kB |
| `characters/nilo.glb` | model | 379 kB |
| `characters/ren.glb` | model | 385 kB |
| `characters/runi.glb` | model | 381 kB |
| `characters/sora.glb` | model | 418 kB |
| `characters/tiko.glb` | model | 355 kB |
| `characters/tuca.glb` | model | 355 kB |
| `characters/yuki.glb` | model | 381 kB |
| `characters/zera.glb` | model | 408 kB |

## detail/

| Arquivo | Tipo | Tamanho |
|---|---|---:|
| `detail/asphalt_n.webp` | image | 97 kB |
| `detail/asphalt_r.webp` | image | 16 kB |
| `detail/aur_block_n.webp` | image | 7 kB |
| `detail/aur_stone_n.webp` | image | 16 kB |
| `detail/bark_n.webp` | image | 125 kB |
| `detail/concrete_n.webp` | image | 41 kB |
| `detail/dirt_n.webp` | image | 106 kB |
| `detail/ecl_pedra_n.webp` | image | 10 kB |
| `detail/grass_n.webp` | image | 136 kB |
| `detail/planks_n.webp` | image | 21 kB |
| `detail/rock_n.webp` | image | 112 kB |
| `detail/sand_n.webp` | image | 106 kB |
| `detail/snow_n.webp` | image | 99 kB |
| `detail/sources.json` | data | 5 kB |
| `detail/trk_brick_n.webp` | image | 25 kB |
| `detail/trk_cobble_n.webp` | image | 62 kB |
| `detail/trk_flagstone_n.webp` | image | 29 kB |
| `detail/trk_ice_n.webp` | image | 29 kB |
| `detail/trk_marble_n.webp` | image | 16 kB |
| `detail/trk_plate_n.webp` | image | 45 kB |
| `detail/trk_temple_n.webp` | image | 34 kB |
| `detail/volcanic_n.webp` | image | 151 kB |

## env/

| Arquivo | Tipo | Tamanho |
|---|---|---:|
| `env/approaching_storm.webp` | image | 12 kB |
| `env/env.json` | data | 1 kB |
| `env/forest_grove.webp` | image | 50 kB |
| `env/goegap.webp` | image | 28 kB |
| `env/kloppenheim_06_puresky.webp` | image | 10 kB |
| `env/meadow_2.webp` | image | 23 kB |
| `env/rainforest_trail.webp` | image | 55 kB |
| `env/rogland_clear_night.webp` | image | 30 kB |
| `env/secluded_beach.webp` | image | 26 kB |
| `env/shanghai_bund.webp` | image | 13 kB |
| `env/sources.json` | data | 3 kB |
| `env/studio_small_09.webp` | image | 5 kB |
| `env/the_sky_is_on_fire.webp` | image | 12 kB |
| `env/venice_sunset.webp` | image | 11 kB |
| `env/winter_lake_01.webp` | image | 11 kB |

## fonts/

| Arquivo | Tipo | Tamanho |
|---|---|---:|
| `fonts/OFL-lilita-one.txt` | data | 4 kB |
| `fonts/lilita-one-latin.woff2` | data | 10 kB |
| `fonts/sources.json` | data | 1 kB |

## items/

| Arquivo | Tipo | Tamanho |
|---|---|---:|
| `items/bolha-guardia.glb` | model | 29 kB |
| `items/boost-pad.glb` | model | 34 kB |
| `items/cometa-guia.glb` | model | 37 kB |
| `items/cristal-salto.glb` | model | 31 kB |
| `items/faisca-rastreadora.glb` | model | 39 kB |
| `items/finish-arch.glb` | model | 158 kB |
| `items/item-box.glb` | model | 39 kB |
| `items/items-manifest.json` | data | 6 kB |
| `items/nevoa-prisma.glb` | model | 42 kB |
| `items/onda-vento.glb` | model | 29 kB |
| `items/podium.glb` | model | 89 kB |
| `items/pulso-solar.glb` | model | 20 kB |
| `items/raio-corrente.glb` | model | 20 kB |
| `items/ramp.glb` | model | 17 kB |
| `items/trophy-bronze.glb` | model | 42 kB |
| `items/trophy-gold.glb` | model | 42 kB |
| `items/trophy-silver.glb` | model | 42 kB |

## karts/

| Arquivo | Tipo | Tamanho |
|---|---|---:|
| `karts/broto.glb` | model | 209 kB |
| `karts/cometa.glb` | model | 205 kB |
| `karts/duna.glb` | model | 196 kB |
| `karts/engrenagem.glb` | model | 213 kB |
| `karts/faisca.glb` | model | 205 kB |
| `karts/flecha.glb` | model | 229 kB |
| `karts/geada.glb` | model | 214 kB |
| `karts/karts-manifest.json` | data | 8 kB |
| `karts/mare.glb` | model | 212 kB |

## kits/

| Arquivo | Tipo | Tamanho |
|---|---|---:|
| `kits/kenney-particles.webp` | image | 79 kB |
| `kits/kenney-scenery.glb` | model | 441 kB |
| `kits/quaternius-nature.glb` | model | 539 kB |
| `kits/sources.json` | data | 2 kB |

## props/

| Arquivo | Tipo | Tamanho |
|---|---|---:|
| `props/antena-radar.glb` | model | 19 kB |
| `props/balao-ar.glb` | model | 41 kB |
| `props/bandeira-expedicao.glb` | model | 4 kB |
| `props/barril-rolante.glb` | model | 17 kB |
| `props/bola-magma.glb` | model | 13 kB |
| `props/caranguejo.glb` | model | 19 kB |
| `props/carrinho-limpeza.glb` | model | 32 kB |
| `props/catavento-areia.glb` | model | 21 kB |
| `props/drone-carga.glb` | model | 41 kB |
| `props/engrenagem-forja.glb` | model | 22 kB |
| `props/estandarte.glb` | model | 6 kB |
| `props/farol-listrado.glb` | model | 4 kB |
| `props/flor-gigante.glb` | model | 21 kB |
| `props/grade-movel.glb` | model | 56 kB |
| `props/holograma.glb` | model | 12 kB |
| `props/lanterna-celeste.glb` | model | 14 kB |
| `props/martelo-pendulo.glb` | model | 32 kB |
| `props/moinho-de-vento-celeste.glb` | model | 13 kB |
| `props/moinho.glb` | model | 34 kB |
| `props/nuvem-trovao.glb` | model | 26 kB |
| `props/pedra-rolante.glb` | model | 36 kB |
| `props/planta-dancarina.glb` | model | 14 kB |
| `props/robo-carga.glb` | model | 38 kB |
| `props/roda-dagua.glb` | model | 32 kB |
| `props/rolo-neve.glb` | model | 33 kB |
| `props/tronco-pendulo.glb` | model | 29 kB |
| `props/vagonete-lava.glb` | model | 22 kB |

## tires/

| Arquivo | Tipo | Tamanho |
|---|---|---:|
| `tires/estrela.glb` | model | 26 kB |
| `tires/flor.glb` | model | 26 kB |
| `tires/neon.glb` | model | 27 kB |
| `tires/neve.glb` | model | 26 kB |
| `tires/offroad.glb` | model | 29 kB |
| `tires/raios.glb` | model | 26 kB |
| `tires/slick.glb` | model | 23 kB |
| `tires/tires-manifest.json` | data | 1 kB |

## tracks/

| Arquivo | Tipo | Tamanho |
|---|---|---:|
| `tracks/bosque-cristal.dress.json` | data | 6 kB |
| `tracks/bosque-cristal.glb` | model | 21758 kB |
| `tracks/bosque-cristal.json` | data | 96 kB |
| `tracks/canion-solar.dress.json` | data | 6 kB |
| `tracks/canion-solar.glb` | model | 10014 kB |
| `tracks/canion-solar.json` | data | 95 kB |
| `tracks/cidade-neon.dress.json` | data | 6 kB |
| `tracks/cidade-neon.glb` | model | 8120 kB |
| `tracks/cidade-neon.json` | data | 121 kB |
| `tracks/estacao-lunar.dress.json` | data | 2 kB |
| `tracks/estacao-lunar.glb` | model | 4139 kB |
| `tracks/estacao-lunar.json` | data | 108 kB |
| `tracks/fortaleza-tempestade.dress.json` | data | 2 kB |
| `tracks/fortaleza-tempestade.glb` | model | 8877 kB |
| `tracks/fortaleza-tempestade.json` | data | 106 kB |
| `tracks/jardim-celeste.glb` | model | 9000 kB |
| `tracks/jardim-celeste.json` | data | 63 kB |
| `tracks/pico-boreal.dress.json` | data | 4 kB |
| `tracks/pico-boreal.glb` | model | 15245 kB |
| `tracks/pico-boreal.json` | data | 108 kB |
| `tracks/porto-lanternas.dress.json` | data | 3 kB |
| `tracks/porto-lanternas.glb` | model | 13477 kB |
| `tracks/porto-lanternas.json` | data | 112 kB |
| `tracks/recife-coral.dress.json` | data | 2 kB |
| `tracks/recife-coral.glb` | model | 6946 kB |
| `tracks/recife-coral.json` | data | 109 kB |
| `tracks/templo-esmeralda.dress.json` | data | 5 kB |
| `tracks/templo-esmeralda.glb` | model | 8518 kB |
| `tracks/templo-esmeralda.json` | data | 105 kB |
| `tracks/tracks-manifest.json` | data | 3 kB |
| `tracks/vale-moinhos.dress.json` | data | 5 kB |
| `tracks/vale-moinhos.glb` | model | 11187 kB |
| `tracks/vale-moinhos.json` | data | 109 kB |
| `tracks/vulcao-rubro.dress.json` | data | 2 kB |
| `tracks/vulcao-rubro.glb` | model | 3854 kB |
| `tracks/vulcao-rubro.json` | data | 101 kB |

## ui/

| Arquivo | Tipo | Tamanho |
|---|---|---:|
| `ui/arenas/cratera-lunar.webp` | image | 13 kB |
| `ui/arenas/praca-coreto.webp` | image | 37 kB |
| `ui/icons/boro.webp` | image | 5 kB |
| `ui/icons/capi.webp` | image | 4 kB |
| `ui/icons/kaito.webp` | image | 3 kB |
| `ui/icons/kora.webp` | image | 6 kB |
| `ui/icons/lumi.webp` | image | 5 kB |
| `ui/icons/mavi.webp` | image | 6 kB |
| `ui/icons/nilo.webp` | image | 6 kB |
| `ui/icons/ren.webp` | image | 4 kB |
| `ui/icons/runi.webp` | image | 8 kB |
| `ui/icons/sora.webp` | image | 4 kB |
| `ui/icons/tiko.webp` | image | 5 kB |
| `ui/icons/tuca.webp` | image | 4 kB |
| `ui/icons/yuki.webp` | image | 4 kB |
| `ui/icons/zera.webp` | image | 5 kB |
| `ui/items/bolha-guardia.webp` | image | 11 kB |
| `ui/items/cometa-guia.webp` | image | 10 kB |
| `ui/items/cristal-salto.webp` | image | 7 kB |
| `ui/items/faisca-rastreadora.webp` | image | 8 kB |
| `ui/items/nevoa-prisma.webp` | image | 7 kB |
| `ui/items/onda-vento.webp` | image | 10 kB |
| `ui/items/pulso-solar.webp` | image | 12 kB |
| `ui/items/raio-corrente.webp` | image | 8 kB |
| `ui/karts/broto.webp` | image | 30 kB |
| `ui/karts/cometa.webp` | image | 29 kB |
| `ui/karts/duna.webp` | image | 39 kB |
| `ui/karts/engrenagem.webp` | image | 34 kB |
| `ui/karts/faisca.webp` | image | 30 kB |
| `ui/karts/flecha.webp` | image | 30 kB |
| `ui/karts/geada.webp` | image | 35 kB |
| `ui/karts/mare.webp` | image | 39 kB |
| `ui/portraits/boro.webp` | image | 37 kB |
| `ui/portraits/capi.webp` | image | 35 kB |
| `ui/portraits/kaito.webp` | image | 29 kB |
| `ui/portraits/kora.webp` | image | 41 kB |
| `ui/portraits/lumi.webp` | image | 37 kB |
| `ui/portraits/mavi.webp` | image | 41 kB |
| `ui/portraits/nilo.webp` | image | 37 kB |
| `ui/portraits/ren.webp` | image | 31 kB |
| `ui/portraits/runi.webp` | image | 41 kB |
| `ui/portraits/sora.webp` | image | 36 kB |
| `ui/portraits/tiko.webp` | image | 32 kB |
| `ui/portraits/tuca.webp` | image | 27 kB |
| `ui/portraits/yuki.webp` | image | 35 kB |
| `ui/portraits/zera.webp` | image | 35 kB |
| `ui/tires/estrela.webp` | image | 10 kB |
| `ui/tires/flor.webp` | image | 9 kB |
| `ui/tires/neon.webp` | image | 10 kB |
| `ui/tires/neve.webp` | image | 9 kB |
| `ui/tires/offroad.webp` | image | 11 kB |
| `ui/tires/raios.webp` | image | 11 kB |
| `ui/tires/slick.webp` | image | 11 kB |
| `ui/tracks/bosque-cristal.webp` | image | 44 kB |
| `ui/tracks/canion-solar.webp` | image | 37 kB |
| `ui/tracks/cidade-neon.webp` | image | 49 kB |
| `ui/tracks/estacao-lunar.webp` | image | 27 kB |
| `ui/tracks/fortaleza-tempestade.webp` | image | 31 kB |
| `ui/tracks/jardim-celeste.webp` | image | 22 kB |
| `ui/tracks/pico-boreal.webp` | image | 32 kB |
| `ui/tracks/porto-lanternas.webp` | image | 48 kB |
| `ui/tracks/recife-coral.webp` | image | 31 kB |
| `ui/tracks/templo-esmeralda.webp` | image | 34 kB |
| `ui/tracks/vale-moinhos.webp` | image | 41 kB |
| `ui/tracks/vulcao-rubro.webp` | image | 42 kB |

## vfx/

| Arquivo | Tipo | Tamanho |
|---|---|---:|
| `vfx/particles.webp` | image | 25 kB |

## Recursos de terceiros

| Arquivo | Licença | Autor | Origem |
|---|---|---|---|
| `audio/aac/kenney/back_002.m4a` | CC0-1.0 | Kenney | Kenney — Interface Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): back_002.ogg; nível ajustado em 0.0 dB (RMS casado com o efeito "ui_back" do jogo), 44,1 kHz estéreo, cópia AAC para o Safari — scripts/build-kits.ts |
| `audio/aac/kenney/confirmation_001.m4a` | CC0-1.0 | Kenney | Kenney — Interface Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): confirmation_001.ogg; nível ajustado em -4.3 dB (RMS casado com o efeito "purchase" do jogo), 44,1 kHz estéreo, cópia AAC para o Safari — scripts/build-kits.ts |
| `audio/aac/kenney/error_004.m4a` | CC0-1.0 | Kenney | Kenney — Interface Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): error_004.ogg; nível ajustado em 0.3 dB (RMS casado com o efeito "ui_error" do jogo), 44,1 kHz estéreo, cópia AAC para o Safari — scripts/build-kits.ts |
| `audio/aac/kenney/impactGlass_medium_000.m4a` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactGlass_medium_000.ogg; nível ajustado em 0.2 dB (RMS casado com o efeito "shield_break" do jogo), 44,1 kHz estéreo, cópia AAC para o Safari — scripts/build-kits.ts |
| `audio/aac/kenney/impactGlass_medium_002.m4a` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactGlass_medium_002.ogg; nível ajustado em 0.0 dB (RMS casado com o efeito "shield_break" do jogo), 44,1 kHz estéreo, cópia AAC para o Safari — scripts/build-kits.ts |
| `audio/aac/kenney/impactMetal_heavy_000.m4a` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactMetal_heavy_000.ogg; nível ajustado em -0.1 dB (RMS casado com o efeito "collision_heavy" do jogo), 44,1 kHz estéreo, cópia AAC para o Safari — scripts/build-kits.ts |
| `audio/aac/kenney/impactMetal_heavy_001.m4a` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactMetal_heavy_001.ogg; nível ajustado em 0.1 dB (RMS casado com o efeito "collision_heavy" do jogo), 44,1 kHz estéreo, cópia AAC para o Safari — scripts/build-kits.ts |
| `audio/aac/kenney/impactMetal_heavy_002.m4a` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactMetal_heavy_002.ogg; nível ajustado em -1.1 dB (RMS casado com o efeito "collision_heavy" do jogo), 44,1 kHz estéreo, cópia AAC para o Safari — scripts/build-kits.ts |
| `audio/aac/kenney/impactMetal_heavy_003.m4a` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactMetal_heavy_003.ogg; nível ajustado em -0.6 dB (RMS casado com o efeito "comet_ram" do jogo), 44,1 kHz estéreo, cópia AAC para o Safari — scripts/build-kits.ts |
| `audio/aac/kenney/impactPlate_medium_000.m4a` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactPlate_medium_000.ogg; nível ajustado em 0.4 dB (RMS casado com o efeito "collision" do jogo), 44,1 kHz estéreo, cópia AAC para o Safari — scripts/build-kits.ts |
| `audio/aac/kenney/impactPlate_medium_001.m4a` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactPlate_medium_001.ogg; nível ajustado em 0.1 dB (RMS casado com o efeito "collision" do jogo), 44,1 kHz estéreo, cópia AAC para o Safari — scripts/build-kits.ts |
| `audio/aac/kenney/impactPlate_medium_002.m4a` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactPlate_medium_002.ogg; nível ajustado em 0.1 dB (RMS casado com o efeito "collision" do jogo), 44,1 kHz estéreo, cópia AAC para o Safari — scripts/build-kits.ts |
| `audio/aac/kenney/impactPunch_heavy_000.m4a` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactPunch_heavy_000.ogg; nível ajustado em -6.9 dB (RMS casado com o efeito "spinout" do jogo), 44,1 kHz estéreo, cópia AAC para o Safari — scripts/build-kits.ts |
| `audio/aac/kenney/impactPunch_heavy_001.m4a` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactPunch_heavy_001.ogg; nível ajustado em -7.4 dB (RMS casado com o efeito "spinout" do jogo), 44,1 kHz estéreo, cópia AAC para o Safari — scripts/build-kits.ts |
| `audio/aac/kenney/impactSoft_heavy_000.m4a` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactSoft_heavy_000.ogg; nível ajustado em -0.1 dB (RMS casado com o efeito "land" do jogo), 44,1 kHz estéreo, cópia AAC para o Safari — scripts/build-kits.ts |
| `audio/aac/kenney/impactSoft_heavy_002.m4a` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactSoft_heavy_002.ogg; nível ajustado em -0.1 dB (RMS casado com o efeito "land" do jogo), 44,1 kHz estéreo, cópia AAC para o Safari — scripts/build-kits.ts |
| `audio/aac/kenney/maximize_006.m4a` | CC0-1.0 | Kenney | Kenney — Interface Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): maximize_006.ogg; nível ajustado em -7.9 dB (RMS casado com o efeito "unlock" do jogo), 44,1 kHz estéreo, cópia AAC para o Safari — scripts/build-kits.ts |
| `audio/aac/kenney/select_002.m4a` | CC0-1.0 | Kenney | Kenney — Interface Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): select_002.ogg; nível ajustado em 0.0 dB (RMS casado com o efeito "ui_select" do jogo), 44,1 kHz estéreo, cópia AAC para o Safari — scripts/build-kits.ts |
| `audio/aac/kenney/toggle_002.m4a` | CC0-1.0 | Kenney | Kenney — Interface Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): toggle_002.ogg; nível ajustado em -2.7 dB (RMS casado com o efeito "ui_move" do jogo), 44,1 kHz estéreo, cópia AAC para o Safari — scripts/build-kits.ts |
| `audio/kenney/back_002.ogg` | CC0-1.0 | Kenney | Kenney — Interface Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): back_002.ogg; nível ajustado em 0.0 dB (RMS casado com o efeito "ui_back" do jogo), 44,1 kHz estéreo, Ogg Vorbis — scripts/build-kits.ts |
| `audio/kenney/confirmation_001.ogg` | CC0-1.0 | Kenney | Kenney — Interface Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): confirmation_001.ogg; nível ajustado em -4.3 dB (RMS casado com o efeito "purchase" do jogo), 44,1 kHz estéreo, Ogg Vorbis — scripts/build-kits.ts |
| `audio/kenney/error_004.ogg` | CC0-1.0 | Kenney | Kenney — Interface Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): error_004.ogg; nível ajustado em 0.3 dB (RMS casado com o efeito "ui_error" do jogo), 44,1 kHz estéreo, Ogg Vorbis — scripts/build-kits.ts |
| `audio/kenney/impactGlass_medium_000.ogg` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactGlass_medium_000.ogg; nível ajustado em 0.2 dB (RMS casado com o efeito "shield_break" do jogo), 44,1 kHz estéreo, Ogg Vorbis — scripts/build-kits.ts |
| `audio/kenney/impactGlass_medium_002.ogg` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactGlass_medium_002.ogg; nível ajustado em 0.0 dB (RMS casado com o efeito "shield_break" do jogo), 44,1 kHz estéreo, Ogg Vorbis — scripts/build-kits.ts |
| `audio/kenney/impactMetal_heavy_000.ogg` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactMetal_heavy_000.ogg; nível ajustado em -0.1 dB (RMS casado com o efeito "collision_heavy" do jogo), 44,1 kHz estéreo, Ogg Vorbis — scripts/build-kits.ts |
| `audio/kenney/impactMetal_heavy_001.ogg` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactMetal_heavy_001.ogg; nível ajustado em 0.1 dB (RMS casado com o efeito "collision_heavy" do jogo), 44,1 kHz estéreo, Ogg Vorbis — scripts/build-kits.ts |
| `audio/kenney/impactMetal_heavy_002.ogg` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactMetal_heavy_002.ogg; nível ajustado em -1.1 dB (RMS casado com o efeito "collision_heavy" do jogo), 44,1 kHz estéreo, Ogg Vorbis — scripts/build-kits.ts |
| `audio/kenney/impactMetal_heavy_003.ogg` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactMetal_heavy_003.ogg; nível ajustado em -0.6 dB (RMS casado com o efeito "comet_ram" do jogo), 44,1 kHz estéreo, Ogg Vorbis — scripts/build-kits.ts |
| `audio/kenney/impactPlate_medium_000.ogg` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactPlate_medium_000.ogg; nível ajustado em 0.4 dB (RMS casado com o efeito "collision" do jogo), 44,1 kHz estéreo, Ogg Vorbis — scripts/build-kits.ts |
| `audio/kenney/impactPlate_medium_001.ogg` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactPlate_medium_001.ogg; nível ajustado em 0.1 dB (RMS casado com o efeito "collision" do jogo), 44,1 kHz estéreo, Ogg Vorbis — scripts/build-kits.ts |
| `audio/kenney/impactPlate_medium_002.ogg` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactPlate_medium_002.ogg; nível ajustado em 0.1 dB (RMS casado com o efeito "collision" do jogo), 44,1 kHz estéreo, Ogg Vorbis — scripts/build-kits.ts |
| `audio/kenney/impactPunch_heavy_000.ogg` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactPunch_heavy_000.ogg; nível ajustado em -6.9 dB (RMS casado com o efeito "spinout" do jogo), 44,1 kHz estéreo, Ogg Vorbis — scripts/build-kits.ts |
| `audio/kenney/impactPunch_heavy_001.ogg` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactPunch_heavy_001.ogg; nível ajustado em -7.4 dB (RMS casado com o efeito "spinout" do jogo), 44,1 kHz estéreo, Ogg Vorbis — scripts/build-kits.ts |
| `audio/kenney/impactSoft_heavy_000.ogg` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactSoft_heavy_000.ogg; nível ajustado em -0.1 dB (RMS casado com o efeito "land" do jogo), 44,1 kHz estéreo, Ogg Vorbis — scripts/build-kits.ts |
| `audio/kenney/impactSoft_heavy_002.ogg` | CC0-1.0 | Kenney | Kenney — Impact Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): impactSoft_heavy_002.ogg; nível ajustado em -0.1 dB (RMS casado com o efeito "land" do jogo), 44,1 kHz estéreo, Ogg Vorbis — scripts/build-kits.ts |
| `audio/kenney/maximize_006.ogg` | CC0-1.0 | Kenney | Kenney — Interface Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): maximize_006.ogg; nível ajustado em -7.9 dB (RMS casado com o efeito "unlock" do jogo), 44,1 kHz estéreo, Ogg Vorbis — scripts/build-kits.ts |
| `audio/kenney/select_002.ogg` | CC0-1.0 | Kenney | Kenney — Interface Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): select_002.ogg; nível ajustado em 0.0 dB (RMS casado com o efeito "ui_select" do jogo), 44,1 kHz estéreo, Ogg Vorbis — scripts/build-kits.ts |
| `audio/kenney/toggle_002.ogg` | CC0-1.0 | Kenney | Kenney — Interface Sounds 1.0 (https://kenney.nl/assets, CC0 1.0): toggle_002.ogg; nível ajustado em -2.7 dB (RMS casado com o efeito "ui_move" do jogo), 44,1 kHz estéreo, Ogg Vorbis — scripts/build-kits.ts |
| `detail/asphalt_n.webp` | CC0-1.0 | Rob Tuytel | Poly Haven — textura "Asphalt 02" (https://polyhaven.com/a/asphalt_02), mapa de normal (OpenGL) 1k reduzido por scripts/build-env.ts |
| `detail/asphalt_r.webp` | CC0-1.0 | Rob Tuytel | Poly Haven — textura "Asphalt 02" (https://polyhaven.com/a/asphalt_02), mapa de rugosidade 1k reduzido por scripts/build-env.ts |
| `detail/bark_n.webp` | CC0-1.0 | Rob Tuytel | Poly Haven — textura "Bark Brown 02" (https://polyhaven.com/a/bark_brown_02), mapa de normal (OpenGL) 1k reduzido por scripts/build-env.ts |
| `detail/concrete_n.webp` | CC0-1.0 | Rob Tuytel | Poly Haven — textura "Concrete Floor 02" (https://polyhaven.com/a/concrete_floor_02), mapa de normal (OpenGL) 1k reduzido por scripts/build-env.ts |
| `detail/dirt_n.webp` | CC0-1.0 | Charlotte Baglioni | Poly Haven — textura "Dirt" (https://polyhaven.com/a/dirt), mapa de normal (OpenGL) 1k reduzido por scripts/build-env.ts |
| `detail/grass_n.webp` | CC0-1.0 | Charlotte Baglioni | Poly Haven — textura "Leafy Grass" (https://polyhaven.com/a/leafy_grass), mapa de normal (OpenGL) 1k reduzido por scripts/build-env.ts |
| `detail/planks_n.webp` | CC0-1.0 | Amal Kumar | Poly Haven — textura "Wood Planks" (https://polyhaven.com/a/wood_planks), mapa de normal (OpenGL) 1k reduzido por scripts/build-env.ts |
| `detail/rock_n.webp` | CC0-1.0 | Greg Zaal, Dario Barresi | Poly Haven — textura "Rock Face" (https://polyhaven.com/a/rock_face), mapa de normal (OpenGL) 1k reduzido por scripts/build-env.ts |
| `detail/sand_n.webp` | CC0-1.0 | Rob Tuytel | Poly Haven — textura "Coast Sand 01" (https://polyhaven.com/a/coast_sand_01), mapa de normal (OpenGL) 1k reduzido por scripts/build-env.ts |
| `detail/snow_n.webp` | CC0-1.0 | Rob Tuytel | Poly Haven — textura "Snow 02" (https://polyhaven.com/a/snow_02), mapa de normal (OpenGL) 1k reduzido por scripts/build-env.ts |
| `detail/volcanic_n.webp` | CC0-1.0 | Rob Tuytel | Poly Haven — textura "Rock Ground" (https://polyhaven.com/a/rock_ground), mapa de normal (OpenGL) 1k reduzido por scripts/build-env.ts |
| `env/approaching_storm.webp` | CC0-1.0 | Greg Zaal | Poly Haven — HDRI "Approaching Storm" (https://polyhaven.com/a/approaching_storm), 1k .hdr reduzido a 512×256 por scripts/build-env.ts |
| `env/forest_grove.webp` | CC0-1.0 | Dimitrios Savva, Jarod Guest | Poly Haven — HDRI "Forest Grove" (https://polyhaven.com/a/forest_grove), 1k .hdr reduzido a 512×256 por scripts/build-env.ts |
| `env/goegap.webp` | CC0-1.0 | Greg Zaal | Poly Haven — HDRI "Goegap" (https://polyhaven.com/a/goegap), 1k .hdr reduzido a 512×256 por scripts/build-env.ts |
| `env/kloppenheim_06_puresky.webp` | CC0-1.0 | Greg Zaal, Jarod Guest | Poly Haven — HDRI "Kloppenheim 06 (Pure Sky)" (https://polyhaven.com/a/kloppenheim_06_puresky), 1k .hdr reduzido a 512×256 por scripts/build-env.ts |
| `env/meadow_2.webp` | CC0-1.0 | Sergej Majboroda | Poly Haven — HDRI "Meadow 2" (https://polyhaven.com/a/meadow_2), 1k .hdr reduzido a 512×256 por scripts/build-env.ts |
| `env/rainforest_trail.webp` | CC0-1.0 | Dimitrios Savva, Jarod Guest | Poly Haven — HDRI "Rainforest Trail" (https://polyhaven.com/a/rainforest_trail), 1k .hdr reduzido a 512×256 por scripts/build-env.ts |
| `env/rogland_clear_night.webp` | CC0-1.0 | Greg Zaal | Poly Haven — HDRI "Rogland Clear Night" (https://polyhaven.com/a/rogland_clear_night), 1k .hdr reduzido a 512×256 por scripts/build-env.ts |
| `env/secluded_beach.webp` | CC0-1.0 | Greg Zaal, Rico Cilliers | Poly Haven — HDRI "Secluded Beach" (https://polyhaven.com/a/secluded_beach), 1k .hdr reduzido a 512×256 por scripts/build-env.ts |
| `env/shanghai_bund.webp` | CC0-1.0 | Greg Zaal | Poly Haven — HDRI "Shanghai Bund" (https://polyhaven.com/a/shanghai_bund), 1k .hdr reduzido a 512×256 por scripts/build-env.ts |
| `env/studio_small_09.webp` | CC0-1.0 | Sergej Majboroda | Poly Haven — HDRI "Studio Small 09" (https://polyhaven.com/a/studio_small_09), 1k .hdr reduzido a 512×256 por scripts/build-env.ts |
| `env/the_sky_is_on_fire.webp` | CC0-1.0 | Greg Zaal, Rico Cilliers | Poly Haven — HDRI "The Sky Is On Fire" (https://polyhaven.com/a/the_sky_is_on_fire), 1k .hdr reduzido a 512×256 por scripts/build-env.ts |
| `env/venice_sunset.webp` | CC0-1.0 | Greg Zaal | Poly Haven — HDRI "Venice Sunset" (https://polyhaven.com/a/venice_sunset), 1k .hdr reduzido a 512×256 por scripts/build-env.ts |
| `env/winter_lake_01.webp` | CC0-1.0 | Sergej Majboroda | Poly Haven — HDRI "Winter Lake 01" (https://polyhaven.com/a/winter_lake_01), 1k .hdr reduzido a 512×256 por scripts/build-env.ts |
| `fonts/OFL-lilita-one.txt` | OFL-1.1 | Juan Montoreano | Texto da licença SIL Open Font License 1.1 da fonte Lilita One (@fontsource/lilita-one@5.3.0), distribuído junto com a fonte como a licença exige |
| `fonts/lilita-one-latin.woff2` | OFL-1.1 | Juan Montoreano | Fonte "Lilita One" (subconjunto latino), pacote npm @fontsource/lilita-one@5.3.0 (https://fontsource.org/fonts/lilita-one), copiado sem alteração |
| `kits/kenney-particles.webp` | CC0-1.0 | Kenney | Kenney — Particle Pack 1.1 (https://kenney.nl/assets, CC0 1.0): smoke_04.png, smoke_07.png, dirt_02.png, fire_01.png, flame_05.png, muzzle_02.png, star_06.png, star_08.png, star_09.png, circle_02.png, light_01.png, spark_02.png, scorch_02.png, trace_04.png, twirl_01.png, magic_03.png; reduzidos a 128 px e montados num atlas 4×4 — scripts/build-kits.ts |
| `kits/kenney-scenery.glb` | CC0-1.0 | Kenney | Kenney — Racing Kit 2.0 (https://kenney.nl/assets, CC0 1.0): grandStandCovered.glb, grandStand.glb, bannerTowerRed.glb, bannerTowerGreen.glb, flagRed.glb, flagGreen.glb, barrierRed.glb, barrierWhite.glb, lightPostModern.glb, lightPostLarge.glb, tent.glb, tentRoof.glb, radarEquipment.glb, pylon.glb; cores de material e paleta colormap.png convertidas em cor de vértice, escala em metros | Kenney — Car Kit 3.1 (https://kenney.nl/assets, CC0 1.0): sedan.glb, taxi.glb, van.glb, suv.glb, hatchback-sports.glb, police.glb, delivery.glb, truck-flat.glb, debris-tire.glb; cores de material e paleta colormap.png convertidas em cor de vértice, escala em metros | Kenney — Nature Kit 2.1 (https://kenney.nl/assets, CC0 1.0): stone_largeA.glb, stone_largeC.glb, stone_tallB.glb, stone_tallG.glb, stone_smallB.glb, stone_smallF.glb, cliff_large_stone.glb, stump_roundDetailed.glb, log_stackLarge.glb, cactus_tall.glb, cactus_short.glb; cores de material e paleta colormap.png convertidas em cor de vértice, escala em metros — scripts/build-kits.ts |
| `kits/quaternius-nature.glb` | CC0-1.0 | Quaternius | Quaternius — Stylized Nature MegaKit [Standard] (https://quaternius.com, CC0 1.0): CommonTree_1.obj, CommonTree_3.obj, CommonTree_5.obj, Pine_1.obj, Pine_3.obj, Pine_5.obj, TwistedTree_1.obj, DeadTree_1.obj, DeadTree_3.obj, Bush_Common.obj, Bush_Common_Flowers.obj, Fern_1.obj, Flower_3_Group.obj, Plant_1_Big.obj, Mushroom_Common.obj, Rock_Medium_1.obj, Rock_Medium_2.obj e as texturas de casca, pedra, cogumelo, folhas e flores do pacote; casca/pedra viram cor de vértice (troncos simplificados com meshoptimizer), folhas e flores num atlas WebP 512 px recortado — scripts/build-kits.ts |

## audio/ e textures/

147 arquivos de áudio (lista e durações em `public/assets/audio/audio-manifest.json` e `docs/AUDIO.md`) e 101 texturas (todas também embutidas nos GLB que as usam).
