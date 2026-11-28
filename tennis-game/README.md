# GRAND SLAM ARCADE — Circuito de Ouro

Jogo de tênis arcade 3D original, feito a partir do `tennis-game-spec/GAME_SPEC.md`.
Three.js (WebGL) para a cena 3D, interface 100% HTML/CSS, assets reais (modelos, animações, texturas, HDRIs, sons e música).

**Jogar online:** https://jaapa07.github.io/grand_slam/ (publicado pelo GitHub Pages a cada push no `main`).

## Rodar

```bash
npm install
npm run dev          # http://localhost:5173
```

Os assets otimizados já estão em `public/assets/`. Para baixá-los e gerá-los de novo do zero:

```bash
npm run fetch-assets   # baixa os pacotes CC0/CC-BY para .asset-cache/
npm run build-assets   # otimiza (glb, webp, mp3) e gera os assets autorais
```

Outros comandos: `npm test` (regras e física), `npm run typecheck`, `npm run build`.

## Celular

- Toque na tela de título: entra em tela cheia e trava na horizontal (quando o navegador permite).
- Controles de toque: analógico à esquerda; GOLPE, SLICE e LOB à direita; botão ⏸ no topo. Tocar na tela pula intro e replay.
- No celular a qualidade gráfica começa em "baixa" (sem pós-processamento, público menor). Se o FPS cair, a resolução se ajusta sozinha.
- PWA: em `npm run build` + hospedagem HTTPS, o jogo pode ser instalado na tela inicial e funciona offline (`sw.js`).
- Build para hosts que só aceitam tipos web (sem .glb): `VITE_JSON_MODELS=1 npx vite build --outDir dist-artifact && node scripts/glb-to-json.mjs dist-artifact`.

## Controles

| Ação | Teclado | Controle |
|---|---|---|
| Mover | WASD / setas | analógico / direcional |
| Golpe (top spin) — segure para mais força | J ou Espaço | A |
| Slice (↓ + slice = deixadinha) | K | B |
| Lob | L | X / Y |
| Saque | golpe para lançar, golpe de novo no topo do medidor | A |
| Direção | direcional no contato (↑ fundo, ↓ curto) | analógico |
| Pausa | Esc | Start |
| 2º jogador (local) | teclado numérico 8/4/5/6 + 1/2/3 | 2º controle |

No celular aparecem botões de toque automaticamente.

**Dica:** aperte o golpe *antes* da bola chegar. Quanto mais cedo, mais forte e preciso. Enquanto carrega, o tenista se posiciona sozinho em parte.

## Modos

- **Circuito (carreira):** crie seu tenista (nome, país, corpo, cabelo, pele e cores) e suba do nº 300 ao nº 1. A temporada tem Challengers, GOLD 250/500/1000 e Grand Slams, em simples e duplas, com ranking mínimo para entrar, chave por rodadas, pontos, prêmios e títulos. Entre os torneios há amistosos (jogo único), treino e evolução de atributos. O progresso fica salvo.
- **Exibição:** simples ou duplas, 1P vs COM ou 1P vs 2P.
- **Arcade** e **Treino**.
- **Câmeras (Opções):** TV alta (padrão), clássica arcade e atrás do jogador.

## O que tem

- **Modos:** Arcade (5 partidas + chefe final "El Muro", que é desbloqueado), Exibição (1P vs COM ou 1P vs 2P, arena, games, sets e dificuldade livres), Treino (precisão com alvos, combo e recorde).
- **4 arenas:** Harbor Open (quadra dura), Terre Rouge Cup (saibro, com marca da bola e poeira), Royal Lawn Classic (grama, com listras e desgaste) e Neon Arena Finals (indoor, com neon e holofotes). Cada uma tem física de quique própria.
- **9 tenistas fictícios** com atributos, uniforme, raquete, logo de patrocinador e retratos renderizados do próprio modelo 3D.
- **Física:** arrasto, efeito Magnus (top spin e slice), quique por superfície, fita da rede e let. Um solver inverso faz cada golpe cair onde foi mirado.
- **Regras completas:** 15/30/40, deuce/vantagem, tie-break, troca de lado, falta, dupla falta, let e ace.
- **Estádio vivo:** público instanciado (modelos reais em poses de animação, palmas, de pé, ola), juiz de cadeira, boleiros, juízes de linha, fotógrafos e bandeiras ao vento.
- **Apresentação:** intro cinematográfica, close no vencedor do ponto, replay automático em câmera lenta com ângulos de TV, flashes de câmera no match point e confete na vitória.
- **HUD:** placar, games e sets, velocidade em km/h, medidor de saque e chamadas (OUT, FALTA, ACE, DEUCE, BREAK POINT, MATCH POINT).
- **Áudio:** rebatidas por intensidade, quique por superfície, torcida reagindo ao rally, voz do juiz, música e jingles.
- **Opções:** volumes por canal, qualidade gráfica (inclui a densidade do público), tamanho do HUD, tremor de tela e botões de toque. Tudo fica salvo no `localStorage`.

## Estrutura

```
src/
  core/    assets, áudio, input, save
  data/    tenistas, arenas, dificuldades
  game/    physics, rules, match (saque, rally, IA, pontos), athlete, ball, replay, session
  render/  renderer + pós-processamento, câmera, efeitos, retratos
  world/   arena (quadra, arquibancadas, placas, oficiais), público
  ui/      telas, HUD, CSS
scripts/   fetch-assets, build-assets, build-authored
tests/     regras e física (vitest)
```

Créditos e licenças: `public/assets/CREDITS.md`, também dentro do jogo.
