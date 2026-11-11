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


// The season's sets, drawn for the upright 900 x 1600 frame: the base view looks at world (450, 800); every layer runs
// from x -300 to 1200 and y -300 to 1800, so the camera can pan and zoom without showing an edge. The floor line is
// y 1350 in every set (FLOOR), so the cast stands on the same mark everywhere.
const FLOOR = 1350, X0 = -300, WD = 1500, Y0 = -300;
const grid = (x, y, w, h, n, c, sw = 3) => Array.from({ length: Math.ceil(w / n) + 1 }, (_, i) => `<path d="M${x + i * n},${y} v${h}" stroke="${c}" stroke-width="${sw}"/>`).join('')
  + Array.from({ length: Math.ceil(h / n) + 1 }, (_, i) => `<path d="M${x},${y + i * n} h${w}" stroke="${c}" stroke-width="${sw}"/>`).join('');
const checker = (x, y, w, h, n, a, b) => { let o = `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${a}"/>`; for (let i = 0; i * n < w; i++) for (let j = 0; j * n < h; j++) if ((i + j) % 2) o += `<rect x="${x + i * n}" y="${y + j * n}" width="${n}" height="${n}" fill="${b}"/>`; return o; };
const label = (x, y, w, h, words, size, fill, ink, r = 0, font = 'Arial Black, Arial, sans-serif') => `<g transform="rotate(${r} ${x + w / 2} ${y + h / 2})"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}"/>${words.map((t, i) => `<text x="${x + w / 2}" y="${y + h / 2 + size * .36 + (i - (words.length - 1) / 2) * size * 1.12}" text-anchor="middle" font-family="${font}" font-weight="900" font-size="${size}" fill="${ink}">${t}</text>`).join('')}</g>`;
const floorLayer = (svg) => ({ name: 'floor', k: 1, box: [X0, FLOOR - 40, WD, 600], scale: 1, svg: P(svg, 'paperBig') });
const wallLayer = (svg) => ({ name: 'wall', k: .94, box: [X0, Y0, WD, FLOOR + 40 - Y0], scale: 1, svg });

// the bathroom: tiles, a window, the sink and mirror, the towel; the toilet is a character (General Descarga)
function banheiro() {
  const wall = P(`<rect x="${X0}" y="${Y0}" width="${WD}" height="${FLOOR + 40 - Y0}" fill="#bfe3dc"/>`, 'paperBig')
    + P(`<rect x="${X0}" y="600" width="${WD}" height="${FLOOR - 600 + 40}" fill="#eef6f7"/>${grid(X0, 600, WD, FLOOR - 560, 75, '#cfe0e3')}<rect x="${X0}" y="585" width="${WD}" height="24" fill="#3e8f9a"/>`, 'paperBig')
    + P(`<rect x="60" y="120" width="220" height="190" rx="10" fill="#8ccbea"/><path d="M60,120 h220 v190 h-220 Z M170,120 v190 M60,215 h220" fill="none" stroke="#f4f1ea" stroke-width="10"/>
      <path d="M40,100 h260 v40 q-40,30 -80,0 q-40,30 -80,0 q-50,30 -100,0 Z" fill="#e07a9a"/>`)
    + P(`<rect x="880" y="260" width="240" height="300" rx="20" fill="#cfe6f0" stroke="#9aa6a8" stroke-width="12"/><path d="M920,300 l60,60 M950,300 l80,80" stroke="#f4fbff" stroke-width="10" opacity=".8"/>
      <path d="M860,760 h280 l-30,90 h-220 Z" fill="#f4f6f6" stroke="#c8d0d0" stroke-width="5"/><rect x="965" y="850" width="70" height="500" fill="#e6eaea"/><rect x="985" y="700" width="30" height="60" fill="#9aa6a8"/><path d="M985,700 h-40 v18" stroke="#9aa6a8" stroke-width="14" fill="none"/>
      <rect x="900" y="660" width="40" height="80" rx="8" fill="#f2c94c"/><circle cx="1080" cy="740" r="18" fill="#7fb6d6"/>`)
    + P(`<rect x="-180" y="700" width="160" height="22" rx="8" fill="#9aa6a8"/><rect x="-150" y="722" width="20" height="300" fill="#d65a5a"/><path d="M-170,722 h120 v360 q-60,20 -120,0 Z" fill="#e07a9a"/>`)
    + P(label(330, 640, 240, 70, ['FAVOR DAR', 'DESCARGA'], 26, '#f4f1ea', '#2b1d14', -3));
  const floor = checker(X0, FLOOR - 30, WD, 600, 60, '#f4f1ea', '#2b2f36') + `<ellipse cx="450" cy="${FLOOR + 40}" rx="330" ry="40" fill="#6fb3c8" opacity=".55"/>`;
  return [wallLayer(wall), floorLayer(floor)];
}

