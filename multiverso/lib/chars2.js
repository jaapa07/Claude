// chars2.js: the rest of the cast and the food arsenal (EP2–EP5). Same conventions as chars.js:
// origin at the feet/base, o.s scale, o.sq squash & stretch, o.face, o.talk (0..1), o.t time.
import { TAU, clamp, lerp, noise, hash } from './core.js';
import { INK, ellipse as ell, rrect as rr, poly as line, limbs as limb, outline as path, vein } from './chars.js';

function frame(g, o, body) {
  g.save(); g.translate(o.x || 0, o.y || 0); g.rotate(o.rot || 0);
  const s = o.s || 1, sq = o.sq || 1; g.scale(s / Math.sqrt(sq), s * sq); if (o.flip) g.scale(-1, 1);
  body(); g.restore();
}
// simple cartoon eye pair + mouth used by food & side characters
export function face(g, x, y, w, o = {}) {
  const f = o.face || 'happy', tk = clamp(o.talk || 0), r = w * .16, gap = w * .22;
  for (const sd of [-1, 1]) {
    const ex = x + sd * gap;
    if (f === 'x') { line(g, [ex - r, y - r, ex + r, y + r], 6, INK); line(g, [ex + r, y - r, ex - r, y + r], 6, INK); continue; }
    if (f === 'cry') { ell(g, ex, y, r, r * .5, '#fff', 5); line(g, [ex - r * .9, y - r * .2, ex + r * .9, y - r * .2], 6, INK); g.fillStyle = '#7fd6ff'; g.fillRect(ex - r * .35, y + r * .2, r * .7, 600 * 0 + w * .9); continue; }
    const big = f === 'shock' ? 1.3 : 1;
    ell(g, ex, y, r * big, r * 1.15 * big, '#fff', 5);
    ell(g, ex + (o.look?.[0] || 0) * r * .4, y + (o.look?.[1] || 0) * r * .4, r * .5, r * .5, '#140c1c', 0);
    if (f === 'angry' || f === 'hero') line(g, [ex - sd * r * 1.2, y - r * .9, ex + sd * r * 1.1, y - r * 1.7], 7, INK);
  }
  const my = y + w * .3, open = Math.max(tk, f === 'shock' ? .7 : f === 'scream' ? 1 : 0);
  if (open > .08) { ell(g, x, my, w * (.12 + open * .1), w * (.05 + open * .16), '#3a0d18', 5); }
  else if (f === 'angry' || f === 'cry') { g.beginPath(); g.moveTo(x - w * .16, my + 6); g.quadraticCurveTo(x, my - 8, x + w * .16, my + 6); path(g, null, 6); }
  else { g.beginPath(); g.moveTo(x - w * .2, my - 4); g.quadraticCurveTo(x, my + w * .2, x + w * .2, my - 4); path(g, null, 6); }
}

