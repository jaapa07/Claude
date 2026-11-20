import { create } from 'zustand';

/** Estado da cena 3D visível para a interface (carregamento e medição de desempenho). */
interface SceneStore {
  loading: boolean;
  fps: number;
  setLoading: (loading: boolean) => void;
  setFps: (fps: number) => void;
}

export const useSceneStore = create<SceneStore>((set) => ({
  loading: false,
  fps: 0,
  setLoading: (loading) => set({ loading }),
  setFps: (fps) => set({ fps }),
}));
