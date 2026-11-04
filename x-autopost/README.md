# x-autopost

Agente que publica automaticamente no X (Twitter). Uma tarefa agendada no Claude
Code roda tres vezes por dia (9h, 14h e 18h, horario de Brasilia), pesquisa
noticias do dia, escreve um post seguindo a pauta em `PAUTA.md`, publica e faz
commit do registro.

## Como funciona

1. A tarefa agendada abre uma sessao nova, le `PAUTA.md` e `postados.md`.
2. Se `fila.md` tiver algum post escrito por voce, ele tem prioridade:
   `python3 x-autopost/postar.py` publica o primeiro bloco e o remove da fila.
3. Senao, o agente pesquisa na web o tema do horario (economia e inflacao,
   integracao de sistemas, tempo e economia), escreve um post de ate 280
   caracteres com fonte e link, salva em um arquivo temporario e roda
   `python3 x-autopost/postar.py --arquivo <arquivo>`.
4. O script registra o texto em `postados.md` com data e id do tweet.
5. A tarefa faz commit e push, para a proxima execucao saber o que ja foi dito.

## Mudar os temas

Edite `PAUTA.md`. Ele define os temas por horario, as fontes preferidas e as
regras de estilo. A tarefa agendada le o arquivo a cada execucao, entao a
mudanca vale a partir do proximo post.

## Posts manuais (opcional)

Edite `fila.md` e faca push. Cada bloco e publicado antes do conteudo gerado. Exemplo:

```
Primeiro post, ate 280 caracteres. URLs contam como 23 caracteres.
---
Segundo post.
Pode ter mais de uma linha.
---
Terceiro post.
```

Para conferir a fila e a contagem de caracteres sem publicar:

```
python3 x-autopost/postar.py --listar
python3 x-autopost/postar.py --dry-run
```

## Credenciais do X

O script precisa de um app no X Developer Portal (https://developer.x.com) com
permissao **Read and Write** e as quatro chaves abaixo, definidas como segredos
do ambiente do Claude Code (menu do ambiente na barra de titulo da sessao, Editar,
secao de segredos de rede ou variaveis de ambiente):

| Variavel          | Onde pegar no Developer Portal            |
|-------------------|-------------------------------------------|
| `X_API_KEY`       | Consumer Keys, API Key                    |
| `X_API_SECRET`    | Consumer Keys, API Key Secret             |
| `X_ACCESS_TOKEN`  | Authentication Tokens, Access Token       |
| `X_ACCESS_SECRET` | Authentication Tokens, Access Token Secret|

Gere o Access Token **depois** de configurar a permissao Read and Write, senao
ele sai somente leitura. O plano Free da API do X permite publicar, com limite
mensal de posts. Tres posts por dia dao cerca de 90 por mes.

Sem as credenciais o script encerra avisando e nao publica nada.

## Protecao contra duplicidade

O script recusa publicar qualquer texto que ja conste em `postados.md`. Se uma
execucao publicou mas nao conseguiu fazer push, a proxima detecta o texto e nao
republica. Alem disso, o agente le `postados.md` antes de escrever, para nao
repetir assunto dos ultimos dias.

## Dependencias

Nenhuma. So Python 3.10 ou superior, biblioteca padrao.
