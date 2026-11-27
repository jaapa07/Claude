#!/usr/bin/env node
// Builds the game's ORIGINAL authored assets (made for this project, not downloaded):
//   - textures drawn as SVG and rasterized (court lines, net mesh, strings, ball felt, sponsor boards, logos)
//   - prop models written as .glb (racket, ball, net, umpire chair, player bench, ad board frame, ball-kid crate)
// Output: public/assets/{textures,models/props,ui}
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, weld } from '@gltf-transform/functions';
import sharp from 'sharp';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = join(process.cwd(), 'public', 'assets');
const md = (p) => (mkdirSync(p, { recursive: true }), p);
const TEX = md(join(OUT, 'textures'));
const PROPS = md(join(OUT, 'models', 'props'));
const UI = md(join(OUT, 'ui'));
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

const svgPng = (svg, file, w, h) => sharp(Buffer.from(svg)).resize(w, h).png().toFile(file);
const svgWebp = (svg, file, w, h, q = 90) => sharp(Buffer.from(svg)).resize(w, h).webp({ quality: q, alphaQuality: 100 }).toFile(file);

// ============================================================ court lines
// Texture covers the full surface: 36.57 m (z) x 18.29 m (x).  Court: 23.77 x 10.97 (doubles), singles 8.23.
const SURF_L = 36.57, SURF_W = 18.29;
{
  const W = 2048, H = 4096; // x across, z along
  const sx = W / SURF_W, sz = H / SURF_L;
  const X = (x) => (x + SURF_W / 2) * sx, Z = (z) => (z + SURF_L / 2) * sz;
  const lw = 0.05, bw = 0.10;
  const rect = (x0, z0, x1, z1) => `<rect x="${X(x0)}" y="${Z(z0)}" width="${X(x1) - X(x0)}" height="${Z(z1) - Z(z0)}"/>`;
  const L = 23.77 / 2, D = 10.97 / 2, S = 8.23 / 2, SV = 6.40;
  const lines = [
    rect(-D, -L, D, -L + bw), rect(-D, L - bw, D, L), // baselines
    rect(-D, -L, -D + lw, L), rect(D - lw, -L, D, L), // doubles sidelines
    rect(-S, -L, -S + lw, L), rect(S - lw, -L, S, L), // singles sidelines
    rect(-S, -SV, S, -SV + lw), rect(-S, SV - lw, S, SV), // service lines
    rect(-lw / 2, -SV, lw / 2, SV), // centre service line
    rect(-lw / 2, -L, lw / 2, -L + 0.10), rect(-lw / 2, L - 0.10, lw / 2, L), // centre marks
  ].join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><g fill="#fff">${lines}</g></svg>`;
  await svgPng(svg, join(TEX, 'court_lines.png'), W, H);

  // Surface paint zones for hard / carpet courts: inner court colour vs run-off colour (R channel = inside court)
  const zone = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="1024"><rect width="512" height="1024" fill="#000"/>
   <rect x="${X(-D - 0.15) / 4}" y="${Z(-L - 0.15) / 4}" width="${(X(D + 0.15) - X(-D - 0.15)) / 4}" height="${(Z(L + 0.15) - Z(-L - 0.15)) / 4}" fill="#fff"/></svg>`;
  await svgPng(zone, join(TEX, 'court_zone.png'), 512, 1024);

  // Grass wear: worn baselines + service-box trails.  White = worn.
  const blobs = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 70; i++) {
      const x = (rnd() - 0.5) * 7.5, z = side * (L + (rnd() - 0.35) * 2.6);
      blobs.push(`<ellipse cx="${X(x) / 4}" cy="${Z(z) / 4}" rx="${(0.5 + rnd() * 1.3) * sx / 4}" ry="${(0.4 + rnd() * 1.1) * sz / 4}" fill="#fff" fill-opacity="${0.25 + rnd() * 0.4}"/>`);
    }
    for (let i = 0; i < 18; i++) {
      const x = (rnd() - 0.5) * 1.2, z = side * (SV - 1 + rnd() * 4);
      blobs.push(`<ellipse cx="${X(x) / 4}" cy="${Z(z) / 4}" rx="${(0.3 + rnd() * 0.5) * sx / 4}" ry="${(0.3 + rnd() * 0.6) * sz / 4}" fill="#fff" fill-opacity="${0.15 + rnd() * 0.25}"/>`);
    }
  }
  const wear = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="1024"><defs><filter id="b"><feGaussianBlur stdDeviation="9"/></filter></defs>
    <rect width="512" height="1024" fill="#000"/><g filter="url(#b)">${blobs.join('')}</g></svg>`;
  await svgPng(wear, join(TEX, 'grass_wear.png'), 512, 1024);

  // Lawn mowing stripes (alternating bands along z)
  const bands = [];
  for (let i = 0; i < 24; i++) if (i % 2) bands.push(`<rect x="0" y="${(i * 1024) / 24}" width="512" height="${1024 / 24}" fill="#fff"/>`);
  await svgPng(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="1024"><rect width="512" height="1024" fill="#000"/>${bands.join('')}</svg>`, join(TEX, 'grass_stripes.png'), 512, 1024);
}

