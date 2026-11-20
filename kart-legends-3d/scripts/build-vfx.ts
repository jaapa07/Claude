/** Gera o atlas de sprites de partículas (4×4, arte vetorial autoral) em public/assets/vfx/particles.webp. */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ASSETS_DIR } from './lib/textures';

const C = 128;
const cell = (i: number, body: string): string => `<g transform="translate(${(i % 4) * C},${Math.floor(i / 4) * C})">${body}</g>`;
const soft = (id: string, stops: [number, number][]): string =>
  `<radialGradient id="${id}">${stops.map(([o, a]) => `<stop offset="${o}" stop-color="#fff" stop-opacity="${a}"/>`).join('')}</radialGradient>`;
const star = (n: number, r1: number, r2: number): string =>
  Array.from({ length: n * 2 }, (_, k) => { const a = (k * Math.PI) / n - Math.PI / 2; const r = k % 2 ? r2 : r1; return `${64 + Math.cos(a) * r},${64 + Math.sin(a) * r}`; }).join(' ');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${C * 4}" height="${C * 4}">
<defs>
${soft('g0', [[0, 0.95], [0.5, 0.6], [1, 0]])}
${soft('g1', [[0, 1], [0.25, 0.9], [1, 0]])}
${soft('g2', [[0, 0.7], [0.7, 0.35], [1, 0]])}
<filter id="b3"><feGaussianBlur stdDeviation="3"/></filter><filter id="b6"><feGaussianBlur stdDeviation="6"/></filter>
</defs>
${cell(0, '<g filter="url(#b6)" fill="#fff"><circle cx="50" cy="60" r="30" opacity="0.8"/><circle cx="80" cy="54" r="26" opacity="0.8"/><circle cx="66" cy="78" r="28" opacity="0.75"/><circle cx="62" cy="44" r="20" opacity="0.7"/></g>')}
${cell(1, `<circle cx="64" cy="64" r="60" fill="url(#g1)" opacity="0.5"/><polygon points="${star(4, 60, 7)}" fill="#fff"/>`)}
${cell(2, '<circle cx="64" cy="64" r="60" fill="url(#g2)"/>')}
${cell(3, '<g filter="url(#b3)"><path d="M64 8 C92 44 104 70 96 92 C88 116 40 116 32 92 C24 70 36 44 64 8Z" fill="#fff"/></g>')}
${cell(4, `<g stroke="#fff" stroke-width="7" stroke-linecap="round">${[0, 60, 120].map((a) => `<line x1="64" y1="12" x2="64" y2="116" transform="rotate(${a} 64 64)"/>`).join('')}</g><circle cx="64" cy="64" r="12" fill="#fff"/>`)}
${cell(5, '<path d="M64 10 C100 30 108 80 64 118 C20 80 28 30 64 10Z" fill="#fff"/><line x1="64" y1="16" x2="64" y2="112" stroke="#000" stroke-opacity="0.25" stroke-width="4"/>')}
${cell(6, '<rect x="28" y="40" width="72" height="48" rx="6" fill="#fff"/>')}
${cell(7, '<path d="M64 12 C88 52 98 70 98 86 A34 34 0 0 1 30 86 C30 70 40 52 64 12Z" fill="#fff" opacity="0.9"/>')}
${cell(8, '<circle cx="64" cy="64" r="50" fill="none" stroke="#fff" stroke-width="10" filter="url(#b3)"/>')}
${cell(9, '<path d="M64 14 C96 40 96 84 64 114 C44 84 40 44 64 14Z" fill="#fff"/>')}
${cell(10, '<circle cx="64" cy="64" r="62" fill="url(#g0)"/>')}
${cell(11, `<polygon points="${star(5, 58, 24)}" fill="#fff"/>`)}
${cell(12, '<rect x="58" y="4" width="12" height="120" rx="6" fill="#fff" opacity="0.8" filter="url(#b3)"/>')}
${cell(13, '<circle cx="64" cy="64" r="26" fill="#fff" filter="url(#b3)"/>')}
${cell(14, '<path d="M70 4 L40 58 L62 58 L46 124 L96 50 L70 50 L88 4Z" fill="#fff"/>')}
${cell(15, '<g filter="url(#b6)" fill="#fff"><circle cx="64" cy="64" r="40" opacity="0.55"/><circle cx="44" cy="50" r="22" opacity="0.5"/><circle cx="86" cy="76" r="24" opacity="0.5"/></g>')}
</svg>`;

const out = path.join(ASSETS_DIR, 'vfx', 'particles.webp');
await mkdir(path.dirname(out), { recursive: true });
await writeFile(out, await sharp(Buffer.from(svg)).webp({ quality: 92, alphaQuality: 100 }).toBuffer());
console.log('ok', out);
