import { Synth } from './Synth.js';
import { LINES } from '../data/script.js';

export const SAMPLE_RATE = 48000;
const voiceCache = new Map();
let manifest = null;

export async function loadManifest() {
  if (manifest) return manifest;
  try { manifest = await (await fetch('assets/voice/manifest.json')).json(); } catch { manifest = {}; }
  return manifest;
}

async function voiceBuffer(ctx, id) {
  if (voiceCache.has(id)) return voiceCache.get(id);
  try {
    const ab = await (await fetch(`assets/voice/${id}.wav`)).arrayBuffer();
    const b = await ctx.decodeAudioData(ab); voiceCache.set(id, b); return b;
  } catch { voiceCache.set(id, null); return null; }
}

// Render one episode's full mix (music + SFX + voice) to an AudioBuffer.
export async function renderEpisodeAudio(episode, { withVoice = true } = {}) {
  const dur = episode.duration;
  const ctx = new OfflineAudioContext(2, Math.ceil(dur * SAMPLE_RATE), SAMPLE_RATE);
  const s = new Synth(ctx, episode.number * 101);
  episode.sound(s);
  const lines = LINES.filter((l) => l.ep === episode.number);
  const man = await loadManifest();
  let missing = [];
  for (const l of lines) {
    const b = withVoice ? await voiceBuffer(ctx, l.id) : null;
    const d = man[l.id]?.duration || 3;
    s.duck(l.start, l.start + d);
    if (b) s.voiceAt(l.start, b, 1); else missing.push(l);
  }
  const buffer = await ctx.startRendering();
  return { buffer, missing };
}

export function encodeWav(buffer) {
  const ch = buffer.numberOfChannels, n = buffer.length, sr = buffer.sampleRate;
  const out = new DataView(new ArrayBuffer(44 + n * ch * 2));
  const w = (o, s) => [...s].forEach((c, i) => out.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); out.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true); out.setUint32(24, sr, true);
  out.setUint32(28, sr * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, n * ch * 2, true);
  const data = [...Array(ch)].map((_, c) => buffer.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, data[c][i])); out.setInt16(o, v < 0 ? v * 0x8000 : v * 0x7fff, true); o += 2; }
  return new Uint8Array(out.buffer);
}

// Subtitle cues with absolute (episode-time) word timings
export async function cuesFor(epNumber) {
  const man = await loadManifest();
  const { VOICES } = await import('../data/script.js');
  return LINES.filter((l) => l.ep === epNumber).map((l) => {
    const m = man[l.id]; const v = VOICES[l.voice];
    const words = m ? m.words.map((w) => ({ text: w.text, start: l.start + w.start, end: l.start + w.end }))
      : l.text.split(' ').map((w, i, a) => ({ text: w, start: l.start + (i / a.length) * 2.6, end: l.start + ((i + 1) / a.length) * 2.6 }));
    return { id: l.id, start: l.start, end: l.start + (m ? m.duration : 2.8), words, text: l.text, speaker: v.speaker, tagColor: v.tag, color: v.color, voice: l.voice };
  });
}
