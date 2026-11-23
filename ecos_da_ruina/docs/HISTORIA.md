# Ecos da Ruína — Bíblia da história

## Premissa
Auralis é atravessada pelo **Eco**, a energia que dá voz às criaturas e às terras. Cinco guardiões
(Floresta, Minas, Pântano, Fortaleza e Catedral) mantinham o Eco em equilíbrio. O primeiro **Arquivista,
Ivar**, tentou guardar todo o Eco na **Catedral do Vazio** "para que nada se perdesse" — e perdeu a si mesmo,
tornando-se o **Rei dos Ecos**. Sua seita, a **Ordem do Vazio** (mantos brancos, insígnia de um olho fechado),
prende os guardiões com **correntes de metal-eco** para drenar a memória deles até a Catedral: o Rei não
quer poder, quer **lembrar quem era**.

## O herói e o fio condutor
O protagonista é o aprendiz da **Mestra Ione**, vinculadora de capa azul. Ione partiu com uma expedição para
a Floresta e desapareceu. A carta dela manda o aprendiz a Lúmen. A campanha é, ao mesmo tempo, **resgate** (seguir o
rastro de Ione) e **revelação** (descobrir o que é o Rei dos Ecos).

O rastro de Ione é contado por quatro meios:
1. **Memórias dos Guardiões** (`data/story.json`): quando um guardião/minichefe cai, uma visão do passado
   aparece (trilha "memória") e entrega uma página do diário.
2. **Diário de Ione** (itens `pagina_ione_N`, tipo história), relidos no menu *Diário → Memórias e Diário de Ione*.
3. **Falas dos moradores** que a viram passar (Maru, Dona Corvelo, Pipo, Ilda, Doran, Ilse) e marcas físicas
   (o sinal de mão do treino no Cervo e no selo da Catedral).
4. **Diários da Expedição** (`diario_expedicao_1` na câmara secreta do Santuário, `diario_expedicao_2` na Grota das Raízes Antigas):
   Teodoro, cartógrafo da expedição, escreve sobre Ione — o sinal da mão riscado na pedra, o tronco que ela segurou para os
   Corvelo fugirem e o recado ao aprendiz. O anel de flores do Bosque guarda outra pista: a fita azul da capa de Ione presa
   à pata de um Lumipim velho.

## Arco por capítulo
| Capítulo | Guardião | Revelação | Página |
|---|---|---|---|
| 1 Floresta | Lenhador Oco (minichefe) | Mantos brancos pediram madeira viva; a primeira corrente apodrece o santuário. | 1 |
| 1 Floresta | Cervo de Ossos | Ione segurou as raízes para os Corvelo fugirem; abriu uma fenda ao norte. Está viva. | 2 |
| 2 Minas | Vigia de Escória (minichefe) | Carrinhos de pedra-eco seguem ao sul; Ione os marca com giz. | 3 |
| 2 Minas | Ferreiro Devorador | O primeiro ferreiro forjou as correntes sem saber; Ione quebrou um elo — a bússola até a Catedral. | 4 |
| Contratos | Vesna, a Caçadora | Os Domadores vendem feras vinculadas à Ordem: "o Rei precisa de vozes". | Carta do Arquivista |
| 3 Pântano | Bruxa Afogada | **(a fazer pela Região 3)** A Bruxa guardava os reflexos/lembranças; Ione tentou salvá-la. | 5 |
| 4 Fortaleza | Cavaleiro Sem Rosto | Era Aldren, capitão da Catedral; deixou Ione passar. O Rei é Ivar, o Arquivista. | 6 (última) |
| 5 Catedral | Rei dos Ecos | **(futuro)** Ione está presa dentro do Eco; o herói vence devolvendo ao Rei uma memória que é dele (o nome "Ivar"), e não só pela força. Epílogo nas cinco comunidades. | — |

## Tom
Aventura acolhedora nas vilas, descoberta nas rotas, tensão nas masmorras. Antagonistas têm motivo
humano (Vesna protege as próprias feras; o Rei quer lembrar). Nada de violência gráfica: guardiões se
desfazem em fragmentos de Eco.

## Como acrescentar uma memória
Em `data/story.json → memorias`, a chave é a flag que marca a vitória (`flag_done` do chefe ou `<contrato>_ok`):
`{"titulo": ..., "item": "pagina_ione_N", "linhas": [...]}`. Crie o item em `data/items.json` (tipo `historia`).
O teste `-- --e2e --historia` confere que cada memória aponta para um chefe/contrato real e uma página existente.
