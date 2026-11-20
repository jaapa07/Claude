# Contratos entre módulos — KART LEGENDS 3D

Documento de trabalho da equipe. Cada módulo tem um dono; **não edite arquivos de outro módulo**.
Convenções gerais: TypeScript strict, alias `@/` = `src/`, textos de interface em pt-BR, sem `any`,
sem dependências novas sem necessidade (se precisar, `npm i` e registre no relatório final).
Eixos: Y para cima, **frente do kart = +Z**, unidades em metros.

Arquivos de contrato já existentes (somente leitura para todos):
`src/data/*.ts`, `src/game/core/types.ts`, `src/game/core/hudStore.ts`, `src/app/gameTypes.ts`.

## 1. Fluxo / interface (dono: UI)

- `src/app/gameStore.ts` → `export const useGameStore = create<GameState>()` (ver `src/app/gameTypes.ts`).
- `src/app/settingsStore.ts` → `useSettingsStore` com:
  `quality: 'low'|'medium'|'high'`, `volumes: {music:number; sfx:number; ambient:number}` (0..1),
  `sensitivity: number` (0.5..1.5), `bindings: Record<ActionId, string[]>` (KeyboardEvent.code),
  `gamepadEnabled: boolean`, setters e persistência em localStorage (chave `kl3d.settings.v1`).
  `ActionId = 'accelerate'|'brake'|'left'|'right'|'drift'|'item'|'pause'|'reset'`.
- `src/game/input/inputManager.ts` → singleton `inputManager` com `attach()`, `detach()`,
  `read(): InputState` (teclado + Gamepad API, respeitando bindings e sensibilidade),
  `consumePausePressed(): boolean`, e utilitário de remapeamento (`captureNextKey(): Promise<string>`).
  `read()` é chamado pela simulação a cada passo fixo; deve ser barato e sem alocação.
- `src/game/save/` → `useSaveStore` (localStorage `kl3d.save`, estrutura versionada, migração e
  tratamento de dados ausentes/corrompidos). Deve expor: desbloqueios (personagens, karts, copas),
  troféus por copa, melhores tempos por pista (corrida total e melhor volta, contrarrelógio),
  estatísticas (corridas, vitórias, pódios, turbos por nível, itens usados, tempo jogado) e
  `applyRaceResult(result, championship?)` que devolve a lista de novos desbloqueios.
- Telas (todas em `src/components/ui/`), HUD em `src/components/hud/`, CSS em `src/styles/`.
- `src/app/App.tsx` monta `<GameCanvas />` (de `@/scenes/GameCanvas`, dono: núcleo) como fundo em
  tela cheia e a interface por cima. `src/main.tsx` é do dono UI.
- HUD lê `useHudStore` (`src/game/core/hudStore.ts`). Minimap: `getMinimap(trackId)` de
  `@/game/tracks/minimap` (dono: núcleo) devolve `{ points:number[] /* x,z,x,z… */, minX, maxX, minZ, maxZ }`.
- Ícones/retratos: `assets/ui/portraits/<characterId>.webp` (512×512), `assets/ui/icons/<characterId>.webp`
  (128×128), `assets/ui/items/<itemId>.webp` (128×128), `assets/ui/tracks/<trackId>.webp` (640×360),
  `assets/ui/karts/<kartId>.webp` (512×512). Gerados pelo núcleo; a UI deve usar `<img>` com esses caminhos
  via `assetUrl('ui/…')` de `@/game/core/assets` (resolve o `base` do Vite).

## 2. Áudio (dono: Áudio)

`src/game/audio/audioManager.ts` exporta o singleton `audio`:

```ts
type MusicId = 'menu' | 'race_aurora' | 'race_eclipse' | 'victory' | 'defeat';
type AmbienceId = 'sea'|'forest'|'meadow'|'desert'|'city'|'blizzard'|'sky'|'storm';
type SfxId = 'ui_move'|'ui_select'|'ui_back'|'ui_error'|'countdown_beep'|'countdown_go'|'finish'|'lap'|
  'final_lap'|'collision'|'collision_heavy'|'jump'|'land'|'item_pickup'|'item_roll'|'turbo_1'|'turbo_2'|'turbo_3'|
  'boost_pad'|'item_pulso'|'item_bolha'|'item_nevoa'|'item_faisca'|'item_onda'|'item_cristal'|'shield_break'|
  'spinout'|'thunder'|'unlock'|'respawn'|'splash';
type LoopId = 'drift'|'brake'|'offroad'|'wind_speed'|'drift_sparks';

audio.unlock(): Promise<void>          // chamar no primeiro gesto do usuário (autoplay)
audio.preload(): Promise<void>         // carrega/decodifica todos os buffers
audio.setVolumes(v: {music:number; sfx:number; ambient:number}): void
audio.playMusic(id: MusicId | null, opts?: { fadeMs?: number }): void
audio.playAmbience(id: AmbienceId | null): void
audio.sfx(id: SfxId, opts?: { volume?: number; rate?: number; pan?: number }): void
audio.setLoop(id: LoopId, intensity: number): void   // 0 = silencia; 0..1 = volume
audio.engine.start(): void
audio.engine.update(p: { speed: number /*0..1.3*/; throttle: number; boosting: boolean; airborne: boolean }): void
audio.engine.stop(): void
audio.setPaused(paused: boolean): void  // abafa/pausa loops de corrida
audio.stopAllRaceSounds(): void
```
Arquivos em `public/assets/audio/music/*.ogg` e `public/assets/audio/sfx/*.ogg`, todos gerados por
`scripts/build-audio.ts` (síntese própria → WAV → `ffmpeg` → OGG). O motor do kart é sintetizado em tempo real
(Web Audio) e reage à velocidade.

## 3. Assets 3D (donos: Personagens/Karts e Cenário)

Biblioteca comum: `scripts/lib/` (dono: núcleo). Saídas em `public/assets/**`.

### Kart — `public/assets/karts/<kartId>.glb`
- Origem no chão, no centro do kart; frente +Z. Comprimento ≈ 2,3 m; largura ≈ 1,5 m; raio das rodas 0,27–0,36 m.
- Nós obrigatórios (nomes exatos): `body` (chassi e tudo o que é fixo), `wheel_fl`, `wheel_fr`, `wheel_rl`,
  `wheel_rr` (origem no centro da roda, eixo de rotação = X local), `steering` (volante; origem no centro do aro;
  gira em torno do Z local do nó), `seat` (nó vazio: ponto onde a origem do personagem é encaixada),
  `exhaust_l`, `exhaust_r` (nós vazios na ponta dos escapamentos, olhando para −Z).
- O centro do volante fica em `seat + (0, 0.50, 0.42)`; aro com raio 0,15 m, inclinado ~25° para o piloto.
- `seat` fica entre 0,30 e 0,42 m do chão, com z entre −0,25 e −0,05.

### Personagem — `public/assets/characters/<characterId>.glb`
- Modelo com skin, **sentado**, origem na base do quadril (encaixa em `seat`), olhando para +Z.
  Altura sentada (quadril → topo da cabeça, sem orelhas/chapéu) ≈ 0,95–1,10 m.
- Ossos: `root, hips, spine, chest, neck, head, armL, forearmL, handL, armR, forearmR, handR, legL, shinL, legR, shinR`
  (+ extras: `tail*`, `ear*`, etc.). L = esquerda do personagem (+X quando olha para +Z).
- Na pose de direção as mãos ficam em `(±0.14, 0.52, 0.38)` (bordas do volante).
- Clipes (nomes exatos): `idle`, `drive`, `turn_left`, `turn_right`, `drift_left`, `drift_right`, `hit`,
  `victory`, `defeat`, `podium`. `hit`, `victory` e `defeat` tocam uma vez; os demais em loop.
  O pódio usa o personagem sentado no kart; `podium` é uma comemoração sentada com os dois braços.
- Rosto: malha `face` com material próprio cujo `map` é um atlas 4×2 de expressões, na ordem
  `neutral, happy, focus, hurt, sad, blink, wow, grit` (linha de cima primeiro). O runtime troca `map.offset`.
