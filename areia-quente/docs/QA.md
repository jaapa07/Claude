# QA ponta a ponta

Executado em 2026-11-25 22:24 UTC com `node scripts/qa/run.cjs` (Chromium headless, build de produção).

**15/17 suítes OK.** O monitor de invariantes roda a cada quadro em todas as suítes (bola/jogadores com posição válida e dentro do mundo,
bola perto do dono, controle duplicado, time humano sem jogador, estados presos, bola morta sem ninguém ir buscar).

| Suíte | Resultado | Tempo |
|---|---|---|
| menus | ✔ OK | 250s |
| options | ✔ OK | 51s |
| fullmatch | ✔ OK | 170s |
| arenas | ✔ OK | 136s |
| human | ✔ OK | 173s |
| twoplayers | ✔ OK | 54s |
| setpieces | ✔ OK | 74s |
| fouls | ✔ OK | 60s |
| pausemenu | ✘ FALHOU | 66s |
| cup | ✔ OK | 164s |
| pens | ✔ OK | 86s |
| training | ✔ OK | 32s |
| minigames | ✘ FALHOU | 1065s |
| achievements | ✔ OK | 64s |
| memory | ✔ OK | 108s |
| career | ✔ OK | 161s |
| mobile | ✔ OK | 39s |

## menus

- ✔ ENTER no título abre o menu
- ✔ duplo clique gera uma única transição (1)
- ✔ menu com 8 opções (Amistoso | Copa Areia Quente | Modo Carreira | Treino | Desafios da Praia | Conquistas (0/20) | Opções | Créditos)
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
- ✔ ciclo de estados completo (play, goal, replay, halftime, setpiece, periodEnd, kickoff, fulltime)
- ✔ houve chutes (20,9)

## arenas

- ✔ lagoa: o relógio avança (1º 154s)
- ✔ dunas: o relógio avança (1º 126s)

## human

- ✔ jogador humano executou ações pelo teclado (42)
- ✔ time humano chutou a gol (5)
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

- ✘ ESC pausa a partida
- ✘ formação alterada pelo menu de táticas (1-2-1)
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

- ✔ Pênaltis de Ouro: 5 cobranças pelo teclado e tela de resultado ([false,false,true,true,false])
- ✔ embaixadinhas encadeadas pelo bot (34)
- ✘ Embaixadinhas termina (bola caiu ou tempo)
- ✔ Tiro ao Alvo termina após 10 bolas (10,370)
- ✘ recordes salvos ({"pk":2,"juggle":0,"target":370})

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

Capturas de tela das suítes em `docs/qa/`.
