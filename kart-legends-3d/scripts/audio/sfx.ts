/**
 * Efeitos sonoros, loops de corrida e ambiências — todos sintetizados aqui, sem amostras externas.
 * Loops e ambiências usam ruído filtrado periódico e modulações com número inteiro de ciclos,
 * de modo que emendam sem clique.
 */
import type { AmbienceId, LoopId, SynthSfxId as SfxId } from '../../src/game/audio/audioIds';
import {
  SR,
  Stereo,
  TAU,
  filterMono,
  makeRng,
  midiHz,
  mixMono,
  oscSample,
  reverb,
  sec,
  seedOf,
  whiteNoise,
  type Curve,
  type FilterType,
  type Rng,
  type Wave,
} from './dsp';

// ---------------------------------------------------------------------------------------------
// Blocos básicos
// ---------------------------------------------------------------------------------------------

interface Shape {
  /** Início em segundos. */
  t?: number;
  dur: number;
  vol?: number;
  attack?: number;
  /** Constante de tempo do decaimento exponencial; sem ela o som sustenta. */
  decay?: number;
  release?: number;
  pan?: number;
  wrap?: boolean;
}

function shapeAt(t: number, o: Shape): number {
  const attack = o.attack ?? 0.003;
  const release = o.release ?? Math.min(0.012, o.dur / 4);
  const a = Math.min(1, t / attack);
  const d = o.decay ? Math.exp(-t / o.decay) : 1;
  const r = Math.min(1, Math.max(0, (o.dur - t) / release));
  return a * d * r * (o.vol ?? 1);
}

interface ToneOpts extends Shape {
  f0: number;
  f1?: number;
  wave?: Wave;
  pw?: number;
  vib?: { hz: number; cents: number };
  fm?: { ratio: number; index: number; decay?: number };
}

/** Oscilador com varredura exponencial de frequência, vibrato e FM opcionais. */
function tone(dst: Stereo, o: ToneOpts): void {
  const n = sec(o.dur);
  const out = new Float32Array(n);
  const f1 = o.f1 ?? o.f0;
  const wave = o.wave ?? 'sine';
  let ph = 0;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    let f = o.f0 * (f1 / o.f0) ** (t / o.dur);
    if (o.vib) f *= 2 ** ((o.vib.cents * Math.sin(TAU * o.vib.hz * t)) / 1200);
    const dt = Math.min(0.45, f / SR);
    ph += dt;
    if (ph >= 1) ph -= 1;
    let x: number;
    if (o.fm) {
      const idx = o.fm.index * (o.fm.decay ? Math.exp(-t / o.fm.decay) : 1);
      x = Math.sin(TAU * ph + idx * Math.sin(TAU * ph * o.fm.ratio));
    } else {
      x = oscSample(wave, ph, dt, o.pw);
    }
    out[i] = x * shapeAt(t, o);
  }
  mixMono(dst, out, sec(o.t ?? 0), 1, o.pan ?? 0, o.wrap);
}

interface NoiseOpts extends Shape {
  type: FilterType;
  f0: number;
  f1?: number;
  q?: number;
}

/** Rajada de ruído filtrado com varredura de corte. */
function noise(dst: Stereo, rng: Rng, o: NoiseOpts): void {
  const n = sec(o.dur);
  const f1 = o.f1 ?? o.f0;
  const cutoff: Curve = f1 === o.f0 ? o.f0 : (i, len) => o.f0 * (f1 / o.f0) ** (i / len);
  const out = filterMono(whiteNoise(n, rng), o.type, cutoff, o.q ?? 0.8);
  for (let i = 0; i < n; i++) out[i] *= shapeAt(i / SR, o);
  mixMono(dst, out, sec(o.t ?? 0), 1, o.pan ?? 0, o.wrap);
}

/** Sino FM curto (brilhos, coletas, cristais). */
function ping(dst: Stereo, t: number, freq: number, dur: number, vol: number, pan = 0, ratio = 3.5, index = 2): void {
  tone(dst, { t, dur, f0: freq, vol, decay: dur / 3.5, attack: 0.002, pan, fm: { ratio, index, decay: dur / 5 } });
}

/** Nuvem de brilhos aleatórios. */
function sparkle(dst: Stereo, rng: Rng, t: number, dur: number, count: number, fLo: number, fHi: number, vol: number): void {
  for (let k = 0; k < count; k++) {
    const f = fLo * (fHi / fLo) ** rng();
    ping(dst, t + rng() * dur, f, 0.12 + rng() * 0.2, vol * (0.4 + 0.6 * rng()), rng() * 1.6 - 0.8, 2 + rng() * 3, 1.2);
  }
}

/** Soma uma cauda curta de reverb (o buffer precisa ter espaço para ela). */
function addVerb(dst: Stereo, room: number, gain: number): void {
  dst.add(reverb(dst, { room, damp: 0.4, hp: 300 }), gain);
}

const hz = (note: number): number => midiHz(note);

// ---------------------------------------------------------------------------------------------
// Efeitos de disparo único
// ---------------------------------------------------------------------------------------------

type SfxBuilder = (rng: Rng) => Stereo;

function turbo(level: 1 | 2 | 3): SfxBuilder {
  return (rng) => {
    const dur = [0.5, 0.85, 1.35][level - 1];
    const top = [1700, 3600, 7500][level - 1];
    const b = Stereo.seconds(dur + 0.5);
    // Sopro principal: quanto maior o nível, mais alto vai o corte e mais demora a cair.
    noise(b, rng, { dur, type: 'bp', f0: 350, f1: top, q: 1.2, vol: 0.8, attack: 0.012, decay: dur * 0.55, pan: -0.15 });
    noise(b, rng, { dur, type: 'lp', f0: 500, f1: top * 0.6, vol: 0.5, attack: 0.02, decay: dur * 0.5, pan: 0.15 });
    tone(b, { dur: dur * 0.8, f0: 180 + 40 * level, f1: 330 + 260 * level, wave: 'saw', vol: 0.22, attack: 0.01, decay: dur * 0.4 });
    if (level >= 2) {
      tone(b, { dur: dur * 0.7, f0: 600, f1: 1500 * level, wave: 'square', pw: 0.3, vol: 0.1, attack: 0.02, decay: dur * 0.3 });
      sparkle(b, rng, 0.05, dur * 0.7, 5 * level, 2200, 5200 * (level - 0.5), 0.12);
    }
    if (level === 3) {
      tone(b, { dur: 0.5, f0: 110, f1: 42, vol: 0.75, decay: 0.16 });
      noise(b, rng, { t: 0.1, dur: dur - 0.1, type: 'hp', f0: 4000, f1: 9000, vol: 0.3, attack: 0.25, decay: 0.5 });
      for (let k = 0; k < 4; k++) ping(b, 0.12 + k * 0.09, hz(84 + k * 4), 0.45, 0.16, k % 2 ? 0.5 : -0.5);
    }
    addVerb(b, 0.4, 0.5);
    return b;
  };
}

