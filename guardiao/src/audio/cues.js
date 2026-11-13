// Trilha instrumental original e efeitos sonoros, em tempo absoluto (0–90 s), alinhados à decupagem de src/episodes/.
// Ré menor, 80 bpm (1 compasso = 3 s; cada sequência tem 6 compassos). O tema de Kaito volta em quatro momentos.
const D2 = 73.42, hz = (semi, base = D2) => base * Math.pow(2, semi / 12);
const CH = { Dm: [0, 7, 15, 19], Bb: [-4, 8, 14, 17], F: [3, 12, 19, 24], C: [-2, 10, 16, 19], Gm: [-7, 5, 14, 17], A: [-5, 7, 13, 16], Dsus: [0, 7, 12, 19], Fh: [3, 15, 19, 24, 28] };
const BARS = [
  null, 'Dm', 'Bb', 'Bb', 'F', 'C',                 // seq. 1 (o primeiro compasso é silêncio: a estrela morre sem som)
  'Bb', 'F', 'C', 'Dm', 'Bb', 'C',                  // seq. 2
  'Dm', 'Gm', 'Dm', 'A', 'Dsus', 'Dsus',            // seq. 3
  'Bb', 'C', 'Dm', 'F', 'Bb', 'C',                  // seq. 4
  'F', 'C', 'Dm', 'Bb', 'F', 'Fh',                  // seq. 5
];
const THEME = [[0, 19, 1.5], [1.5, 22, 0.5], [2, 24, 1], [3, 27, 1.5], [4.5, 26, 0.5], [5, 24, 2.6]];   // [batida, semitom, duração em batidas]

export function compose(S) {
  const beat = 0.75;
  BARS.forEach((name, i) => {
    if (!name) return; const t = i * 3, ch = CH[name], seqi = Math.floor(i / 6), last = i === BARS.length - 1;
    const energy = [0.55, 0.8, 0.7, 1.0, 0.75][seqi] * (seqi === 3 ? 0.7 + (i - 18) * 0.1 : 1);
    S.pad(t, [hz(ch[0] - 12), hz(ch[0])], 3.4, 0.11 * energy, 420);
    S.strings(t, ch.slice(0, 4).map((s) => hz(s + 12)), last ? 5.5 : 3.1, 0.035 * energy, 1500 + energy * 900);
    if (seqi === 3 || (seqi === 0 && i >= 4) || seqi === 4) S.choir(t, [hz(ch[1] + 12), hz(ch[2] + 12), hz(ch[3] + 12)], last ? 5.5 : 3.1, 0.05 * energy);
    // harpa: arpejo em colcheias (some no túnel e no vazio)
    const harp = !(i >= 15 && i <= 18) && i >= 1, pat = [0, 1, 2, 3, 2, 1, 2, 3];
    if (harp) for (let k = 0; k < 8; k++) { if (last && k > 4) break; S.harp(t + k * beat / 2, hz(ch[pat[k] % ch.length] + 24 + (k === 3 ? 12 : 0)), (0.2 + (k % 4 === 0 ? 0.08 : 0)) * energy, (k % 4 - 1.5) * 0.3); }
    // percussão: pulsos na sequência 3 (templo), tutti na 4
    if (seqi === 2 && i < 15) { S.taiko(t, 0.5, 52); S.taiko(t + 1.5, 0.3, 60, 0.2); }
    if (seqi === 3 && i >= 19) for (let k = 0; k < 8; k++) { const acc = k % 4 === 0; if (acc || k % 2 === 1 || i >= 21) S.taiko(t + k * beat / 2, (acc ? 0.75 : 0.32) * energy, acc ? 50 : 70, acc ? 0 : 0.25); }
    if (seqi === 1) for (const k of [0, 3, 6]) S.rim(t + k * beat / 2, 0.12, 0.3);
  });
  const theme = (t0, vel, oct = 0, len = 1) => THEME.forEach(([b, s, d]) => S.flute(t0 + b * beat * len, hz(s + 12 * oct, D2 * 2), d * beat * len, vel, -0.1));
  theme(9.2, 0.13); theme(24.2, 0.17); theme(63.2, 0.22, 1); theme(66.0, 0.16); theme(75.2, 0.16); theme(84.0, 0.12, 0, 1.05);
  // túnel de galáxias: acorde suspenso com cluster crescente
  S.strings(45, [hz(12), hz(13), hz(19), hz(24)], 8.5, 0.05, 2600); S.sub(45, 9, 36.7, 0.35);
  S.pad(54, [hz(0), hz(7)], 4.5, 0.1, 300);
}

