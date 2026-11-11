// audio.js: trilha eletrônica original, efeitos sincronizados e narração, tudo com a Web Audio API.
// A mixagem inteira (100 s) é sintetizada uma vez num OfflineAudioContext e tocada como um buffer:
// assim o som acompanha qualquer salto no tempo e o mesmo buffer serve para exportar o vídeo.
import { EP_DUR, N_EPS, TOTAL, rng } from './core.js';

const SR = 44100, BEAT = 0.5, BAR = 2;
const N = { D: 2, Eb: 3, F: 5, G: 7, A: 9, Bb: 10, C: 0 };
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
// acordes (2 compassos cada): [tônica MIDI, terça]
const CH = (root, minor) => [root, minor ? 3 : 4];
const PROG = [
  [CH(38, 1), CH(34, 0), CH(41, 0), CH(36, 0), CH(38, 1)],          // ep1  Dm Bb F C Dm
  [CH(38, 1), CH(39, 0), CH(43, 1), CH(34, 0), CH(33, 0)],          // ep2  Dm Eb Gm Bb A
  [CH(41, 0), CH(36, 0), CH(38, 1), CH(34, 0), CH(36, 0)],          // ep3  F C Dm Bb C
  [CH(34, 0), CH(43, 1), CH(38, 1), CH(41, 0), CH(33, 0)],          // ep4  Bb Gm Dm F A
  [CH(38, 1), CH(34, 0), CH(41, 0), CH(36, 0), CH(38, 0)],          // ep5  Dm Bb F C D
];
// efeitos por episódio: [tempo local, tipo, parâmetro]
const SFX = [
  [[0.2, 'drone', 5], [0.3, 'whoosh', 2.5], [5.1, 'shimmer', 3], [8.3, 'blip', 880], [10.7, 'impact'], [10.7, 'spark', 4], [14.8, 'riser', 1.1], [15.9, 'impact'], [16, 'shimmer', 3]],
  [[0.1, 'whoosh', 1.2], [1.6, 'whoosh', 0.8], [3.1, 'whoosh', 1], [5.0, 'buzz'], [5.7, 'buzz'], [6.3, 'buzz'], [7.0, 'buzz'], [7.6, 'buzz'], [8.4, 'buzz'], [9.1, 'buzz'], [5.0, 'alarm', 4.8], [10.0, 'riser', 1.6], [10.6, 'blip', 660], [11.3, 'blip', 740], [12.0, 'blip', 880], [12.7, 'blip', 990], [13.4, 'blip', 1100], [14.1, 'blip', 1320], [15.0, 'impact'], [15.1, 'shimmer', 4]],
  [[0.1, 'whoosh', 3], [5.2, 'blip', 660], [6.4, 'blip', 880], [7.6, 'blip', 990], [10.4, 'chime', 587], [11.3, 'chime', 698], [12.1, 'chime', 784], [12.9, 'chime', 880], [13.6, 'chime', 1047], [14.2, 'chime', 1175], [14.4, 'riser', 1.2], [15.6, 'impact'], [15.6, 'shimmer', 4]],
  [[0.1, 'drone', 5], [0.4, 'impact'], [1, 'shimmer', 4], [5.2, 'spark', 4], [10.2, 'blip', 1320], [11.6, 'buzz'], [12.3, 'blip', 880], [12.6, 'blip', 1320], [13.6, 'blip', 1760], [14.2, 'riser', 0.8], [15.0, 'impact'], [15.2, 'shimmer', 4]],
  [[0.1, 'whoosh', 2], [5.0, 'spark', 5], [6.2, 'chime', 587], [7.4, 'chime', 698], [8.6, 'chime', 880], [9.6, 'chime', 1175], [9.2, 'riser', 0.8], [10.0, 'impact'], [10.1, 'whoosh', 1.5], [11.6, 'riser', 0.6], [12.2, 'shimmer', 4], [15.0, 'impact'], [16.0, 'shimmer', 4]],
];

