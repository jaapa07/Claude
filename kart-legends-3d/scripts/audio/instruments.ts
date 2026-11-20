/**
 * Instrumentos do sintetizador offline: vozes subtrativas, FM e bateria sintetizada.
 * Cada voz devolve um sinal mono (nota + release) que o sequenciador mistura no barramento.
 */
import { SR, TAU, Svf, clamp, filterMono, makeRng, oscSample, sec, whiteNoise, type Rng, type Wave } from './dsp';

export interface Env {
  a: number;
  d: number;
  s: number;
  r: number;
}

/** Envelope ADSR com decaimento/release exponenciais; termina exatamente em zero. */
export function envAt(t: number, dur: number, e: Env): number {
  const a = Math.max(e.a, 0.0005);
  const held = (x: number): number =>
    x < a ? x / a : e.s + (1 - e.s) * Math.exp(-(x - a) / Math.max(1e-4, e.d * 0.35));
  if (t <= dur) return held(t);
  const rt = t - dur;
  if (rt >= e.r) return 0;
  return held(dur) * Math.exp(-rt / (e.r * 0.3)) * (1 - rt / e.r);
}

export type Voice = (freq: number, dur: number, vel: number, rng: Rng) => Float32Array;

interface OscDef {
  wave: Wave;
  ratio?: number;
  /** Desafinação em cents. */
  detune?: number;
  gain: number;
  pw?: number;
}

interface SubParams {
  oscs: OscDef[];
  noise?: number;
  amp: Env;
  filter?: { base: number; envAmt: number; keyTrack?: number; q?: number; env: Env };
  vibrato?: { rate: number; cents: number; delay: number };
  drive?: number;
}

/** Voz subtrativa: osciladores → filtro passa-baixas com envelope → amplificador. */
export function subVoice(p: SubParams): Voice {
  return (freq, dur, vel, rng) => {
    const total = sec(dur + p.amp.r);
    const out = new Float32Array(total);
    const phases = p.oscs.map(() => rng());
    const mults = p.oscs.map((o) => (o.ratio ?? 1) * 2 ** ((o.detune ?? 0) / 1200));
    const svf = new Svf();
    const flt = p.filter;
    const driveNorm = p.drive ? 1 / Math.tanh(p.drive) : 1;
    for (let i = 0; i < total; i++) {
      const t = i / SR;
      let vib = 1;
      if (p.vibrato && t > p.vibrato.delay) {
        const depth = p.vibrato.cents * Math.min(1, (t - p.vibrato.delay) / 0.25);
        vib = 2 ** ((depth * Math.sin(TAU * p.vibrato.rate * t)) / 1200);
      }
      let x = 0;
      for (let k = 0; k < p.oscs.length; k++) {
        const o = p.oscs[k];
        const dt = Math.min(0.45, (freq * mults[k] * vib) / SR);
        let ph = phases[k] + dt;
        if (ph >= 1) ph -= 1;
        phases[k] = ph;
        x += oscSample(o.wave, ph, dt, o.pw) * o.gain;
      }
      if (p.noise) x += (rng() * 2 - 1) * p.noise;
      if (flt) {
        if ((i & 15) === 0) {
          const fe = envAt(t, dur, flt.env);
          svf.set(clamp(flt.base + freq * (flt.keyTrack ?? 0) + flt.envAmt * fe * (0.45 + 0.55 * vel), 40, 17000), flt.q ?? 0.8);
        }
        x = svf.process(x);
      }
      if (p.drive) x = Math.tanh(x * p.drive) * driveNorm;
      out[i] = x * envAt(t, dur, p.amp) * vel;
    }
    return out;
  };
}

interface FmParams {
  ratio: number;
  index: number;
  indexDecay: number;
  indexSustain?: number;
  amp: Env;
  /** Segundo operador opcional (brilho do ataque). */
  ratio2?: number;
  index2?: number;
  index2Decay?: number;
}

/** Voz FM de dois (ou três) operadores: sinos, pianos elétricos, marimbas. */
export function fmVoice(p: FmParams): Voice {
  return (freq, dur, vel) => {
    const total = sec(dur + p.amp.r);
    const out = new Float32Array(total);
    const w = (TAU * freq) / SR;
    for (let i = 0; i < total; i++) {
      const t = i / SR;
      const idx = (p.index * Math.exp(-t / p.indexDecay) + (p.indexSustain ?? 0)) * (0.5 + 0.5 * vel);
      let mod = idx * Math.sin(w * p.ratio * i);
      if (p.ratio2 && p.index2) {
        mod += p.index2 * Math.exp(-t / (p.index2Decay ?? 0.05)) * Math.sin(w * p.ratio2 * i);
      }
      out[i] = Math.sin(w * i + mod) * envAt(t, dur, p.amp) * vel;
    }
    return out;
  };
}

