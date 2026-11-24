# Relatório de QA — KART LEGENDS 3D

## Veredito: **PARCIAL**

O jogo inicia, é jogável do menu ao pódio nos quatro modos, salva o progresso e passa em todos os testes
automatizados que foram escritos. Mesmo assim, **não é declarado COMPLETO**, porque há requisitos obrigatórios
da especificação que não foram cumpridos ao pé da letra ou não puderam ser verificados neste ambiente. Eles
estão listados em "O que falta" e nada abaixo deve ser lido como se cobrisse esses pontos.

## Comandos executados (resultados reais da última execução)

| Comando | Resultado |
|---|---|
| `npm run typecheck` | saiu com 0 — TypeScript strict no jogo e nos scripts, sem erros |
| `npm run lint` | saiu com 0 — ESLint sem erros nem avisos |
| `npm run validate:assets` | `OK: 273 recursos validados (132.5 MB, ~4741 mil triângulos em modelos)` |
| `npm run test` | **10 arquivos, 205 testes, 205 passaram** (~105 s) |
| `npm run build` | saiu com 0 — `dist/` gerado (JS 3,45 MB / 1,16 MB gzip + 132 MB de assets) |
| `npm run test:e2e` | **8 testes, 8 passaram** (5,7 min), contra a build de produção — execução anterior à Copa Meteoro; não reexecutado depois dela |

Ambiente: Linux, Node 22.23, Chromium headless do Playwright 1.63 com **WebGL por software (SwiftShader), sem GPU**.

### O que os testes cobrem

Testes unitários e de simulação (Vitest — a simulação roda sem navegador, com o mesmo código do jogo):

| Arquivo | Testes | Assunto |
|---|---:|---|
| `src/tests/physics.test.ts` | 15 | inicialização/grid/contagem, aceleração, velocidade máxima por kart, frenagem, ré, direção, grama, gelo, determinismo, passo fixo, colisão entre karts, muros, rampas, recuperação manual, queda no vazio |
| `src/tests/drift.test.ts` | 8 | entrada em drift, três níveis em ordem, soltar cedo, duração crescente do miniturbo, turbo acima da máxima, eficiência por kart, placas de turbo |
| `src/tests/race.test.ts` | 10 | checkpoints em ordem, voltas, largada não conta volta, corte de caminho, contramão, chegada, classificação, pontuação, HUD, contrarrelógio e treino |
| `src/tests/items.test.ts` | 12 | caixas e reaparecimento, distribuição por posição, os 6 itens, defesa contra a Faísca, giro e invulnerabilidade, cooldown |
| `src/tests/ai.test.ts` | 32 | 8 pilotos de IA completam 3 voltas em **cada uma das 12 pistas**, sem teletransporte, dentro do limite de velocidade; usam drift, turbo, itens e atalhos; desviam de obstáculos; ritmo cresce Fácil → Normal → Difícil |
| `src/tests/tracks.test.ts` | 64 | conteúdo (8/8/12/3/6), integridade dos dados de cada pista, variedade de superfícies e elementos |
| `src/app/gameStore.test.ts` | 13 | fluxo: corrida rápida, campeonato de 4 corridas com pontos e troféu, contrarrelógio, treino |
| `src/game/save/saveStore.test.ts` | 15 | persistência, versão, migração, save corrompido, desbloqueios, melhores tempos |
| `src/game/input/inputManager.test.ts` | 22 | bindings, remapeamento, teclado, gamepad (simulado), sensibilidade |
| `src/game/audio/audioManager.test.ts` | 14 | barramentos de volume, autoplay, falha de carregamento, polifonia, ambiente sem Web Audio |

Testes de ponta a ponta (Playwright, build de produção): carregamento de todos os assets do manifesto sem
referências quebradas nem erros de console; navegação por todas as telas de escolha; configurações (volumes,
qualidade, sensibilidade, remapeamento) e progressão; corrida rápida completa com teclado real (acelerar,
virar, drift até o nível 1, miniturbo, frear, item com Shift, recuperar com R, pausa, configurações dentro da
pausa), resultados com 8 pilotos, pódio, salvamento e recarga da página; reiniciar e sair; contrarrelógio;
treino; campeonato de quatro corridas com classificação e troféu.

**Ressalva sobre os testes de ponta a ponta:** para caber no tempo com renderização por software, eles usam um
gancho que só existe com `?e2e=1` e que adianta o relógio rodando os mesmos passos fixos da simulação sem
desenhar, e entregam o kart do jogador ao piloto automático para terminar as corridas. Os controles foram
exercitados com teclas reais, mas **nenhuma corrida inteira foi pilotada por uma pessoa**.

## Funcionalidades implementadas

