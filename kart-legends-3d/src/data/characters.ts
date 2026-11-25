import type { CharacterId, KartId } from './ids';
import type { UnlockRule } from './unlocks';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  title: string;
  bio: string;
  /** Cor principal (hex) usada em HUD, minimapa e interface. */
  color: string;
  accent: string;
  /** Kart preferido (usado pela IA e como sugestão na seleção). */
  kartId: KartId;
  unlock: UnlockRule;
}

export const CHARACTERS: readonly CharacterDef[] = [
  { id: 'nilo', name: 'Nilo', title: 'Raposa exploradora', bio: 'Conhece cada atalho antes mesmo de a pista existir no mapa.', color: '#f2762e', accent: '#fff1d6', kartId: 'flecha', unlock: { type: 'initial' } },
  { id: 'boro', name: 'Boro', title: 'Pequeno inventor', bio: 'Construiu o próprio kart com sobras de relógio e muita teimosia.', color: '#c9963a', accent: '#5ad1c8', kartId: 'engrenagem', unlock: { type: 'initial' } },
  { id: 'lumi', name: 'Lumi', title: 'Piloto das estrelas', bio: 'Caiu de uma constelação e decidiu ficar pelas curvas.', color: '#7c6cf2', accent: '#ffe66b', kartId: 'cometa', unlock: { type: 'initial' } },
  { id: 'kora', name: 'Tiko', title: 'Guardiã do bosque', bio: 'Corre para lembrar que a floresta também tem pressa.', color: '#3fa650', accent: '#f4d35e', kartId: 'broto', unlock: { type: 'initial' } },
  { id: 'tiko', name: 'Mia', title: 'Mecânica veloz', bio: 'Troca quatro pneus no tempo de um miniturbo.', color: '#e23b4e', accent: '#ffd23f', kartId: 'faisca', unlock: { type: 'races', count: 3 } },
  { id: 'mavi', name: 'Mavi', title: 'Navegadora aventureira', bio: 'Lê o vento como quem lê uma carta náutica.', color: '#1f8fc4', accent: '#ffb24d', kartId: 'mare', unlock: { type: 'trophy', cup: 'aurora', min: 'bronze' } },
  { id: 'runi', name: 'Runi', title: 'Corredor das dunas', bio: 'Aprendeu a derrapar em areia antes de aprender a andar.', color: '#d9a441', accent: '#7a3b1e', kartId: 'duna', unlock: { type: 'trophy', cup: 'aurora', min: 'gold' } },
  { id: 'zera', name: 'Zera', title: 'Exploradora do gelo', bio: 'Fria nas retas, implacável nas curvas congeladas.', color: '#58c7e8', accent: '#f4fbff', kartId: 'geada', unlock: { type: 'trophy', cup: 'eclipse', min: 'bronze' } },
  { id: 'capi', name: 'Capi', title: 'Capivara sossegada', bio: 'Nunca tem pressa, mas sempre chega: a tangerina na cabeça nunca caiu.', color: '#ff5fa2', accent: '#ffb547', kartId: 'mare', unlock: { type: 'wins', count: 3 } },
  { id: 'tuca', name: 'Tuca', title: 'Tucano acrobata', bio: 'Pilota de bico erguido e faz cada miniturbo parecer um voo rasante.', color: '#9bd43a', accent: '#ff9a1f', kartId: 'faisca', unlock: { type: 'turbo3', count: 40 } },
  { id: 'yuki', name: 'Yuki', title: 'Ninja da neve', bio: 'Desce a montanha de prancha e sobe ao pódio de kart, sempre com o cachecol ao vento.', color: '#2ec4d6', accent: '#ff7a59', kartId: 'geada', unlock: { type: 'shop' } },
  { id: 'kaito', name: 'Kaito', title: 'Ninja da lua', bio: 'Rival declarado da Yuki, corre em silêncio sob o luar e só sorri de canto quando cruza a linha primeiro.', color: '#6b5cff', accent: '#c9d2e6', kartId: 'cometa', unlock: { type: 'shop' } },
  { id: 'ren', name: 'Ren', title: 'Ninja do trovão', bio: 'Chega antes do estrondo: acelera tão rápido que o cabelo nunca mais assentou.', color: '#ffcf2e', accent: '#7a3cff', kartId: 'faisca', unlock: { type: 'shop' } },
  { id: 'sora', name: 'Sora', title: 'Ninja do vento', bio: 'Lê o vento como quem lê um mapa e guarda uma pipa nas costas para quando a pista acabar.', color: '#3ee0c0', accent: '#ffffff', kartId: 'mare', unlock: { type: 'shop' } },
];

export const CHARACTER_BY_ID = Object.fromEntries(CHARACTERS.map((c) => [c.id, c])) as Record<CharacterId, CharacterDef>;