// ============================================================ net mesh, strings, ball felt, grip
{
  const cell = 16, n = 16;
  let p = '';
  for (let i = 0; i <= n; i++) p += `<rect x="${i * cell - 1}" y="0" width="2" height="${n * cell}"/><rect x="0" y="${i * cell - 1}" width="${n * cell}" height="2"/>`;
  await svgPng(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><g fill="#f4f4f0">${p}</g></svg>`, join(TEX, 'net_mesh.png'), 256, 256);

  let s = '';
  for (let i = 0; i < 18; i++) s += `<rect x="${i * 14 + 4}" y="0" width="3" height="256"/>`;
  for (let i = 0; i < 18; i++) s += `<rect x="0" y="${i * 14 + 4}" width="256" height="3"/>`;
  await svgPng(`<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><g fill="#f2f2ea">${s}</g></svg>`, join(TEX, 'racket_strings.png'), 256, 256);

  // Ball felt: equirect map with the classic curved seam
  let seam = '';
  for (let i = 0; i <= 128; i++) {
    const u = i / 128, x = u * 1024;
    const y = 256 + Math.sin(u * Math.PI * 4) * 120;
    seam += `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)} `;
  }
  const felt = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="512">
   <defs><filter id="f"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 0.86  0 0 0 0 0.93  0 0 0 0 0.20  0 0 0 0.35 0"/></filter></defs>
   <rect width="1024" height="512" fill="#d9ef2f"/><rect width="1024" height="512" filter="url(#f)"/>
   <path d="${seam}" stroke="#f7f7ef" stroke-width="16" fill="none" stroke-linecap="round"/></svg>`;
  await svgPng(felt, join(TEX, 'ball_felt.png'), 512, 256);

  const grip = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="256"><rect width="128" height="256" fill="#1b1b1f"/>
   ${Array.from({ length: 12 }, (_, i) => `<path d="M0 ${i * 24} L128 ${i * 24 + 22}" stroke="#34343c" stroke-width="5"/>`).join('')}</svg>`;
  await svgPng(grip, join(TEX, 'racket_grip.png'), 128, 256);
}

// particle sprite
await svgPng(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><defs><radialGradient id="g"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="0.4" stop-color="#fff" stop-opacity="0.6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><circle cx="32" cy="32" r="32" fill="url(#g)"/></svg>`, join(TEX, 'fx_dot.png'), 64, 64);

