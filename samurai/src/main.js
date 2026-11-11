import { Production } from './core/production.js';
import { EPISODES, DURATION } from './episodes/index.js';
import { W, H, FPS } from './core/stage.js';
import { Hud } from './hud/hud.js';
import { loadVoices, renderEpisodeAudio, toWav } from './audio/engine.js';

// Player + ganchos de renderização. Tudo o que aparece na tela é função pura de (episódio, t):
//   prévia     → t vem do relógio do áudio (ou do relógio do sistema, se o som estiver bloqueado)
//   exportação → t = frame / 60, chamado de fora por tools/export.mjs
const q = new URLSearchParams(location.search);
const RENDER = q.has('render');
document.body.classList.toggle('render', RENDER);
const $ = (s) => document.querySelector(s);
const stageEl = $('#stage'), frameEl = $('#frame');

const script = await (await fetch('./public/script.json')).json();
const P = new Production($('#gl'), Number(q.get('scale') ?? (RENDER ? 1 : 0.5)));
P.setScale(P.stage.scale);
const built = EPISODES.map((e) => e.build(P));
const hud = new Hud($('#hud'), script, EPISODES);
const voices = await loadVoices(script);
await document.fonts.ready;
await Promise.all(['700 40px Cinzel', '900 80px Cinzel', '700 50px "DM Sans"', '500 20px "DM Sans"'].map((f) => document.fonts.load(f, 'AÇÃOé')));

const state = { ep: Number(q.get('ep') ?? 1), t: Number(q.get('t') ?? 0), playing: false, continuous: true, muted: false };
function draw(ep, t) {
  t = Math.min(Math.max(t, 0), DURATION - 1e-4);
  const turns = built[ep - 1].update(t);
  hud.update(ep, t, turns ?? t / DURATION);
}

// ---------- áudio: cada episódio é pré-renderizado uma vez e guardado
const audioCache = new Map();
const episodeAudio = (ep) => { if (!audioCache.has(ep)) audioCache.set(ep, renderEpisodeAudio(ep, script, voices)); return audioCache.get(ep); };

// ---------- API usada pela exportação determinística
window.__sam = {
  ready: true, fps: FPS, frames: DURATION * FPS, episodes: EPISODES.length, width: W, height: H,
  renderFrame(ep, frame) { draw(ep, frame / FPS); return true; },
  async audioWavBase64(ep) { const wav = new Uint8Array(toWav(await episodeAudio(ep))); let s = ''; for (let i = 0; i < wav.length; i += 0x8000) s += String.fromCharCode.apply(null, wav.subarray(i, i + 0x8000)); return btoa(s); },
};

