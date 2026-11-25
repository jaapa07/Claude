# Pipeline de assets 3D

Os modelos do jogo são **modelados por scripts de autoria** (TypeScript) e exportados como GLB reais
(glTF 2.0, compressão meshopt, skins, clipes de animação, texturas WebP). Não há Blender neste ambiente.

- `scripts/lib/geo.ts` — primitivas (`box` arredondada, `sphere`, `cyl`, `cone`, `capsule`, `torus`, `ico`, `lathe`,
  `tube`, `extrude`, `smoothOutline`), `warp` (deformação), `flat` (facetado), `paint`/`gradY` (cor de vértice),
  `Model` (lista de peças por material; `add(geo, material, cor, {p,r,s})`, `addModel`, `transform`),
  `bindTo`/`bindWith` (skin), `rng(seed)`.
- `scripts/lib/materials.ts` — materiais PBR nomeados (`std`, `matte`, `glossy`, `paint`, `metal`, `chrome`, `rubber`,
  `skin`, `fur`, `cloth`, `glass`, `leaf`, `glow_*`). Novos: `defineMaterial(nome, {...})` (prefixe com o seu módulo).
- `scripts/lib/textures.ts` — `makeTexture(nome, tamanho, (u,v)=>[r,g,b,a])` com `fbm`, `vnoise`, `voronoi` ladrilháveis;
  `svgTexture(nome, svg, tamanho)` rasteriza arte vetorial. Use em materiais via `map: nome`.
- `scripts/lib/glb.ts` — `GlbBuilder`: `mesh(nome, model)`, `node(nome, {t, r(quat), s, parent, mesh, skin})`,
  `skin(nome, juntas, inverseBind)`, `animation(nome, canais)`, `save(arquivo)`.
- `scripts/tools/preview.ts` — renderiza GLBs em PNG para você OLHAR o resultado:
  `npx tsx scripts/tools/preview.ts /caminho/saida.png public/assets/x.glb public/assets/y.glb@drive:0.4 --views=front,side,back,top --size=420`

Cores em sRGB hex (`'#e2542b'`); a conversão para linear é automática. A cor final = cor de vértice × textura × fator.

## Kits CC0 (Kenney e Quaternius): cenário extra, partículas e sons

`npx tsx scripts/build-kits.ts` lê os pacotes extraídos em `.cache/` (fora do git; só leitura e conversão) e grava
apenas o que o jogo usa:

| Saída | Origem | Como |
|---|---|---|
| `kits/kenney-scenery.glb` (37 modelos, ~20 mil tri, 450 kB) | Kenney Racing Kit, Car Kit, Nature Kit | cores de material e a paleta `colormap.png` viram **cor de vértice** (amostrada no centro de cada face): um material só, sem textura; carros simplificados com meshoptimizer preservando as ilhas de cor; pneus empilhados em `c_tire_stack` |
| `kits/quaternius-nature.glb` (17 modelos, ~18 mil tri, 540 kB) | Quaternius Stylized Nature MegaKit [Standard] (OBJ+MTL) | casca/pedra/cogumelo viram cor de vértice e os troncos são simplificados (10–15 % dos triângulos); folhas e flores num **atlas WebP 512 px** com recorte (`alphaTest`, sem blending) e normais "de copa" (apontando para fora da copa) |
| `kits/kenney-particles.webp` (512 px, 79 kB) | Kenney Particle Pack | 16 sprites reduzidos a 128 px, grade 4×4 (ordem em `scripts/kits/sprites.ts`) |
| `audio/kenney/*.ogg`, `audio/aac/kenney/*.m4a` | Kenney Impact Sounds, Interface Sounds | ver `docs/AUDIO.md` |

Catálogo (arquivo, escala em metros, raio, simplificação) em `scripts/kits/catalog.ts`. As texturas do MegaKit
chegaram sem nome; o mapeamento material → arquivo está em `QUATERNIUS_TEXTURES` (os mapas de normal da casca não
são usados: a casca vira cor de vértice).

**Decoração das pistas e arenas** — `npx tsx scripts/build-dressing.ts` grava `tracks/<id>.dress.json` e
`arenas/<id>.dress.json` a partir das regras de `scripts/kits/dressing.ts` (ao longo de um trecho, lado de fora das
curvas, espalhado por faixa de distância). Para ler traçado, terreno e o cenário já colocado, reconstrói a pista
numa pasta temporária (via `onContext` de `buildTrack`) e confere que ela bate **byte a byte** com a publicada: a
malha, os colisores, os dados de corrida e a linha da IA não mudam. Os objetos são só visuais (sem colisor), ficam
fora da pista e dos atalhos (`edgeDistance` inclui os atalhos), longe do cenário existente e acima da água; os
grandes sem muro na frente ficam a ≥ 6 m da borda. Cada objeto tem uma **camada**: 0 = todas as qualidades (marcos
leves, ~1–8 mil tri por pista), 1 = Média, 2 = Alta (`QualityProfile.dressing`; a tela dividida usa só a 0). O
script imprime objetos e triângulos por qualidade.

Na cena, `src/scenes/common/KitDressing.tsx` funde os objetos da camada permitida **por material em blocos de
110 m** (no máximo 2 chamadas de desenho por bloco, com frustum culling por bloco), aplicando a tinta de cada regra
na cor de vértice (encaixa pedras, cactos e folhagem na paleta da pista). Os kits e as listas são baixados com a
primeira corrida que os usa (não entram no pré-carregamento do menu).

## Luz por imagem e relevo (recursos CC0 do Poly Haven)

`npx tsx scripts/build-env.ts` (precisa de rede: api.polyhaven.com e dl.polyhaven.org; os originais ficam em
`.cache/polyhaven/`, fora do git, conferidos por md5):

- **HDRIs** (`src/game/tracks/iblSources.ts` → `HDRIS`): o `.hdr` 1k é reduzido a 512×256 e gravado em WebP sRGB
  com a faixa comprimida (o percentil 99,5 da luminância vira 1,0; só o sol satura). `public/assets/env/env.json`
  guarda a escala, a luminância média e a posição do sol de cada mapa. Na cena (`src/scenes/common/ibl.tsx`) o
  HDRI é desenhado numa esfera dentro do cubo do mapa de ambiente — normalizado pela média, tingido com
  `Environment.ibl.tint` e girado para o sol dele coincidir com o `sunDir` da pista — junto com o sol da pista
  como luz de recorte. O céu visível continua sendo o shader. Cada pista escolhe o mapa em
  `src/game/tracks/environments.ts` (`ibl`); a qualidade define a resolução do cubo (64/128/256).
- **Relevo** (`PH_TEXTURES`, `NORMALS_DERIVED`, `DETAIL_BY_TEXTURE`): mapas de normal OpenGL 1k → 512 px e
  rugosidade do asfalto (normalizada para média 0,8) em `public/assets/detail`; as texturas de padrão regular
  do projeto (paralelepípedo, tijolo, laje, placas...) ganham normal derivado da própria cor (Sobel ladrilhável).
  `src/scenes/common/surfaceDetail.ts` aplica pelo nome da textura de cor de cada material, só na Média/Alta.
- Cada arquivo tem origem/autor/licença em `<pasta>/sources.json`; `scripts/build-manifest.ts` copia isso para o
  manifesto e `validate:assets` aceita só CC0-1.0/OFL-1.1 com fonte rastreável. Detalhes em `LICENSES.md`.
