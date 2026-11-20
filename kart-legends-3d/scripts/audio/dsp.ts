/**
 * Núcleo de DSP do sintetizador offline do Kart Legends 3D.
 * Tudo aqui é determinístico: nenhuma chamada a Math.random, apenas RNG com semente.
 */

export const SR = 44100;
export const TAU = Math.PI * 2;

export type Rng = () => number;

/** mulberry32: RNG pequeno e determinístico. */
export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a de um texto, para derivar sementes estáveis a partir de ids. */
export function seedOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export const midiHz = (midi: number): number => 440 * 2 ** ((midi - 69) / 12);
export const db = (d: number): number => 10 ** (d / 20);
export const toDb = (x: number): number => 20 * Math.log10(Math.max(x, 1e-9));
export const sec = (s: number): number => Math.round(s * SR);
export const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x);

/** Buffer estéreo em ponto flutuante. */
export class Stereo {
  readonly l: Float32Array;
  readonly r: Float32Array;
  readonly length: number;

  constructor(length: number) {
    this.length = length;
    this.l = new Float32Array(length);
    this.r = new Float32Array(length);
  }

  static seconds(s: number): Stereo {
    return new Stereo(sec(s));
  }

  get duration(): number {
    return this.length / SR;
  }

  add(src: Stereo, gain = 1, offset = 0): this {
    const n = Math.min(src.length, this.length - offset);
    for (let i = 0; i < n; i++) {
      this.l[offset + i] += src.l[i] * gain;
      this.r[offset + i] += src.r[i] * gain;
    }
    return this;
  }

  scale(gain: number): this {
    for (let i = 0; i < this.length; i++) {
      this.l[i] *= gain;
      this.r[i] *= gain;
    }
    return this;
  }
}

/** Mistura um sinal mono num buffer estéreo com pan de potência constante. `wrap` dá a volta (loops). */
export function mixMono(dst: Stereo, src: Float32Array, start: number, gain = 1, pan = 0, wrap = false): void {
  const a = ((clamp(pan, -1, 1) + 1) * Math.PI) / 4;
  const gl = Math.cos(a) * gain * Math.SQRT2;
  const gr = Math.sin(a) * gain * Math.SQRT2;
  const n = dst.length;
  if (wrap) {
    let j = ((start % n) + n) % n;
    for (let i = 0; i < src.length; i++) {
      dst.l[j] += src[i] * gl;
      dst.r[j] += src[i] * gr;
      if (++j >= n) j = 0;
    }
    return;
  }
  const from = Math.max(0, -start);
  const to = Math.min(src.length, n - start);
  for (let i = from; i < to; i++) {
    dst.l[start + i] += src[i] * gl;
    dst.r[start + i] += src[i] * gr;
  }
}

/** PolyBLEP: correção de descontinuidade para osciladores sem aliasing audível. */
export function polyBlep(t: number, dt: number): number {
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
}

export type Wave = 'sine' | 'tri' | 'saw' | 'square';

/** Amostra de oscilador com fase em [0,1). */
export function oscSample(wave: Wave, ph: number, dt: number, pw = 0.5): number {
  switch (wave) {
    case 'sine':
      return Math.sin(TAU * ph);
    case 'tri':
      return 4 * Math.abs(ph - 0.5) - 1;
    case 'saw':
      return 2 * ph - 1 - polyBlep(ph, dt);
    case 'square': {
      let v = ph < pw ? 1 : -1;
      v += polyBlep(ph, dt);
      let p2 = ph + 1 - pw;
      if (p2 >= 1) p2 -= 1;
      v -= polyBlep(p2, dt);
      return v;
    }
  }
}

export type FilterType = 'lp' | 'bp' | 'hp';

/** Filtro de variável de estado (topologia TPT), estável mesmo com corte modulado. */
export class Svf {
  private ic1 = 0;
  private ic2 = 0;
  private a1 = 0;
  private a2 = 0;
  private a3 = 0;
  private k = 1;
  band = 0;
  high = 0;

