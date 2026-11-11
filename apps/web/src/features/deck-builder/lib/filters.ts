import type { CardDef } from '@gwent/engine';
import type { CardFilter } from '../interfaces/filters';

/**
 * Checks whether a card belongs to a collection filter.
 *
 * @param def - Card definition.
 * @param filter - Selected filter.
 * @returns True when the card matches the filter.
 */
export const matchesFilter = (def: CardDef, filter: CardFilter): boolean => {
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
};