// ================= ZORGNAK, the alien conqueror =================
export const ZG = { skin: '#9BE03A', skinD: '#6FAF1F', armor: '#6b6f8a', armorL: '#9aa0c0', cape: '#c8203a' };
export function alien(g, o = {}) {
  frame(g, o, () => {
    const t = o.t || 0, f = o.face || 'angry', tk = clamp(o.talk || 0);
    // cape
    g.beginPath(); g.moveTo(-90, -400); g.quadraticCurveTo(-160 - Math.sin(t * 2) * 20, -200, -130, -20); g.lineTo(130, -20); g.quadraticCurveTo(160 + Math.sin(t * 2.3) * 20, -200, 90, -400); g.closePath(); path(g, ZG.cape);
    // legs (three-toed boots)
    for (const sd of [-1, 1]) { limb(g, [sd * 34, -170, sd * 40, -10], 34, ZG.skinD); rr(g, sd * 40 - 34, -26, 68, 30, 12, ZG.armor, 6); }
    // body
    g.beginPath(); g.moveTo(-80, -420); g.quadraticCurveTo(-104, -280, -70, -160); g.quadraticCurveTo(0, -140, 70, -160); g.quadraticCurveTo(104, -280, 80, -420); g.closePath(); path(g, ZG.skin);
    rr(g, -70, -400, 140, 150, 30, ZG.armor); ell(g, 0, -330, 26, 26, '#ff3bd1', 6);   // chest plate with a gem
    // arms (with suction-cup fingers)
    const aL = o.armL ?? .3, aR = o.armR ?? .3;
    for (const [sd, a] of [[-1, aL], [1, aR]]) { const sx = sd * 86, sy = -400, hx = sx + sd * Math.sin(a) * 150, hy = sy + Math.cos(a) * 150; limb(g, [sx, sy, (sx + hx) / 2 + sd * 20, (sy + hy) / 2, hx, hy], 26, ZG.skin); for (let k = -1; k <= 1; k++) ell(g, hx + k * 12, hy + 10, 9, 9, ZG.skinD, 4); if (sd < 0 ? o.inL : o.inR) { g.save(); g.translate(hx, hy); (sd < 0 ? o.inL : o.inR)(g); g.restore(); } }
    // shoulder pads
    for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 92, -410, 56, 34, sd * .3, Math.PI, 0); g.closePath(); path(g, ZG.armorL); }
    // head: big dome, three eyes, antennae
    for (const sd of [-1, 1]) { line(g, [sd * 40, -600, sd * 80, -700 + Math.sin(t * 4 + sd) * 10], 8, INK); ell(g, sd * 82, -704 + Math.sin(t * 4 + sd) * 10, 14, 14, '#ff3bd1', 5); }
    ell(g, 0, -520, 120, 110, ZG.skin);
    g.save(); g.beginPath(); g.ellipse(0, -520, 120, 110, 0, 0, TAU); g.clip(); ell(g, -50, -580, 50, 30, 'rgba(255,255,255,.25)', 0); g.restore();
    for (const [ex, ey, er] of [[-50, -540, 26], [50, -540, 26], [0, -592, 20]]) {
      if (f === 'cry') { ell(g, ex, ey, er, er * .45, '#fff', 5); line(g, [ex - er, ey - 4, ex + er, ey - 4], 6, INK);
        const k = (t * 2 + ex) % 1; g.fillStyle = '#7fd6ff'; g.beginPath(); g.moveTo(ex - 8, ey + 8); g.lineTo(ex + 8, ey + 8); g.lineTo(ex + 14, ey + 200 + k * 30); g.lineTo(ex - 14, ey + 200 + k * 30); g.fill(); continue; }
      ell(g, ex, ey, er, er * 1.1, f === 'happy' ? '#fff' : '#ffef6a', 5);
      ell(g, ex + (o.look?.[0] || 0) * 8, ey + 2, er * (f === 'shock' ? .25 : .45), er * .6, '#140c1c', 0);
      if (f === 'angry') line(g, [ex - er, ey - er - 4 + (ex < 0 ? -8 : 8) * (ex === 0 ? 0 : 1), ex + er, ey - er - 4 - (ex < 0 ? -8 : 8) * (ex === 0 ? 0 : 1)], 7, INK);
    }
    // mouth: wide, with sharp teeth
    const mo = Math.max(tk, f === 'shock' ? .6 : f === 'cry' ? .5 : 0);
    g.beginPath(); g.moveTo(-60, -462); g.quadraticCurveTo(0, -462 + 30 + mo * 70, 60, -462); g.closePath(); path(g, '#3a0d18', 6);
    g.fillStyle = '#fff'; for (let i = 0; i < 6; i++) { const x = -48 + i * 19; g.beginPath(); g.moveTo(x, -462); g.lineTo(x + 9, -446); g.lineTo(x + 18, -462); g.fill(); }
    if (f === 'angry' && o.vein !== false) vein(g, 70, -600, .7);
  });
}

