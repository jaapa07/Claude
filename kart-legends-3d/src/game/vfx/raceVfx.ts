import * as THREE from 'three';
import type { Environment, Weather } from '@/game/tracks/environments';
import { ParticleSystem, SPRITE } from './particles';

const DRIFT_RGB: [number, number, number][] = [[1, 1, 1], [0.35, 0.75, 1], [1, 0.6, 0.15], [1, 0.25, 0.85]];
const CONFETTI: [number, number, number][] = [[1, 0.3, 0.35], [1, 0.82, 0.2], [0.3, 0.8, 1], [0.5, 1, 0.5], [0.85, 0.45, 1]];

export interface KartFx {
  x: number; y: number; z: number;
  /** Rodas traseiras (posição mundial, no chão). */
  wheelL: THREE.Vector3; wheelR: THREE.Vector3;
  exhausts: THREE.Vector3[];
  heading: number;
  speed: number;
  drifting: boolean;
  driftLevel: number;
  boost: number;
  boostKind: number;
  grounded: boolean;
  onRoad: boolean;
  /** 0 asfalto, 1 terra, 2 grama, 3 areia, 4 gelo. */
  surface: number;
  braking: boolean;
  spinning: boolean;
}

/**
 * Efeitos visuais da corrida: fumaça de pneu, faíscas de drift por nível, poeira/neve/areia por
 * superfície, chamas e rastro de turbo, impactos, respingos, brilho de coleta, confetes e clima.
 * Tudo sai de dois sistemas de partículas em pool (um aditivo, um alfa).
 */
export class RaceVfx {
  readonly solid: ParticleSystem;
  readonly glow: ParticleSystem;
  private readonly acc = new Map<number, number>();
  private weatherAcc = 0;
  private readonly dust = new THREE.Color();

  /** `atlas`: atlas combinado (próprio + sprites CC0 da Kenney; índices 0–15 e 16–31 de SPRITE). */
  /**
   * Qualidade Baixa (orçamento pequeno): os emissores contínuos de alto volume (fumaça de pneu, poeira) ficam com os
   * sprites próprios, exatamente como antes; os da Kenney entram só nos efeitos pontuais (faíscas, chamas, batidas).
   */
  private readonly lite: boolean;

  constructor(atlas: THREE.Texture, private readonly env: Environment, budget: number) {
    this.lite = budget <= 1500;
    this.solid = new ParticleSystem(atlas, budget, false);
    this.glow = new ParticleSystem(atlas, Math.round(budget * 0.7), true);
    this.dust.set(env.dust);
  }

  private rate(key: number, perSecond: number, dt: number): number {
    const v = (this.acc.get(key) ?? 0) + perSecond * dt;
    const n = Math.floor(v);
    this.acc.set(key, v - n);
    return n;
  }

