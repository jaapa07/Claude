import { useColorScheme } from 'react-native';

const light = {
  bg: '#FFF8F3',
  card: '#FFFFFF',
  text: '#2A1E17',
  muted: '#8A7466',
  border: '#F0E2D8',
  primary: '#F2542D',
  primaryText: '#FFFFFF',
  chip: '#FCEADF',
  tiktok: '#111111',
  instagram: '#C13584',
  danger: '#C62828',
};

const dark: typeof light = {
  bg: '#16110E',
  card: '#221A15',
  text: '#F7EDE6',
  muted: '#B39E90',
  border: '#3A2D25',
  primary: '#FF6B43',
  primaryText: '#1A0F0A',
  chip: '#33251D',
  tiktok: '#F2F2F2',
  instagram: '#E1306C',
  danger: '#EF5350',
};

export type Theme = typeof light;

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light;
}

export const CATEGORY_EMOJI: Record<string, string> = {
  Doces: '🍫',
  Salgados: '🧀',
  Massas: '🍝',
  Carnes: '🍗',
  Saudável: '🥗',
  Bebidas: '🧋',
  Airfryer: '🔥',
};
