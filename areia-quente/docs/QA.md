# QA ponta a ponta

Executado em 2026-11-26 16:27 UTC com `node scripts/qa/run.cjs` (Chromium headless, build de produção).

**21/21 suítes OK.** O monitor de invariantes roda a cada quadro em todas as suítes (bola/jogadores com posição válida e dentro do mundo,
bola perto do dono, controle duplicado, time humano sem jogador, estados presos, bola morta sem ninguém ir buscar).

| Suíte | Resultado | Tempo |
|---|---|---|
| menus | ✔ OK | 222s |
| options | ✔ OK | 45s |
| fullmatch | ✔ OK | 121s |
| arenas | ✔ OK | 132s |
| human | ✔ OK | 158s |
| twoplayers | ✔ OK | 50s |
| setpieces | ✔ OK | 64s |
| fouls | ✔ OK | 57s |
| pausemenu | ✔ OK | 37s |
| cup | ✔ OK | 164s |
| pens | ✔ OK | 74s |
| training | ✔ OK | 32s |
| minigames | ✔ OK | 561s |
| achievements | ✔ OK | 64s |
| memory | ✔ OK | 108s |
| career | ✔ OK | 161s |
| mobile | ✔ OK | 34s |
| iphone | ✔ OK | 166s |
| toques | ✔ OK | 296s |
| goleiro | ✔ OK | 121s |
| formatos | ✔ OK | 154s |

## menus

- ✔ ENTER no título abre o menu
- ✔ duplo clique gera uma única transição (1)
- ✔ menu com 8 opções (AmistosoJogar agora | Copa Rei da Praia8 seleções | Modo CarreiraNova carreira | TreinoSem pressão | Desafios da PraiaBata recordes | Conquistas (0/20)Prêmios e bolas | OpçõesAjustes | CréditosEquipe)
- ✔ opção 1 → ctrl
- ✔   ESC volta ao menu
- ✔ opção 2 → teams
- ✔   ESC volta ao menu
- ✔ opção 3 → teams
- ✔   ESC volta ao menu
- ✔ opção 4 → teams
- ✔   ESC volta ao menu
- ✔ opção 5 → challenges
- ✔   ESC volta ao menu
- ✔ opção 6 → achievements
- ✔   ESC volta ao menu
- ✔ opção 7 → options
- ✔   ESC volta ao menu
- ✔ opção 8 → credits
- ✔   ESC volta ao menu

## options

- ✔ volume da música alterado e salvo (0.7 → 0.5)
- ✔ tecla de passe remapeada para U (KeyU)
- ✔ opções persistem após recarregar a página
- ✔ saída de bola com a tecla remapeada (U)

## fullmatch

- ✔ partida de 3 períodos termina na tela de resultado
- ✔ ciclo de estados completo (play, setpiece, replay, goal, halftime, kickoff, fulltime)
- ✔ houve chutes (13,6)

## arenas

- ✔ lagoa: o relógio avança (1º 172s)
- ✔ dunas: o relógio avança (1º 210s)

## human

- ✔ jogador humano executou ações pelo teclado (54)
- ✔ time humano chutou a gol (3)
- ✔ jogador controlado se movimentou

## twoplayers

- ✔ controles movidos para CASA e FORA
- ✔ teclado não é arrastado pelo analógico dos controles
- ✔ os dois times têm jogador controlado (2,1)
- ✔ saída cobrada pelo dispositivo do batedor (kb)
- ✔ analógico move o jogador do controle 1

## setpieces

- ✔ throw_in: CPU cobra e o jogo segue (play sp=- t=-)
- ✔ corner: CPU cobra e o jogo segue (play sp=- t=-)
- ✔ goal_kick: CPU cobra e o jogo segue (play sp=- t=-)
- ✔ free_kick: CPU cobra e o jogo segue (play sp=- t=-)
- ✔ penalty: CPU cobra e o jogo segue (play sp=- t=-)

## fouls

- ✔ falta por trás gera cartão amarelo
- ✔ segundo amarelo tira o jogador por 2 minutos
- ✔ jogo continua (cobrança executada) após a falta
- ✔ jogador expulso volta após 2 minutos de jogo

## pausemenu

- ✔ ESC pausa a partida
- ✔ formação alterada pelo menu de táticas (2-2)
- ✔ substituição troca o jogador em campo (CAJU → RAIO LASER)
- ✔ continuar retoma a partida
- ✔ reiniciar começa uma nova partida