// ================= IMPERADOR SALSICHA =================
export function imperador(g, o = {}) {
  frame(g, o, () => {
    const t = o.t || 0, tk = clamp(o.talk || 0), f = o.face || 'angry';
    // cape
    g.beginPath(); g.moveTo(-120, -560); g.quadraticCurveTo(-240, -260, -200, 0); g.lineTo(200, 0); g.quadraticCurveTo(240, -260, 120, -560); g.closePath(); path(g, '#7a0e2a');
    g.fillStyle = '#f4f4f0'; for (let i = 0; i < 9; i++) { ell(g, -190 + i * 48, -8, 22, 12, '#f4f4f0', 4); }
    // the sausage body (a big capsule, slightly bent)
    g.beginPath(); g.moveTo(-110, -560); g.bezierCurveTo(-150, -400, -150, -150, -100, -40); g.quadraticCurveTo(0, 40, 100, -40); g.bezierCurveTo(150, -150, 150, -400, 110, -560); g.quadraticCurveTo(0, -700, -110, -560); g.closePath(); path(g, '#c4553a');
    g.save(); g.clip(); g.fillStyle = 'rgba(255,200,170,.28)'; g.fillRect(-100, -680, 50, 700); g.fillStyle = 'rgba(90,20,10,.2)'; g.fillRect(70, -680, 60, 700);
    for (let i = 0; i < 6; i++) { line(g, [-120, -500 + i * 80, 120, -480 + i * 80], 3, 'rgba(90,20,10,.25)'); } g.restore();
    // golden armour: breastplate, pauldrons, belt
    g.beginPath(); g.moveTo(-120, -380); g.quadraticCurveTo(0, -420, 120, -380); g.lineTo(110, -170); g.quadraticCurveTo(0, -140, -110, -170); g.closePath(); path(g, '#FFC83A');
    ell(g, 0, -280, 40, 40, '#e8203a', 6); line(g, [-90, -340, 90, -340], 5, '#C88A10'); line(g, [-90, -220, 90, -220], 5, '#C88A10');
    for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 128, -390, 70, 44, sd * .4, Math.PI, 0); g.closePath(); path(g, '#FFC83A'); }
    // tiny arms
    const aL = o.armL ?? .5, aR = o.armR ?? .5;
    for (const [sd, a] of [[-1, aL], [1, aR]]) { const sx = sd * 140, sy = -370, hx = sx + sd * Math.sin(a) * 90, hy = sy + Math.cos(a) * 90; limb(g, [sx, sy, hx, hy], 24, '#c4553a'); ell(g, hx, hy, 16, 16, '#fff', 5); if (sd > 0 && o.inR) { g.save(); g.translate(hx, hy); o.inR(g); g.restore(); } }
    // face: monocle, imperial brows
    const cy = -500;
    for (const sd of [-1, 1]) { ell(g, sd * 44, cy, 22, 24, '#fff', 5); ell(g, sd * 44 + (o.look?.[0] || 0) * 6, cy + 2, 10, 12, '#140c1c', 0); line(g, [sd * 18, cy - (f === 'angry' ? 30 : 40), sd * 70, cy - (f === 'angry' ? 46 : 44)], 10, INK); }
    g.beginPath(); g.arc(44, cy, 34, 0, TAU); path(g, 'rgba(200,240,255,.25)', 6, '#FFC83A'); line(g, [72, cy + 20, 90, cy + 140], 3, '#FFC83A');
    const mo = Math.max(tk, f === 'shock' ? .6 : 0);
    if (mo > .08) ell(g, 0, cy + 70, 34 + mo * 10, 10 + mo * 30, '#3a0d18', 6);
    else { g.beginPath(); g.moveTo(-34, cy + 76); g.quadraticCurveTo(0, cy + (f === 'angry' ? 56 : 96), 34, cy + 76); path(g, null, 7); }
    // helmet with a spike
    g.beginPath(); g.moveTo(-100, -590); g.quadraticCurveTo(0, -720, 100, -590); g.closePath(); path(g, '#FFC83A');
    g.beginPath(); g.moveTo(-14, -660); g.lineTo(0, -760); g.lineTo(14, -660); g.closePath(); path(g, '#FFC83A', 5);
    ell(g, 0, -630, 14, 14, '#2f8cff', 4);
  });
}
// a sausage foot soldier with a fork
export function salsicha(g, o = {}) {
  frame(g, o, () => {
    const t = o.t || 0, step = Math.sin(t * 10 + (o.seed || 0)) * 10;
    for (const sd of [-1, 1]) limb(g, [sd * 20, -30, sd * 22 + (sd > 0 ? step : -step), 0], 12, '#8a3420');
    rr(g, -44, -240, 88, 220, 44, '#c4553a');
    g.save(); g.beginPath(); g.roundRect(-44, -240, 88, 220, 44); g.clip(); g.fillStyle = 'rgba(255,200,170,.3)'; g.fillRect(-40, -240, 20, 220); g.restore();
    face(g, 0, -170, 90, { face: o.face || 'angry' });
    g.beginPath(); g.moveTo(-50, -214); g.quadraticCurveTo(0, -290, 50, -214); g.closePath(); path(g, '#6b6f8a', 6);   // helmet
    // the fork
    g.save(); g.translate(56, -120); g.rotate(o.forkA ?? -.2);
    line(g, [0, 90, 0, -110], 9, '#b8bcc8'); line(g, [-18, -110, -18, -170], 6, '#b8bcc8'); line(g, [0, -110, 0, -176], 6, '#b8bcc8'); line(g, [18, -110, 18, -170], 6, '#b8bcc8'); line(g, [-20, -110, 20, -110], 8, '#b8bcc8');
    g.restore(); ell(g, 56, -120, 13, 13, '#c4553a', 5);
  });
}