  set(fc: number, q: number): void {
    const g = Math.tan((Math.PI * clamp(fc, 10, SR * 0.45)) / SR);
    this.k = 1 / Math.max(q, 0.05);
    this.a1 = 1 / (1 + g * (g + this.k));
    this.a2 = g * this.a1;
    this.a3 = g * this.a2;
  }

  /** Processa uma amostra; devolve o passa-baixas e guarda `band` e `high`. */
  process(x: number): number {
    const v3 = x - this.ic2;
    const v1 = this.a1 * this.ic1 + this.a2 * v3;
    const v2 = this.ic2 + this.a2 * this.ic1 + this.a3 * v3;
    this.ic1 = 2 * v1 - this.ic1;
    this.ic2 = 2 * v2 - this.ic2;
    this.band = v1;
    this.high = x - this.k * v1 - v2;
    return v2;
  }
}

export function whiteNoise(n: number, rng: Rng): Float32Array {
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = rng() * 2 - 1;
  return out;
}

export type Curve = number | ((i: number, n: number) => number);

/**
 * Filtra um sinal mono no lugar. O corte pode ser uma função do índice (atualizado a cada 16 amostras).
 * Com `loop`, o filtro roda uma volta de aquecimento antes: se a entrada e a modulação forem periódicas
 * no comprimento do buffer, a saída emenda sem clique.
 */
export function filterMono(x: Float32Array, type: FilterType, cutoff: Curve, q = 0.707, loop = false): Float32Array {
  const f = new Svf();
  const n = x.length;
  const fixed = typeof cutoff === 'number';
  if (fixed) f.set(cutoff, q);
  const pick = (low: number): number => (type === 'lp' ? low : type === 'bp' ? f.band : f.high);
  if (loop) {
    const warm = Math.min(n, SR * 2);
    for (let i = n - warm; i < n; i++) {
      if (!fixed && (i & 15) === 0) f.set(cutoff(i, n), q);
      f.process(x[i]);
    }
  }
  for (let i = 0; i < n; i++) {
    if (!fixed && (i & 15) === 0) f.set(cutoff(i, n), q);
    x[i] = pick(f.process(x[i]));
  }
  return x;
}

export function filterStereo(buf: Stereo, type: FilterType, cutoff: Curve, q = 0.707, loop = false): Stereo {
  filterMono(buf.l, type, cutoff, q, loop);
  filterMono(buf.r, type, cutoff, q, loop);
  return buf;
}

const COMBS = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
const ALLPASSES = [556, 441, 341, 225];

export interface ReverbOpts {
  /** 0..1: tamanho/decay da sala. */
  room: number;
  /** 0..1: absorção de agudos. */
  damp: number;
  /** Passa-altas na entrada, para a cauda não embolar os graves. */
  hp?: number;
}

/** Reverb no estilo Schroeder/Freeverb (8 combs + 4 allpass por canal). Devolve só o sinal molhado. */
export function reverb(input: Stereo, o: ReverbOpts): Stereo {
  const n = input.length;
  const out = new Stereo(n);
  const mono = new Float32Array(n);
  for (let i = 0; i < n; i++) mono[i] = (input.l[i] + input.r[i]) * 0.015;
  if (o.hp) filterMono(mono, 'hp', o.hp);
  const fb = 0.7 + 0.28 * clamp(o.room, 0, 1);
  const damp = clamp(o.damp, 0, 1) * 0.4;
  for (let ch = 0; ch < 2; ch++) {
    const dst = ch === 0 ? out.l : out.r;
    const spread = ch === 0 ? 0 : 23;
    for (const len0 of COMBS) {
      const len = len0 + spread;
      const buf = new Float32Array(len);
      let idx = 0;
      let store = 0;
      for (let i = 0; i < n; i++) {
        const y = buf[idx];
        store = y * (1 - damp) + store * damp;
        buf[idx] = mono[i] + store * fb;
        if (++idx >= len) idx = 0;
        dst[i] += y;
      }
    }
    for (const len0 of ALLPASSES) {
      const len = len0 + spread;
      const buf = new Float32Array(len);
      let idx = 0;
      for (let i = 0; i < n; i++) {
        const b = buf[idx];
        const x = dst[i];
        buf[idx] = x + b * 0.5;
        if (++idx >= len) idx = 0;
        dst[i] = b - x;
      }
    }
  }
  return out;
}