- **8 pilotos** (Nilo, Boro, Lumi, Kora, Tiko, Mavi, Runi, Zera): GLB com skin, 10 clipes de animação, atlas de
  8 expressões faciais, retrato e ícone. Máquina de estados de animação (parado, dirigindo, curva, drift,
  batida, vitória, derrota, pódio) com a cabeça acompanhando a curva.
- **8 karts** com silhuetas próprias, rodas independentes que giram e esterçam, volante, suspensão visual,
  inclinação, chamas de turbo. Oito atributos que alteram a física; soma de pontos igual para todos.
- **12 pistas em 3 copas**, cada uma com malha própria, terreno, cenário, muros, pontes, atalho, rampas, placas
  de turbo, zonas de itens, 12 checkpoints, linha de corrida para a IA, minimapa, iluminação, clima e câmera de
  apresentação. Saltos sobre vãos (Jardim Celeste, Recife de Coral, Vulcão Rubro, Estação Lunar), viaduto que
  cruza a pista (Cidade Neon), gelo (Pico Boreal, Estação Lunar), obstáculos móveis (Cidade Neon, Pico Boreal,
  Fortaleza Tempestade e as quatro pistas da Copa Meteoro), relâmpagos (Fortaleza), mar de lava (Vulcão Rubro).
- **Copa Meteoro** (abre com qualquer troféu da Copa Eclipse): Recife de Coral (ilha tropical, passarelas sobre
  a lagoa, arcos de coral, caranguejos gigantes), Templo Esmeralda (selva, pirâmides, pontes de corda, troncos
  pendulares e pedra rolante), Vulcão Rubro (basalto sobre lava, pontes de ferro, bolas de magma, brasas no ar) e
  Estação Lunar (cúpulas, tubo pressurizado, cratera para saltar, lago congelado, robôs de carga). Reaproveitam
  músicas e ambiências existentes; o cenário novo está em `scripts/props/{recife,templo,vulcao,lunar}.ts`.
- **Física arcade em passo fixo** sobre Rapier: 5 superfícies, saltos, colisões, recuperação.
- **Drift com três níveis** de miniturbo, com efeitos e sons distintos por nível.
- **7 adversários com IA** e três dificuldades, usando a mesma física do jogador.
- **6 itens** com modelo, ícone, efeito, som, regras, cooldown e uso pela IA.
- **Câmeras**: perseguição com proteção contra atravessar o cenário, apresentação da pista, largada, chegada,
  vitrine de seleção e pódio.
- **Efeitos**: fumaça de pneu, poeira/areia/neve por superfície, faíscas de drift por nível, chamas e rastro
  de turbo, riscos de velocidade, impactos, explosão estilizada, respingo, brilho de coleta, confetes, clima
  (neve, chuva, areia, folhas, pétalas, vaga-lumes), relâmpagos, bloom e vinheta moderados.
- **Áudio**: 5 músicas, 31 efeitos, 5 loops, 8 ambiências, motor sintetizado que reage à velocidade, três
  volumes independentes, tratamento de autoplay.
- **Interface**: as 14 telas, HUD completo, 4 modos, campeonato, progressão com desbloqueios, troféus,
  melhores tempos e estatísticas; teclado, gamepad, remapeamento e sensibilidade; três níveis de qualidade.
- **Salvamento** versionado em localStorage, com recuperação de dados corrompidos.

## Critérios da seção 27

| Critério | Situação | Evidência / ressalva |
|---|---|---|
| O jogo inicia corretamente | Atendido | e2e "inicialização" |
| Oito personagens disponíveis | Atendido | validação de assets; 4 começam liberados, 4 por progressão |
| Oito karts com modelos definitivos | **Com ressalva** | 8 GLB distintos de 14–18 mil triângulos, mas modelados por script (ver "O que falta" 1) |
| Oito pistas finalizadas | **Com ressalva** | todas correm e têm os elementos pedidos; acabamento de arte desigual (ver 1 e 6) |
| Adversários funcionam | Atendido | `ai.test.ts`: 8 pilotos × 12 pistas |
| Física operacional | Atendido | `physics.test.ts` |
| Drift | Atendido | `drift.test.ts`, e2e |
| Turbo | Atendido | `drift.test.ts`, e2e |
| Itens | Atendido | `items.test.ts`, e2e |
| Colisões | Atendido | `physics.test.ts` |
| Checkpoints | Atendido | `race.test.ts` |
| Classificação | Atendido | `race.test.ts` |
| Menus completos | Atendido | e2e de menus e de corrida |
| HUD completo | Atendido | e2e; capturas em `docs/screenshots` |
| Efeitos integrados | Atendido, **sem revisão humana** | disparados por eventos da simulação; vistos só em capturas |
| Animações integradas | Atendido, **sem revisão humana** | clipes vistos em miniaturas, não em movimento |
| Áudio integrado | Atendido, **nunca ouvido** | ver 4 |
| Campeonato | Atendido | e2e de campeonato |
| Progresso salvo | Atendido | e2e (recarrega a página) |
| Testes executados | Atendido | tabela acima |
| Build disponível | Atendido | `dist/` |
| Licenças verificadas | Atendido | 100% original; `validate:assets` confere o campo de licença |
| Sem placeholders finais | **Não atendido integralmente** | ver 1 e 6 |
| Sem referências quebradas | Atendido | `validate:assets` e e2e de carregamento |

