/**
 * Atlas de expressões do rosto (4×2 células) desenhado em SVG.
 * Ordem (linha de cima primeiro): neutral, happy, focus, hurt, sad, blink, wow, grit.
 * As especificações usam milímetros medidos na casca do rosto (x para a esquerda do personagem = direita
 * da imagem; y para cima), então um círculo no SVG é um círculo no modelo.
 */
import { svgTexture } from '../lib/textures';

export const EXPRESSIONS = ['neutral', 'happy', 'focus', 'hurt', 'sad', 'blink', 'wow', 'grit'] as const;
export type Expr = (typeof EXPRESSIONS)[number];

export interface FaceSpec {
  bg: string;
  eye: {
    x: number; y: number; rx: number; ry: number;
    iris: string; irisDark: string; irisLight?: string; pupil?: string; sclera?: string; line?: string;
    /** Inclinação do olho em graus (canto externo para cima). */
    tilt?: number; lash?: boolean; lid?: string; slit?: boolean; star?: boolean;
  };
  brow: { color: string; w: number; len: number; gap: number };
  mouth: { y: number; w: number; line: string; inside?: string; tongue?: string; cat?: boolean; teeth?: string };
  blush?: string;
  nose?: { y: number; color: string; w: number };
  /** Marcas por baixo (manchas, máscara) e por cima (sardas, bigodes) em SVG, coordenadas em mm (y para BAIXO). */
  under?: (e: Expr) => string;
  over?: (e: Expr) => string;
}

const f = (n: number): string => (Math.round(n * 100) / 100).toString();

interface EyeState { kind: 'open' | 'arcUp' | 'arcDown' | 'chevron'; lidIn?: number; lidOut?: number; scale?: number; iris?: number; pupil?: number; low?: number }
interface BrowState { raise: number; ang: number; curve: number }
interface State { eye: EyeState; brow: BrowState; mouth: 'smile' | 'open' | 'firm' | 'wavy' | 'frown' | 'o' | 'teeth'; blush?: number; tear?: boolean }

const STATES: Record<Expr, State> = {
  neutral: { eye: { kind: 'open' }, brow: { raise: 0, ang: 0, curve: 3 }, mouth: 'smile' },
  happy: { eye: { kind: 'arcUp' }, brow: { raise: 5, ang: -2, curve: 5 }, mouth: 'open', blush: 1 },
  focus: { eye: { kind: 'open', lidIn: 0.42, lidOut: 0.2, pupil: 0.9 }, brow: { raise: -7, ang: 7, curve: 0 }, mouth: 'firm' },
  hurt: { eye: { kind: 'chevron' }, brow: { raise: 4, ang: -7, curve: 0 }, mouth: 'wavy' },
  sad: { eye: { kind: 'open', lidIn: 0.1, lidOut: 0.5, low: 0.2 }, brow: { raise: 2, ang: -9, curve: 2 }, mouth: 'frown', tear: true },
  blink: { eye: { kind: 'arcDown' }, brow: { raise: -2, ang: 0, curve: 3 }, mouth: 'smile' },
  wow: { eye: { kind: 'open', scale: 1.1, iris: 0.72, pupil: 0.6 }, brow: { raise: 12, ang: -3, curve: 6 }, mouth: 'o' },
  grit: { eye: { kind: 'open', lidIn: 0.55, lidOut: 0.12, pupil: 0.8 }, brow: { raise: -10, ang: 11, curve: -2 }, mouth: 'teeth' },
};

