import { Story, EPISODES, EP_LEN, TOTAL } from './core/Story.js';
import { FPS } from './core/Engine.js';
import { exportMp4, canExport } from './core/Exporter.js';

window.gsap.ticker.lagSmoothing(0);
const params = new URLSearchParams(location.search);
const RENDER_MODE = params.has('render'); // headless frame-by-frame export (tools/export.mjs)
const $ = (id) => document.getElementById(id);
const canvas = $('view');
const story = new Story(canvas, { scale: RENDER_MODE ? Number(params.get('scale') || 1) : 0.5 });
window.__story = story;

let T = Number(params.get('t') || 0), playing = false, continuous = true, subs = true, muted = false;
let actx = null, src = null, clockStart = 0, clockT0 = 0, lastFrameT = -1;
const spoken = new Set();

function epRange() { const i = story.locate(T).i; return continuous ? [0, TOTAL] : [i * EP_LEN, (i + 1) * EP_LEN]; }
function fmt(T) { const { i, t } = story.locate(T); return `EP${i + 1} ${t.toFixed(2).padStart(5, '0')} / 20.00`; }

function startAudio() {
  stopAudio();
  if (muted || !story.fullAudio) return;
  actx = actx || new AudioContext({ sampleRate: 48000 });
  actx.resume();
  src = actx.createBufferSource(); src.buffer = story.fullAudio; src.connect(actx.destination);
  const [, end] = epRange();
  src.start(0, T, Math.max(0, end - T));
  clockStart = actx.currentTime; clockT0 = T;
}
function stopAudio() { if (src) { try { src.stop(); } catch {} src.disconnect(); src = null; } }
function now() { return actx && src ? clockT0 + (actx.currentTime - clockStart) : null; }

function setPlaying(p) {
  playing = p; $('bigplay').style.display = p ? 'none' : 'flex';
  $('playicon').innerHTML = p ? '<path d="M7 5h4v14H7zM13 5h4v14h-4z"/>' : '<path d="M7 5v14l11-7z"/>';
  if (p) { const [s, e] = epRange(); if (T >= e - 0.02) T = s; startAudio(); wallStart = performance.now(); wallT0 = T; } else { stopAudio(); speechSynthesis?.cancel(); }
}
let wallStart = 0, wallT0 = 0;
function seek(nt) { T = Math.max(0, Math.min(TOTAL - 1e-3, nt)); spoken.clear(); if (playing) setPlaying(true); }

// speech-synthesis fallback for lines whose WAV is missing
function speakFallback(prevT, T) {
  const { i, t } = story.locate(T); const pt = prevT - i * EP_LEN;
  for (const l of story.missing[i] || []) {
    if (pt < l.start && t >= l.start && !spoken.has(l.id) && 'speechSynthesis' in window && !muted) {
      spoken.add(l.id); const u = new SpeechSynthesisUtterance(l.text.replace(/…/g, ', ')); u.lang = 'pt-BR'; u.rate = 0.95;
      if (l.voice === 'guardiao') u.pitch = 0.4; if (l.voice === 'nucleo') u.pitch = 1.3; speechSynthesis.speak(u);
    }
  }
}

function loop() {
  if (playing) {
    const prev = T;
    const a = now();
    T = a != null ? a : wallT0 + (performance.now() - wallStart) / 1000;
    const [s, e] = epRange();
    if (T >= e) { T = e - 1e-3; setPlaying(false); }
    speakFallback(prev, T);
  }
  if (T !== lastFrameT || playing) { story.frame(T, { subtitles: subs }); lastFrameT = T; }
  $('scrub').value = T; $('time').textContent = fmt(T);
  const cur = story.locate(T).i;
  [...$('eps').children].forEach((b, k) => b.classList.toggle('on', k === cur));
  requestAnimationFrame(loop);
}

// ---------------- headless render API (used by tools/export.mjs) ----------------
window.__render = {
  fps: FPS, total: TOTAL, epLen: EP_LEN,
  frame(T) { story.frame(T, { subtitles: true }); },
  async jpeg(T, q = 0.93) {
    story.frame(T, { subtitles: true });
    const b = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', q));
    return new Uint8Array(await b.arrayBuffer());
  },
  wav(ep) { return story.wav(ep == null || ep < 0 ? null : ep); },
};

async function boot() {
  await story.init((p, label) => { $('prog').style.width = `${p * 100}%`; $('loadlabel').textContent = label; });
  $('loading').style.display = 'none';
  window.__ready = true;
  if (RENDER_MODE) { story.frame(T); return; }
  $('bigplay').style.display = 'flex';
  requestAnimationFrame(loop);
}

// ---------------- UI ----------------
EPISODES.forEach((ep, i) => {
  const b = document.createElement('button'); b.textContent = `${ep.number} · ${ep.title}`;
  b.onclick = () => seek(i * EP_LEN); $('eps').appendChild(b);
});
$('play').onclick = $('bigplay').onclick = () => setPlaying(!playing);
$('scrub').oninput = (e) => seek(Number(e.target.value));
$('mode').onclick = () => { continuous = !continuous; $('mode').classList.toggle('on', continuous); $('mode').textContent = continuous ? 'Contínuo' : 'Episódio único'; if (playing) setPlaying(true); };
$('subs').onclick = () => { subs = !subs; $('subs').classList.toggle('on', subs); lastFrameT = -1; };
$('mute').onclick = () => { muted = !muted; $('mute').textContent = muted ? 'Mudo' : 'Som'; if (playing) setPlaying(true); };
$('quality').onchange = (e) => { story.engine.setScale(Number(e.target.value)); lastFrameT = -1; };
$('shot').onclick = () => {
  story.frame(T, { subtitles: subs });
  canvas.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); const { i, t } = story.locate(T); a.download = `dragao-medo-de-fogo-ep${i + 1}-${t.toFixed(2)}s.png`; a.click(); });
};
$('export').onclick = async () => {
  if (!canExport()) { $('status').textContent = 'Este navegador não tem WebCodecs. Use: node tools/export.mjs (Playwright + ffmpeg).'; return; }
  setPlaying(false);
  const [s, e] = continuous ? [0, TOTAL] : epRange();
  const prevScale = story.engine.scale; story.engine.setScale(1);
  try {
    const name = continuous ? 'o-dragao-medo-de-fogo-serie.mp4' : `o-dragao-medo-de-fogo-ep${story.locate(s).i + 1}.mp4`;
    await exportMp4(story, s, e, name, (k, msg) => { $('status').textContent = msg; });
  } catch (err) { $('status').textContent = 'Falha na exportação: ' + err.message; console.error(err); }
  story.engine.setScale(prevScale); lastFrameT = -1;
};
addEventListener('keydown', (e) => {
  if (e.code === 'Space') { e.preventDefault(); setPlaying(!playing); }
  if (e.key === 'ArrowRight') seek(T + (e.shiftKey ? 1 / FPS : 1));
  if (e.key === 'ArrowLeft') seek(T - (e.shiftKey ? 1 / FPS : 1));
  if (e.key >= '1' && e.key <= '5') seek((Number(e.key) - 1) * EP_LEN);
});
boot().catch((e) => { $('loadlabel').textContent = 'Erro: ' + e.message; console.error(e); window.__error = String(e.stack || e); });