const SFX: Record<SfxId, SfxBuilder> = {
  ui_move: () => {
    const b = Stereo.seconds(0.12);
    tone(b, { dur: 0.07, f0: 1250, f1: 1400, wave: 'tri', vol: 0.8, decay: 0.022 });
    tone(b, { dur: 0.05, f0: 2500, vol: 0.2, decay: 0.012 });
    return b;
  },
  ui_select: () => {
    const b = Stereo.seconds(0.4);
    tone(b, { dur: 0.09, f0: hz(76), wave: 'tri', vol: 0.8, decay: 0.05 });
    tone(b, { t: 0.07, dur: 0.22, f0: hz(83), wave: 'tri', vol: 0.9, decay: 0.07 });
    ping(b, 0.07, hz(95), 0.25, 0.25);
    return b;
  },
  ui_back: () => {
    const b = Stereo.seconds(0.35);
    tone(b, { dur: 0.09, f0: hz(79), wave: 'tri', vol: 0.8, decay: 0.05 });
    tone(b, { t: 0.07, dur: 0.2, f0: hz(72), f1: hz(71), wave: 'tri', vol: 0.85, decay: 0.07 });
    return b;
  },
  ui_error: () => {
    const b = Stereo.seconds(0.4);
    for (const t of [0, 0.13]) {
      tone(b, { t, dur: 0.1, f0: 155, wave: 'square', pw: 0.35, vol: 0.6, decay: 0.2 });
      tone(b, { t, dur: 0.1, f0: 164, wave: 'saw', vol: 0.35, decay: 0.2 });
    }
    return b;
  },
  countdown_beep: () => {
    const b = Stereo.seconds(0.4);
    tone(b, { dur: 0.22, f0: 587.33, wave: 'square', pw: 0.5, vol: 0.35, decay: 0.14, release: 0.03 });
    tone(b, { dur: 0.22, f0: 587.33, vol: 0.7, decay: 0.14, release: 0.03 });
    return b;
  },
  countdown_go: (rng) => {
    const b = Stereo.seconds(1.5);
    for (const [f, v] of [[1174.66, 0.7], [1760, 0.35], [587.33, 0.3]] as const) {
      tone(b, { dur: 0.75, f0: f, vol: v, decay: 0.3, release: 0.1 });
    }
    tone(b, { dur: 0.75, f0: 1174.66, wave: 'square', vol: 0.25, decay: 0.25, release: 0.1 });
    noise(b, rng, { dur: 0.5, type: 'hp', f0: 3000, f1: 9000, vol: 0.3, attack: 0.01, decay: 0.12 });
    sparkle(b, rng, 0.02, 0.4, 8, 2500, 7000, 0.1);
    addVerb(b, 0.5, 0.5);
    return b;
  },
  finish: (rng) => {
    const b = Stereo.seconds(2.6);
    const notes = [72, 76, 79, 84, 88];
    notes.forEach((m, k) => {
      const t = k * 0.11;
      tone(b, { t, dur: k === notes.length - 1 ? 1 : 0.2, f0: hz(m), wave: 'saw', vol: 0.3, decay: 0.3, release: 0.08 });
      ping(b, t, hz(m + 12), 0.6, 0.3, (k - 2) * 0.3);
    });
    for (const m of [72, 76, 79]) tone(b, { t: 0.44, dur: 1.1, f0: hz(m), wave: 'tri', vol: 0.22, decay: 0.5, release: 0.2 });
    noise(b, rng, { dur: 1.2, type: 'hp', f0: 2500, f1: 8000, vol: 0.25, attack: 0.3, decay: 0.5 });
    sparkle(b, rng, 0.4, 0.9, 16, 3000, 9000, 0.08);
    addVerb(b, 0.6, 0.6);
    return b;
  },
  lap: () => {
    const b = Stereo.seconds(1.3);
    ping(b, 0, hz(88), 0.5, 0.7, -0.2);
    ping(b, 0.12, hz(93), 0.8, 0.8, 0.2);
    tone(b, { t: 0.12, dur: 0.4, f0: hz(81), wave: 'tri', vol: 0.2, decay: 0.15 });
    addVerb(b, 0.45, 0.4);
    return b;
  },
  final_lap: (rng) => {
    const b = Stereo.seconds(1.8);
    [86, 86, 91, 95].forEach((m, k) => {
      const t = [0, 0.1, 0.2, 0.34][k];
      ping(b, t, hz(m), k === 3 ? 0.9 : 0.25, 0.75, (k - 1.5) * 0.3);
      tone(b, { t, dur: k === 3 ? 0.5 : 0.09, f0: hz(m - 12), wave: 'square', pw: 0.3, vol: 0.22, decay: 0.2 });
    });
    noise(b, rng, { t: 0.3, dur: 0.6, type: 'hp', f0: 5000, vol: 0.12, attack: 0.02, decay: 0.2 });
    addVerb(b, 0.45, 0.45);
    return b;
  },
  collision: (rng) => {
    const b = Stereo.seconds(0.45);
    tone(b, { dur: 0.22, f0: 130, f1: 48, vol: 1, decay: 0.07 });
    noise(b, rng, { dur: 0.16, type: 'lp', f0: 2600, f1: 500, vol: 0.8, attack: 0.001, decay: 0.04 });
    noise(b, rng, { dur: 0.05, type: 'bp', f0: 1800, q: 2, vol: 0.5, attack: 0.001, decay: 0.012, pan: 0.2 });
    tone(b, { dur: 0.12, f0: 410, vol: 0.2, decay: 0.03, fm: { ratio: 2.76, index: 3, decay: 0.03 } });
    return b;
  },
  collision_heavy: (rng) => {
    const b = Stereo.seconds(1.1);
    tone(b, { dur: 0.45, f0: 110, f1: 34, vol: 1, decay: 0.13 });
    tone(b, { dur: 0.2, f0: 220, f1: 60, wave: 'tri', vol: 0.5, decay: 0.05 });
    noise(b, rng, { dur: 0.4, type: 'lp', f0: 4200, f1: 300, vol: 0.9, attack: 0.001, decay: 0.09 });
    // Lataria: parciais inarmônicas metálicas.
    for (const [f, pan] of [[523, -0.4], [811, 0.3], [1307, -0.1], [1973, 0.5]] as const) {
      tone(b, { t: 0.01, dur: 0.4, f0: f, vol: 0.14, decay: 0.09, pan, fm: { ratio: 1.41, index: 2.5, decay: 0.08 } });
    }
    noise(b, rng, { t: 0.09, dur: 0.25, type: 'bp', f0: 2400, f1: 1200, q: 1.5, vol: 0.35, attack: 0.002, decay: 0.07, pan: -0.3 });
    addVerb(b, 0.35, 0.5);
    return b;
  },
  jump: (rng) => {
    const b = Stereo.seconds(0.5);
    tone(b, { dur: 0.3, f0: 230, f1: 760, wave: 'tri', vol: 0.6, attack: 0.01, decay: 0.16 });
    tone(b, { dur: 0.3, f0: 460, f1: 1520, vol: 0.2, attack: 0.01, decay: 0.12 });
    noise(b, rng, { dur: 0.35, type: 'bp', f0: 500, f1: 3200, q: 1.4, vol: 0.5, attack: 0.03, decay: 0.14 });
    return b;
  },
  land: (rng) => {
    const b = Stereo.seconds(0.45);
    tone(b, { dur: 0.2, f0: 150, f1: 52, vol: 1, decay: 0.055 });
    noise(b, rng, { dur: 0.14, type: 'lp', f0: 1500, f1: 350, vol: 0.6, attack: 0.001, decay: 0.035 });
    // Pneu comprimindo: chiado curto de borracha.
    noise(b, rng, { t: 0.03, dur: 0.16, type: 'bp', f0: 1900, f1: 1300, q: 7, vol: 0.5, attack: 0.01, decay: 0.05, pan: 0.2 });
    return b;
  },
  item_pickup: () => {
    const b = Stereo.seconds(1);
    [84, 88, 91, 96].forEach((m, k) => ping(b, k * 0.05, hz(m), 0.4, 0.6, (k - 1.5) * 0.35));
    tone(b, { dur: 0.2, f0: hz(72), f1: hz(84), wave: 'tri', vol: 0.3, decay: 0.08 });
    addVerb(b, 0.4, 0.4);
    return b;
  },
  item_roll: () => {
    const b = Stereo.seconds(1.5);
    // Roleta: cliques tonais que desaceleram, alternando alturas.
    const scale = [84, 79, 88, 81, 91, 86];
    let t = 0;
    let gap = 0.05;
    let k = 0;
    while (t < 1.25) {
      tone(b, { t, dur: 0.045, f0: hz(scale[k % scale.length]), wave: 'square', pw: 0.25, vol: 0.5, decay: 0.014, pan: k % 2 ? 0.3 : -0.3 });
      tone(b, { t, dur: 0.03, f0: hz(scale[k % scale.length] + 12), vol: 0.25, decay: 0.008 });
      t += gap;
      gap *= 1.055;
      k++;
    }
    return b;
  },
  turbo_1: turbo(1),
  turbo_2: turbo(2),
  turbo_3: turbo(3),
  boost_pad: (rng) => {
    const b = Stereo.seconds(1);
    tone(b, { dur: 0.32, f0: 300, f1: 2400, wave: 'saw', vol: 0.4, attack: 0.005, decay: 0.14 });
    tone(b, { t: 0.03, dur: 0.3, f0: 450, f1: 3600, wave: 'square', pw: 0.3, vol: 0.2, attack: 0.005, decay: 0.12, pan: 0.3 });
    noise(b, rng, { dur: 0.55, type: 'bp', f0: 600, f1: 5000, q: 1, vol: 0.7, attack: 0.02, decay: 0.2 });
    tone(b, { dur: 0.25, f0: 120, f1: 50, vol: 0.5, decay: 0.08 });
    addVerb(b, 0.35, 0.4);
    return b;
  },
  // Pulso: disparo de energia — "piu" descendente com corpo grave.
  item_pulso: (rng) => {
    const b = Stereo.seconds(0.9);
    tone(b, { dur: 0.35, f0: 2400, f1: 260, wave: 'square', pw: 0.3, vol: 0.5, decay: 0.12 });
    tone(b, { dur: 0.35, f0: 1200, f1: 130, vol: 0.5, decay: 0.14, fm: { ratio: 2, index: 4, decay: 0.1 } });
    tone(b, { dur: 0.25, f0: 160, f1: 55, vol: 0.6, decay: 0.08 });
    noise(b, rng, { dur: 0.1, type: 'hp', f0: 3500, vol: 0.35, attack: 0.001, decay: 0.025 });
    addVerb(b, 0.4, 0.4);
    return b;
  },
  // Bolha: "blups" ascendentes e um brilho macio de escudo.
  item_bolha: (rng) => {
    const b = Stereo.seconds(1.1);
    [[0, 320, 760], [0.11, 420, 980], [0.2, 560, 1500], [0.27, 380, 900]].forEach(([t, f0, f1], k) => {
      tone(b, { t, dur: 0.11, f0, f1, vol: 0.8, attack: 0.008, decay: 0.07, pan: k % 2 ? 0.35 : -0.35 });
    });
    tone(b, { t: 0.25, dur: 0.6, f0: hz(79), vol: 0.25, attack: 0.08, decay: 0.25, vib: { hz: 7, cents: 25 } });
    tone(b, { t: 0.25, dur: 0.6, f0: hz(86), vol: 0.18, attack: 0.08, decay: 0.25, vib: { hz: 6, cents: 25 } });
    noise(b, rng, { t: 0.2, dur: 0.5, type: 'bp', f0: 2500, f1: 4500, q: 3, vol: 0.12, attack: 0.1, decay: 0.2 });
    addVerb(b, 0.45, 0.4);
    return b;
  },
  // Névoa: sopro abafado e longo, com um tom grave misterioso.
  item_nevoa: (rng) => {
    const b = Stereo.seconds(1.9);
    noise(b, rng, { dur: 1.4, type: 'lp', f0: 400, f1: 2400, q: 1.2, vol: 0.9, attack: 0.25, decay: 0.7, release: 0.4, pan: -0.4 });
    noise(b, rng, { dur: 1.4, type: 'bp', f0: 2600, f1: 700, q: 1.5, vol: 0.5, attack: 0.35, decay: 0.7, release: 0.4, pan: 0.4 });
    tone(b, { dur: 1.3, f0: hz(50), f1: hz(47), wave: 'tri', vol: 0.3, attack: 0.2, decay: 0.6, release: 0.3, vib: { hz: 4, cents: 30 } });
    tone(b, { dur: 1.3, f0: hz(56), f1: hz(53), vol: 0.2, attack: 0.25, decay: 0.6, release: 0.3 });
    addVerb(b, 0.7, 0.6);
    return b;
  },
  // Faísca: estalos elétricos e zumbido serrilhado instável.
  item_faisca: (rng) => {
    const b = Stereo.seconds(0.9);
    for (let k = 0; k < 9; k++) {
      const t = k * 0.045 + rng() * 0.02;
      const f = 700 + rng() * 2600;
      tone(b, { t, dur: 0.04, f0: f, f1: f * (0.5 + rng()), wave: 'saw', vol: 0.45 * (1 - k / 12), decay: 0.02, pan: rng() * 1.4 - 0.7 });
      noise(b, rng, { t, dur: 0.025, type: 'hp', f0: 5000, vol: 0.6 * (1 - k / 12), attack: 0.0005, decay: 0.006, pan: rng() * 1.4 - 0.7 });
    }
    tone(b, { dur: 0.45, f0: 95, f1: 80, wave: 'square', pw: 0.2, vol: 0.3, decay: 0.2, vib: { hz: 47, cents: 180 } });
    addVerb(b, 0.3, 0.3);
    return b;
  },
  // Onda: onda de choque — mergulho grave e ruído que se abre para os lados.
  item_onda: (rng) => {
    const b = Stereo.seconds(1.7);
    tone(b, { dur: 0.9, f0: 240, f1: 36, vol: 0.9, attack: 0.01, decay: 0.3 });
    tone(b, { dur: 0.7, f0: 480, f1: 70, wave: 'tri', vol: 0.3, attack: 0.01, decay: 0.2 });
    noise(b, rng, { dur: 1.1, type: 'bp', f0: 300, f1: 3200, q: 2.2, vol: 0.6, attack: 0.08, decay: 0.4, release: 0.3, pan: -0.6 });
    noise(b, rng, { t: 0.04, dur: 1.1, type: 'bp', f0: 380, f1: 4000, q: 2.2, vol: 0.6, attack: 0.08, decay: 0.4, release: 0.3, pan: 0.6 });
    addVerb(b, 0.55, 0.5);
    return b;
  },
  // Cristal: cacho de sinos vítreos inarmônicos.
  item_cristal: (rng) => {
    const b = Stereo.seconds(1.5);
    [[0, 96], [0.04, 103], [0.08, 100], [0.14, 108], [0.2, 105]].forEach(([t, m], k) => {
      ping(b, t, hz(m), 0.7, 0.5, (k - 2) * 0.35, 5.37, 1.6);
    });
    noise(b, rng, { dur: 0.06, type: 'hp', f0: 7000, vol: 0.3, attack: 0.001, decay: 0.012 });
    sparkle(b, rng, 0.15, 0.5, 10, 4000, 11000, 0.12);
    addVerb(b, 0.55, 0.5);
    return b;
  },
  // Raio Corrente: estalo seco e um arco elétrico que "pula" três vezes, cada salto mais agudo e fraco.
  item_raio: (rng) => {
    const b = Stereo.seconds(1.1);
    noise(b, rng, { dur: 0.05, type: 'hp', f0: 4200, vol: 0.9, attack: 0.0005, decay: 0.012 });
    tone(b, { dur: 0.12, f0: 180, f1: 60, vol: 0.6, decay: 0.04 });
    [[0, 1, -0.5], [0.12, 0.7, 0.1], [0.22, 0.45, 0.6]].forEach(([t, v, pan], hop) => {
      for (let k = 0; k < 5; k++) {
        const tt = t + k * 0.016 + rng() * 0.008;
        const f = (1100 + hop * 700) * (0.8 + rng() * 0.5);
        tone(b, { t: tt, dur: 0.03, f0: f, f1: f * 0.6, wave: 'saw', vol: 0.5 * v, decay: 0.012, pan });
        noise(b, rng, { t: tt, dur: 0.02, type: 'bp', f0: 3500 + hop * 1500, q: 2, vol: 0.7 * v, attack: 0.0005, decay: 0.006, pan });
      }
      tone(b, { t, dur: 0.16, f0: 120 + hop * 40, wave: 'square', pw: 0.15, vol: 0.28 * v, decay: 0.06, vib: { hz: 60, cents: 300 }, pan });
    });
    addVerb(b, 0.35, 0.35);
    return b;
  },
  // Atingido pelo raio: zumbido que engasga e cai de tom, como um motor perdendo força.
  zap: (rng) => {
    const b = Stereo.seconds(1);
    noise(b, rng, { dur: 0.04, type: 'hp', f0: 5000, vol: 0.8, attack: 0.0005, decay: 0.01 });
    tone(b, { dur: 0.6, f0: 220, f1: 70, wave: 'saw', vol: 0.45, attack: 0.005, decay: 0.3, vib: { hz: 23, cents: 250 } });
    tone(b, { dur: 0.5, f0: 440, f1: 120, wave: 'square', pw: 0.2, vol: 0.18, decay: 0.2, vib: { hz: 31, cents: 200 } });
    for (let k = 0; k < 6; k++) {
      const t = 0.05 + k * 0.07 + rng() * 0.02;
      noise(b, rng, { t, dur: 0.025, type: 'bp', f0: 2500 + rng() * 2500, q: 3, vol: 0.4 * (1 - k / 7), attack: 0.0005, decay: 0.008, pan: rng() * 1.2 - 0.6 });
    }
    addVerb(b, 0.3, 0.3);
    return b;
  },
  // Cometa Guia: ignição brilhante que sobe e um rugido largo de cauda de fogo.
  item_cometa: (rng) => {
    const b = Stereo.seconds(2);
    tone(b, { dur: 0.5, f0: hz(60), f1: hz(84), wave: 'saw', vol: 0.35, attack: 0.02, decay: 0.3 });
    tone(b, { dur: 0.5, f0: hz(67), f1: hz(91), wave: 'square', pw: 0.3, vol: 0.18, attack: 0.02, decay: 0.3, pan: 0.3 });
    noise(b, rng, { dur: 1.5, type: 'bp', f0: 500, f1: 2600, q: 1.1, vol: 0.8, attack: 0.08, decay: 0.7, release: 0.4, pan: -0.3 });
    noise(b, rng, { t: 0.03, dur: 1.5, type: 'lp', f0: 900, f1: 300, vol: 0.6, attack: 0.05, decay: 0.6, release: 0.4, pan: 0.3 });
    tone(b, { dur: 0.35, f0: 140, f1: 45, vol: 0.6, decay: 0.12 });
    [91, 96, 100, 103].forEach((m, k) => ping(b, 0.1 + k * 0.06, hz(m), 0.4, 0.35, (k - 1.5) * 0.4));
    sparkle(b, rng, 0.2, 0.7, 8, 3500, 9000, 0.12);
    addVerb(b, 0.5, 0.45);
    return b;
  },
  // Cometa empurrando um rival: baque surdo com rajada de ar.
  comet_ram: (rng) => {
    const b = Stereo.seconds(0.7);
    tone(b, { dur: 0.22, f0: 130, f1: 48, vol: 1, decay: 0.07 });
    noise(b, rng, { dur: 0.3, type: 'bp', f0: 1800, f1: 500, q: 1.2, vol: 0.7, attack: 0.002, decay: 0.08 });
    noise(b, rng, { t: 0.02, dur: 0.12, type: 'hp', f0: 3000, vol: 0.35, attack: 0.001, decay: 0.03, pan: 0.4 });
    addVerb(b, 0.3, 0.3);
    return b;
  },
  shield_break: (rng) => {
    const b = Stereo.seconds(1.2);
    noise(b, rng, { dur: 0.3, type: 'hp', f0: 3000, vol: 0.9, attack: 0.001, decay: 0.05 });
    tone(b, { dur: 0.2, f0: 900, f1: 200, vol: 0.4, decay: 0.05 });
    for (let k = 0; k < 22; k++) {
      const t = 0.01 + rng() * rng() * 0.6;
      ping(b, t, 2200 + rng() * 6500, 0.08 + rng() * 0.15, 0.3 * (1 - t), rng() * 1.8 - 0.9, 2.3 + rng() * 4, 2.5);
    }
    addVerb(b, 0.4, 0.4);
    return b;
  },
  spinout: (rng) => {
    const b = Stereo.seconds(1.3);
    // Pneus girando em falso: chiado ressonante que desce em espiral.
    for (const [f, pan] of [[2100, -0.4], [2750, 0.4]] as const) {
      const n = sec(1.05);
      const sq = filterMono(whiteNoise(n, rng), 'bp', (i, len) => f * (1 - 0.45 * (i / len)) * (1 + 0.12 * Math.sin((TAU * 5.5 * i) / SR)), 9);
      for (let i = 0; i < n; i++) {
        const t = i / SR;
        sq[i] *= Math.min(1, t / 0.02) * Math.exp(-t / 0.55) * Math.min(1, (1.05 - t) / 0.15) * (0.7 + 0.3 * Math.sin(TAU * 5.5 * t));
      }
      mixMono(b, sq, 0, 3, pan);
    }
    tone(b, { dur: 1, f0: 900, f1: 280, wave: 'saw', vol: 0.12, attack: 0.02, decay: 0.5, vib: { hz: 5.5, cents: 160 } });
    noise(b, rng, { dur: 0.9, type: 'lp', f0: 700, vol: 0.2, attack: 0.02, decay: 0.4 });
    return b;
  },
  thunder: (rng) => {
    const b = Stereo.seconds(4.2);
    noise(b, rng, { dur: 0.25, type: 'hp', f0: 1200, f1: 400, vol: 0.9, attack: 0.002, decay: 0.05 });
    noise(b, rng, { t: 0.02, dur: 0.6, type: 'lp', f0: 2400, f1: 300, vol: 1, attack: 0.004, decay: 0.16, pan: -0.3 });
    // Ribombo: ruído grave com amplitude irregular.
    for (const pan of [-0.6, 0.6]) {
      const n = sec(3.6);
      const lfoRng = makeRng(seedOf(`thunder${pan}`));
      const bumps = Array.from({ length: 12 }, () => lfoRng());
      const rumble = filterMono(whiteNoise(n, rng), 'lp', (i, len) => 320 - 230 * (i / len), 0.9);
      for (let i = 0; i < n; i++) {
        const t = i / SR;
        const x = (t * 3.2) % 12;
        const k = x | 0;
        const fr = x - k;
        const bump = bumps[k] * (1 - fr) + bumps[(k + 1) % 12] * fr;
        rumble[i] *= Math.min(1, t / 0.05) * Math.exp(-t / 1.1) * (0.35 + 0.65 * bump) * Math.min(1, (3.6 - t) / 0.5);
      }
      mixMono(b, rumble, sec(0.05), 2.4, pan);
    }
    tone(b, { t: 0.03, dur: 1.5, f0: 70, f1: 30, vol: 0.5, decay: 0.5 });
    addVerb(b, 0.8, 0.5);
    return b;
  },
  unlock: (rng) => {
    const b = Stereo.seconds(2.6);
    [72, 76, 79, 84].forEach((m, k) => {
      const t = k * 0.1;
      ping(b, t, hz(m + 12), 0.9, 0.5, (k - 1.5) * 0.4);
      tone(b, { t, dur: 0.5, f0: hz(m), wave: 'tri', vol: 0.35, decay: 0.2 });
    });
    for (const m of [72, 79, 88]) tone(b, { t: 0.4, dur: 1.2, f0: hz(m), wave: 'saw', vol: 0.12, attack: 0.03, decay: 0.5, release: 0.3 });
    ping(b, 0.4, hz(100), 1.2, 0.4);
    sparkle(b, rng, 0.4, 1, 20, 3000, 10000, 0.09);
    addVerb(b, 0.65, 0.6);
    return b;
  },
  respawn: (rng) => {
    const b = Stereo.seconds(1.5);
    // Glissando de harpa ascendente + sopro de reaparecimento.
    const scale = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84];
    scale.forEach((m, k) => ping(b, k * 0.045, hz(m + 12), 0.35, 0.35 + k * 0.02, (k / scale.length) * 1.4 - 0.7, 2, 1.2));
    noise(b, rng, { dur: 0.7, type: 'bp', f0: 500, f1: 4500, q: 1.2, vol: 0.35, attack: 0.3, decay: 0.3 });
    tone(b, { t: 0.5, dur: 0.5, f0: hz(84), vol: 0.25, attack: 0.02, decay: 0.2 });
    addVerb(b, 0.55, 0.5);
    return b;
  },
  splash: (rng) => {
    const b = Stereo.seconds(1.4);
    noise(b, rng, { dur: 0.12, type: 'lp', f0: 1800, f1: 500, vol: 0.9, attack: 0.002, decay: 0.04 });
    tone(b, { dur: 0.18, f0: 140, f1: 60, vol: 0.5, decay: 0.05 });
    noise(b, rng, { t: 0.03, dur: 0.9, type: 'bp', f0: 2600, f1: 900, q: 0.9, vol: 0.7, attack: 0.04, decay: 0.25, pan: -0.3 });
    noise(b, rng, { t: 0.05, dur: 0.9, type: 'hp', f0: 4500, f1: 2500, vol: 0.4, attack: 0.06, decay: 0.22, pan: 0.3 });
    // Gotas e bolhas depois do impacto.
    for (let k = 0; k < 14; k++) {
      const t = 0.12 + rng() * 0.7;
      const f = 500 + rng() * 1600;
      tone(b, { t, dur: 0.05, f0: f, f1: f * 1.7, vol: 0.22 * (1 - t), attack: 0.004, decay: 0.02, pan: rng() * 1.6 - 0.8 });
    }
    return b;
  },
};

