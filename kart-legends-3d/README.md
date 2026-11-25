# KART LEGENDS 3D

Jogo original de corrida de kart arcade 3D para navegador (desktop), em português do Brasil.
React + TypeScript + Vite + Zustand, Three.js / React Three Fiber / Drei, física Rapier (`@react-three/rapier`),
Web Audio API. Catorze pilotos, oito karts, doze pistas em três copas, sete adversários com IA, seis itens,
drift com três níveis de miniturbo, quatro modos de jogo e progressão salva no navegador.

> **Estado da entrega: PARCIAL** segundo os critérios da seção 27 da especificação. O jogo roda, é jogável do
> começo ao fim e os testes passam, mas há requisitos que não foram atendidos ao pé da letra (assets modelados
> por script e não por artistas em ferramenta 3D, sem medição de FPS em GPU real, entre outros).
> O detalhe está em [`QA_REPORT.md`](QA_REPORT.md), seção "O que falta".

## Instalação e execução

Requisitos: Node.js 22+ e npm. Não há chaves, contas nem serviços externos: tudo roda localmente.

```bash
npm install
```

```bash
npm run dev
```

Abra o endereço mostrado (padrão `http://localhost:5173`). Para jogar a build de produção:

```bash
npm run build
```

```bash
npm run preview
```

(`http://localhost:4173`). A pasta `dist/` gerada pelo build é a versão jogável: pode ser servida por qualquer
servidor de arquivos estáticos.

## Controles

| Ação | Teclado | Gamepad |
|---|---|---|
| Acelerar | W / ↑ | A / RT |
| Frear / ré | S / ↓ | B / LT |
| Virar | A D / ← → | alavanca esquerda / direcional |
| Drift (segure e solte para o miniturbo) | Espaço | X / RB |
| Usar item | Shift | Y / LB |
| Recuperar o kart | R | Back |
| Pausar | Esc | Start |

Tudo é remapeável em **Configurações**, onde também ficam a sensibilidade da direção, os volumes
(música, efeitos, ambiente) e a qualidade gráfica (Baixa, Média, Alta).

## Personalização

- **Roupas:** na escolha do piloto, 6 roupas para cada um (Clássico, Tropical, Oceano, Noturno, Neve e Ouro).
- **Oficina:** na escolha do kart, aba **Oficina** com pintura (12 cores, incluindo preto, branco e dourado),
  metais e rodas (cromado, grafite, cobre, ouro), cor da chama do turbo e neon embaixo do kart.
- As opções básicas são grátis; as outras (roupas especiais, pintura preta/branca/dourada, metais cobre/ouro,
  chamas e neons extras) são vendidas na **Loja**, aba **Adereços**. A escolha fica salva e aparece na corrida e no pódio.

## Loja e moedas

- Moedas por corrida (pela posição, mais na dificuldade Normal/Difícil), bônus de troféu ao fim de cada copa e
  moedas no Contrarrelógio. O saldo aparece no menu.
- **Loja** (menu principal): pilotos e karts bloqueados podem ser comprados antes de liberar jogando; **Yuki, Kaito,
  Ren e Sora** são exclusivos da loja (4.000 a 5.000 moedas). Abas **Pneus** (modelos de roda para qualquer kart)
  e **Adereços**. Preços e ganhos em `src/data/shop.ts`.

## Celular (iPhone / Android)

Em telas de toque aparecem controles na tela e, por padrão, o kart **acelera sozinho**. Para acelerar
manualmente, escolha **Manual** em "Aceleração no toque" — no menu de pausa (botão ❚❚) ou em Configurações:
aparece o botão **Acelerar** no canto direito; deslize o polegar dele para **Drift** sem levantar (segurar Drift também acelera).


| Ação | Toque |
|---|---|
| Virar | arraste o polegar para os lados na metade esquerda da tela |
| Drift (segure e solte para o miniturbo) | botão **Drift** |
| Usar item | botão **Item** |
| Frear / ré | botão **Freio** |
| Recuperar o kart | botão **↺** |
| Pausar | botão **❚❚** no topo |

Jogue com o celular na horizontal; a qualidade gráfica começa em **Baixa**. Para abrir no celular, rode
`npm run dev -- --host` no computador e acesse o endereço "Network" mostrado no terminal, com o celular
no mesmo Wi‑Fi, ou publique a pasta `dist/` em qualquer hospedagem estática (GitHub Pages, Netlify, Vercel).

## Modos

- **Corrida Rápida** — escolha pista e dificuldade, 8 pilotos na pista (você e 7 adversários sorteados entre os outros 13), 3 voltas.
- **Campeonato** — as 4 pistas de uma copa com pontuação acumulada e troféu.
- **Contrarrelógio** — sozinho, sem itens, em busca do melhor tempo.
- **Treino** — pista livre, sem adversários; sai pelo menu de pausa.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | verificação de tipos + build de produção em `dist/` |
| `npm run preview` | serve a build de produção |
| `npm run typecheck` | TypeScript strict (jogo e scripts) |
| `npm run lint` | ESLint |
| `npm run test` | testes unitários e de simulação (Vitest) |
| `npm run test:e2e` | testes de ponta a ponta na build de produção (Playwright) |
| `npm run validate:assets` | valida manifesto, modelos, texturas, áudio, referências e licenças |
| `npm run assets` | reconstrói todos os assets a partir dos scripts de autoria |

## Documentação

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arquitetura e fluxo de dados
- [`docs/ASSET_PIPELINE.md`](docs/ASSET_PIPELINE.md) — como os modelos são criados
- [`docs/AUDIO.md`](docs/AUDIO.md) — como o áudio é gerado
- [`ASSET_MANIFEST.md`](ASSET_MANIFEST.md) e `public/assets/manifest.json` — todos os recursos
- [`LICENSES.md`](LICENSES.md) — licenças de assets e bibliotecas
- [`QA_REPORT.md`](QA_REPORT.md) — testes executados, funcionalidades, problemas conhecidos e o que falta
- `docs/screenshots/` — capturas reais do jogo rodando
