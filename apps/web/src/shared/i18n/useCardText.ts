import type { CardDef } from '@gwent/engine';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { SILENT_ABILITIES } from '../data/abilities';
import type { AbilityText, CardText } from '../interfaces/card-text';

const translated = (translate: TFunction<'cards'>, key: string): string | null => {
  const value = translate(key as never) as unknown as string;
  return value === key ? null : value;
};

const abilityText = (translate: TFunction<'cards'>, id: string): AbilityText | null => {
  if (SILENT_ABILITIES.has(id)) return null;
  const description = translated(translate, `ability.${id}.description`);
  if (!description) return null;
  return { name: translated(translate, `ability.${id}.name`) ?? '', description };
};

const abilityIds = (def: CardDef): string[] => {
  const ids = [...def.abilities].reverse();
  if (def.type === 'unit' && def.row === 'agile') ids.push('agile');
  if (def.hero) ids.push('hero');
  return ids;
};

/**
 * Translates the name and abilities of a card.
 *
 * @param translate - Translation function of the cards namespace.
 * @param def - Card definition.
 * @returns The card name and abilities.
 */
export const cardTextOf = (translate: TFunction<'cards'>, def: CardDef): CardText => ({
  name: translated(translate, `card.${def.id}`) ?? `card.${def.id}`,
  abilities: abilityIds(def)
    .map((id) => abilityText(translate, id))
    .filter((ability): ability is AbilityText => !!ability),
});

/**
 * Builds a function that translates a card's name and abilities.
 *
 * @returns The card translator.
 */
export const useCardText = () => {
  const { t: translate } = useTranslation('cards');
  return (def: CardDef): CardText => cardTextOf(translate, def);
};
