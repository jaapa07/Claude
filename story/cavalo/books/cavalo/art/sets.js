// Paper sets, drawn once and baked to bitmaps: uv run --with playwright --with pillow python SKILL/scripts/bake_sets.py
//   books/<book>/art/sets.js site/<book>
// The paper filters are too heavy to run on large layers every frame. Each set is a function returning a list of
// layers back to front: {name, k, box: [x, y, w, h] in world px, scale, svg, soft?}.
//   k      parallax: 1 moves with the puppets' plane, below 1 is farther (slides less when the camera pans).
//   scale  bitmap pixels per world px (1.2 is plenty for a 1600 x 900 frame; raise it for layers a close-up fills).
//   soft   false skips the blurred -soft copy (use it for small foreground pieces); the camera swaps the copy in for
//          shallow focus on close shots.
//   stage  true: the puppets stand in front of this layer (paperCam's default `after`).
// Without a stage mark the puppets stand on the first k = 1 layer ('floor' below) and in front of it; layers after it
// hide them (the table). Mark another layer when the puppets belong further forward, e.g. in front of a tree that is
// itself in front of the bank, with the water and the near bank still over them.
// Give a layer more room than the 1600 x 900 frame (here -100 … 1700) so a pan or shake never shows its edge.
// These sketches are a finished look on their own (free) and the composition reference an image model repaints:
// bake one, give the picture to paint.py as a reference, and put the result in with painted.py.
const DEFS = `<defs>
  <filter id="paper" x="-15%" y="-15%" width="130%" height="135%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3" result="warp"/>
    <feDisplacementMap in="SourceGraphic" in2="warp" scale="3.5" xChannelSelector="R" yChannelSelector="G" result="cut"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed="7" result="fib"/>
    <feColorMatrix in="fib" type="matrix" values="0 0 0 0 .25  0 0 0 0 .17  0 0 0 0 .08  .5 0 0 0 -.14" result="tint"/>
    <feComposite in="tint" in2="cut" operator="in" result="grain"/>
    <feMerge result="tex"><feMergeNode in="cut"/><feMergeNode in="grain"/></feMerge>
    <feDropShadow in="tex" dx="2.5" dy="3.5" stdDeviation="2.2" flood-color="#2a1608" flood-opacity=".38"/>
  </filter>
  <filter id="paperBig" x="-5%" y="-10%" width="110%" height="125%" color-interpolation-filters="sRGB">
    <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="5" result="warp"/>
    <feDisplacementMap in="SourceGraphic" in2="warp" scale="5" xChannelSelector="R" yChannelSelector="G" result="cut"/>
    <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="3" seed="11" result="fib"/>
    <feColorMatrix in="fib" type="matrix" values="0 0 0 0 .25  0 0 0 0 .17  0 0 0 0 .08  .5 0 0 0 -.15" result="tint"/>
    <feComposite in="tint" in2="cut" operator="in" result="grain"/>
    <feMerge result="tex"><feMergeNode in="cut"/><feMergeNode in="grain"/></feMerge>
    <feDropShadow in="tex" dx="4" dy="6" stdDeviation="5" flood-color="#2a1608" flood-opacity=".32"/>
  </filter>
</defs>`;
// Wrap shapes in the paper filter: 'paper' for pieces, 'paperBig' for large flat areas.
const P = (body, f = 'paper') => `<g filter="url(#${f})">${body}</g>`;
const win = (x, y, w, h, glass = '#9cc6de', frame = '#f4f1ea') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${glass}"/><path d="M${x},${y} h${w} v${h} h${-w} Z M${x + w / 2},${y} v${h}" fill="none" stroke="${frame}" stroke-width="6"/>`;


// The book's sets are drawn for the upright 900 x 1600 frame: the base view looks at world (450, 800), and every
// layer runs far past it so the camera can pan from the counter (x 0-800) to the toilet doors (x 1450-2080).
const FLOOR = 1300;
const tiles = (x, y, w, h, n = 60, c = '#bcd7c4') => Array.from({ length: Math.ceil(w / n) }, (_, i) => `<path d="M${x + i * n},${y} v${h}" stroke="${c}" stroke-width="3"/>`).join('')
  + Array.from({ length: Math.ceil(h / n) }, (_, i) => `<path d="M${x},${y + i * n} h${w}" stroke="${c}" stroke-width="3"/>`).join('');
