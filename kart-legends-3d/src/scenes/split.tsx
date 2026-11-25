import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { QualityProfile } from './quality';

/**
 * Tela dividida (2 jogadores): a cena é desenhada DUAS vezes por quadro, então a qualidade é limitada a algo
 * entre Baixa e Média, seja qual for a escolha nas Configurações: resolução até 1× (sem multiplicar pela
 * densidade de pixels da tela), sem sombras nem pós-processamento, menos partículas e clima, distância de desenho
 * e detalhe de animação menores.
 */
export function splitQuality(q: QualityProfile): QualityProfile {
  return {
    ...q,
    dpr: [Math.min(q.dpr[0], 0.85), Math.min(q.dpr[1], 1)],
    shadows: false,
    post: false,
    particles: Math.min(q.particles, 1400),
    weather: Math.min(q.weather, 0.7) * 0.5,
    drawDistance: Math.min(q.drawDistance, 480),
    animDetail: Math.min(q.animDetail, 30),
    shake: q.shake * 0.8,
  };
}

/** Câmera extra do Jogador 2 (a do Jogador 1 é a câmera padrão do Canvas). */
export function useSecondCamera(enabled: boolean): THREE.PerspectiveCamera | null {
  const cam = useMemo(() => (enabled ? new THREE.PerspectiveCamera(60, 2, 0.3, 1600) : null), [enabled]);
  return cam;
}

/**
 * Desenha a cena em duas metades com scissor: Jogador 1 em cima, Jogador 2 embaixo, cada um com a própria câmera
 * (proporção = largura / meia altura). `full()` = true desenha só a câmera do Jogador 1 em tela cheia (apresentação
 * da pista). `before(i)` ajusta o que muda por jogador (ex.: riscos de velocidade) antes de cada metade.
 * Com prioridade > 0 este laço substitui o desenho automático do React Three Fiber.
 */
export function SplitRenderer({ cameras, full, before }: {
  cameras: readonly THREE.PerspectiveCamera[];
  full: () => boolean;
  before?: (slot: number) => void;
}): null {
  useEffect(() => () => {
    // devolve a proporção da câmera principal à tela cheia ao sair
    const c = cameras[0];
    if (c) { c.aspect = window.innerWidth / Math.max(1, window.innerHeight); c.updateProjectionMatrix(); }
  }, [cameras]);
  useFrame(({ gl, scene, size }) => {
    const w = size.width, h = size.height;
    const [a, b] = cameras;
    if (!a) return;
    const setAspect = (c: THREE.PerspectiveCamera, aspect: number): void => {
      if (Math.abs(c.aspect - aspect) > 1e-4) { c.aspect = aspect; c.updateProjectionMatrix(); }
    };
    if (!b || full()) {
      setAspect(a, w / Math.max(1, h));
      gl.setScissorTest(false);
      gl.setViewport(0, 0, w, h);
      before?.(0);
      gl.render(scene, a);
      return;
    }
    // a câmera extra herda o alcance (neblina/distância de desenho) ajustado na principal
    if (b.far !== a.far || b.near !== a.near) { b.far = a.far; b.near = a.near; b.updateProjectionMatrix(); }
    const top = Math.floor(h / 2), bottom = h - top;
    gl.setScissorTest(true);
    // WebGL conta y de baixo para cima: a metade de cima começa em y = bottom
    setAspect(a, w / Math.max(1, top));
    gl.setViewport(0, bottom, w, top);
    gl.setScissor(0, bottom, w, top);
    before?.(0);
    gl.render(scene, a);
    setAspect(b, w / Math.max(1, bottom));
    gl.setViewport(0, 0, w, bottom);
    gl.setScissor(0, 0, w, bottom);
    before?.(1);
    gl.render(scene, b);
    gl.setScissorTest(false);
    gl.setViewport(0, 0, w, h);
  }, 1);
  return null;
}

/** Menor distância² (no plano) de um ponto a qualquer uma das câmeras. */
export function nearestCamDist2(x: number, z: number, cams: readonly THREE.Camera[]): number {
  let best = Infinity;
  for (const c of cams) {
    const d = (x - c.position.x) ** 2 + (z - c.position.z) ** 2;
    if (d < best) best = d;
  }
  return best;
}
