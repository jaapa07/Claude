import { DURATION, FPS, locate } from './master.js';

/** Relógio do filme. Na prévia o tempo vem do relógio do áudio (ou do sistema, se o som estiver bloqueado);
 *  na exportação é imposto de fora (T = frame / 60). O desenho é sempre draw(T), função pura de T. */
export class Player {
  constructor(draw, getAudio) {
    this.draw = draw; this.getAudio = getAudio; this.T = 0; this.playing = false; this.volume = 0.9; this.loop = true; this.onTick = () => {};
    this.ctx = null; this.src = null; this.gain = null; this.t0 = 0; this.token = 0; this.pending = false; this.fps = 60; this._last = performance.now();
    this._loop = this._loop.bind(this); requestAnimationFrame(this._loop);
  }
  now() { return this.ctx && this.src ? this.ctx.currentTime : performance.now() / 1000; }
  _stop() { if (this.src) { try { this.src.stop(); } catch { /* já parado */ } this.src.disconnect(); this.src = null; } }
  async play() {
    const my = ++this.token; this.playing = true; this.pending = true; this.onTick(this);
    if (this.T >= DURATION - 0.05) this.T = 0;
    try { this.ctx ??= new AudioContext({ sampleRate: 48000 }); await this.ctx.resume(); } catch { this.ctx = null; }
    this._stop();
    if (this.ctx) {
      let buf = null; try { buf = await this.getAudio(); } catch { /* sem áudio */ }
      if (my !== this.token) return;
      if (buf) { this.gain ??= this.ctx.createGain(); this.gain.connect(this.ctx.destination); this.gain.gain.value = this.volume; this.src = this.ctx.createBufferSource(); this.src.buffer = buf; this.src.connect(this.gain); this.src.start(0, this.T); }
    }
    this.t0 = this.now() - this.T; this.pending = false;
  }
  pause() { this.token++; this.playing = false; this.pending = false; this._stop(); this.onTick(this); }
  toggle() { this.playing ? this.pause() : this.play(); }
  seek(T) { this.T = Math.min(Math.max(T, 0), DURATION - 1 / FPS); if (this.playing) this.play(); else { this._stop(); this.draw(this.T); } this.onTick(this); }
  setVolume(v) { this.volume = v; if (this.gain) this.gain.gain.value = v; }
  _loop() {
    const pn = performance.now(); this.fps += (1000 / Math.max(1, pn - this._last) - this.fps) * 0.05; this._last = pn;
    if (this.playing && !this.pending) {
      this.T = this.now() - this.t0;
      if (this.T >= DURATION) { if (this.loop) { this.T = 0; this.play(); } else { this.T = DURATION - 1 / FPS; this.pause(); } }
      this.draw(this.T); this.onTick(this);
    }
    requestAnimationFrame(this._loop);
  }
  get seq() { return locate(this.T).index; }
}
