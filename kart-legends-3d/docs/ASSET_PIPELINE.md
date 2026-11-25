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
