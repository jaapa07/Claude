import { Engine } from './Engine.js';
import { drawSubtitle, drawTitleCard, cueAt } from '../overlay/Overlay.js';
import { cuesFor, renderEpisodeAudio, encodeWav, SAMPLE_RATE } from '../audio/Soundtrack.js';
import ep1 from '../episodes/ep1.js';
import ep2 from '../episodes/ep2.js';
import ep3 from '../episodes/ep3.js';
import ep4 from '../episodes/ep4.js';
import ep5 from '../episodes/ep5.js';

export const EPISODES = [ep1, ep2, ep3, ep4, ep5];
export const EP_LEN = 20;
export const TOTAL = EPISODES.length * EP_LEN;

// The series: maps a global time T (0–100 s) to an episode + local time, renders
// that frame, and owns the audio mix. Episodes are pure functions of local time.
export class Story {
  constructor(canvas, { scale = 0.5 } = {}) {
    this.engine = new Engine(canvas, { scale });
    this.inst = []; this.cues = []; this.audio = []; this.missing = [];
  }
  async init(onProgress = () => {}) {
    const steps = EPISODES.length * 2 + 1; let k = 0;
    const tick = async (label) => { onProgress(++k / steps, label); await new Promise((r) => setTimeout(r, 0)); };
    await document.fonts.ready;
    for (const ep of EPISODES) {
      const inst = ep.build({ renderer: this.engine.renderer });
      this.inst.push(inst);
      this.cues.push(await cuesFor(ep.number));
      // warm up shaders at a few representative moments
      for (const t of [0, 5, 10, 15, 19]) { const st = inst.update(t); this.engine.compile(st.scene || inst.scene, st.camera); }
      await tick(`Episódio ${ep.number}: cena`);
    }
    for (const ep of EPISODES) {
      const { buffer, missing } = await renderEpisodeAudio(ep);
      this.audio.push(buffer); this.missing.push(missing);
      await tick(`Episódio ${ep.number}: áudio`);
    }
    this.fullAudio = this.concat(this.audio);
    await tick('pronto');
  }
  concat(buffers) {
    const len = buffers.reduce((a, b) => a + b.length, 0);
    const out = new AudioBuffer({ numberOfChannels: 2, length: len, sampleRate: SAMPLE_RATE });
    let o = 0; for (const b of buffers) { for (let c = 0; c < 2; c++) out.getChannelData(c).set(b.getChannelData(Math.min(c, b.numberOfChannels - 1)), o); o += b.length; }
    return out;
  }
  locate(T) {
    const i = Math.max(0, Math.min(EPISODES.length - 1, Math.floor(T / EP_LEN)));
    return { i, ep: EPISODES[i], t: Math.max(0, Math.min(EP_LEN - 1e-4, T - i * EP_LEN)) };
  }
  frame(T, { subtitles = true } = {}) {
    const { i, ep, t } = this.locate(T);
    const inst = this.inst[i];
    const st = inst.update(t);
    this.engine.render(st.scene || inst.scene, st.camera, st.post, t, (ctx) => {
      st.overlay?.(ctx);
      drawTitleCard(ctx, ep, t);
      if (subtitles) drawSubtitle(ctx, cueAt(this.cues[i], t), t);
      st.overlayTop?.(ctx);
    });
    return { i, t };
  }
  wav(epIndex = null) { return encodeWav(epIndex == null ? this.fullAudio : this.audio[epIndex]); }
}
