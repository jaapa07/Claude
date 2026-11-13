import { rng } from '../timeline/util.js';
import { CUES, compose } from './cues.js';

// Áudio 100% sintetizado (Web Audio) + dublagem. Os 90 s são pré-renderizados num OfflineAudioContext:
// o mesmo buffer toca na prévia e vai para o MP4, então som e imagem são determinísticos e sincronizados.

export const SR = 48000, DUR = 90;

function noiseBuffer(ctx, seconds, seed) {
  const b = ctx.createBuffer(1, Math.floor(seconds * ctx.sampleRate), ctx.sampleRate), d = b.getChannelData(0), r = rng(seed);
  for (let i = 0; i < d.length; i++) d[i] = r() * 2 - 1;
  return b;
}
function impulse(ctx, seconds, seed) {                               // reverberação gerada (ruído com decaimento)
  const n = Math.floor(seconds * ctx.sampleRate), b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c), r = rng(seed + c); for (let i = 0; i < n; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / n, 2.6); }
  return b;
}
const hz = (semi, root = 146.83) => root * Math.pow(2, semi / 12);

class Synth {
  constructor(ctx) {
    this.ctx = ctx; this.noise = noiseBuffer(ctx, 4, 1234); this.r = rng(99);
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
    this.master = ctx.createGain(); this.master.gain.value = MASTER; this.master.connect(comp); comp.connect(ctx.destination);
    this.rev = ctx.createConvolver(); this.rev.buffer = impulse(ctx, 4.2, 7); const rg = ctx.createGain(); rg.gain.value = 0.6; this.rev.connect(rg); rg.connect(this.master);
    this.music = ctx.createGain(); this.music.connect(this.master); this.sfx = ctx.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.master); this.voice = ctx.createGain(); this.voice.gain.value = 1.5; this.voice.connect(this.master);
    this.send(this.music, 0.35); this.send(this.sfx, 0.25); this.send(this.voice, 0.16);
  }
  send(node, amt) { const g = this.ctx.createGain(); g.gain.value = amt; node.connect(g); g.connect(this.rev); }
  env(t, a, d, peak, bus = this.sfx, pan = 0) {                      // envelope ataque/decaimento → barramento
    const g = this.ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    const p = this.ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(bus); return g;
  }
  osc(type, f, t, dur, dest) { const o = this.ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.connect(dest); o.start(t); o.stop(t + dur + 0.05); return o; }
  nz(t, dur, dest, rate = 1) { const s = this.ctx.createBufferSource(); s.buffer = this.noise; s.loop = true; s.playbackRate.value = rate; s.connect(dest); s.start(t, this.r() * 3); s.stop(t + dur + 0.05); return s; }
  filt(type, f, q, dest) { const b = this.ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.connect(dest); return b; }

  // ---------- instrumentos
  koto(t, f, vel = 0.5, pan = 0) {
    const g = this.env(t, 0.003, 1.6, vel * 0.5, this.music, pan), lp = this.filt('lowpass', 5000, 2, g);
    lp.frequency.setValueAtTime(Math.min(9000, f * 9), t); lp.frequency.exponentialRampToValueAtTime(f * 1.5, t + 0.9);
    this.osc('sawtooth', f, t, 1.7, lp); const o2 = this.osc('triangle', f * 2.003, t, 1.7, lp); o2.detune.value = 6;
    const ng = this.env(t, 0.001, 0.03, vel * 0.25, this.music, pan); this.nz(t, 0.05, this.filt('bandpass', f * 4, 1, ng));
  }
  flute(t, f, dur, vel = 0.3, pan = 0) {
    const g = this.ctx.createGain(), p = this.ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); p.connect(this.music);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + 0.09); g.gain.setValueAtTime(vel * 0.85, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
    const o = this.osc('sine', f, t, dur + 0.3, g), o2g = this.ctx.createGain(); o2g.gain.value = 0.25; o2g.connect(g); const o2 = this.osc('triangle', f * 2, t, dur + 0.3, o2g);
    o.frequency.setValueAtTime(f * 0.97, t); o.frequency.linearRampToValueAtTime(f, t + 0.08);
    const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain(); lfo.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.012, t + dur * 0.6); lfo.connect(lg); lg.connect(o.frequency); lg.connect(o2.frequency); lfo.start(t); lfo.stop(t + dur + 0.4);
    const bg = this.ctx.createGain(); bg.gain.value = 0.18; bg.connect(g); this.nz(t, dur + 0.2, this.filt('bandpass', f * 2, 3, bg));
  }
  taiko(t, vel = 0.8, f = 62, pan = 0) {
    const g = this.env(t, 0.002, 0.55, vel, this.music, pan), o = this.osc('sine', f * 2.4, t, 0.6, g); o.frequency.exponentialRampToValueAtTime(f, t + 0.07);
    const ng = this.env(t, 0.001, 0.07, vel * 0.5, this.music, pan); this.nz(t, 0.1, this.filt('lowpass', 900, 0.7, ng));
  }
  rim(t, vel = 0.3, pan = 0) { const g = this.env(t, 0.001, 0.05, vel, this.music, pan); this.nz(t, 0.06, this.filt('bandpass', 1900, 6, g)); this.osc('square', 820, t, 0.03, this.env(t, 0.001, 0.03, vel * 0.3, this.music, pan)); }
  pad(t, freqs, dur, vel = 0.12, cutoff = 700) {
    const g = this.ctx.createGain(); g.connect(this.music); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + Math.min(2, dur * 0.3)); g.gain.setValueAtTime(vel, t + dur * 0.75); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const lp = this.filt('lowpass', cutoff, 0.8, g); lp.frequency.setValueAtTime(cutoff * 0.6, t); lp.frequency.linearRampToValueAtTime(cutoff * 1.5, t + dur * 0.8);
    for (const f of freqs) for (const det of [-7, 7]) { const o = this.osc('sawtooth', f, t, dur, lp); o.detune.value = det; }
  }
  // ---------- efeitos
  boom(t, vel = 0.9, f = 46, dur = 1.6) { const g = this.env(t, 0.004, dur, vel); const o = this.osc('sine', f * 3, t, dur, g); o.frequency.exponentialRampToValueAtTime(f, t + 0.12); const ng = this.env(t, 0.002, dur * 0.4, vel * 0.5); this.nz(t, dur * 0.5, this.filt('lowpass', 260, 0.6, ng), 0.6); }
  whoosh(t, dur = 0.5, vel = 0.4, f0 = 400, f1 = 3200, pan = 0) {
    const g = this.ctx.createGain(), p = this.ctx.createStereoPanner(); p.pan.setValueAtTime(-pan, t); p.pan.linearRampToValueAtTime(pan, t + dur); g.connect(p); p.connect(this.sfx);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + dur * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const bp = this.filt('bandpass', f0, 1.4, g); bp.frequency.setValueAtTime(f0, t); bp.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6); bp.frequency.exponentialRampToValueAtTime(Math.max(80, f0 * 0.8), t + dur); this.nz(t, dur, bp);
  }
  bed(t, dur, vel, type = 'lowpass', f = 300, q = 0.7, wobble = 0) {   // ruído contínuo: vento, chuva, tremor
    const g = this.ctx.createGain(); g.connect(this.sfx); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + Math.min(1, dur * 0.3)); g.gain.setValueAtTime(vel, t + dur - Math.min(0.5, dur * 0.3)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const fl = this.filt(type, f, q, g);
    if (wobble) { const l = this.ctx.createOscillator(), lg = this.ctx.createGain(); l.frequency.value = wobble; lg.gain.value = f * 0.5; l.connect(lg); lg.connect(fl.frequency); l.start(t); l.stop(t + dur); }
    this.nz(t, dur, fl); return g;
  }
  shimmer(t, dur = 1.5, vel = 0.2, base = 1400, n = 14) {              // brilho dourado: nuvem de senoides agudas
    for (let i = 0; i < n; i++) { const tt = t + this.r() * dur * 0.8, f = base * Math.pow(2, Math.floor(this.r() * 12) / 5); this.osc('sine', f, tt, 0.7, this.env(tt, 0.01, 0.6, vel * (0.3 + this.r() * 0.7), this.sfx, this.r() * 1.6 - 0.8)); }
  }
  tick(t, vel = 0.3, f = 2400) { const g = this.env(t, 0.001, 0.04, vel); this.nz(t, 0.05, this.filt('bandpass', f, 9, g)); this.osc('sine', f * 0.5, t, 0.03, this.env(t, 0.001, 0.03, vel * 0.5)); }
  clash(t, vel = 0.7, pan = 0) {                                        // aço contra aço: parciais inarmônicos + estalo
    for (const [m, d] of [[1, 1.3], [2.76, 0.9], [5.4, 0.6], [8.93, 0.4], [11.3, 0.3]]) this.osc('sine', 880 * m * (0.97 + this.r() * 0.06), t, d, this.env(t, 0.001, d, vel * 0.22 / Math.sqrt(m), this.sfx, pan));
    const g = this.env(t, 0.001, 0.12, vel * 0.8, this.sfx, pan); this.nz(t, 0.15, this.filt('highpass', 3000, 0.7, g));
  }
  shatter(t, dur = 1.6, vel = 0.5, n = 40) {
    const g = this.env(t, 0.002, 0.35, vel * 0.9); this.nz(t, 0.4, this.filt('highpass', 2500, 0.5, g));
    for (let i = 0; i < n; i++) { const tt = t + Math.pow(this.r(), 1.6) * dur, f = 1800 + this.r() * 5200; this.osc('triangle', f, tt, 0.2, this.env(tt, 0.001, 0.08 + this.r() * 0.2, vel * 0.25 * (1 - (tt - t) / dur * 0.6), this.sfx, this.r() * 1.8 - 0.9)); }
  }
  freeze(t, vel = 0.8) {                                                // sucção reversa + impacto grave + sino de vidro
    const g = this.ctx.createGain(); g.connect(this.sfx); g.gain.setValueAtTime(0.0001, t - 0.9); g.gain.exponentialRampToValueAtTime(vel * 0.7, t); g.gain.setValueAtTime(0.0001, t + 0.01);
    const hp = this.filt('bandpass', 300, 2, g); hp.frequency.setValueAtTime(300, t - 0.9); hp.frequency.exponentialRampToValueAtTime(7000, t); this.nz(t - 0.9, 0.95, hp);
    this.boom(t, vel, 38, 2.4);
    for (const m of [1, 1.5, 2.01, 3.02]) this.osc('sine', 1046 * m, t, 3, this.env(t, 0.005, 3.2, vel * 0.1 / m));
  }
  thaw(t, vel = 0.6) { this.whoosh(t - 0.1, 0.9, vel, 5000, 300); this.boom(t + 0.05, vel * 0.7, 55, 1.0); }
  rumble(t, dur, vel = 0.5) { this.bed(t, dur, vel, 'lowpass', 90, 1.2, 7); this.bed(t, dur, vel * 0.3, 'bandpass', 420, 0.8, 11); }
  heart(t, vel = 0.4) { this.boom(t, vel, 50, 0.25); this.boom(t + 0.22, vel * 0.7, 44, 0.3); }
  step(t, vel = 0.2, f = 180) { const g = this.env(t, 0.002, 0.09, vel); this.nz(t, 0.1, this.filt('lowpass', f * 3, 1, g)); this.osc('sine', f * 0.5, t, 0.08, this.env(t, 0.002, 0.08, vel * 0.8)); }
  chirp(t, vel = 0.12, pan = 0) { for (let i = 0; i < 3; i++) { const tt = t + i * 0.09, g = this.env(tt, 0.005, 0.06, vel, this.sfx, pan), o = this.osc('sine', 2600 + this.r() * 900, tt, 0.07, g); o.frequency.exponentialRampToValueAtTime(3800 + this.r() * 900, tt + 0.05); } }
  bell(t, f = 220, vel = 0.4, dur = 3) { for (const [m, a] of [[1, 1], [2.0, 0.5], [2.99, 0.35], [4.2, 0.2], [5.43, 0.12]]) this.osc('sine', f * m, t, dur, this.env(t, 0.004, dur / Math.sqrt(m), vel * 0.3 * a)); }
  riser(t, dur, vel = 0.3) { const g = this.ctx.createGain(); g.connect(this.sfx); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vel, t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05);
    const o = this.osc('sawtooth', 110, t, dur, this.filt('lowpass', 1800, 2, g)); o.frequency.exponentialRampToValueAtTime(880, t + dur); const bp = this.filt('bandpass', 500, 2, g); bp.frequency.exponentialRampToValueAtTime(6000, t + dur); this.nz(t, dur, bp); }
  // ---------- instrumentos e vozes novas deste filme
  strings(t, freqs, dur, vel = 0.1, cutoff = 1800) {                    // naipe de cordas: serras desafinadas, ataque lento, vibrato
    const g = this.ctx.createGain(); g.connect(this.music); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + Math.min(1.2, dur * 0.35)); g.gain.setValueAtTime(vel, t + dur * 0.8); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.4);
    const lp = this.filt('lowpass', cutoff, 0.6, g); const lfo = this.ctx.createOscillator(), lg = this.ctx.createGain(); lfo.frequency.value = 5.4; lg.gain.value = 3; lfo.connect(lg); lfo.start(t); lfo.stop(t + dur + 0.5);
    for (const f of freqs) for (const det of [-9, 0, 8]) { const o = this.osc('sawtooth', f, t, dur + 0.4, lp); o.detune.value = det; lg.connect(o.detune); }
  }
  choir(t, freqs, dur, vel = 0.08) {                                    // coro: serras por dois formantes ("aah")
    const g = this.ctx.createGain(); g.connect(this.music); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + Math.min(1.5, dur * 0.4)); g.gain.setValueAtTime(vel, t + dur * 0.75); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.6);
    const f1 = this.filt('bandpass', 750, 5, g), f2 = this.filt('bandpass', 1150, 6, g);
    for (const f of freqs) for (const det of [-12, 11]) { const o = this.osc('sawtooth', f, t, dur + 0.6, f1); o.detune.value = det; o.connect(f2); }
  }
  whale(t, f = 110, dur = 3, vel = 0.3) {                               // canto da baleia: glissando de senoides com eco
    const g = this.ctx.createGain(); g.connect(this.sfx); this.send(g, 0.9); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + dur * 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (const m of [1, 1.5, 2.02]) { const og = this.ctx.createGain(); og.gain.value = 1 / m; og.connect(g); const o = this.osc('sine', f * m, t, dur, og); o.frequency.setValueAtTime(f * m * 0.8, t); o.frequency.exponentialRampToValueAtTime(f * m * 1.5, t + dur * 0.45); o.frequency.exponentialRampToValueAtTime(f * m * 1.05, t + dur); }
  }
  lumi(t, vel = 0.16, up = 1, n = 4) {                                  // voz da Lumi: sininhos em arpejo
    for (let i = 0; i < n; i++) { const tt = t + i * 0.085, f = 1318 * Math.pow(2, (up > 0 ? [0, 4, 7, 12, 16] : [12, 7, 4, 0, -5])[i % 5] / 12); this.osc('sine', f, tt, 0.4, this.env(tt, 0.004, 0.35, vel, this.sfx, 0.2)); this.osc('triangle', f * 2, tt, 0.2, this.env(tt, 0.004, 0.15, vel * 0.3, this.sfx, 0.2)); }
  }
  harp(t, f, vel = 0.4, pan = 0) { this.koto(t, f, vel, pan); }
  sub(t, dur, f = 36, vel = 0.3) { const g = this.ctx.createGain(); g.connect(this.sfx); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vel, t + dur * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur); this.osc('sine', f, t, dur, g); }
}

