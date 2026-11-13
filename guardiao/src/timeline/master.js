// Timeline principal: 90 s = cinco sequências de 18 s. Tudo no filme é função do tempo absoluto T.
export const FPS = 60, SEQ_LEN = 18, SEQ_COUNT = 5, DURATION = SEQ_LEN * SEQ_COUNT, FRAMES = DURATION * FPS;
export const SEQUENCES = [
  { id: 1, title: 'A noite em que o céu morreu' },
  { id: 2, title: 'O oceano acima das nuvens' },
  { id: 3, title: 'O templo dos mil universos' },
  { id: 4, title: 'O despertar da última estrela' },
  { id: 5, title: 'Quando o universo voltou a respirar' },
];
/** tempo absoluto → { index 0..4, t local 0..18 } */
export function locate(T) { const c = Math.min(Math.max(T, 0), DURATION - 1e-4), index = Math.min(SEQ_COUNT - 1, Math.floor(c / SEQ_LEN)); return { index, t: c - index * SEQ_LEN, T: c }; }