// ============================================================ brand: game logo, league, sponsors, tournaments
const SPONSORS = [
  { id: 'volta', name: 'VOLTA', sub: 'SPORTS', c1: '#ff5a1f', c2: '#111', icon: 'bolt' },
  { id: 'nimbus', name: 'NIMBUS', sub: 'WATER', c1: '#1aa7ec', c2: '#fff', icon: 'drop' },
  { id: 'kairo', name: 'KAIRO', sub: 'WATCHES', c1: '#d4af37', c2: '#0c0c0c', icon: 'ring' },
  { id: 'pulse', name: 'PULSE', sub: 'ENERGY', c1: '#39e36b', c2: '#0a0a0a', icon: 'wave' },
  { id: 'ardent', name: 'ARDENT', sub: 'MOTORS', c1: '#e8e8e8', c2: '#b3001b', icon: 'chev' },
  { id: 'lumen', name: 'LUMEN', sub: 'AIR', c1: '#ffffff', c2: '#3a2fb8', icon: 'star' },
];
const ICONS = {
  bolt: (c) => `<path d="M38 4 L12 52 H32 L24 92 L58 36 H38 L50 4Z" fill="${c}"/>`,
  drop: (c) => `<path d="M34 6 C34 6 8 44 8 60 A26 26 0 0 0 60 60 C60 44 34 6 34 6Z" fill="${c}"/>`,
  ring: (c) => `<circle cx="34" cy="48" r="26" fill="none" stroke="${c}" stroke-width="9"/><path d="M34 30 V48 L46 56" stroke="${c}" stroke-width="7" fill="none" stroke-linecap="round"/>`,
  wave: (c) => `<path d="M4 50 H18 L26 22 L38 80 L48 36 L54 50 H66" stroke="${c}" stroke-width="9" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`,
  chev: (c) => `<path d="M6 24 L34 52 L62 24 V44 L34 72 L6 44Z" fill="${c}"/>`,
  star: (c) => `<path d="M34 4 L42 36 L70 44 L42 52 L34 84 L26 52 L-2 44 L26 36Z" fill="${c}" transform="translate(0,2) scale(0.95)"/>`,
};
const FONT = `font-family="Anton, Impact, 'Arial Black', sans-serif"`;
const sponsorSvg = (s, w = 1024, h = 256) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 1024 256">
  <rect width="1024" height="256" fill="${s.c2}"/>
  <rect y="0" width="1024" height="14" fill="${s.c1}" opacity="0.9"/><rect y="242" width="1024" height="14" fill="${s.c1}" opacity="0.9"/>
  <g transform="translate(210,78) scale(1.15)">${ICONS[s.icon](s.c1)}</g>
  <text x="320" y="172" ${FONT} font-size="128" font-weight="900" fill="${s.c1}" letter-spacing="6" font-style="italic">${s.name}</text>
  <text x="1000" y="226" text-anchor="end" font-family="'Barlow Condensed', Arial, sans-serif" font-size="40" font-weight="700" fill="${s.c1}" opacity="0.8" letter-spacing="8">${s.sub}</text>
</svg>`;
{
  // board atlas: 6 boards stacked vertically, 1024 x 1536
  const fontCss = '';
  void fontCss;
  const parts = await Promise.all(SPONSORS.map((s) => sharp(Buffer.from(sponsorSvg(s))).png().toBuffer()));
  await sharp({ create: { width: 1024, height: 256 * 6, channels: 4, background: '#000' } })
    .composite(parts.map((input, i) => ({ input, top: i * 256, left: 0 })))
    .webp({ quality: 90 })
    .toFile(join(TEX, 'sponsor_atlas.webp'));
  for (const s of SPONSORS) writeFileSync(join(UI, `sponsor_${s.id}.svg`), sponsorSvg(s, 512, 128));
}

// Game logo
const LOGO = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="520" viewBox="0 0 1200 520">
 <defs>
  <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset="0.45" stop-color="#f5c542"/><stop offset="1" stop-color="#b8790f"/></linearGradient>
  <linearGradient id="ball" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4ff7a"/><stop offset="1" stop-color="#a8c800"/></linearGradient>
  <filter id="s" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000" flood-opacity="0.55"/></filter>
 </defs>
 <g filter="url(#s)">
  <path d="M40 300 L1160 230 L1160 330 L40 400Z" fill="#c1121f"/>
  <path d="M40 300 L1160 230 L1160 246 L40 316Z" fill="#ff4d5a"/>
  <g transform="skewX(-12)">
   <text x="120" y="228" ${FONT} font-size="210" fill="url(#gold)" stroke="#3b2300" stroke-width="6" letter-spacing="4">GRAND SLAM</text>
   <text x="300" y="380" ${FONT} font-size="118" fill="#fff" letter-spacing="22">ARCADE</text>
  </g>
  <circle cx="1070" cy="330" r="78" fill="url(#ball)"/>
  <path d="M1005 290 C1050 325 1050 365 1015 390 M1135 280 C1092 312 1094 360 1132 385" stroke="#fffde8" stroke-width="9" fill="none" stroke-linecap="round"/>
  <text x="600" y="470" text-anchor="middle" font-family="'Barlow Condensed', Arial" font-weight="700" font-size="44" letter-spacing="14" fill="#f5c542">CIRCUITO DE OURO</text>
 </g></svg>`;