  /** Emissão contínua de um kart (chamada a cada quadro para karts próximos da câmera). */
  kart(index: number, k: KartFx, dt: number): void {
    const bx = -Math.sin(k.heading), bz = -Math.cos(k.heading);
    const moving = Math.abs(k.speed) > 4;
    if (k.grounded && k.drifting) {
      const c = DRIFT_RGB[k.driftLevel] ?? DRIFT_RGB[0]!;
      for (const w of [k.wheelL, k.wheelR]) {
        for (let i = this.rate(index * 16 + 1, 34, dt); i > 0; i--) {
          this.solid.emit({ x: w.x, y: w.y + 0.12, z: w.z, vx: bx * 1.5, vy: 0.9, vz: bz * 1.5, spread: 1.4, life: 0.55, size: 0.7, grow: 2.6, sprite: this.lite ? SPRITE.smoke : SPRITE.kSmoke, r: 0.95, g: 0.95, b: 0.98, alpha: this.lite ? 0.4 : 0.5, drag: 2, spin: 2 });
        }
        if (k.driftLevel > 0) {
          for (let i = this.rate(index * 16 + 2, 26 + k.driftLevel * 16, dt); i > 0; i--) {
            this.glow.emit({ x: w.x, y: w.y + 0.08, z: w.z, vx: bx * 5, vy: 2.6, vz: bz * 5, spread: 5, life: 0.32, size: i % 3 === 0 ? 0.3 + k.driftLevel * 0.08 : 0.24 + k.driftLevel * 0.07, sprite: i % 3 === 0 ? SPRITE.kTrace : SPRITE.kSpark, r: c[0], g: c[1], b: c[2], gravity: 12, spin: 6 });
          }
        }
      }
    }
    if (k.grounded && moving && (k.braking || k.spinning)) {
      for (let i = this.rate(index * 16 + 3, 26, dt); i > 0; i--) {
        const w = Math.random() < 0.5 ? k.wheelL : k.wheelR;
        this.solid.emit({ x: w.x, y: w.y + 0.1, z: w.z, vy: 0.8, spread: 1.6, life: 0.6, size: 0.8, grow: 2.4, sprite: this.lite ? SPRITE.smoke : SPRITE.kSmoke, r: 0.88, g: 0.88, b: 0.9, alpha: this.lite ? 0.35 : 0.42, drag: 2, spin: 2 });
      }
    }
    // poeira/neve/areia: fora da pista ou em pisos soltos
    const loose = k.surface === 1 || k.surface === 3 || !k.onRoad;
    if (k.grounded && moving && loose) {
      const d = this.dust;
      const amount = (k.onRoad ? 14 : 30) * Math.min(1, Math.abs(k.speed) / 18);
      for (let i = this.rate(index * 16 + 4, amount, dt); i > 0; i--) {
        const w = Math.random() < 0.5 ? k.wheelL : k.wheelR;
        const gravel = !this.lite && i % 4 === 0;
        this.solid.emit({ x: w.x, y: w.y + 0.15, z: w.z, vx: bx * 2.5, vy: gravel ? 3 : 1.6, vz: bz * 2.5, spread: 2.2, life: gravel ? 0.5 : 0.8, size: gravel ? 0.6 : 0.9, grow: gravel ? 1.2 : 3, sprite: gravel ? SPRITE.kGravel : this.lite ? SPRITE.dust : SPRITE.kPuff, r: d.r, g: d.g, b: d.b, alpha: gravel ? 0.85 : 0.5, drag: 1.6, gravity: gravel ? 9 : 0, spin: 2 });
      }
    }
    if (k.grounded && moving && k.surface === 4 && k.onRoad) {
      for (let i = this.rate(index * 16 + 5, 12, dt); i > 0; i--) {
        this.glow.emit({ x: k.wheelL.x + (k.wheelR.x - k.wheelL.x) * Math.random(), y: k.wheelL.y + 0.1, z: k.wheelL.z + (k.wheelR.z - k.wheelL.z) * Math.random(), vy: 1.5, spread: 2, life: 0.5, size: 0.16, sprite: SPRITE.glow, r: 0.7, g: 0.9, b: 1, gravity: 6 });
      }
    }
    // turbo: chamas no escapamento e rastro luminoso
    if (k.boost > 0.02) {
      const c = k.boostKind >= 1 && k.boostKind <= 3 ? DRIFT_RGB[k.boostKind]! : [1, 0.62, 0.2] as [number, number, number];
      for (const e of k.exhausts) {
        for (let i = this.rate(index * 16 + 6, 70, dt); i > 0; i--) {
          this.glow.emit({ x: e.x, y: e.y, z: e.z, vx: bx * 7, vy: 0.4, vz: bz * 7, spread: 1.6, life: 0.26, size: 0.5, grow: 0.3, sprite: i % 2 ? SPRITE.kMuzzle : SPRITE.kFlame, r: c[0], g: c[1], b: c[2], alpha: 0.9, spin: 3 });
        }
      }
      for (let i = this.rate(index * 16 + 7, 30, dt); i > 0; i--) {
        this.glow.emit({ x: k.x + (Math.random() - 0.5) * 1.2, y: k.y + 0.3 + Math.random() * 0.5, z: k.z + (Math.random() - 0.5) * 1.2, vx: bx * 3, vz: bz * 3, life: 0.45, size: 0.14, sprite: SPRITE.glow, r: c[0], g: c[1], b: c[2], alpha: 0.8 });
      }
    }
  }

  /** Rajada ao soltar o miniturbo (anel + faíscas na cor do nível). */
  turbo(x: number, y: number, z: number, level: number): void {
    const c = DRIFT_RGB[Math.min(3, level)] ?? [1, 0.7, 0.3];
    this.glow.emit({ x, y: y + 0.4, z, life: 0.4, size: 1.3, grow: 5, sprite: SPRITE.kRing, r: c[0]!, g: c[1]!, b: c[2]!, alpha: 0.9 });
    for (let i = 0; i < 14 + level * 6; i++) this.glow.emit({ x, y: y + 0.4, z, vy: 2, spread: 12, life: 0.5, size: 0.32, sprite: i % 2 ? SPRITE.kSpark : SPRITE.kTrace, r: c[0]!, g: c[1]!, b: c[2]!, gravity: 8, spin: 6 });
  }

