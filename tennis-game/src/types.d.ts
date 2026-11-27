declare module 'n8ao' {
  import type { Scene, Camera } from 'three';
  import type { Pass } from 'postprocessing';
  export class N8AOPostPass extends Pass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number);
    configuration: { aoRadius: number; distanceFalloff: number; intensity: number; halfRes: boolean; denoiseSamples: number; aoSamples: number; color: unknown; gammaCorrection: boolean };
  }
}
