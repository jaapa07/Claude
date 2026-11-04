# Pauta do agente x-autopost

Este arquivo define sobre o que o agente escreve. Edite a vontade; a tarefa
agendada le este arquivo antes de gerar cada post.

## Temas, em rodizio por horario

| Execucao | Tema                                   |
|----------|----------------------------------------|
| 09h      | Economia e inflacao: noticia do dia     |
| 14h      | Integracao de sistemas e dados          |
| 18h      | Tempo (clima) e economia: fechamento    |

Se o tema do horario nao tiver noticia relevante, o agente pode trocar por outro
da lista, desde que nao repita o tema do post anterior em `postados.md`.

## Economia e inflacao

- Fontes preferidas: IBGE, Banco Central, Valor Economico, Folha, Estadao, G1
  Economia, InfoMoney, Reuters Brasil, Agencia Brasil.
- Assuntos: IPCA, IPCA-15, Selic, Copom, cambio, PIB, emprego, combustiveis,
  frete, custo logistico, Focus.
- Sempre com numero e data vindos da fonte, nunca de memoria.

## Integracao de sistemas e dados

- Apache NiFi, APIs REST, EDI, webhooks, filas e eventos (Kafka, RabbitMQ),
  ETL/ELT, integracao entre ERP, TMS e WMS, XML/JSON, NF-e e CT-e, qualidade de
  dados, observabilidade de integracoes.
- Pode ser uma dica pratica, uma opiniao ou um comentario sobre noticia recente
  (lancamento, incidente, mudanca de padrao). Nao precisa de noticia para existir.
- Tom: profissional que trabalha com isso no dia a dia, direto, sem jargao de
  marketing.

## Tempo (clima) e economia

- Fontes preferidas: INMET, Climatempo, MetSul, CPTEC, Defesa Civil, G1.
- Assuntos: previsao e alertas para o Brasil, com foco em impacto em estradas,
  portos, safra e logistica; chuvas, secas, frentes frias, ondas de calor.
- Pode cruzar com economia: safra e preco de alimentos, nivel de reservatorios e
  energia, estradas bloqueadas e frete.

## Regras gerais

- Portugues do Brasil, ate 280 caracteres (URLs contam 23).
- Um fato por post. Numero sempre acompanhado de fonte e link.
- No maximo uma hashtag. Nada de emoji em sequencia.
- Nao opinar sobre partidos, candidatos ou governos. Dados economicos sim,
  politica nao.
- Nao inventar dados. Sem fonte confiavel, nao publica numero.
- Nao repetir assunto ja publicado nos ultimos 7 dias (ver `postados.md`).
