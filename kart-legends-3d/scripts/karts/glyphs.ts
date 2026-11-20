/** Glifos autorais desenhados a traço (sem depender de fontes instaladas). Caixa de 10 × 16 por glifo. */
export const GLYPHS: Record<string, string> = {
  '1': 'M3,4.5 L6,1.5 L6,15 M3,15 L9,15',
  '2': 'M2,4.5 Q2,1.5 5,1.5 Q8,1.5 8,4.5 Q8,7.5 2,15 L8.5,15',
  '3': 'M2,2 L8,2 L5,7 Q8.5,7 8.5,11 Q8.5,15 5,15 Q2.5,15 2,13',
  '4': 'M7,15 L7,1.5 L1.5,11 L9,11',
  '5': 'M8,1.5 L3,1.5 L2.5,7.5 Q5,6 7,7.5 Q9,9.5 8,12.5 Q6.5,15.5 2,14',
  '6': 'M7.5,1.5 Q2,5 2,11 Q2,15 5,15 Q8.2,15 8.2,11.5 Q8.2,8.5 5,8.5 Q2.5,8.5 2,11',
  '7': 'M2,1.5 L8.5,1.5 L4.5,15',
  '8': 'M5,8 Q1.5,6.5 2,4 Q2.5,1.5 5,1.5 Q7.5,1.5 8,4 Q8.5,6.5 5,8 Q1.2,9.5 1.5,12 Q2,15 5,15 Q8,15 8.5,12 Q8.8,9.5 5,8',
  K: 'M2,1.5 L2,15 M8.5,1.5 L2,9 M4.5,6.5 L8.8,15',
  A: 'M1.2,15 L5,1.5 L8.8,15 M2.8,10.5 L7.2,10.5',
  R: 'M2,15 L2,1.5 L5.5,1.5 Q8.5,1.5 8.5,5 Q8.5,8.5 5.5,8.5 L2,8.5 M5.2,8.5 L8.8,15',
  T: 'M1.2,1.5 L8.8,1.5 M5,1.5 L5,15',
  L: 'M2.2,1.5 L2.2,15 L8.6,15',
  E: 'M8.4,1.5 L2.2,1.5 L2.2,15 L8.4,15 M2.2,8 L7.2,8',
  G: 'M8.4,4 Q7.5,1.5 5,1.5 Q1.5,1.5 1.5,8.2 Q1.5,15 5,15 Q8.6,15 8.6,10.5 L8.6,9 L5.4,9',
  N: 'M2,15 L2,1.5 L8.2,15 L8.2,1.5',
  D: 'M2,1.5 L2,15 L4.6,15 Q8.8,15 8.8,8.2 Q8.8,1.5 4.6,1.5 Z',
  S: 'M8.2,3.6 Q7.6,1.5 5,1.5 Q2,1.5 2,4.6 Q2,7.4 5,8.2 Q8.4,9 8.4,11.8 Q8.4,15 5,15 Q2.2,15 1.6,12.6',
};

/** Caminhos SVG de um texto, com avanço de 11 unidades por glifo (espaço = 6). */
export function textPaths(text: string, x: number, y: number, scale: number, attrs: string): { svg: string; width: number } {
  let cx = 0, svg = '';
  for (const ch of text) {
    if (ch === ' ') { cx += 6; continue; }
    const d = GLYPHS[ch];
    if (!d) throw new Error(`glifo ausente: ${ch}`);
    svg += `<path d="${d}" transform="translate(${(x + cx * scale).toFixed(2)},${y}) scale(${scale})" ${attrs}/>`;
    cx += 11;
  }
  return { svg, width: (cx - 1) * scale };
}