export const VOICES = {
  /** Solo suave (flauta/ocarina sintética) para o tema do menu. */
  softLead: subVoice({
    oscs: [
      { wave: 'tri', gain: 0.62 },
      { wave: 'sine', ratio: 2, gain: 0.16 },
      { wave: 'saw', gain: 0.2, detune: 4 },
    ],
    noise: 0.015,
    amp: { a: 0.035, d: 0.4, s: 0.78, r: 0.28 },
    filter: { base: 700, envAmt: 2600, keyTrack: 1.5, q: 0.8, env: { a: 0.05, d: 0.6, s: 0.6, r: 0.3 } },
    vibrato: { rate: 5.2, cents: 13, delay: 0.28 },
  }),
  /** Solo brilhante e alegre para Aurora. */
  brightLead: subVoice({
    oscs: [
      { wave: 'saw', gain: 0.4, detune: -7 },
      { wave: 'saw', gain: 0.4, detune: 7 },
      { wave: 'square', gain: 0.22, pw: 0.42 },
    ],
    amp: { a: 0.006, d: 0.18, s: 0.72, r: 0.14 },
    filter: { base: 900, envAmt: 5200, keyTrack: 2, q: 1.1, env: { a: 0.004, d: 0.35, s: 0.45, r: 0.15 } },
    vibrato: { rate: 5.8, cents: 10, delay: 0.22 },
  }),
  /** Solo synthwave (pulso estreito + serra) para Eclipse. */
  synthLead: subVoice({
    oscs: [
      { wave: 'saw', gain: 0.45, detune: -9 },
      { wave: 'square', gain: 0.35, pw: 0.3, detune: 6 },
      { wave: 'saw', ratio: 2, gain: 0.12, detune: 3 },
    ],
    amp: { a: 0.01, d: 0.25, s: 0.75, r: 0.22 },
    filter: { base: 600, envAmt: 3800, keyTrack: 2, q: 1.6, env: { a: 0.01, d: 0.45, s: 0.5, r: 0.2 } },
    vibrato: { rate: 5.5, cents: 14, delay: 0.3 },
  }),
  /** Sino FM cristalino. */
  bell: fmVoice({ ratio: 3.5, index: 2.6, indexDecay: 0.22, amp: { a: 0.002, d: 1.1, s: 0, r: 0.6 } }),
  /** Piano elétrico FM. */
  epiano: fmVoice({
    ratio: 1,
    index: 1.5,
    indexDecay: 0.35,
    indexSustain: 0.25,
    ratio2: 14,
    index2: 0.6,
    index2Decay: 0.04,
    amp: { a: 0.003, d: 1.6, s: 0.12, r: 0.45 },
  }),
  /** Marimba/kalimba FM para arpejos ensolarados. */
  marimba: fmVoice({ ratio: 4, index: 1.4, indexDecay: 0.05, amp: { a: 0.002, d: 0.35, s: 0, r: 0.2 } }),
  /** Pluck subtrativo com filtro rápido. */
  pluck: subVoice({
    oscs: [
      { wave: 'saw', gain: 0.5 },
      { wave: 'square', gain: 0.3, pw: 0.5, detune: 8 },
    ],
    amp: { a: 0.002, d: 0.28, s: 0, r: 0.12 },
    filter: { base: 350, envAmt: 4200, keyTrack: 1, q: 1.4, env: { a: 0.002, d: 0.16, s: 0, r: 0.1 } },
  }),
  /** Pad quente de três serras desafinadas. */
  pad: subVoice({
    oscs: [
      { wave: 'saw', gain: 0.3, detune: -11 },
      { wave: 'saw', gain: 0.3 },
      { wave: 'saw', gain: 0.3, detune: 11 },
      { wave: 'tri', ratio: 2, gain: 0.1 },
    ],
    amp: { a: 0.3, d: 0.6, s: 0.85, r: 0.7 },
    filter: { base: 650, envAmt: 900, keyTrack: 1, q: 0.7, env: { a: 0.5, d: 1.2, s: 0.7, r: 0.7 } },
  }),
  /** Acorde curto (stab) para contratempos e pad "gated". */
  stab: subVoice({
    oscs: [
      { wave: 'saw', gain: 0.34, detune: -8 },
      { wave: 'saw', gain: 0.34, detune: 8 },
      { wave: 'square', gain: 0.2, pw: 0.4 },
    ],
    amp: { a: 0.004, d: 0.14, s: 0.35, r: 0.09 },
    filter: { base: 500, envAmt: 3000, keyTrack: 1, q: 0.9, env: { a: 0.003, d: 0.12, s: 0.25, r: 0.08 } },
  }),
  /** Baixo redondo (menu). */
  roundBass: subVoice({
    oscs: [
      { wave: 'tri', gain: 0.6 },
      { wave: 'sine', gain: 0.4 },
      { wave: 'saw', gain: 0.14 },
    ],
    amp: { a: 0.008, d: 0.35, s: 0.6, r: 0.1 },
    filter: { base: 220, envAmt: 700, keyTrack: 2, q: 0.8, env: { a: 0.004, d: 0.22, s: 0.3, r: 0.1 } },
  }),
  /** Baixo sintetizado com ataque (corridas). */
  synthBass: subVoice({
    oscs: [
      { wave: 'saw', gain: 0.5 },
      { wave: 'square', gain: 0.25, pw: 0.45, detune: 5 },
      { wave: 'sine', ratio: 0.5, gain: 0.3 },
    ],
    amp: { a: 0.004, d: 0.2, s: 0.65, r: 0.05 },
    filter: { base: 150, envAmt: 1700, keyTrack: 2, q: 1.5, env: { a: 0.003, d: 0.13, s: 0.2, r: 0.06 } },
    drive: 1.6,
  }),
  /** Metais sintéticos para a fanfarra. */
  brass: subVoice({
    oscs: [
      { wave: 'saw', gain: 0.42, detune: -5 },
      { wave: 'saw', gain: 0.42, detune: 5 },
      { wave: 'square', gain: 0.12, pw: 0.5 },
    ],
    amp: { a: 0.03, d: 0.25, s: 0.82, r: 0.16 },
    filter: { base: 350, envAmt: 3400, keyTrack: 2, q: 0.9, env: { a: 0.06, d: 0.35, s: 0.6, r: 0.16 } },
    vibrato: { rate: 5.5, cents: 8, delay: 0.35 },
  }),
} satisfies Record<string, Voice>;

