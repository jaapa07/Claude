// A Lanterna de São João: one timeline (timeline.json from tools/timeline.py) drives the picture, the subtitles and the mix.
// ?from=a&to=b renders a cut; ?ssaa=N supersampling (default 2); ?nosub=1 hides subtitles.
import * as THREE from 'three';
import { Pipe } from './post.js';
import { dispose } from './stage.js';
import { ss, seg, clamp } from './lib.js';
import * as SH from './shots.js';

const Q = new URLSearchParams(location.search), SSAA = +(Q.get('ssaa') || 2);
const TL = await (await fetch('timeline.json')).json();
const FROM = Q.has('from') ? +Q.get('from') : 0, TO = Q.has('to') ? +Q.get('to') : TL.DUR;
window.DUR = +(TO - FROM).toFixed(3);
const BUILD = { S0: SH.s0, S1: SH.s1, S2: SH.s2, S2b: SH.s2b, S3: SH.s3, S4: SH.s4, S5: SH.s5, S6: SH.s6 };
const TR = { cut: { type: 'cut', dur: 0 }, dissolve: { type: 'dissolve', dur: .9 }, dark: { type: 'dark', dur: 1.2 }, flash: { type: 'dissolve', dur: 1.1 } };
const plan = TL.SHOTS.map(([id, start, tr]) => ({ id, start, in: TR[tr] || TR.cut }));
plan.forEach((s, i) => { s.end = i + 1 < plan.length ? plan[i + 1].start : TL.DUR; });

const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
renderer.setPixelRatio(SSAA); renderer.setSize(1920, 1080, false);
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.VSMShadowMap;
renderer.toneMapping = THREE.NoToneMapping; renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
const pipe = new Pipe(renderer, 1920, 1080, SSAA);
await Promise.all([document.fonts.load('600 40px Cormorant', 'Ação'), document.fonts.load('700 40px Cormorant', 'São João')]);

const live = new Map();
function get(i) { if (!live.has(i)) live.set(i, BUILD[plan[i].id]({ H: TL.HIT, L: TL.L, T0: plan[i].start, T1: plan[i].end })); return live.get(i); }
function gc(keep) { for (const [i, s] of live) if (!keep.includes(i)) { dispose(s.S.scene); live.delete(i); } }
function draw(i, t, target) { const s = get(i); s.update(t); pipe.shot(s.S.scene, s.S.cam, s.post(t), target); return s.grade(t); }

const sub = document.getElementById('sub'), line = sub.querySelector('.pt');
function R(t) {
  let i = plan.findIndex(p => t >= p.start && t < p.end); if (i < 0) i = plan.length - 1;
  const p = plan[i], tl = t - p.start;
  let g, mixB = 0, dark = 1;
  if (i > 0 && p.in.type === 'dissolve' && tl < p.in.dur) { draw(i - 1, t, pipe.rtA); g = draw(i, t, pipe.rtB); mixB = ss(tl / p.in.dur); gc([i - 1, i]); }
  else if (i > 0 && p.in.type === 'dark' && tl < p.in.dur) {   // the light goes out: the old shot fades to black, the new one comes up from it
    const h = p.in.dur / 2;
    if (tl < h) { g = draw(i - 1, t, pipe.rtA); dark = 1 - ss(tl / h); gc([i - 1, i]); } else { g = draw(i, t, pipe.rtA); dark = ss((tl - h) / h); gc([i]); }
  }
  else { g = draw(i, t, pipe.rtA); gc([i]); }
  pipe.final({ ...g, mixB, fade: (g.fade ?? 1) * dark });   // no fade-in: the first frame is the cover
  let c = null, a = 0;
  for (const q of TL.cues) if (t > q.t0 && t < q.t1) { c = q; a = Math.min(ss(seg(t, q.t0, q.t0 + .2)), 1 - ss(seg(t, q.t1 - .22, q.t1))); }
  line.textContent = c ? c.text : ''; sub.style.opacity = Q.has('nosub') ? 0 : a;
  window.__sub = c ? c.text : '';
}
window.render = t => R(FROM + t);
window.TEXTS = () => window.__sub ? [{ id: 'sub', text: window.__sub, x0: 300, y0: 960, x1: 1620, y1: 1020 }] : [];
window.READY = true;
