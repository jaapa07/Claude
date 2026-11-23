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

O rastro de Ione é contado por três meios:
1. **Memórias dos Guardiões** (`data/story.json`): quando um guardião/minichefe cai, uma visão do passado
   aparece (trilha "memória") e entrega uma página do diário.
2. **Diário de Ione** (itens `pagina_ione_N`, tipo história), relidos no menu *Diário → Memórias e Diário de Ione*.
3. **Falas dos moradores** que a viram passar (Maru, Dona Corvelo, Pipo, Ilda, Doran, Ilse) e marcas físicas
   (o sinal de mão do treino no Cervo e no selo da Catedral).

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
| 5 Catedral | Arauto Partido (minichefe) | O Arauto da Ordem do Vazio (manto branco, olho fechado) carregou vozes demais e se partiu; deixou Ione passar e lhe contou o nome do Rei. | 7 |
| 5 Catedral | Rei dos Ecos | Ione está presa dentro do Eco (Câmara do Eco, quatro elos — um para cada Eco). Resgatada, conta que foi aprendiz de Ivar. O herói vence devolvendo ao Rei o nome "Ivar", junto de Ione e das criaturas da equipe; o Rei se desfaz em paz. | Artefato do Rei (`artefato_rei`) |

## O final (Região 5 — docs/REGIAO5_CONTRATO.md)
1. **Acampamento da Aurora:** do outro lado do selo externo (Passo Umbral). O **Arauto da Ordem do Vazio** proclama que o Rei "guarda tudo" e some na Catedral; o herói responde. O **Eco de Ione** — uma figura azul e translúcida — aparece um passo à frente (Acampamento, Nave, tesouro, preparação), com frases curtas.
2. **Catedral:** o Arauto reaparece na Nave, o livro rachando; no andar das âncoras vira o **Arauto Partido**. Sua memória (página 7) conta que ele deixou Ione passar.
3. **Câmara do Eco:** Ione está presa num cristal, presa por quatro elos (raiz, brasa, véu, sombra). Livre, ela fala com o aprendiz (calor humano, "chegou na hora, teimoso como sempre") e revela: Ivar foi o mestre dela.
4. **O Rei dos Ecos:** três fases; a 6% ele hesita. O herói — que também acordou sem memória e a recuperou pelos vínculos — diz o nome **Ivar**, com Ione e as criaturas da equipe (a cena cita as espécies e os vínculos). O Rei lembra e se desfaz em paz. Memória de Ivar → **quinto artefato** (`artefato_rei`, flags `artefato_rei` e `lembranca_5`).
5. **Revelação final:** com os cinco artefatos, o herói lembra de tudo: fazia parte da expedição; quando a fenda se abriu, Ione selou suas memórias para que a corrente da Ordem não as levasse; ele acordou perto de Lúmen só com a carta dela.
6. **Epílogo:** as fissuras se fecham e o jogo visita as cinco comunidades (Vila Lúmen, Forja de Cobre, Porto das Lanternas, Refúgio da Muralha, Acampamento da Aurora) com moradores e decorações novas; Bruna, Ravi e Vesna fecham seus arcos com uma linha cada; créditos; **Harmonia dos Ecos** (desafios opcionais e notas do bestiário — nada antes depende dela).

## Tom
Aventura acolhedora nas vilas, descoberta nas rotas, tensão nas masmorras. Antagonistas têm motivo
humano (Vesna protege as próprias feras; o Rei quer lembrar). Nada de violência gráfica: guardiões se
desfazem em fragmentos de Eco.

## Como acrescentar uma memória
Em `data/story.json → memorias`, a chave é a flag que marca a vitória (`flag_done` do chefe ou `<contrato>_ok`):
`{"titulo": ..., "item": "pagina_ione_N", "linhas": [...]}`. Crie o item em `data/items.json` (tipo `historia`).
O teste `-- --e2e --historia` confere que cada memória aponta para um chefe/contrato real e uma página existente.
