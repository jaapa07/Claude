# Posts publicados no X

## 2026-11-04 11:23 UTC | id 2117940716676472833

Toda integração que eu já vi quebrar em produção quebrou por um motivo que ninguém monitorava: o sistema do outro lado mudou o contrato sem avisar. Versionar API é barato. Descobrir no sábado que o campo virou string é caro.

## 2026-11-04 11:24 UTC | id 2117940929747128644

Dica de integração: antes de tratar a mensagem, grave ela crua. Fila, arquivo, tabela, tanto faz. Quando o parser falhar às 3h da manhã, você vai querer o payload original, não o log dizendo "erro na linha 1".

## 2026-11-05 00:33 UTC | id 2118139447027851677

XML de NF-e com caractere inválido no meio da tag não é exceção, é rotina. Quem integra com SEFAZ aprende rápido: validar contra o XSD antes de enviar economiza horas de retrabalho e evita rejeição boba.

## 2026-11-05 00:34 UTC | id 2118139693476860361

Lição de integração: retry sem idempotência não é resiliência, é duplicidade com atraso. O timeout escondeu um sucesso e o job rodou de novo. Hoje eu só ligo retry depois de definir a chave de deduplicação. Qual chave você usa no seu fluxo?