// the sewer: a brick tunnel, a city of pipes, a green river, a ledge to stand on, a huge pipe that opens
function esgoto() {
  const bricks = Array.from({ length: 34 }, (_, j) => Array.from({ length: 14 }, (_, i) => `<rect x="${X0 + i * 110 + (j % 2) * 55}" y="${Y0 + j * 50}" width="104" height="44" rx="4" fill="${['#4a3a34', '#54423a', '#3f322d'][(i + j) % 3]}"/>`).join('')).join('');
  const wall = P(`<rect x="${X0}" y="${Y0}" width="${WD}" height="${FLOOR + 40 - Y0}" fill="#2a221f"/>${bricks}`, 'paperBig')
    + P(`<path d="M${X0},${Y0} h${WD} v420 Q450,-40 ${X0},120 Z" fill="#1a1514"/>`)
    + P([[-120, 520, 200, 520, '#5a6b5a'], [110, 420, 170, 620, '#4e6070'], [300, 580, 150, 460, '#6b5a4a'], [620, 470, 190, 570, '#58664f'], [840, 560, 160, 480, '#4e5a6b']].map(([x, y, w, h, c]) =>
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2.6}" fill="${c}"/>` + Array.from({ length: Math.floor(h / 90) }, (_, k) => `<rect x="${x + w / 2 - 22}" y="${y + 50 + k * 90}" width="44" height="44" rx="10" fill="${k % 2 ? '#f6d36b' : '#3a3a34'}"/>`).join('')).join(''))
    + P(label(180, 300, 520, 110, ['ESGOTO CENTRAL'], 58, '#3fae6a', '#f4f1ea', -2))
    + P(label(-220, 900, 230, 70, ['AV. DAS', 'DESCARGAS'], 24, '#2f5f9a', '#f4f1ea', 2) + label(760, 1000, 300, 120, ['PRECISA-SE', 'DE GERENTE'], 34, '#f3e9d2', '#a3271f', -4))
    + P(`<rect x="900" y="40" width="380" height="360" rx="40" fill="#6a7478"/><ellipse cx="1090" cy="400" rx="170" ry="70" fill="#151b1d"/><rect x="880" y="20" width="420" height="40" rx="12" fill="#808a8e"/>`)
    + P(`<path d="M${X0},${FLOOR - 70} h${WD} v110 h-${WD} Z" fill="#6b6660"/><path d="M${X0},${FLOOR - 70} h${WD}" stroke="#8a847c" stroke-width="10"/>`);
  const floor = `<rect x="${X0}" y="${FLOOR - 30}" width="${WD}" height="600" fill="#4f7a3a"/>` + Array.from({ length: 9 }, (_, i) => `<path d="M${X0},${FLOOR + 30 + i * 60} q120,-24 240,0 t240,0 t240,0 t240,0 t240,0 t240,0 t240,0" fill="none" stroke="#6b9a4a" stroke-width="6"/>`).join('')
    + `<ellipse cx="200" cy="${FLOOR + 160}" rx="40" ry="14" fill="#7b5a2a"/><ellipse cx="760" cy="${FLOOR + 260}" rx="50" ry="16" fill="#7b5a2a"/>`;
  return [wallLayer(wall), floorLayer(floor)];
}

// the HR office: a desk in front (the mug sits on it), a chair, a window, a poster
function escritorio() {
  const wall = P(`<rect x="${X0}" y="${Y0}" width="${WD}" height="${FLOOR + 40 - Y0}" fill="#e8dcc4"/><rect x="${X0}" y="1100" width="${WD}" height="290" fill="#cbb994"/>`, 'paperBig')
    + P(`<rect x="560" y="180" width="420" height="380" fill="#9cc6de"/><path d="M590,560 v-160 h70 v160 M690,560 v-240 h80 v240 M800,560 v-120 h60 v120 M880,560 v-200 h70 v200" fill="#6f8aa3"/><path d="M560,180 h420 v380 h-420 Z M770,180 v380" fill="none" stroke="#f4f1ea" stroke-width="14"/>`)
    + P(label(80, 240, 360, 300, ['SEJA', 'RESILIENTE'], 54, '#2f5f9a', '#f4f1ea', -2) + `<path d="M150,470 l40,-50 l40,30 l60,-80 l60,100" stroke="#f6d36b" stroke-width="10" fill="none"/>`)
    + P(label(620, 620, 300, 90, ['RECURSOS HUMANOS'], 26, '#2b1d14', '#f6d36b', 0))
    + P(`<path d="M-160,1350 l30,-200 h120 l30,200 Z" fill="#b5653a"/><circle cx="-70" cy="1080" r="90" fill="#3f8a4a"/><circle cx="-130" cy="1010" r="60" fill="#4f9a5a"/><circle cx="-10" cy="1000" r="64" fill="#357a40"/>`);
  const floor = `<rect x="${X0}" y="${FLOOR - 30}" width="${WD}" height="600" fill="#8f7a5a"/>` + Array.from({ length: 10 }, (_, i) => `<path d="M${X0},${FLOOR + i * 56} h${WD}" stroke="#7d6a4c" stroke-width="3"/>`).join('');
  const desk = P(`<rect x="420" y="1000" width="760" height="34" rx="8" fill="#7b4a2a"/><rect x="440" y="1034" width="720" height="330" fill="#9a6338"/><rect x="470" y="1070" width="300" height="110" rx="6" fill="#8a5630"/><circle cx="620" cy="1125" r="10" fill="#e2c26a"/>
      <rect x="980" y="900" width="150" height="100" rx="6" fill="#2b2f36"/><rect x="990" y="910" width="130" height="80" fill="#7fb6d6"/><rect x="1040" y="1000" width="30" height="10" fill="#2b2f36"/><rect x="860" y="980" width="90" height="20" fill="#f4f1ea"/><rect x="866" y="964" width="80" height="18" fill="#e9e3d6"/>`);
  return [wallLayer(wall), floorLayer(floor), { name: 'front', k: 1, box: [400, 880, 800, 520], scale: 1.3, stage: true, svg: desk }];
}

// the toilet-paper factory: a conveyor of rolls, machines, a big sign
function fabrica() {
  const wall = P(`<rect x="${X0}" y="${Y0}" width="${WD}" height="${FLOOR + 40 - Y0}" fill="#9aa4aa"/>${grid(X0, Y0, WD, FLOOR + 40 - Y0, 150, '#8a949a', 6)}`, 'paperBig')
    + P(label(-60, 120, 1020, 210, ['FÁBRICA DE PAPEL', 'MACIEZ TOTAL'], 72, '#f4f1ea', '#2f5f9a', 0))
    + P(`<rect x="-260" y="520" width="380" height="560" rx="20" fill="#d9573a"/><circle cx="-70" cy="700" r="90" fill="#f2c94c"/><circle cx="-70" cy="700" r="40" fill="#2b2f36"/><rect x="-220" y="860" width="300" height="60" fill="#2b2f36"/>
      <rect x="880" y="480" width="320" height="600" rx="20" fill="#3f7a5a"/><rect x="920" y="540" width="240" height="160" fill="#2b2f36"/><path d="M940,620 h200" stroke="#4fe08a" stroke-width="8"/><circle cx="1040" cy="820" r="60" fill="#f2c94c"/>`)
    + P(Array.from({ length: 5 }, (_, r) => Array.from({ length: 6 }, (_, i) => `<rect x="${180 + i * 110}" y="${520 + r * 70}" width="96" height="64" rx="12" fill="#f4f1ea" stroke="#d8d2c2" stroke-width="4"/><ellipse cx="${228 + i * 110}" cy="${552 + r * 70}" rx="14" ry="14" fill="#c9a27a"/>`).join('')).join(''))
    + P(`<rect x="${X0}" y="1140" width="${WD}" height="60" rx="20" fill="#2b2f36"/>${Array.from({ length: 16 }, (_, i) => `<circle cx="${X0 + 50 + i * 95}" cy="1170" r="22" fill="#5a646a"/>`).join('')}`);
  const floor = `<rect x="${X0}" y="${FLOOR - 30}" width="${WD}" height="600" fill="#6a7278"/>` + Array.from({ length: 12 }, (_, i) => `<path d="M${X0 + i * 140},${FLOOR - 30} l-60,600" stroke="#f2c94c" stroke-width="16" opacity=".5"/>`).join('');
  return [wallLayer(wall), floorLayer(floor)];
}

// the living room: sofa, TV, lamp, window at night, family pictures
function sala() {
  const wall = P(`<rect x="${X0}" y="${Y0}" width="${WD}" height="${FLOOR + 40 - Y0}" fill="#f0c98a"/>${Array.from({ length: 20 }, (_, i) => `<path d="M${X0 + i * 80},${Y0} v${FLOOR + 40 - Y0}" stroke="#e8bc76" stroke-width="18"/>`).join('')}`, 'paperBig')
    + P(`<rect x="680" y="160" width="360" height="400" fill="#1d2a52"/><circle cx="930" cy="260" r="40" fill="#f4f1ea"/><path d="M680,160 h360 v400 h-360 Z M860,160 v400" fill="none" stroke="#f4f1ea" stroke-width="14"/><path d="M660,140 h400 v40 h-400 Z" fill="#a3271f"/>`)
    + P(`<rect x="40" y="260" width="160" height="200" fill="#f4f1ea" stroke="#7b4a2a" stroke-width="14"/><circle cx="120" cy="340" r="40" fill="#e3a97c"/><rect x="250" y="300" width="140" height="120" fill="#f4f1ea" stroke="#7b4a2a" stroke-width="12"/>`)
    + P(label(300, 520, 300, 70, ['LAR DOCE LAR'], 30, '#f4f1ea', '#a3271f', 2))
    + P(`<rect x="-200" y="800" width="300" height="200" rx="10" fill="#2b2f36"/><rect x="-185" y="815" width="270" height="170" fill="#4fa0c8"/><rect x="-80" y="1000" width="60" height="80" fill="#2b2f36"/><rect x="-200" y="1080" width="300" height="270" fill="#7b4a2a"/>
      <rect x="1080" y="600" width="16" height="750" fill="#2b2f36"/><path d="M1020,600 h136 l-30,-120 h-76 Z" fill="#f6d36b"/>`);
  const floor = `<rect x="${X0}" y="${FLOOR - 30}" width="${WD}" height="600" fill="#a0683a"/>` + Array.from({ length: 10 }, (_, i) => `<path d="M${X0},${FLOOR + i * 56} h${WD}" stroke="#8a5630" stroke-width="4"/>`).join('') + `<ellipse cx="500" cy="${FLOOR + 90}" rx="420" ry="70" fill="#3f7a9a"/>`;
  const sofa = P(`<rect x="200" y="1060" width="620" height="200" rx="40" fill="#3f6fa8"/><rect x="160" y="1150" width="700" height="200" rx="40" fill="#4c7db5"/><rect x="150" y="1120" width="90" height="230" rx="40" fill="#3f6fa8"/><rect x="780" y="1120" width="90" height="230" rx="40" fill="#3f6fa8"/>
      <rect x="300" y="1100" width="120" height="90" rx="20" fill="#f2c94c"/>`);
  return [wallLayer(wall), floorLayer(floor), { name: 'sofa', k: 1, box: [140, 1040, 740, 330], scale: 1.2, svg: sofa }];
}

// the courtroom: wood panels, the judge's bench of white tiles in front, crossed plungers, scales of soap dishes
function tribunal() {
  const wall = P(`<rect x="${X0}" y="${Y0}" width="${WD}" height="${FLOOR + 40 - Y0}" fill="#7b4a2a"/>${Array.from({ length: 16 }, (_, i) => `<rect x="${X0 + 20 + i * 95}" y="${Y0 + 40}" width="80" height="${FLOOR - Y0 - 60}" rx="8" fill="#8a5630"/>`).join('')}`, 'paperBig')
    + P(`<circle cx="450" cy="300" r="150" fill="#f2c94c"/><circle cx="450" cy="300" r="120" fill="#e0b32b"/>
      <path d="M380,220 l140,160 M520,220 l-140,160" stroke="#7b4a2a" stroke-width="16" stroke-linecap="round"/><ellipse cx="370" cy="210" rx="34" ry="20" fill="#c8322f"/><ellipse cx="530" cy="210" rx="34" ry="20" fill="#c8322f"/>`)
    + P(label(260, 480, 380, 70, ['TRIBUNAL SANITÁRIO'], 30, '#2b1d14', '#f6d36b', 0))
    + P(`<rect x="1050" y="560" width="230" height="790" fill="#5a3418"/><rect x="1070" y="580" width="190" height="770" fill="#6b4020"/><circle cx="1090" cy="980" r="14" fill="#e2c26a"/>`)
    + P(`<rect x="-260" y="1040" width="300" height="310" fill="#a0683a"/><rect x="-260" y="1020" width="300" height="30" rx="8" fill="#7b4a2a"/>` + label(-230, 1100, 240, 60, ['TESTEMUNHA'], 26, '#f4f1ea', '#2b1d14', 0))
    + P(`<rect x="760" y="1060" width="260" height="290" fill="#a0683a"/><rect x="760" y="1040" width="260" height="30" rx="8" fill="#7b4a2a"/>` + label(790, 1120, 200, 60, ['RÉU'], 34, '#f4f1ea', '#a3271f', 0));
  const floor = `<rect x="${X0}" y="${FLOOR - 30}" width="${WD}" height="600" fill="#5a3418"/>` + checker(X0, FLOOR - 30, WD, 600, 90, '#6b4020', '#5a3418');
  const bench = P(`<rect x="160" y="820" width="580" height="530" fill="#f4f6f6"/>${grid(160, 820, 580, 530, 72, '#cfe0e3')}<rect x="140" y="800" width="620" height="40" rx="10" fill="#e6eaea"/>
      <path d="M380,900 l60,-60 l60,60 Z" fill="#c8d0d0"/>` + label(270, 1000, 360, 80, ['EXCELÊNCIA'], 40, '#2b1d14', '#f6d36b', 0));
  return [wallLayer(wall), floorLayer(floor), { name: 'front', k: 1, box: [120, 780, 660, 600], scale: 1.2, stage: true, svg: bench }];
}

const SETS = { banheiro, esgoto, escritorio, fabrica, sala, tribunal };
if (typeof window !== 'undefined') window.SETS = SETS, window.SET_DEFS = DEFS;