  impact(x: number, y: number, z: number, strength: number): void {
    const n = Math.min(26, 6 + Math.round(strength * 1.6));
    for (let i = 0; i < n; i++) this.glow.emit({ x, y, z, vy: 2.5, spread: 9 + strength * 0.5, life: 0.4, size: 0.26, sprite: i % 2 ? SPRITE.kSpark : SPRITE.kTrace, r: 1, g: 0.85, b: 0.4, gravity: 14, spin: 6 });
    this.glow.emit({ x, y, z, life: 0.18, size: 1 + strength * 0.08, grow: 1.6, sprite: SPRITE.kCross, r: 1, g: 0.9, b: 0.6, alpha: 0.9, spin: 2 });
    this.solid.emit({ x, y, z, life: 0.35, size: 1.4, grow: 2.2, sprite: SPRITE.kSmoke, r: 1, g: 1, b: 1, alpha: 0.5 });
  }

  /** Explosão estilizada quando um piloto é atingido (estrelas + clarão). */
  burst(x: number, y: number, z: number, r: number, g: number, b: number): void {
    this.glow.emit({ x, y: y + 0.6, z, life: 0.3, size: 3.2, grow: 2.4, sprite: SPRITE.kFire, r, g, b, alpha: 0.95, spin: 2 });
    this.glow.emit({ x, y: y + 0.6, z, life: 0.45, size: 1.6, grow: 4.5, sprite: SPRITE.kTwirl, r: 1, g: 1, b: 1, alpha: 0.8, spin: 5 });
    for (let i = 0; i < 16; i++) this.glow.emit({ x, y: y + 0.6, z, vy: 5, spread: 13, life: 0.75, size: 0.5, sprite: SPRITE.star, r: 1, g: 0.9, b: 0.35, gravity: 11, spin: 8 });
    for (let i = 0; i < 8; i++) this.solid.emit({ x, y: y + 0.5, z, vy: 2, spread: 6, life: 0.7, size: 1.2, grow: 2.6, sprite: SPRITE.kPuff, r: 0.9, g: 0.9, b: 0.9, alpha: 0.55, drag: 2, spin: 2 });
  }