writeFileSync(join(UI, 'logo.svg'), LOGO);

// App icons (PWA / home screen)
const ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
 <defs><radialGradient id="bg" cx="50%" cy="35%" r="75%"><stop offset="0" stop-color="#1d2f6b"/><stop offset="1" stop-color="#05060a"/></radialGradient>
 <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff3b0"/><stop offset="0.5" stop-color="#f5c542"/><stop offset="1" stop-color="#b8790f"/></linearGradient>
 <linearGradient id="ball" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4ff7a"/><stop offset="1" stop-color="#a8c800"/></linearGradient></defs>
 <rect width="512" height="512" fill="url(#bg)"/>
 <path d="M40 330 L472 270 L472 340 L40 400Z" fill="#c1121f"/>
 <circle cx="350" cy="190" r="92" fill="url(#ball)"/>
 <path d="M272 140 C330 185 330 235 285 268 M430 120 C378 160 380 225 428 262" stroke="#fffde8" stroke-width="12" fill="none" stroke-linecap="round"/>
 <g transform="skewX(-12)"><text x="150" y="300" ${FONT} font-size="230" fill="url(#gold)" stroke="#3b2300" stroke-width="6">GS</text></g>
 <text x="256" y="455" text-anchor="middle" font-family="'Barlow Condensed', Arial" font-weight="700" font-size="44" letter-spacing="10" fill="#f5c542">ARCADE</text></svg>`;
for (const sz of [192, 512]) await sharp(Buffer.from(ICON)).resize(sz, sz).png().toFile(join(UI, `icon-${sz}.png`));

// Tournament crests
const TOURNEYS = [
  { id: 'harbor', name: 'HARBOR OPEN', c1: '#0aa2c0', c2: '#063a55', glyph: '<path d="M-40 18 Q-20 0 0 18 T40 18" stroke="#fff" stroke-width="7" fill="none"/><path d="M-40 34 Q-20 16 0 34 T40 34" stroke="#fff" stroke-width="7" fill="none"/><path d="M0 -50 L0 6 M-22 -12 L22 -12" stroke="#fff" stroke-width="8"/>' },
  { id: 'clay', name: 'TERRE ROUGE CUP', c1: '#d9622b', c2: '#3c1707', glyph: '<path d="M-36 30 L0 -48 L36 30Z" fill="none" stroke="#fff" stroke-width="8"/><path d="M-18 30 L0 -10 L18 30" fill="#fff"/>' },
  { id: 'lawn', name: 'ROYAL LAWN CLASSIC', c1: '#2f8f3a', c2: '#3a0f4e', glyph: '<path d="M-40 -10 L-24 -40 L-8 -14 L0 -46 L8 -14 L24 -40 L40 -10 L34 24 H-34Z" fill="#fff"/><rect x="-34" y="30" width="68" height="10" fill="#fff"/>' },
  { id: 'neon', name: 'NEON ARENA FINALS', c1: '#ff2bd6', c2: '#0a0a24', glyph: '<path d="M-38 30 L-38 -36 L38 30 L38 -36" stroke="#3ff7ff" stroke-width="10" fill="none" stroke-linejoin="round"/>' },
];
for (const t of TOURNEYS) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="-200 -200 400 400">
   <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.c1}"/><stop offset="1" stop-color="${t.c2}"/></linearGradient></defs>
   <path d="M0 -180 L150 -120 L150 40 C150 120 70 165 0 190 C-70 165 -150 120 -150 40 L-150 -120Z" fill="url(#g)" stroke="#f5c542" stroke-width="10"/>
   <g transform="translate(0,-40) scale(1.6)">${t.glyph}</g>
   <text y="85" text-anchor="middle" ${FONT} font-size="${t.name.length > 13 ? 30 : 38}" fill="#fff" letter-spacing="2">${t.name}</text>
   <text y="128" text-anchor="middle" font-family="'Barlow Condensed', Arial" font-weight="700" font-size="24" fill="#f5c542" letter-spacing="6">GOLD CIRCUIT</text></svg>`;
  writeFileSync(join(UI, `crest_${t.id}.svg`), svg);
  // banner for the venue wall
  const banner = `<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="256"><rect width="2048" height="256" fill="${t.c2}"/>
   <rect y="226" width="2048" height="30" fill="${t.c1}"/>
   <text x="1024" y="170" text-anchor="middle" ${FONT} font-size="140" fill="#fff" letter-spacing="30" font-style="italic">${t.name}</text></svg>`;
  await svgWebp(banner, join(TEX, `banner_${t.id}.webp`), 2048, 256);
}

