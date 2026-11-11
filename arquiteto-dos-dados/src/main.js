// main.js: carrega tudo, mantém o relógio do filme e liga os controles da página.
import { W, H, EP_DUR, N_EPS, TOTAL, clamp } from './core.js';
import { createWorld } from './world.js';
import { makeOverlay } from './overlay.js';
import { renderMix, loadNarration, wavFromBuffer } from './audio.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search), RENDER = params.has('render');
if (RENDER) document.body.classList.add('render');
const msg = s => { $('loadmsg').textContent = s; };
const status = s => { $('status').textContent = s; };
const fmt = t => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const download = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); };

async function boot() {
  msg('carregando fontes…');
  await Promise.all(['900 80px Orbitron', '700 40px Orbitron', '500 20px Orbitron', '700 60px Rajdhani', '600 30px Rajdhani', '500 24px Rajdhani', '500 22px "JetBrains Mono"', '700 20px "JetBrains Mono"'].map(f => document.fonts.load(f, 'RODRIGO ção')));
  const roteiro = await (await fetch('roteiro.json')).json();
  msg('construindo o universo…'); await new Promise(r => setTimeout(r, 30));
  const world = createWorld(window.gsap), film = $('film'), draw = makeOverlay(film, roteiro);
  msg('carregando narração…');
  const narr = await loadNarration(roteiro);
  $('vozinfo').textContent = narr.recorded ? '(gravada)' : '(voz do navegador)';

  const st = { T: clamp(+params.get('t') || 0, 0, TOTAL), playing: false, subs: true, hud: true, snd: true, voz: true, vol: 0.9, quality: 'auto', scale: 1 };
  function render() { const r = world.seek(st.T); draw(world.canvas, st.T, { cues: narr.cues, showSubs: st.subs, showHud: st.hud }); return r; }

  // ---------------------------------------------------------------- áudio
  let actx = null, gain = null, source = null, t0 = 0, c0 = 0; const mixes = {};
  async function mix(voz) {
    const k = voz ? 'v' : 'm';
    if (!mixes[k]) mixes[k] = await renderMix(narr.cues.map(c => ({ T0: c.T0, dur: c.dur, buffer: voz ? c.buffer : null, duck: voz })));
    return mixes[k];
  }
  function stopSource() { if (source) { try { source.stop(); } catch { /* já parado */ } source.disconnect(); source = null; } speechSynthesis?.cancel(); }
  async function startSource() {
    stopSource(); if (!st.snd && !st.voz) return;
    actx ??= new AudioContext(); if (actx.state === 'suspended') await actx.resume();
    gain ??= (() => { const g = actx.createGain(); g.connect(actx.destination); return g; })();
    gain.gain.value = st.snd ? st.vol : 0;   // sem trilha: só a narração do navegador, se houver
    const buf = await mix(st.voz); if (!st.playing) return;
    source = actx.createBufferSource(); source.buffer = buf; source.connect(gain); if (recDest) source.connect(recDest);
    source.start(0, st.T);
  }
  // narração pelo navegador (Web Speech API), usada quando não há áudio gravado
  let spoken = -1;
  function speech(prev, now) {
    if (narr.recorded || !st.voz || !('speechSynthesis' in window)) return;
    narr.cues.forEach((c, i) => {
      if (prev <= c.T0 && now > c.T0 && spoken !== i) {
        spoken = i; const u = new SpeechSynthesisUtterance(c.text); u.lang = 'pt-BR'; u.rate = 1; u.pitch = 0.8;
        const vs = speechSynthesis.getVoices().filter(v => v.lang.replace('_', '-').toLowerCase().startsWith('pt-br'));
        u.voice = vs.find(v => /daniel|antonio|felipe|ricardo|male|masc/i.test(v.name)) ?? vs[0] ?? null; speechSynthesis.speak(u);
      }
    });
  }

  // ---------------------------------------------------------------- relógio
  let last = performance.now(), acc = 0, cnt = 0, slow = 0;
  function setPlaying(p) {
    if (p === st.playing) return; st.playing = p;
    if (p) { if (st.T >= TOTAL - 0.05) st.T = 0; t0 = st.T; c0 = performance.now() / 1000; spoken = -1; startSource().then(() => { if (actx && source) { t0 = st.T; c0 = actx.currentTime; clockAudio = true; } }); clockAudio = false; }
    else stopSource();
    $('play').textContent = p ? '❚❚ Pausar' : '▶ Reproduzir'; $('bigplay').classList.toggle('hidden', p);
  }
  let clockAudio = false;
  function seekTo(T) { st.T = clamp(T, 0, TOTAL); spoken = -1; if (st.playing) { t0 = st.T; c0 = performance.now() / 1000; clockAudio = false; startSource().then(() => { if (actx && source) { t0 = st.T; c0 = actx.currentTime; clockAudio = true; } }); } else render(); ui(); }
  function ui() {
    $('clock').textContent = `${fmt(st.T)} / ${fmt(TOTAL)}`; $('scrubfill').style.width = (st.T / TOTAL * 100) + '%';
    const e = Math.min(N_EPS - 1, Math.floor(st.T / EP_DUR)); [...$('eps').children].forEach((li, i) => li.firstChild.classList.toggle('active', i === e));
  }
  function loop(now) {
    requestAnimationFrame(loop);
    const dt = now - last; last = now;
    if (!st.playing || busy) return;
    const prev = st.T;
    st.T = clockAudio && source ? t0 + (actx.currentTime - c0) : t0 + (now / 1000 - c0);
    if (st.T >= TOTAL) { st.T = TOTAL; render(); setPlaying(false); ui(); if (recorder) recorder.stop(); return; }
    speech(prev, st.T); render(); ui();
    acc += dt; cnt++;
    if (acc > 500) {
      const fps = 1000 * cnt / acc; $('fps').textContent = `${fps.toFixed(0)} fps · ${Math.round(st.scale * 100)}%`; acc = cnt = 0;
      if (st.quality === 'auto' && !recorder) { slow = fps < 40 ? slow + 1 : 0; if (slow >= 3 && st.scale > 0.5) { st.scale = st.scale > 0.75 ? 0.75 : 0.5; world.setScale(st.scale); slow = 0; } }
    }
  }

  // ---------------------------------------------------------------- controles
  roteiro.episodios.forEach((e, i) => {
    const li = document.createElement('li'), b = document.createElement('button');
    b.innerHTML = `<b>EP ${e.id}</b> <span></span> <small>${fmt(i * EP_DUR)}</small>`; b.querySelector('span').textContent = e.titulo;
    b.onclick = () => { seekTo(i * EP_DUR); setPlaying(true); }; li.append(b); $('eps').append(li);
  });
  $('play').onclick = () => setPlaying(!st.playing); $('bigplay').onclick = () => setPlaying(true); film.onclick = () => setPlaying(!st.playing);
  $('restart').onclick = () => seekTo(0);
  const scrub = ev => { const r = $('scrub').getBoundingClientRect(); seekTo(clamp((ev.clientX - r.left) / r.width) * TOTAL); };
  $('scrub').onpointerdown = ev => { scrub(ev); $('scrub').setPointerCapture(ev.pointerId); $('scrub').onpointermove = scrub; };
  $('scrub').onpointerup = () => { $('scrub').onpointermove = null; };
  $('subs').onchange = e => { st.subs = e.target.checked; if (!st.playing) render(); };
  $('hud').onchange = e => { st.hud = e.target.checked; if (!st.playing) render(); };
  $('snd').onchange = e => { st.snd = e.target.checked; if (gain) gain.gain.value = st.snd ? st.vol : 0; if (st.playing) seekTo(st.T); };
  $('voz').onchange = e => { st.voz = e.target.checked; if (st.playing) seekTo(st.T); };
  $('vol').oninput = e => { st.vol = +e.target.value; if (gain && st.snd) gain.gain.value = st.vol; };
  $('quality').onchange = e => { st.quality = e.target.value; st.scale = st.quality === 'auto' ? 1 : +st.quality; world.setScale(st.scale); if (!st.playing) render(); };
  addEventListener('keydown', ev => {
    if (ev.target.matches('input, select')) return;
    if (ev.code === 'Space') { ev.preventDefault(); setPlaying(!st.playing); }
    else if (ev.code === 'ArrowRight') seekTo(st.T + 5); else if (ev.code === 'ArrowLeft') seekTo(st.T - 5);
    else if (/^Digit[1-5]$/.test(ev.code)) { seekTo((+ev.code.slice(5) - 1) * EP_DUR); setPlaying(true); }
    else if (ev.code === 'KeyF') { document.fullscreenElement ? document.exitFullscreen() : $('stage').requestFullscreen?.(); }
    else if (ev.code === 'KeyL') $('subs').click(); else if (ev.code === 'KeyM') $('snd').click();
  });

  // ---------------------------------------------------------------- captura e exportação
  let recorder = null, recDest = null, busy = false;
  $('shot').onclick = () => { render(); film.toBlob(b => download(b, `arquiteto-dos-dados_${st.T.toFixed(2)}s.png`), 'image/png'); };
  $('wav').onclick = async () => { status('sintetizando a trilha…'); download(wavFromBuffer(await mix(st.voz)), 'arquiteto-dos-dados.wav'); status('trilha baixada.'); };
  $('rec').onclick = async () => {
    if (recorder) { recorder.stop(); return; }
    if (!window.MediaRecorder || !film.captureStream) { status('este navegador não oferece MediaRecorder para gravar o canvas.'); return; }
    const type = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(t => MediaRecorder.isTypeSupported(t));
    actx ??= new AudioContext(); await actx.resume(); recDest = actx.createMediaStreamDestination();
    if (st.quality === 'auto') { st.scale = 1; world.setScale(1); }
    const stream = new MediaStream([...film.captureStream(60).getVideoTracks(), ...recDest.stream.getAudioTracks()]), chunks = [];
    recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 14e6 });
    recorder.ondataavailable = e => e.data.size && chunks.push(e.data);
    recorder.onstop = () => { setPlaying(false); download(new Blob(chunks, { type }), 'arquiteto-dos-dados.' + (type.includes('mp4') ? 'mp4' : 'webm')); recorder = null; recDest = null; $('rec').classList.remove('on'); $('rec').textContent = 'Gravar vídeo (WebM)'; status('gravação concluída.'); };
    $('rec').classList.add('on'); $('rec').textContent = '■ Parar gravação'; status('gravando em tempo real, do início ao fim…');
    setPlaying(false); st.T = 0; recorder.start(1000); setPlaying(true);
  };
  $('frames').onclick = async () => {
    if (!window.showDirectoryPicker) { status('exportar quadros precisa da File System Access API (Chrome/Edge). Use "Gravar vídeo" ou tools/render.js.'); return; }
    let dir; try { dir = await showDirectoryPicker({ mode: 'readwrite' }); } catch { return; }
    setPlaying(false); busy = true; world.setScale(1); const fps = 60, n = Math.round(TOTAL * fps), keep = st.T;
    const put = async (name, blob) => { const w = await (await dir.getFileHandle(name, { create: true })).createWritable(); await w.write(blob); await w.close(); };
    try {
      for (let k = 0; k < n; k++) {
        st.T = k / fps; render();
        await put(`f${String(k).padStart(5, '0')}.jpg`, await new Promise(r => film.toBlob(r, 'image/jpeg', 0.93)));
        if (k % 30 === 0) { status(`quadro ${k} de ${n}…`); await new Promise(r => setTimeout(r)); }
      }
      await put('audio.wav', wavFromBuffer(await mix(st.voz)));
      await put('LEIA-ME.txt', new Blob(['ffmpeg -framerate 60 -i f%05d.jpg -i audio.wav -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -b:a 192k arquiteto-dos-dados.mp4\n']));
      status(`${n} quadros + audio.wav gravados. O comando do ffmpeg está em LEIA-ME.txt.`);
    } catch (e) { status('exportação interrompida: ' + e.message); }
    busy = false; st.T = keep; world.setScale(st.scale); render();
  };

  // ganchos para o render determinístico (tools/render.js)
  window.TOTAL = TOTAL;
  window.seek = T => { st.T = T; render(); };
  window.frameJPEG = q => film.toDataURL('image/jpeg', q);
  window.audioWavBase64 = async () => { const b = new Uint8Array(await wavFromBuffer(await mix(true)).arrayBuffer()); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); };

  render(); ui(); $('loading').classList.add('hidden'); window.READY = true;
  requestAnimationFrame(loop);
  if (!RENDER) mix(true).then(() => status('pronto.'));   // adianta a síntese da trilha
}
boot().catch(e => { msg('erro: ' + e.message); console.error(e); window.BOOT_ERROR = String(e.stack || e); });
