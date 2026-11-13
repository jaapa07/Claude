import { Film } from './film.js';
import { BUILDERS } from '../episodes/index.js';
import { locate } from '../timeline/master.js';
import { Overlay } from '../components/overlay.js';
import { loadVoices, renderAudio } from '../audio/engine.js';

/** Inicializa o filme: mundo 3D, sequências, legendas e áudio. Retorna draw(T) e o acesso ao áudio. */
export async function createEngine(canvas, hudRoot, scale) {
  const script = await (await fetch('./script.json')).json();
  const film = new Film(canvas, scale);
  const seqs = BUILDERS.map((b) => b.build(film));
  const voices = await loadVoices(script);
  const overlay = new Overlay(hudRoot, script);
  await document.fonts.ready;
  await Promise.all(['700 40px Cinzel', '900 80px Cinzel', '700 40px "DM Sans"', '500 20px "DM Sans"'].map((f) => document.fonts.load(f, 'AÇÃOé')));
  let audio = null; const getAudio = () => (audio ??= renderAudio(script, voices));
  const draw = (T) => { const { index, t, T: c } = locate(T); (seqs[index] ?? seqs[seqs.length - 1]).update(t, c); overlay.update(c); };
  return { film, draw, getAudio, script };
}
