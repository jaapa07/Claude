/* toons.js — the cast of A Grande Guerra do Cocô, on paper.js and cast.js (its mouth shapes, #spA … #spX).
   One builder, toon(), makes every character: a paper body (baked), a live face (big eyes with lids and pupils, thick
   brows, a mouth from the lip-sync shapes), noodle arms drawn as live strokes with white mitten hands, optional stubby
   legs, squash and stretch about the feet, a lean, a tremble. Built at the feet (0, 0), facing us.
   pose(o, f): x, y, s, flip, o (opacity), sq (+ squashes, − stretches), lean (deg), bob, shake (px of tremble),
   look (−1 … 1 slides the face), eyeX/eyeY (pupils), eyes (eye size, 1 rest; 1.6 is popping out), lids (0 … 1),
   shut, brow (<0 angry, >0 worried), mouth (a lip-sync shape or an expression: smile grin frown O wobble flat),
   armL/armR (deg, 0 hangs, + raises outward; 180 straight up), bendL/bendR (−1 … 1 the noodle's curve),
   reachL/reachR (1 rest), holdL/holdR (a prop key), legL/legR (deg), and whatever the character's own live parts read.
   at(o, name): 'handL', 'handR', 'mouth', 'top', 'base' in the parent's coordinates for pose o. */
'use strict';
const T_INK = '#1d1a1a';
let toonN = 0;
const REST_T = { x: 0, y: 0, s: 1, flip: 1, o: 1, sq: 0, lean: 0, bob: 0, shake: 0, look: 0, lookY: 0, eyeX: 0, eyeY: 0, eyes: 1, lids: null, shut: false,
  brow: null, mouth: null, armL: 10, armR: 10, bendL: .3, bendR: .3, reachL: 1, reachR: 1, holdL: null, holdR: null, legL: 0, legR: 0 };

