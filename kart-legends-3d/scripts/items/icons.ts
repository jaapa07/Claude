/** Ícones de HUD dos 6 itens: arte vetorial autoral (SVG) → WebP 256×256 com fundo transparente. */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { ASSETS_DIR } from '../lib/textures';

const INK = '#1b2238';
const O = `stroke="${INK}" stroke-width="11" stroke-linejoin="round" stroke-linecap="round"`;
const o = (w: number): string => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

function rays(cx: number, cy: number, r0: number, r1: number, n: number, half: number): string {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    const p = (ang: number, r: number): string => `${(cx + Math.cos(ang) * r).toFixed(1)},${(cy + Math.sin(ang) * r).toFixed(1)}`;
    d += `M${p(a - half, r0)} L${p(a, r1)} L${p(a + half, r0)} Z `;
  }
  return d;
}
function star(cx: number, cy: number, r: number, k = 0.28): string {
  let d = '';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * k : r;
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)} `;
  }
  return d + 'Z';
}
function hex(cx: number, cy: number, r: number): string {
  let d = '';
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)} `; }
  return d + 'Z';
}

export const ICONS: Record<string, string> = {
  'pulso-solar': `
    <path d="${rays(128, 128, 78, 120, 8, 0.24)}" fill="#ff8a1f" ${O}/>
    <path d="${rays(128, 128, 78, 104, 8, 0.2).replace(/M/g, 'M')}" fill="#ffd23f" transform="rotate(22.5 128 128)" ${o(9)}/>
    <circle cx="128" cy="128" r="70" fill="#ffb22e" ${O}/>
    <circle cx="128" cy="128" r="52" fill="#ffd95a"/>
    <path d="M92,150 L128,112 L164,150 M92,122 L128,84 L164,122" fill="none" stroke="#fffbe0" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="104" cy="102" r="0" fill="#fff"/>`,
  'bolha-guardia': `
    <ellipse cx="128" cy="150" rx="112" ry="26" fill="none" stroke="${INK}" stroke-width="20"/>
    <ellipse cx="128" cy="150" rx="112" ry="26" fill="none" stroke="#fff3b0" stroke-width="9"/>
    <circle cx="128" cy="122" r="94" fill="#4fd8e8" ${O}/>
    <circle cx="128" cy="122" r="80" fill="#8cecf5"/>
    <g fill="none" stroke="#2a9fb8" stroke-width="6" stroke-linejoin="round">
      <path d="${hex(128, 122, 30)}"/><path d="${hex(128, 70, 30)}"/><path d="${hex(128, 174, 30)}"/>
      <path d="${hex(173, 96, 30)}"/><path d="${hex(83, 96, 30)}"/><path d="${hex(173, 148, 30)}"/><path d="${hex(83, 148, 30)}"/>
    </g>
    <circle cx="128" cy="122" r="88" fill="none" stroke="#4fd8e8" stroke-width="14"/>
    <circle cx="128" cy="122" r="94" fill="none" ${O}/>
    <path d="M70,92 Q84,58 116,48" fill="none" stroke="#ffffff" stroke-width="12" stroke-linecap="round"/>
    <path d="M22,160 Q128,214 234,160" fill="none" stroke="${INK}" stroke-width="20" stroke-linecap="round"/>
    <path d="M22,160 Q128,214 234,160" fill="none" stroke="#fff3b0" stroke-width="9" stroke-linecap="round"/>`,
  'nevoa-prisma': `
    <path d="M50,190 Q14,188 18,152 Q20,122 52,120 Q50,74 96,66 Q130,60 148,88 Q176,66 204,90 Q226,110 214,136 Q244,146 238,174 Q232,194 204,192 Z" fill="#c77dff" ${O}/>
    <path d="M148,88 Q176,66 204,90 Q226,110 214,136 Q244,146 238,174 Q232,194 204,192 L138,192 Q170,150 148,88 Z" fill="#6fd8f2"/>
    <path d="M50,190 Q14,188 18,152 Q20,122 52,120 Q84,128 92,160 Q98,180 84,191 Z" fill="#ff8fc8"/>
    <path d="M70,104 Q84,82 110,80" fill="none" stroke="#f3dcff" stroke-width="10" stroke-linecap="round"/>
    <path d="M50,190 Q14,188 18,152 Q20,122 52,120 Q50,74 96,66 Q130,60 148,88 Q176,66 204,90 Q226,110 214,136 Q244,146 238,174 Q232,194 204,192 Z" fill="none" ${O}/>
    <path d="${star(60, 52, 30)}" fill="#fff3b0" ${o(8)}/>
    <path d="${star(208, 44, 22)}" fill="#ffffff" ${o(7)}/>
    <path d="M62,226 L96,226 M118,226 L190,226 M150,146 Q130,160 150,174" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/>
    <path d="M118,150 A26,26 0 1 1 118,151" fill="none" stroke="#ffffff" stroke-width="9" stroke-linecap="round" stroke-dasharray="60 200"/>`,
  'faisca-rastreadora': `
    <g transform="rotate(-38 128 128)">
      <path d="M20,128 Q60,92 106,98 L106,158 Q60,164 20,128 Z" fill="#ffd23f" ${O}/>
      <path d="M52,128 Q78,112 108,114 L108,142 Q78,144 52,128 Z" fill="#fff7c8"/>
      <path d="M96,96 L70,58 L132,84 Z M96,160 L70,198 L132,172 Z" fill="#c22a1c" ${O}/>
      <path d="M96,84 L206,96 Q244,128 206,160 L96,172 Q84,128 96,84 Z" fill="#ff5b3a" ${O}/>
      <path d="M150,98 L206,104 Q232,128 206,152 L150,158 Q170,128 150,98 Z" fill="#ffb22e"/>
      <circle cx="196" cy="128" r="16" fill="#fff7c8" ${o(8)}/>
      <path d="M112,96 L112,160" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/>
    </g>
    <path d="${star(212, 206, 26)}" fill="#fff3b0" ${o(8)}/>
    <path d="${star(44, 50, 20)}" fill="#ffffff" ${o(7)}/>`,
  'onda-vento': `
    <g fill="none" stroke-linecap="round">
      <path d="M28,92 Q110,40 168,70 Q208,94 184,124 Q166,144 144,128" stroke="${INK}" stroke-width="34"/>
      <path d="M22,150 Q130,112 206,142 Q250,164 226,196 Q208,216 184,200" stroke="${INK}" stroke-width="34"/>
      <path d="M52,208 Q96,186 136,198" stroke="${INK}" stroke-width="30"/>
      <path d="M28,92 Q110,40 168,70 Q208,94 184,124 Q166,144 144,128" stroke="#9cf0c3" stroke-width="16"/>
      <path d="M22,150 Q130,112 206,142 Q250,164 226,196 Q208,216 184,200" stroke="#d6ffe9" stroke-width="16"/>
      <path d="M52,208 Q96,186 136,198" stroke="#5fd6a0" stroke-width="13"/>
      <path d="M40,88 Q104,56 150,70" stroke="#ffffff" stroke-width="5"/>
    </g>
    <path d="${star(214, 60, 22)}" fill="#ffffff" ${o(7)}/>`,
  'cristal-salto': `
    <path d="M104,112 Q58,70 16,84 Q30,104 52,110 Q32,120 28,138 Q62,146 104,132 Z" fill="#ffffff" ${O}/>
    <path d="M152,112 Q198,70 240,84 Q226,104 204,110 Q224,120 228,138 Q194,146 152,132 Z" fill="#ffffff" ${O}/>
    <path d="M128,18 L176,74 L160,150 L128,176 L96,150 L80,74 Z" fill="#7aa8ff" ${O}/>
    <path d="M128,18 L176,74 L128,92 Z" fill="#b9d2ff"/>
    <path d="M128,92 L176,74 L160,150 L128,176 Z" fill="#4f7de0"/>
    <path d="M128,18 L128,92 L80,74 Z" fill="#e4eeff"/>
    <path d="M128,18 L176,74 L160,150 L128,176 L96,150 L80,74 Z M80,74 L128,92 L176,74 M128,92 L128,176" fill="none" ${o(8)}/>
    <path d="M84,196 L172,196 L96,214 L160,214 L108,232 L148,232" fill="none" stroke="${INK}" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M84,196 L172,196 L96,214 L160,214 L108,232 L148,232" fill="none" stroke="#dfe7f5" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`,
};

export async function buildIcons(): Promise<string[]> {
  const dir = path.join(ASSETS_DIR, 'ui', 'items');
  await mkdir(dir, { recursive: true });
  const out: string[] = [];
  for (const [id, body] of Object.entries(ICONS)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256">${body}</svg>`;
    const file = path.join(dir, `${id}.webp`);
    await sharp(Buffer.from(svg), { density: 144 }).resize(256, 256).webp({ quality: 92, alphaQuality: 100 }).toFile(file);
    out.push(`ui/items/${id}.webp`);
  }
  return out;
}
