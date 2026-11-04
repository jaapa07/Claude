# x-autopost

Agente que publica automaticamente no X (Twitter) a partir de uma fila de posts
escrita por voce. Uma tarefa agendada no Claude Code roda o script uma vez por dia,
publica o primeiro post da fila e faz commit do resultado.

## Como funciona

1. Voce escreve os posts em `fila.md`, um por bloco, separados por `---`.
2. Todo dia a tarefa agendada roda `python3 x-autopost/postar.py`.
3. O script publica o primeiro bloco, move o texto para `postados.md` com data e
   id do tweet, e remove o bloco da fila.
4. A tarefa faz commit e push das mudancas, para o dia seguinte continuar de onde parou.
5. Fila vazia: nada e publicado.

## Adicionar posts

Edite `fila.md` e faca push. Exemplo:

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
mensal de posts.

Sem as credenciais o script encerra avisando e nao publica nada.

## Protecao contra duplicidade

Se uma execucao publicou mas nao conseguiu salvar a fila (por exemplo, falha no
push), a proxima execucao detecta o texto em `postados.md`, remove da fila e
nao republica.

## Dependencias

Nenhuma. So Python 3.10 ou superior, biblioteca padrao.