function toon(parent, spec, frontParent = null) {
  const id = 'tn' + (++toonN), F = spec.face, A = spec.arms, Lg = spec.legs, holds = spec.holds || {};
  const g = mk('g', {}, parent), all = mk('g', {}, g);
  const eye = (sx, extra = '') => `<ellipse cx="${sx * F.dx}" cy="${F.y}" rx="${F.rx}" ry="${F.ry}" ${extra}/>`;
  const legs = Lg ? ['L', 'R'].map((k, i) => `<g data-p="leg${k}" transform="translate(${(i ? 1 : -1) * Lg.x},${-Lg.len})"><g filter="url(#paper)">
      <rect x="${-Lg.w / 2}" y="0" width="${Lg.w}" height="${Lg.len}" rx="${Lg.w / 2}" fill="${Lg.color}"/><ellipse cx="${(i ? 1 : -1) * 6}" cy="${Lg.len - 2}" rx="${Lg.w * .95}" ry="${Lg.w * .55}" fill="${Lg.shoe || T_INK}"/></g></g>`).join('') : '';
  const arm = k => `<g data-p="arm${k}"><path data-p="ao${k}" fill="none" stroke="${T_INK}" stroke-width="${A.w + 6}" stroke-linecap="round"/><path data-p="ai${k}" fill="none" stroke="${A.color}" stroke-width="${A.w}" stroke-linecap="round"/>
      <g data-p="hand${k}"><circle r="${A.hand || 13}" fill="${A.glove || '#f6f3ec'}" stroke="${T_INK}" stroke-width="3"/>${Object.entries(holds).map(([n, s]) => `<g data-p="hold${k}_${n}">${s}</g>`).join('')}</g></g>`;
  all.innerHTML = `<ellipse data-p="shadow" cx="0" cy="-2" rx="${spec.shadow || 80}" ry="${(spec.shadow || 80) * .18}" fill="#000" opacity=".22"/>${legs}
    ${spec.back ? `<g filter="url(#paper)">${spec.back}</g>` : ''}${A.behind ? arm('L') + arm('R') : ''}
    <g filter="url(#paper)">${spec.body}</g>${spec.live || ''}
    <g data-p="face"><clipPath id="${id}e">${eye(-1)}${eye(1)}</clipPath>
      <g data-p="eyes">${eye(-1, `fill="#fff" stroke="${T_INK}" stroke-width="3"`)}${eye(1, `fill="#fff" stroke="${T_INK}" stroke-width="3"`)}
        <g data-p="pupils"><circle cx="${-F.dx}" cy="${F.y}" r="${F.pupil}" fill="${T_INK}"/><circle cx="${F.dx}" cy="${F.y}" r="${F.pupil}" fill="${T_INK}"/>
          <circle cx="${-F.dx + F.pupil * .35}" cy="${F.y - F.pupil * .35}" r="${F.pupil * .3}" fill="#fff"/><circle cx="${F.dx + F.pupil * .35}" cy="${F.y - F.pupil * .35}" r="${F.pupil * .3}" fill="#fff"/></g>
        <g clip-path="url(#${id}e)"><g data-p="lids"><rect x="${-F.dx - F.rx - 4}" y="${F.y - F.ry * 3}" width="${2 * (F.dx + F.rx) + 8}" height="${F.ry * 2}" fill="${F.lid}"/>
          <path d="M${-F.dx - F.rx - 4},${F.y - F.ry} H${F.dx + F.rx + 4}" stroke="${T_INK}" stroke-width="4"/></g></g>
        ${eye(-1, `fill="none" stroke="${T_INK}" stroke-width="3"`)}${eye(1, `fill="none" stroke="${T_INK}" stroke-width="3"`)}</g>
      ${F.glasses || ''}
      <path data-p="browL" d="M${-F.dx - F.bw / 2},${F.by} L${-F.dx + F.bw / 2},${F.by}" stroke="${F.bc || T_INK}" stroke-width="${F.bt || 7}" stroke-linecap="round"/>
      <path data-p="browR" d="M${F.dx - F.bw / 2},${F.by} L${F.dx + F.bw / 2},${F.by}" stroke="${F.bc || T_INK}" stroke-width="${F.bt || 7}" stroke-linecap="round"/>
      <use class="mouth" href="#spX" transform="translate(0,${F.my}) scale(${F.ms || 1})"/>${F.stache || ''}</g>
    ${A.behind ? '' : arm('L') + arm('R')}`;
  let front = null, frontAll = null;
  if (spec.front) { front = mk('g', {}, frontParent || parent); frontAll = mk('g', {}, front); frontAll.innerHTML = `<g filter="url(#paper)">${spec.front}</g>`; bakeAll(front); }
  bakeAll(g);
  const P = pieces(g), holdKeys = Object.keys(holds), mouthEl = g.querySelector('.mouth');
  const sh = { L: A.L, R: A.R };
  // the hand: shoulder + len·reach along the arm's direction (0 hangs, + raises outward)
  const handAt = (k, o) => { const a = o['arm' + k] * Math.PI / 180, d = k === 'L' ? [-Math.sin(a), Math.cos(a)] : [Math.sin(a), Math.cos(a)], L = A.len * o['reach' + k];
    return [sh[k][0] + d[0] * L, sh[k][1] + d[1] * L, d]; };
  const toParent = (o, [lx, ly]) => { const r = o.lean * Math.PI / 180, x1 = lx * (1 + .6 * o.sq), y1 = ly * (1 - o.sq), x2 = x1 * Math.cos(r) - y1 * Math.sin(r), y2 = x1 * Math.sin(r) + y1 * Math.cos(r);
    return [o.x + o.s * o.flip * x2, o.y + o.s * (y2 + o.bob)]; };
  const at = (o, name) => { o = { ...REST_T, ...spec.rest, ...o };
    if (name === 'handL' || name === 'handR') { const [hx, hy] = handAt(name.slice(-1), o); return toParent(o, [hx, hy]); }
    return toParent(o, { mouth: [0, F.my], top: [0, spec.top || -200], base: [0, 0], eyes: [0, F.y] }[name]); };
  // the values that put a hand on a point of the parent (pose spread: { ...o, ...t.aim(o, 'R', pt) })
  const aim = (o, k, [px, py]) => { o = { ...REST_T, ...spec.rest, ...o };
    const lx = ((px - o.x) / (o.s * o.flip)), ly = (py - o.y) / o.s - o.bob, dx = lx - sh[k][0], dy = ly - sh[k][1];
    const side = k === 'L' ? -1 : 1, a = Math.atan2(side * dx, dy) * 180 / Math.PI, reach = Math.min(1.5, Math.max(.4, Math.hypot(dx, dy) / A.len));
    return { ['arm' + k]: a, ['reach' + k]: reach }; };
  return { g, front, at, aim, spec, pose(o, f) {
    o = { ...REST_T, ...spec.rest, ...o };
    const j = k => .35 * jit(f >> 1, k + toonN * 7), sk = o.shake ? o.shake * jit(f, 11) : 0, sk2 = o.shake ? o.shake * jit(f, 12) : 0;
    const root = `translate(${(o.x + j(1) + sk).toFixed(1)},${(o.y + j(2) + sk2).toFixed(1)}) scale(${(o.s * o.flip).toFixed(3)},${o.s.toFixed(3)})`;
    const body = `translate(0,${o.bob.toFixed(1)}) rotate(${(o.lean + j(3) * .5).toFixed(2)}) scale(${(1 + .6 * o.sq).toFixed(3)},${(1 - o.sq).toFixed(3)})`;
    tf(g, root); tf(all, body); if (front) { tf(front, root); tf(frontAll, body); }
    const op = o.o.toFixed(2); if (g._o !== op) { g.setAttribute('opacity', op); if (front) front.setAttribute('opacity', op); g._o = op; }
    if (Lg) { for (const k of 'LR') tf(P['leg' + k], `translate(${(k === 'L' ? -1 : 1) * Lg.x},${-Lg.len}) rotate(${(k === 'L' ? o.legL : -o.legR).toFixed(1)})`); }
    for (const k of 'LR') {
      const [hx, hy, d] = handAt(k, o), [sx, sy] = sh[k], L = A.len * o['reach' + k], b = o['bend' + k] * L * .35 * (k === 'L' ? 1 : -1);
      const cx = (sx + hx) / 2 + d[1] * b, cy = (sy + hy) / 2 - d[0] * b, dd = `M${sx},${sy} Q${cx.toFixed(1)},${cy.toFixed(1)} ${hx.toFixed(1)},${hy.toFixed(1)}`;
      if (P['ai' + k]._d !== dd) { P['ai' + k].setAttribute('d', dd); P['ao' + k].setAttribute('d', dd); P['ai' + k]._d = dd; }
      tf(P['hand' + k], `translate(${hx.toFixed(1)},${hy.toFixed(1)})`);
      for (const n of holdKeys) vis(P[`hold${k}_${n}`], o['hold' + k] === n);
    }
    tf(P.face, `translate(${(o.look * (F.slide || 14)).toFixed(1)},${(o.lookY * 8).toFixed(1)})`);
    tf(P.eyes, `translate(0,${F.y}) scale(${o.eyes.toFixed(3)}) translate(0,${-F.y})`);
    tf(P.pupils, `translate(${(o.eyeX * F.rx * .45).toFixed(1)},${(o.eyeY * F.ry * .4).toFixed(1)})`);
    const lid = o.shut ? 1 : (o.lids ?? F.lids ?? 0);
    tf(P.lids, `translate(0,${(lid * F.ry * 2).toFixed(1)})`);
    const b = o.brow ?? F.brow ?? 0;
    tf(P.browL, `rotate(${(-18 * b).toFixed(1)},${-F.dx},${F.by}) translate(0,${(-6 * Math.max(0, b)).toFixed(1)})`);
    tf(P.browR, `rotate(${(18 * b).toFixed(1)},${F.dx},${F.by}) translate(0,${(-6 * Math.max(0, b)).toFixed(1)})`);
    const m = '#sp' + (o.mouth || F.mouth || 'X'); if (mouthEl._m !== m) mouthEl.setAttribute('href', mouthEl._m = m);
    if (spec.livePose) spec.livePose(P, o, f);
  } };
}

