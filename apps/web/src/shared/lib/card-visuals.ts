import type { CardDef } from '@gwent/engine';
import { assets } from './assets';

const ABILITY_ICONS = new Set([
  'agile',
  'avenger',
  'berserker',
  'bond',
  'horn',
  'mardroeme',
  'medic',
  'morale',
  'muster',
  'scorch',
  'spy',
]);

/** Strength badge (top-left corner). */
export function powerIcon(def: CardDef): string | null {
  if (def.type === 'leader') return null;
  if (def.hero) return assets.icon('power_hero');
  if (def.type === 'weather' || def.type === 'special')
    return assets.icon(`power_${def.abilities[0]}`);
  return assets.icon('power_normal');
}

/** Row icon (bottom-right corner), units only. */
export function rowIcon(def: CardDef): string | null {
  return def.type === 'unit' && def.row ? assets.icon(`card_row_${def.row}`) : null;
}

/** Main ability icon (bottom center), units only. */
export function abilityIcon(def: CardDef): string | null {
  if (def.type !== 'unit') return null;
  let key = def.abilities.at(-1) ?? (def.row === 'agile' ? 'agile' : null);
  if (!key) return null;
  if (key.startsWith('scorch')) key = 'scorch';
  if (key.startsWith('avenger')) key = 'avenger';
  return ABILITY_ICONS.has(key) ? assets.icon(`card_ability_${key}`) : null;
}
