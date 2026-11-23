# Manifesto de assets

| Asset | Autor / origem | Licença | Observações |
|---|---|---|---|
| Sprites do herói, moradores, criaturas, evoluções, inimigos, chefes (`assets/src/10_heroi.pxl`, `30_criaturas.pxl`, `40_inimigos.pxl`) | Criados para este projeto, pixel a pixel em texto (Claude, sob orientação do usuário) | Do projeto | Os moradores usam o desenho base do herói com paletas próprias. |
| Tileset, objetos, ícones, moldura de UI, barras (`50_tiles.pxl`, `60_objetos.pxl`) | Criados para este projeto, pixel a pixel | Do projeto | A escolha de borda/variação (autotile) é regra de vizinhança no código; os desenhos são manuais. |
| Efeitos (corte, impacto, poeira, raízes, selo, vórtice, pulso, avisos de perigo, fragmentos) (`20_efeitos.pxl`) | Criados para este projeto, pixel a pixel | Do projeto | Círculos grandes desenhados por quadrante e espelhados. |
| Mapas (`tools/gen_maps.py` -> `data/maps`) | Criados para este projeto | Do projeto | Layouts escritos sala a sala. A densidade de árvores nas rotas usa espalhamento com semente fixa, depois os caminhos e as clareiras são abertos manualmente. |
| Trilhas (vila, floresta, santuário, chefão, título) e efeitos sonoros | Compostos para este projeto | Do projeto | Notas escritas à mão em `tools/gen_audio.py` e sintetizadas em chiptune (onda quadrada/triangular). Ainda não há gravação nem instrumento real. |
| Fonte Press Start 2P | CodeMan38 (Google Fonts) | SIL OFL 1.1 (`assets/fonts/OFL_PressStart2P.txt`) | Usada em toda a interface. |

Nenhum sprite, mapa, música, nome ou interface de Pokémon, Zelda ou do vídeo de referência foi reutilizado.
