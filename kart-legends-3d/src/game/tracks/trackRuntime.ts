import type { PathSamples, ShortcutData, TrackData } from './trackTypes';

/** Caminho amostrado com tangentes e direções pré-calculadas para consultas rápidas. */
export class RuntimePath {
  readonly n: number;
  readonly pos: Float32Array;
  readonly side: Float32Array;
  readonly up: Float32Array;
  readonly tan: Float32Array;
  readonly halfWidth: Float32Array;
  readonly surface: Uint8Array;
  readonly gap: Uint8Array;
  readonly heading: Float32Array;
  /** Curvatura horizontal com sinal (+ = esquerda), suavizada. */
  readonly curvature: Float32Array;

  constructor(s: PathSamples, readonly closed: boolean) {
    const n = (this.n = s.halfWidth.length);
    this.pos = Float32Array.from(s.pos);
    this.side = Float32Array.from(s.side);
    this.up = Float32Array.from(s.up);
    this.halfWidth = Float32Array.from(s.halfWidth);
    this.surface = Uint8Array.from(s.surface);
    this.gap = Uint8Array.from(s.gap);
    this.tan = new Float32Array(n * 3);
    this.heading = new Float32Array(n);
    this.curvature = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = closed ? (i - 1 + n) % n : Math.max(0, i - 1);
      const b = closed ? (i + 1) % n : Math.min(n - 1, i + 1);
      let x = this.pos[b * 3]! - this.pos[a * 3]!, y = this.pos[b * 3 + 1]! - this.pos[a * 3 + 1]!, z = this.pos[b * 3 + 2]! - this.pos[a * 3 + 2]!;
      const l = Math.hypot(x, y, z) || 1;
      x /= l; y /= l; z /= l;
      this.tan[i * 3] = x; this.tan[i * 3 + 1] = y; this.tan[i * 3 + 2] = z;
      this.heading[i] = Math.atan2(x, z);
    }
    const raw = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const a = closed ? (i - 1 + n) % n : Math.max(0, i - 1);
      const b = closed ? (i + 1) % n : Math.min(n - 1, i + 1);
      raw[i] = angleDiff(this.heading[b]!, this.heading[a]!) / 4;
    }
    for (let i = 0; i < n; i++) {
      let sum = 0, w = 0;
      for (let d = -4; d <= 4; d++) {
        let j = i + d;
        if (closed) j = (j + n) % n; else if (j < 0 || j >= n) continue;
        sum += raw[j]!; w++;
      }
      this.curvature[i] = sum / w;
    }
  }

  wrap(i: number): number {
    return this.closed ? ((i % this.n) + this.n) % this.n : Math.max(0, Math.min(this.n - 1, i));
  }

  /** Ponto da pista com deslocamento lateral (escreve em `out`). */
  point(i: number, lateral: number, out: { x: number; y: number; z: number }): void {
    const k = this.wrap(i) * 3;
    out.x = this.pos[k]! + this.side[k]! * lateral;
    out.y = this.pos[k + 1]! + this.side[k + 1]! * lateral;
    out.z = this.pos[k + 2]! + this.side[k + 2]! * lateral;
  }

  /** Distância ao quadrado até a amostra i (a altura pesa em dobro para separar viadutos). */
  dist2(i: number, x: number, y: number, z: number): number {
    const k = i * 3;
    const dx = x - this.pos[k]!, dy = (y - this.pos[k + 1]!) * 2, dz = z - this.pos[k + 2]!;
    return dx * dx + dy * dy + dz * dz;
  }

  /** Amostra mais próxima dentro de uma janela ao redor de `around`. */
  nearest(around: number, back: number, ahead: number, x: number, y: number, z: number): number {
    let best = this.wrap(around), bd = Infinity;
    for (let d = -back; d <= ahead; d++) {
      const raw = around + d;
      if (!this.closed && (raw < 0 || raw >= this.n)) continue;
      const i = this.wrap(raw);
      const dd = this.dist2(i, x, y, z);
      if (dd < bd) { bd = dd; best = i; }
    }
    return best;
  }

  lateral(i: number, x: number, y: number, z: number): number {
    const k = i * 3;
    return (x - this.pos[k]!) * this.side[k]! + (y - this.pos[k + 1]!) * this.side[k + 1]! + (z - this.pos[k + 2]!) * this.side[k + 2]!;
  }

  along(i: number, x: number, y: number, z: number): number {
    const k = i * 3;
    return (x - this.pos[k]!) * this.tan[k]! + (y - this.pos[k + 1]!) * this.tan[k + 1]! + (z - this.pos[k + 2]!) * this.tan[k + 2]!;
  }
}

export function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export interface RuntimeShortcut { data: ShortcutData; path: RuntimePath; /** Comprimento equivalente na pista principal (amostras). */ span: number }

/** Dados da pista preparados para a simulação. */
export class TrackRuntime {
  readonly main: RuntimePath;
  readonly shortcuts: RuntimeShortcut[];
  readonly n: number;
  readonly racingLine: Float32Array;
  readonly speedHint: Float32Array;
  /** 1 = zona de aproximação/voo de um salto: a IA mantém o acelerador a fundo. */
  readonly jumpZone: Uint8Array;

  constructor(readonly data: TrackData) {
    this.main = new RuntimePath(data.main, true);
    this.n = this.main.n;
    this.shortcuts = data.shortcuts.map((sc) => ({
      data: sc,
      path: new RuntimePath(sc.samples, false),
      span: (sc.to - sc.from + this.n) % this.n,
    }));
    this.racingLine = Float32Array.from(data.racingLine);
    this.speedHint = Float32Array.from(data.speedHint);
    this.jumpZone = new Uint8Array(this.n);
    // Antes de um vão de salto a IA precisa passar pela placa de turbo e pela rampa, em linha reta e a fundo.
    for (let i = 0; i < this.n; i++) {
      if (!this.main.gap[i] || this.main.gap[(i - 1 + this.n) % this.n]) continue;
      for (let d = 0; d < 45; d++) {
        const j = (i - d + this.n) % this.n;
        this.racingLine[j] = 0;
        this.speedHint[j] = 1;
        this.jumpZone[j] = 1;
      }
      for (let d = 0; d < 24; d++) {
        const j = (i + d) % this.n;
        this.racingLine[j] = 0;
        this.jumpZone[j] = d < 14 ? 1 : 0;
        this.speedHint[j] = Math.max(this.speedHint[j]!, 0.9);
      }
    }
  }

  /** Índice seguro para reposicionar um kart: recua até um trecho com chão, longe de vãos. */
  safeIndex(i: number): number {
    let k = this.main.wrap(i);
    for (let tries = 0; tries < this.n; tries++) {
      let ok = true;
      for (let d = -2; d <= 48; d++) if (this.main.gap[this.main.wrap(k + d)]) { ok = false; break; }
      if (ok) return k;
      k = this.main.wrap(k - 4);
    }
    return 0;
  }

  /** Decodifica o terreno (alturas em metros) ou null. */
  terrainHeights(): Float32Array | null {
    const t = this.data.terrain;
    if (!t) return null;
    const bin = atob(t.heights);
    const out = new Float32Array(t.nx * t.nz);
    for (let i = 0; i < out.length; i++) {
      const v = bin.charCodeAt(i * 2) | (bin.charCodeAt(i * 2 + 1) << 8);
      out[i] = (v >= 32768 ? v - 65536 : v) / 100;
    }
    return out;
  }
}
