/* series.js — what parts 2 and 3 add to the bar: the new sign over the counter, the FIADO card the horse slides, the
   fridge box, the ladies' door that opens, the zebra and the foal, and the part tag. Loaded after ch01/bar.js. */
'use strict';
const ZEBRA = { coat: '#f4efe6', far: '#d9d3c6', mane: '#1d1a1a', blaze: '#f4efe6', muzzle: '#4a4a48', stripes: true };
const FOAL = { coat: '#c9874e', far: '#a96c38', mane: '#3a2416', blaze: '#f4efe6', muzzle: '#d8a27a', stripes: 'half' };
// "BAR DO TROVÃO", pinned over the counter's own sign (cam.stage, so in front of the counter)
function trovaoSign(parent) {
  return prop(parent, `<g filter="url(#paper)" transform="rotate(-2 370 1178)"><rect x="140" y="1120" width="460" height="112" rx="8" fill="#f4f1ea"/>
    <text x="370" y="1196" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="54" fill="#2f5f9a">BAR DO TROVÃO</text></g>${tack(160, 1132)}${tack(580, 1132)}`);
}
// the FIADO SÓ AMANHÃ card standing on the counter; the scene moves it with tf()
function fiadoCard(parent) {
  return prop(parent, `<g filter="url(#paper)"><path d="M-80,0 L-70,-120 L70,-120 L80,0 Z" fill="#f3e9d2"/><text x="0" y="-74" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="26" fill="#a3271f">FIADO SÓ</text>
    <text x="0" y="-38" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="26" fill="#a3271f">AMANHÃ</text></g>`);
}
// a fridge box big enough for a horse: (0, 0) at the bottom centre; a tail sticks out of a hole in its back
function fridgeBox(parent) {
  const g = mk('g', {}, parent), tail = mk('g', {}, g);
  tail.innerHTML = `<g filter="url(#paper)"><path d="M0,0 C30,10 50,60 40,140 C26,130 20,100 14,80 C10,110 4,130 -4,140 C-10,80 -10,30 0,0 Z" fill="${HORSE.mane}"/></g>`;
  const box = mk('g', {}, g);
  box.innerHTML = `<g filter="url(#paper)"><rect x="-290" y="-450" width="580" height="440" rx="6" fill="#c9995e"/><path d="M-290,-450 l40,-40 h580 l-40,40 Z" fill="#b5864f"/>
    <path d="M-290,-300 h580 M-290,-160 h580" stroke="#a87a45" stroke-width="5"/><rect x="-200" y="-410" width="400" height="90" fill="#f4f1ea"/>
    <text x="0" y="-354" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="48" fill="#2b1d14">GELADEIRA</text>
    <text x="0" y="-250" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="40" fill="#2f5f9a">FROST FREE</text>
    <text x="0" y="-110" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="28" fill="#2b1d14">ESTE LADO PARA CIMA ↑</text>
    <text x="0" y="-60" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="24" fill="#a3271f">FRÁGIL</text>
    <circle cx="200" cy="-330" r="18" fill="#3a2a20"/><circle cx="240" cy="-330" r="18" fill="#3a2a20"/></g>`;
  bakeAll(g);
  return { g, pose(x, y, s, f, { tail: tw = 0, rock = 0 } = {}) {
    tf(g, `translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${s}) rotate(${(rock + .4 * jit(f >> 1, 77)).toFixed(2)})`);
    tf(tail, `translate(-290,-250) rotate(${(30 + tw).toFixed(1)})`);
  } };
}
// The ladies' door as a live piece over the baked one: the dark room behind it and the leaf on its hinge (x 1460).
// open 0 shut … 1 swung in (the leaf narrows towards the hinge as it turns away).
function ladiesDoor(parent) {
  const g = mk('g', {}, parent), leaf = mk('g', {}, g);
  g.insertAdjacentHTML('afterbegin', `<g filter="url(#paper)"><rect x="1460" y="660" width="230" height="${FLOORY - 660}" fill="#2c3a40"/>
    <rect x="1600" y="1080" width="70" height="150" rx="10" fill="#c9cfcf"/><ellipse cx="1630" cy="1235" rx="50" ry="20" fill="#e4e8e8"/></g>`);
  leaf.innerHTML = `<g filter="url(#paper)"><rect x="0" y="660" width="230" height="${FLOORY - 660}" fill="#3f6fa8"/><rect x="20" y="690" width="190" height="230" fill="#4c7db5"/>
    <rect x="20" y="960" width="190" height="300" fill="#4c7db5"/><circle cx="205" cy="990" r="12" fill="#e2c26a"/>
    <g transform="rotate(8 195 1035)"><rect x="130" y="1010" width="130" height="50" rx="6" fill="#f6d36b"/><text x="195" y="1044" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="24" fill="#a3271f">OCUPADO</text></g></g>`;
  bakeAll(g);
  return { g, pose(open, f, jiggle = 0) { tf(leaf, `translate(${1460 + jiggle * jit(f >> 1, 3) * 2},0) scale(${(1 - .85 * Math.min(1, Math.max(0, open))).toFixed(3)},1)`); } };
}
// The part's tag at the top of the frame for its first seconds (screen coordinates, outside the camera).
function partTag(p, words, until = 3.5) {
  const g = mk('g', {}, p);
  g.innerHTML = `<rect x="${SW / 2 - 150}" y="250" width="300" height="70" rx="35" fill="#a3271f"/><text x="${SW / 2}" y="297" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="36" fill="#fff">${words}</text>`;
  return q => g.setAttribute('opacity', q < until ? 1 : Math.max(0, 1 - (q - until) / .3));
}
// a horse's walk on twos: legs swing in diagonal pairs, the body bobs; x is the caller's
const trot = (q, k = 1) => { const a = 18 * Math.sin(q * 2 * Math.PI * 1.6) * k; return { fn: a, hf: a * .8, ff: -a, hn: -a * .8, bob: -3 * Math.abs(Math.sin(q * 2 * Math.PI * 1.6)) * k }; };