## O que falta (por que o veredito é PARCIAL)

1. **Assets feitos por script, não em ferramenta de modelagem.** Não havia Blender nem acesso a bancos de
   assets neste ambiente (os sites de assets livres estavam bloqueados pela rede). Personagens, karts, itens e
   cenário são arquivos GLB reais, com rig, animação e textura, mas a geometria nasce de código
   (`scripts/`), não de escultura por artistas. A seção 4 da especificação pede assets definitivos e proíbe
   geometria procedural como solução artística principal; isto não a cumpre no sentido estrito. O resultado
   está acima de "caixas e esferas", mas abaixo de arte 3D profissional.
2. **Desempenho não medido em GPU.** O único renderizador disponível foi o SwiftShader (CPU), que fica entre
   0 e 2 quadros por segundo na qualidade Média a 1280×720 (`docs/screenshots/fps-software.json`). Esse número
   não diz nada sobre um desktop com placa de vídeo, e **não há medição que sustente 60 FPS nem 30 FPS**. As
   pistas têm de 340 a 640 mil triângulos e não há níveis de detalhe (LOD).
3. **Nenhuma sessão de jogo com uma pessoa.** A sensação de direção, a dificuldade percebida, a legibilidade
   dos efeitos em movimento e o encaixe dos pilotos em todos os karts não foram avaliados jogando.
4. **Áudio nunca ouvido.** Músicas e efeitos foram compostos e mixados por código e conferidos por medição
   (pico, RMS, emenda dos loops), não por audição. Só o Chromium foi testado; Firefox e Safari não.
5. **Itens técnicos da especificação não usados:** texturas KTX2 (são WebP), conversão de FBX, LOD,
   carregamento sob demanda por pista (tudo é pré-carregado no início). Não havia vídeo de referência acessível
   para analisar.
6. **Acabamento parcial em pontos específicos:**
   - túneis e cavernas são sequências de arcos sobre a pista, não galerias fechadas;
   - o palco da vitrine dos menus e o chão do pódio são formas simples criadas na cena, não modelos;
   - o terreno fora da pista usa uma textura genérica com cor por vértice, sem pintura dedicada;
   - "ruas molhadas" usam material brilhante com mapa de ambiente, sem reflexo real da cena;
   - o rosto dos pilotos estica nas laterais da cabeça (projeção frontal) e as mãos são punhos fechados;
   - os para-lamas dos karts não acompanham o esterço das rodas;
   - o vitral da Fortaleza e o letreiro do pórtico de largada ficaram fracos, segundo quem os modelou.
7. **Verificações que não foram feitas:** gamepad com controle físico (só simulado em teste); sentido de giro
   das rodas e do volante conferido só por código; revisão visual completa das 8 pistas (cada uma foi vista em
   2 ou 3 capturas); testes de componentes React (há testes de stores, fluxo, save e entrada, não de telas).

## Problemas conhecidos

- Na Cidade Neon, um piloto de IA ocasionalmente fica preso e é reposicionado (até 4 vezes por corrida de 8
  pilotos nas execuções medidas).
- O colisor do kart é uma esfera: de frente ou de traseira os modelos se sobrepõem um pouco antes de colidir.
- Quem não cruza a chegada antes de os resultados abrirem (cerca de 3,4 s depois do jogador) é classificado
  pelo progresso, sem tempo final.
- O Bosque de Cristal é a pista mais pesada (21,6 MB e ~640 mil triângulos).
- O repositório carrega 109 MB de assets binários, todos regeneráveis com `npm run assets` mais
  `scripts/capture-ui.ts`.
- Safari só toca Ogg Vorbis em versões recentes; onde não houver suporte, o carregamento acusa o erro na tela.

## Próxima etapa sugerida

Abrir a build em um computador com placa de vídeo, jogar as oito pistas e registrar FPS por nível de
qualidade; a partir daí decidir o corte de triângulos/LOD das pistas e a lista de ajustes de arte e de áudio.
