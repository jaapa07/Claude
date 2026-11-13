import { FPS, FRAMES, DURATION, SEQ_LEN } from '../timeline/master.js';
import { toWav } from '../audio/engine.js';
import { W, H } from '../rendering/stage.js';

/** API de exportação exposta à página (usada por tools/export.mjs via Playwright).
 *  renderFrame(n) desenha o quadro n a partir de T = n / 60, sem depender de nenhum quadro anterior. */
export function installExportApi(draw, getAudio) {
  window.__film = {
    ready: true, fps: FPS, frames: FRAMES, duration: DURATION, seqLen: SEQ_LEN, width: W, height: H,
    renderFrame(n) { draw(n / FPS); return true; },
    async audioWavBase64(from = 0, to = DURATION) { const wav = new Uint8Array(toWav(await getAudio(), from, to)); let s = ''; for (let i = 0; i < wav.length; i += 0x8000) s += String.fromCharCode.apply(null, wav.subarray(i, i + 0x8000)); return btoa(s); },
  };
}
export async function downloadWav(getAudio) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([toWav(await getAudio())], { type: 'audio/wav' })); a.download = 'guardiao-das-estrelas.wav'; a.click(); }
