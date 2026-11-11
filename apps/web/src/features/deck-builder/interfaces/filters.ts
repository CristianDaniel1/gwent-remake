import type { CARD_FILTERS } from '../data/filters';

export type CardFilter = (typeof CARD_FILTERS)[number];
