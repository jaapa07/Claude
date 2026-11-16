import { useEffect, useRef } from 'react';
import { Hud } from '@/components/hud/Hud';
import { CharacterSelect } from '@/components/ui/CharacterSelect';
import { CupSelect } from '@/components/ui/CupSelect';
import { DifficultySelect } from '@/components/ui/DifficultySelect';
import { KartSelect } from '@/components/ui/KartSelect';
import { LoadingScreen } from '@/components/ui/LoadingScreen';
import { MainMenu } from '@/components/ui/MainMenu';
import { ModeSelect } from '@/components/ui/ModeSelect';
import { PauseMenu } from '@/components/ui/PauseMenu';
import { PodiumScreen } from '@/components/ui/PodiumScreen';
import { ProgressScreen } from '@/components/ui/ProgressScreen';
import { ResultsScreen } from '@/components/ui/ResultsScreen';
import { SettingsScreen } from '@/components/ui/SettingsScreen';
import { TrackSelect } from '@/components/ui/TrackSelect';
import { focusInitial, moveFocus } from '@/components/ui/menuNav';
import type { NavDirection } from '@/components/ui/menuNav';
import { uiSfx } from '@/components/ui/uiAudio';
import { useUiStore } from '@/components/ui/uiStore';
import { audio } from '@/game/audio/audioManager';
import { inputManager } from '@/game/input/inputManager';
import { GameCanvas } from '@/scenes/GameCanvas';
import { prevScreen } from './flow';
import { useGameStore } from './gameStore';
import type { Screen } from './gameTypes';
import { useSettingsStore } from './settingsStore';

const ARROWS: Record<string, NavDirection> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
const FLOW_SCREENS: ReadonlySet<Screen> = new Set<Screen>(['mode', 'cup', 'track', 'difficulty', 'character', 'kart']);

/** Chamadas de áudio feitas a partir de efeitos: um erro aqui não pode derrubar a interface. */
function safeAudio(label: string, fn: () => void): void {
  try {
    fn();
  } catch (err) {
    console.error(`[audio] ${label}`, err);
  }
}

/** "Voltar" universal (Esc, botão B, tecla de pausa durante a corrida). */
function handleBack(): void {
  const game = useGameStore.getState();
  const ui = useUiStore.getState();
  const { screen } = game;
  if (screen === 'race') {
    if (!game.paused) game.setPaused(true);
    else if (ui.pauseSettingsOpen) {
      uiSfx('ui_back');
      ui.setPauseSettingsOpen(false);
    } else game.setPaused(false);
    return;
  }
  if (FLOW_SCREENS.has(screen)) {
    uiSfx('ui_back');
    game.goTo(prevScreen(screen, game.selection.mode));
  } else if (screen === 'settings' || screen === 'progress') {
    uiSfx('ui_back');
    game.goTo(game.previousScreen === screen ? 'menu' : game.previousScreen);
  }
  // loading, menu, results e podium não têm "voltar": avançam pelos próprios botões.
}

function isRangeInput(el: Element | null): boolean {
  return el instanceof HTMLInputElement && el.type === 'range';
}

