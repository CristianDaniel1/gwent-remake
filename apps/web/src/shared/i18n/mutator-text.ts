import type { TFunction } from 'i18next';
import type { MutatorTextPart } from '../interfaces/mutator-text';

const translatedPart = (translate: TFunction, id: string, part: MutatorTextPart): string => {
  const key = `mutators.${id}.${part}`;
  const value = translate(key as never) as unknown as string;
  return value === key ? '' : value;
};

/**
 * Translates the name and description of a match rule.
 *
 * @param translate - Translation function.
 * @param id - Rule id.
 * @returns The name (the id when untranslated) and the description.
 */
export const mutatorText = (
  translate: TFunction,
  id: string,
): { name: string; description: string } => ({
  name: translatedPart(translate, id, 'name') || id,
  description: translatedPart(translate, id, 'description'),
});
