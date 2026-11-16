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
