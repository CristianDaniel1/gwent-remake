import type { CardDef } from '@gwent/engine';

/** Collection filters. */
export const CARD_FILTERS = [
  'all',
  'close',
  'ranged',
  'siege',
  'hero',
  'weather',
  'special',
] as const;
export type CardFilter = (typeof CARD_FILTERS)[number];

export function matchesFilter(def: CardDef, filter: CardFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'close':
    case 'ranged':
      return def.type === 'unit' && (def.row === filter || def.row === 'agile');
    case 'siege':
      return def.type === 'unit' && def.row === 'siege';
    case 'hero':
      return def.hero;
    case 'weather':
      return def.type === 'weather';
    case 'special':
      return def.type === 'special';
  }
}

/** Icon of each filter. */
export const FILTER_ICONS: Record<CardFilter, string> = {
  all: 'deck_stats_count',
  close: 'card_row_close',
  ranged: 'card_row_ranged',
  siege: 'card_row_siege',
  hero: 'deck_stats_hero',
  weather: 'card_weather_frost',
  special: 'deck_stats_special',
};

/** i18n (game namespace, deck section). */
export const FILTER_LABELS: Record<CardFilter, string> = {
  all: 'deck.filterAll',
  close: 'deck.filterClose',
  ranged: 'deck.filterRanged',
  siege: 'deck.filterSiege',
  hero: 'deck.filterHero',
  weather: 'deck.filterWeather',
  special: 'deck.filterSpecial',
};
