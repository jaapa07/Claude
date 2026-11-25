import { A } from './Assets';
import { audio } from './Audio';

/** Conquistas, estatísticas de carreira, recordes dos minijogos e bolas desbloqueáveis (salvos no navegador). */
export type AchId = keyof typeof ACH;
export const ACH = {
  primeiro_gol: { name: 'Primeiro Gol', desc: 'Marque um gol em qualquer partida.', goal: 1 },
  bicicleta: { name: 'Bicicleta Voadora', desc: 'Marque um gol de bicicleta.', goal: 1 },
  tesoura: { name: 'Tesourada', desc: 'Marque um gol de tesoura.', goal: 1 },
  peixinho: { name: 'Mergulho na Areia', desc: 'Marque um gol de peixinho.', goal: 1 },
  chapeu: { name: 'Chapéu Elegante', desc: 'Dê 5 chapéus (somando todas as partidas).', goal: 5 },
  hat_trick: { name: 'Hat-trick', desc: 'Um mesmo jogador marca 3 gols numa partida.', goal: 1 },
  goleada: { name: 'Goleada', desc: 'Vença por 5 gols de diferença ou mais.', goal: 1 },
  fogo: { name: 'Pegando Fogo', desc: 'Ative o Modo Fogo 5 vezes.', goal: 5 },
  combo: { name: 'Show de Bola', desc: 'Chegue ao multiplicador x5.', goal: 1 },
  muralha: { name: 'Muralha', desc: 'Vença sem sofrer gols.', goal: 1 },
  veterano: { name: 'Veterano', desc: 'Vença 5 partidas.', goal: 5 },
  sangue_frio: { name: 'Sangue Frio', desc: 'Vença uma disputa de pênaltis.', goal: 1 },
  turne: { name: 'Turnê da Areia', desc: 'Jogue nas 3 arenas.', goal: 3 },
  campeao: { name: 'Campeão da Copa', desc: 'Vença a Copa Areia Quente.', goal: 1 },
  aluno: { name: 'Aluno Aplicado', desc: 'Complete todos os desafios do treino.', goal: 1 },
  pk_ouro: { name: 'Pênaltis de Ouro', desc: 'Converta 5 de 5 no minijogo de pênaltis.', goal: 1 },
  embaixadinha: { name: 'Rei da Embaixadinha', desc: 'Faça 25 embaixadinhas seguidas.', goal: 1 },
  mira: { name: 'Mira Laser', desc: 'Faça 500 pontos no Tiro ao Alvo.', goal: 1 },
} as const;

export const BALLS = [
  { id: 'classica', name: 'Clássica', tex: 'textures/props/ball.png', need: 'Liberada', unlocked: () => progress.ballUnlocked('classica') },
  { id: 'dourada', name: 'Dourada', tex: 'textures/props/ball_gold.png', need: '5 conquistas', unlocked: () => progress.ballUnlocked('dourada') },
  { id: 'neon', name: 'Neon', tex: 'textures/props/ball_neon.png', need: '10 conquistas', unlocked: () => progress.ballUnlocked('neon') },
  { id: 'retro', name: 'Retrô', tex: 'textures/props/ball_retro.png', need: 'Campeão da Copa', unlocked: () => progress.ballUnlocked('retro') },
] as const;

type Data = {
  ach: Record<string, number>; // progresso (>= goal = desbloqueada)
  unlockedAt: Record<string, number>;
  stats: { matches: number; wins: number; draws: number; losses: number; goals: number; conceded: number; styleBest: number };
  records: { pk: number; juggle: number; target: number };
  arenas: string[];
  ball: string;
};
const DEF: Data = { ach: {}, unlockedAt: {}, stats: { matches: 0, wins: 0, draws: 0, losses: 0, goals: 0, conceded: 0, styleBest: 0 }, records: { pk: 0, juggle: 0, target: 0 }, arenas: [], ball: 'classica' };

class ProgressStore {
  data: Data;
  constructor() {
    let d: Data;
    try { const s = localStorage.getItem('aq.progress'); d = s ? { ...structuredClone(DEF), ...JSON.parse(s) } : structuredClone(DEF); } catch { d = structuredClone(DEF); }
    d.stats = { ...DEF.stats, ...d.stats }; d.records = { ...DEF.records, ...d.records };
    this.data = d;
    for (const id of ['classica', 'dourada', 'neon', 'retro']) if (this.ballUnlocked(id)) this.ballsSeen.add(id);
  }
  save() { try { localStorage.setItem('aq.progress', JSON.stringify(this.data)); } catch { /* sem armazenamento */ } }
  has(id: AchId) { return (this.data.ach[id] ?? 0) >= ACH[id].goal; }
  count() { return (Object.keys(ACH) as AchId[]).filter((k) => this.has(k)).length; }
  /** Soma progresso; mostra aviso quando desbloqueia. */
  add(id: AchId, n = 1) {
    if (this.has(id)) return;
    this.data.ach[id] = Math.min(ACH[id].goal, (this.data.ach[id] ?? 0) + n);
    if (this.has(id)) { this.data.unlockedAt[id] = Date.now(); toast(ACH[id].name, ACH[id].desc); this.checkBalls(); }
    this.save();
  }
  set(id: AchId, v: number) { const cur = this.data.ach[id] ?? 0; if (v > cur) this.add(id, v - cur); }
  record(k: keyof Data['records'], v: number) {
    const best = v > this.data.records[k];
    if (best) { this.data.records[k] = v; this.save(); }
    return best;
  }
  visitArena(id: string) {
    if (!this.data.arenas.includes(id)) { this.data.arenas.push(id); this.save(); }
    this.set('turne', this.data.arenas.length);
  }
  ballTex() { const b = BALLS.find((x) => x.id === this.data.ball && x.unlocked()); return (b ?? BALLS[0]).tex; }
  ballUnlocked(id: string) {
    return id === 'classica' || (id === 'dourada' && this.count() >= 5) || (id === 'neon' && this.count() >= 10) || (id === 'retro' && this.has('campeao'));
  }
  private ballsSeen = new Set<string>();
  private checkBalls() {
    for (const b of BALLS) if (b.unlocked() && !this.ballsSeen.has(b.id)) { this.ballsSeen.add(b.id); setTimeout(() => toast(`Bola ${b.name} liberada!`, 'Escolha em Conquistas → Bola da partida.'), 1800); }
  }
  reset() { this.data = structuredClone(DEF); this.save(); }
}
export const progress = new ProgressStore();

let toastBox: HTMLElement | null = null;
export function toast(title: string, desc: string) {
  if (!toastBox) { toastBox = document.createElement('div'); toastBox.className = 'toasts'; document.body.appendChild(toastBox); }
  const e = document.createElement('div');
  e.className = 'toast';
  e.innerHTML = `<img src="${A('ui/star.png')}"><div><b>${title}</b><span>${desc}</span></div>`;
  toastBox.appendChild(e);
  try { audio.play('combo', 0.8); } catch { /* áudio ainda não iniciado */ }
  setTimeout(() => e.classList.add('out'), 3800);
  setTimeout(() => e.remove(), 4400);
}