function eyeSvg(s: FaceSpec, st: EyeState, sx: number, uid: string): string {
  const e = s.eye, line = e.line ?? '#2a1a16';
  const k = st.scale ?? 1, rx = e.rx * k, ry = e.ry * k;
  const cx = sx * e.x, cy = -e.y;
  const open = `<g transform="translate(${f(cx)} ${f(cy)}) scale(${sx} 1) rotate(${f(-(e.tilt ?? 0))})">`;
  const sw = Math.max(3, e.rx * 0.13);
  if (st.kind === 'arcUp') {
    return `${open}<path d="M ${f(-rx * 0.92)} ${f(ry * 0.22)} Q 0 ${f(-ry * 0.95)} ${f(rx * 0.92)} ${f(ry * 0.22)}" fill="none" stroke="${line}" stroke-width="${f(sw * 1.5)}" stroke-linecap="round"/></g>`;
  }
  if (st.kind === 'arcDown') {
    const l = e.lash ? `<path d="M ${f(rx * 0.75)} ${f(ry * 0.22)} l ${f(rx * 0.3)} ${f(-ry * 0.08)} M ${f(rx * 0.5)} ${f(ry * 0.34)} l ${f(rx * 0.22)} ${f(ry * 0.1)}" stroke="${line}" stroke-width="${f(sw)}" stroke-linecap="round"/>` : '';
    return `${open}<path d="M ${f(-rx * 0.92)} ${f(ry * 0.05)} Q 0 ${f(ry * 0.6)} ${f(rx * 0.92)} ${f(ry * 0.05)}" fill="none" stroke="${line}" stroke-width="${f(sw * 1.4)}" stroke-linecap="round"/>${l}</g>`;
  }
  if (st.kind === 'chevron') {
    return `${open}<path d="M ${f(rx * 0.8)} ${f(-ry * 0.55)} L ${f(-rx * 0.6)} 0 L ${f(rx * 0.8)} ${f(ry * 0.55)}" fill="none" stroke="${line}" stroke-width="${f(sw * 1.5)}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
  }
  const ik = st.iris ?? 1, pk = st.pupil ?? 1, low = (st.low ?? 0) * ry;
  const irx = rx * 0.74 * ik, iry = ry * 0.8 * ik, icy = ry * 0.06 + low;
  let lid = '';
  if (st.lidIn !== undefined || st.lidOut !== undefined) {
    const yi = -ry + 2 * ry * (st.lidIn ?? 0), yo = -ry + 2 * ry * (st.lidOut ?? 0);
    lid = `<path d="M ${f(-rx - 6)} ${f(-ry - 6)} L ${f(rx + 6)} ${f(-ry - 6)} L ${f(rx + 6)} ${f(yo)} L ${f(-rx - 6)} ${f(yi)} Z" fill="${e.lid ?? s.bg}"/>`
      + `<path d="M ${f(-rx - 6)} ${f(yi)} L ${f(rx + 6)} ${f(yo)}" stroke="${line}" stroke-width="${f(sw * 1.5)}" stroke-linecap="round"/>`;
  }
  const pupil = e.slit
    ? `<ellipse cx="0" cy="${f(icy)}" rx="${f(irx * 0.2 * pk)}" ry="${f(iry * 0.78)}" fill="${e.pupil ?? '#14100f'}"/>`
    : e.star
      ? `<ellipse cx="0" cy="${f(icy)}" rx="${f(irx * 0.5 * pk)}" ry="${f(iry * 0.52 * pk)}" fill="${e.pupil ?? '#14100f'}"/>`
      : `<ellipse cx="0" cy="${f(icy)}" rx="${f(irx * 0.5 * pk)}" ry="${f(iry * 0.55 * pk)}" fill="${e.pupil ?? '#14100f'}"/>`;
  const lash = e.lash ? `<path d="M ${f(rx * 0.72)} ${f(-ry * 0.62)} l ${f(rx * 0.34)} ${f(-ry * 0.2)} M ${f(rx * 0.9)} ${f(-ry * 0.3)} l ${f(rx * 0.3)} ${f(-ry * 0.06)}" stroke="${line}" stroke-width="${f(sw * 1.1)}" stroke-linecap="round"/>` : '';
  const body = `${open}<clipPath id="${uid}"><ellipse rx="${f(rx)}" ry="${f(ry)}"/></clipPath>`
    + `<ellipse rx="${f(rx)}" ry="${f(ry)}" fill="${e.sclera ?? '#fffdf6'}"/>`
    + `<g clip-path="url(#${uid})">`
    + `<ellipse cx="0" cy="${f(icy)}" rx="${f(irx)}" ry="${f(iry)}" fill="${e.irisDark}"/>`
    + `<ellipse cx="0" cy="${f(icy + iry * 0.1)}" rx="${f(irx * 0.86)}" ry="${f(iry * 0.86)}" fill="${e.iris}"/>`
    + `<ellipse cx="0" cy="${f(icy + iry * 0.48)}" rx="${f(irx * 0.62)}" ry="${f(iry * 0.36)}" fill="${e.irisLight ?? e.iris}" opacity="0.85"/>`
    + pupil
    + `<ellipse cx="0" cy="${f(-ry * 1.02)}" rx="${f(rx * 1.3)}" ry="${f(ry * 0.5)}" fill="#1a1020" opacity="0.22"/>`
    + lid
    + `</g>`
    + `<ellipse rx="${f(rx)}" ry="${f(ry)}" fill="none" stroke="${line}" stroke-width="${f(sw * 0.7)}"/>`
    + `<path d="M ${f(-rx)} ${f(-ry * 0.12)} A ${f(rx)} ${f(ry)} 0 0 1 ${f(rx)} ${f(-ry * 0.12)}" fill="none" stroke="${line}" stroke-width="${f(sw * 1.5)}" stroke-linecap="round"/>`
    + lash + `</g>`;
  // brilhos (não espelham: a luz vem do mesmo lado nos dois olhos)
  const hy = cy + icy - iry * 0.4 + Math.max(0, ((st.lidIn ?? 0) + (st.lidOut ?? 0)) * ry * 0.5);
  const hi = `<circle cx="${f(cx - irx * 0.36)}" cy="${f(hy)}" r="${f(irx * 0.3)}" fill="#ffffff"/>`
    + `<circle cx="${f(cx + irx * 0.38)}" cy="${f(cy + icy + iry * 0.42)}" r="${f(irx * 0.14)}" fill="#ffffff" opacity="0.9"/>`
    + (e.star ? `<path d="M ${f(cx)} ${f(cy + icy - iry * 0.22)} l 2.2 4.5 l 4.6 1 l -3.4 3.4 l 0.8 4.8 l -4.2 -2.4 l -4.2 2.4 l 0.8 -4.8 l -3.4 -3.4 l 4.6 -1 z" fill="#fff6b0" opacity="0.95"/>` : '');
  return body + hi;
}

function browSvg(s: FaceSpec, st: BrowState, sx: number): string {
  const e = s.eye, b = s.brow;
  const base = -e.y - e.ry - b.gap - st.raise;
  const a = st.ang;
  // local espelhado: −x = canto interno
  return `<g transform="translate(${f(sx * e.x)} 0) scale(${sx} 1)"><path d="M ${f(-b.len / 2)} ${f(base + a)} Q 0 ${f(base - st.curve - Math.abs(a) * 0.15)} ${f(b.len / 2)} ${f(base - a * 0.7)}" fill="none" stroke="${b.color}" stroke-width="${f(b.w)}" stroke-linecap="round"/></g>`;
}

function mouthSvg(s: FaceSpec, kind: State['mouth'], uid: string): string {
  const m = s.mouth, w = m.w, y = -m.y, sw = Math.max(3, w * 0.11);
  const inside = m.inside ?? '#6b1f2a', tongue = m.tongue ?? '#f0707e', teeth = m.teeth ?? '#fffaf0';
  const stroke = `fill="none" stroke="${m.line}" stroke-width="${f(sw)}" stroke-linecap="round" stroke-linejoin="round"`;
  const phil = m.cat ? `<path d="M 0 ${f(y - w * 0.3)} L 0 ${f(y)}" ${stroke}/>` : '';
  let d = '';
  switch (kind) {
    case 'smile':
      d = m.cat
        ? `<path d="M ${f(-w * 0.5)} ${f(y - 3)} Q ${f(-w * 0.26)} ${f(y + w * 0.3)} 0 ${f(y)} Q ${f(w * 0.26)} ${f(y + w * 0.3)} ${f(w * 0.5)} ${f(y - 3)}" ${stroke}/>`
        : `<path d="M ${f(-w * 0.5)} ${f(y - 2)} Q 0 ${f(y + w * 0.34)} ${f(w * 0.5)} ${f(y - 2)}" ${stroke}/>`;
      break;
    case 'open':
      d = `<clipPath id="${uid}"><path d="M ${f(-w * 0.62)} ${f(y - 3)} Q 0 ${f(y + w * 1.05)} ${f(w * 0.62)} ${f(y - 3)} Z"/></clipPath>`
        + `<path d="M ${f(-w * 0.62)} ${f(y - 3)} Q 0 ${f(y + w * 1.05)} ${f(w * 0.62)} ${f(y - 3)} Z" fill="${inside}"/>`
        + `<g clip-path="url(#${uid})"><ellipse cx="0" cy="${f(y + w * 0.5)}" rx="${f(w * 0.36)}" ry="${f(w * 0.22)}" fill="${tongue}"/>`
        + `<rect x="${f(-w * 0.7)}" y="${f(y - 6)}" width="${f(w * 1.4)}" height="${f(w * 0.14 + 6)}" fill="${teeth}"/></g>`
        + `<path d="M ${f(-w * 0.62)} ${f(y - 3)} Q 0 ${f(y + w * 1.05)} ${f(w * 0.62)} ${f(y - 3)} Z" ${stroke}/>`;
      break;
    case 'firm':
      d = `<path d="M ${f(-w * 0.36)} ${f(y + 2)} Q ${f(w * 0.05)} ${f(y - 2)} ${f(w * 0.42)} ${f(y - 2.5)}" ${stroke}/>`;
      break;
    case 'wavy': {
      const q = w / 4;
      d = `<path d="M ${f(-w * 0.5)} ${f(y + 2)} q ${f(q / 2)} ${f(-q * 0.9)} ${f(q)} 0 t ${f(q)} 0 t ${f(q)} 0 t ${f(q)} 0" ${stroke}/>`;
      break;
    }
    case 'frown':
      d = `<path d="M ${f(-w * 0.42)} ${f(y + w * 0.16)} Q 0 ${f(y - w * 0.22)} ${f(w * 0.42)} ${f(y + w * 0.16)}" ${stroke}/>`;
      break;
    case 'o':
      d = `<ellipse cx="0" cy="${f(y + w * 0.16)}" rx="${f(w * 0.24)}" ry="${f(w * 0.32)}" fill="${inside}" stroke="${m.line}" stroke-width="${f(sw)}"/>`
        + `<ellipse cx="0" cy="${f(y + w * 0.3)}" rx="${f(w * 0.13)}" ry="${f(w * 0.1)}" fill="${tongue}"/>`;
      break;
    case 'teeth': {
      const hw = w * 0.56, hh = w * 0.24, cy = y + hh * 0.5;
      d = `<rect x="${f(-hw)}" y="${f(cy - hh)}" width="${f(hw * 2)}" height="${f(hh * 2)}" rx="${f(hh * 0.7)}" fill="${teeth}" stroke="${m.line}" stroke-width="${f(sw)}"/>`
        + `<path d="M ${f(-hw + 3)} ${f(cy)} L ${f(hw - 3)} ${f(cy)} M ${f(-hw * 0.5)} ${f(cy - hh + 2)} L ${f(-hw * 0.5)} ${f(cy + hh - 2)} M 0 ${f(cy - hh + 2)} L 0 ${f(cy + hh - 2)} M ${f(hw * 0.5)} ${f(cy - hh + 2)} L ${f(hw * 0.5)} ${f(cy + hh - 2)}" fill="none" stroke="${m.line}" stroke-width="${f(sw * 0.45)}" stroke-linecap="round"/>`;
      break;
    }
  }
  return phil + d;
}

function cellSvg(s: FaceSpec, expr: Expr, i: number): string {
  const st = STATES[expr];
  const e = s.eye;
  let g = '';
  if (s.under) g += s.under(expr);
  if (s.blush) {
    const o = 0.38 + 0.3 * (st.blush ?? 0);
    for (const sx of [-1, 1]) g += `<ellipse cx="${f(sx * (e.x + e.rx * 0.55))}" cy="${f(-e.y + e.ry * 1.22)}" rx="${f(e.rx * 0.62)}" ry="${f(e.rx * 0.34)}" fill="${s.blush}" opacity="${f(o)}"/>`;
  }
  for (const sx of [-1, 1]) g += eyeSvg(s, st.eye, sx, `e${i}${sx > 0 ? 'a' : 'b'}`);
  for (const sx of [-1, 1]) g += browSvg(s, st.brow, sx);
  if (s.nose) g += `<path d="M ${f(-s.nose.w / 2)} ${f(-s.nose.y)} Q 0 ${f(-s.nose.y + s.nose.w * 0.55)} ${f(s.nose.w / 2)} ${f(-s.nose.y)}" fill="none" stroke="${s.nose.color}" stroke-width="${f(Math.max(2.5, s.nose.w * 0.22))}" stroke-linecap="round"/>`;
  g += mouthSvg(s, st.mouth, `m${i}`);
  if (st.tear) g += `<path d="M ${f(e.x + e.rx * 0.5)} ${f(-e.y + e.ry * 0.75)} q ${f(e.rx * 0.34)} ${f(e.ry * 0.5)} 0 ${f(e.ry * 0.62)} q ${f(-e.rx * 0.34)} ${f(-e.ry * 0.12)} 0 ${f(-e.ry * 0.62)} z" fill="#8fd8ff" stroke="#ffffff" stroke-width="1.5" opacity="0.95"/>`;
  if (s.over) g += s.over(expr);
  return g;
}

/** Gera e registra a textura `name` (atlas 4×2). `wMm`/`hMm` = tamanho real da casca do rosto. */
export async function buildFaceAtlas(name: string, s: FaceSpec, wMm: number, hMm: number): Promise<void> {
  let body = '';
  let defs = '';
  EXPRESSIONS.forEach((expr, i) => {
    const colI = i % 4, row = Math.floor(i / 4);
    defs += `<clipPath id="cell${i}"><rect x="${colI * 256}" y="${row * 256}" width="256" height="256"/></clipPath>`;
    body += `<g clip-path="url(#cell${i})"><g transform="translate(${colI * 256 + 128} ${row * 256 + 128}) scale(${f(256 / wMm)} ${f(256 / hMm)})">${cellSvg(s, expr, i)}</g></g>`;
  });
  // A lib rasteriza sempre em quadrado: 1024×1024 com o conteúdo 1024×512 esticado na vertical
  // (as UVs não mudam: cada célula continua ocupando 0.25 × 0.5).
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 512" preserveAspectRatio="none">`
    + `<defs>${defs}</defs><rect width="1024" height="512" fill="${s.bg}"/>${body}</svg>`;
  await svgTexture(name, svg, 1024, 92);
}
