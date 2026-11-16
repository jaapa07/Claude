/**
 * As cinco composições ORIGINAIS do Kart Legends 3D, escritas à mão nesta notação de texto.
 * Autoria: Equipe Kart Legends 3D. Nenhuma melodia foi copiada de obra existente.
 */
import type { SongDef } from './music';

// ---------------------------------------------------------------------------------------------
// MENU — "Horizonte de Partida": aventura ao entardecer, Ré maior, 100 BPM, 28 compassos (67,2 s)
// ---------------------------------------------------------------------------------------------

const MENU_A = `
  f#4/1.5 a4/.5 d5/2 | c#5/1.5 b4/.5 a4/1 e4/1 | f#4/1.5 b4/.5 d5/1.5 c#5/.5 | b4/3 r/1 |
  f#4/1.5 a4/.5 d5/1 f#5/1 | e5/1.5 c#5/.5 a4/2 | b4/1 d5/1 g5/1.5 f#5/.5 | e5/3 r/1`;

const MENU_B = `
  d5/1 d5/.5 c#5/.5 b4/1 f#4/1 | g4/1 b4/1 d5/2 | a4/1 a4/.5 f#4/.5 d5/1 a4/1 | c#5/2 e5/1 c#5/1 |
  g5/1.5 f#5/.5 e5/1 b4/1 | d5/1.5 b4/.5 g4/2 | a4/1 b4/1 c#5/1 e5/1 | a5/3 r/1`;

// Variação do tema A: mesma harmonia, contorno mais ornamentado e final que pede a volta ao início.
const MENU_A2 = `
  f#4/1 a4/.5 d5/.5 f#5/1.5 e5/.5 | c#5/1 e5/.5 a5/.5 e5/1 c#5/1 | d5/1 f#5/.5 b5/.5 a5/1.5 f#5/.5 | g5/2 b4/1 d5/1 |
  f#5/1.5 a5/.5 d6/1 a5/1 | e5/1 a5/.5 c#6/.5 a5/2 | b5/1 a5/.5 g5/.5 f#5/1 d5/1 | e5/2 c#5/1 a4/1`;

