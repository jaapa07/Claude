import { create } from 'zustand';

interface UiStore {
  /** Configurações abertas por cima do menu de pausa (a tela do jogo continua sendo 'race'). */
  pauseSettingsOpen: boolean;
  setPauseSettingsOpen: (open: boolean) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  pauseSettingsOpen: false,
  setPauseSettingsOpen: (pauseSettingsOpen) => set({ pauseSettingsOpen }),
}));
