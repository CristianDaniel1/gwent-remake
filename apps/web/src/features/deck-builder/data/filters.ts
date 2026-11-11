import type { CardFilter } from '../interfaces/filters';

/** Collection filters, in display order. */
export const CARD_FILTERS = [
  'all',
  'close',
  'ranged',
  'siege',
  'hero',
  'weather',
  'special',
] as const;

/** Icon of each collection filter. */
export const FILTER_ICONS: Record<CardFilter, string> = {
  all: 'deck_stats_count',
  close: 'card_row_close',
  ranged: 'card_row_ranged',
  siege: 'card_row_siege',
  hero: 'deck_stats_hero',
  weather: 'card_weather_frost',
  special: 'deck_stats_special',
};

/** Translation key of each collection filter. */
export const FILTER_LABELS: Record<CardFilter, string> = {
  all: 'deck.filterAll',
  close: 'deck.filterClose',
  ranged: 'deck.filterRanged',
  siege: 'deck.filterSiege',
  hero: 'deck.filterHero',
  weather: 'deck.filterWeather',
  special: 'deck.filterSpecial',
};