/** Eco estéreo ping-pong com realimentação amortecida. Devolve só o sinal molhado. */
export function pingPong(input: Stereo, timeSec: number, feedback: number, dampHz = 3500): Stereo {
  const n = input.length;
  const out = new Stereo(n);
  const d = Math.max(1, sec(timeSec));
  const coef = Math.exp((-TAU * dampHz) / SR);
  let lpL = 0;
  let lpR = 0;
  for (let i = d; i < n; i++) {
    const inMono = (input.l[i - d] + input.r[i - d]) * 0.5;
    // L recebe a entrada e o retorno de R; R recebe só o retorno de L.
    const toL = inMono + out.r[i - d] * feedback;
    const toR = out.l[i - d] * feedback;
    lpL = toL + (lpL - toL) * coef;
    lpR = toR + (lpR - toR) * coef;
    out.l[i] = lpL;
    out.r[i] = lpR;
  }
  return out;
}

/** Chorus estéreo simples (linha de atraso modulada), para alargar pads. */
export function chorus(buf: Stereo, rateHz = 0.6, depthMs = 3, baseMs = 14, mix = 0.5): Stereo {
  const n = buf.length;
  const srcL = Float32Array.from(buf.l);
  const srcR = Float32Array.from(buf.r);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const dl = ((baseMs + depthMs * Math.sin(TAU * rateHz * t)) / 1000) * SR;
    const dr = ((baseMs + depthMs * Math.sin(TAU * rateHz * t + 2.1)) / 1000) * SR;
    const pl = i - dl;
    const pr = i - dr;
    if (pl >= 0) {
      const i0 = pl | 0;
      const fr = pl - i0;
      buf.l[i] += (srcR[i0] * (1 - fr) + (srcR[i0 + 1] ?? 0) * fr) * mix;
    }
    if (pr >= 0) {
      const i0 = pr | 0;
      const fr = pr - i0;
      buf.r[i] += (srcL[i0] * (1 - fr) + (srcL[i0 + 1] ?? 0) * fr) * mix;
    }
  }
  return buf;
}

export interface CompressOpts {
  threshDb: number;
  ratio: number;
  attack: number;
  release: number;
  makeupDb?: number;
  /** Segundos do fim do buffer usados para aquecer o detector (material em loop). */
  warmup?: number;
}

/** Compressor feed-forward com detector de pico ligado em estéreo. */
export function compress(buf: Stereo, o: CompressOpts): Stereo {
  const n = buf.length;
  const aA = Math.exp(-1 / (o.attack * SR));
  const aR = Math.exp(-1 / (o.release * SR));
  const makeup = db(o.makeupDb ?? 0);
  const slope = 1 - 1 / o.ratio;
  let env = 0;
  const step = (i: number): void => {
    const x = Math.max(Math.abs(buf.l[i]), Math.abs(buf.r[i]));
    env = x > env ? aA * env + (1 - aA) * x : aR * env + (1 - aR) * x;
  };
  if (o.warmup) for (let i = Math.max(0, n - sec(o.warmup)); i < n; i++) step(i);
  for (let i = 0; i < n; i++) {
    step(i);
    const over = toDb(env) - o.threshDb;
    const g = (over > 0 ? db(-over * slope) : 1) * makeup;
    buf.l[i] *= g;
    buf.r[i] *= g;
  }
  return buf;
}

/** Limitador suave sem memória (waveshaper): abaixo do joelho é linear, acima satura até o teto. */
export function softLimit(buf: Stereo, ceiling = db(-1), knee = 0.6): Stereo {
  const k = knee * ceiling;
  const span = ceiling - k;
  const shape = (x: number): number => {
    const a = Math.abs(x);
    if (a <= k) return x;
    const y = k + span * Math.tanh((a - k) / span);
    return x < 0 ? -y : y;
  };
  for (let i = 0; i < buf.length; i++) {
    buf.l[i] = shape(buf.l[i]);
    buf.r[i] = shape(buf.r[i]);
  }
  return buf;
}