// Broadcast-style back walls: venue colour with repeated sponsor marks (2 alternating brands per venue)
{
  const WALLS = { harbor: ['#13466e', 0, 1], clay: ['#1d5a3a', 3, 2], lawn: ['#1e4632', 2, 5], neon: ['#101030', 4, 3] };
  for (const [id, [bg, a, b]] of Object.entries(WALLS)) {
    const logo = (sp, x) => `<g transform="translate(${x},0)"><g transform="translate(0,70) scale(1.05)">${ICONS[sp.icon]('#ffffff')}</g>
      <text x="96" y="152" ${FONT} font-size="104" font-style="italic" fill="#ffffff" letter-spacing="4">${sp.name}</text></g>`;
    const items = [];
    for (let i = 0; i < 4; i++) items.push(logo(SPONSORS[i % 2 ? b : a], 40 + i * 512));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="256"><rect width="2048" height="256" fill="${bg}"/>
      <rect y="0" width="2048" height="256" fill="url(#g)"/><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.06"/><stop offset="1" stop-color="#000" stop-opacity="0.18"/></linearGradient></defs>
      <g opacity="0.92">${items.join('')}</g></svg>`;
    await svgWebp(svg, join(TEX, `wallads_${id}.webp`), 2048, 256, 90);
  }
  // serve-speed and clock boards (static faces; the speed digits glow)
  const board = (title, value, sub) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="256"><rect width="512" height="256" rx="14" fill="#16306b"/>
    <rect x="10" y="10" width="492" height="236" rx="10" fill="none" stroke="#3d64c4" stroke-width="4"/>
    <text x="256" y="58" text-anchor="middle" ${FONT} font-size="44" fill="#ffffff" letter-spacing="3">${title}</text>
    <rect x="96" y="78" width="320" height="120" rx="8" fill="#050505"/>
    <text x="256" y="172" text-anchor="middle" font-family="'Courier New', monospace" font-weight="700" font-size="96" fill="#ffd21a">${value}</text>
    <text x="256" y="236" text-anchor="middle" font-family="'Barlow Condensed', Arial" font-weight="700" font-size="28" fill="#cfd8ff" letter-spacing="4">${sub}</text></svg>`;
  await svgPng(board('GOLD CIRCUIT', '186', 'SAQUE KM/H'), join(TEX, 'board_speed.png'), 512, 256);
  await svgPng(board('GOLD CIRCUIT', '1:24', 'TEMPO DE JOGO'), join(TEX, 'board_clock.png'), 512, 256);
}

// ============================================================ models (gltf-transform from three geometry)
function makeDoc() {
  const doc = new Document();
  doc.createBuffer();
  return doc;
}
function addTexture(doc, file, mime = 'image/png') {
  return doc.createTexture(file).setImage(readFileSync(join(TEX, file))).setMimeType(mime).setURI(file);
}
function addGeom(doc, parent, geom, mat, name) {
  geom = geom.index ? geom : geom;
  const buf = doc.getRoot().listBuffers()[0];
  const prim = doc.createPrimitive().setMaterial(mat);
  const pos = geom.getAttribute('position'), nor = geom.getAttribute('normal'), uv = geom.getAttribute('uv');
  prim.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(new Float32Array(pos.array)).setBuffer(buf));
  if (nor) prim.setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(new Float32Array(nor.array)).setBuffer(buf));
  if (uv) prim.setAttribute('TEXCOORD_0', doc.createAccessor().setType('VEC2').setArray(new Float32Array(uv.array)).setBuffer(buf));
  if (geom.index) prim.setIndices(doc.createAccessor().setType('SCALAR').setArray(new Uint32Array(geom.index.array)).setBuffer(buf));
  const mesh = doc.createMesh(name).addPrimitive(prim);
  const node = doc.createNode(name).setMesh(mesh);
  parent.addChild(node);
  return node;
}
const mat = (doc, name, color, rough = 0.6, metal = 0, extra = {}) => {
  const m = doc.createMaterial(name).setBaseColorFactor([...new THREE.Color(color).convertSRGBToLinear().toArray(), extra.alpha ?? 1]).setRoughnessFactor(rough).setMetallicFactor(metal);
  if (extra.tex) m.setBaseColorTexture(extra.tex);
  if (extra.blend) m.setAlphaMode('BLEND');
  if (extra.mask) m.setAlphaMode('MASK').setAlphaCutoff(0.4);
  if (extra.double) m.setDoubleSided(true);
  return m;
};
const merge = (gs) => mergeGeometries(gs.map((g) => (g.index ? g.toNonIndexed() : g)), false);
const at = (g, x, y, z, rx = 0, ry = 0, rz = 0) => g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)));
async function save(doc, file) {
  await doc.transform(dedup(), prune());
  await io.write(join(PROPS, file), doc);
}