export function renderSfx(id: SfxId): Stereo {
  return SFX[id](makeRng(seedOf(`sfx:${id}`)));
}

// ---------------------------------------------------------------------------------------------
// Loops e ambiências (emenda perfeita)
// ---------------------------------------------------------------------------------------------

/** Seno com número inteiro de ciclos dentro do loop (0..1). */
const cyc = (i: number, n: number, cycles: number, phase = 0): number => 0.5 + 0.5 * Math.sin(TAU * ((cycles * i) / n + phase));

type Amp = (i: number, n: number) => number;

/** Camada de ruído filtrado periódico, com amplitude também periódica, em L e R descorrelacionados. */
function bed(dst: Stereo, rng: Rng, type: FilterType, cutoff: Curve, q: number, gain: number, amp?: Amp, width = 0.85): void {
  const n = dst.length;
  for (const pan of width > 0 ? [-width, width] : [0]) {
    const x = filterMono(whiteNoise(n, rng), type, cutoff, q, true);
    if (amp) for (let i = 0; i < n; i++) x[i] *= amp(i, n);
    mixMono(dst, x, 0, width > 0 ? gain * 0.75 : gain, pan);
  }
}

type LoopBuilder = (rng: Rng) => Stereo;

const LOOPS: Record<LoopId, LoopBuilder> = {
  // Cantada de pneu: ruído em ressonâncias estreitas, com tremor.
  drift: (rng) => {
    const b = Stereo.seconds(2);
    const wob: Amp = (i, n) => 0.75 + 0.25 * cyc(i, n, 14) * cyc(i, n, 3, 0.3);
    bed(b, rng, 'bp', (i, n) => 1850 * (1 + 0.05 * Math.sin((TAU * 6 * i) / n)), 14, 3, wob, 0.3);
    bed(b, rng, 'bp', (i, n) => 2650 * (1 + 0.04 * Math.sin((TAU * 4 * i) / n + 1)), 11, 2, wob, 0.5);
    bed(b, rng, 'bp', 1180, 6, 0.8, wob, 0.2);
    bed(b, rng, 'bp', 520, 1, 0.35, undefined, 0.6);
    return b;
  },
  // Frenagem: chiado mais grave com trepidação.
  brake: (rng) => {
    const b = Stereo.seconds(1.5);
    const judder: Amp = (i, n) => 0.6 + 0.4 * cyc(i, n, 42);
    bed(b, rng, 'bp', 880, 9, 2.4, judder, 0.25);
    bed(b, rng, 'bp', 1340, 8, 1.4, judder, 0.4);
    bed(b, rng, 'lp', 420, 0.8, 0.7, judder, 0.5);
    bed(b, rng, 'hp', 4500, 0.7, 0.12, undefined, 0.7);
    return b;
  },
  // Fora da pista: ronco de terra com pedrinhas.
  offroad: (rng) => {
    const b = Stereo.seconds(3);
    bed(b, rng, 'lp', 260, 0.9, 1.6, (i, n) => 0.7 + 0.3 * cyc(i, n, 9) * cyc(i, n, 4, 0.2), 0.5);
    bed(b, rng, 'bp', 900, 0.8, 0.3, (i, n) => 0.6 + 0.4 * cyc(i, n, 13, 0.4), 0.7);
    for (let k = 0; k < 90; k++) {
      noise(b, rng, {
        t: rng() * 3, dur: 0.015 + rng() * 0.035, type: 'bp', f0: 700 + rng() * 2400, q: 1.5 + rng() * 2,
        vol: 0.25 + rng() * 0.5, attack: 0.001, decay: 0.008 + rng() * 0.01, pan: rng() * 1.8 - 0.9, wrap: true,
      });
    }
    return b;
  },
  // Vento de velocidade: ar passando, com variação lenta.
  wind_speed: (rng) => {
    const b = Stereo.seconds(4);
    bed(b, rng, 'bp', (i, n) => 850 + 250 * Math.sin((TAU * 2 * i) / n), 0.9, 1.2, (i, n) => 0.75 + 0.25 * cyc(i, n, 3, 0.1));
    bed(b, rng, 'hp', 3200, 0.7, 0.22, (i, n) => 0.6 + 0.4 * cyc(i, n, 5, 0.6));
    bed(b, rng, 'lp', 180, 0.8, 0.9, (i, n) => 0.7 + 0.3 * cyc(i, n, 1, 0.3), 0.4);
    return b;
  },
  // Faíscas do drift carregado: estalos agudos sobre um chiado fino.
  drift_sparks: (rng) => {
    const b = Stereo.seconds(2);
    bed(b, rng, 'hp', 6500, 0.8, 0.12, (i, n) => 0.6 + 0.4 * cyc(i, n, 11));
    for (let k = 0; k < 85; k++) {
      const t = rng() * 2;
      noise(b, rng, {
        t, dur: 0.004 + rng() * 0.012, type: 'hp', f0: 3500 + rng() * 4000, vol: 0.3 + rng() * 0.7,
        attack: 0.0004, decay: 0.002 + rng() * 0.004, pan: rng() * 1.8 - 0.9, wrap: true,
      });
      if (rng() < 0.3) ping(b, t, 3000 + rng() * 5000, 0.05, 0.25, rng() * 1.6 - 0.8, 3.1, 2);
    }
    return b;
  },
};