if (RENDER) { stageEl.style.transform = 'none'; draw(state.ep, state.t); }
else {
  // ---------- painel
  $('#panel').innerHTML = `
    <h1><small>MINISSÉRIE · 5 × 20 s · 9:16</small>O Samurai que Roubou o Tempo</h1>
    <div class="eps">${EPISODES.map((e) => `<button data-ep="${e.id}"><b>${e.id}</b>${e.title}</button>`).join('')}</div>
    <input id="seek" type="range" min="0" max="${DURATION}" step="0.01" value="0">
    <div class="row"><button class="primary" id="play">▶ Assistir</button><button id="restart">⟲ Início</button><button id="mute">🔊 Som</button></div>
    <div class="row"><label><input type="checkbox" id="cont" checked> Reprodução contínua dos 5 episódios</label></div>
    <div class="row"><label>Qualidade da prévia <select id="qual"><option value="0.35">Leve</option><option value="0.5" selected>Média</option><option value="0.75">Alta</option><option value="1">1080×1920</option></select></label><button id="wav">⬇ Áudio WAV</button></div>
    <div class="meta" id="meta"></div>
    <p>Atalhos: <b>espaço</b> play/pausa · <b>←/→</b> 1 s · <b>1–5</b> episódio. A prévia roda em tempo real; a exportação renderiza frame a frame (60 fps, 1080×1920) com o mesmo código.</p>
    <pre>npm run export          # os 5 episódios em MP4
npm run export -- --ep 3   # só o episódio 3
npm run export -- --series # + série completa</pre>`;
  const fit = () => { const pw = innerWidth > 760 ? 360 + 28 : 0, s = Math.min((innerHeight - 32) / H, (innerWidth - 32 - pw) / W); stageEl.style.transform = `scale(${s})`; frameEl.style.width = W * s + 'px'; frameEl.style.height = H * s + 'px'; };
  addEventListener('resize', fit); fit();

  let ctx = null, src = null, gain = null, t0 = 0, token = 0, pending = false;
  const now = () => (ctx && src ? ctx.currentTime : performance.now() / 1000);
  async function play() {
    const my = ++token; state.playing = true; pending = true; ui();              // o relógio fica parado até o áudio começar
    try { ctx ??= new AudioContext({ sampleRate: 48000 }); await ctx.resume(); } catch { ctx = null; }
    stopSrc();
    if (ctx) {
      const buf = await episodeAudio(state.ep); if (my !== token) return;
      gain ??= ctx.createGain(); gain.connect(ctx.destination); gain.gain.value = state.muted ? 0 : 1;
      src = ctx.createBufferSource(); src.buffer = buf; src.connect(gain); src.start(0, state.t);
      if (state.ep < EPISODES.length) episodeAudio(state.ep + 1);           // adianta o próximo
    }
    t0 = now() - state.t; pending = false;
  }
  function stopSrc() { if (src) { try { src.stop(); } catch { /* já parado */ } src.disconnect(); src = null; } }
  function pause() { token++; state.playing = false; stopSrc(); ui(); }
  function go(ep, t = 0, keep = state.playing) { state.ep = ep; state.t = t; if (keep) play(); else { stopSrc(); draw(ep, t); } ui(); }
  function ui() {
    $('#play').textContent = state.playing ? '❚❚ Pausar' : '▶ Assistir'; $('#mute').textContent = state.muted ? '🔇 Mudo' : '🔊 Som';
    document.querySelectorAll('.eps button').forEach((b) => b.classList.toggle('on', Number(b.dataset.ep) === state.ep));
  }
  $('#play').onclick = () => (state.playing ? pause() : play());
  $('#restart').onclick = () => go(1, 0, true);
  $('#mute').onclick = () => { state.muted = !state.muted; if (gain) gain.gain.value = state.muted ? 0 : 1; ui(); };
  $('#cont').onchange = (e) => { state.continuous = e.target.checked; };
  $('#qual').onchange = (e) => { P.setScale(Number(e.target.value)); draw(state.ep, state.t); };
  $('#seek').oninput = (e) => go(state.ep, Number(e.target.value));
  $('#wav').onclick = async () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([toWav(await episodeAudio(state.ep))], { type: 'audio/wav' })); a.download = `samurai-ep${state.ep}.wav`; a.click(); };
  document.querySelectorAll('.eps button').forEach((b) => { b.onclick = () => go(Number(b.dataset.ep), 0, true); });
  addEventListener('keydown', (e) => {
    if (e.code === 'Space') { e.preventDefault(); state.playing ? pause() : play(); }
    else if (e.code === 'ArrowRight') go(state.ep, Math.min(DURATION - 0.01, state.t + 1));
    else if (e.code === 'ArrowLeft') go(state.ep, Math.max(0, state.t - 1));
    else if (/^Digit[1-5]$/.test(e.code) && Number(e.code[5]) <= EPISODES.length) go(Number(e.code[5]), 0);
  });
  let last = performance.now(), fps = 60, n = 0;
  function loop() {
    const pn = performance.now(); fps += (1000 / Math.max(1, pn - last) - fps) * 0.05; last = pn;
    if (state.playing && !pending) {
      state.t = now() - t0;
      if (state.t >= DURATION) {                                              // fim do episódio: emenda no próximo
        if (state.continuous && state.ep < EPISODES.length) { state.ep++; state.t = 0; play(); }
        else if (state.continuous) { state.ep = 1; state.t = 0; play(); }
        else { state.t = DURATION - 0.001; pause(); }
        ui();
      }
      draw(state.ep, state.t);
      $('#seek').value = state.t;
    }
    if (n++ % 15 === 0) $('#meta').textContent = `EP ${state.ep} · ${state.t.toFixed(2).padStart(5, '0')} s · quadro ${String(Math.floor(state.t * FPS)).padStart(4, '0')} · ${fps.toFixed(0)} fps`;
    requestAnimationFrame(loop);
  }
  draw(state.ep, state.t); ui(); loop();
  if (q.has('autoplay')) play();
}