function build(ctx, narr) {
  const rnd = rng(2024), dest = ctx.destination;
  const noiseBuf = ctx.createBuffer(1, SR * 2, SR); { const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = rnd() * 2 - 1; }
  const ir = ctx.createBuffer(2, SR * 3.2, SR); for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / d.length, 2.6); }
  const G = (v, to) => { const g = ctx.createGain(); g.gain.value = v; if (to) g.connect(to); return g; };
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
  const out = G(0.55, dest); comp.connect(out);
  const music = G(1, comp), duck = G(1, music), drums = G(1, music), fxBus = G(0.9, comp), voice = G(1.5, comp);
  const rev = ctx.createConvolver(); rev.buffer = ir; const revG = G(0.5, comp); rev.connect(revG); const send = G(1, rev);
  const dly = ctx.createDelay(1); dly.delayTime.value = BEAT * 0.75; const fb = G(0.38, dly); dly.connect(fb); const dlyOut = G(0.5, duck); dly.connect(dlyOut); dly.connect(send); const dsend = G(1, dly);

  const env = (g, t, a, d, peak, sus = 0) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(sus, t + a, d / 3); };
  const osc = (type, f, t, dur, detune = 0) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune; o.start(t); o.stop(t + dur); return o; };
  const noise = (t, dur) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.start(t, rnd() * 1.5); s.stop(t + dur); return s; };
  const filt = (type, f, q = 1) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b; };

  const kick = (t, v = 1) => { const o = osc('sine', 150, t, 0.4), g = G(0, drums); o.frequency.exponentialRampToValueAtTime(42, t + 0.13); env(g, t, 0.002, 0.3, v); o.connect(g);
    duck.gain.setValueAtTime(0.45, t); duck.gain.linearRampToValueAtTime(1, t + 0.28); };
  const snare = (t, v = 0.6) => { const n = noise(t, 0.3), f = filt('bandpass', 1900, 0.8), g = G(0, drums); env(g, t, 0.002, 0.2, v); n.connect(f).connect(g); g.connect(send);
    const o = osc('triangle', 200, t, 0.15), g2 = G(0, drums); env(g2, t, 0.002, 0.1, v * 0.5); o.connect(g2); };
  const hat = (t, v = 0.18, d = 0.05) => { const n = noise(t, d + 0.05), f = filt('highpass', 7500), g = G(0, drums); env(g, t, 0.001, d, v); n.connect(f).connect(g); };
  const bass = (t, m, dur, v = 0.5, cut = 500) => { const f = filt('lowpass', cut, 4), g = G(0, duck); f.frequency.setValueAtTime(cut * 2.4, t); f.frequency.exponentialRampToValueAtTime(cut * 0.6, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.setValueAtTime(v, t + dur * 0.7); g.gain.linearRampToValueAtTime(0, t + dur);
    osc('sawtooth', hz(m), t, dur).connect(f); osc('square', hz(m), t, dur, 7).connect(f); f.connect(g); const s = osc('sine', hz(m - 12), t, dur), sg = G(v * 0.9, g); s.connect(sg); };
  const pad = (t, notes, dur, v = 0.1, cut = 1400) => { const f = filt('lowpass', cut * 0.5, 0.7), g = G(0, duck); f.frequency.linearRampToValueAtTime(cut, t + dur * 0.5); f.frequency.linearRampToValueAtTime(cut * 0.6, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.7); g.gain.setValueAtTime(v, t + dur - 0.3); g.gain.linearRampToValueAtTime(0, t + dur + 0.9);
    for (const m of notes) for (const d of [-9, 0, 8]) osc('sawtooth', hz(m), t, dur + 1, d).connect(f); f.connect(g); g.connect(send); };
  const pluck = (t, m, v = 0.16, cut = 2600) => { const f = filt('lowpass', cut, 6), g = G(0, duck); f.frequency.setValueAtTime(cut, t); f.frequency.exponentialRampToValueAtTime(300, t + 0.22); env(g, t, 0.003, 0.22, v);
    osc('sawtooth', hz(m), t, 0.4).connect(f); osc('square', hz(m + 12), t, 0.4, 5).connect(f); f.connect(g); g.connect(dsend); };
  const lead = (t, m, dur, v = 0.14) => { const f = filt('lowpass', 3200, 2), g = G(0, duck); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.04); g.gain.setTargetAtTime(v * 0.6, t + 0.1, 0.2); g.gain.setTargetAtTime(0, t + dur, 0.08);
    const o = osc('sawtooth', hz(m), t, dur + 0.5), o2 = osc('sawtooth', hz(m), t, dur + 0.5, 12), lfo = osc('sine', 5.5, t, dur + 0.5), lg = G(6); lfo.connect(lg); lg.connect(o.detune);
    o.connect(f); o2.connect(f); f.connect(g); g.connect(dsend); g.connect(send); };
  const sweep = (t, dur, f0, f1, v, q = 1.2, up = true) => { const n = noise(t, dur + 0.1), f = filt('bandpass', f0, q), g = G(0, fxBus); f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0, t); if (up) { g.gain.linearRampToValueAtTime(v, t + dur * 0.92); g.gain.linearRampToValueAtTime(0, t + dur); } else { g.gain.linearRampToValueAtTime(v, t + dur * 0.3); g.gain.linearRampToValueAtTime(0, t + dur); }
    n.connect(f).connect(g); g.connect(send); };
  const fx = {
    whoosh: (t, d = 1) => sweep(t, d, 300, 2400, 0.35, 0.9, false),
    riser: (t, v = 1) => { sweep(t, BAR * 0.9 * 1, 250, 7000, 0.3 * v, 1.5, true); },
    impact: t => { const o = osc('sine', 85, t, 1.6), g = G(0, fxBus); o.frequency.exponentialRampToValueAtTime(28, t + 0.9); env(g, t, 0.004, 1.3, 0.95); o.connect(g);
      const n = noise(t, 1.2), f = filt('lowpass', 900), g2 = G(0, fxBus); f.frequency.exponentialRampToValueAtTime(120, t + 0.9); env(g2, t, 0.003, 0.8, 0.5); n.connect(f).connect(g2); g2.connect(send); },
    blip: (t, f = 880) => { const o = osc('sine', f, t, 0.2), g = G(0, fxBus); o.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.08); env(g, t, 0.003, 0.12, 0.2); o.connect(g); g.connect(send); },
    chime: (t, f = 880) => { for (const [m, v] of [[1, 0.2], [2, 0.09], [3.01, 0.05]]) { const o = osc('sine', f * m, t, 1.6), g = G(0, fxBus); env(g, t, 0.004, 1.1, v); o.connect(g); g.connect(send); } },
    buzz: t => { for (const f of [98, 104]) { const o = osc('sawtooth', f, t, 0.36), lp = filt('lowpass', 1400), g = G(0, fxBus), am = osc('square', 31, t, 0.36), ag = G(0.5); am.connect(ag); ag.connect(g.gain);
      g.gain.setValueAtTime(0.16, t); g.gain.setValueAtTime(0.16, t + 0.28); g.gain.linearRampToValueAtTime(0, t + 0.34); o.connect(lp).connect(g); } },
    alarm: (t, dur = 4) => { for (let k = 0; k < dur / 0.6; k++) { const tt = t + k * 0.6, o = osc('square', 740, tt, 0.3), lp = filt('lowpass', 1800), g = G(0, fxBus); o.frequency.setValueAtTime(740, tt); o.frequency.setValueAtTime(587, tt + 0.14); env(g, tt, 0.005, 0.28, 0.045); o.connect(lp).connect(g); g.connect(send); } },
    shimmer: (t, d = 3) => { for (let k = 0; k < 14; k++) { const tt = t + rnd() * d * 0.7, f = hz(74 + [0, 3, 7, 10, 12, 15, 19][Math.floor(rnd() * 7)] + 12), o = osc('sine', f, tt, 1.2), g = G(0, fxBus); env(g, tt, 0.01, 0.9, 0.035); o.connect(g); g.connect(send); } },
    spark: (t, d = 4) => { for (let k = 0; k < d * 9; k++) { const tt = t + Math.pow(rnd(), 0.7) * d, o = osc('triangle', 900 + rnd() * 2600, tt, 0.08), g = G(0, fxBus); env(g, tt, 0.002, 0.05, 0.03 + rnd() * 0.03); o.connect(g); g.connect(send); } },
    drone: (t, d = 5) => { const f = filt('lowpass', 140), g = G(0, fxBus); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.4, t + d * 0.5); g.gain.linearRampToValueAtTime(0, t + d);
      osc('sawtooth', hz(26), t, d).connect(f); osc('sawtooth', hz(26), t, d, 14).connect(f); f.connect(g); g.connect(send); },
  };

  // ------------------------------------------------------------------ a partitura: 5 episódios x 10 compassos
  const ARP = [0, 7, 12, 15, 19, 12, 7, 15], MOTIF = [[0, 74, 1.5], [1.5, 77, 0.5], [2, 81, 1.5], [3.5, 79, 0.5], [4, 77, 1], [5, 74, 1], [6, 72, 1], [7, 74, 1]];
  for (let e = 0; e < N_EPS; e++) for (let b = 0; b < 10; b++) {
    const t0 = e * EP_DUR + b * BAR, [root, third] = PROG[e][b >> 1], minor = third === 3, chord = [root + 12, root + 12 + third, root + 19, root + 24 + (minor ? 3 : 4) - (b % 2 ? 0 : 0)];
    const on = (list) => list.includes(b);
    // intensidade por trecho
    const drumsOn = [[5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 8, 9], [2, 3, 4, 5, 6, 7, 8, 9], [3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6]][e], half = e === 2 || (e === 0 && b < 8);
    const padV = [0.085, 0.07, 0.1, 0.09, 0.1][e] * (e === 4 && b >= 8 ? 1.1 : 1), padCut = [1100 + b * 120, 900, 1700, 1000 + b * 150, 2200][e];
    if (!(e === 4 && b === 9)) pad(t0, chord, BAR, padV * (e === 0 && b === 0 ? 0.6 : 1), padCut);
    if (on(drumsOn)) {
      for (let k = 0; k < 4; k++) if (!half || k % 2 === 0) kick(t0 + k * BEAT, 0.9);
      if (half) snare(t0 + BEAT * 2); else { snare(t0 + BEAT); snare(t0 + BEAT * 3); }
      for (let k = 0; k < 8; k++) hat(t0 + k * BEAT / 2 + (k % 2 ? 0 : 0), k % 2 ? 0.2 : 0.1, k === 7 && b % 2 ? 0.2 : 0.04);
      if ((e === 4 && (b === 4 || b === 6)) || (e === 1 && b === 4) || (e === 3 && b === 7)) for (let k = 0; k < 8; k++) snare(t0 + BAR - (8 - k) * BEAT / 4, 0.2 + k * 0.05);   // rufo
    }
    const bassOn = [[3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 7, 8, 9], [1, 2, 3, 4, 5, 6, 7, 8, 9], [2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7]][e];
    if (on(bassOn)) {
      const steps = e === 1 || e === 4 || (e === 3 && b >= 5) ? 8 : 4;
      for (let k = 0; k < steps; k++) bass(t0 + k * BAR / steps, root - (k % 4 === 3 && steps === 8 ? -12 : 0) - 0, BAR / steps * 0.92, e === 1 ? 0.42 : 0.36, e === 1 ? 700 : 480);
    }
    const arpOn = [[2, 3, 4, 5, 6, 7, 8, 9], [5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], [1, 2, 3, 4, 5, 6, 7, 8, 9], [0, 1, 2, 3, 4, 5, 6, 7]][e];
    if (on(arpOn)) {
      const steps = (e === 0 && b < 5) || (e === 3 && b < 5) ? 8 : 16;
      for (let k = 0; k < steps; k++) { const iv = ARP[(k + b) % 8], m = root + 24 + (iv === 15 ? (minor ? 15 : 16) : iv); pluck(t0 + k * BAR / steps, m, (e === 4 ? 0.13 : 0.1) * (k % 4 === 0 ? 1.3 : 1), 1800 + b * 200); }
    }
    if ((e === 4 && b < 8) || (e === 2 && b >= 6) || (e === 0 && b >= 8)) {   // tema
      const tr = [0, -4, 3, -2, 0][b >> 1] ?? 0;
      if (b % 2 === 0) for (const [bt, m, d] of MOTIF.slice(0, 4)) lead(t0 + bt * BEAT, m + tr, d * BEAT * 0.9, e === 4 ? 0.13 : 0.08);
      else for (const [bt, m, d] of MOTIF.slice(4)) lead(t0 + (bt - 4) * BEAT, m + tr, d * BEAT * 0.9, e === 4 ? 0.13 : 0.08);
    }
    if (b === 9 && e < N_EPS - 1) fx.riser(t0 + 0.15, 1);
    if (b === 0 && e > 0) fx.impact(t0);
  }
  // acorde final de ré maior
  pad(4 * EP_DUR + 16, [50, 57, 62, 66, 69], 2.6, 0.12, 2400); fx.impact(4 * EP_DUR + 16);
  SFX.forEach((list, e) => list.forEach(([t, type, p]) => fx[type](e * EP_DUR + t, p)));

  // narração gravada + a música abaixa enquanto ele fala
  for (const c of narr) {
    if (c.buffer) { const s = ctx.createBufferSource(); s.buffer = c.buffer; s.connect(voice); s.connect(G(0.12, send)); s.start(c.T0); }
    if (c.buffer || c.duck) { music.gain.setTargetAtTime(0.5, c.T0 - 0.15, 0.08); music.gain.setTargetAtTime(1, c.T0 + c.dur + 0.1, 0.25); }
  }
  out.gain.setValueAtTime(0.55, TOTAL - 1.6); out.gain.linearRampToValueAtTime(0, TOTAL - 0.05);
}

