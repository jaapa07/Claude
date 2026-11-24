# Manifesto de assets — KART LEGENDS 3D

Gerado por `scripts/build-manifest.ts` a partir de `public/assets`. O registro completo, com todos os campos
(id, nome, tipo, caminho, formato, origem, autor, licença, tamanho, status de validação e local de uso), está em
`public/assets/manifest.json`. A validação automática é `npm run validate:assets`.

- **Total:** 295 arquivos, 115.9 MB
- **Autor de todos os recursos:** Equipe Kart Legends 3D
- **Licença:** Original do projeto (todos os direitos da equipe; sem conteúdo de terceiros)
- **Recursos de terceiros:** nenhum

| Pasta | Arquivos | Tamanho | Origem | Onde é usado |
|---|---:|---:|---|---|
| `audio/` | 99 | 13868 kB | scripts/build-audio.ts (síntese procedural própria) | Música, efeitos e ambiência |
| `characters/` | 9 | 2977 kB | scripts/build-characters.ts (modelagem, rig e animação por script) | Pilotos na corrida, vitrine e pódio |
| `items/` | 15 | 655 kB | scripts/build-items.ts (modelagem por script) | Itens, placas de turbo, rampas, pórtico, troféus e pódio |
| `karts/` | 9 | 1693 kB | scripts/build-karts.ts (modelagem por script) | Veículos na corrida, vitrine e pódio |
| `props/` | 19 | 485 kB | scripts/build-tracks.ts (partes móveis de cenário e obstáculos) | Cenário animado e obstáculos dinâmicos |
| `textures/` | 88 | 1020 kB | scripts (texturas procedurais e arte vetorial próprias) | Materiais dos modelos (também embutidas nos GLB) |
| `tracks/` | 17 | 96981 kB | scripts/build-tracks.ts (traçado autorado + cenário) | Pistas e dados de corrida |
| `ui/` | 38 | 976 kB | scripts/build-items.ts e scripts/capture-ui.ts (arte vetorial e capturas do próprio jogo) | Interface (retratos, ícones, miniaturas) |
| `vfx/` | 1 | 25 kB | scripts/build-vfx.ts (arte vetorial própria) | Sistema de partículas |

## characters/

| Arquivo | Tipo | Tamanho |
|---|---|---:|
| `characters/boro.glb` | model | 357 kB |
| `characters/characters-manifest.json` | data | 14 kB |
| `characters/kora.glb` | model | 360 kB |
| `characters/lumi.glb` | model | 353 kB |
| `characters/mavi.glb` | model | 370 kB |
| `characters/nilo.glb` | model | 379 kB |
| `characters/runi.glb` | model | 381 kB |
| `characters/tiko.glb` | model | 355 kB |
| `characters/zera.glb` | model | 408 kB |

## items/

| Arquivo | Tipo | Tamanho |
|---|---|---:|
| `items/bolha-guardia.glb` | model | 29 kB |
| `items/boost-pad.glb` | model | 34 kB |
| `items/cristal-salto.glb` | model | 31 kB |
| `items/faisca-rastreadora.glb` | model | 39 kB |
| `items/finish-arch.glb` | model | 158 kB |
| `items/item-box.glb` | model | 39 kB |
| `items/items-manifest.json` | data | 5 kB |
| `items/nevoa-prisma.glb` | model | 42 kB |
| `items/onda-vento.glb` | model | 29 kB |
| `items/podium.glb` | model | 89 kB |
| `items/pulso-solar.glb` | model | 20 kB |
| `items/ramp.glb` | model | 17 kB |
| `items/trophy-bronze.glb` | model | 42 kB |
| `items/trophy-gold.glb` | model | 42 kB |
| `items/trophy-silver.glb` | model | 42 kB |

## karts/

| Arquivo | Tipo | Tamanho |
|---|---|---:|
| `karts/broto.glb` | model | 209 kB |
| `karts/cometa.glb` | model | 205 kB |
| `karts/duna.glb` | model | 197 kB |
| `karts/engrenagem.glb` | model | 213 kB |
| `karts/faisca.glb` | model | 205 kB |
| `karts/flecha.glb` | model | 229 kB |
| `karts/geada.glb` | model | 214 kB |
| `karts/karts-manifest.json` | data | 8 kB |
| `karts/mare.glb` | model | 212 kB |

## props/

