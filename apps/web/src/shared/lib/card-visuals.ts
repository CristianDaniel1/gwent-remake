import type { CardDef } from '@gwent/engine';
import { assets } from './assets';
import { ABILITY_ICONS } from '../data/abilities';

/**
 * Finds the strength badge image of a card.
 *
 * @param def - Card definition.
 * @returns The image URL, or null for leaders.
 */
export const powerIcon = (def: CardDef): string | null => {
  if (def.type === 'leader') return null;
  if (def.hero) return assets.icon('power_hero');
  if (def.type === 'weather' || def.type === 'special')
    return assets.icon(`power_${def.abilities[0]}`);
  return assets.icon('power_normal');
};

/**
 * Finds the row icon of a unit card.
 *
 * @param def - Card definition.
 * @returns The image URL, or null.
 */
export const rowIcon = (def: CardDef): string | null =>
  def.type === 'unit' && def.row ? assets.icon(`card_row_${def.row}`) : null;

/**
 * Finds the main ability icon of a unit card.
 *
 * @param def - Card definition.
 * @returns The image URL, or null.
 */
export const abilityIcon = (def: CardDef): string | null => {
  if (def.type !== 'unit') return null;
  let key = def.abilities.at(-1) ?? (def.row === 'agile' ? 'agile' : null);
  if (!key) return null;
  if (key.startsWith('scorch')) key = 'scorch';
  if (key.startsWith('avenger')) key = 'avenger';
  return ABILITY_ICONS.has(key) ? assets.icon(`card_ability_${key}`) : null;
};