// narr: [{T0, dur, buffer?}] ; devolve um AudioBuffer estéreo de TOTAL segundos
export async function renderMix(narr) {
  const ctx = new OfflineAudioContext(2, Math.ceil(TOTAL * SR), SR);
  build(ctx, narr);
  return ctx.startRendering();
}

export async function loadNarration(roteiro) {
  const cues = []; let meta = null;
  try { const r = await fetch('audio/narracao.json'); if (r.ok) meta = await r.json(); } catch { /* sem narração gravada */ }
  const dec = new OfflineAudioContext(1, SR, SR);
  for (const ep of roteiro.episodios) for (const [i, f] of ep.falas.entries()) {
    const key = `ep${ep.id}_${i}`, words = f.texto.split(' '), T0 = (ep.id - 1) * EP_DUR + f.em; let buffer = null, dur, times;
    if (meta?.[key]) { try { buffer = await dec.decodeAudioData(await (await fetch(`audio/${key}.mp3`)).arrayBuffer()); } catch { buffer = null; } }
    if (buffer) { dur = meta[key].dur; times = meta[key].palavras; }
    else {   // estimativa para a Web Speech API: ~14 caracteres por segundo
      dur = f.texto.length / 14 + 0.3; const w = words.map(s => s.length + 1.5), tot = w.reduce((a, b) => a + b, 0); let acc = 0;
      times = w.map(v => { const a = acc / tot * dur; acc += v; return [a, acc / tot * dur]; });
    }
    cues.push({ T0, dur, text: f.texto, buffer, words: words.map((w, k) => ({ w, a: times[k][0], b: times[k][1] })) });
  }
  return { cues, recorded: cues.every(c => c.buffer) };
}

export function wavFromBuffer(buf) {
  const n = buf.length, ch = buf.numberOfChannels, out = new DataView(new ArrayBuffer(44 + n * ch * 2)), w = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
  out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, n * ch * 2, true);
  const d = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  for (let i = 0, o = 44; i < n; i++) for (let c = 0; c < ch; c++, o += 2) out.setInt16(o, Math.max(-1, Math.min(1, d[c][i])) * 32767, true);
  return new Blob([out], { type: 'audio/wav' });
}