const rep = (t0, t1, dt, fn) => { const o = []; for (let t = t0, i = 0; t < t1; t += dt, i++) o.push(fn(t, i)); return o; };
export const CUES = [
  // ---- seq. 1: a estrela morre em silêncio
  [0, 'sub', 3.2, 30, 0.3], [0.3, 'shimmer', 2.6, 0.1, 2000, 24], [1.2, 'riser', 1.9, 0.06], [3, 'bed', 9, 0.06, 'bandpass', 500, 0.6, 0.25], [3.2, 'whoosh', 2.2, 0.25, 200, 1300, 0.6],
  [3.4, 'bed', 4, 0.07, 'highpass', 3000, 0.5, 0], [4.7, 'bell', 880, 0.08, 1.2], [5.3, 'bell', 880, 0.1, 1.2], [5.9, 'bell', 880, 0.12, 1.2], [6.5, 'bell', 988, 0.14, 1.2],
  [7.3, 'shimmer', 1.2, 0.22, 1500, 20], [7.4, 'lumi', 0.2, 1, 5], [8.1, 'lumi', 0.14, 1, 4], [8.8, 'lumi', 0.14, -1, 4], [9.5, 'shimmer', 1.6, 0.12, 1100, 16], [9.6, 'bell', 1318, 0.1, 2], [11.3, 'bell', 1760, 0.12, 2.5],
  [12, 'rumble', 4.2, 0.5], [12.4, 'sub', 5, 34, 0.4], [12.9, 'whale', 82, 3.4, 0.38], [15.2, 'whale', 98, 3.0, 0.3], [14.2, 'whoosh', 2.4, 0.3, 150, 900, 0.7], [16.9, 'riser', 1.05, 0.22], [17.4, 'shimmer', 0.8, 0.2, 1400, 18],
  // ---- seq. 2: o oceano acima das nuvens
  [18, 'boom', 0.6, 44, 2.2], [18.1, 'whoosh', 1.6, 0.3, 2400, 300, -0.5], [18, 'bed', 4.5, 0.08, 'bandpass', 600, 0.5, 0.2], [19.5, 'whale', 110, 2.6, 0.22],
  ...rep(18.6, 22, 0.55, (t, i) => [t, 'tick', 0.05, 3000 + (i % 3) * 600]),
  [22.2, 'whoosh', 1.2, 0.4, 600, 150, 0.2], [22.9, 'boom', 0.85, 40, 2.4], [23, 'bed', 13, 0.13, 'lowpass', 300, 0.8, 0.18], [23, 'shimmer', 3, 0.1, 700, 22], ...rep(23.3, 31.5, 0.9, (t, i) => [t, 'bell', [523, 659, 784, 587][i % 4] * 2, 0.045, 1.6]),
  [26.4, 'whale', 73, 3.2, 0.26], [27.2, 'riser', 1.6, 0.12], [28.0, 'shatter', 2.4, 0.22, 46], [28.2, 'lumi', 0.12, 1, 4], [30.4, 'shimmer', 1.8, 0.2, 1300, 26], [31.6, 'bell', 196, 0.3, 4],
  [32, 'riser', 1.7, 0.2], [32.2, 'bed', 3.8, 0.12, 'bandpass', 240, 3, 0.4], [33.8, 'boom', 0.9, 36, 2.6], [34.2, 'whoosh', 1.7, 0.5, 300, 4000, 0.8], [34.6, 'rumble', 1.4, 0.4], [35.2, 'riser', 0.8, 0.25],
  // ---- seq. 3: o templo dos mil universos
  [36, 'boom', 0.8, 42, 2.5], [36, 'bed', 9, 0.07, 'bandpass', 420, 0.6, 0.3], [36.3, 'step', 0.3, 160], [36.4, 'shimmer', 3.4, 0.08, 900, 24], [38.3, 'whoosh', 1.6, 0.2, 300, 1200, -0.7],
  [40, 'boom', 0.7, 38, 3], [40, 'rumble', 3, 0.3], ...rep(40.3, 45, 0.6, (t, i) => [t, 'tick', 0.12, 700 + (i % 4) * 150]), ...rep(40.6, 45, 1.5, (t) => [t, 'heart', 0.42]), [41.4, 'bell', 147, 0.3, 4],
  [44.2, 'riser', 0.8, 0.2], [45, 'freeze', 0.8], [45.1, 'shatter', 1.2, 0.3, 24], [45.3, 'bed', 8.6, 0.14, 'bandpass', 700, 0.7, 3], [45.4, 'whoosh', 2.2, 0.4, 200, 2600, 0.8], [47.5, 'whoosh', 2.2, 0.35, 300, 3000, -0.8],
  ...rep(46, 50, 0.5, (t, i) => [t, 'shimmer', 0.4, 0.07, 800 + i * 120, 5]), [50, 'shatter', 3.4, 0.3, 70], [50, 'sub', 4, 32, 0.4], [52.0, 'bell', 98, 0.35, 3], [53.2, 'riser', 0.78, 0.35],
  // ---- seq. 4: o despertar da última estrela
  [54, 'boom', 1, 34, 3.5], [54.05, 'shimmer', 1.5, 0.22, 1600, 24], [54.5, 'bed', 4, 0.04, 'lowpass', 120, 1, 0.2], [55, 'heart', 0.4], [56.2, 'heart', 0.42], [57.4, 'heart', 0.45], [55.5, 'shimmer', 2.6, 0.08, 1200, 18],
  [57.6, 'riser', 0.6, 0.18], [58.2, 'boom', 0.9, 40, 2.5], [58.25, 'whoosh', 1.8, 0.35, 200, 2400, 0.7], [59.8, 'boom', 0.8, 46, 2.2], [59.85, 'whoosh', 1.8, 0.35, 200, 2800, -0.7], [61.4, 'boom', 0.8, 52, 2.0], [60, 'shimmer', 3, 0.14, 900, 30],
  [62.8, 'whale', 98, 3.0, 0.3], [63, 'lumi', 0.14, 1, 5], [63.3, 'shimmer', 1, 0.2, 1500, 16], [63.2, 'bed', 4.8, 0.1, 'bandpass', 900, 0.6, 4], [65.6, 'whale', 123, 2.4, 0.22], [67, 'riser', 1.05, 0.34],
  [68.05, 'boom', 1, 30, 4], [68.1, 'shatter', 3.6, 0.3, 90], [68.1, 'shimmer', 3.8, 0.24, 1000, 50], [68.3, 'whoosh', 3.2, 0.4, 200, 3200, 0.9], [70.6, 'riser', 1.3, 0.16],
  // ---- seq. 5: quando o universo voltou a respirar
  [72, 'bell', 147, 0.35, 5], [72, 'shimmer', 2.4, 0.18, 1300, 26], [72, 'bed', 17, 0.05, 'bandpass', 800, 0.5, 0.2], [72.5, 'bed', 9.5, 0.06, 'highpass', 3200, 0.5, 0],
  ...[73.2, 74.1, 75.3, 76.4, 77.6, 78.5, 79.7, 80.6, 82.9, 85.6].map((t, i) => [t, 'chirp', 0.11, (i % 3 - 1) * 0.6]), ...rep(77.3, 79.4, 0.21, (t, i) => [t, 'step', 0.1, 320]),
  [78.2, 'whale', 110, 3.4, 0.26], [81.9, 'lumi', 0.13, 1, 4], [84.0, 'lumi', 0.1, 1, 3], [86, 'whoosh', 3, 0.3, 300, 1500, 0.5], [86.2, 'riser', 1.6, 0.1], [87.6, 'whale', 87, 2.6, 0.3], [88.2, 'bell', 1175, 0.2, 2.5], [88.2, 'shimmer', 1.6, 0.2, 1500, 22], [88.4, 'bell', 294, 0.3, 2],
];
