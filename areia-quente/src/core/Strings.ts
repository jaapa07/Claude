import S from '../data/strings.pt-BR.json';

const strings = S as Record<string, any>;
/** Texto em pt-BR; nenhum texto de interface fica fixo no código. */
export const t = (k: string): string => (typeof strings[k] === 'string' ? strings[k] : k);
export const tips = (): string[] => strings.tips as string[];