  landing(x: number, y: number, z: number, impact: number): void {
    const d = this.dust;
    const n = Math.min(22, 6 + Math.round(impact * 1.5));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      this.solid.emit({ x, y: y + 0.1, z, vx: Math.cos(a) * 5, vy: 1.2, vz: Math.sin(a) * 5, life: 0.6, size: 0.9, grow: 2.8, sprite: this.lite ? SPRITE.dust : SPRITE.kPuff, r: d.r, g: d.g, b: d.b, alpha: 0.55, drag: 3, spin: 2 });
    }
  }

  splash(x: number, y: number, z: number): void {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 5;
      this.solid.emit({ x, y, z, vx: Math.cos(a) * s, vy: 6 + Math.random() * 6, vz: Math.sin(a) * s, life: 0.9, size: 0.34, sprite: SPRITE.drop, r: 0.75, g: 0.92, b: 1, alpha: 0.9, gravity: 20 });
    }
    this.solid.emit({ x, y: y + 0.1, z, life: 0.7, size: 2, grow: 5, sprite: SPRITE.ring, r: 0.9, g: 0.97, b: 1, alpha: 0.7 });
  }

  /** Queda na lava: respingos incandescentes, clarão e fumaça escura. */
  lavaSplash(x: number, y: number, z: number): void {
    this.glow.emit({ x, y: y + 0.5, z, life: 0.45, size: 4, grow: 2.5, sprite: SPRITE.glow, r: 1, g: 0.45, b: 0.1, alpha: 0.9 });
    for (let i = 0; i < 34; i++) {
      const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 5;
      this.glow.emit({ x, y, z, vx: Math.cos(a) * s, vy: 5 + Math.random() * 6, vz: Math.sin(a) * s, life: 0.9, size: 0.32, sprite: SPRITE.spark, r: 1, g: 0.5 + Math.random() * 0.3, b: 0.1, gravity: 18, spin: 5 });
    }
    for (let i = 0; i < 10; i++) this.solid.emit({ x, y: y + 0.6, z, vy: 2.5, spread: 3, life: 1.4, size: 1.6, grow: 3, sprite: SPRITE.kPuff, r: 0.25, g: 0.22, b: 0.22, alpha: 0.6, drag: 1.5, spin: 1.5 });
  }

  /** Brilho de coleta de item / uso de item. */
  sparkle(x: number, y: number, z: number, color: THREE.Color, count = 14): void {
    this.glow.emit({ x, y, z, life: 0.35, size: 2.2, grow: 2, sprite: SPRITE.kMagic, r: color.r, g: color.g, b: color.b, alpha: 0.85, spin: 3 });
    for (let i = 0; i < count; i++) this.glow.emit({ x, y, z, vy: 3, spread: 9, life: 0.6, size: i % 2 ? 0.3 : 0.45, sprite: i % 2 ? SPRITE.star : SPRITE.kFlare, r: color.r, g: color.g, b: color.b, gravity: 6, spin: 6 });
  }

  /** Névoa prisma: lóbulos coloridos subindo devagar. */
  mist(x: number, y: number, z: number, radius: number, dt: number): void {
    for (let i = this.rate(900 + Math.round(x * 7 + z * 13) % 90, 16, dt); i > 0; i--) {
      const a = Math.random() * Math.PI * 2, r = Math.random() * radius;
      const hue = Math.random();
      this.solid.emit({ x: x + Math.cos(a) * r, y: y + 0.4 + Math.random(), z: z + Math.sin(a) * r, vy: 0.6, spread: 0.6, life: 1.2, size: 2.2, grow: 1.6, sprite: SPRITE.mist, r: 0.7 + 0.3 * Math.sin(hue * 6.28), g: 0.5 + 0.3 * Math.sin(hue * 6.28 + 2), b: 1, alpha: 0.45, spin: 1 });
    }
  }

  trail(x: number, y: number, z: number, dt: number): void {
    for (let i = this.rate(990, 60, dt); i > 0; i--) this.glow.emit({ x, y, z, spread: 1.6, life: 0.35, size: 0.4, grow: 0.2, sprite: SPRITE.flame, r: 1, g: 0.45, b: 0.2, alpha: 0.9, spin: 4 });
  }

  /** Cometa Guia: chamas rosa → laranja e estrelinhas saindo da cauda. */
  comet(index: number, x: number, y: number, z: number, heading: number, dt: number): void {
    const bx = -Math.sin(heading), bz = -Math.cos(heading);
    // dois rastros, um de cada lado (no meio ficariam entre a câmera e o kart)
    for (let i = this.rate(5000 + index * 4, 70, dt); i > 0; i--) {
      const t = Math.random(), side = i % 2 ? 1 : -1;
      const sx = -bz * side * 1.1, sz = bx * side * 1.1;
      this.glow.emit({ x: x + sx + bx * (1.4 + t * 2), y: y + 0.35, z: z + sz + bz * (1.4 + t * 2), vx: bx * 6, vz: bz * 6, spread: 0.8, life: 0.4, size: 0.7, grow: 0.2, sprite: SPRITE.flame, r: 1, g: 0.45 + 0.25 * t, b: 0.7 - 0.4 * t, alpha: 0.75, spin: 4 });
    }
    for (let i = this.rate(5001 + index * 4, 22, dt); i > 0; i--) {
      this.glow.emit({ x: x + bx * 3, y: y + 1.2, z: z + bz * 3, vx: bx * 3, vy: 1, vz: bz * 3, spread: 2.5, life: 0.7, size: 0.35, sprite: SPRITE.star, r: 1, g: 0.85, b: 0.95, alpha: 1, gravity: 2, spin: 6 });
    }
  }

  /** Kart "engasgado" pelo Raio Corrente: faíscas elétricas verde-limão em volta. */
  zapped(index: number, x: number, y: number, z: number, dt: number): void {
    for (let i = this.rate(5002 + index * 4, 26, dt); i > 0; i--) {
      const a = Math.random() * Math.PI * 2;
      this.glow.emit({ x: x + Math.cos(a) * 0.9, y: y + 0.3 + Math.random() * 0.9, z: z + Math.sin(a) * 0.9, spread: 1.5, life: 0.18, size: 1, sprite: i % 2 ? SPRITE.bolt : SPRITE.kElectric, r: 0.85, g: 1, b: 0.3, alpha: 1, spin: 12 });
    }
  }

  /** Choque do raio ao atingir um kart. */
  zap(x: number, y: number, z: number, strength: number): void {
    this.glow.emit({ x, y: y + 0.5, z, life: 0.3, size: 3 * strength, grow: 1.8, sprite: SPRITE.glow, r: 0.85, g: 1, b: 0.35, alpha: 0.9 });
    this.glow.emit({ x, y: y + 0.2, z, life: 0.35, size: 1.5, grow: 3 * strength, sprite: SPRITE.ring, r: 0.9, g: 1, b: 0.5, alpha: 0.9 });
    for (let i = 0; i < Math.round(14 * strength); i++) this.glow.emit({ x, y: y + 0.5, z, vy: 2, spread: 8, life: 0.3, size: 0.8, sprite: i % 2 ? SPRITE.bolt : SPRITE.kElectric, r: 0.9, g: 1, b: 0.4, alpha: 1, spin: 10 });
  }

  confetti(x: number, y: number, z: number, count = 90): void {
    for (let i = 0; i < count; i++) {
      const c = CONFETTI[i % CONFETTI.length]!;
      this.solid.emit({ x: x + (Math.random() - 0.5) * 8, y: y + 5 + Math.random() * 3, z: z + (Math.random() - 0.5) * 8, vy: 1, spread: 5, life: 2.6, size: 0.28, sprite: SPRITE.confetti, r: c[0], g: c[1], b: c[2], gravity: 3.2, drag: 0.8, spin: 9 });
    }
  }

  /** Clima em um volume ao redor da câmera (neve, areia, folhas, chuva, pétalas, vaga-lumes, brasas). */
  weather(kind: Weather, cam: THREE.Vector3, forward: THREE.Vector3, dt: number, quality: number): void {
    if (kind === 'none') return;
    this.weatherAcc += dt * quality * (kind === 'rain' ? 420 : kind === 'snow' ? 260 : kind === 'sand' ? 170 : kind === 'fireflies' ? 24 : kind === 'embers' ? 60 : 34);
    while (this.weatherAcc >= 1) {
      this.weatherAcc -= 1;
      const x = cam.x + forward.x * 22 + (Math.random() - 0.5) * 60;
      const z = cam.z + forward.z * 22 + (Math.random() - 0.5) * 60;
      switch (kind) {
        case 'snow': this.solid.emit({ x, y: cam.y + 3 + Math.random() * 12, z, vx: -2.5, vy: -3.2, vz: 1, spread: 1.6, life: 3.2, size: 0.16, sprite: SPRITE.snow, r: 1, g: 1, b: 1, alpha: 0.9, spin: 2, flutter: 1.2 }); break;
        case 'rain': this.solid.emit({ x, y: cam.y + 6 + Math.random() * 10, z, vx: -1.5, vy: -30, vz: 0, life: 0.55, size: 0.5, sprite: SPRITE.rain, r: 0.7, g: 0.8, b: 1, alpha: 0.45 }); break;
        case 'sand': this.solid.emit({ x, y: cam.y - 2 + Math.random() * 6, z, vx: 13, vy: 0.4, vz: 5, spread: 3, life: 1.8, size: 0.9, grow: 2.2, sprite: SPRITE.dust, r: 0.93, g: 0.76, b: 0.5, alpha: 0.22 }); break;
        case 'leaves': this.solid.emit({ x, y: cam.y + 2 + Math.random() * 8, z, vx: 3, vy: -1.4, vz: 1.5, spread: 2, life: 4, size: 0.3, sprite: SPRITE.leaf, r: 0.75 + Math.random() * 0.25, g: 0.7, b: 0.25, alpha: 0.95, spin: 4, flutter: 2.2 }); break;
        case 'petals': this.solid.emit({ x, y: cam.y + 2 + Math.random() * 8, z, vx: 2, vy: -1, vz: 1, spread: 2, life: 4.5, size: 0.26, sprite: SPRITE.petal, r: 1, g: 0.72, b: 0.86, alpha: 0.95, spin: 4, flutter: 2 }); break;
        case 'embers': this.glow.emit({ x, y: cam.y - 3 + Math.random() * 6, z, vx: 0.8, vy: 2.2, vz: 0.4, spread: 1.2, life: 2.6, size: 0.14 + Math.random() * 0.1, sprite: SPRITE.spark, r: 1, g: 0.45 + Math.random() * 0.3, b: 0.12, alpha: 0.95, spin: 3 }); break;
        case 'fireflies': this.glow.emit({ x, y: cam.y - 1.5 + Math.random() * 5, z, spread: 1.4, life: 3, size: 0.22, sprite: SPRITE.glow, r: 0.7, g: 1, b: 0.6, alpha: 0.9, spin: 1.6, flutter: 1.1 }); break;
      }
    }
  }

  update(dt: number, viewportHeight: number, fov: number): void {
    this.solid.setViewportHeight(viewportHeight, fov);
    this.glow.setViewportHeight(viewportHeight, fov);
    this.solid.update(dt);
    this.glow.update(dt);
  }

  get envDust(): string { return this.env.dust; }

  dispose(): void {
    this.solid.dispose();
    this.glow.dispose();
  }
}
