# Fila de posts para o X
# Um post por bloco, blocos separados por uma linha com `---`.
# O primeiro bloco e o proximo a ser publicado. Linhas com `#` sao ignoradas.
#
# Esta fila e opcional. O agente gera os posts sozinho seguindo PAUTA.md.
# Se houver algum bloco aqui, ele tem prioridade e e publicado antes do conteudo gerado.

Toda integração que eu já vi quebrar em produção quebrou por um motivo que ninguém monitorava: o sistema do outro lado mudou o contrato sem avisar. Versionar API é barato. Descobrir no sábado que o campo virou string é caro.
---
Dica de integração: antes de tratar a mensagem, grave ela crua. Fila, arquivo, tabela, tanto faz. Quando o parser falhar às 3h da manhã, você vai querer o payload original, não o log dizendo "erro na linha 1".
---
XML de NF-e com caractere inválido no meio da tag não é exceção, é rotina. Quem integra com SEFAZ aprende rápido: validar contra o XSD antes de enviar economiza horas de retrabalho e evita rejeição boba.
