/**
 * Sequenciador offline: transforma a descrição de uma música (seções, cifras, melodia escrita à mão,
 * estilos de baixo/arpejo/bateria) em áudio estéreo mixado e masterizado.
 */
import {
  SR,
  Stereo,
  chorus,
  compress,
  db,
  fadeEdges,
  foldTail,
  makeRng,
  midiHz,
  mixMono,
  normalizeRms,
  pingPong,
  reverb,
  sec,
  seedOf,
  softLimit,
  toDb,
  type Rng,
} from './dsp';
import { VOICES, drum, type DrumName, type VoiceName } from './instruments';

// ---------------------------------------------------------------------------------------------
// Notação
// ---------------------------------------------------------------------------------------------

const LETTER_PC: Record<string, number> = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

function pitchClass(letter: string, accidental: string | undefined): number {
  const base = LETTER_PC[letter.toLowerCase()];
  return base + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
}

/** "f#4" → 66 (C4 = 60). */
export function noteMidi(name: string): number {
  const m = /^([a-g])(#|b)?(-?\d)$/i.exec(name);
  if (!m) throw new Error(`Nota inválida: "${name}"`);
  return 12 * (Number(m[3]) + 1) + pitchClass(m[1], m[2]);
}

export interface NoteEv {
  beat: number;
  dur: number;
  midi: number;
  vel: number;
}

/**
 * Melodia em texto: "f#4/1.5 a4/.5 r/2 | …" (nota/duração em tempos; `r` = pausa; `|` é só visual).
 * Devolve os eventos e o total de tempos, para validar contra o tamanho da seção.
 */
export function parseMelody(text: string, startBeat: number): { events: NoteEv[]; beats: number } {
  const events: NoteEv[] = [];
  let beat = 0;
  for (const tok of text.split(/\s+/)) {
    if (!tok || tok === '|') continue;
    const [name, durText] = tok.split('/');
    const dur = Number(durText);
    if (!(dur > 0)) throw new Error(`Duração inválida em "${tok}"`);
    if (name.toLowerCase() !== 'r') {
      const onBeat = Math.abs(beat - Math.round(beat)) < 1e-6;
      events.push({
        beat: startBeat + beat,
        dur,
        midi: noteMidi(name),
        vel: Math.min(1, (onBeat ? 0.86 : 0.76) + (dur >= 1.5 ? 0.08 : 0)),
      });
    }
    beat += dur;
  }
  return { events, beats: beat };
}

interface Chord {
  root: number;
  bass: number;
  tones: number[];
}

const QUALITIES: Record<string, number[]> = {
  '': [0, 4, 7],
  m: [0, 3, 7],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  sus4: [0, 5, 7],
  sus2: [0, 2, 7],
  dim: [0, 3, 6],
};

export function parseChord(symbol: string): Chord {
  const m = /^([A-G])(#|b)?(maj7|m7|m|7|sus4|sus2|dim)?(?:\/([A-G])(#|b)?)?$/.exec(symbol);
  if (!m) throw new Error(`Cifra inválida: "${symbol}"`);
  const root = (pitchClass(m[1], m[2]) + 12) % 12;
  const bass = m[4] ? (pitchClass(m[4], m[5]) + 12) % 12 : root;
  return { root, bass, tones: QUALITIES[m[3] ?? ''].map((iv) => (root + iv) % 12) };
}

/** Coloca uma classe de altura na janela [lo, lo+12). */
const inWindow = (pc: number, lo: number): number => lo + ((((pc - lo) % 12) + 12) % 12);

// ---------------------------------------------------------------------------------------------
// Descrição de música
// ---------------------------------------------------------------------------------------------

export type BassStyle = 'long' | 'dotted' | 'eighths' | 'drive16' | 'pump8';
export type ArpStyle = 'up8' | 'broken8' | 'updown16' | 'pulse16';
export type StabStyle = 'offbeat' | 'gate8' | 'push';
export type DrumStyle =
  | 'light'
  | 'rock'
  | 'introKick'
  | 'sunny'
  | 'sunnyB'
  | 'half'
  | 'introKickEl'
  | 'four'
  | 'fourB'
  | 'tense'
  | 'build'
  | 'fanfare'
  | 'fanfareEnd';

export interface Section {
  name: string;
  bars: number;
  /** Uma cifra por compasso; "F G" divide o compasso em partes iguais. */
  chords: string[];
  melody?: string;
  lead?: VoiceName;
  /** Dobra da melodia (outra voz, deslocada em semitons). */
  double?: { voice: VoiceName; shift: number };
  bass?: BassStyle;
  pad?: boolean;
  stabs?: StabStyle;
  arp?: ArpStyle;
  drums?: DrumStyle;
  /** Virada de bateria no último compasso. */
  fill?: 'acoustic' | 'electro';
  /** Prato de ataque no primeiro tempo. */
  crash?: boolean;
}

type Bus = 'drums' | 'bass' | 'pad' | 'stab' | 'arp' | 'lead' | 'double';
const BUSES: Bus[] = ['drums', 'bass', 'pad', 'stab', 'arp', 'lead', 'double'];

export interface SongDef {
  id: string;
  bpm: number;
  /** Transposição global em semitons (as melodias são escritas em Dó maior / Lá menor ou no tom indicado). */
  transpose: number;
  loop: boolean;
  /** Cauda renderizada depois do último compasso (dobrada sobre o início quando há loop). */
  tailSec: number;
  voices: { bass: VoiceName; pad: VoiceName; stab: VoiceName; arp: VoiceName };
  /** Nível RMS alvo (dBFS, medido só onde o barramento soa) de cada barramento antes da soma. */
  levels: Record<Bus, number>;
  /** Quanto de cada barramento vai para o reverb (0..1). */
  sends: Partial<Record<Bus, number>>;
  reverb: { room: number; damp: number; gain: number };
  /** Eco na melodia: tempo em tempos e ganho. */
  delay?: { beats: number; gain: number; feedback: number };
  /** Profundidade do "pump" (sidechain no bumbo) em pad/baixo/arpejo. */
  pump?: number;
  /** Fade final para músicas sem loop. */
  fadeOutSec?: number;
  rmsDb: number;
  sections: Section[];
}

// ---------------------------------------------------------------------------------------------
// Padrões de bateria (16 semicolcheias por compasso: X forte, x normal, o fraco)
// ---------------------------------------------------------------------------------------------

type DrumBar = Partial<Record<DrumName, string>>;

const DRUM_PATTERNS: Record<Exclude<DrumStyle, 'build'>, DrumBar[]> = {
  light: [
    { kick: 'x.........x.....', rim: '....x.......x...', shaker: 'x.o.x.o.x.o.x.o.' },
    { kick: 'x.......x.x.....', rim: '....x.......x.o.', shaker: 'x.o.x.o.x.o.x.oo' },
  ],
  rock: [
    { kick: 'X.....x.x.......', snare: '....X.......X...', hat: 'x.o.x.o.x.o.x.o.' },
    { kick: 'X.....x.x..x....', snare: '....X.......X..o', hat: 'x.o.x.o.x.o.x.x.' },
  ],
  introKick: [{ kick: 'X...x...x...x...', hat: '..x...x...x...x.' }],
  sunny: [
    { kick: 'X..x..x...x.x...', snare: '....X.......X...', hat: 'x.xox.xox.xox.xo' },
    { kick: 'X..x..x...x..x..', snare: '....X.......X.o.', hat: 'x.xox.xox.xox...', hatOpen: '..............x.' },
  ],
  sunnyB: [
    { kick: 'X.....x.x.x.....', snare: '....X.......X...', clap: '....x.......x...', hat: 'x...x...x...x...', hatOpen: '..x...x...x...x.' },
    { kick: 'X.....x.x.x..x..', snare: '....X.......X..o', clap: '....x.......x...', hat: 'x...x...x...x...', hatOpen: '..x...x...x...x.' },
  ],
  half: [{ kick: 'X.........x.....', snare: '........X.......', hat: 'x.o.x.o.x.o.x.o.' }],
  introKickEl: [{ kickEl: 'X...X...X...X...', hat: 'x.o.x.o.x.o.x.o.' }],
  four: [
    { kickEl: 'X...X...X...X...', snareEl: '....X.......X...', clap: '....x.......x...', hat: 'xo.oxo.oxo.oxo.o', hatOpen: '..x...x...x...x.' },
  ],
  fourB: [
    { kickEl: 'X...X...X...X...', snareEl: '....X.......X...', clap: '....x.......x...', hat: 'xo.oxo.oxo.oxo.o', hatOpen: '..x...x...x...x.' },
    { kickEl: 'X...X...X...X.x.', snareEl: '....X.......X..o', clap: '....x.......x...', hat: 'xo.oxo.oxo.oxo.o', hatOpen: '..x...x...x...x.' },
  ],
  tense: [
    { kickEl: 'X.....X...X.....', snareEl: '....X.......X...', hat: 'x.x.x.x.x.x.x.x.' },
    { kickEl: 'X.....X...X..x..', snareEl: '....X.......X...', hat: 'x.x.x.x.x.x.x.x.', tomLo: '..............x.' },
  ],
  fanfare: [
    { timpani: 'X.......x.......', crash: 'X...............', snare: 'x..ox..ox..oxxoo' },
    { timpani: 'x.......x.......', snare: 'x..ox..ox..oxxoo' },
    { timpani: 'x.......x...x...', snare: 'x..ox..oxoxoxxxx' },
  ],
  fanfareEnd: [
    { timpani: 'X.o.o.o.o.o.o.o.', crash: 'X...............', snare: 'oooooooooooooooo' },
    { timpani: 'X...............', crash: 'X...............', kick: 'X...............', snare: 'X...............' },
  ],
};

const FILLS: Record<'acoustic' | 'electro', DrumBar> = {
  acoustic: {
    kick: 'X.....x.x.......',
    snare: '....X...x.xx....',
    hat: 'x.o.x.o.........',
    tomHi: '............x...',
    tomMid: '.............x..',
    tomLo: '..............xx',
  },
  electro: {
    kickEl: 'X...X...X.......',
    snareEl: '....X...x.x.xx..',
    hat: 'xo.oxo.o........',
    tomHi: '..........x.....',
    tomMid: '............x...',
    tomLo: '..............xx',
  },
};

const DRUM_MIX: Record<DrumName, { gain: number; pan: number }> = {
  kick: { gain: 1, pan: 0 },
  kickEl: { gain: 1, pan: 0 },
  snare: { gain: 0.8, pan: 0.05 },
  snareEl: { gain: 0.8, pan: 0.05 },
  hat: { gain: 0.3, pan: 0.28 },
  hatOpen: { gain: 0.26, pan: 0.28 },
  clap: { gain: 0.45, pan: -0.1 },
  rim: { gain: 0.5, pan: -0.2 },
  shaker: { gain: 0.3, pan: -0.32 },
  tomLo: { gain: 0.75, pan: 0.4 },
  tomMid: { gain: 0.7, pan: 0 },
  tomHi: { gain: 0.7, pan: -0.4 },
  crash: { gain: 0.42, pan: -0.15 },
  timpani: { gain: 0.9, pan: 0.1 },
};

const VEL: Record<string, number> = { X: 1, x: 0.8, o: 0.42 };

// ---------------------------------------------------------------------------------------------
// Padrões harmônicos
// ---------------------------------------------------------------------------------------------

/** Semitons acima da fundamental do baixo, um por subdivisão. `null` = pausa. */
const BASS_PATTERNS: Record<BassStyle, { step: number; len: number; notes: (number | null)[] }> = {
  long: { step: 2, len: 1.9, notes: [0, 0] },
  dotted: { step: 0.5, len: 0, notes: [0, null, null, 0, 7, null, null, 12] },
  eighths: { step: 0.5, len: 0.42, notes: [0, 0, 12, 0, 7, 0, 12, 7] },
  drive16: { step: 0.25, len: 0.2, notes: [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 0, 12, 0, 12] },
  pump8: { step: 0.5, len: 0.4, notes: [0, 0, 0, 12, 0, 0, 7, 12] },
};

const ARP_PATTERNS: Record<ArpStyle, { step: number; len: number; idx: number[] }> = {
  up8: { step: 0.5, len: 0.9, idx: [0, 1, 2, 3, 2, 1, 2, 1] },
  broken8: { step: 0.5, len: 0.45, idx: [0, 2, 1, 2, 3, 2, 1, 2] },
  updown16: { step: 0.25, len: 0.22, idx: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 1] },
  pulse16: { step: 0.25, len: 0.2, idx: [0, 2, 1, 2, 0, 2, 1, 3, 0, 2, 1, 2, 0, 3, 2, 1] },
};

const STAB_BEATS: Record<StabStyle, { beats: number[]; len: number }> = {
  offbeat: { beats: [0.5, 1.5, 2.5, 3.5], len: 0.3 },
  gate8: { beats: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5], len: 0.3 },
  push: { beats: [0, 0.75, 1.5, 2.5, 3.25], len: 0.45 },
};