export async function loadVoices(script, base = './voice/') {
  const tmp = new OfflineAudioContext(1, 1, SR), out = {};
  let manifest = {}; try { manifest = await (await fetch(base + 'manifest.json')).json(); } catch { /* sem dublagem gerada */ }
  await Promise.all(script.lines.map(async (l) => { try { const a = await (await fetch(base + l.id + '.mp3')).arrayBuffer(); out[l.id] = await tmp.decodeAudioData(a); } catch { /* fala ausente: segue só com legenda */ } }));
  for (const l of script.lines) l.dur = out[l.id]?.duration ?? manifest[l.id] ?? Math.max(1.5, l.text.length * 0.065);
  return out;
}

/** Renderiza os 90 s de áudio (música + efeitos + vozes) → AudioBuffer estéreo. */
export async function renderAudio(script, voices) {
  const ctx = new OfflineAudioContext(2, SR * DUR, SR), S = new Synth(ctx);
  compose(S);
  for (const [t, name, ...args] of CUES) S[name](t, ...args);
  S.music.gain.setValueAtTime(m0, 0);
  for (const l of script.lines) {                                       // vozes + redução da trilha sob a fala
    const b = voices[l.id]; if (!b) continue;
    const src = ctx.createBufferSource(); src.buffer = b;
    if (l.who === 'voz') { const ls = ctx.createBiquadFilter(); ls.type = 'lowshelf'; ls.frequency.value = 200; ls.gain.value = 8; const dl = ctx.createDelay(); dl.delayTime.value = 0.16; const dg = ctx.createGain(); dg.gain.value = 0.45; src.connect(ls); ls.connect(S.voice); ls.connect(dl); dl.connect(dg); dg.connect(S.voice); S.send(dg, 1.0); S.send(ls, 0.5); }
    else if (l.who === 'lumi') { const hs = ctx.createBiquadFilter(); hs.type = 'highshelf'; hs.frequency.value = 3000; hs.gain.value = 5; src.connect(hs); hs.connect(S.voice); S.send(hs, 0.25); }
    else src.connect(S.voice);
    src.start(l.at);
    S.music.gain.setTargetAtTime(m0 * 0.45, l.at - 0.15, 0.12); S.music.gain.setTargetAtTime(m0, l.at + b.duration, 0.35);
  }
  S.master.gain.setValueAtTime(0.0001, 0); S.master.gain.linearRampToValueAtTime(MASTER, 0.15);
  S.master.gain.setValueAtTime(MASTER, DUR - 1.2); S.master.gain.linearRampToValueAtTime(0.0001, DUR - 0.05);
  return ctx.startRendering();
}
const m0 = 0.8, MASTER = 0.5;

/** AudioBuffer → WAV PCM 16 bits (para a exportação). */
export function toWav(buf, from = 0, to = buf.duration) {
  const i0 = Math.floor(from * buf.sampleRate), n = Math.min(buf.length, Math.floor(to * buf.sampleRate)) - i0, ch = buf.numberOfChannels, out = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
  out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, n * ch * 2, true);
  const d = [...Array(ch)].map((_, c) => buf.getChannelData(c));
  for (let i = 0, o = 44; i < n; i++) for (let c = 0; c < ch; c++, o += 2) out.setInt16(o, Math.max(-1, Math.min(1, d[c][i + i0])) * 32767, true);
  return out.buffer;
}
