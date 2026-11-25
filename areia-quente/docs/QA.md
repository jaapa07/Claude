# QA ponta a ponta

Executado em 2026-11-25 21:13 UTC com `node scripts/qa/run.cjs` (Chromium headless, build de produção).

**1/2 suítes OK.** O monitor de invariantes roda a cada quadro em todas as suítes (bola/jogadores com posição válida e dentro do mundo,
bola perto do dono, controle duplicado, time humano sem jogador, estados presos, bola morta sem ninguém ir buscar).

| Suíte | Resultado | Tempo |
|---|---|---|
| career | ✔ OK | 142s |
| menus | ✘ FALHOU | 53s |

## career

- ✔ carreira criada (POR, 8 times, 7 rodadas)
- ✔ tabela da liga com 8 seleções
- ✔ partida da carreira usa a seleção do jogador
- ✔ rodada 1 registrada e pontos de evolução ganhos (3 → 9)
- ✔ vitória vale 3 pontos na tabela (1 Portugal11004133)
- ✔ evolução gasta 1 ponto e melhora o atributo ({"POR0":{"chute":1}})
- ✔ temporada concluída e registrada no histórico (1º)
- ✔ segunda temporada começa
- ✔ histórico lista a temporada

## menus

- ✔ ENTER no título abre o menu
- ✘ exceção: elementHandle.dblclick: Timeout 30000ms exceeded.

Capturas de tela das suítes em `docs/qa/`.
