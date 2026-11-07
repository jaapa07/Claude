/* cavalo.js — this book's cast and props, on paper.js and cast.js: three grown-ups in the round-headed style (Zé, Valdir,
   Dona Neide) and Trovão, a horse in profile built for this film (it stands, braces, neighs, slides on its belly and
   sits on a bar stool like a person). Everything a scene asks a puppet where something is comes from the same numbers
   the drawing uses. */
'use strict';

// A grown-up is the kit's kid moved up 50 units on legs 96 long, with arms that reach a counter.
const UP = 50, up = d => d.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => `${x},${+y - UP}`);
const ADULT = { sx: 54, sy: -196, hipX: 18, legW: 26, shoe: 22, legH: 96, armH: 96, neck: -208,
  head: [0, -296, 92, 86], eyes: [24, -304, 20, 25], mouth: [0, -246], slide: 28 };
Object.assign(SHAPES, {
  ze: { ...ADULT, body: 'M-48,-216 C-92,-196 -100,-118 -78,-94 Q-38,-78 0,-78 Q38,-78 78,-94 C100,-118 92,-196 48,-216 Z',
    hair: ['#3a2a20', 'M-90,-318 C-100,-290 -96,-262 -86,-246 L-74,-268 Q-82,-292 -76,-318 Z M90,-318 C100,-290 96,-262 86,-246 L74,-268 Q82,-292 76,-318 Z'],
    browUp: 8, chin: 'M-40,-214 Q0,-200 40,-214',
    stache: '<path d="M-38,-256 Q-20,-276 0,-262 Q20,-276 38,-256 Q30,-244 14,-250 Q0,-246 -14,-250 Q-30,-244 -38,-256 Z" fill="#3a2a20"/>',
    extra: '<path d="M-50,-178 h100 v84 q-50,12 -100,0 Z" fill="#3f6fa8"/><path d="M-50,-178 l-10,-36 M50,-178 l10,-36" stroke="#3f6fa8" stroke-width="7"/><rect x="-22" y="-160" width="44" height="30" rx="4" fill="#2f5f9a"/>' },
  valdir: { ...ADULT, body: up('M-46,-166 C-66,-150 -70,-78 -64,-50 Q-30,-36 0,-36 Q30,-36 64,-50 C70,-78 66,-150 46,-166 Z'),
    hair: ['#1f1a17', 'M-92,-306 C-104,-372 -50,-394 0,-390 C62,-396 106,-360 92,-304 L82,-332 L66,-316 L52,-342 L30,-322 L10,-346 L-12,-322 L-34,-344 L-52,-320 L-72,-336 Z'],
    stache: '<path d="M-62,-262 Q-58,-210 0,-206 Q58,-210 62,-262 Q50,-226 0,-224 Q-50,-226 -62,-262 Z" fill="#4a3a32" opacity=".42"/>',
    extra: '<path d="M0,-188 V-90" stroke="#2f8a4a" stroke-width="4"/><circle cx="0" cy="-160" r="4" fill="#2f8a4a"/><circle cx="0" cy="-125" r="4" fill="#2f8a4a"/>' },
  neide: { ...ADULT, legH: 86, sy: -186, neck: -198, head: [0, -286, 88, 84], eyes: [24, -294, 19, 23], mouth: [0, -238], slide: 26,
    body: 'M-42,-206 C-60,-190 -76,-110 -84,-86 Q-40,-70 0,-70 Q40,-70 84,-86 C76,-110 60,-190 42,-206 Z',
    hair: ['#bdb8b0', 'M-88,-292 C-96,-352 -50,-380 0,-378 C50,-380 96,-352 88,-292 L74,-314 Q0,-338 -74,-314 Z'],
    hat: '<circle cx="0" cy="-390" r="34" fill="#bdb8b0"/><path d="M-20,-396 q20,-14 40,0" stroke="#a39e96" stroke-width="3" fill="none"/>',
    glasses: 30, cheeks: [52, -262],
    extra: '<circle cx="0" cy="-150" r="5" fill="#f4f1ea"/><circle cx="0" cy="-120" r="5" fill="#f4f1ea"/><path d="M-80,-92 q80,22 160,0" stroke="#6f3a7e" stroke-width="6" fill="none"/>' },
});