// ---- Racket: grip origin at (0,0,0), head along +Y.  Length 0.685 m.
{
  const doc = makeDoc();
  const scene = doc.createScene('racket');
  const root = doc.createNode('racket');
  scene.addChild(root);
  const headC = new THREE.Vector2(0, 0.50), ra = 0.125, rb = 0.165;
  const pts = [];
  for (let i = 0; i < 64; i++) { const t = (i / 64) * Math.PI * 2; pts.push(new THREE.Vector3(Math.sin(t) * ra, headC.y + Math.cos(t) * rb, 0)); }
  const curve = new THREE.CatmullRomCurve3(pts, true);
  const frame = new THREE.TubeGeometry(curve, 96, 0.011, 8, true);
  frame.scale(1, 1, 1.6);
  const throatL = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(-0.05, 0.3, 0), new THREE.Vector3(-0.105, 0.39, 0)]), 16, 0.01, 8);
  const throatR = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.2, 0), new THREE.Vector3(0.05, 0.3, 0), new THREE.Vector3(0.105, 0.39, 0)]), 16, 0.01, 8);
  const shaft = at(new THREE.CylinderGeometry(0.012, 0.014, 0.06, 10), 0, 0.2, 0);
  const frameMat = mat(doc, 'frame', '#d0102a', 0.35, 0.3);
  addGeom(doc, root, merge([frame, throatL, throatR, shaft]), frameMat, 'frame');
  const accent = mat(doc, 'accent', '#f4f4f4', 0.3, 0.1);
  const bumper = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.slice(-10).concat(pts.slice(0, 11))), 24, 0.0125, 6);
  bumper.scale(1, 1, 1.7);
  addGeom(doc, root, bumper, accent, 'bumper');
  const grip = at(new THREE.CylinderGeometry(0.016, 0.017, 0.2, 8), 0, 0.08, 0);
  addGeom(doc, root, grip, mat(doc, 'grip', '#ffffff', 0.9, 0, { tex: addTexture(doc, 'racket_grip.png') }), 'grip');
  const butt = at(new THREE.CylinderGeometry(0.019, 0.017, 0.015, 8), 0, -0.02, 0);
  addGeom(doc, root, butt, accent, 'butt');
  const strings = new THREE.CircleGeometry(1, 40);
  strings.scale(ra * 0.97, rb * 0.97, 1);
  at(strings, 0, headC.y, 0);
  addGeom(doc, root, strings, mat(doc, 'strings', '#ffffff', 0.7, 0, { tex: addTexture(doc, 'racket_strings.png'), mask: true, double: true }), 'strings');
  await save(doc, 'racket.glb');
}

// ---- Ball (radius 0.0335)
{
  const doc = makeDoc();
  const scene = doc.createScene('ball');
  const root = doc.createNode('ball');
  scene.addChild(root);
  addGeom(doc, root, new THREE.SphereGeometry(0.0335, 24, 16), mat(doc, 'felt', '#ffffff', 0.95, 0, { tex: addTexture(doc, 'ball_felt.png') }), 'ball');
  await save(doc, 'ball.glb');
}

