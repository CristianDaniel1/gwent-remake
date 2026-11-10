import type { CardDef } from '@gwent/engine';
import { useTranslation } from 'react-i18next';

export interface AbilityText {
  name: string;
  description: string;
}

export interface CardText {
  name: string;
  abilities: AbilityText[];
}

/** Internal markers without their own text. */
const SILENT = new Set(['vildkarrl', 'storm']);

/**
 * Translated name and descriptions of a card. The keys come from the catalog
 * (`cards:card.<id>`, `cards:ability.<id>`).
 */
export function useCardText() {
  const { t } = useTranslation('cards');
  const text = (key: string) => t(key as never) as unknown as string;
  const has = (key: string) => text(key) !== key;

  return (def: CardDef): CardText => {
    const ability = (id: string): AbilityText | null => {
      if (SILENT.has(id) || !has(`ability.${id}.description`)) return null;
      return {
        name: has(`ability.${id}.name`) ? text(`ability.${id}.name`) : '',
        description: text(`ability.${id}.description`),
      };
    };
    const ids = [...def.abilities].reverse();
    if (def.type === 'unit' && def.row === 'agile') ids.push('agile');
    if (def.hero) ids.push('hero');
    return {
      name: text(`card.${def.id}`),
      abilities: ids.map(ability).filter((a): a is AbilityText => a !== null),
    };
  };
}