/* ---------- props held in a mitten (their (0, 0) is the mitten's centre) ---------- */
const PROPS = {
  glass: '<g filter="url(#paper)"><path d="M-16,-46 h32 l-4,52 h-24 Z" fill="#dfeff2" opacity=".9"/><rect x="-14" y="-30" width="28" height="30" fill="#f2c94c" opacity=".85"/><rect x="-14" y="-36" width="28" height="8" fill="#fbf6e8"/></g>',
  cloth: '<g filter="url(#paper)"><path d="M-22,-8 q22,-10 44,0 l-6,40 q-16,8 -32,0 Z" fill="#f4f1ea"/><path d="M-18,6 h36 M-16,20 h32" stroke="#c8322f" stroke-width="4"/></g>',
  rope: '<g filter="url(#paper)"><circle r="14" fill="none" stroke="#c8a26a" stroke-width="8"/></g>',
  pan: '<g filter="url(#paper)" transform="scale(.62)"><rect x="-6" y="-14" width="90" height="16" rx="6" fill="#3a2a20"/><path d="M80,-30 h150 q-6,56 -75,58 q-69,-2 -75,-58 Z" fill="#6c6c6c"/><ellipse cx="155" cy="-30" rx="75" ry="10" fill="#e9c46a"/></g>',
  badge: '<g filter="url(#paper)"><rect x="-58" y="-150" width="116" height="150" rx="10" fill="#f4f1ea"/><rect x="-58" y="-150" width="116" height="34" rx="10" fill="#2f7a55"/>' +
    '<text x="0" y="-127" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="15" fill="#fff">VIGILÂNCIA</text><rect x="-30" y="-106" width="60" height="58" fill="#cfd8dc"/>' +
    '<circle cx="0" cy="-86" r="14" fill="#bdb8b0"/><path d="M-22,-48 q22,-26 44,0 Z" fill="#8e4c9e"/><text x="0" y="-28" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="14" fill="#2b1d14">FISCAL</text>' +
    '<text x="0" y="-11" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#2b1d14">NEIDE</text></g>',
  clip: '<g filter="url(#paper)"><rect x="-56" y="-150" width="112" height="150" rx="6" fill="#8a5a36"/><rect x="-48" y="-138" width="96" height="130" fill="#f4f1ea"/>' +
    '<rect x="-20" y="-158" width="40" height="18" rx="4" fill="#9aa3a6"/><path d="M-38,-110 h70 M-38,-86 h70 M-38,-62 h70 M-38,-38 h50" stroke="#9aa3a6" stroke-width="4"/>' +
    '<path d="M-40,-114 l6,8 l10,-14 M-40,-90 l6,8 l10,-14 M-40,-66 l6,8 l10,-14" stroke="#c8322f" stroke-width="4" fill="none"/></g>',
  bag: '<g filter="url(#paper)"><path d="M-20,-6 q20,-34 40,0" stroke="#5a2a1e" stroke-width="6" fill="none"/><rect x="-34" y="-6" width="68" height="56" rx="10" fill="#b0503a"/><rect x="-6" y="6" width="12" height="10" fill="#e2c26a"/></g>',
};

/* ---------- Trovão, a horse in profile ----------
   Built facing screen right with the hooves on y 0; flip: -1 faces left. pose(o, f): x, y, s, flip, r (the whole body
   about the hip, + clockwise: -70 sits it upright on its rump), bob (+ lowers it), neck, head (degrees, + lowers the
   muzzle), jaw (0 shut … 1 wide), shut, lids (0 … 1, .5 is smug), eyeX (-1 … 1), fn ff hn hf (near / far, front / hind
   leg, degrees, + swings the hoof towards the head), tail, hold ('bottle' in the teeth), hoof ('phone' on the near
   front hoof). at(o, 'muzzle' | 'eye' | 'hoof' | 'rump') is that point in the parent's coordinates. */