/* ---------- props held in a mitten ((0, 0) is the hand) ---------- */
const PROP = {
  briefcase: '<g filter="url(#paper)"><rect x="-34" y="4" width="68" height="48" rx="6" fill="#5a3418"/><path d="M-12,4 v-10 h24 v10" stroke="#3a2010" stroke-width="5" fill="none"/><rect x="-6" y="22" width="12" height="8" fill="#e2c26a"/></g>',
  contract: '<g filter="url(#paper)"><rect x="-36" y="-70" width="72" height="92" fill="#f4f1ea" stroke="#c8bfa6" stroke-width="2"/><path d="M-26,-54 h52 M-26,-40 h52 M-26,-26 h40 M-26,-12 h52 M-26,2 h30" stroke="#9a958c" stroke-width="4"/><text x="0" y="-58" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="9" fill="#a3271f">CONSTITUIÇÃO</text></g>',
  badge: '<g filter="url(#paper)"><rect x="-26" y="-10" width="52" height="66" rx="6" fill="#f4f1ea" stroke="#2f5f9a" stroke-width="4"/><rect x="-26" y="-10" width="52" height="16" rx="5" fill="#2f5f9a"/><text x="0" y="40" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="11" fill="#2b1d14">GERENTE</text></g>',
  gavel: '<g filter="url(#paper)"><rect x="-6" y="-60" width="12" height="70" rx="5" fill="#8a5630"/><rect x="-34" y="-84" width="68" height="30" rx="8" fill="#5a3418"/></g>',
  fan: '<g filter="url(#paper)"><rect x="-6" y="-20" width="12" height="40" fill="#5a646a"/><circle cx="0" cy="-70" r="56" fill="#cfd8dc" stroke="#5a646a" stroke-width="6"/></g><g data-p="blades"><path d="M0,-70 l-10,-46 q10,-8 20,0 Z M0,-70 l46,-10 q8,10 0,20 Z M0,-70 l10,46 q-10,8 -20,0 Z M0,-70 l-46,10 q-8,-10 0,-20 Z" fill="#7fb6d6" stroke="#2b2f36" stroke-width="3"/><circle cx="0" cy="-70" r="9" fill="#2b2f36"/></g>',
  tablet: '<g filter="url(#paper)"><rect x="-40" y="-64" width="80" height="60" rx="8" fill="#2b2f36"/><rect x="-34" y="-58" width="68" height="48" fill="#c8322f"/><path d="M-8,-46 l20,12 l-20,12 Z" fill="#fff"/></g>',
  cane: '<g filter="url(#paper)"><path d="M0,-10 v110" stroke="#5a3418" stroke-width="9" stroke-linecap="round"/><path d="M0,-10 q-24,-26 -36,0" stroke="#5a3418" stroke-width="9" fill="none" stroke-linecap="round"/></g>',
  plunger: '<g filter="url(#paper)"><rect x="-5" y="-90" width="10" height="100" fill="#c9a27a"/><path d="M-30,-90 q30,-40 60,0 Z" fill="#c8322f"/></g>',
};

