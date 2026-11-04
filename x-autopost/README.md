# x-autopost

Agente que publica automaticamente na conta **@rodrigohajime** no X (Twitter).
Uma tarefa agendada no Claude Code roda tres vezes por dia (9h, 14h e 18h,
horario de Brasilia), escreve um post sobre integracao de sistemas seguindo a
pauta em `PAUTA.md`, publica e faz commit do registro.

## Como funciona

1. A tarefa agendada abre uma sessao nova, le `PAUTA.md` e `postados.md`.
2. Se `fila.md` tiver algum post escrito por voce, ele tem prioridade:
   `python3 x-autopost/postar.py` publica o primeiro bloco e o remove da fila.
3. Senao, o agente escreve um post sobre integracao no formato do horario
   (dica pratica, opiniao, ou gancho com noticia do dia), de ate 280
   caracteres, com fonte e link quando citar dado, salva em um arquivo
   temporario e roda
   `python3 x-autopost/postar.py --arquivo <arquivo>`.
4. O script registra o texto em `postados.md` com data e id do tweet.
5. A tarefa faz commit e push, para a proxima execucao saber o que ja foi dito.

## Mudar os temas

Edite `PAUTA.md`. Ele define os formatos por horario, os assuntos, as fontes
preferidas e as regras de estilo. A tarefa agendada le o arquivo a cada execucao, entao a
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

O script publica como o dono do Access Token. Entre no X Developer Portal
(https://developer.x.com) **logado como @rodrigohajime**, crie um app com
permissao **Read and Write** e pegue as quatro chaves abaixo, definidas como segredos
do ambiente do Claude Code (menu do ambiente na barra de titulo da sessao, Editar,
secao de segredos de rede ou variaveis de ambiente):

| Variavel          | Onde pegar no Developer Portal            |
|-------------------|-------------------------------------------|
| `X_API_KEY`       | Consumer Keys, API Key                    |
| `X_API_SECRET`    | Consumer Keys, API Key Secret             |
| `X_ACCESS_TOKEN`  | Authentication Tokens, Access Token       |
| `X_ACCESS_SECRET` | Authentication Tokens, Access Token Secret|

Gere o Access Token **depois** de configurar a permissao Read and Write, senao
ele sai somente leitura.

### Passo a passo no portal

1. Entre em https://developer.x.com logado como @rodrigohajime e crie a conta
   de desenvolvedor (hoje o modelo e pay-per-use, com credito pre-pago).
2. No Developer Portal, em Projects & Apps, crie um Project e dentro dele um App.
3. No App, abra **User authentication settings** e clique em Set up / Edit:
   App permissions = **Read and write**; Type of App = Web App, Automated App
   or Bot; preencha Callback URI e Website URL (qualquer URL sua serve, por
   exemplo https://github.com/jaapa07/Claude). Salve.
4. Abra a aba **Keys and tokens**.
   - Em Consumer Keys, clique em Regenerate para API Key and Secret. Copie os
     dois: sao `X_API_KEY` e `X_API_SECRET`.
   - Em Authentication Tokens, clique em Generate / Regenerate em Access Token
     and Secret. Confira que aparece "Created with Read and Write permissions".
     Copie os dois: sao `X_ACCESS_TOKEN` e `X_ACCESS_SECRET`.
   Os segredos aparecem uma unica vez. Se perder, regenere.
5. Em Billing / Usage, deixe credito disponivel. Sem saldo o POST retorna erro.
6. Cadastre as quatro variaveis como segredos do ambiente do Claude Code e
   abra uma sessao nova (ou espere a proxima execucao da tarefa).

### Custo estimado

Na API pay-per-use, publicar um post custa cerca de US$ 0,015, e um post com
link custa cerca de US$ 0,20. Com 3 posts por dia, se um deles tiver link,
a conta fica perto de US$ 7 por mes. Sem links, abaixo de US$ 2. Confira os
valores atuais no Developer Console, eles mudam.

Sem as credenciais o script encerra avisando e nao publica nada.

## Protecao contra duplicidade

O script recusa publicar qualquer texto que ja conste em `postados.md`. Se uma
execucao publicou mas nao conseguiu fazer push, a proxima detecta o texto e nao
republica. Alem disso, o agente le `postados.md` antes de escrever, para nao
repetir assunto dos ultimos dias.

## Dependencias

Nenhuma. So Python 3.10 ou superior, biblioteca padrao.
