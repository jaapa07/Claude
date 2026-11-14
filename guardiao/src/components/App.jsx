import React, { useEffect, useRef, useState } from 'react';
import { createEngine } from '../rendering/engine.js';
import { Player } from '../timeline/player.js';
import { installExportApi, downloadWav } from '../export/api.js';
import { W, H } from '../rendering/stage.js';
import { DURATION, SEQUENCES, SEQ_LEN, FPS } from '../timeline/master.js';
import Controls from './Controls.jsx';

const q = new URLSearchParams(location.search);
const RENDER = q.has('render');

export default function App() {
  const canvas = useRef(null), hud = useRef(null), stage = useRef(null), frame = useRef(null), api = useRef(null);
  const [ready, setReady] = useState(false), [audioReady, setAudioReady] = useState(false);
  const [ui, setUi] = useState({ T: 0, playing: false, fps: 60 });
  const [quality, setQuality] = useState(Number(q.get('scale') ?? (RENDER ? 1 : 0.5)));

  useEffect(() => {
    let dead = false;
    document.body.classList.toggle('render', RENDER);
    createEngine(canvas.current, hud.current, quality).then((eng) => {
      if (dead) return;
      installExportApi(eng.draw, eng.getAudio);
      const start = Number(q.get('t') ?? 0);
      if (!RENDER) {
        const player = new Player(eng.draw, eng.getPlayback); player.T = start;
        eng.getPlayback().then(() => !dead && setAudioReady(true), () => !dead && setAudioReady(true));   // pré-carrega a trilha
        let n = 0; player.onTick = (p) => { if (!p.playing || n++ % 6 === 0) setUi({ T: p.T, playing: p.playing, fps: p.fps }); };
        api.current = { player, eng }; if (q.has('autoplay')) player.play();
      } else api.current = { eng };
      eng.draw(start); setReady(true);
    });
    return () => { dead = true; };
  }, []);

  useEffect(() => {                                               // encaixa o quadro 9:16 na janela
    if (RENDER) { stage.current.style.transform = `scale(${quality})`; return; }
    const fit = () => { const pw = innerWidth > 820 ? 380 + 28 : 0, s = Math.min((innerHeight - 32) / H, (innerWidth - 32 - pw) / W); stage.current.style.transform = `scale(${s})`; frame.current.style.width = W * s + 'px'; frame.current.style.height = H * s + 'px'; };
    fit(); addEventListener('resize', fit); return () => removeEventListener('resize', fit);
  }, []);

  useEffect(() => {
    if (RENDER) return;
    const key = (e) => { const p = api.current?.player; if (!p) return;
      if (e.code === 'Space') { e.preventDefault(); p.toggle(); } else if (e.code === 'ArrowRight') p.seek(p.T + 1); else if (e.code === 'ArrowLeft') p.seek(p.T - 1);
      else if (/^Digit[1-5]$/.test(e.code)) p.seek((Number(e.code[5]) - 1) * SEQ_LEN); };
    addEventListener('keydown', key); return () => removeEventListener('keydown', key);
  }, []);

  const p = () => api.current?.player;
  return (
    <div id="app">
      <div id="frame" ref={frame}><div id="stage" ref={stage}><canvas id="gl" ref={canvas} /><div id="hud" ref={hud} /></div>{!ready && <div className="loading">Preparando o universo…</div>}</div>
      {!RENDER && <Controls ui={ui} ready={ready && audioReady} loading={ready && !audioReady} quality={quality} sequences={SEQUENCES} duration={DURATION} seqLen={SEQ_LEN} fps={FPS}
        onToggle={() => p()?.toggle()} onSeek={(T) => p()?.seek(T)} onVolume={(v) => p()?.setVolume(v)} onLoop={(v) => { if (p()) p().loop = v; }}
        onQuality={(s) => { setQuality(s); api.current.eng.film.setScale(s); api.current.eng.draw(p().T); }} onWav={() => downloadWav(api.current.eng.getAudio)} />}
    </div>
  );
}
