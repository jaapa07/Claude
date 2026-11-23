# Ecos da Ruína — Bíblia da história

## Premissa
Auralis é atravessada pelo **Eco**, a energia que dá voz às criaturas e às terras. Cinco guardiões
(Floresta, Minas, Pântano, Fortaleza e Catedral) mantinham o Eco em equilíbrio. O primeiro **Arquivista,
Ivar**, tentou guardar todo o Eco na **Catedral do Vazio** "para que nada se perdesse" — e perdeu a si mesmo,
tornando-se o **Rei dos Ecos**. Sua seita, a **Ordem do Vazio** (mantos brancos, insígnia de um olho fechado),
prende os guardiões com **correntes de metal-eco** para drenar a memória deles até a Catedral: o Rei não
quer poder, quer **lembrar quem era**.

## O herói e o fio condutor
O protagonista é o aprendiz da **Mestra Ione**, vinculadora de capa azul. **Ele tem amnésia**: acorda na estrada
perto de Lúmen lembrando só que é aprendiz de Ione, com a carta dela no bolso ("Se eu não voltar, vá a Lúmen. Procure a
Anciã Maru. E traga selos."). Tudo o que sabe da expedição vem da carta; Maru o reconhece por ela. A campanha é, ao mesmo
tempo, **resgate** (seguir o rastro de Ione), **revelação** (descobrir o que é o Rei dos Ecos) e **reencontro consigo
mesmo** (recuperar as lembranças). Espelho com o vilão: o Rei dos Ecos (Ivar, o primeiro Arquivista) também esqueceu
quem era; no fim, o herói que recuperou o próprio passado devolve ao Rei o nome dele.

### A verdade (revelada aos poucos; a revelação completa é da Região 5)
Linha do tempo da expedição: Dia 1 — partida de madrugada; Ione cede e leva o aprendiz (lembrança 4). Dia 3 — o garoto
carrega as lanternas (bilhete de Teodoro no Bosque). Dia 4 — no Santuário da Seiva a corrente da Ordem chega; quando a
fenda se abre, Ione **sela as memórias do aprendiz** para escondê-las da corrente (a Ordem drena memórias até a Catedral)
e o manda para longe; ele acorda perto de Lúmen. Dia 5 — Teodoro escreve que Ione riscou o sinal na pedra "para o aprendiz
que, jura, vai vir atrás". Depois, Ione guarda cada pedaço selado num objeto e o deixa com um guardião pelo caminho
(Floresta → Minas → Pântano → Fortaleza → Catedral). Por isso cada guardião libertado devolve um **artefato** com uma
**lembrança** dentro. O Arauto da Ordem sabe que "a mestra escondeu uma lembrança" e provoca o herói com isso.

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

## Artefatos e lembranças (`data/story.json → artefatos`, `scripts/historia.gd`)
Cada entrada: `{id, nome, desc, chefe_flag, chefe, lembranca: {titulo, linhas}}`; o item de mesmo `id` (tipo `historia`,
`artefato: true`, folha `icons_artefatos`, desenhada em `assets/src/89_artefatos.pxl`) vai para o inventário.
Quando `chefe_flag` é marcada, **depois** da Memória do Guardião (se houver), toca a lembrança: tela escurece, tom sépia
por trás do diálogo (`hud.set_memory_tint`), trilha "memoria", falas de "Ione:" e "Você:" no passado e a reação da
criatura ativa. Depois: flag `lembranca_<id>`, item no inventário, aviso; com todos, flag `artefatos_completos`.
Relidas no menu de pausa → **Artefatos** (último item) e na **Jornada** (5 espaços).

| Chefe | Artefato | Lembrança |
|---|---|---|
| Cervo de Ossos | Semente de Âmbar | O primeiro treino: o sinal da mão ("estou aqui") e a semente para "quando esquecer por que luta". |
| Ferreiro Devorador | Elo Partido (a outra metade do elo-bússola) | Uma promessa: "vínculo não é corrente"; "você também não vai embora sem mim". |
| Bruxa Afogada | Lágrima de Orvalho | A briga: Ione não queria levá-lo; "confio mais do que em qualquer pessoa. É disso que eu tenho medo." |
| Cavaleiro Sem Rosto | Fragmento de Elmo | O dia da partida: o elmo de treino, Teodoro e Joran, "se eu fizer o nosso sinal, você corre". Termina em "Então você estava lá?" |
| Rei dos Ecos | Coroa Partida | A fenda: no Santuário da Seiva a corrente vem buscar as lembranças do aprendiz; Ione faz o sinal ("estou aqui"), sela as memórias dele e o empurra pela fenda; ele acorda perto de Lúmen só com a carta. (Região 5) |

### Região 5 (feito)
- `coroa_partida` está escrita (sem `placeholder`) por `tools/dados_regiao5.py`; toca sozinha depois da Memória de Ivar
  (`rei_morto`) e o epílogo da Região 5 espera por ela (`Catedral.epilogue`). Detalhes do final: seção "O final" abaixo e
  `docs/REGIAO5_CONTRATO.md`.

## Cenas curtas (`story.json → cenas`)
`{mapa, linhas, titulo?, area? [x,y,w,h], arauto? [x,y], if?, unless?, reacao?, reacao_pos?, espera?}`. Toca uma vez
(flag `cena_<id>`) quando o herói está livre no mapa (e dentro de `area`, se houver). Com `arauto`, o **Arauto** (manto
branco, olho fechado bordado, `assets/sprites/arauto.png`) fica em cena até a conversa e some num clarão.
Em teste rápido as cenas só marcam a flag e o Arauto não aparece (não bloqueia o bot).
- Chegadas/descobertas: Bosque (lanterna de expedição com o nó que as mãos do herói conhecem), Forja de Cobre (uma voz
  conhecida), Porto (barcos sem nome — perda), Refúgio (retratos dos soldados com velas).
- O Arauto antes de cada chefe de região (sala de preparação de `santuario_c`, `fundicao_c`, `templo_c`, `torre_c`):
  provoca ("você não me reconhece"), dá pistas (a Ordem guarda memórias; o seu pedaço "nunca chegou"; o capitão sem rosto
  também esqueceu; "o olho vai se abrir").

## Reações da criatura (`story.json → reacoes_criatura`)
Linha descritiva com o apelido/nome da criatura ativa nas memórias, lembranças, cenas do Arauto e chegadas
("Brotisco encosta a cabeça na sua mão."). `especies` sobrepõe por espécie.

## Bilhetes ambientais (8, `decor` com `sheet: "bilhetes"` nos geradores de mapa)
Diálogos `bilhete_*` em `dialogs.json` (marcam `leu_bilhete_*`; relidos no Diário → Bilhetes encontrados):
Teodoro no Bosque (o garoto das lanternas), lista da expedição na Clareira (um nome riscado até rasgar), mineiro na
Pedreira, ordem de carga "entregar ao Arauto" nos Trilhos, Joran na Passarela, barqueira no Lago, soldado na Muralha
(o comandante pergunta o próprio nome), jardineira nos Jardins (o manto branco que pergunta do que você se lembra).

## Contratos pessoais (`contracts.json`, `pessoal: true`, com `abertura` e `desfecho`)
- **O Irmão da Bruna** (dupla com a Bruna, Trilhos Fundidos): o caçula Caio fugiu para os Domadores para mandar moedas
  para casa; desfecho no abraço — Bruna luta "para que ninguém precise escolher entre a família e as correntes". Caio
  volta para Lúmen e conta do Arauto.
- **O Rastro de Joran** (dupla com o Ravi, Passarela dos Ecos): Joran, mestre do Ravi e batedor da expedição; o bilhete
  dele manda Ravi "parar de procurar e começar a ensinar". Recompensa: Bússola de Joran.

## Arco por capítulo
| Capítulo | Guardião | Revelação | Página |
|---|---|---|---|
| 1 Floresta | Lenhador Oco (minichefe) | Mantos brancos pediram madeira viva; a primeira corrente apodrece o santuário. | 1 |
| 1 Floresta | Cervo de Ossos | Ione segurou as raízes para os Corvelo fugirem; abriu uma fenda ao norte. Está viva. | 2 |
| 2 Minas | Vigia de Escória (minichefe) | Carrinhos de pedra-eco seguem ao sul; Ione os marca com giz. | 3 |
| 2 Minas | Ferreiro Devorador | O primeiro ferreiro forjou as correntes sem saber; Ione quebrou um elo — a bússola até a Catedral. | 4 |
| Contratos | Vesna, a Caçadora | Os Domadores vendem feras vinculadas à Ordem: "o Rei precisa de vozes". | Carta do Arquivista |
| 3 Pântano | Bruxa Afogada | A Bruxa guardava os reflexos/lembranças; Ione tentou salvá-la. | 5 |
| 4 Fortaleza | Cavaleiro Sem Rosto | Era Aldren, capitão da Catedral; deixou Ione passar. O Rei é Ivar, o Arquivista. | 6 (última) |
| 5 Catedral | Arauto Partido (minichefe) | O Arauto da Ordem do Vazio (manto branco, olho fechado) carregou vozes demais e se partiu; deixou Ione passar e lhe contou o nome do Rei. | 7 |
| 5 Catedral | Rei dos Ecos | Ione está presa dentro do Eco (Câmara do Eco, quatro elos — um para cada Eco). Resgatada, conta que foi aprendiz de Ivar. O herói vence devolvendo ao Rei o nome "Ivar", junto de Ione e das criaturas da equipe; o Rei se desfaz em paz. | 7 (Arauto) • Pena de Ivar + Coroa Partida |

## O final (Região 5 — docs/REGIAO5_CONTRATO.md)
1. **Acampamento da Aurora:** do outro lado do selo externo (Passo Umbral). O **Arauto da Ordem do Vazio** proclama que o Rei "guarda tudo" e some na Catedral; o herói responde. O **Eco de Ione** — uma figura azul e translúcida — aparece um passo à frente (Acampamento, Nave, tesouro, preparação), com frases curtas.
2. **Catedral:** o Arauto reaparece na Nave, o livro rachando; no andar das âncoras vira o **Arauto Partido**. Sua memória (página 7) conta que ele deixou Ione passar.
3. **Câmara do Eco:** Ione está presa num cristal, presa por quatro elos (raiz, brasa, véu, sombra). Livre, ela fala com o aprendiz (calor humano, "chegou na hora, teimoso como sempre") e revela: Ivar foi o mestre dela.
4. **O Rei dos Ecos:** três fases; a 6% ele hesita. O herói — que também acordou sem memória e a recuperou pelos vínculos — diz o nome **Ivar**, com Ione e as criaturas da equipe (a cena cita as espécies e os vínculos). O Rei lembra e se desfaz em paz. Memória de Ivar (item `lembranca_ivar`) → depois toca a última lembrança, a do artefato **Coroa Partida** (`story.json → artefatos.coroa_partida`, `scripts/historia.gd`); o epílogo espera por ela.
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

O mesmo teste confere a abertura com amnésia, a lembrança e o artefato depois da memória, a tela de Artefatos, o Arauto
em cena, os bilhetes, os contratos pessoais e o save/load.