export const menu: SongDef = {
  id: 'menu',
  bpm: 100,
  transpose: 0,
  loop: true,
  tailSec: 5,
  voices: { bass: 'roundBass', pad: 'pad', stab: 'stab', arp: 'epiano' },
  levels: { drums: -21, bass: -19, pad: -24, stab: -30, arp: -25, lead: -18, double: -27 },
  sends: { lead: 0.55, double: 0.7, arp: 0.5, pad: 0.45, drums: 0.12 },
  reverb: { room: 0.86, damp: 0.45, gain: 1 },
  delay: { beats: 0.75, gain: 0.22, feedback: 0.35 },
  rmsDb: -18,
  sections: [
    { name: 'intro', bars: 4, chords: ['D', 'Bm', 'G', 'Asus4 A'], pad: true, arp: 'up8', bass: 'long' },
    {
      name: 'A', bars: 8, chords: ['D', 'A/C#', 'Bm', 'G', 'D', 'A', 'G', 'A'],
      melody: MENU_A, lead: 'softLead', pad: true, arp: 'up8', bass: 'dotted', drums: 'light',
    },
    {
      name: 'B', bars: 8, chords: ['Bm', 'G', 'D', 'A', 'Em', 'G', 'Asus4', 'A'],
      melody: MENU_B, lead: 'softLead', double: { voice: 'epiano', shift: -12 },
      pad: true, arp: 'broken8', bass: 'dotted', drums: 'rock', crash: true, fill: 'acoustic',
    },
    {
      name: 'A2', bars: 8, chords: ['D', 'A/C#', 'Bm', 'G', 'D', 'A', 'G', 'Asus4 A'],
      melody: MENU_A2, lead: 'softLead', double: { voice: 'bell', shift: 12 },
      pad: true, arp: 'up8', bass: 'dotted', drums: 'rock', crash: true, fill: 'acoustic',
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// AURORA — "Sol na Pista": ensolarada, tom maior, 150 BPM, 52 compassos (83,2 s)
// Escrita em Dó maior e transposta para Si bemol maior.
// ---------------------------------------------------------------------------------------------

const AURORA_A = `
  e5/.5 g5/.5 c6/1 g5/.5 e5/.5 g5/1 | d5/.5 g5/.5 b5/1 g5/1 r/1 | c5/.5 e5/.5 a5/1 e5/.5 c5/.5 e5/1 | b4/.5 e5/.5 g5/1.5 e5/.5 r/1 |
  a5/.75 a5/.75 g5/.5 f5/1 a5/1 | g5/.75 g5/.75 e5/.5 c5/1 e5/1 | f5/.5 e5/.5 d5/.5 f5/.5 a5/1 f5/1 | g5/2 b5/1 d6/1`;

const AURORA_A2 = `
  e5/.5 g5/.5 c6/1 g5/.5 e5/.5 g5/1 | d5/.5 g5/.5 b5/1 g5/1 r/1 | c5/.5 e5/.5 a5/1 e5/.5 c5/.5 e5/1 | b4/.5 e5/.5 g5/1.5 e5/.5 r/1 |
  a5/.75 a5/.75 g5/.5 f5/1 a5/1 | g5/.75 g5/.75 e5/.5 c5/1 e5/1 | d5/.5 f5/.5 a5/.5 d6/.5 c6/1 a5/1 | b5/1.5 g5/.5 d6/2`;

const AURORA_B = `
  c6/1.5 a5/.5 f5/1 a5/1 | b5/1.5 g5/.5 d5/1 g5/1 | g5/1 e5/.5 g5/.5 b5/1.5 a5/.5 | a5/2.5 r/.5 e5/.5 a5/.5 |
  f5/1 a5/.5 d6/1.5 c6/.5 a5/.5 | b5/1 d6/.5 g5/1.5 b5/1 | c6/1 e6/.5 c6/.5 g5/1 e5/1 | d5/.5 g5/.5 b5/.5 d6/.5 g5/1 r/1`;

const AURORA_BRIDGE = `
  a4/1 c5/1 e5/2 | f5/1.5 e5/.5 c5/2 | e5/1 g5/1 c6/2 | b5/1.5 a5/.5 g5/2 |
  a5/1 e5/1 c6/2 | a5/1.5 f5/.5 c5/2 | d5/1 g5/1 b5/1 d6/1 | g5/.5 g5/.5 g5/.5 g5/.5 a5/.5 a5/.5 b5/.5 b5/.5`;

// Variação do tema A: respostas em semicolcheias nos fins de frase.
const AURORA_A3 = `
  e5/.5 g5/.5 c6/1 g5/.5 e5/.5 c6/.5 e6/.5 | d6/.5 b5/.5 g5/1 b5/.5 d6/.5 g5/1 | c5/.5 e5/.5 a5/1 e5/.5 c5/.5 a5/.5 c6/.5 | b5/.5 g5/.5 e5/1 g5/.5 b5/.5 e5/1 |
  a5/.75 a5/.75 c6/.5 a5/1 f5/1 | g5/.75 g5/.75 c6/.5 g5/1 e5/1 | f5/.5 a5/.5 d6/.5 a5/.5 f5/.5 a5/.5 d6/1 | d6/1 b5/1 g5/1 b5/.5 d6/.5`;

const AURORA_B2 = `
  c6/1.5 a5/.5 f5/1 a5/1 | b5/1.5 g5/.5 d5/1 g5/1 | g5/1 e5/.5 g5/.5 b5/1.5 a5/.5 | a5/2.5 r/.5 e5/.5 a5/.5 |
  f5/1 a5/.5 d6/1.5 c6/.5 a5/.5 | b5/1 d6/.5 g5/1.5 b5/1 | c6/1 e6/.5 c6/.5 g5/1 c6/1 | d6/1.5 b5/.5 g5/1 d5/1`;

export const raceAurora: SongDef = {
  id: 'race_aurora',
  bpm: 150,
  transpose: -2,
  loop: true,
  tailSec: 4,
  voices: { bass: 'synthBass', pad: 'pad', stab: 'stab', arp: 'marimba' },
  levels: { drums: -18, bass: -18, pad: -26, stab: -25, arp: -24, lead: -17, double: -25 },
  sends: { lead: 0.35, double: 0.5, arp: 0.35, pad: 0.35, stab: 0.25, drums: 0.08 },
  reverb: { room: 0.62, damp: 0.5, gain: 1 },
  delay: { beats: 0.75, gain: 0.16, feedback: 0.3 },
  rmsDb: -17,
  sections: [
    {
      name: 'intro', bars: 4, chords: ['C', 'F', 'C', 'G'],
      arp: 'updown16', bass: 'eighths', stabs: 'offbeat', drums: 'introKick', crash: true, fill: 'acoustic',
    },
    {
      name: 'A', bars: 8, chords: ['C', 'G/B', 'Am', 'Em', 'F', 'C/E', 'Dm', 'G'],
      melody: AURORA_A, lead: 'brightLead', bass: 'eighths', stabs: 'offbeat', drums: 'sunny', crash: true,
    },
    {
      name: 'A2', bars: 8, chords: ['C', 'G/B', 'Am', 'Em', 'F', 'C/E', 'Dm', 'G'],
      melody: AURORA_A2, lead: 'brightLead', bass: 'eighths', stabs: 'offbeat', arp: 'broken8',
      drums: 'sunny', fill: 'acoustic',
    },
    {
      name: 'B', bars: 8, chords: ['F', 'G', 'Em', 'Am', 'Dm', 'G', 'C', 'G'],
      melody: AURORA_B, lead: 'brightLead', double: { voice: 'bell', shift: 0 },
      bass: 'eighths', pad: true, arp: 'updown16', drums: 'sunnyB', crash: true, fill: 'acoustic',
    },
    {
      name: 'ponte', bars: 8, chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'G'],
      melody: AURORA_BRIDGE, lead: 'marimba', double: { voice: 'epiano', shift: -12 },
      bass: 'long', pad: true, arp: 'broken8', drums: 'half', fill: 'acoustic',
    },
    {
      name: 'A3', bars: 8, chords: ['C', 'G/B', 'Am', 'Em', 'F', 'C/E', 'Dm', 'G'],
      melody: AURORA_A3, lead: 'brightLead', double: { voice: 'marimba', shift: 12 },
      bass: 'eighths', stabs: 'offbeat', arp: 'broken8', drums: 'sunny', crash: true, fill: 'acoustic',
    },
    {
      name: 'B2', bars: 8, chords: ['F', 'G', 'Em', 'Am', 'Dm', 'G', 'C', 'G'],
      melody: AURORA_B2, lead: 'brightLead', double: { voice: 'bell', shift: 12 },
      bass: 'eighths', pad: true, stabs: 'offbeat', arp: 'updown16', drums: 'sunnyB', crash: true, fill: 'acoustic',
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// ECLIPSE — "Neon à Meia-Noite": synthwave tensa, tom menor, 160 BPM, 60 compassos (90 s)
// Escrita em Lá menor e transposta para Sol menor.
// ---------------------------------------------------------------------------------------------

const ECLIPSE_A = `
  a4/1.5 c5/.5 e5/1.5 d5/.5 | e5/2.5 r/.5 c5/.5 d5/.5 | e5/1 f5/.5 e5/.5 c5/1 a4/1 | b4/1.5 d5/.5 g5/2 |
  a5/1.5 g5/.5 e5/1.5 d5/.5 | e5/2.5 r/.5 e5/.5 g5/.5 | a5/1 g5/.5 f5/.5 e5/1 c5/1 | b4/1 e5/1 g#5/1.5 b5/.5`;

const ECLIPSE_A2 = `
  a4/1.5 c5/.5 e5/1.5 d5/.5 | e5/2.5 r/.5 c5/.5 d5/.5 | e5/1 f5/.5 e5/.5 c5/1 a4/1 | b4/1.5 d5/.5 g5/2 |
  a5/1.5 g5/.5 e5/1.5 d5/.5 | e5/2 a5/1 c6/1 | b5/1 a5/.5 g5/.5 f5/1 a5/1 | g#5/2 e5/1 b4/1`;

const ECLIPSE_B = `
  c6/1.5 a5/.5 f5/1 a5/1 | b5/1.5 g5/.5 d5/1 g5/1 | g5/1 b5/1 e6/1.5 d6/.5 | c6/1 a5/1 e5/2 |
  d5/.5 f5/.5 a5/1 d6/1.5 c6/.5 | a5/1 c6/1 f5/2 | e5/.5 g#5/.5 b5/.5 e6/.5 d6/1 b5/1 | g#5/3 r/1`;

const ECLIPSE_C = `
  d5/.5 r/.5 d5/.5 f5/.5 a5/1 f5/1 | d5/.5 r/.5 d5/.5 f5/.5 a5/.5 g5/.5 f5/1 | c5/.5 r/.5 c5/.5 e5/.5 a5/1 e5/1 | c5/.5 r/.5 c5/.5 e5/.5 a5/.5 g5/.5 e5/1 |
  bb4/.5 r/.5 d5/.5 f5/.5 bb5/1 a5/1 | f5/1 d5/1 bb4/2 | b4/.5 e5/.5 g#5/.5 b5/.5 e5/.5 g#5/.5 b5/.5 e6/.5 | e6/2 r/2`;

// Variação do tema A: uma oitava de conversa entre a frase original e respostas mais agudas.
const ECLIPSE_A3 = `
  a5/1.5 c6/.5 e6/1.5 d6/.5 | e6/2 c6/.5 a5/.5 e5/1 | e5/1 f5/.5 e5/.5 c6/1 a5/1 | b5/1.5 d6/.5 g5/2 |
  a5/1 a5/.5 g5/.5 e5/1 a5/.5 c6/.5 | e6/2.5 r/.5 e6/.5 d6/.5 | c6/1 a5/.5 f5/.5 a5/1 c6/1 | b5/1 g#5/1 e5/1.5 b5/.5`;

export const raceEclipse: SongDef = {
  id: 'race_eclipse',
  bpm: 160,
  transpose: -2,
  loop: true,
  tailSec: 4,
  voices: { bass: 'synthBass', pad: 'pad', stab: 'stab', arp: 'pluck' },
  levels: { drums: -18, bass: -17, pad: -25, stab: -25, arp: -24, lead: -17, double: -25 },
  sends: { lead: 0.45, double: 0.55, arp: 0.4, pad: 0.4, stab: 0.3, drums: 0.14 },
  reverb: { room: 0.8, damp: 0.35, gain: 1 },
  delay: { beats: 0.75, gain: 0.24, feedback: 0.42 },
  pump: 0.5,
  rmsDb: -17,
  sections: [
    { name: 'intro1', bars: 4, chords: ['Am', 'Am', 'F', 'G'], arp: 'pulse16', pad: true, bass: 'long' },
    {
      name: 'intro2', bars: 4, chords: ['Am', 'Am', 'F', 'E'],
      arp: 'pulse16', pad: true, bass: 'drive16', drums: 'introKickEl', fill: 'electro',
    },
    {
      name: 'A', bars: 8, chords: ['Am', 'Am', 'F', 'G', 'Am', 'Am', 'F', 'E'],
      melody: ECLIPSE_A, lead: 'synthLead', bass: 'drive16', stabs: 'push', drums: 'four', crash: true,
    },
    {
      name: 'A2', bars: 8, chords: ['Am', 'Am', 'F', 'G', 'Am', 'Am', 'F', 'E'],
      melody: ECLIPSE_A2, lead: 'synthLead', bass: 'drive16', stabs: 'push', arp: 'pulse16',
      drums: 'four', fill: 'electro',
    },
    {
      name: 'B', bars: 8, chords: ['F', 'G', 'Em', 'Am', 'Dm', 'F', 'E', 'E'],
      melody: ECLIPSE_B, lead: 'synthLead', double: { voice: 'bell', shift: 0 },
      bass: 'pump8', pad: true, arp: 'updown16', drums: 'fourB', crash: true, fill: 'electro',
    },
    {
      name: 'C', bars: 8, chords: ['Dm', 'Dm', 'Am', 'Am', 'Bb', 'Bb', 'E', 'E'],
      melody: ECLIPSE_C, lead: 'pluck', double: { voice: 'synthLead', shift: -12 },
      bass: 'drive16', stabs: 'gate8', drums: 'tense', crash: true,
    },
    {
      name: 'quebra', bars: 4, chords: ['Am', 'F', 'Dm', 'E'],
      arp: 'pulse16', pad: true, bass: 'long', drums: 'build',
    },
    {
      name: 'A3', bars: 8, chords: ['Am', 'Am', 'F', 'G', 'Am', 'Am', 'F', 'E'],
      melody: ECLIPSE_A3, lead: 'synthLead', double: { voice: 'pluck', shift: -12 },
      bass: 'drive16', stabs: 'push', arp: 'pulse16', drums: 'fourB', crash: true, fill: 'electro',
    },
    {
      name: 'B2', bars: 8, chords: ['F', 'G', 'Em', 'Am', 'Dm', 'F', 'E', 'E'],
      melody: ECLIPSE_B, lead: 'synthLead', double: { voice: 'bell', shift: 12 },
      bass: 'pump8', pad: true, stabs: 'push', arp: 'updown16', drums: 'fourB', crash: true, fill: 'electro',
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// VITÓRIA — fanfarra em Dó maior, 140 BPM, 5 compassos + cauda (≈ 10 s, sem loop)
// ---------------------------------------------------------------------------------------------

const VICTORY = `
  g4/.5 c5/.5 e5/.5 g5/1 e5/.5 g5/1 | a5/.75 a5/.25 a5/.5 f5/.5 a5/1 c6/1 | b5/.75 b5/.25 b5/.5 g5/.5 b5/1 d6/1 |
  c6/2.5 g5/.5 e5/.5 g5/.5 | c6/2.5 r/1.5`;

export const victory: SongDef = {
  id: 'victory',
  bpm: 140,
  transpose: 0,
  loop: false,
  tailSec: 1.6,
  voices: { bass: 'roundBass', pad: 'pad', stab: 'brass', arp: 'bell' },
  levels: { drums: -19, bass: -19, pad: -25, stab: -22, arp: -25, lead: -17, double: -21 },
  sends: { lead: 0.45, double: 0.45, arp: 0.5, pad: 0.4, stab: 0.4, drums: 0.2 },
  reverb: { room: 0.82, damp: 0.35, gain: 1 },
  fadeOutSec: 0.5,
  rmsDb: -16,
  sections: [
    {
      name: 'fanfarra', bars: 3, chords: ['C', 'F', 'G'],
      melody: VICTORY.split('|').slice(0, 3).join('|'), lead: 'brass', double: { voice: 'brass', shift: -12 },
      bass: 'dotted', stabs: 'push', drums: 'fanfare',
    },
    {
      name: 'final', bars: 2, chords: ['C', 'C'],
      melody: VICTORY.split('|').slice(3).join('|'), lead: 'brass', double: { voice: 'brass', shift: -12 },
      bass: 'long', pad: true, arp: 'updown16', drums: 'fanfareEnd',
    },
  ],
};

// ---------------------------------------------------------------------------------------------
// DERROTA — melancólica mas leve, Lá menor → Dó maior, 96 BPM, 3 compassos (≈ 7,5 s, sem loop)
// ---------------------------------------------------------------------------------------------

const DEFEAT = `e5/1 d5/.5 c5/.5 a4/2 | c5/1 b4/.5 a4/.5 g4/1 b4/1 | c5/1 e5/1 g5/2`;

export const defeat: SongDef = {
  id: 'defeat',
  bpm: 96,
  transpose: 0,
  loop: false,
  tailSec: 0.3,
  voices: { bass: 'roundBass', pad: 'pad', stab: 'stab', arp: 'epiano' },
  levels: { drums: -30, bass: -21, pad: -23, stab: -30, arp: -24, lead: -18, double: -24 },
  sends: { lead: 0.6, double: 0.6, arp: 0.5, pad: 0.5 },
  reverb: { room: 0.88, damp: 0.5, gain: 1 },
  fadeOutSec: 2.2,
  rmsDb: -19,
  sections: [
    {
      name: 'queda', bars: 3, chords: ['Am', 'F G', 'C'],
      melody: DEFEAT, lead: 'epiano', double: { voice: 'softLead', shift: 0 },
      bass: 'long', pad: true, arp: 'up8',
    },
  ],
};

export const SONGS: SongDef[] = [menu, raceAurora, raceEclipse, victory, defeat];