export type VoiceName = keyof typeof VOICES;

// ---------------------------------------------------------------------------------------------
// Bateria
// ---------------------------------------------------------------------------------------------

export type DrumName =
  | 'kick'
  | 'kickEl'
  | 'snare'
  | 'snareEl'
  | 'hat'
  | 'hatOpen'
  | 'clap'
  | 'rim'
  | 'shaker'
  | 'tomLo'
  | 'tomMid'
  | 'tomHi'
  | 'crash'
  | 'timpani';

function kick(electro: boolean): Float32Array {
  const n = sec(electro ? 0.42 : 0.34);
  const out = new Float32Array(n);
  const rng = makeRng(11);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const f = electro ? 44 + 170 * Math.exp(-t / 0.032) : 50 + 115 * Math.exp(-t / 0.04);
    ph += f / SR;
    const body = Math.sin(TAU * ph) * Math.exp(-t / (electro ? 0.16 : 0.12));
    const click = (rng() * 2 - 1) * Math.exp(-t / 0.003) * 0.35;
    out[i] = Math.tanh((body + click) * 1.8) * 0.9 * Math.min(1, (n - i) / 400);
  }
  return out;
}

function snare(electro: boolean): Float32Array {
  const n = sec(electro ? 0.32 : 0.24);
  const rng = makeRng(23);
  const noise = filterMono(whiteNoise(n, rng), 'hp', electro ? 1800 : 1300, 0.8);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const tone =
      Math.sin(TAU * (185 + 60 * Math.exp(-t / 0.02)) * t) * 0.55 * Math.exp(-t / 0.07) +
      Math.sin(TAU * 331 * t) * 0.25 * Math.exp(-t / 0.045);
    const nz = noise[i] * Math.exp(-t / (electro ? 0.11 : 0.075)) * 0.8;
    out[i] = Math.tanh((tone + nz) * 1.4) * 0.8 * Math.min(1, (n - i) / 400);
  }
  return out;
}

function hat(decay: number, len: number, seed: number): Float32Array {
  const n = sec(len);
  const rng = makeRng(seed);
  const out = whiteNoise(n, rng);
  // Componente metálica: quadradas inarmônicas, como num prato eletrônico clássico.
  const freqs = [3140, 4210, 5430, 6790, 8110, 9870];
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (const f of freqs) m += Math.sin(TAU * f * (i / SR)) > 0 ? 1 : -1;
    out[i] = out[i] * 0.6 + (m / freqs.length) * 0.7;
  }
  filterMono(out, 'hp', 7200, 0.9);
  for (let i = 0; i < n; i++) out[i] *= Math.exp(-(i / SR) / decay) * Math.min(1, i / 20) * Math.min(1, (n - i) / 300);
  return out;
}