## cup

- ✔ copa criada com chaveamento
- ✔ progresso da copa salvo após recarregar ("Continuar Copa")
- ✔ vencer a final leva à cena do troféu
- ✔ conquista "Campeão da Copa" desbloqueada

## pens

- ✔ empate → prorrogação → pênaltis
- ✔ disputa termina no resultado (pênaltis 2,1)

## training

- ✔ [L] sem bola: treinador cruza
- ✔ desafios do treino completos
- ✔ conquista "Aluno Aplicado"

## minigames

- ✔ Pênaltis de Ouro: 5 cobranças pelo teclado e tela de resultado ([false,false,true,false,true])
- ✔ embaixadinhas encadeadas pelo bot (11)
- ✔ Embaixadinhas termina (bola caiu ou tempo)
- ✔ Tiro ao Alvo termina após 10 bolas (10,460)
- ✔ recordes salvos ({"pk":2,"juggle":11,"target":460})

## achievements

- ✔ tela lista 20 conquistas, 5 desbloqueadas (20,5)
- ✔ bola dourada liberada com 5 conquistas e selecionada (dourada)
- ✔ bola neon bloqueada não é selecionada (dourada)
- ✔ partida usa a bola dourada

## memory

- ✔ sem acúmulo de objetos dinâmicos entre partidas (131,131,131)
- ✔ cena não cresce entre trocas de arena (448,448,448)

## career

- ✔ carreira criada (POR, 8 times, 7 rodadas)
- ✔ tabela da liga com 8 seleções
- ✔ partida da carreira usa a seleção do jogador
- ✔ rodada 1 registrada e pontos de evolução ganhos (3 → 9)
- ✔ vitória vale 3 pontos na tabela (3 Portugal11004133)
- ✔ evolução gasta 1 ponto e melhora o atributo ({"POR0":{"chute":1}})
- ✔ temporada concluída e registrada no histórico (1º)
- ✔ segunda temporada começa
- ✔ histórico lista a temporada

## mobile

- ✔ menu sem rolagem horizontal em 390 px
- ✔ placar cabe na tela do celular

## iphone

- ✔ detecta tela de toque e cria os controles
- ✔ título pede "TOQUE PARA COMEÇAR"
- ✔ título mostra "VERSÃO CELULAR"
- ✔ toque no título abre o menu
- ✔ menu sem rolagem da página
- ✔ Amistoso vai direto para a seleção de times (sem tela de controles)
- ✔ botão COMEÇAR visível na tela
- ✔ toque na seta troca a seleção
- ✔ seleção de times cabe na tela
- ✔ COMEÇAR inicia a partida
- ✔ botão PULAR aparece na apresentação
- ✔ PULAR encerra a apresentação
- ✔ no saque o botão PASSE pisca
- ✔ bola em jogo
- ✔ joystick e botões visíveis durante o jogo
- ✔ todos os botões dentro da tela e com no mínimo 40 px
- ✔ jogador controlado pela tela de toque
- ✔ joystick move para a direita (mx=0.98)
- ✔ multitoque: joystick + botão ao mesmo tempo (shoot:on | on atk | play)
- ✔ soltar os dedos solta joystick e botão
- ✔ jogador se moveu com o joystick
- ✔ ATAQUE: PASSE/CHUTE/LENÇOL/FIRULA, sem CARRINHO ({"atk":true,"def":false,"pass":"PASSE","tackle":false,"trick":true,"lob":true,"shoot":true,"big":22.800048828125})
- ✔ DEFESA: CARRINHO grande, TROCAR, sem FIRULA/LENÇOL ({"atk":false,"def":true,"pass":"TROCAR","tackle":true,"trick":false,"lob":false,"shoot":true,"big":76})
- ✔ pausa esconde os controles de toque
- ✔ continuar devolve os controles
- ✔ na vertical aparece "Gire o aparelho"
- ✔ na horizontal o aviso some
- ✔ opções do celular: botões, vibração, troca de versão; sem teclas
- ✔ pc.html: versão PC sem controles de toque

## toques

