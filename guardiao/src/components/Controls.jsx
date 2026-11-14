import React, { useState } from 'react';

const fmt = (T) => `${String(Math.floor(T / 60)).padStart(1, '0')}:${(T % 60).toFixed(1).padStart(4, '0')}`;

/** Painel: reprodução, pausa, timeline com marcas de sequência, volume, seleção de sequências e exportação. */
export default function Controls({ ui, ready, loading, quality, sequences, duration, seqLen, fps, onToggle, onSeek, onVolume, onLoop, onQuality, onWav }) {
  const [vol, setVol] = useState(0.9), [loop, setLoop] = useState(true);
  const cur = Math.min(sequences.length - 1, Math.floor(ui.T / seqLen));
  return (
    <aside id="panel">
      <h1><small>CURTA ANIMADO · 90 s · 9:16</small>O Último Guardião das Estrelas</h1>
      <div className="seqs">{sequences.map((s, i) => (
        <button key={s.id} className={i === cur ? 'on' : ''} onClick={() => onSeek(i * seqLen)}><b>{s.id}</b><span>{s.title}<i>{i * seqLen}–{(i + 1) * seqLen} s</i></span></button>))}
      </div>
      <div className="timeline">
        <input type="range" min="0" max={duration} step="0.01" value={ui.T} onChange={(e) => onSeek(Number(e.target.value))} aria-label="Linha do tempo" />
        <div className="marks">{sequences.map((s, i) => <span key={s.id} style={{ left: `${(i * seqLen / duration) * 100}%` }} />)}</div>
      </div>
      <div className="row">
        <button className="primary" disabled={!ready} onClick={onToggle}>{loading ? 'Carregando áudio…' : ui.playing ? '❚❚ Pausar' : '▶ Assistir'}</button>
        <button onClick={() => onSeek(0)}>⟲ Início</button>
        <span className="time">{fmt(ui.T)} / {fmt(duration)}</span>
      </div>
      <div className="row">
        <label>Volume <input type="range" min="0" max="1" step="0.01" value={vol} onChange={(e) => { const v = Number(e.target.value); setVol(v); onVolume(v); }} /></label>
        <label><input type="checkbox" checked={loop} onChange={(e) => { setLoop(e.target.checked); onLoop(e.target.checked); }} /> Repetir</label>
      </div>
      <div className="row">
        <label>Qualidade da prévia <select value={quality} onChange={(e) => onQuality(Number(e.target.value))}><option value="0.35">Leve</option><option value="0.5">Média</option><option value="0.75">Alta</option><option value="1">1080×1920</option></select></label>
        <button onClick={onWav}>⬇ Áudio WAV</button>
      </div>
      <div className="meta">sequência {cur + 1} · quadro {String(Math.floor(ui.T * fps)).padStart(4, '0')} / {duration * fps} · {ui.fps.toFixed(0)} fps</div>
      <p>Atalhos: <b>espaço</b> play/pausa · <b>←/→</b> 1 s · <b>1–5</b> sequência. A prévia roda em tempo real; a exportação desenha quadro a quadro (60 fps, 1080×1920) com o mesmo código.</p>
      <pre>{`npm run export              # filme completo em MP4
npm run export -- --seq 3   # só a sequência 3
npm run verify              # prova de determinismo`}</pre>
    </aside>
  );
}
