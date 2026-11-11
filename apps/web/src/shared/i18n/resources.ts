import enCards from './locales/en/cards.json';
import enCommon from './locales/en/common.json';
import enGame from './locales/en/game.json';
import esCards from './locales/es/cards.json';
import esCommon from './locales/es/common.json';
import esGame from './locales/es/game.json';
import ptBRCards from './locales/pt-BR/cards.json';
import ptBRCommon from './locales/pt-BR/common.json';
import ptBRGame from './locales/pt-BR/game.json';

export const SUPPORTED_LANGUAGES = ['pt-BR', 'en', 'es'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const defaultNS = 'common';

export const resources = {
  'pt-BR': { common: ptBRCommon, cards: ptBRCards, game: ptBRGame },
  en: { common: enCommon, cards: enCards, game: enGame },
  es: { common: esCommon, cards: esCards, game: esGame },
} as const satisfies Record<Language, Record<string, unknown>>;
