# `data-testid` da interface — KART LEGENDS 3D

Lista estável para os testes E2E. Tudo aqui é renderizado por `src/components/ui/**` e `src/components/hud/**`.
A tela atual também está em `.ui-layer[data-screen="<screen>"]` (com `data-paused` e `data-quality`).

## Como as telas de escolha se comportam

- **Clique do mouse em um cartão = seleciona** (não avança). Para avançar: `btn-confirm` (ou duplo clique).
- **Enter / Espaço / botão A do gamepad em um cartão focado = seleciona e avança.** Setas movem o foco (e a seleção).
- Cartões bloqueados têm `data-locked="true"`: podem ser clicados/focados (mostram `lock-condition`), mas não
  selecionados; `btn-confirm` continua valendo para o último item liberado selecionado.
- Cartão selecionado: `data-selected="true"` / `aria-pressed="true"`.
- `Esc` (ou botão B) = voltar em todas as telas do fluxo, Configurações e Progressão. Na corrida, `Esc` (tecla de
  pausa, remapeável) e Start abrem/fecham a pausa — a troca acontece no quadro seguinte (espere pelo `screen-pause`).

Fluxo: `menu → mode → (cup | track) → difficulty* → character → kart → race` (*pulada em Contrarrelógio e Treino).

## Telas

| Tela | testid | Observações |
|---|---|---|
| Carregamento | `screen-loading` | `loading-progress`, `loading-status`, `loading-error` (só se houver erro), `btn-start`, `btn-retry-load` (só com erro) |
| Menu principal | `screen-menu` | `btn-play`, `btn-progress`, `btn-settings`; `save-recovered` (aviso de save corrompido) |
| Modo | `screen-mode` | `card-mode-quick`, `card-mode-championship`, `card-mode-timetrial`, `card-mode-training` |
| Copa | `screen-cup` | `card-cup-aurora`, `card-cup-eclipse` |
| Pista | `screen-track` | `card-track-<trackId>` (8), `track-detail`, `lock-condition` |
| Dificuldade | `screen-difficulty` | `card-difficulty-easy`, `card-difficulty-normal`, `card-difficulty-hard` |
| Personagem | `screen-character` | `card-character-<characterId>` (8), `character-detail`, `lock-condition` |
| Kart | `screen-kart` | `card-kart-<kartId>` (8), `kart-detail`, `kart-stats`, `stat-<chave de KartStats>` (8), `lock-condition`; `btn-confirm` aqui **inicia a corrida** |
| Corrida | `hud` | ver HUD abaixo (a tela é `data-screen="race"`) |
| Pausa | `screen-pause` | `btn-resume`, `btn-restart`, `btn-pause-settings`, `btn-quit` |
| Configurações | `screen-settings` | ver abaixo. Aberta pela pausa, é uma sobreposição: `data-screen` continua `race` |
| Resultados | `screen-results` | `results-headline`, `results-table`, `results-row-<posição>` (`data-player`), `results-laps` (contrarrelógio), `results-records`, `results-unlocks`, `results-standings` (campeonato), `btn-continue`, `btn-retry` (fora do campeonato) |
| Pódio | `screen-podium` | `podium-place-1..3` (`data-player`), `podium-trophy` (`data-tier` = gold/silver/bronze/none; só no fim da copa), `btn-continue` |
| Progressão | `screen-progress` | `btn-tab-overview`, `btn-tab-times`, `btn-tab-unlocks`; `progress-overview`, `trophy-<cupId>` (`data-tier`), `progress-stats`, `stat-races`, `stat-wins`; `progress-times`, `times-row-<trackId>`; `progress-unlocks`, `unlock-c-<characterId>`, `unlock-k-<kartId>`, `unlock-p-<cupId>` (`data-unlocked`) |

Comuns: `btn-back` (cabeçalho das telas com "Voltar"), `btn-confirm` (telas de escolha).

### Configurações

`slider-volume-music`, `slider-volume-sfx`, `slider-volume-ambient` (0–100), `btn-quality-low|medium|high`
(`data-selected`), `slider-sensitivity` (50–150), `btn-toggle-gamepad` (`aria-checked`), `gamepad-status`,
`bindings`, `btn-remap-<ação>-<0|1>` (ações: `accelerate`, `brake`, `left`, `right`, `drift`, `item`, `pause`,
`reset`; ao clicar fica `data-capturing="true"` até a próxima tecla; Esc cancela), `btn-reset-bindings`,
`btn-restore-defaults`, `btn-erase-progress` → `confirm-erase` com `btn-erase-cancel` / `btn-erase-confirm`
(só fora da corrida), `settings-message`.

## HUD

| testid | Conteúdo |
|---|---|
| `hud` | raiz (`data-mode` = modo da corrida) |
| `hud-position` | ex.: `3º/8` (`data-place`). **Ausente** no Contrarrelógio e no Treino |
| `hud-lap` | `Volta 2/3` (no Treino, só o número) |
| `hud-time` | tempo de corrida `m:ss.mmm` |
| `hud-lap-time`, `hud-best-lap` | volta atual e melhor volta |
| `hud-speed` | velocímetro; `hud-speed-value` tem só o número em km/h |
| `hud-item` | `data-item` = id do item, `none` ou `rolling`; `data-rolling` |
| `hud-drift` | `data-level` 0–3 (azul, laranja, magenta) |
| `hud-boost` | `data-active` |
| `hud-shield` | `data-active` |
| `hud-minimap` | `data-state` = loading/ready/error; `hud-minimap-player` = ponto do jogador |
| `hud-countdown` | `3`, `2`, `1`, `VAI!` (`data-go`); ausente quando `countdown < 0` |
| `hud-alerts` | alertas; `hud-wrong-way` (contramão), `hud-finished` (fase `finished`) |

## Armazenamento

- `localStorage["kl3d.save"]` — progresso (`version`, `unlocked`, `trophies`, `records`, `stats`).
- `localStorage["kl3d.save.corrupt"]` — cópia do save ilegível, quando houve recuperação.
- `localStorage["kl3d.settings.v1"]` — configurações.