function clap(): Float32Array {
  const n = sec(0.28);
  const rng = makeRng(37);
  const out = filterMono(whiteNoise(n, rng), 'bp', 1350, 1.1);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let e = 0;
    for (const off of [0, 0.011, 0.022]) if (t >= off) e = Math.max(e, Math.exp(-(t - off) / 0.008));
    if (t >= 0.03) e = Math.max(e, Math.exp(-(t - 0.03) / 0.07));
    out[i] *= e * 1.6 * Math.min(1, (n - i) / 300);
  }
  return out;
}

function rim(): Float32Array {
  const n = sec(0.06);
  const out = new Float32Array(n);
  const rng = makeRng(41);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] =
      (Math.sin(TAU * 820 * t) * 0.6 + Math.sin(TAU * 1730 * t) * 0.3 + (rng() * 2 - 1) * 0.3 * Math.exp(-t / 0.002)) *
      Math.exp(-t / 0.012);
  }
  return out;
}

function shaker(): Float32Array {
  const n = sec(0.09);
  const out = filterMono(whiteNoise(n, makeRng(43)), 'bp', 6500, 1.2);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] *= Math.min(1, t / 0.012) * Math.exp(-Math.max(0, t - 0.012) / 0.022) * 0.9;
  }
  return out;
}

function tom(freq: number, seed: number): Float32Array {
  const n = sec(0.32);
  const out = new Float32Array(n);
  const rng = makeRng(seed);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (freq * (1 + 0.5 * Math.exp(-t / 0.03))) / SR;
    out[i] =
      (Math.sin(TAU * ph) * Math.exp(-t / 0.11) + (rng() * 2 - 1) * 0.2 * Math.exp(-t / 0.01)) *
      0.9 *
      Math.min(1, (n - i) / 400);
  }
  return out;
}

function crash(): Float32Array {
  const n = sec(1.6);
  const out = whiteNoise(n, makeRng(53));
  const freqs = [2870, 3960, 5210, 6130, 7450, 9020, 11300];
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (const f of freqs) m += Math.sin(TAU * f * (i / SR) + f);
    out[i] = out[i] * 0.7 + (m / freqs.length) * 0.5;
  }
  filterMono(out, 'hp', 3800, 0.7);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    out[i] *= (0.6 * Math.exp(-t / 0.45) + 0.4 * Math.exp(-t / 0.12)) * Math.min(1, i / 30) * Math.min(1, (n - i) / 2000);
  }
  return out;
}

function timpani(): Float32Array {
  const n = sec(0.9);
  const out = new Float32Array(n);
  const rng = makeRng(59);
  const noise = filterMono(whiteNoise(n, rng), 'lp', 900, 0.7);
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    ph += (98 * (1 + 0.12 * Math.exp(-t / 0.05))) / SR;
    out[i] =
      (Math.sin(TAU * ph) * 0.8 * Math.exp(-t / 0.3) +
        Math.sin(TAU * ph * 1.5) * 0.25 * Math.exp(-t / 0.18) +
        noise[i] * 0.5 * Math.exp(-t / 0.025)) *
      Math.min(1, (n - i) / 2000);
  }
  return out;
}

const drumCache = new Map<DrumName, Float32Array>();

/** Amostra de bateria sintetizada (uma por peça, em cache; determinística). */
export function drum(name: DrumName): Float32Array {
  let d = drumCache.get(name);
  if (d) return d;
  switch (name) {
    case 'kick': d = kick(false); break;
    case 'kickEl': d = kick(true); break;
    case 'snare': d = snare(false); break;
    case 'snareEl': d = snare(true); break;
    case 'hat': d = hat(0.028, 0.12, 29); break;
    case 'hatOpen': d = hat(0.16, 0.5, 31); break;
    case 'clap': d = clap(); break;
    case 'rim': d = rim(); break;
    case 'shaker': d = shaker(); break;
    case 'tomLo': d = tom(95, 61); break;
    case 'tomMid': d = tom(135, 67); break;
    case 'tomHi': d = tom(185, 71); break;
    case 'crash': d = crash(); break;
    case 'timpani': d = timpani(); break;
  }
  drumCache.set(name, d);
  return d;
}