const HORSE = { coat: '#a2622f', far: '#86501f', mane: '#3a2416', hoof: '#2a1a12', blaze: '#f4efe6', muzzle: '#c98f62' };
const H_HIP = [-118, -205], H_SH = [104, -198], H_NECK = [100, -262], H_HEAD = [160, -407];
const REST_H = { x: 0, y: 0, s: 1, flip: 1, r: 0, bob: 0, neck: 0, head: 0, jaw: 0, shut: false, lids: 0, eyeX: 0, fn: 0, ff: 0, hn: 0, hf: 0, tail: 0, hold: null, hoof: null };
function horsePuppet(parent) {
  const c = HORSE, g = mk('g', {}, parent);
  const hind = (k, fill) => `<g data-p="${k}" transform="translate(${H_HIP[0]},${H_HIP[1]})"><g filter="url(#paper)"><path d="M-30,-16 Q-36,60 -16,118 L-13,182 L15,182 L16,118 Q30,40 30,-16 Z" fill="${fill}"/>
      <rect x="-19" y="176" width="38" height="24" rx="5" fill="${c.hoof}"/></g></g>`;
  const fore = (k, fill, phone) => `<g data-p="${k}" transform="translate(${H_SH[0]},${H_SH[1]})"><g filter="url(#paper)"><path d="M-22,-14 Q-24,70 -13,128 L-13,178 L13,178 L13,128 Q24,60 22,-14 Z" fill="${fill}"/>
      <rect x="-18" y="172" width="36" height="24" rx="5" fill="${c.hoof}"/></g>${phone ? `<g data-p="phone" transform="translate(0,150) rotate(70)"><g filter="url(#paper)"><rect x="-26" y="-46" width="52" height="92" rx="8" fill="#222"/>
      <rect x="-21" y="-38" width="42" height="72" fill="#32bcad"/><text x="0" y="-8" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="16" fill="#fff">PIX</text>
      <path d="M-10,8 l7,8 l14,-16" stroke="#fff" stroke-width="5" fill="none"/></g></g>` : ''}</g>`;
  g.innerHTML = `<ellipse data-p="shadow" cx="0" cy="-2" rx="190" ry="18" fill="url(#spShadow)"/><g data-p="all">
    ${fore('ff', c.far)}${hind('hf', c.far)}
    <g data-p="tail" transform="translate(-160,-262)"><g filter="url(#paper)"><path d="M6,-6 C-34,10 -50,80 -36,170 C-20,160 -12,120 -6,90 C0,120 4,150 12,160 C16,90 18,30 14,-4 Z" fill="${c.mane}"/></g></g>
    <g filter="url(#paper)"><path d="M-170,-226 C-178,-292 -70,-302 30,-292 C120,-300 166,-268 156,-214 C152,-160 104,-150 40,-150 C-40,-146 -150,-150 -168,-196 Z" fill="${c.coat}"/>
      <path d="M-120,-170 q60,16 150,4" stroke="#8f5426" stroke-width="5" fill="none"/></g>
    <g data-p="neck" transform="translate(${H_NECK[0]},${H_NECK[1]})"><g filter="url(#paper)">
      <path d="M-44,-20 C-20,-90 10,-130 40,-158 C70,-150 96,-130 108,-108 C80,-60 66,0 60,64 C20,50 -20,20 -44,-20 Z" fill="${c.coat}"/>
      <path d="M-50,-14 C-30,-84 0,-128 36,-164 L46,-150 L24,-132 L34,-118 L10,-104 L18,-88 L-6,-74 L2,-56 L-22,-44 L-14,-26 L-36,-12 Z" fill="${c.mane}"/></g>
      <g data-p="head" transform="translate(${H_HEAD[0] - H_NECK[0]},${H_HEAD[1] - H_NECK[1]})">
        <g filter="url(#paper)"><ellipse cx="128" cy="122" rx="22" ry="10" fill="#5a1414"/><path d="M108,116 h36 v7 h-36 Z" fill="#fbf6e8"/></g>
        <g data-p="bottle" transform="translate(150,118) rotate(-70)"><g filter="url(#paper)"><rect x="-20" y="-150" width="40" height="110" rx="9" fill="#8a5a1e"/><rect x="-9" y="-40" width="18" height="52" rx="5" fill="#8a5a1e"/>
          <rect x="-16" y="-128" width="32" height="54" rx="3" fill="#f3e9d2"/><text x="0" y="-108" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="13" fill="#a3271f">20</text>
          <text x="0" y="-92" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="10" fill="#a3271f">ANOS</text></g></g>
        <g filter="url(#paper)"><path d="M-8,-10 L2,-66 L26,-6 Z" fill="${c.coat}"/><path d="M-2,-14 L3,-50 L16,-12 Z" fill="#6d3a18"/>
          <path d="M-14,-16 C20,-24 60,-6 110,48 C140,78 156,100 150,116 C142,132 116,130 100,120 C80,110 60,90 40,74 C20,62 -6,54 -18,30 C-26,14 -24,-6 -14,-16 Z" fill="${c.coat}"/>
          <path d="M30,-6 C60,10 90,40 116,76 L104,84 C80,52 56,26 24,8 Z" fill="${c.blaze}"/>
          <path d="M104,84 C124,94 150,98 152,112 C146,130 118,130 100,118 C92,106 94,92 104,84 Z" fill="${c.muzzle}"/>
          <ellipse cx="138" cy="100" rx="7" ry="4" fill="#4a2410"/>
          <path d="M-16,-14 C0,-30 20,-24 26,-8 C14,-14 4,-6 -2,6 C-6,-4 -12,-6 -16,-14 Z" fill="${c.mane}"/></g>
        <g data-p="jaw" transform="translate(100,118)"><g filter="url(#paper)"><path d="M0,0 C16,8 36,8 50,2 C46,16 22,22 0,12 Z" fill="${c.muzzle}"/></g></g>
        <g data-p="eyeO"><ellipse cx="44" cy="16" rx="15" ry="18" fill="#fff" stroke="#1d1a1a" stroke-width="2"/><g data-p="pupil"><circle cx="48" cy="18" r="6" fill="#1d1a1a"/></g>
          <path data-p="lid" d="M28,16 A16,18 0 0 1 60,16 Z" fill="${c.coat}" stroke="#1d1a1a" stroke-width="2"/></g>
        <path data-p="eyeC" d="M30,18 q14,10 28,0" stroke="#1d1a1a" stroke-width="3" fill="none"/>
      </g></g>
    ${hind('hn', c.coat)}${fore('fn', c.coat, true)}</g>`;
  bakeAll(g);
  const P = pieces(g);
  // the same transforms the drawing uses, as 2-D matrices, so at() agrees with the picture on every frame
  const M = (a, b, c2, d, e, f) => [a, b, c2, d, e, f], mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
  const T = (x, y) => M(1, 0, 0, 1, x, y), Rz = (deg, cx = 0, cy = 0) => { const a = deg * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a); return mul(mul(T(cx, cy), M(cs, sn, -sn, cs, 0, 0)), T(-cx, -cy)); };
  const app = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
  const mats = o => {
    const root = mul(T(o.x, o.y), M(o.s * o.flip, 0, 0, o.s, 0, 0));
    const all = mul(root, mul(T(0, o.bob), Rz(o.r, ...H_HIP)));
    const neck = mul(all, mul(T(...H_NECK), Rz(-o.neck * 1)));
    const head = mul(neck, mul(T(H_HEAD[0] - H_NECK[0], H_HEAD[1] - H_NECK[1]), Rz(o.head)));
    const fn = mul(all, mul(T(...H_SH), Rz(-o.fn)));
    return { root, all, neck, head, fn };
  };
  const LOCAL = { muzzle: ['head', [150, 116]], eye: ['head', [44, 16]], ear: ['head', [6, -60]], hoof: ['fn', [0, 186]], rump: ['all', [-160, -230]], seat: ['all', [-110, -150]], hip: ['all', [-118, -205]], belly: ['all', [0, -150]] };
  const at = (o, name) => { o = { ...REST_H, ...o }; const [k, pt] = LOCAL[name]; return app(mats(o)[k], pt); };
  const mstr = m => `matrix(${m.map(v => +v.toFixed(4)).join(' ')})`;
  return { g, at, pose(o, f) {
    o = { ...REST_H, ...o };
    const j = k => .35 * jit(f >> 1, 40 + k);
    o.x += j(1) * .8; o.y += j(2) * .6;
    tf(g, `translate(${o.x.toFixed(1)},${o.y.toFixed(1)}) scale(${(o.s * o.flip).toFixed(3)},${o.s.toFixed(3)})`);
    vis(P.shadow, o.r > -20);
    tf(P.all, `translate(0,${o.bob.toFixed(1)}) rotate(${(o.r + j(3) * .3).toFixed(2)},${H_HIP[0]},${H_HIP[1]})`);
    tf(P.neck, `translate(${H_NECK[0]},${H_NECK[1]}) rotate(${(-o.neck + j(4) * .5).toFixed(2)})`);
    tf(P.head, `translate(${H_HEAD[0] - H_NECK[0]},${H_HEAD[1] - H_NECK[1]}) rotate(${(o.head + j(5) * .5).toFixed(2)})`);
    tf(P.jaw, `translate(100,118) rotate(${(30 * o.jaw).toFixed(1)})`);
    for (const [k, base] of [['fn', H_SH], ['ff', H_SH], ['hn', H_HIP], ['hf', H_HIP]]) tf(P[k], `translate(${base[0]},${base[1]}) rotate(${(-o[k] + j(6) * .5).toFixed(2)})`);
    tf(P.tail, `translate(-160,-262) rotate(${(o.tail + 3 * Math.sin(f / 5)).toFixed(1)})`);
    vis(P.eyeO, !o.shut); vis(P.eyeC, !!o.shut);
    tf(P.pupil, `translate(${(o.eyeX * 6).toFixed(1)},0)`);
    vis(P.lid, o.lids > 0); tf(P.lid, `translate(0,${(-18 + 18 * o.lids).toFixed(1)})`);
    vis(P.bottle, o.hold === 'bottle'); vis(P.phone, o.hoof === 'phone');
  } };
}

/* ---------- people of this film ---------- */
const zePuppet = (p, o = {}) => spKid(p, 'ze', { skin: '#e3a97c', coat: '#f4f1ea', stripe: '#d9d2c2', pants: '#3a3a4a', holds: { glass: PROPS.glass, cloth: PROPS.cloth }, ...o });
const valdirPuppet = (p, o = {}) => spKid(p, 'valdir', { skin: '#d9a273', coat: '#f2c230', stripe: '#2f8a4a', pants: '#3f6fa8', holds: { rope: PROPS.rope, pan: PROPS.pan }, ...o });
const neidePuppet = (p, o = {}) => spKid(p, 'neide', { skin: '#f2cfae', coat: '#8e4c9e', stripe: '#f4f1ea', pants: '#e0b49a', holds: { bag: PROPS.bag, badge: PROPS.badge, clip: PROPS.clip }, ...o });

// The film's last card on the upright frame: paperCam has no 1600-wide frame here, so the kit's card is placed by hand.
const endCardUp = (p, t0, words, size = 64) => endCard(p, t0, words, { x: SW / 2, y: SH * .3, size });
