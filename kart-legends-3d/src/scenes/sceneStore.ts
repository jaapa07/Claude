import { create } from 'zustand';

export interface SceneLook { bloom: number; saturation: number; contrast: number }
export const DEFAULT_LOOK: SceneLook = { bloom: 0.55, saturation: 0, contrast: 0 };

/** Estado da cena 3D visível para a interface (carregamento e medição de desempenho). */
interface SceneStore {
  loading: boolean;
  fps: number;
  /** Pós-processamento pedido pelo ambiente visível (brilho e gradação de cor da pista). */
  look: SceneLook;
  setLook: (look: SceneLook) => void;
  setLoading: (loading: boolean) => void;
  setFps: (fps: number) => void;
}

export const useSceneStore = create<SceneStore>((set) => ({
  loading: false,
  fps: 0,
  look: DEFAULT_LOOK,
  setLook: (look) => set({ look }),
  setLoading: (loading) => set({ loading }),
  setFps: (fps) => set({ fps }),
}));
