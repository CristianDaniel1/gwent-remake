import type { Faction } from '@gwent/engine';
import { useTranslation } from 'react-i18next';

/**
 * Builds a function that translates a faction's name or description.
 *
 * @returns The faction translator.
 */
export const useFactionText = () => {
  const { t: translate } = useTranslation('cards');
  return (faction: Faction | string, part: 'name' | 'description' = 'name') =>
    translate(`faction.${faction}.${part}` as never) as unknown as string;
};