// ================= A COXINHA (the heroine) =================
export function coxinha(g, o = {}) {
  frame(g, o, () => {
    const t = o.t || 0;
    // cape
    g.beginPath(); g.moveTo(-90, -250); g.quadraticCurveTo(-170 - Math.sin(t * 3) * 30, -120, -150 - Math.sin(t * 3) * 40, 20); g.lineTo(150 + Math.sin(t * 3.3) * 40, 20); g.quadraticCurveTo(170 + Math.sin(t * 3.3) * 30, -120, 90, -250); g.closePath(); path(g, '#2f6fdb');
    // legs
    for (const sd of [-1, 1]) { limb(g, [sd * 40, -40, sd * 48, -4], 16, '#B86A1E'); ell(g, sd * 52, 0, 24, 11, '#e8203a', 5); }
    // the teardrop body with crumbs
    g.beginPath(); g.moveTo(0, -420); g.bezierCurveTo(40, -340, 150, -250, 140, -130); g.bezierCurveTo(132, -20, 60, -10, 0, -10); g.bezierCurveTo(-60, -10, -132, -20, -140, -130); g.bezierCurveTo(-150, -250, -40, -340, 0, -420); g.closePath(); path(g, '#E89B3C');
    g.save(); g.clip(); for (let i = 0; i < 70; i++) ell(g, (hash(i, 1) - .5) * 280, -10 - hash(i, 2) * 400, 4 + hash(i, 3) * 5, 3 + hash(i, 4) * 4, hash(i, 5) > .5 ? '#c97a22' : '#f7c26b', 0);
    g.fillStyle = 'rgba(255,240,200,.25)'; g.fillRect(-110, -400, 50, 400); g.restore(); path(g, null);
    // arms: fists
    const aL = o.armL ?? .4, aR = o.armR ?? .4;
    for (const [sd, a] of [[-1, aL], [1, aR]]) { const sx = sd * 120, sy = -170, hx = sx + sd * Math.sin(a) * 110, hy = sy + Math.cos(a) * 110; limb(g, [sx, sy, hx, hy], 18, '#B86A1E'); ell(g, hx, hy, 24, 24, '#fff', 6); }
    // the mask + face
    g.beginPath(); g.moveTo(-100, -230); g.quadraticCurveTo(0, -270, 100, -230); g.lineTo(96, -180); g.quadraticCurveTo(0, -200, -96, -180); g.closePath(); path(g, '#e8203a', 6);
    face(g, 0, -210, 210, { face: o.face || 'hero', talk: o.talk });
    if (o.emblem !== false) { ell(g, 0, -90, 30, 30, '#FFD21F', 5); g.fillStyle = INK; g.font = '400 40px Bangers'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('C', 0, -88); }
  });
}

