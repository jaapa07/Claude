# QA ponta a ponta

Executado em 2026-11-25 20:40 UTC com `node scripts/qa/run.cjs` (Chromium headless, build de produção).

**3/7 suítes OK.** O monitor de invariantes roda a cada quadro em todas as suítes (bola/jogadores com posição válida e dentro do mundo,
bola perto do dono, controle duplicado, time humano sem jogador, estados presos, bola morta sem ninguém ir buscar).

| Suíte | Resultado | Tempo |
|---|---|---|
| achievements | ✔ OK | 78s |
| memory | ✔ OK | 105s |
| mobile | ✘ FALHOU | 63s |
| cup | ✔ OK | 311s |
| pens | ✘ FALHOU | 114s |
| arenas | ✘ FALHOU | 0s |
| fullmatch | ✘ FALHOU | 335s |

## achievements

- ✔ tela lista 18 conquistas, 5 desbloqueadas (18,5)
- ✔ bola dourada liberada com 5 conquistas e selecionada (dourada)
- ✔ bola neon bloqueada não é selecionada (dourada)
- ✔ partida usa a bola dourada

## memory

- ✔ sem acúmulo de objetos dinâmicos entre partidas (131,131,131)
- ✔ cena não cresce entre trocas de arena (448,448,448)

## mobile

- ✔ menu sem rolagem horizontal em 390 px
- ✘ placar cabe na tela do celular

## cup

- ✔ copa criada com chaveamento
- ✔ progresso da copa salvo após recarregar ("Continuar Copa")
- ✔ vencer a final leva à cena do troféu
- ✔ conquista "Campeão da Copa" desbloqueada

## pens

- ✘ exceção: page.evaluate: Target page, context or browser has been closed

## arenas

- ✘ exceção: browserType.launch: Target page, context or browser has been closed

## fullmatch

- ✘ exceção: page.evaluate: Target page, context or browser has been closed

Capturas de tela das suítes em `docs/qa/`.