// ---------------------------------------------------------------------------------------------
// Renderização
// ---------------------------------------------------------------------------------------------

interface Seg {
  start: number;
  dur: number;
  chord: Chord;
}

function activeRmsDb(buf: Stereo): number {
  let sum = 0;
  let count = 0;
  for (let i = 0; i < buf.length; i++) {
    const e = buf.l[i] * buf.l[i] + buf.r[i] * buf.r[i];
    if (e > 1e-7) {
      sum += e;
      count++;
    }
  }
  return count ? toDb(Math.sqrt(sum / (count * 2))) : -Infinity;
}

export interface RenderedSong {
  buf: Stereo;
  bars: number;
  busLevels: Record<string, number>;
}

export function renderSong(song: SongDef): RenderedSong {
  const rng: Rng = makeRng(seedOf(`song:${song.id}`));
  const spb = 60 / song.bpm;
  const totalBars = song.sections.reduce((s, x) => s + x.bars, 0);
  const loopLen = Math.round(totalBars * 4 * spb * SR);
  const total = loopLen + sec(song.tailSec);
  const at = (beat: number): number => Math.round(beat * spb * SR);

  const buses = Object.fromEntries(BUSES.map((b) => [b, new Stereo(total)])) as Record<Bus, Stereo>;
  const kickTimes: number[] = [];

  const cache = new Map<string, Float32Array>();
  const play = (bus: Bus, voice: VoiceName, beat: number, dur: number, midi: number, vel: number, pan: number): void => {
    const v = Math.round(vel * 20) / 20;
    const key = `${voice}|${midi}|${dur.toFixed(3)}|${v}`;
    let mono = cache.get(key);
    if (!mono) {
      mono = VOICES[voice](midiHz(midi + song.transpose), dur * spb, v, rng);
      cache.set(key, mono);
    }
    mixMono(buses[bus], mono, at(beat), 1, pan);
  };
  const hit = (name: DrumName, beat: number, vel: number): void => {
    const m = DRUM_MIX[name];
    if (name === 'kick' || name === 'kickEl') kickTimes.push(at(beat));
    mixMono(buses.drums, drum(name), at(beat), m.gain * vel, m.pan);
  };
  const drumBar = (bar: DrumBar, barBeat: number): void => {
    for (const [name, pattern] of Object.entries(bar) as [DrumName, string][]) {
      for (let s = 0; s < 16; s++) {
        const v = VEL[pattern[s]];
        if (!v) continue;
        const human = name === 'hat' || name === 'shaker' ? 0.85 + 0.15 * rng() : 0.95 + 0.05 * rng();
        hit(name, barBeat + s * 0.25, v * human);
      }
    }
  };

  let sectionBeat = 0;
  for (const s of song.sections) {
    if (s.chords.length !== s.bars) {
      throw new Error(`${song.id}/${s.name}: ${s.chords.length} cifras para ${s.bars} compassos`);
    }
    const segs: Seg[] = [];
    s.chords.forEach((barText, bar) => {
      const parts = barText.trim().split(/\s+/);
      parts.forEach((sym, k) => {
        segs.push({ start: sectionBeat + bar * 4 + (k * 4) / parts.length, dur: 4 / parts.length, chord: parseChord(sym) });
      });
    });
    const chordAt = (beat: number): Chord => {
      let found = segs[0];
      for (const g of segs) if (g.start <= beat + 1e-6) found = g;
      return found.chord;
    };

    if (s.melody) {
      const { events, beats } = parseMelody(s.melody, sectionBeat);
      if (Math.abs(beats - s.bars * 4) > 1e-6) {
        throw new Error(`${song.id}/${s.name}: melodia com ${beats} tempos, esperado ${s.bars * 4}`);
      }
      for (const e of events) {
        play('lead', s.lead ?? 'softLead', e.beat, e.dur * 0.96, e.midi, e.vel, 0.06);
        if (s.double) play('double', s.double.voice, e.beat, e.dur * 0.96, e.midi + s.double.shift, e.vel * 0.9, -0.2);
      }
    }

    if (s.pad) {
      for (const g of segs) {
        g.chord.tones.forEach((pc, k) => {
          play('pad', song.voices.pad, g.start, g.dur * 0.99, inWindow(pc, 55), 0.8, (k - 1) * 0.35);
        });
      }
    }

    if (s.stabs) {
      const st = STAB_BEATS[s.stabs];
      for (let bar = 0; bar < s.bars; bar++) {
        for (const b of st.beats) {
          const beat = sectionBeat + bar * 4 + b;
          chordAt(beat).tones.forEach((pc, k) => {
            play('stab', song.voices.stab, beat, st.len, inWindow(pc, 60), b % 1 === 0 ? 0.8 : 0.7, (k - 1) * 0.3);
          });
        }
      }
    }

    if (s.bass) {
      const bp = BASS_PATTERNS[s.bass];
      const steps = Math.round((s.bars * 4) / bp.step);
      for (let i = 0; i < steps; i++) {
        const iv = bp.notes[i % bp.notes.length];
        if (iv === null) continue;
        const beat = sectionBeat + i * bp.step;
        const chord = chordAt(beat);
        // A fundamental invertida ("C/E") só vale para a nota grave; quinta e oitava saem da fundamental real.
        const midi = iv === 0 ? inWindow(chord.bass, 31) : inWindow(chord.root, 31) + iv;
        let len = bp.len;
        if (s.bass === 'dotted') len = bp.notes[(i + 1) % bp.notes.length] === null ? 1.3 : 0.45;
        const accent = (i * bp.step) % 1 === 0 ? 0.9 : 0.74;
        play('bass', song.voices.bass, beat, len, midi, accent, 0);
      }
    }

    if (s.arp) {
      const ap = ARP_PATTERNS[s.arp];
      const steps = Math.round((s.bars * 4) / ap.step);
      for (let i = 0; i < steps; i++) {
        const beat = sectionBeat + i * ap.step;
        const tones = chordAt(beat)
          .tones.slice(0, 3)
          .map((pc) => inWindow(pc, 67))
          .sort((a, b) => a - b);
        tones.push(tones[0] + 12);
        const midi = tones[ap.idx[i % ap.idx.length]];
        const accent = (i * ap.step) % 1 === 0 ? 0.85 : 0.65;
        play('arp', song.voices.arp, beat, ap.len, midi, accent, i % 2 === 0 ? -0.35 : 0.35);
      }
    }

    if (s.drums) {
      for (let bar = 0; bar < s.bars; bar++) {
        const barBeat = sectionBeat + bar * 4;
        const isLast = bar === s.bars - 1;
        if (s.drums === 'build') {
          // Rufo crescente: colcheias na primeira metade da seção, semicolcheias na segunda.
          const fast = bar >= s.bars / 2;
          const n = fast ? 16 : 8;
          for (let k = 0; k < n; k++) {
            const prog = (bar + k / n) / s.bars;
            hit('snareEl', barBeat + (k * 4) / n, 0.25 + 0.75 * prog * prog);
          }
          for (let k = 0; k < 4; k++) hit('kickEl', barBeat + k, 0.9);
          if (isLast) hit('tomLo', barBeat + 3.5, 0.9);
        } else if (isLast && s.fill) {
          drumBar(FILLS[s.fill], barBeat);
        } else {
          const list = DRUM_PATTERNS[s.drums];
          drumBar(list[bar % list.length], barBeat);
        }
      }
    }
    if (s.crash) hit('crash', sectionBeat, 0.9);

    sectionBeat += s.bars * 4;
  }

  // "Pump": o bumbo abaixa pad, baixo, stabs e arpejo por um instante (som clássico de synthwave).
  if (song.pump && kickTimes.length) {
    const duck = new Float32Array(total);
    const len = sec(0.45);
    const tc = 0.11 * SR;
    for (const k of kickTimes) {
      for (let i = 0; i < len && k + i < total; i++) {
        const v = song.pump * Math.min(1, i / 200) * Math.exp(-i / tc);
        if (v > duck[k + i]) duck[k + i] = v;
      }
    }
    for (const b of ['pad', 'bass', 'stab', 'arp'] as Bus[]) {
      const buf = buses[b];
      for (let i = 0; i < total; i++) {
        const g = 1 - duck[i];
        buf.l[i] *= g;
        buf.r[i] *= g;
      }
    }
  }

  chorus(buses.pad, 0.5, 3.5, 15, 0.45);
  chorus(buses.stab, 0.8, 2, 11, 0.3);

  // Balanceamento: cada barramento é levado ao nível alvo antes da soma.
  const busLevels: Record<string, number> = {};
  const mix = new Stereo(total);
  const send = new Stereo(total);
  for (const b of BUSES) {
    const level = activeRmsDb(buses[b]);
    if (!Number.isFinite(level)) continue;
    busLevels[b] = Math.round(level * 10) / 10;
    const gain = db(song.levels[b] - level);
    mix.add(buses[b], gain);
    const amount = song.sends[b] ?? 0;
    if (amount > 0) send.add(buses[b], gain * amount);
  }
  if (song.delay) {
    const src = new Stereo(total);
    for (const b of ['lead', 'double'] as Bus[]) {
      const level = activeRmsDb(buses[b]);
      if (Number.isFinite(level)) src.add(buses[b], db(song.levels[b] - level));
    }
    const echo = pingPong(src, song.delay.beats * spb, song.delay.feedback);
    mix.add(echo, song.delay.gain);
    send.add(echo, song.delay.gain * 0.5);
  }
  mix.add(reverb(send, { room: song.reverb.room, damp: song.reverb.damp, hp: 280 }), song.reverb.gain);

  let out = song.loop ? foldTail(mix, loopLen) : mix;
  compress(out, { threshDb: -16, ratio: 2.2, attack: 0.012, release: 0.18, warmup: song.loop ? 3 : 0 });
  if (!song.loop && song.fadeOutSec) out = fadeEdges(out, 0, song.fadeOutSec);
  normalizeRms(out, song.rmsDb);
  softLimit(out, db(-1), 0.55);
  return { buf: out, bars: totalBars, busLevels };
}
