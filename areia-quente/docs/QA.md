# QA ponta a ponta

Executado em 2026-11-25 20:23 UTC com `node scripts/qa/run.cjs` (Chromium headless, build de produção).

**1/2 suítes OK.** O monitor de invariantes roda a cada quadro em todas as suítes (bola/jogadores com posição válida e dentro do mundo,
bola perto do dono, controle duplicado, time humano sem jogador, estados presos, bola morta sem ninguém ir buscar).

| Suíte | Resultado | Tempo |
|---|---|---|
| menus | ✘ FALHOU | 236s |
| options | ✔ OK | 44s |

## menus

- ✔ ENTER no título abre o menu
- ✔ menu com 7 opções (Amistoso | Copa Areia Quente | Treino | Desafios da Praia | Conquistas (0/18) | Opções | Créditos)
- ✔ opção 1 → ctrl
- ✔   ESC volta ao menu
- ✔ opção 2 → teams
- ✔   ESC volta ao menu
- ✔ opção 3 → teams
- ✔   ESC volta ao menu
- ✔ opção 4 → challenges
- ✔   ESC volta ao menu
- ✔ opção 5 → achievements
- ✔   ESC volta ao menu
- ✘ opção 6 deveria abrir options (está em achievements)
- ✔   ESC volta ao menu
- ✔ opção 7 → credits
- ✔   ESC volta ao menu

## options

- ✔ volume da música alterado e salvo (0.7 → 0.5)
- ✔ tecla de passe remapeada para U (KeyU)
- ✔ opções persistem após recarregar a página
- ✔ saída de bola com a tecla remapeada (U)

Capturas de tela das suítes em `docs/qa/`.