const bottle = (x, y, c, h = 120, label = '#f3e9d2') => `<rect x="${x - 17}" y="${y - h + 40}" width="34" height="${h - 40}" rx="8" fill="${c}"/><rect x="${x - 7}" y="${y - h}" width="14" height="46" rx="4" fill="${c}"/>
  <rect x="${x - 8}" y="${y - h - 6}" width="16" height="12" rx="3" fill="#8a5a36"/><rect x="${x - 14}" y="${y - h + 62}" width="28" height="34" rx="3" fill="${label}"/>`;
const sign = (x, y, w, h, words, size, fill = '#f3e9d2', ink = '#2b1d14', r = -2) => `<g transform="rotate(${r} ${x + w / 2} ${y + h / 2})">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fill}"/>${words.map((t, i) => `<text x="${x + w / 2}" y="${y + h / 2 + size * .36 + (i - (words.length - 1) / 2) * size * 1.1}" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${size}" fill="${ink}">${t}</text>`).join('')}</g>`;

function bar() {
  // back wall: cream plaster over a band of green bathroom-style tiles, a beam and a bare bulb above
  const wall = P(`<rect x="-300" y="-400" width="2700" height="1750" fill="#ead9a2"/>
      <rect x="-300" y="-400" width="2700" height="130" fill="#6b4126"/>`, 'paperBig')
    + P(`<rect x="-300" y="900" width="2700" height="450" fill="#d9eadc"/>${tiles(-300, 900, 2700, 450)}<rect x="-300" y="885" width="2700" height="22" fill="#2f7a55"/>`, 'paperBig')
    // the shelf of bottles behind the counter
    + P(`<rect x="-40" y="560" width="760" height="20" fill="#8a5a36"/><rect x="-40" y="770" width="760" height="20" fill="#8a5a36"/>
      ${[[20, '#7a4a1e'], [80, '#c9a227'], [140, '#3f7a3a'], [200, '#b8432f'], [260, '#e6dcc0'], [330, '#7a4a1e'], [400, '#3f6fa8'], [470, '#c9a227'], [540, '#6a2f4f'], [610, '#3f7a3a'], [670, '#7a4a1e']].map(([x, c], i) => bottle(x, 560, c, 110 + (i % 3) * 14)).join('')}
      ${[[30, '#c9a227'], [100, '#7a4a1e'], [170, '#b8432f'], [250, '#3f7a3a'], [330, '#e6dcc0'], [410, '#7a4a1e'], [490, '#3f6fa8'], [570, '#c9a227'], [650, '#7a4a1e']].map(([x, c], i) => bottle(x, 770, c, 104 + (i % 2) * 18)).join('')}`)
    // the TV on its bracket, football on
    + P(`<rect x="70" y="160" width="300" height="200" rx="10" fill="#2a2a2a"/><rect x="88" y="176" width="264" height="168" fill="#4f9a4a"/>
      <path d="M220,176 v168 M88,260 h264" stroke="#e8f2e0" stroke-width="3"/><circle cx="220" cy="260" r="28" fill="none" stroke="#e8f2e0" stroke-width="3"/>
      <rect x="205" y="360" width="30" height="50" fill="#555"/>`)
    + P(sign(420, 230, 330, 130, ['FIADO SÓ', 'AMANHÃ'], 44, '#f3e9d2', '#a3271f', 3))
    // the menu board: today's pastel, so the frying oil is set up before it is needed
    + P(`<rect x="880" y="260" width="420" height="380" rx="10" fill="#7b4a2a"/><rect x="900" y="280" width="380" height="340" fill="#2f3a34"/>
      ${[['HOJE', 330, 46, '#f6d36b'], ['PASTEL  R$ 8', 410, 40, '#f4f1ea'], ['TORRESMO  R$ 12', 470, 34, '#f4f1ea'], ['CACHAÇA  R$ 5', 530, 34, '#f4f1ea'], ['OVO COLORIDO  R$ 3', 585, 28, '#f4f1ea']].map(([t, y, sz, c]) => `<text x="1090" y="${y}" text-anchor="middle" font-family="Comic Sans MS, Chalkboard, cursive" font-size="${sz}" fill="${c}">${t}</text>`).join('')}`)
    + P(sign(1470, 380, 270, 110, ['PROIBIDO', 'ANIMAIS'], 36, '#f4f1ea', '#a3271f', -3))
    // the ladies' door, closed, OCCUPIED hanging from its handle
    + P(`<rect x="1440" y="640" width="270" height="${FLOOR - 640}" fill="#6b4126"/><rect x="1460" y="660" width="230" height="${FLOOR - 660}" fill="#3f6fa8"/>
      <rect x="1480" y="690" width="190" height="230" fill="#4c7db5"/><rect x="1480" y="960" width="190" height="300" fill="#4c7db5"/><circle cx="1665" cy="990" r="12" fill="#e2c26a"/>`)
    + P(sign(1505, 560, 140, 64, ['ELAS'], 40, '#f4f1ea', '#b03a6a', 0))
    + P(sign(1590, 1010, 130, 50, ['OCUPADO'], 24, '#f6d36b', '#a3271f', 8))
    // the gents': the door stands open on a dark tiled toilet
    + P(`<rect x="1800" y="660" width="250" height="${FLOOR - 660}" fill="#2c3a40"/>${tiles(1800, 660, 250, FLOOR - 660, 50, '#3a4c54')}
      <rect x="1955" y="1080" width="80" height="150" rx="10" fill="#c9cfcf"/><ellipse cx="1990" cy="1235" rx="60" ry="22" fill="#e4e8e8"/><rect x="1940" y="1240" width="70" height="60" fill="#d8dddd"/>`)
    + P(sign(1860, 560, 140, 64, ['ELES'], 40, '#f4f1ea', '#2f5f9a', 0))
    // a bulb on its flex
    + P(`<path d="M600,-270 v260" stroke="#2b1d14" stroke-width="4"/><circle cx="600" cy="15" r="30" fill="#ffe7a0"/><rect x="588" y="-20" width="24" height="18" fill="#8a7a5a"/>
      <path d="M1600,-270 v200" stroke="#2b1d14" stroke-width="4"/><circle cx="1600" cy="-45" r="30" fill="#ffe7a0"/><rect x="1588" y="-80" width="24" height="18" fill="#8a7a5a"/>`);
  // the red cement floor that every boteco has
  const floor = P(`<rect x="-300" y="${FLOOR - 30}" width="2700" height="660" fill="#a8432f"/>
      ${Array.from({ length: 12 }, (_, i) => `<path d="M-300,${FLOOR + 10 + i * 52} h2700" stroke="#93392a" stroke-width="3"/>`).join('')}
      ${Array.from({ length: 28 }, (_, i) => `<path d="M${-300 + i * 100},${FLOOR - 30} l${(i - 7) * 40},660" stroke="#93392a" stroke-width="2"/>`).join('')}`, 'paperBig');
  // the counter (Zé stands behind it) with its stools in front
  const counter = P(`<rect x="-300" y="1035" width="1110" height="40" rx="8" fill="#7b4a2a"/>
      <rect x="-280" y="1075" width="1070" height="${FLOOR - 1060}" fill="#c9443a"/>
      ${tiles(-280, 1075, 1070, FLOOR - 1060, 72, '#a8362e')}<rect x="-280" y="1075" width="1070" height="16" fill="#8d2e26"/>`)
    + P(sign(160, 1130, 420, 96, ['BAR DO ZÉ'], 58, '#f6d36b', '#5a2a1e', 0))
    + P([90, 690].map(x => `<rect x="${x - 50}" y="1150" width="100" height="26" rx="12" fill="#c9a227"/><rect x="${x - 8}" y="1176" width="16" height="${FLOOR + 20 - 1176}" fill="#555"/><ellipse cx="${x}" cy="${FLOOR + 22}" rx="44" ry="10" fill="#444"/>`).join(''));
  // the gents' door frame, in front of whoever stands in it, and the wall to its right
  const jamb = P(`<rect x="1772" y="630" width="30" height="${FLOOR - 630 + 10}" fill="#6b4126"/><rect x="1772" y="630" width="310" height="32" fill="#6b4126"/>
      <rect x="2050" y="300" width="350" height="${FLOOR - 300}" fill="#ead9a2"/><rect x="2050" y="900" width="350" height="${FLOOR - 900}" fill="#d9eadc"/>${tiles(2050, 900, 350, FLOOR - 900)}
      <rect x="2050" y="885" width="350" height="22" fill="#2f7a55"/><rect x="2050" y="630" width="32" height="${FLOOR - 630 + 10}" fill="#6b4126"/>`);
  return [
    { name: 'wall', k: .94, box: [-300, -400, 2700, 1750], scale: 1, svg: wall },
    { name: 'floor', k: 1, box: [-300, FLOOR - 40, 2700, 680], scale: 1, svg: floor },
    { name: 'counter', k: 1, box: [-300, 1020, 1120, FLOOR - 1020 + 50], scale: 1.4, stage: true, svg: counter },
    { name: 'jamb', k: 1, box: [1760, 280, 660, FLOOR - 280 + 30], scale: 1.4, soft: false, svg: jamb },
  ];
}

const SETS = { bar };
if (typeof window !== 'undefined') window.SETS = SETS, window.SET_DEFS = DEFS;
