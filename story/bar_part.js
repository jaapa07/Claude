// bar_part.js: the page runner shared by every part of the two bar series. A part's film.html calls
// run({ which, hud, clock, pressure, shots, overlay, end, cover }) and gets: the stage, the cast, the shot list by time,
// the HUD (place + clock), the PRESSÃO gauge, captions, the A/B end card and the #cover still. TOTAL is 60 s.
import * as S from './engine/stage.js';
import { setup, POSE } from './bar_stick.js';
import { gauge, pill, title, bang, pressureOf } from './jantar/extra.js';
const { THREE, clamp, lerp, ease, spring, hud, ruleSticker, endCard, chunkCaptions, drawCaptions, loadFonts } = S;
export { POSE, THREE, clamp, lerp, ease, spring, bang, ruleSticker, pill, title };

export async function run(cfg) {
  const T = window.TIMING;
  const w = (li, word, n = 0) => { const b = s => s.toLowerCase().replace(/[^\p{L}0-9:]/gu, ''); let k = 0; for (const x of T.lines[li].words) if (b(x.w) === b(word) && k++ === n) return x.s; throw new Error(`word "${word}" not in line ${li}: ${T.lines[li].text}`); };
  const L0 = li => T.lines[li].words[0].s, L1 = li => T.lines[li].end;
  await loadFonts();                                       // before the world: the signs are painted with Oswald
  const canvas = document.getElementById('film'), c = canvas.getContext('2d');
  const stage = S.createStage(canvas); stage.renderer.toneMappingExposure = 1.05;
  const X = setup(stage, cfg.which);
  S.LABELS.day = ''; S.LABELS.follow = cfg.end.next === 'FIM' ? 'FIM · SIGA PARA MAIS HISTÓRIAS' : 'SIGA PARA A PARTE ';
  const SH = [], at = (t0, f) => SH.push([t0, f]);
  const ctx = { X, POSE, at, w, L0, L1, T, stage, c, THREE, clamp, lerp, ease, spring, bang: (s, k, o) => bang(c, s, k, o), sticker: (n, txt, k, y) => ruleSticker(c, n, txt, k, y) };
  cfg.shots(ctx);
  SH.sort((a, b) => a[0] - b[0]);
  const clock = cfg.clock(ctx), pressure = pressureOf(cfg.pressure(ctx));
  const tEnd = T.voice_end + 0.3;
  const CHUNKS = chunkCaptions(T); window.CHUNKS = CHUNKS; window.TOTAL = Math.max(70, Math.ceil(T.voice_end + 4.7));
  const COVER = location.hash === '#cover';
  function frame(t) {
    let i = 0; while (i + 1 < SH.length && t >= SH[i + 1][0]) i++;
    SH[i][1](t, t - SH[i][0]); X.wild();
    stage.draw(t, { vignette: 0.45, bloomStrength: 0.3 });
    return i;
  }
  window.seek = t => {
    if (COVER) return cover();
    frame(t);
    const ck = clock.filter(x => t >= x[0]).pop(); hud(c, cfg.hud, ck[1]); gauge(c, pressure(t), t);
    if (cfg.overlay) cfg.overlay(ctx, t);
    if (t >= tEnd) endCard(c, tEnd, t, cfg.end.q, cfg.end.a, cfg.end.b, cfg.end.next === 'FIM' ? '' : cfg.end.next);
    else drawCaptions(c, CHUNKS, t);
  };
  function cover() {
    const k = cfg.cover; frame(k.at(ctx)); if (k.after) k.after(ctx);
    gauge(c, k.gauge ?? 99, 0); pill(c, k.pill, 300); title(c, [[k.title[0], 450, '#ffffff'], [k.title[1], 590, k.color || '#ff5a4f']]);
  }
  await loadFonts();
  window.seek(0);
  window.READY = true;
}
