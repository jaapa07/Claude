# 🔥 Receita Viral

Plataforma gastronômica com receitas populares, tendências das redes sociais e pratos de várias culturas. Tem busca por ingredientes, assistente **Chef IA**, planejador semanal com lista de compras automática, área do usuário e painel administrativo.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · componentes no estilo shadcn/ui (Radix) · PostgreSQL · Prisma 6 · Zod · JWT (jose) + bcrypt · Vitest · PWA.

---

## Sumário

- [Funcionalidades](#funcionalidades)
- [Como rodar](#como-rodar)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Contas de demonstração](#contas-de-demonstração)
- [Testes](#testes)
- [Arquitetura](#arquitetura)
- [API REST](#api-rest)
- [Chef IA](#chef-ia)
- [Fontes externas e direitos autorais](#fontes-externas-e-direitos-autorais)
- [Imagens e vídeos](#imagens-e-vídeos)
- [Segurança](#segurança)
- [Deploy](#deploy)
- [Limitações conhecidas](#limitações-conhecidas)

---

## Funcionalidades

| Área | O que tem |
|---|---|
| **Home** | Receita viral do dia, Em alta, Bombando no TikTok, mais pesquisadas, prontas em até 15 min, sugestões personalizadas, econômicas, internacionais, Top 10 e "Você precisa experimentar" |
| **Categorias** | 9 culinárias e 15 tipos de prato, cada um com página própria, filtros e ordenação (`/categorias/[slug]`, `/explorar`) |
| **Receita** | Foto ou ilustração, vídeo incorporado (YouTube, TikTok, Instagram, Vimeo ou MP4), tempos, porções, dificuldade, calorias, custo, ingredientes que se ajustam às porções, medidas caseiras ↔ métricas, passo a passo com temporizadores, dicas, substituições, tabela nutricional, avaliações por estrelas, comentários, compartilhamento (WhatsApp, Facebook, X, Pinterest, Telegram, link), impressão, favoritos, coleções, planejador, lista de compras, "Já preparei", JSON-LD de SEO |
| **Modo Cozinha** | Tela cheia com letra grande ajustável, navegação por botões, teclado ou gesto de deslizar, checklist de ingredientes, temporizadores e tela sempre ligada (Wake Lock) |
| **Receitas Virais** | Ranking, filtros por plataforma, período, tipo de prato e ordenação, vídeos incorporados de criadores, links para o criador e a publicação, selo "Origem verificada" |
| **Busca inteligente** | Por nome, por "o que tenho em casa" (com autocompletar, mostrando o que tem e o que falta), tempo, dificuldade, calorias, culinária, categoria, custo e exclusão por alergias/preferências |
| **Chef IA** | Chat com receitas estruturadas, ingredientes faltantes, cardápio semanal (que vai direto para o planejador) e adaptação de porções |
| **Usuário** | Cadastro e login, favoritos, coleções, avaliações, comentários, publicação de receitas próprias (passam por moderação), receitas preparadas, histórico, notificações e preferências alimentares/alergias |
| **Planejador** | Semana × café da manhã, almoço, lanche e jantar; porções por refeição; copiar semana; gera lista de compras consolidada por categoria |
| **Listas de compras** | Itens agrupados, marcar/desmarcar, itens manuais, limpar marcados, compartilhar por WhatsApp, imprimir |
| **Admin** | Dashboard com estatísticas; CRUD de receitas, categorias, tendências virais e fontes externas; upload de imagens e vídeos; moderação de comentários e de receitas enviadas; gestão de usuários; destaques; importação autorizada |
| **Extras** | Modo claro/escuro, PWA instalável (manifest, service worker, página offline), conversor de medidas (`/conversor`), temporizadores globais com som, vibração e notificação, sitemap e robots, estados de carregamento, erro e vazio |

---

## Como rodar

**Pré-requisitos:** Node.js 20 ou mais recente e PostgreSQL 14 ou mais recente.

```bash
cd receita-viral
npm install                       # também roda `prisma generate`
cp .env.example .env              # edite DATABASE_URL e AUTH_SECRET

# Banco
createdb receita_viral            # ou crie pelo seu cliente PostgreSQL
npm run db:deploy                 # aplica as migrations
npm run db:seed                   # 77 receitas, 24 categorias e contas de demonstração

npm run dev                       # http://localhost:3000
```

Para produção:

```bash
npm run build && npm start
```

<details>
<summary>PostgreSQL com Docker</summary>

```bash
docker run -d --name receita-pg -p 5432:5432 \
  -e POSTGRES_USER=receita -e POSTGRES_PASSWORD=receita -e POSTGRES_DB=receita_viral postgres:16
```
</details>

O seed é idempotente: roda de novo e atualiza as receitas pelo `slug`.

---

## Variáveis de ambiente

Veja `.env.example`.

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ | Conexão PostgreSQL |
| `AUTH_SECRET` | ✅ | Segredo da sessão (mínimo de 32 caracteres; gere com `openssl rand -base64 48`) |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL pública, usada em SEO, sitemap e links de compartilhamento |
| `ANTHROPIC_API_KEY` | — | Ativa a IA generativa no Chef IA. Fica **só no servidor** |
| `CHEF_AI_MODEL` | — | Modelo usado pelo Chef IA (padrão `claude-opus-5-5`) |
| `UPLOAD_DIR` | — | Pasta de uploads (padrão `./uploads`) |
| `UPLOAD_MAX_MB` | — | Limite por imagem (padrão 5 MB; vídeos podem ter 6× esse valor) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | — | Administrador criado pelo seed |
| `TEST_DATABASE_URL` | — | Banco usado pelos testes (padrão `receita_viral_test`) |

---

## Contas de demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| Administrador | `admin@receitaviral.local` | valor de `SEED_ADMIN_PASSWORD` (padrão `Admin@12345`) |
| Usuário | `demo@receitaviral.local` | `Demo@12345` |

> Troque essas senhas, ou remova as contas, antes de qualquer deploy público.

---

## Testes

```bash
createdb receita_viral_test     # banco separado, uma única vez
npm test
```

São 58 testes, em dois grupos:

- **Unitários:** escalonamento de porções, frações, conversão de medidas, busca por ingredientes e exclusão por alergias, consolidação da lista de compras, importador JSON-LD (inclusive a regra de *não* copiar o modo de preparo), proteção SSRF, URLs de embed, validações, JWT (rejeição de token adulterado), bcrypt e detecção de intenção do Chef IA.
- **Integração:** chamam os *route handlers* reais contra o banco de teste. Cobrem cadastro e login (cookie httpOnly, duplicidade, conta bloqueada), busca e filtros, rascunhos invisíveis, favoritos, avaliações, comentários com moderação de links, contagem de visualizações com limite, permissões (401, 403 e 404 entre usuários), coleções, planejador até a lista de compras consolidada e escalonada, e o Chef IA em modo local.

O `globalSetup` aplica as migrations no banco de teste com `prisma migrate deploy`, e cada teste limpa as tabelas com `TRUNCATE`. **Nunca** aponte `TEST_DATABASE_URL` para um banco com dados reais.

Outros comandos: `npm run typecheck` e `npm run lint`.

---

## Arquitetura

```
prisma/
  schema.prisma          modelo de dados (usuários, receitas, ingredientes, etapas, categorias,
                         avaliações, favoritos, comentários, coleções, cardápios, listas,
                         tendências virais, fontes externas, notificações, buscas)
  migrations/            migrations SQL
  seed.ts, seed-data/    77 receitas de demonstração + categorias
src/
  middleware.ts          proteção de rotas + verificação de origem (CSRF) na API
  lib/
    api.ts               route(), parseBody(), requireUser()/requireAdmin(), erros padronizados
    auth/                JWT (jose), bcrypt, sessão para Server Components e Route Handlers
    recipes.ts           consultas: listagem com filtros, detalhe, seções da home, popularidade
    recipe-write.ts      criar/atualizar receitas (transação), notificações de novas receitas
    search.ts            correspondência de ingredientes, alergênicos, texto de busca normalizado
    units.ts             porções, frações, conversões de volume/massa/temperatura
    shopping.ts          consolidação da lista de compras
    importer.ts          importação schema.org/Recipe de fontes autorizadas
    embed.ts             URLs oficiais de incorporação de vídeo
    storage.ts           uploads com verificação do tipo real do arquivo
    chef/                Chef IA: provedor externo + modo local + detecção de intenção
  app/                   páginas (App Router) e API REST em app/api/**
  components/            UI (estilo shadcn/ui), layout, receita, busca, formulário de receita
tests/                   Vitest (unitários + integração)
```

**Padrões:**

- Leituras acontecem em Server Components, direto no Prisma.
- Mutações passam pela API REST, validadas com Zod.
- O usuário da sessão é sempre recarregado do banco, então bloqueio e mudança de papel valem na hora.
- O admin é checado no middleware, no layout `/admin` e em cada endpoint.

**Popularidade honesta:** "Em alta", "Top 10" e o ranking das virais usam **apenas métricas do próprio app**: visualizações (no máximo uma a cada 30 min por usuário ou IP), favoritos e avaliações. Nada é inventado.

---

## API REST

Todas as rotas respondem JSON. Erros seguem o formato `{ error, details? }`, com status 401, 403, 404, 409, 422 ou 429.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/auth/register` · `/api/auth/login` · `/api/auth/logout` | Sessão (cookie httpOnly) |
| GET | `/api/auth/me` | Usuário atual |
| GET | `/api/recipes` | Lista com filtros: `q, have, exclude, maxTime, difficulty, maxCalories, category, cost, platform, viral, sort, page, pageSize` |
| POST | `/api/recipes` | Usuário envia receita (entra "Em revisão") |
| GET/PUT/DELETE | `/api/recipes/[id ou slug]` | Detalhe; edição e exclusão pelo autor |
| POST/DELETE | `/api/recipes/[id]/favorite` | Favoritar |
| PUT | `/api/recipes/[id]/rating` | Avaliar (1–5) |
| GET/POST | `/api/recipes/[id]/comments` | Comentários |
| POST | `/api/recipes/[id]/view` · `/cooked` | Visualização e "já preparei" |
| GET | `/api/ingredients?q=` | Autocompletar ingredientes |
| GET/POST | `/api/collections` · `/api/collections/[id]` · `/items` | Coleções |
| GET/PUT | `/api/me/profile` · PUT `/api/me/password` | Perfil, preferências e senha |
| GET | `/api/me/favorites` · `/history` · `/cooked` · `/notifications` | Dados do usuário |
| GET/POST/PATCH/DELETE | `/api/mealplan` · `/entries` · `/copy` · `/shopping-list` | Planejador |
| GET/POST/PUT/PATCH/DELETE | `/api/shopping/**` · POST `/api/shopping/from-recipe` | Listas de compras |
| GET/POST | `/api/chef` | Status e conversa com o Chef IA |
| POST | `/api/uploads` · GET `/api/uploads/**` | Upload e entrega de arquivos |
| — | `/api/admin/{stats,recipes,categories,comments,users,viral,sources,import}` | Painel administrativo (somente ADMIN) |

---

## Chef IA

- **Com `ANTHROPIC_API_KEY`:** usa o SDK oficial `@anthropic-ai/sdk` no servidor com saída estruturada (schema Zod), *fallback* do lado do servidor em caso de recusa e o catálogo do app como contexto. Assim o assistente indica receitas reais, com link. Slugs inventados pelo modelo são descartados, e alergias do perfil entram no pedido.
- **Sem chave, ou se o provedor falhar:** responde no **modo local**, com detecção de intenção e o catálogo real. Cobre ingredientes disponíveis, culinária, categoria, jantar a dois, receitas econômicas, adaptação de porções e cardápio semanal. A interface mostra qual modo está ativo.
- **Limite de uso:** 15 mensagens por hora para visitantes e 40 para usuários logados.

---

## Fontes externas e direitos autorais

- Em **Admin → Fontes e integrações** você cadastra a fonte, a licença e os termos. A importação só funciona se `allowImport` estiver ligado.
- O importador lê `schema.org/Recipe` (JSON-LD) **somente** de URLs do domínio da fonte. Hosts internos são bloqueados (SSRF), e há limite de 2 MB e timeout de 10 s.
- O que é importado: título, tempos, porções e ingredientes (fatos), além da **URL original e dos créditos**. O **modo de preparo não é copiado**: a receita entra como **rascunho**, com uma etapa que pede reescrita editorial antes de publicar.
- Chaves de API de integrações ficam em variáveis de ambiente. O banco guarda só o **nome** da variável, e o painel mostra apenas "configurada" ou "ausente".
- Não há scraping genérico.

### Tendências virais

Os dados de tendência do seed descrevem só a plataforma e o ano, com texto cauteloso, e saem marcados como **não verificados**. Não há números de visualizações nem links de criadores não conferidos. Para marcar uma tendência como verificada, o admin precisa informar o link do criador e o da publicação. O vídeo incorporado só aparece com URL oficial de embed.

---

## Imagens e vídeos

- As receitas de demonstração usam **ilustrações geradas no próprio app** (gradiente com o emoji do prato), sem depender de bancos de imagem externos. Para usar fotos reais, envie em **Admin → Receitas → editar** (upload) ou informe a URL de uma imagem **licenciada**.
- Os uploads são verificados pelo conteúdo real do arquivo (JPG, PNG, WEBP, GIF; MP4 só para admin) e salvos em `UPLOAD_DIR`, com entrega em `/api/uploads/...`. Em produção com várias instâncias, troque `src/lib/storage.ts` por S3, R2 ou outro storage de objetos.

---

## Segurança

- Senhas com bcrypt (custo 11) e tempo de resposta equalizado no login.
- Sessão em JWT HS256 dentro de cookie `httpOnly` + `SameSite=Lax` (`Secure` em produção), com validade de 7 dias.
- Verificação de `Origin` em toda requisição da API que altera dados (CSRF).
- Limite de requisições em login, cadastro, comentários, uploads, Chef IA e visualizações. A implementação é em memória; com várias instâncias, use Redis.
- Validação com Zod em todas as entradas e checagem de dono em todos os recursos (o acesso de um usuário a recursos de outro retorna 404).
- Uploads com *sniffing* de tipo, proteção contra *path traversal* e `nosniff` + CSP nas respostas.
- Cabeçalhos de segurança configurados em `next.config.ts`. O JSON-LD é escapado.

---

## Deploy

1. Provisione o PostgreSQL e configure as variáveis, com um `AUTH_SECRET` forte.
2. Rode `npm ci && npm run db:deploy && npm run build`. Rode o seed (`npm run db:seed`) só se quiser os dados de demonstração.
3. Inicie com `npm start`, atrás de HTTPS. O PWA e os cookies `Secure` exigem HTTPS.
4. Os uploads precisam de disco persistente ou de um storage de objetos (veja acima).

---

## Limitações conhecidas

- O rate limit é em memória (por instância).
- As notificações são internas do app (sino, com atualização a cada 60 s). Push nativo ainda não foi implementado.
- As fotos das receitas de demonstração são ilustrações; substitua por fotos próprias ou licenciadas.
- Nenhuma tendência viral do seed tem criador verificado nem vídeo: cadastre os links pelo painel após conferir a origem.