| Arquivo | Tipo | Tamanho |
|---|---|---:|
| `props/balao-ar.glb` | model | 41 kB |
| `props/bandeira-expedicao.glb` | model | 4 kB |
| `props/barril-rolante.glb` | model | 17 kB |
| `props/carrinho-limpeza.glb` | model | 32 kB |
| `props/catavento-areia.glb` | model | 21 kB |
| `props/drone-carga.glb` | model | 41 kB |
| `props/estandarte.glb` | model | 6 kB |
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
| `props/roda-dagua.glb` | model | 32 kB |
| `props/rolo-neve.glb` | model | 33 kB |

## tracks/

| Arquivo | Tipo | Tamanho |
|---|---|---:|
| `tracks/bosque-cristal.glb` | model | 21629 kB |
| `tracks/bosque-cristal.json` | data | 95 kB |
| `tracks/canion-solar.glb` | model | 9900 kB |
| `tracks/canion-solar.json` | data | 92 kB |
| `tracks/cidade-neon.glb` | model | 7920 kB |
| `tracks/cidade-neon.json` | data | 120 kB |
| `tracks/fortaleza-tempestade.glb` | model | 8412 kB |
| `tracks/fortaleza-tempestade.json` | data | 101 kB |
| `tracks/jardim-celeste.glb` | model | 8687 kB |
| `tracks/jardim-celeste.json` | data | 60 kB |
| `tracks/pico-boreal.glb` | model | 16029 kB |
| `tracks/pico-boreal.json` | data | 100 kB |
| `tracks/porto-lanternas.glb` | model | 12759 kB |
| `tracks/porto-lanternas.json` | data | 105 kB |
| `tracks/tracks-manifest.json` | data | 2 kB |
| `tracks/vale-moinhos.glb` | model | 10866 kB |
| `tracks/vale-moinhos.json` | data | 104 kB |

## ui/

| Arquivo | Tipo | Tamanho |
|---|---|---:|
| `ui/icons/boro.webp` | image | 5 kB |
| `ui/icons/kora.webp` | image | 7 kB |
| `ui/icons/lumi.webp` | image | 5 kB |
| `ui/icons/mavi.webp` | image | 6 kB |
| `ui/icons/nilo.webp` | image | 6 kB |
| `ui/icons/runi.webp` | image | 8 kB |
| `ui/icons/tiko.webp` | image | 5 kB |
| `ui/icons/zera.webp` | image | 5 kB |
| `ui/items/bolha-guardia.webp` | image | 11 kB |
| `ui/items/cristal-salto.webp` | image | 7 kB |
| `ui/items/faisca-rastreadora.webp` | image | 8 kB |
| `ui/items/nevoa-prisma.webp` | image | 7 kB |
| `ui/items/onda-vento.webp` | image | 10 kB |
| `ui/items/pulso-solar.webp` | image | 12 kB |
| `ui/karts/broto.webp` | image | 30 kB |
| `ui/karts/cometa.webp` | image | 29 kB |
| `ui/karts/duna.webp` | image | 38 kB |
| `ui/karts/engrenagem.webp` | image | 34 kB |
| `ui/karts/faisca.webp` | image | 30 kB |
| `ui/karts/flecha.webp` | image | 30 kB |
| `ui/karts/geada.webp` | image | 35 kB |
| `ui/karts/mare.webp` | image | 39 kB |
| `ui/portraits/boro.webp` | image | 37 kB |
| `ui/portraits/kora.webp` | image | 41 kB |
| `ui/portraits/lumi.webp` | image | 37 kB |
| `ui/portraits/mavi.webp` | image | 40 kB |
| `ui/portraits/nilo.webp` | image | 37 kB |
| `ui/portraits/runi.webp` | image | 40 kB |
| `ui/portraits/tiko.webp` | image | 32 kB |
| `ui/portraits/zera.webp` | image | 35 kB |
| `ui/tracks/bosque-cristal.webp` | image | 45 kB |
| `ui/tracks/canion-solar.webp` | image | 39 kB |
| `ui/tracks/cidade-neon.webp` | image | 52 kB |
| `ui/tracks/fortaleza-tempestade.webp` | image | 31 kB |
| `ui/tracks/jardim-celeste.webp` | image | 21 kB |
| `ui/tracks/pico-boreal.webp` | image | 33 kB |
| `ui/tracks/porto-lanternas.webp` | image | 46 kB |
| `ui/tracks/vale-moinhos.webp` | image | 41 kB |

## vfx/

| Arquivo | Tipo | Tamanho |
|---|---|---:|
| `vfx/particles.webp` | image | 25 kB |

## audio/ e textures/

99 arquivos de áudio (lista e durações em `public/assets/audio/audio-manifest.json` e `docs/AUDIO.md`) e 88 texturas (todas também embutidas nos GLB que as usam).