// ---- Net: spans x in [-6.4, 6.4], height 1.07 at posts, 0.914 centre.  z = 0.
{
  const doc = makeDoc();
  const scene = doc.createScene('net');
  const root = doc.createNode('net');
  scene.addChild(root);
  const half = 6.4, hp = 1.07, hc = 0.914;
  const seg = 40;
  const g = new THREE.BufferGeometry();
  const pos = [], uv = [], nor = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg, x = -half + t * half * 2;
    const top = hc + (hp - hc) * Math.pow(Math.abs(x) / half, 1.6);
    pos.push(x, 0.02, 0, x, top - 0.05, 0);
    uv.push(t * 120, 0, t * 120, (top - 0.07) / 0.0533);
    nor.push(0, 0, 1, 0, 0, 1);
    if (i < seg) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  const meshTex = addTexture(doc, 'net_mesh.png');
  const netMat = mat(doc, 'net_mesh', '#ffffff', 0.9, 0, { tex: meshTex, mask: true, double: true });
  addGeom(doc, root, g, netMat, 'mesh');
  // tape (white band) following the sag
  const band = [];
  for (let i = 0; i < seg; i++) {
    const x0 = -half + (i / seg) * half * 2, x1 = -half + ((i + 1) / seg) * half * 2;
    const t0 = hc + (hp - hc) * Math.pow(Math.abs(x0) / half, 1.6), t1 = hc + (hp - hc) * Math.pow(Math.abs(x1) / half, 1.6);
    const b = new THREE.BoxGeometry(x1 - x0 + 0.002, 0.065, 0.012);
    const ang = Math.atan2(t1 - t0, x1 - x0);
    at(b, (x0 + x1) / 2, (t0 + t1) / 2 - 0.032, 0, 0, 0, ang);
    band.push(b);
  }
  addGeom(doc, root, merge(band), mat(doc, 'tape', '#fbfbf7', 0.6), 'tape');
  const centreStrap = at(new THREE.BoxGeometry(0.05, hc - 0.02, 0.014), 0, (hc - 0.02) / 2, 0);
  addGeom(doc, root, centreStrap, mat(doc, 'strap', '#fbfbf7', 0.6), 'strap');
  const posts = merge([
    at(new THREE.CylinderGeometry(0.04, 0.045, hp + 0.05, 14), -half - 0.05, (hp + 0.05) / 2, 0),
    at(new THREE.CylinderGeometry(0.04, 0.045, hp + 0.05, 14), half + 0.05, (hp + 0.05) / 2, 0),
    at(new THREE.SphereGeometry(0.045, 12, 8), -half - 0.05, hp + 0.05, 0),
    at(new THREE.SphereGeometry(0.045, 12, 8), half + 0.05, hp + 0.05, 0),
    at(new THREE.BoxGeometry(0.03, 0.12, 0.08), half + 0.1, 0.9, 0),
    at(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 6), half + 0.13, 0.9, 0.0, Math.PI / 2),
  ]);
  addGeom(doc, root, posts, mat(doc, 'post', '#1f4d33', 0.35, 0.7), 'posts');
  const cable = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 21 }, (_, i) => { const x = -half + (i / 20) * half * 2; return new THREE.Vector3(x, hc + (hp - hc) * Math.pow(Math.abs(x) / half, 1.6) - 0.012, 0); })), 60, 0.004, 5);
  addGeom(doc, root, cable, mat(doc, 'cable', '#888', 0.4, 0.9), 'cable');
  await save(doc, 'net.glb');
}

