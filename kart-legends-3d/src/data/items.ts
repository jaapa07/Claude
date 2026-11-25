import type { ItemId } from './ids';

export interface ItemDef {
  id: ItemId;
  name: string;
  description: string;
  color: string;
  /** Duração do efeito em segundos (0 = instantâneo). */
  duration: number;
  /** Intervalo mínimo, em segundos, antes de o piloto poder sortear outro item. */
  cooldown: number;
}

export const ITEMS: readonly ItemDef[] = [
  { id: 'pulso-solar', name: 'Pulso Solar', description: 'Aceleração temporária.', color: '#ffb22e', duration: 2.2, cooldown: 1.5 },
  { id: 'bolha-guardia', name: 'Bolha Guardiã', description: 'Protege contra um impacto.', color: '#4fd8e8', duration: 8, cooldown: 2 },
  { id: 'nevoa-prisma', name: 'Névoa Prisma', description: 'Deixa uma nuvem que faz rodar quem a atravessa.', color: '#c77dff', duration: 12, cooldown: 2 },
  { id: 'faisca-rastreadora', name: 'Faísca Rastreadora', description: 'Persegue o piloto à frente. Bolha, névoa ou vento a destroem.', color: '#ff5b3a', duration: 7, cooldown: 2.5 },
  { id: 'onda-vento', name: 'Onda de Vento', description: 'Empurra adversários próximos e desfaz faíscas.', color: '#9cf0c3', duration: 0.6, cooldown: 2 },
  { id: 'cristal-salto', name: 'Cristal de Salto', description: 'Um salto para passar por cima de obstáculos e cortar caminho.', color: '#7aa8ff', duration: 0, cooldown: 1.5 },
  { id: 'raio-corrente', name: 'Raio Corrente', description: 'Freia o piloto à frente e salta para os seguintes, cada vez mais fraco. A bolha o aterra.', color: '#d4ff3a', duration: 1.6, cooldown: 2.5 },
  { id: 'cometa-guia', name: 'Cometa Guia', description: 'Piloto automático veloz pela linha ideal que tira rivais do caminho. Só para quem está bem atrás.', color: '#ff6fae', duration: 3.2, cooldown: 3 },
];
export const ITEM_BY_ID = Object.fromEntries(ITEMS.map((i) => [i.id, i])) as Record<ItemId, ItemDef>;