export function App(): JSX.Element {
  const screen = useGameStore((s) => s.screen);
  const paused = useGameStore((s) => s.paused);
  const previousScreen = useGameStore((s) => s.previousScreen);
  const goTo = useGameStore((s) => s.goTo);
  const quality = useSettingsStore((s) => s.quality);
  const pauseSettingsOpen = useUiStore((s) => s.pauseSettingsOpen);

  // Entrada: teclado + gamepad durante toda a vida do app.
  useEffect(() => {
    inputManager.attach();
    return () => inputManager.detach();
  }, []);

  // Volumes: aplica na inicialização e a cada mudança nas configurações.
  useEffect(() => {
    safeAudio('setVolumes', () => audio.setVolumes(useSettingsStore.getState().volumes));
    return useSettingsStore.subscribe((s, prev) => {
      if (s.volumes !== prev.volumes) safeAudio('setVolumes', () => audio.setVolumes(s.volumes));
    });
  }, []);

  // Música: tema de menu nas telas de menu; a corrida cuida da própria trilha.
  const lastMusic = useRef<'menu' | 'victory' | 'defeat' | null>(null);
  useEffect(() => {
    if (screen === 'race') lastMusic.current = null; // a cena trocou a música: o próximo menu precisa pedir de novo
    if (screen === 'loading' || screen === 'race' || screen === 'podium') return;
    let wanted: 'menu' | 'victory' | 'defeat' = 'menu';
    if (screen === 'results') {
      const result = useGameStore.getState().lastResult;
      wanted = result && result.playerPosition <= 3 ? 'victory' : 'defeat';
      if ((useGameStore.getState().lastRewards?.unlocks.length ?? 0) > 0) uiSfx('unlock');
    }
    if (lastMusic.current === wanted && wanted === 'menu') return;
    lastMusic.current = wanted;
    safeAudio('playMusic', () => audio.playMusic(wanted));
  }, [screen]);

  // Pausa: abafa os sons de corrida e libera as teclas para os menus.
  useEffect(() => {
    const racing = screen === 'race' && !paused;
    inputManager.setGameplayActive(racing);
    if (screen === 'race') safeAudio('setPaused', () => audio.setPaused(paused));
    if (!paused || screen !== 'race') useUiStore.getState().setPauseSettingsOpen(false);
  }, [screen, paused]);

  // Foco inicial de cada tela/sobreposição (necessário para navegar por teclado e gamepad).
  useEffect(() => {
    if (screen === 'race' && !paused) {
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
      return undefined;
    }
    const id = window.requestAnimationFrame(() => focusInitial());
    return () => window.cancelAnimationFrame(id);
  }, [screen, paused, pauseSettingsOpen]);

  // Teclado nos menus: setas movem o foco, Esc volta (Enter/Espaço já ativam o botão focado).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.defaultPrevented || inputManager.isCapturing()) return;
      const game = useGameStore.getState();
      const racing = game.screen === 'race' && !game.paused;
      if (e.code === 'Escape') {
        // Durante a corrida a pausa vem de `consumePausePressed` (tecla remapeável); aqui só os menus.
        const escIsPause = useSettingsStore.getState().bindings.pause.includes('Escape');
        if (game.screen === 'race' && escIsPause) return;
        e.preventDefault();
        handleBack();
        return;
      }
      if (racing) return;
      const dir = ARROWS[e.code];
      if (!dir) return;
      if (isRangeInput(document.activeElement) && (dir === 'left' || dir === 'right')) return;
      e.preventDefault();
      moveFocus(dir);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Laço por quadro: tecla de pausa / Start durante a corrida e gamepad nos menus.
  useEffect(() => {
    let frame = 0;
    const tick = (): void => {
      frame = window.requestAnimationFrame(tick);
      const game = useGameStore.getState();
      const pausePressed = inputManager.consumePausePressed();
      if (game.screen === 'race') {
        if (pausePressed) handleBack();
        if (!game.paused) return;
      }
      if (game.screen === 'loading' && !document.querySelector('[data-nav-scope]')) return;
      const pad = inputManager.readMenuPad();
      if (inputManager.isCapturing()) return;
      const range = isRangeInput(document.activeElement) ? (document.activeElement as HTMLInputElement) : null;
      if (pad.up) moveFocus('up');
      else if (pad.down) moveFocus('down');
      else if (pad.left || pad.right) {
        if (range) {
          // Sliders: o direcional ajusta o valor, como as setas do teclado.
          if (pad.right) range.stepUp();
          else range.stepDown();
          range.dispatchEvent(new Event('input', { bubbles: true }));
        } else moveFocus(pad.left ? 'left' : 'right');
      }
      if (pad.confirm && document.activeElement instanceof HTMLElement) document.activeElement.click();
      if (pad.back) handleBack();
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Trocar de aba/janela no meio da corrida pausa o jogo.
  useEffect(() => {
    const onVisibility = (): void => {
      const game = useGameStore.getState();
      if (document.hidden && game.screen === 'race' && !game.paused) game.setPaused(true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  const backFromAux = (): void => goTo(previousScreen === screen ? 'menu' : previousScreen);

  return (
    <>
      <GameCanvas />
      <div className="ui-layer" data-screen={screen} data-quality={quality} data-paused={paused}>
        {screen === 'loading' && <LoadingScreen />}
        {screen === 'menu' && <MainMenu />}
        {screen === 'mode' && <ModeSelect />}
        {screen === 'cup' && <CupSelect />}
        {screen === 'track' && <TrackSelect />}
        {screen === 'difficulty' && <DifficultySelect />}
        {screen === 'character' && <CharacterSelect />}
        {screen === 'kart' && <KartSelect />}
        {screen === 'race' && (
          <>
            <Hud />
            {paused && <PauseMenu />}
          </>
        )}
        {screen === 'results' && <ResultsScreen />}
        {screen === 'podium' && <PodiumScreen />}
        {screen === 'progress' && <ProgressScreen onBack={backFromAux} />}
        {screen === 'settings' && <div className="overlay overlay--settings"><SettingsScreen onBack={backFromAux} /></div>}
      </div>
    </>
  );
}
