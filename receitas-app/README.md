# Receitas Virais

App de receitas para iOS e Android (Expo / React Native) em que cada receita traz o vídeo
viral original do **TikTok** ou do **Instagram**, junto com ingredientes e modo de preparo.

## O que o app faz

- **Em alta**: feed ordenado com as receitas que têm vídeo primeiro e, entre elas, as mais
  vistas. Busca sem acento (nome, autor ou ingrediente) e filtros por rede e por categoria.
- **Adicionar vídeo**: o usuário cola o link de um vídeo do TikTok ou de um Reel do Instagram.
  - No TikTok, o app chama o **oEmbed oficial** (público, sem chave) e traz a legenda, o
    criador e a miniatura. Links curtos (`vm.tiktok.com/…`) também funcionam.
  - **Extrair receita da legenda**: um parser lê a legenda e separa título, ingredientes,
    modo de preparo e categoria. O usuário revisa antes de salvar.
- **Receita**: o vídeo toca no **player oficial** da rede, dentro do app, com crédito e link
  para o criador. Abaixo vêm os ingredientes e os passos, que dá para ir marcando como
  feitos enquanto cozinha. Também é possível compartilhar a receita em texto ou excluí-la.
- **Favoritas**: receitas salvas com ❤️, guardadas no aparelho com AsyncStorage.

O app abre com 6 receitas de exemplo, sem vídeo, para não começar vazio.

## Por que o app não baixa vídeos do TikTok e do Instagram automaticamente

Os termos de uso das duas redes proíbem raspar o site (scraping) e baixar ou re-hospedar
vídeos, e os vídeos têm direitos autorais dos criadores. Por isso o app:

1. guarda **só o link** e exibe o vídeo pelo **player oficial embutível**, de modo que a
   visualização conta para o criador e o vídeo some do app se o criador apagar o original;
2. usa apenas os **endpoints oficiais de oEmbed**.

Para descobrir vídeos virais automaticamente, os caminhos permitidos são estes:

| Caminho | O que exige |
| --- | --- |
| Curadoria (equipe ou usuários colam links), que é o que o app faz hoje | Nada |
| Instagram Graph API: *hashtag search* (`top_media` de `#receitas`) | App aprovado pela Meta e conta Business |
| TikTok: parcerias com criadores ou *Content Posting/Display API* com autorização de cada criador | Aprovação do TikTok e consentimento do criador |
| TikTok Research API | Restrita a pesquisa acadêmica, não serve para app comercial |

## Rodar

```bash
npm install
npx expo start        # escaneie o QR code com o app Expo Go (iOS/Android)
npx expo start --web  # versão web, no navegador
```

Checagens:

```bash
npm run typecheck     # TypeScript
npm test              # testes do parser de links, oEmbed, legenda e ranking
```

### Instagram com dados automáticos (opcional)

Sem configuração, o app reconhece links do Instagram e toca o Reel, mas a legenda precisa
ser colada à mão. Para preenchê-la automaticamente, crie um app na Meta com o produto
*oEmbed Read* e defina a variável abaixo (por exemplo, num arquivo `.env`):

```
EXPO_PUBLIC_META_OEMBED_TOKEN=<app-id>|<client-token>
```

> Variáveis `EXPO_PUBLIC_*` vão para dentro do app. Use um *client token*, nunca o
> *app secret*. Em produção, o ideal é fazer essa chamada a partir de um back-end.

## Publicar nas lojas

Com o EAS da Expo, não é preciso ter Mac para compilar:

```bash
npx eas-cli@latest build --platform all     # gera os binários iOS e Android na nuvem
npx eas-cli@latest submit --platform ios    # envia para a App Store Connect
```

Requisitos: conta Apple Developer (US$ 99/ano) e conta Google Play Console (US$ 25, pagamento
único). Antes de publicar, troque o `bundleIdentifier` e o `package` em `app.json`
(hoje `com.receitasvirais.app`) por um domínio seu, e substitua os ícones em `assets/`.

## Estrutura

```
src/
  app/                    telas (Expo Router)
    (tabs)/index.tsx      feed "Em alta" com busca e filtros
    (tabs)/favoritas.tsx  favoritas
    receita/[id].tsx      vídeo, ingredientes e passo a passo
    adicionar.tsx         colar link, extrair receita da legenda e salvar
  components/             RecipeCard, Chip e VideoEmbed (WebView no celular, iframe na web)
  lib/
    social.ts             reconhece links, monta a URL do player e chama o oEmbed
    caption.ts            transforma a legenda em ingredientes e passos
    ranking.ts            ordenação, busca e formatação de visualizações
    store.tsx             estado e persistência (AsyncStorage)
    seed.ts               receitas de exemplo
```

## Próximos passos sugeridos

- **Back-end compartilhado** (por exemplo Supabase ou Firebase): hoje cada aparelho tem a
  própria lista. Com um back-end, uma curadoria central alimenta o feed "Em alta" de todos.
- **Extração da receita com IA**: legendas bagunçadas ficam bem melhores com um modelo de
  linguagem chamado pelo back-end.
- **Lista de compras** gerada a partir dos ingredientes das receitas favoritas.
- **Compartilhar para o app**: receber um link direto do botão "Compartilhar" do
  TikTok/Instagram, o que exige um *development build* com share extension.
