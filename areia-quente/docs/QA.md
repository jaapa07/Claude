# QA ponta a ponta

Executado em 2026-11-26 00:00 UTC com `node scripts/qa/run.cjs` (Chromium headless, build de produção).

**14/18 suítes OK.** O monitor de invariantes roda a cada quadro em todas as suítes (bola/jogadores com posição válida e dentro do mundo,
bola perto do dono, controle duplicado, time humano sem jogador, estados presos, bola morta sem ninguém ir buscar).

| Suíte | Resultado | Tempo |
|---|---|---|
| menus | ✘ FALHOU | 1s |
| options | ✔ OK | 82s |
| fullmatch | ✔ OK | 170s |
| arenas | ✔ OK | 136s |
| human | ✔ OK | 220s |
| twoplayers | ✔ OK | 54s |
| setpieces | ✔ OK | 74s |
| fouls | ✔ OK | 60s |
| pausemenu | ✔ OK | 62s |
| cup | ✔ OK | 164s |
| pens | ✔ OK | 86s |
| training | ✔ OK | 32s |
| minigames | ✘ FALHOU | 188s |
| achievements | ✔ OK | 64s |
| memory | ✔ OK | 108s |
| career | ✔ OK | 161s |
| mobile | ✘ FALHOU | 0s |
| iphone | ✘ FALHOU | 91s |

## menus

- ✘ exceção: page.waitForFunction: Target page, context or browser has been closed

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

- ✔ jogador humano executou ações pelo teclado (29)
- ✔ time humano chutou a gol (4)
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

- ✘ exceção: keyboard.down: Target page, context or browser has been closed

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

- ✘ exceção: page.goto: Target page, context or browser has been closed

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
- ✘ exceção: touchscreen.tap: Target page, context or browser has been closed

Capturas de tela das suítes em `docs/qa/`.
