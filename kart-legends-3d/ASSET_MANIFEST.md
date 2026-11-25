# Manifesto de assets — KART LEGENDS 3D

Gerado por `scripts/build-manifest.ts` a partir de `public/assets`. O registro completo, com todos os campos
(id, nome, tipo, caminho, formato, origem, autor, licença, tamanho, status de validação e local de uso), está em
`public/assets/manifest.json`. A validação automática é `npm run validate:assets`.

- **Total:** 379 arquivos, 148.4 MB
- **Autor de todos os recursos:** Equipe Kart Legends 3D
- **Licença:** Original do projeto (todos os direitos da equipe; sem conteúdo de terceiros)
- **Recursos de terceiros:** nenhum

| Pasta | Arquivos | Tamanho | Origem | Onde é usado |
|---|---:|---:|---|---|
| `arenas/` | 4 | 4166 kB | scripts/build-arenas.ts (arena autorada + cenário das bibliotecas) | Arenas do modo Batalha |
| `audio/` | 107 | 14033 kB | scripts/build-audio.ts (síntese procedural própria) | Música, efeitos e ambiência |
| `characters/` | 15 | 5233 kB | scripts/build-characters.ts (modelagem, rig e animação por script) | Pilotos na corrida, vitrine e pódio |
| `items/` | 17 | 714 kB | scripts/build-items.ts (modelagem por script) | Itens, placas de turbo, rampas, pórtico, troféus e pódio |
| `karts/` | 9 | 1692 kB | scripts/build-karts.ts (modelagem por script) | Veículos na corrida, vitrine e pódio |
| `props/` | 27 | 651 kB | scripts/build-tracks.ts (partes móveis de cenário e obstáculos) | Cenário animado e obstáculos dinâmicos |
| `textures/` | 101 | 1415 kB | scripts (texturas procedurais e arte vetorial próprias) | Materiais dos modelos (também embutidas nos GLB) |
| `tires/` | 8 | 183 kB | scripts/build-tires.ts (modelagem por script) | Rodas da loja, equipáveis em qualquer kart |
| `tracks/` | 25 | 122370 kB | scripts/build-tracks.ts (traçado autorado + cenário) | Pistas e dados de corrida |
| `ui/` | 65 | 1462 kB | scripts/build-items.ts, scripts/build-tires.ts e scripts/capture-ui.ts (arte vetorial e capturas do próprio jogo) | Interface (retratos, ícones, miniaturas) |
| `vfx/` | 1 | 25 kB | scripts/build-vfx.ts (arte vetorial própria) | Sistema de partículas |

## arenas/

| Arquivo | Tipo | Tamanho |
|---|---|---:|
| `arenas/cratera-lunar.glb` | model | 375 kB |
| `arenas/cratera-lunar.json` | data | 28 kB |
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
| `tracks/bosque-cristal.glb` | model | 21758 kB |
| `tracks/bosque-cristal.json` | data | 96 kB |
| `tracks/canion-solar.glb` | model | 10014 kB |
| `tracks/canion-solar.json` | data | 95 kB |
| `tracks/cidade-neon.glb` | model | 8120 kB |
| `tracks/cidade-neon.json` | data | 121 kB |
| `tracks/estacao-lunar.glb` | model | 4139 kB |
| `tracks/estacao-lunar.json` | data | 108 kB |
| `tracks/fortaleza-tempestade.glb` | model | 8877 kB |
| `tracks/fortaleza-tempestade.json` | data | 106 kB |
| `tracks/jardim-celeste.glb` | model | 9000 kB |
| `tracks/jardim-celeste.json` | data | 63 kB |
| `tracks/pico-boreal.glb` | model | 15245 kB |
| `tracks/pico-boreal.json` | data | 108 kB |
| `tracks/porto-lanternas.glb` | model | 13477 kB |
| `tracks/porto-lanternas.json` | data | 112 kB |
| `tracks/recife-coral.glb` | model | 6946 kB |
| `tracks/recife-coral.json` | data | 109 kB |
| `tracks/templo-esmeralda.glb` | model | 8518 kB |
| `tracks/templo-esmeralda.json` | data | 105 kB |
| `tracks/tracks-manifest.json` | data | 3 kB |
| `tracks/vale-moinhos.glb` | model | 11187 kB |
| `tracks/vale-moinhos.json` | data | 109 kB |
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

## audio/ e textures/

107 arquivos de áudio (lista e durações em `public/assets/audio/audio-manifest.json` e `docs/AUDIO.md`) e 101 texturas (todas também embutidas nos GLB que as usam).