export interface Stats {
  peak: number;
  rms: number;
}

export function stats(buf: Stereo): Stats {
  let peak = 0;
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const a = Math.abs(buf.l[i]);
    const b = Math.abs(buf.r[i]);
    if (a > peak) peak = a;
    if (b > peak) peak = b;
    sum += buf.l[i] * buf.l[i] + buf.r[i] * buf.r[i];
  }
  return { peak, rms: Math.sqrt(sum / Math.max(1, buf.length * 2)) };
}

/** Escala o buffer para que o pico fique em `peakDb` dBFS. */
export function normalizePeak(buf: Stereo, peakDb = -1): Stereo {
  const { peak } = stats(buf);
  if (peak > 1e-9) buf.scale(db(peakDb) / peak);
  return buf;
}

/** Escala o buffer para que o RMS fique em `rmsDb` dBFS. */
export function normalizeRms(buf: Stereo, rmsDb: number): Stereo {
  const { rms } = stats(buf);
  if (rms > 1e-9) buf.scale(db(rmsDb) / rms);
  return buf;
}

/** Fades lineares nas pontas (sons que não fazem loop). */
export function fadeEdges(buf: Stereo, inSec: number, outSec: number): Stereo {
  const a = Math.min(sec(inSec), buf.length);
  const b = Math.min(sec(outSec), buf.length);
  for (let i = 0; i < a; i++) {
    const g = i / a;
    buf.l[i] *= g;
    buf.r[i] *= g;
  }
  for (let i = 0; i < b; i++) {
    const g = i / b;
    const j = buf.length - 1 - i;
    buf.l[j] *= g;
    buf.r[j] *= g;
  }
  return buf;
}

/** Dobra a cauda (tudo o que passa de `loopLen`) sobre o início: o loop emenda com a reverberação intacta. */
export function foldTail(buf: Stereo, loopLen: number): Stereo {
  const out = new Stereo(loopLen);
  for (let i = 0; i < buf.length; i++) {
    const j = i % loopLen;
    out.l[j] += buf.l[i];
    out.r[j] += buf.r[i];
  }
  return out;
}

/** Remove silêncio do fim (mantendo uma pequena margem). */
export function trimTail(buf: Stereo, threshold = db(-70), padSec = 0.03): Stereo {
  let last = buf.length - 1;
  while (last > 0 && Math.abs(buf.l[last]) < threshold && Math.abs(buf.r[last]) < threshold) last--;
  const n = Math.min(buf.length, last + 1 + sec(padSec));
  const out = new Stereo(n);
  out.l.set(buf.l.subarray(0, n));
  out.r.set(buf.r.subarray(0, n));
  return fadeEdges(out, 0, Math.min(padSec, 0.02));
}

/** WAV PCM de 32 bits em ponto flutuante, estéreo intercalado. */
export function encodeWav(buf: Stereo): Buffer {
  const dataBytes = buf.length * 8;
  const out = Buffer.alloc(44 + dataBytes);
  out.write('RIFF', 0, 'ascii');
  out.writeUInt32LE(36 + dataBytes, 4);
  out.write('WAVE', 8, 'ascii');
  out.write('fmt ', 12, 'ascii');
  out.writeUInt32LE(16, 16);
  out.writeUInt16LE(3, 20); // IEEE float
  out.writeUInt16LE(2, 22);
  out.writeUInt32LE(SR, 24);
  out.writeUInt32LE(SR * 8, 28);
  out.writeUInt16LE(8, 32);
  out.writeUInt16LE(32, 34);
  out.write('data', 36, 'ascii');
  out.writeUInt32LE(dataBytes, 40);
  let p = 44;
  for (let i = 0; i < buf.length; i++) {
    out.writeFloatLE(buf.l[i], p);
    out.writeFloatLE(buf.r[i], p + 4);
    p += 8;
  }
  return out;
}