- ✔ ATAQUE: layout aparece com a bola
- ✔ PASSE (toque rápido) passa a bola
- ✔ CHUTE (toque rápido) chuta para o gol (20.2 m/s)
- ✔ CHUTE segurado carrega a força (56%) e chuta
- ✔ LENÇOL levanta a bola
- ✔ FIRULA faz embaixadinha/chapéu
- ✔ CORRER aumenta a velocidade (2.7 → 5.1 m/s)
- ✔ FOGO apagado com a barra vazia
- ✔ tocar em botão apagado mostra uma dica
- ✔ FOGO com a barra cheia ativa o Modo Fogo
- ✔ companheiro com a bola recebe o controle
- ✔ layout ATAQUE para quem está com a bola
- ✔ passe em andamento mantém o layout ATAQUE
- ✔ DEFESA: layout aparece com o adversário na bola
- ✔ TROCAR, MARCAR e CARRINHO grande ({"pass":"TROCAR","press":true,"tackle":76})
- ✔ CARRINHO dá o carrinho
- ✔ MARCAR corre sozinho até o adversário (9.3 → 5.6 m)
- ✔ TROCAR troca o jogador controlado
- ✔ toque entre dois botões aciona o mais próximo
- ✔ seis toques rápidos seguidos chegam todos (6/6)
- ✔ três dedos: joystick + CORRER + CHUTE ({"mx":1,"run":true,"shoot":true})
- ✔ soltar todos os dedos solta tudo
- ✔ PASSE rasteiro: chega no pé do companheiro (ele andou 0.00 m depois do passe)
- ✔ LENÇOL: chega no pé do companheiro (ele andou 0.00 m depois do passe)
- ✔ mira assistida: 20–25° fora do alvo ainda escolhe o companheiro certo (✔✔✔✔✔✔)
-   diagnóstico do passe apontado: {"mx":0.82,"my":0.57,"ctrl":"CAJU","tgt":"ZÉ COQUEIRO"}
- ✔ passe pelo toque apontando torto vai para o companheiro da direção (ZÉ COQUEIRO)
- ✔ proteção ao dominar a bola
- ✔ tabela: quem passou dispara para receber de volta
- ✔ tabela: o passador corre para o espaço
- ✔ bola aérea ao alcance: aviso CHUTE! e botão piscando
- ✔ MARCAR colado no adversário dá o bote
- ✔ troca automática passa o controle para quem está perto da bola
-   registro de toques: pass:on shoot:on shoot:on lob:on trick:on sprint:on fire:off hint fire:on pass:on tackle:on press:on pass:on shoot:on trick:on trick:off hint trick:off hint trick:off hint trick:off hint sprint:on shoot:on pass:on lob:on pass:on pass:on press:on

## goleiro

- ✔ 24 chutes contra os dois goleiros sem travar (24 resolvidos, 0 defesas agarradas, maior tempo com a bola 0.0 s)
- ✔ goleiro nunca fica mais de 7 s com a bola na mão
- ✔ meu goleiro agarra e recebe o controle
- ✔ aviso "Goleiro com a bola" + PASSE/LANÇAR piscando ({"msg":"Goleiro com a bola: toque PASSE ou LANÇAR","wait":true,"label":"LANÇAR"})
- ✔ goleiro anda com a bola na mão (0.5 m)
- ✔ tocar PASSE repõe a bola 
- ✔ sem tocar em nada, o goleiro espera e repõe sozinho aos 6 s (com 5 s ainda segurando: true; aos 7,5 s solto: true) 

## formatos

- ✔ seletor de formato na escolha de times (3x3 4x4 5x5)
- ✔ clicar em 3x3 seleciona o formato
- ✔ 3x3: 3 em campo (com goleiro) e 7 no banco [{"field":3,"bench":7,"gk":true,"slots":"014"},{"field":3,"bench":7,"gk":true,"slots":"014"}]
- ✔ 3x3: a partida anda (relógio 12s, estado replay, placar 0x1, chutes 0x1)
- ✔ 4x4: 4 em campo (com goleiro) e 6 no banco [{"field":4,"bench":6,"gk":true,"slots":"0123"},{"field":4,"bench":6,"gk":true,"slots":"0123"}]
- ✔ 4x4: a partida anda (relógio 16s, estado replay, placar 0x1, chutes 0x1)
- ✔ 5x5: 5 em campo (com goleiro) e 5 no banco [{"field":5,"bench":5,"gk":true,"slots":"01234"},{"field":5,"bench":5,"gk":true,"slots":"01234"}]
- ✔ 5x5: a partida anda (relógio 33s, estado goal, placar 0x1, chutes 0x1)

Capturas de tela das suítes em `docs/qa/`.
