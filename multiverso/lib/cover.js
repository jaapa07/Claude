// cover.js: the 2.5 s cover that opens every episode. Frame 0 is already the full cover (it doubles as the thumbnail);
// then it breathes (burst turns, cast bounces) and whips out into the episode. film.html?ep=N&cover loads it.
import { W, H, TAU, clamp, prog, ease, hash } from './core.js';
import { juninho, cleide, controle, coco, ze, chinelo, INK } from './chars.js';
import { alien, imperador, coxinha, cafe, sanduiche, salsicha, disco, bola } from './chars2.js';
import { radial, text, whip } from './fx.js';

const EPS = {
  1: { title: 'O BOTÃO DO COCÔ INFINITO', c1: '#ffd84a', c2: '#ff9f1c', tag: 'NÃO APERTE O BOTÃO VERMELHO' },
  2: { title: 'A GRAVIDADE FOI PRO SACO', c1: '#7fd6ff', c2: '#3a7bd5', tag: 'NINGUÉM MEXE NO CAFÉ DA TARDE' },
  3: { title: 'A GUERRA INTERGALÁCTICA DA MORTADELA', c1: '#ff9ec7', c2: '#d9568a', tag: 'DEIXA PELO MENOS O PÃO FRANCÊS' },
  4: { title: 'O IMPÉRIO DA SALSICHA', c1: '#ffb36b', c2: '#d9542a', tag: 'A CULINÁRIA BRASILEIRA CONTRA-ATACA' },
  5: { title: 'O FIM DA BURRICE', c1: '#b48cff', c2: '#6a3fd0', tag: 'QUANTO É DOIS MAIS DOIS?' },
};
const say = ['', 'um', 'dois', 'três', 'quatro', 'cinco'];

function wrapRows(g, s, maxW) { const ws = s.split(' '), rows = []; let cur = ''; for (const w of ws) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { rows.push(cur); cur = w; } else cur = t; } rows.push(cur); return rows; }

function cast(g, n, t) {
  const b = k => Math.abs(Math.sin(t * 5 + k)) * 14;           // little bounce for everyone
  // the episode's guest, big in the back
  if (n === 1) coco(g, { x: 760, y: 1330 - b(1), s: 1.6, t, crown: true, crownGlow: true, face: 'happy', armL: 2.8, armR: 2.8 });
  if (n === 2) { cafe(g, { x: 260, y: 1150 - b(2), s: 1.25, t, face: 'angry', armL: 2.6, armR: 2.6 }); alien(g, { x: 790, y: 1360 - b(1), s: .95, t, face: 'angry', armR: 2.6, inR: gg => chinelo(gg, 0, 0, .9, .4) }); }
  if (n === 3) { for (let i = 0; i < 6; i++) disco(g, 140 + i * 160, 640 + Math.sin(t * 3 + i) * 20 + (i % 2) * 60, .55, t); alien(g, { x: 800, y: 1360 - b(1), s: .95, t, face: 'angry', armR: 2.5, inR: gg => sanduiche(gg, { s: .55, y: 40 }) }); }
  if (n === 4) { imperador(g, { x: 800, y: 1380 - b(1), s: 1.0, t, face: 'angry', armL: 2.4, armR: 2.4 }); for (let i = 0; i < 4; i++) salsicha(g, { x: 560 + i * 130, y: 1450, s: .55, t, seed: i }); coxinha(g, { x: 190, y: 1230 - b(3), s: 1.0, t, armR: 2.9, armL: .4 }); }
  if (n === 5) { ze(g, { x: 790, y: 1400 - b(1) * .5, s: .95, t, face: 'tired' }); text(g, '2 + 2 = ?', 300, 720, { size: 120, color: '#4CF7E8', stroke: 14, rot: -.08 }); }
  // the family, always in front
  cleide(g, { x: n === 4 ? 600 : 300, y: 1560 - b(2), s: .95, t, face: 'angry', armR: { a: 2.7, b: .3 }, armL: { a: .5, b: .4 } });
  juninho(g, { x: n === 4 ? 400 : 600, y: 1640 - b(0), s: 1.0, t, face: n === 5 ? 'dumb' : 'smug', armR: { a: 2.2, b: .6 }, armL: { a: .3, b: .3 }, inR: gg => controle(gg, { s: .34, glow: 0, y: -40, t, face: 'evil' }) });
  controle(g, { x: 950, y: 1150, s: .7, t, face: 'evil', glow: 1, rot: .15 + Math.sin(t * 3) * .05, arms: true });
}

