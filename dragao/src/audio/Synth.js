import { rng } from '../core/util.js';

// Procedural, original sound design built only from Web Audio nodes.
// Works on any BaseAudioContext — we render each episode with an
// OfflineAudioContext, so the live player and the MP4 export hear the same mix.
export const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class Synth {
  constructor(ctx, seed = 11) {
    this.ctx = ctx; this.r = rng(seed);
    this.master = ctx.createGain(); this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    this.master.connect(comp); comp.connect(ctx.destination);
    this.music = ctx.createGain(); this.music.connect(this.master);
    this.fx = ctx.createGain(); this.fx.connect(this.master);
    this.voice = ctx.createGain(); this.voice.gain.value = 1.0; this.voice.connect(this.master);
    // shared reverb send
    this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(3.2, 2.6);
    this.verbIn = ctx.createGain(); this.verbIn.gain.value = 1; this.verbIn.connect(this.verb);
    const vOut = ctx.createGain(); vOut.gain.value = 0.55; this.verb.connect(vOut); vOut.connect(this.master);
    this.noiseBuf = this.makeNoise(4);
  }
  makeNoise(sec) {
    const b = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * sec), this.ctx.sampleRate);
    const d = b.getChannelData(0); const r = rng(77); for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1; return b;
  }
  impulse(sec, decay) {
    const sr = this.ctx.sampleRate, n = Math.floor(sr * sec), b = this.ctx.createBuffer(2, n, sr), r = rng(5);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  }
  env(g, t, { attack = 0.01, dur = 1, release = 0.3, gain = 1, curve = 'exp' }) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + attack);
    const hold = Math.max(t + attack, t + dur - release);
    g.gain.setValueAtTime(gain, hold);
    if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t + dur); else g.gain.linearRampToValueAtTime(0, t + dur);
  }
  out(bus, send = 0.2) { const g = this.ctx.createGain(); g.connect(bus === 'music' ? this.music : this.fx); if (send) { const s = this.ctx.createGain(); s.gain.value = send; g.connect(s); s.connect(this.verbIn); } return g; }
  pan(node, p) { if (!p) return node; const s = this.ctx.createStereoPanner(); s.pan.value = p; s.connect(node); return s; }

  tone({ t, dur = 1, freq = 220, freqEnd, type = 'sine', gain = 0.2, attack = 0.01, release = 0.3, bus = 'fx', send = 0.2, filter, pan = 0, detune = 0, curve }) {
    const o = this.ctx.createOscillator(); o.type = type; o.detune.value = detune;
    o.frequency.setValueAtTime(freq, t); if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = this.ctx.createGain(); this.env(g, t, { attack, dur, release, gain, curve });
    let n = o;
    if (filter) { const f = this.ctx.createBiquadFilter(); f.type = filter.type || 'lowpass'; f.frequency.setValueAtTime(filter.freq, t); if (filter.freqEnd) f.frequency.exponentialRampToValueAtTime(filter.freqEnd, t + dur); f.Q.value = filter.Q || 0.7; n.connect(f); n = f; }
    n.connect(g); g.connect(this.pan(this.out(bus, send), pan));
    o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  noise({ t, dur = 1, gain = 0.2, attack = 0.01, release = 0.3, filter = { type: 'lowpass', freq: 2000 }, bus = 'fx', send = 0.2, pan = 0, curve, rate = 1 }) {
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; s.playbackRate.value = rate;
    const f = this.ctx.createBiquadFilter(); f.type = filter.type; f.frequency.setValueAtTime(filter.freq, t);
    if (filter.freqEnd) f.frequency.exponentialRampToValueAtTime(filter.freqEnd, t + dur); f.Q.value = filter.Q || 0.8;
    const g = this.ctx.createGain(); this.env(g, t, { attack, dur, release, gain, curve });
    s.connect(f); f.connect(g); g.connect(this.pan(this.out(bus, send), pan));
    s.start(t, this.r() * 3); s.stop(t + dur + 0.05);
  }
  // ---------- designed sounds ----------
  boom(t, gain = 0.8) {
    this.tone({ t, dur: 2.6, freq: 90, freqEnd: 28, gain, attack: 0.005, release: 2.2, send: 0.3 });
    this.noise({ t, dur: 1.8, gain: gain * 0.5, attack: 0.002, release: 1.6, filter: { type: 'lowpass', freq: 1800, freqEnd: 90 }, send: 0.5 });
  }
  whoosh(t, dur = 1, gain = 0.3, from = 300, to = 3000, pan = 0) {
    this.noise({ t, dur, gain, attack: dur * 0.6, release: dur * 0.4, filter: { type: 'bandpass', freq: from, freqEnd: to, Q: 1.4 }, send: 0.3, pan, curve: 'lin' });
  }
  chime(t, freq = 880, gain = 0.15, dur = 2.5, pan = 0) {
    const c = this.ctx.createOscillator(), m = this.ctx.createOscillator(), mg = this.ctx.createGain();
    c.frequency.value = freq; m.frequency.value = freq * 3.5;
    mg.gain.setValueAtTime(freq * 2.5, t); mg.gain.exponentialRampToValueAtTime(1, t + dur);
    m.connect(mg); mg.connect(c.frequency);
    const g = this.ctx.createGain(); this.env(g, t, { attack: 0.003, dur, release: dur - 0.01, gain });
    c.connect(g); g.connect(this.pan(this.out('fx', 0.6), pan)); c.start(t); m.start(t); c.stop(t + dur + 0.1); m.stop(t + dur + 0.1);
  }
  glitch(t, dur = 0.6, gain = 0.12, density = 22) {
    const n = Math.floor(dur * density);
    for (let i = 0; i < n; i++) {
      const tt = t + this.r() * dur, d = 0.015 + this.r() * 0.06;
      this.tone({ t: tt, dur: d, freq: 80 + this.r() * 2400, type: this.r() < 0.5 ? 'square' : 'sawtooth', gain: gain * (0.4 + this.r() * 0.6), attack: 0.001, release: d * 0.5, send: 0.05, pan: (this.r() - 0.5) * 1.6, curve: 'lin' });
    }
  }
  click(t, gain = 0.08, freq = 3200, pan = 0) {
    this.noise({ t, dur: 0.06, gain, attack: 0.001, release: 0.055, filter: { type: 'bandpass', freq, Q: 3 }, send: 0.15, pan });
    this.tone({ t, dur: 0.05, freq: 180, freqEnd: 90, gain: gain * 0.7, attack: 0.001, release: 0.04, send: 0 });
  }
  rumble(t, dur = 3, gain = 0.4) { this.noise({ t, dur, gain, attack: dur * 0.3, release: dur * 0.5, filter: { type: 'lowpass', freq: 140, Q: 0.5 }, send: 0.2, curve: 'lin' }); }
  riser(t, dur = 3, gain = 0.25, f0 = 120, f1 = 1200) {
    this.noise({ t, dur, gain, attack: dur * 0.95, release: 0.05, filter: { type: 'bandpass', freq: f0 * 2, freqEnd: f1 * 4, Q: 2 }, send: 0.4, curve: 'lin' });
    this.tone({ t, dur, freq: f0, freqEnd: f1, type: 'sawtooth', gain: gain * 0.25, attack: dur * 0.95, release: 0.05, filter: { type: 'lowpass', freq: 600, freqEnd: 4000 }, send: 0.3, curve: 'lin' });
  }
  heartbeat(t, gain = 0.5) { this.tone({ t, dur: 0.25, freq: 70, freqEnd: 40, gain, attack: 0.005, release: 0.2, send: 0.1 }); this.tone({ t: t + 0.26, dur: 0.3, freq: 62, freqEnd: 36, gain: gain * 0.75, attack: 0.005, release: 0.25, send: 0.1 }); }
  kick(t, gain = 0.6) { this.tone({ t, dur: 0.45, freq: 140, freqEnd: 42, gain, attack: 0.002, release: 0.4, send: 0.05, bus: 'music' }); }
  pad(t, dur, notes, { gain = 0.08, type = 'sawtooth', cutoff = 900, attack = 1.5, release = 2, detune = 9, bus = 'music', send = 0.5 } = {}) {
    for (const n of notes) for (const d of [-detune, detune]) this.tone({ t, dur, freq: midi(n), type, gain: gain / notes.length, attack, release, detune: d, filter: { type: 'lowpass', freq: cutoff, Q: 0.8 }, bus, send, curve: 'lin', pan: d > 0 ? 0.3 : -0.3 });
  }
  pluck(t, note, gain = 0.12, dur = 1.6, pan = 0) {
    this.tone({ t, dur, freq: midi(note), type: 'triangle', gain, attack: 0.004, release: dur - 0.01, filter: { type: 'lowpass', freq: 3200, freqEnd: 500 }, bus: 'music', send: 0.5, pan });
    this.tone({ t, dur: dur * 0.6, freq: midi(note + 12), type: 'sine', gain: gain * 0.3, attack: 0.004, release: dur * 0.5, bus: 'music', send: 0.5, pan });
  }
  sub(t, dur, note, gain = 0.25) { this.tone({ t, dur, freq: midi(note), type: 'sine', gain, attack: 0.6, release: 1.2, bus: 'music', send: 0, curve: 'lin' }); }
  droneBuzz(t, dur, gain = 0.1, f = 110, pan = 0) {
    const o = this.tone({ t, dur, freq: f, type: 'sawtooth', gain, attack: 0.3, release: 0.6, filter: { type: 'bandpass', freq: f * 6, Q: 2 }, send: 0.2, pan, curve: 'lin' });
    const l = this.ctx.createOscillator(), lg = this.ctx.createGain(); l.frequency.value = 23 + this.r() * 9; lg.gain.value = f * 0.06; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur);
  }
  choir(t, dur, notes, gain = 0.12) {
    for (const n of notes) for (const v of [-6, 0, 7]) {
      const o = this.tone({ t, dur, freq: midi(n), type: 'triangle', gain: gain / notes.length / 2, attack: dur * 0.4, release: dur * 0.45, detune: v, filter: { type: 'bandpass', freq: midi(n) * 3, Q: 1.2 }, bus: 'music', send: 0.8, curve: 'lin' });
      const l = this.ctx.createOscillator(), lg = this.ctx.createGain(); l.frequency.value = 5 + this.r(); lg.gain.value = 4; l.connect(lg); lg.connect(o.detune); l.start(t); l.stop(t + dur);
    }
  }
  // duck music+fx under a voice line
  duck(t0, t1, amount = 0.45) {
    for (const g of [this.music.gain, this.fx.gain]) {
      g.setValueAtTime(1, Math.max(0, t0 - 0.25)); g.linearRampToValueAtTime(amount, t0); g.setValueAtTime(amount, t1); g.linearRampToValueAtTime(1, t1 + 0.4);
    }
  }
  voiceAt(t, buffer, gain = 1) { const s = this.ctx.createBufferSource(); s.buffer = buffer; const g = this.ctx.createGain(); g.gain.value = gain; s.connect(g); g.connect(this.voice); const send = this.ctx.createGain(); send.gain.value = 0.12; g.connect(send); send.connect(this.verbIn); s.start(t); }

  // ---------- comic toolbox ----------
  pop(t, gain = 0.25, pitch = 1) {
    this.noise({ t, dur: 0.07, gain, attack: 0.001, release: 0.06, filter: { type: 'highpass', freq: 1800 * pitch }, send: 0.15 });
    this.tone({ t, dur: 0.09, freq: 900 * pitch, freqEnd: 2600 * pitch, type: 'sine', gain: gain * 0.6, attack: 0.001, release: 0.08, send: 0.2 });
  }
  bloop(t, gain = 0.1, f = 500) { this.tone({ t, dur: 0.16, freq: f, freqEnd: f * 2.4, type: 'sine', gain, attack: 0.005, release: 0.12, send: 0.3 }); }
  boing(t, gain = 0.2, f = 180) {
    const o = this.tone({ t, dur: 0.6, freq: f, type: 'triangle', gain, attack: 0.005, release: 0.55, send: 0.2 });
    const l = this.ctx.createOscillator(), lg = this.ctx.createGain(); l.frequency.value = 14; lg.gain.setValueAtTime(f * 0.5, t); lg.gain.exponentialRampToValueAtTime(1, t + 0.6); l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + 0.65);
  }
  slide(t, dur = 0.8, f0 = 400, f1 = 1600, gain = 0.12) { this.tone({ t, dur, freq: f0, freqEnd: f1, type: 'sine', gain, attack: 0.03, release: 0.15, send: 0.25, curve: 'lin' }); }
  squeak(t, gain = 0.06, f = 1400) { this.tone({ t, dur: 0.08, freq: f, freqEnd: f * 1.3, type: 'sine', gain, attack: 0.004, release: 0.06, send: 0.1 }); }
  thud(t, gain = 0.5) { this.tone({ t, dur: 0.35, freq: 120, freqEnd: 45, type: 'sine', gain, attack: 0.002, release: 0.3, send: 0.1 }); this.noise({ t, dur: 0.2, gain: gain * 0.5, attack: 0.001, release: 0.18, filter: { type: 'lowpass', freq: 700 }, send: 0.1 }); }
  crash(t, gain = 0.4) { this.noise({ t, dur: 0.8, gain, attack: 0.002, release: 0.75, filter: { type: 'bandpass', freq: 1200, Q: 0.6 }, send: 0.35 }); for (let i = 0; i < 6; i++) this.tone({ t: t + this.r() * 0.3, dur: 0.12, freq: 300 + this.r() * 900, type: 'square', gain: gain * 0.12, attack: 0.001, release: 0.1, send: 0.2 }); }
  roar(t, dur = 1.4, gain = 0.3) {
    this.noise({ t, dur, gain, attack: 0.08, release: dur * 0.5, filter: { type: 'lowpass', freq: 700, freqEnd: 2400 }, send: 0.35, curve: 'lin' });
    this.tone({ t, dur, freq: 70, freqEnd: 55, type: 'sawtooth', gain: gain * 0.35, attack: 0.1, release: dur * 0.5, filter: { type: 'lowpass', freq: 400 }, send: 0.3, curve: 'lin' });
  }
  trombone(t, notes = [58, 57, 56, 55], gain = 0.12) {
    notes.forEach((n, i) => { const last = i === notes.length - 1; const o = this.tone({ t: t + i * 0.42, dur: last ? 1.1 : 0.4, freq: 440 * Math.pow(2, (n - 69) / 12), type: 'sawtooth', gain, attack: 0.03, release: last ? 0.8 : 0.1, filter: { type: 'lowpass', freq: 900 }, bus: 'music', send: 0.3, curve: 'lin' });
      if (last) { const l = this.ctx.createOscillator(), lg = this.ctx.createGain(); l.frequency.value = 6; lg.gain.value = 9; l.connect(lg); lg.connect(o.frequency); l.start(t + i * 0.42); l.stop(t + i * 0.42 + 1.1); } });
  }
  hic(t, gain = 0.18) { this.tone({ t, dur: 0.12, freq: 700, freqEnd: 1500, type: 'square', gain: gain * 0.4, attack: 0.002, release: 0.1, filter: { type: 'bandpass', freq: 1200, Q: 3 }, send: 0.2 }); this.bloop(t + 0.04, gain * 0.6, 900); }
  sparkle(t, n = 6, gain = 0.03) { for (let i = 0; i < n; i++) this.chime(t + i * 0.06, 2000 + this.r() * 3000, gain, 0.8, (this.r() - 0.5) * 1.4); }
  march(t0, t1, root = 53, gain = 0.07, tempo = 0.25) {          // bouncy pizzicato + tuba ostinato
    const prog = [0, 0, 5, 5, 7, 7, 0, 0], mel = [12, 16, 19, 16, 17, 21, 19, 16];
    for (let k = 0, t = t0; t < t1 - 0.05; k++, t += tempo) {
      const bar = Math.floor(k / 4) % prog.length;
      if (k % 2 === 0) this.tone({ t, dur: tempo * 0.9, freq: 440 * Math.pow(2, (root - 24 + prog[bar] - 69 + (k % 4 ? 7 : 0)) / 12), type: 'sawtooth', gain: gain * 1.1, attack: 0.01, release: tempo * 0.6, filter: { type: 'lowpass', freq: 520 }, bus: 'music', send: 0.05 });
      if (k % 2 === 1 || k % 8 === 0) this.pluck(t, root + prog[bar] + mel[k % 8] - 12, gain * 0.7, 0.35, (k % 2 ? 0.3 : -0.3));
      if (k % 4 === 2) this.noise({ t, dur: 0.08, gain: gain * 0.5, attack: 0.001, release: 0.07, filter: { type: 'highpass', freq: 5000 }, bus: 'music', send: 0.05 });
    }
  }
}
