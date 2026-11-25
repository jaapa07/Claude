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
  /** Cena de abertura 3D pedida pela tela de carregamento (depois que tudo foi baixado). */
  attract: boolean;
  /** A cena de abertura já desenhou: o fundo em CSS pode sumir. */
  attractReady: boolean;
  setAttract: (on: boolean) => void;
  setAttractReady: (on: boolean) => void;
  setLoading: (loading: boolean) => void;
  setFps: (fps: number) => void;
}

export const useSceneStore = create<SceneStore>((set) => ({
  loading: false,
  fps: 0,
  look: DEFAULT_LOOK,
  setLook: (look) => set({ look }),
  attract: false,
  attractReady: false,
  setAttract: (attract) => set({ attract }),
  setAttractReady: (attractReady) => set({ attractReady }),
  setLoading: (loading) => set({ loading }),
  setFps: (fps) => set({ fps }),
}));
