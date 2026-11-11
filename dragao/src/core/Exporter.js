import { Muxer, ArrayBufferTarget } from '../../vendor/mp4-muxer.mjs';
import { FPS, WIDTH, HEIGHT } from './Engine.js';
import { SAMPLE_RATE } from '../audio/Soundtrack.js';

// In-browser deterministic export: every frame is rendered at its exact time
// (not recorded in real time), encoded with WebCodecs (H.264 + AAC) and muxed
// to MP4. Slower than real time, but frame-perfect.
export const canExport = () => typeof VideoEncoder !== 'undefined';

export async function exportMp4(story, T0, T1, filename, progress = () => {}) {
  const frames = Math.round((T1 - T0) * FPS);
  const hasAudio = typeof AudioEncoder !== 'undefined' && (await AudioEncoder.isConfigSupported({ codec: 'mp4a.40.2', sampleRate: SAMPLE_RATE, numberOfChannels: 2, bitrate: 192000 }).catch(() => ({}))).supported;
  const muxer = new Muxer({
    target: new ArrayBufferTarget(), fastStart: 'in-memory',
    video: { codec: 'avc', width: WIDTH, height: HEIGHT, frameRate: FPS },
    audio: hasAudio ? { codec: 'aac', sampleRate: SAMPLE_RATE, numberOfChannels: 2 } : undefined,
  });
  const venc = new VideoEncoder({ output: (c, m) => muxer.addVideoChunk(c, m), error: (e) => { throw e; } });
  venc.configure({ codec: 'avc1.640033', width: WIDTH, height: HEIGHT, bitrate: 16e6, framerate: FPS });
  const canvas = story.engine.out;
  for (let f = 0; f < frames; f++) {
    story.frame(T0 + f / FPS);
    const vf = new VideoFrame(canvas, { timestamp: Math.round((f * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
    venc.encode(vf, { keyFrame: f % 120 === 0 }); vf.close();
    if (venc.encodeQueueSize > 8) await new Promise((r) => setTimeout(r, 0));
    if (f % 10 === 0) { progress(f / frames, `Exportando quadro ${f}/${frames}…`); await new Promise((r) => setTimeout(r, 0)); }
  }
  await venc.flush();
  if (hasAudio) {
    const aenc = new AudioEncoder({ output: (c, m) => muxer.addAudioChunk(c, m), error: (e) => { throw e; } });
    aenc.configure({ codec: 'mp4a.40.2', sampleRate: SAMPLE_RATE, numberOfChannels: 2, bitrate: 192000 });
    const buf = story.fullAudio, s0 = Math.round(T0 * SAMPLE_RATE), n = Math.round((T1 - T0) * SAMPLE_RATE), chunk = 4800;
    for (let o = 0; o < n; o += chunk) {
      const len = Math.min(chunk, n - o); const data = new Float32Array(len * 2);
      data.set(buf.getChannelData(0).subarray(s0 + o, s0 + o + len), 0); data.set(buf.getChannelData(1).subarray(s0 + o, s0 + o + len), len);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: SAMPLE_RATE, numberOfFrames: len, numberOfChannels: 2, timestamp: Math.round((o / SAMPLE_RATE) * 1e6), data });
      aenc.encode(ad); ad.close();
    }
    await aenc.flush();
  }
  muxer.finalize();
  const blob = new Blob([muxer.target.buffer], { type: 'video/mp4' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
  progress(1, `Exportado: ${filename} (${(blob.size / 1e6).toFixed(1)} MB${hasAudio ? '' : ', sem áudio — encoder AAC indisponível'})`);
}