// ================= CAFÉ, the coffee creature =================
export function cafe(g, o = {}) {
  frame(g, o, () => {
    const t = o.t || 0, tk = clamp(o.talk || 0);
    g.beginPath();
    for (let i = 0; i <= 40; i++) { const a = i / 40 * TAU, r = 120 + noise(i * .6 + t * 2, 3) * 16 + (Math.sin(a) > .5 ? 0 : 0); const x = Math.cos(a) * r, y = -150 + Math.sin(a) * r * 1.15 + (Math.sin(a) > 0 ? Math.sin(a) * 30 : 0); i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.closePath(); path(g, '#5a3014');
    g.save(); g.clip(); ell(g, -40, -220, 50, 30, 'rgba(255,220,180,.18)', 0); g.restore();
    // crema foam on top
    for (let i = 0; i < 9; i++) ell(g, -88 + i * 22, -262 + Math.sin(i * 1.7 + t * 3) * 6, 22, 16, '#d9a066', 4);
    // droplet arms
    for (const sd of [-1, 1]) { const a = (sd < 0 ? o.armL : o.armR) ?? 1.2; const hx = sd * (120 + Math.sin(a) * 80), hy = -160 + Math.cos(a) * 80; limb(g, [sd * 110, -160, hx, hy], 18, '#5a3014'); ell(g, hx, hy, 18, 22, '#5a3014', 5); }
    face(g, 0, -170, 190, { face: o.face || 'angry', talk: tk });
    // steam
    for (let i = 0; i < 3; i++) { const k = (t * .7 + i / 3) % 1; g.globalAlpha = (1 - k) * .7; g.beginPath(); const sx = -40 + i * 40; g.moveTo(sx, -290 - k * 100); for (let j = 1; j < 7; j++) g.lineTo(sx + Math.sin(j * 1.3 + t * 3 + i) * 10, -290 - k * 100 - j * 12); path(g, null, 6, '#ffffff'); g.globalAlpha = 1; }
  });
}

// ================= FOOD (each can be alive: o.alive draws a face) =================
export function sanduiche(g, o = {}) {       // pão francês com mortadela
  frame(g, o, () => {
    g.save(); g.translate(0, -60);
    g.beginPath(); g.ellipse(0, 26, 150, 44, 0, 0, Math.PI); g.closePath(); path(g, '#E3A24A');   // bottom bun
    for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(-150, 10 - i * 12); for (let x = -150; x <= 150; x += 25) g.quadraticCurveTo(x + 12, 30 - i * 12, x + 25, 10 - i * 12); path(g, '#F3A3B0', 5); }   // mortadela folds
    for (let i = 0; i < 10; i++) ell(g, -120 + i * 27, 4 - (i % 3) * 10, 5, 4, '#fff', 0);
    g.beginPath(); g.ellipse(0, -14, 155, 66, 0, Math.PI, 0); g.closePath(); path(g, '#E3A24A');   // top bun
    g.save(); g.beginPath(); g.ellipse(0, -14, 155, 66, 0, Math.PI, 0); g.clip(); g.fillStyle = '#f4c47a'; g.fillRect(-150, -80, 300, 20); line(g, [-40, -70, 60, -30], 9, '#c9822e'); g.restore();
    if (o.alive) face(g, 0, -40, 150, o);
    g.restore();
  });
}
export function mortadela(g, o = {}) {
  frame(g, o, () => { ell(g, 0, -60, 70, 70, '#F3A3B0'); ell(g, 0, -60, 58, 58, '#f6b5c0', 0); for (let i = 0; i < 9; i++) ell(g, (hash(i, 1) - .5) * 90, -60 + (hash(i, 2) - .5) * 90, 6, 5, '#fff', 0); if (o.alive) face(g, 0, -64, 90, o); });
}
export function pastel(g, o = {}) {
  frame(g, o, () => { g.beginPath(); g.moveTo(-120, -20); g.quadraticCurveTo(-130, -140, 0, -150); g.quadraticCurveTo(130, -140, 120, -20); g.closePath(); path(g, '#F2B54A');
    for (let i = 0; i < 12; i++) ell(g, -110 + i * 20, -20, 9, 6, '#d99a30', 4); for (let i = 0; i < 8; i++) ell(g, -70 + hash(i, 3) * 140, -120 + hash(i, 4) * 80, 8, 5, '#f7d08a', 0); if (o.alive) face(g, 0, -80, 130, o); });
}
export function hamburguer(g, o = {}) {
  frame(g, o, () => { rr(g, -110, -50, 220, 50, 24, '#d9913a'); rr(g, -120, -80, 240, 34, 16, '#6b3a1c'); g.beginPath(); g.moveTo(-124, -86); for (let x = -124; x <= 124; x += 31) g.lineTo(x + 15, -66); g.lineTo(124, -86); path(g, '#ffd21f', 5);
    g.beginPath(); g.moveTo(-126, -92); for (let x = -126; x <= 126; x += 21) g.quadraticCurveTo(x + 10, -76, x + 21, -92); path(g, '#5fbf3a', 5);
    g.beginPath(); g.ellipse(0, -96, 120, 80, 0, Math.PI, 0); g.closePath(); path(g, '#e8a040'); for (let i = 0; i < 9; i++) ell(g, -80 + hash(i, 6) * 160, -140 + hash(i, 7) * 40, 6, 3, '#fff3c0', 0);
    if (o.alive) face(g, 0, -130, 130, o); });
}
export function pizza(g, o = {}) {
  frame(g, o, () => { g.beginPath(); g.moveTo(0, 0); g.lineTo(-100, -230); g.quadraticCurveTo(0, -270, 100, -230); g.closePath(); path(g, '#FFD45A');
    g.beginPath(); g.moveTo(-104, -228); g.quadraticCurveTo(0, -272, 104, -228); g.lineTo(98, -252); g.quadraticCurveTo(0, -296, -98, -252); g.closePath(); path(g, '#d9913a', 6);
    for (const [x, y] of [[-30, -170], [30, -130], [0, -80], [40, -200], [-50, -215]]) ell(g, x, y, 18, 18, '#d8303a', 5);
    if (o.alive) face(g, 0, -150, 110, o); });
}
export function queijo(g, o = {}) {
  frame(g, o, () => { g.beginPath(); g.moveTo(-120, 0); g.lineTo(120, 0); g.lineTo(120, -110); g.lineTo(-120, -40); g.closePath(); path(g, '#FFD21F'); for (const [x, y, r] of [[-60, -30, 14], [20, -50, 18], [80, -30, 12], [60, -80, 10]]) ell(g, x, y, r, r * .8, '#e0b000', 4); if (o.alive) face(g, 10, -40, 100, o); });
}
export function tomate(g, o = {}) {
  frame(g, o, () => { ell(g, 0, -80, 90, 80, '#e8203a'); ell(g, -30, -110, 24, 16, 'rgba(255,255,255,.35)', 0); for (let i = 0; i < 5; i++) { g.save(); g.translate(0, -158); g.rotate(i / 5 * TAU); ell(g, 0, -14, 10, 22, '#2fa34d', 4); g.restore(); } if (o.alive) face(g, 0, -80, 130, o); });
}
export function requeijao(g, o = {}) {      // a generic cup of cream cheese ("copo de requeijão")
  frame(g, o, () => { g.beginPath(); g.moveTo(-70, -170); g.lineTo(70, -170); g.lineTo(56, 0); g.lineTo(-56, 0); g.closePath(); path(g, '#dff3ff'); rr(g, -60, -150, 120, 110, 20, '#fffdf4', 5); rr(g, -78, -190, 156, 30, 10, '#2f6fdb'); g.fillStyle = '#2f6fdb'; g.font = '900 20px Nunito'; g.textAlign = 'center'; g.fillText('CREMOSO', 0, -90); });
}
export function pipoca(g, x, y, s = 1, seed = 0) {
  g.save(); g.translate(x, y); g.scale(s, s);
  for (let i = 0; i < 6; i++) ell(g, Math.cos(i * 1.1 + seed) * 22, Math.sin(i * 1.7 + seed) * 18, 22, 20, i % 2 ? '#fff8e0' : '#ffffff', 4);
  ell(g, 0, 6, 12, 10, '#f2c14e', 0); g.restore();
}
export function bola(g, x, y, r = 60, rot = 0) {          // soccer ball
  g.save(); g.translate(x, y); g.rotate(rot); ell(g, 0, 0, r, r, '#ffffff', 6);
  g.save(); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.clip();
  const pent = (cx, cy, rr_) => { g.beginPath(); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU - Math.PI / 2; g.lineTo(cx + Math.cos(a) * rr_, cy + Math.sin(a) * rr_); } g.closePath(); g.fillStyle = '#140c1c'; g.fill(); };
  pent(0, 0, r * .32); for (let i = 0; i < 5; i++) { const a = i / 5 * TAU - Math.PI / 2; pent(Math.cos(a) * r * .85, Math.sin(a) * r * .85, r * .3); line(g, [Math.cos(a) * r * .3, Math.sin(a) * r * .3, Math.cos(a) * r * .62, Math.sin(a) * r * .62], 4, INK); }
  g.restore(); g.restore();
}
// a 2D flying saucer (for 2D shots; the 3D fleet lives in world3d.js)
export function disco(g, x, y, s = 1, t = 0, o = {}) {
  g.save(); g.translate(x, y); g.scale(s, s); g.rotate(o.rot || 0);
  if (o.beam) { g.fillStyle = 'rgba(166,255,77,.25)'; g.beginPath(); g.moveTo(-40, 20); g.lineTo(40, 20); g.lineTo(140, 600); g.lineTo(-140, 600); g.closePath(); g.fill(); }
  ell(g, 0, 0, 150, 40, '#9aa0c0'); ell(g, 0, -10, 150, 26, '#c8cde0', 0);
  for (let i = 0; i < 7; i++) ell(g, -120 + i * 40, 10, 9, 9, Math.floor(t * 8 + i) % 2 ? '#ffd21f' : '#ff3bd1', 4);
  g.beginPath(); g.ellipse(0, -22, 70, 56, 0, Math.PI, 0); g.closePath(); path(g, 'rgba(160,240,255,.65)');
  if (o.pilot !== false) { ell(g, 0, -40, 26, 24, '#9BE03A', 4); ell(g, -8, -44, 6, 6, '#140c1c', 0); ell(g, 8, -44, 6, 6, '#140c1c', 0); }
  g.restore();
}