// ---- Umpire chair (tall), origin at floor centre, faces +x
{
  const doc = makeDoc();
  const scene = doc.createScene('umpire_chair');
  const root = doc.createNode('umpire_chair');
  scene.addChild(root);
  const metal = mat(doc, 'frame', '#1d3b2a', 0.4, 0.7);
  const legs = [];
  for (const [x, z] of [[-0.45, -0.45], [0.45, -0.45], [-0.45, 0.45], [0.45, 0.45]]) {
    const l = new THREE.CylinderGeometry(0.03, 0.035, 1.9, 8);
    at(l, x * 0.85, 0.95, z * 0.85, z * 0.06, 0, -x * 0.06);
    legs.push(l);
  }
  for (const y of [0.45, 1.1]) for (const s of [-1, 1]) {
    legs.push(at(new THREE.CylinderGeometry(0.018, 0.018, 0.78, 6), s * 0.4, y, 0, Math.PI / 2));
    legs.push(at(new THREE.CylinderGeometry(0.018, 0.018, 0.78, 6), 0, y, s * 0.4, 0, 0, Math.PI / 2));
  }
  for (let i = 0; i < 6; i++) legs.push(at(new THREE.BoxGeometry(0.42, 0.03, 0.12), -0.62, 0.18 + i * 0.3, 0));
  legs.push(at(new THREE.BoxGeometry(0.04, 1.85, 0.04), -0.84, 0.92, -0.22), at(new THREE.BoxGeometry(0.04, 1.85, 0.04), -0.84, 0.92, 0.22));
  addGeom(doc, root, merge(legs), metal, 'frame');
  const wood = mat(doc, 'wood', '#b07a45', 0.6);
  addGeom(doc, root, merge([
    at(new THREE.BoxGeometry(0.95, 0.06, 0.95), 0, 1.9, 0),
    at(new THREE.BoxGeometry(0.5, 0.06, 0.5), 0, 2.33, 0),
    at(new THREE.BoxGeometry(0.06, 0.55, 0.5), -0.24, 2.6, 0),
    at(new THREE.BoxGeometry(0.4, 0.05, 0.06), 0.02, 2.55, 0.25), at(new THREE.BoxGeometry(0.4, 0.05, 0.06), 0.02, 2.55, -0.25),
    at(new THREE.BoxGeometry(0.06, 0.4, 0.95), 0.45, 2.12, 0),
  ]), wood, 'seat');
  const legsSeat = merge([[-0.2, -0.2], [0.2, -0.2], [-0.2, 0.2], [0.2, 0.2]].map(([x, z]) => at(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), x, 2.12, z)));
  addGeom(doc, root, legsSeat, metal, 'seat_legs');
  // sponsor panel (uses atlas row 2 = Kairo)
  const panel = new THREE.PlaneGeometry(0.9, 0.225);
  const uvs = panel.getAttribute('uv');
  for (let i = 0; i < uvs.count; i++) uvs.setY(i, 1 - (2 + (1 - uvs.getY(i))) / 6);
  at(panel, 0.485, 2.12, 0, 0, Math.PI / 2, 0);
  addGeom(doc, root, panel, mat(doc, 'panel', '#ffffff', 0.5, 0, { tex: doc.createTexture('sponsor_atlas.webp').setImage(readFileSync(join(TEX, 'sponsor_atlas.webp'))).setMimeType('image/webp').setURI('sponsor_atlas.webp') }), 'panel');
  await save(doc, 'umpire_chair.glb');
}

// ---- Player bench with towel and drinks cooler
{
  const doc = makeDoc();
  const scene = doc.createScene('bench');
  const root = doc.createNode('bench');
  scene.addChild(root);
  addGeom(doc, root, merge([
    at(new THREE.BoxGeometry(1.8, 0.06, 0.45), 0, 0.45, 0),
    at(new THREE.BoxGeometry(1.8, 0.4, 0.05), 0, 0.72, -0.2),
  ]), mat(doc, 'seat', '#164a7a', 0.5), 'seat');
  addGeom(doc, root, merge([[-0.8, -0.18], [0.8, -0.18], [-0.8, 0.18], [0.8, 0.18]].map(([x, z]) => at(new THREE.BoxGeometry(0.05, 0.45, 0.05), x, 0.225, z))), mat(doc, 'legs', '#cfd3d6', 0.3, 0.9), 'legs');
  addGeom(doc, root, at(new THREE.BoxGeometry(0.42, 0.04, 0.4), -0.45, 0.5, 0.02), mat(doc, 'towel', '#ffffff', 0.95), 'towel');
  addGeom(doc, root, at(new THREE.BoxGeometry(0.5, 0.42, 0.36), 1.25, 0.21, 0), mat(doc, 'cooler', '#1aa7ec', 0.4), 'cooler');
  addGeom(doc, root, merge([0, 1, 2].map((i) => at(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 12), 0.25 + i * 0.12, 0.59, 0.05))), mat(doc, 'bottles', '#7fd3ff', 0.15, 0, { alpha: 0.85, blend: true }), 'bottles');
  await save(doc, 'bench.glb');
}
console.log('authored assets done');