export function renderLoop(id: LoopId): Stereo {
  return LOOPS[id](makeRng(seedOf(`loop:${id}`)));
}

/** Pio de pássaro: sequência de trinados com varredura. */
function chirp(dst: Stereo, t: number, f0: number, f1: number, dur: number, vol: number, pan: number): void {
  tone(dst, { t, dur, f0, f1, vol, attack: dur * 0.2, decay: dur * 0.6, pan, wrap: true });
  tone(dst, { t, dur, f0: f0 * 2, f1: f1 * 2, vol: vol * 0.25, attack: dur * 0.2, decay: dur * 0.5, pan, wrap: true });
}

const AMB_SECONDS = 16;

const AMBIENCES: Record<AmbienceId, LoopBuilder> = {
  // Mar: ondas que crescem, quebram e recuam; gaivotas distantes e discretas.
  sea: (rng) => {
    const b = Stereo.seconds(AMB_SECONDS);
    const wave = (cycles: number, phase: number): Amp => (i, n) => {
      const x = ((cycles * i) / n + phase) % 1;
      // Sobe devagar, quebra, e a espuma se desfaz.
      return x < 0.4 ? (x / 0.4) ** 2.2 : Math.exp(-(x - 0.4) / 0.22);
    };
    const w1 = wave(2, 0.1);
    const w2 = wave(3, 0.55);
    bed(b, rng, 'lp', (i, n) => 350 + 1900 * w1(i, n), 0.7, 1.5, (i, n) => 0.15 + 0.85 * w1(i, n));
    bed(b, rng, 'bp', (i, n) => 900 + 2600 * w2(i, n), 0.6, 0.6, (i, n) => 0.1 + 0.9 * w2(i, n));
    bed(b, rng, 'hp', 3800, 0.7, 0.28, (i, n) => 0.1 + 0.9 * Math.max(w1(i, n), w2(i, n)) ** 1.5);
    bed(b, rng, 'lp', 110, 0.8, 1.2, (i, n) => 0.6 + 0.4 * cyc(i, n, 2, 0.4), 0.3);
    for (const [t, pan, pitch] of [[3.2, -0.6, 1], [3.75, -0.5, 1.06], [10.6, 0.55, 0.92], [11.3, 0.6, 0.95], [11.8, 0.5, 1.02]] as const) {
      tone(b, { t, dur: 0.14, f0: 1500 * pitch, f1: 2300 * pitch, wave: 'saw', vol: 0.035, attack: 0.03, pan, wrap: true });
      tone(b, { t: t + 0.13, dur: 0.3, f0: 2300 * pitch, f1: 1350 * pitch, wave: 'saw', vol: 0.035, attack: 0.01, decay: 0.2, pan, wrap: true, vib: { hz: 18, cents: 40 } });
    }
    filterMono(b.l, 'lp', 7000, 0.7, true);
    filterMono(b.r, 'lp', 7000, 0.7, true);
    return b;
  },
  // Floresta: brisa nas copas, folhas, e três "espécies" de pássaros.
  forest: (rng) => {
    const b = Stereo.seconds(AMB_SECONDS);
    bed(b, rng, 'bp', (i, n) => 650 + 250 * Math.sin((TAU * 2 * i) / n), 0.6, 0.9, (i, n) => 0.45 + 0.55 * cyc(i, n, 1) * (0.6 + 0.4 * cyc(i, n, 3, 0.3)));
    bed(b, rng, 'hp', 2800, 0.7, 0.3, (i, n) => 0.25 + 0.75 * cyc(i, n, 2, 0.2) * cyc(i, n, 5, 0.7));
    bed(b, rng, 'lp', 150, 0.8, 0.5, undefined, 0.3);
    for (let k = 0; k < 7; k++) {
      // Espécie 1: três pios descendentes.
      const t = rng() * AMB_SECONDS;
      const pan = rng() * 1.6 - 0.8;
      const base = 3600 + rng() * 900;
      for (let j = 0; j < 3; j++) chirp(b, t + j * 0.13, base * 1.2, base * 0.85, 0.08, 0.05, pan);
    }
    for (let k = 0; k < 4; k++) {
      // Espécie 2: trinado rápido.
      const t = rng() * AMB_SECONDS;
      const pan = rng() * 1.6 - 0.8;
      const f = 4800 + rng() * 800;
      for (let j = 0; j < 9; j++) chirp(b, t + j * 0.055, f, f * 1.12, 0.035, 0.035, pan);
    }
    for (let k = 0; k < 4; k++) {
      // Espécie 3: assobio de duas notas.
      const t = rng() * AMB_SECONDS;
      const pan = rng() * 1.6 - 0.8;
      const f = 2200 + rng() * 500;
      chirp(b, t, f, f * 1.02, 0.22, 0.04, pan);
      chirp(b, t + 0.3, f * 1.26, f * 1.2, 0.3, 0.04, pan);
    }
    return b;
  },
  // Campo: vento brando e grilos em dois pontos do estéreo.
  meadow: (rng) => {
    const b = Stereo.seconds(AMB_SECONDS);
    bed(b, rng, 'bp', (i, n) => 480 + 160 * Math.sin((TAU * i) / n), 0.6, 0.9, (i, n) => 0.4 + 0.6 * cyc(i, n, 2, 0.15) * (0.7 + 0.3 * cyc(i, n, 5)));
    bed(b, rng, 'hp', 3500, 0.7, 0.14, (i, n) => 0.3 + 0.7 * cyc(i, n, 3, 0.5));
    bed(b, rng, 'lp', 130, 0.8, 0.45, undefined, 0.3);
    const cricket = (freq: number, period: number, pulses: number, vol: number, pan: number, offset: number): void => {
      for (let t = offset; t < AMB_SECONDS - 0.2; t += period) {
        // Cada cricrido é uma rajada de pulsos curtíssimos.
        for (let p = 0; p < pulses; p++) {
          tone(b, { t: t + p * 0.034, dur: 0.02, f0: freq, vol, attack: 0.004, release: 0.008, pan });
          tone(b, { t: t + p * 0.034, dur: 0.02, f0: freq * 2.01, vol: vol * 0.3, attack: 0.004, release: 0.008, pan });
        }
      }
    };
    cricket(4350, 0.5, 3, 0.05, -0.65, 0.08);
    cricket(3920, 0.64, 4, 0.04, 0.6, 0.3);
    cricket(4780, 1.6, 6, 0.025, 0.15, 0.9);
    return b;
  },
  // Deserto: vento seco que assobia e areia correndo.
  desert: (rng) => {
    const b = Stereo.seconds(AMB_SECONDS);
    const gust: Amp = (i, n) => 0.25 + 0.75 * cyc(i, n, 1, 0.2) * (0.5 + 0.5 * cyc(i, n, 3, 0.6));
    bed(b, rng, 'bp', (i, n) => 420 + 330 * cyc(i, n, 1, 0.2) + 120 * Math.sin((TAU * 3 * i) / n), 3.2, 1.1, gust);
    bed(b, rng, 'bp', (i, n) => 950 + 500 * cyc(i, n, 2, 0.7), 4.5, 0.35, (i, n) => 0.15 + 0.85 * cyc(i, n, 2, 0.45) ** 2);
    bed(b, rng, 'hp', 5200, 0.7, 0.2, (i, n) => 0.15 + 0.85 * gust(i, n) ** 2);
    bed(b, rng, 'lp', 160, 0.8, 0.6, (i, n) => 0.6 + 0.4 * cyc(i, n, 1, 0.2), 0.3);
    return b;
  },
  // Cidade: zumbido elétrico de 50 Hz, neon tremeluzente e ronco distante.
  city: (rng) => {
    const b = Stereo.seconds(AMB_SECONDS);
    const n = b.length;
    const hum = new Float32Array(n);
    const buzz = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const t = i / SR;
      hum[i] = Math.sin(TAU * 50 * t) * 0.5 + Math.sin(TAU * 100 * t) * 0.35 + Math.sin(TAU * 150 * t + 0.4) * 0.2 + Math.sin(TAU * 250 * t) * 0.06;
      const ph = (100 * t) % 1;
      buzz[i] = oscSample('saw', ph, 100 / SR);
    }
    filterMono(buzz, 'hp', 1800, 0.8, true);
    // Tremulação do neon: degraus periódicos de intensidade.
    const flickRng = makeRng(seedOf('city-flicker'));
    const steps = Array.from({ length: 64 }, () => (flickRng() < 0.15 ? 0.3 : 0.8 + 0.2 * flickRng()));
    for (let i = 0; i < n; i++) {
      const x = (i / n) * 64;
      const k = x | 0;
      const fr = Math.min(1, (x - k) * 12);
      buzz[i] *= steps[(k + 63) % 64] * (1 - fr) + steps[k] * fr;
    }
    mixMono(b, hum, 0, 0.5, -0.15);
    mixMono(b, buzz, 0, 0.16, 0.45);
    bed(b, rng, 'lp', 190, 0.8, 1.1, (i, len) => 0.5 + 0.5 * cyc(i, len, 1, 0.3) * (0.6 + 0.4 * cyc(i, len, 4)));
    bed(b, rng, 'bp', 1400, 0.6, 0.1, (i, len) => 0.5 + 0.5 * cyc(i, len, 3, 0.2));
    for (let k = 0; k < 10; k++) {
      noise(b, rng, { t: rng() * AMB_SECONDS, dur: 0.02, type: 'hp', f0: 4000, vol: 0.12, attack: 0.0005, decay: 0.004, pan: 0.45, wrap: true });
    }
    return b;
  },
  // Nevasca: vento uivante em rajadas fortes e neve chiando.
  blizzard: (rng) => {
    const b = Stereo.seconds(AMB_SECONDS);
    const gust: Amp = (i, n) => 0.35 + 0.65 * cyc(i, n, 2, 0.1) * (0.55 + 0.45 * cyc(i, n, 5, 0.4));
    bed(b, rng, 'bp', (i, n) => 330 + 320 * cyc(i, n, 2, 0.1) + 60 * Math.sin((TAU * 7 * i) / n), 6, 1.2, gust);
    bed(b, rng, 'bp', (i, n) => 620 + 520 * cyc(i, n, 3, 0.35), 7, 0.6, (i, n) => 0.2 + 0.8 * cyc(i, n, 3, 0.3) ** 2);
    bed(b, rng, 'hp', 2400, 0.7, 0.55, (i, n) => 0.3 + 0.7 * gust(i, n) ** 1.5);
    bed(b, rng, 'lp', 220, 0.8, 1.3, (i, n) => 0.5 + 0.5 * gust(i, n), 0.4);
    return b;
  },
  // Céu aberto: vento alto, limpo e constante.
  sky: (rng) => {
    const b = Stereo.seconds(AMB_SECONDS);
    bed(b, rng, 'bp', (i, n) => 1700 + 700 * Math.sin((TAU * 2 * i) / n + 1), 0.8, 0.8, (i, n) => 0.45 + 0.55 * cyc(i, n, 1, 0.6) * (0.7 + 0.3 * cyc(i, n, 4, 0.1)));
    bed(b, rng, 'bp', (i, n) => 2900 + 900 * cyc(i, n, 3, 0.2), 2.5, 0.22, (i, n) => 0.2 + 0.8 * cyc(i, n, 3, 0.8) ** 2);
    bed(b, rng, 'hp', 6000, 0.7, 0.16, (i, n) => 0.4 + 0.6 * cyc(i, n, 2, 0.3));
    bed(b, rng, 'lp', 200, 0.8, 0.8, (i, n) => 0.5 + 0.5 * cyc(i, n, 1, 0.1), 0.4);
    return b;
  },
  // Tempestade: chuva cerrada, pingos próximos, vento e ronco grave ao longe.
  storm: (rng) => {
    const b = Stereo.seconds(AMB_SECONDS);
    bed(b, rng, 'hp', 2200, 0.7, 0.75, (i, n) => 0.75 + 0.25 * cyc(i, n, 3, 0.2));
    bed(b, rng, 'bp', 700, 0.5, 0.5, (i, n) => 0.7 + 0.3 * cyc(i, n, 2, 0.6));
    bed(b, rng, 'bp', (i, n) => 380 + 200 * cyc(i, n, 2, 0.3), 2.5, 0.5, (i, n) => 0.2 + 0.8 * cyc(i, n, 2, 0.25) ** 2);
    bed(b, rng, 'lp', 90, 0.9, 1.8, (i, n) => 0.35 + 0.65 * cyc(i, n, 1, 0.7) * (0.6 + 0.4 * cyc(i, n, 3)), 0.4);
    for (let k = 0; k < 520; k++) {
      const t = rng() * AMB_SECONDS;
      const f = 1800 + rng() * 4500;
      tone(b, { t, dur: 0.012, f0: f, f1: f * 0.7, vol: 0.03 + rng() * 0.07, attack: 0.0006, decay: 0.004, pan: rng() * 2 - 1, wrap: true });
    }
    return b;
  },
};

export function renderAmbience(id: AmbienceId): Stereo {
  return AMBIENCES[id](makeRng(seedOf(`amb:${id}`)));
}
