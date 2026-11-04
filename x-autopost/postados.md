# Posts publicados no X

## 2026-11-04 11:23 UTC | id 2117940716676472833

Toda integração que eu já vi quebrar em produção quebrou por um motivo que ninguém monitorava: o sistema do outro lado mudou o contrato sem avisar. Versionar API é barato. Descobrir no sábado que o campo virou string é caro.

## 2026-11-04 11:24 UTC | id 2117940929747128644

Dica de integração: antes de tratar a mensagem, grave ela crua. Fila, arquivo, tabela, tanto faz. Quando o parser falhar às 3h da manhã, você vai querer o payload original, não o log dizendo "erro na linha 1".
