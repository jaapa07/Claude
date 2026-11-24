# Interface — molduras, mensagens e opções

Tudo é montado com nós (`NinePatchRect`, `Label`, `TextureRect`) e arte desenhada à mão em `.pxl`; nada de `_draw`.

## Arte (assets/src/92_interface.pxl → `python3 tools/pixc.py`)

| Folha | Conteúdo |
|---|---|
| `ui2_frames.png` | Molduras 9-slice 24×24 (margem 8), um único desenho com paletas diferentes: 0 menu (ouro, pedra azul), 1 diálogo (prata azulada, pedra âmbar), 2 aviso (vermelho), 3 chefão (carmim), 4 HUD (lilás), 5 brilho de raridade (só o contorno, branco — a cor vem do `self_modulate`), 6 aba de nome / faixa de área. Cantos com uma pedra lapidada. |
| `ui2_sel.png` | Barra de seleção dos menus (9-slice 12×12, margem 4), translúcida. |
| `ui2_icons.png` | Ícones de aviso 16×16: 0 item (bolsa), 1 missão (pergaminho), 2 captura (selo), 3 nível (seta), 4 aviso (triângulo), 5 santuário/salvo (cristal), 6 Eco/memória (orbe), 7 informação. |
| `ui2_more.png` | Seta "continuar" do diálogo (8×8). |
| `ui2_portraits.png` | Retratos 32×32: 0 Você, 1 Maru, 2 Ione, 3 Bruna, 4 Ravi, 5 Vesna, 6 Arauto, 7 Ilda, 8 Doran, 9 Ilse, 10 Sena, 11 Arão, 12 Ysa, 13 placa/inscrição, 14 memória/eco, 15 Eco de Ione, 16 Tobi. Um rosto-base espelhado com penteados sobrepostos (`over`: curto, coque, longo, capuz, elmo, barba, chapéu) e paletas por personagem. |

`UIKit` (scripts/uikit.gd): `panel(pos, size, kind)` com as constantes `FR_*`, `sel_bar()`, `toast_icon(IC_*)`.

## Mensagens

- **Avisos** (`Hud.add_toast`): ícone e moldura pelo tipo, deduzido do texto (`Hud.toast_kind`: falha → moldura vermelha; captura, nível, Eco, missão, salvo, item, informação). Avisos que terminam em "!" durante um chefão usam a moldura carmim. Entram deslizando (tween de 0,18 s) e saem subindo e sumindo. No máximo 3 visíveis, empilhados sem sobreposição acima da dica/diálogo; os demais esperam na fila (que acelera quando cresce). Ficam numa camada acima dos menus (uma compra na loja aparece). Texto longo quebra em linhas; no toque a coluna fica longe dos botões.
- **Faixa de área**: aba dourada que desce suave, nome em letra de 16 px (8 px se não couber).
- **Diálogo**: caixa prateada com aba do nome em destaque e **retrato** de quem fala (`Hud.speaker_portrait`); falantes de nome composto reconhecidos (`Hud.SPEAKERS_MULTI`). O texto é quebrado por conta própria (a fonte é monoespaçada) e **paginado** (`Hud.paginate`): nenhuma fala é cortada; o contador "1/2" aparece no canto e {interagir} primeiro completa a página, depois passa para a próxima página e, no fim, para a próxima fala. Seta "continuar" balança quando a página está completa. No toque, o texto termina antes do botão OK.
- **Painel de informação dos menus**: mesmo esquema de quebra/páginas; páginas viram sozinhas a cada 5 s, com ← → (quando o item não ajusta valores) ou tocando no painel. Linhas da lista longas terminam em "…"; setas ▲▼ indicam rolagem; itens com ícone mostram o ícone na lista; itens com cor de raridade ganham o **brilho pulsante** da raridade em volta do painel. Só a tela de cima aparece (rodapés não se sobrepõem) e o objetivo do HUD some atrás dos menus.
- Textos que citam botões usam os marcadores `{interagir}`, `{menu}`, `{habilidade}` etc. (trocados por tecla ou botão de toque em `Game.k`, agora também no painel dos menus). O teste "falas sem marcador {…} desconhecido" confere todas as falas.

## Opções (título → Opções, ou Pausa → Opções)

Gravadas na hora em `user://prefs.json` (`Game.save_prefs`; os testes usam `user://prefs_teste.json` e começam dos padrões). `Game.PREFS_DEFAULT` lista tudo; ao carregar, chaves desconhecidas ou de tipo errado são ignoradas.

| Opção | Chave | Efeito |
|---|---|---|
| Volume geral / Música / Efeitos | `master`, `musica`, `efeitos` | barramentos de áudio |
| Velocidade do texto | `vel_texto` | Lenta 30, Normal 55, Rápida 110 letras/s, Instantânea |
| Texto grande | `texto_grande` | falas em 16 px, caixa mais alta (mais páginas) |
| Mostrar dicas | `dicas` | caixa de dicas do tutorial |
| Tremor de tela | `reduz_tremor` (invertida) | balanço da câmera |
| Flashes de impacto | `reduz_flash` (invertida) | congelamento de impacto |
| Perigo por forma e cor | `formas_perigo` | avisos de ataque com símbolo |
| Vibração | `vibracao` | `Input.vibrate_handheld` ao levar dano e em tremores fortes (só toque) |
| Tamanho dos botões | `toque_tamanho` | 80–140% |
| Opacidade dos botões | `toque_alfa` | 30–100% |
| Setas dos menus | `setas_lado` | nas laterais / todas à direita / todas à esquerda; listas e painéis abrem espaço para elas. Nas falas o OK fica sempre à direita. |
| Dificuldade | `Game.difficulty` | História / Aventura / Desafio (`Game.DIFFICULTY`), gravada no jogo salvo, só fora de combate |
| Idioma | `idioma` | `Game.LANGS` (só pt-BR por ora; `TranslationServer.set_locale`) |
| Teclado | `keys` | remapear cada ação; "Restaurar controles padrão" |
| Restaurar opções padrão | — | tudo volta ao padrão, menos as teclas (pede confirmação) |

No toque, tocar na metade esquerda de uma linha de valor diminui, na direita aumenta.

## Testes

`-- --unit` inclui as verificações de interface (`unit_interface` em tests/e2e_bot.gd): paginação sem cortar nem perder palavras, falante e retrato, marcadores, diálogo paginado ao vivo, texto instantâneo e grande, tipos de aviso e fila sem sobreposição, salvar/carregar/arquivo inválido/restaurar opções, setas do toque, tela de Opções completa, ← → gravando na hora e dificuldade.

`-- --e2e --interface` repete essas verificações e tira fotos (`SHOTS_DIR`, padrão /tmp/shots) de título, faixa, avisos, falas de cada retrato, páginas, texto grande, pausa, inventário com brilho de raridade, opções, jornada e do modo toque (HUD, fala, pausa, setas à direita, botões grandes e translúcidos).