/* ---------- the cast ---------- */
const POO = '#7a4a22', POO_D = '#5a3415';
function pooBody(c = POO, d = POO_D, hi = '#9a6534') {
  return `<path d="M-95,-8 C-110,-30 -100,-70 -70,-72 C-90,-100 -70,-132 -40,-128 C-55,-158 -30,-185 2,-180 C34,-185 60,-160 42,-128 C72,-132 92,-100 72,-72 C102,-70 112,-30 95,-8 Q0,10 -95,-8 Z" fill="${c}"/>
    <path d="M-70,-72 Q0,-56 72,-72" stroke="${d}" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M-40,-128 Q0,-114 42,-128" stroke="${d}" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M-66,-36 q30,-16 62,-6" stroke="${hi}" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M-30,-150 q16,-10 34,-6" stroke="${hi}" stroke-width="6" fill="none" stroke-linecap="round"/>`;
}
const CROWN = `<path d="M-40,-166 L-48,-218 L-22,-192 L0,-232 L22,-192 L48,-218 L40,-166 Z" fill="#f2c230" stroke="#b8860b" stroke-width="4" stroke-linejoin="round"/><circle cx="0" cy="-186" r="8" fill="#c8322f"/><circle cx="-26" cy="-180" r="5" fill="#2f5f9a"/><circle cx="26" cy="-180" r="5" fill="#2f8a4a"/>`;
const HELMET = `<path d="M-62,-150 Q-60,-232 2,-234 Q64,-232 64,-150 Z" fill="#4f6b2f"/><rect x="-70" y="-158" width="140" height="18" rx="8" fill="#33461d"/><path d="M-30,-200 h12 M-10,-210 h12 M14,-196 h12" stroke="#3d5524" stroke-width="6"/>`;
const STACHE = `<path d="M-4,-95 C-18,-108 -44,-104 -52,-88 C-38,-96 -22,-90 -4,-88 Z" fill="#2b1608"/><path d="M6,-93 C22,-100 42,-92 48,-76 C36,-86 20,-86 6,-86 Z" fill="#2b1608"/>`;
const pooFace = (o = {}) => ({ y: -110, dx: 25, rx: 21, ry: 25, pupil: 7, my: -76, ms: 1.15, by: -142, bw: 30, lid: POO, slide: 10, ...o });
const pooArms = c => ({ L: [-70, -62], R: [70, -62], len: 72, w: 11, color: c });
function tonhao(p, { hat = 'crown', badge = false, holds = {} } = {}, fp) {
  const medals = hat === 'helmet' ? `<circle cx="-30" cy="-40" r="10" fill="#f2c230"/><circle cx="0" cy="-36" r="10" fill="#c8c8c8"/><path d="M-36,-58 h14 v12 h-14 Z M-6,-54 h14 v12 h-14 Z" fill="#c8322f"/>` : '';
  const bdg = badge ? `<rect x="22" y="-60" width="36" height="44" rx="5" fill="#f4f1ea" stroke="#2f5f9a" stroke-width="3"/><rect x="22" y="-60" width="36" height="11" fill="#2f5f9a"/><path d="M28,-36 h24 M28,-28 h18" stroke="#2b1d14" stroke-width="3"/>` : '';
  return toon(p, { body: pooBody() + (hat === 'crown' ? CROWN : hat === 'helmet' ? HELMET : '') + medals + bdg, face: { ...pooFace(), stache: STACHE }, arms: pooArms('#6a3d1a'),
    holds: { briefcase: PROP.briefcase, contract: PROP.contract, badge: PROP.badge, ...holds }, shadow: 100, top: -230, rest: { brow: .0 } }, fp);
}
function crowdPoo(p, hue = 0) {
  const cs = [['#7a4a22', '#5a3415'], ['#6b4020', '#4a2a12'], ['#8a5a2e', '#64401c'], ['#5e3c1e', '#40280f']][hue % 4];
  return toon(p, { body: pooBody(cs[0], cs[1], '#a0703e'), face: pooFace({ lid: cs[0] }), arms: pooArms(cs[1]), shadow: 100, top: -190 });
}
function veteranPoo(p) {
  return toon(p, { body: pooBody('#8a6a45', '#6a4e30', '#a8885e') + `<path d="M-46,-150 q14,-16 28,0 M18,-150 q14,-16 28,0" stroke="#f4f1ea" stroke-width="10" fill="none" stroke-linecap="round"/>`,
    face: pooFace({ lid: '#8a6a45', lids: .55, bc: '#f4f1ea', bt: 10 }), arms: pooArms('#6a4e30'), holds: { cane: PROP.cane }, shadow: 100, top: -190, rest: { lean: -6 } });
}
function goldPoo(p) {
  return toon(p, { body: pooBody('#e0b32b', '#b58a17', '#f6d36b') + `<path d="M-60,-30 Q0,10 60,-30" stroke="#f2c230" stroke-width="10" fill="none"/><circle cx="0" cy="-12" r="16" fill="#f2c230" stroke="#b58a17" stroke-width="4"/>`,
    face: pooFace({ lid: '#e0b32b', glasses: `<path d="M-52,-126 h44 q4,30 -22,30 q-26,0 -22,-30 Z M8,-126 h44 q4,30 -22,30 q-26,0 -22,-30 Z M-8,-122 h16" fill="#111" stroke="#111" stroke-width="4"/>` }),
    arms: pooArms('#b58a17'), shadow: 100, top: -190 });
}
function pinguinho(p) {
  return toon(p, { body: `<path d="M0,-176 C22,-140 72,-96 72,-56 C72,-18 40,0 0,0 C-40,0 -72,-18 -72,-56 C-72,-96 -22,-140 0,-176 Z" fill="#f7d84a" stroke="#d9b21f" stroke-width="5"/>
      <ellipse cx="-38" cy="-72" rx="10" ry="24" fill="#fff6b8" opacity=".85"/><ellipse cx="-22" cy="-118" rx="5" ry="10" fill="#fff6b8" opacity=".85"/>`,
    face: { y: -72, dx: 24, rx: 23, ry: 28, pupil: 6, my: -32, ms: .85, by: -108, bw: 24, bt: 6, lid: '#f7d84a', slide: 8, brow: .7 },
    arms: { L: [-62, -46], R: [62, -46], len: 48, w: 8, color: '#e8c22e', hand: 10 }, legs: { x: 22, len: 20, w: 10, color: '#e8c22e', shoe: '#c9a21a' },
    shadow: 60, top: -176, rest: { shake: 1.2 } });
}
function claudio(p, { kid = false } = {}) {
  const dots = Array.from({ length: 5 }, (_, r) => Array.from({ length: 4 }, (_, i) => `<circle cx="${-48 + i * 32 + (r % 2) * 16}" cy="${-160 + r * 34}" r="4" fill="#e3ddcf"/>`).join('')).join('');
  return toon(p, { body: `<rect x="-70" y="-190" width="140" height="186" rx="18" fill="#f4f1ea" stroke="#d2cbb9" stroke-width="5"/>${dots}
      <ellipse cx="0" cy="-190" rx="70" ry="18" fill="#ebe5d6" stroke="#d2cbb9" stroke-width="4"/><ellipse cx="0" cy="-190" rx="26" ry="8" fill="#b88a5a"/>
      ${kid ? '' : `<path d="M70,-130 L98,-128 L94,-22 L70,-26 Z" fill="#f4f1ea" stroke="#d2cbb9" stroke-width="4"/><path d="M72,-70 h22" stroke="#d2cbb9" stroke-width="3" stroke-dasharray="4 4"/>
      <path d="M-48,-106 q18,10 36,0 M10,-106 q18,10 36,0" stroke="#b9af9c" stroke-width="5" fill="none" stroke-linecap="round"/>`}`,
    face: { y: -130, dx: 27, rx: 20, ry: 22, pupil: 6, my: -78, ms: 1.05, by: -160, bw: 30, lid: '#f4f1ea', slide: 10, lids: kid ? 0 : .45, mouth: kid ? 'smile' : 'flat', brow: kid ? .3 : 0 },
    arms: { L: [-68, -92], R: [68, -92], len: 64, w: 10, color: '#e6e0d2' }, legs: { x: 28, len: 18, w: 14, color: '#d8d2c2', shoe: '#9a9488' }, shadow: 80, top: -200 });
}
// General Descarga: the tank is his head; his bowl has a back (water, the swirl) and a front, so whoever sits in the
// bowl goes between them: toon(…, frontParent) puts the front in a group of its own, drawn after the sitter.
function general(p, fp) {
  const medal = (x, c) => `<path d="M${x - 8},-196 h16 v22 h-16 Z" fill="${c}"/><circle cx="${x}" cy="-164" r="12" fill="#f2c230" stroke="#b8860b" stroke-width="3"/>`;
  return toon(p, {
    body: `<rect x="-112" y="-448" width="224" height="22" rx="8" fill="#e6eaea" stroke="#b9c2c2" stroke-width="4"/><rect x="-104" y="-430" width="208" height="160" rx="14" fill="#f4f6f6" stroke="#b9c2c2" stroke-width="5"/>
      <path d="M-92,-448 L-82,-506 Q0,-538 82,-506 L92,-448 Z" fill="#4f6b2f"/><rect x="-116" y="-458" width="232" height="18" rx="7" fill="#33461d"/><path d="M0,-520 l9,18 h20 l-16,12 l6,20 l-19,-12 l-19,12 l6,-20 l-16,-12 h20 Z" fill="#f2c230"/>
      <rect x="98" y="-404" width="44" height="13" rx="6" fill="#b9c2c2"/><path d="M-60,-290 q60,14 120,0" stroke="#dfe5e5" stroke-width="6" fill="none"/>
      <rect x="-122" y="-300" width="244" height="34" rx="12" fill="#e6eaea" stroke="#b9c2c2" stroke-width="4"/>
      <ellipse cx="0" cy="-250" rx="138" ry="36" fill="#e9eded" stroke="#b9c2c2" stroke-width="5"/><ellipse cx="0" cy="-250" rx="110" ry="25" fill="#7fb6d6"/>`,
    live: `<g data-p="swirl" transform="translate(0,-250) scale(1,.23)"><path d="M0,0 m-100,0 a100,100 0 1 1 200,0 a80,80 0 1 1 -160,0 a60,60 0 1 1 120,0 a40,40 0 1 1 -80,0 a20,20 0 1 1 40,0" fill="none" stroke="#e9f6ff" stroke-width="12" stroke-linecap="round"/></g>`,
    front: `<path d="M-138,-250 Q-134,-128 -62,-96 L-62,-10 Q0,8 62,-10 L62,-96 Q134,-128 138,-250 Q0,-212 -138,-250 Z" fill="#f4f6f6" stroke="#b9c2c2" stroke-width="5"/>
      <path d="M-110,-200 q30,50 80,70" stroke="#ffffff" stroke-width="10" fill="none" stroke-linecap="round" opacity=".8"/>${medal(-40, '#c8322f')}${medal(0, '#2f5f9a')}${medal(40, '#2f8a4a')}`,
    face: { y: -362, dx: 42, rx: 27, ry: 23, pupil: 9, my: -312, ms: 1.55, by: -398, bw: 56, bt: 14, lid: '#f4f6f6', slide: 12, lids: .3, brow: -.6, mouth: 'frown' },
    arms: { L: [-132, -232], R: [132, -232], len: 96, w: 15, color: '#dfe5e5', hand: 16 }, holds: { fan: PROP.fan, plunger: PROP.plunger }, shadow: 150, top: -530,
    livePose: (P, o, f) => { vis(P.swirl, !!o.swirl); if (o.swirl) tf(P.swirl, `translate(0,-250) scale(1,.23) rotate(${(o.swirl * 57.3) % 360})`);
      for (const k of 'LR') { const b = P[`hold${k}_fan`]?.querySelector('[data-p="blades"]'); if (b && o.fanSpin) tf(b, `rotate(${(o.fanSpin * 57.3) % 360},0,-70)`); } },
  }, fp);
}
function rato(p) {
  return toon(p, { body: `<path d="M-66,-160 C-120,-170 -120,-240 -70,-236 C-60,-200 -50,-180 -30,-168 Z M66,-160 C120,-170 120,-240 70,-236 C60,-200 50,-180 30,-168 Z" fill="#8d8f96"/><path d="M-60,-168 C-104,-176 -100,-224 -72,-222 C-64,-196 -54,-180 -40,-172 Z M60,-168 C104,-176 100,-224 72,-222 C64,-196 54,-180 40,-172 Z" fill="#e7a4b0"/>
      <path d="M90,-30 q70,-10 60,-70 q-6,-30 -30,-24" stroke="#c9a0a8" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M-60,-120 C-70,-200 70,-200 60,-120 C80,-60 60,-6 0,-6 C-60,-6 -80,-60 -60,-120 Z" fill="#8d8f96"/>
      <path d="M-62,-96 C-70,-40 -60,-6 0,-6 C60,-6 70,-40 62,-96 L20,-80 L0,-50 L-20,-80 Z" fill="#2c2f3a"/><path d="M-20,-80 L0,-50 L20,-80 Z" fill="#f4f1ea"/><path d="M-6,-74 h12 l4,30 l-10,10 l-10,-10 Z" fill="#c8322f"/>
      <ellipse cx="0" cy="-116" rx="10" ry="7" fill="#e7a4b0"/><path d="M-8,-104 h16 v10 h-16 Z" fill="#f4f1ea" stroke="#2b2f36" stroke-width="2"/>`,
    face: { y: -146, dx: 21, rx: 16, ry: 19, pupil: 6, my: -100, ms: .9, by: -170, bw: 22, bt: 5, lid: '#8d8f96', slide: 8,
      stache: `<path d="M-14,-114 l-44,-8 M-14,-110 l-46,4 M14,-114 l44,-8 M14,-110 l46,4" stroke="#2b2f36" stroke-width="2.5"/>` },
    arms: { L: [-54, -84], R: [54, -84], len: 58, w: 11, color: '#2c2f3a', glove: '#c9c9ce' }, legs: { x: 20, len: 28, w: 13, color: '#2c2f3a' }, shadow: 70, top: -230 });
}
function caneca(p) {
  return toon(p, { body: `<path d="M75,-144 q58,0 58,52 q0,52 -58,52" stroke="#b54a30" stroke-width="24" fill="none"/><rect x="-76" y="-182" width="152" height="176" rx="18" fill="#d9573a"/>
      <ellipse cx="0" cy="-182" rx="76" ry="16" fill="#f0eee8"/><ellipse cx="0" cy="-182" rx="64" ry="11" fill="#5a3418"/>
      <text x="0" y="-28" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="30" fill="#f4f1ea">RH</text>`,
    face: { y: -124, dx: 26, rx: 15, ry: 17, pupil: 6, my: -78, ms: .95, by: -150, bw: 24, bt: 5, lid: '#d9573a', slide: 8, mouth: 'smile',
      glasses: `<g fill="none" stroke="#1d1a1a" stroke-width="5"><circle cx="-26" cy="-124" r="24"/><circle cx="26" cy="-124" r="24"/><path d="M-2,-128 q2,-6 4,0"/></g>` },
    arms: { L: [-74, -86], R: [74, -86], len: 54, w: 10, color: '#c04a30' }, shadow: 80, top: -200 });
}
function metano(p, { mini = false } = {}) {
  return toon(p, { body: `<path d="M-102,-42 C-142,-42 -152,-104 -112,-118 C-126,-172 -62,-202 -26,-172 C-6,-228 76,-218 80,-166 C132,-176 152,-112 112,-92 C152,-62 122,-10 80,-26 C60,0 -60,6 -102,-42 Z" fill="#8bd35a" stroke="#5e9e35" stroke-width="6"/>
      <path d="M-80,-120 q20,-20 46,-10 M30,-160 q24,-14 44,4" stroke="#b6ea8a" stroke-width="9" fill="none" stroke-linecap="round"/>${mini ? '' : `<path d="M-60,-196 l20,26 l18,-30 l16,30 l20,-26" fill="none" stroke="#5e9e35" stroke-width="6"/>`}`,
    face: { y: -116, dx: 32, rx: 23, ry: 19, pupil: 7, my: -70, ms: 1.4, by: -146, bw: 38, bt: 10, lid: '#8bd35a', slide: 10, lids: .3, brow: -.8, mouth: 'grin' },
    arms: { L: [-116, -82], R: [116, -82], len: 60, w: 15, color: '#7cc24c', glove: '#d8f3c0' }, shadow: 0, top: -210 });
}
function juiz(p) {
  const bristles = Array.from({ length: 22 }, (_, i) => { const a = i / 22 * Math.PI * 2; return `<path d="M${(Math.cos(a) * 60).toFixed(1)},${(-238 + Math.sin(a) * 58).toFixed(1)} L${(Math.cos(a) * 82).toFixed(1)},${(-238 + Math.sin(a) * 78).toFixed(1)}" stroke="#3f80a8" stroke-width="8" stroke-linecap="round"/>`; }).join('');
  const wig = [[-70, -270], [-82, -236], [-78, -200], [70, -270], [82, -236], [78, -200], [-50, -300], [-16, -314], [20, -314], [54, -300]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="24" fill="#f4f1ea" stroke="#cfc8b6" stroke-width="3"/>`).join('');
  return toon(p, { body: `<rect x="-10" y="-176" width="20" height="176" rx="9" fill="#e9e3d6" stroke="#c9c2b2" stroke-width="3"/>${bristles}<ellipse cx="0" cy="-238" rx="72" ry="68" fill="#5aa0c8"/>${wig}`,
    face: { y: -246, dx: 24, rx: 16, ry: 18, pupil: 6, my: -206, ms: 1, by: -272, bw: 26, lid: '#5aa0c8', slide: 8, lids: .35, brow: -.3, mouth: 'flat' },
    arms: { L: [-12, -150], R: [12, -150], len: 80, w: 9, color: '#e9e3d6' }, holds: { gavel: PROP.gavel }, shadow: 50, top: -330 });
}

// a little gold throne for the bowl, a giant human hand that comes down for the paper
const throne = p => prop(p, `<g filter="url(#paper)"><path d="M-70,0 v-150 q0,-30 30,-30 h80 q30,0 30,30 v150 Z" fill="#c8322f"/><path d="M-80,0 v-170 l20,-20 l20,20 l20,-30 l20,30 l20,-30 l20,30 l20,-20 l20,20 v170" fill="none" stroke="#f2c230" stroke-width="12"/></g>`);
const humanHand = p => prop(p, `<g filter="url(#paper)"><path d="M-70,-900 L-70,-40 Q-70,40 0,50 Q80,50 80,-30 L80,-900 Z" fill="#e8b48a"/><path d="M-70,-120 q-50,10 -60,-60 q-4,-26 20,-20 l40,40" fill="#e8b48a"/>
  <path d="M-40,0 v40 M-10,10 v40 M20,10 v40 M50,0 v36" stroke="#c98f62" stroke-width="5"/><rect x="-80" y="-900" width="170" height="300" fill="#3f6fa8"/></g>`);