export function coverFor(n) {
  const E = EPS[n];
  return {
    META: { num: n, title: E.title, total: 2.5 }, LINES: [], MUSIC: [],
    SFX: [[0, 'fanfare', .9], [0, 'sparkle', .6], [2.15, 'whoosh', 1]],
    noCaptions: () => true,
    async makeShots() {
      return [{ t0: 0, draw(g, lt) {
        const t = lt, z = 1 + lt * .02;
        g.save(); g.translate(W / 2, H / 2); g.scale(z, z); g.translate(-W / 2, -H / 2);
        radial(g, 540, 1100, t * .6 + .3, E.c1, E.c2, 20);
        const gr = g.createRadialGradient(540, 1100, 200, 540, 1100, 1300); gr.addColorStop(0, 'rgba(255,255,255,.25)'); gr.addColorStop(1, 'rgba(20,8,40,.55)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        // halftone dots in the corners, comic-print style
        g.fillStyle = 'rgba(20,12,38,.18)'; for (let j = 0; j < 30; j++) for (let i = 0; i < 20; i++) { const x = i * 56 + (j % 2) * 28, y = j * 56 + 900; const r = 14 * clamp((y - 1300) / 700) ; if (r > 1) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); } }
        cast(g, n, t);
        g.restore();
        // logo
        g.save(); g.translate(540, 250); g.rotate(-.05 + Math.sin(t * 2) * .01);
        g.fillStyle = INK; g.beginPath(); g.roundRect(-480, -150, 960, 290, 40); g.fill();
        g.fillStyle = '#7B3FE4'; g.beginPath(); g.roundRect(-466, -136, 932, 262, 32); g.fill();
        text(g, 'O MULTIVERSO', 0, -62, { size: 118, color: '#FFD21F', stroke: 16 });
        text(g, 'DA BURRICE', 0, 56, { size: 128, color: '#5CF2FF', stroke: 16 });
        g.restore();
        // episode badge
        g.save(); g.translate(540, 470); g.rotate(.04);
        g.fillStyle = '#ff2a4a'; g.strokeStyle = INK; g.lineWidth = 10; g.beginPath(); g.roundRect(-220, -48, 440, 96, 48); g.fill(); g.stroke();
        text(g, `EPISÓDIO ${n}`, 0, 4, { size: 66, color: '#fff', stroke: 10 }); g.restore();
        // title, bottom panel
        g.save(); g.font = '400 104px Bangers'; const rows = wrapRows(g, E.title, 940); g.restore();
        const lh = 106, top = 1735 - (rows.length - 1) * lh;
        g.fillStyle = 'rgba(20,12,38,.82)'; g.beginPath(); g.roundRect(40, top - 100, 1000, rows.length * lh + 150, 36); g.fill();
        rows.forEach((r, i) => text(g, r, 540, top + i * lh - 8, { size: 104, color: '#fff', stroke: 14 }));
        text(g, E.tag, 540, top + rows.length * lh - 50, { size: 34, color: '#FFD21F', font: 'Nunito', weight: 900, stroke: 8 });
        // out: whip into the episode
        if (lt > 2.15) { const k = prog(lt, 2.15, 2.5); g.save(); g.globalAlpha = k; g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.restore(); whip(g, .3 - (lt - 2.15), .3); }
      } }];
    },
    voiceLine: `O multiverso da burrice. Episódio ${say[n]}.`,
  };
}
