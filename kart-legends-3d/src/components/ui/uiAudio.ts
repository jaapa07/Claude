import { audio } from '@/game/audio/audioManager';

type UiSfx = 'ui_move' | 'ui_select' | 'ui_back' | 'ui_error' | 'unlock';

let warned = false;

/** Som de interface. Uma falha de áudio nunca pode derrubar um clique de menu: é registrada uma vez no console. */
export function uiSfx(id: UiSfx): void {
  try {
    audio.sfx(id);
  } catch (err) {
    if (!warned) {
      warned = true;
      console.warn('[ui] falha ao tocar som de interface', err);
    }
  }
}
