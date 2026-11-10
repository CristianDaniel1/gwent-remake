import type { TFunction } from 'i18next';

/**
 * Name and description of a match rule. Rules added at runtime (extensions) may have no
 * translation: their id is shown instead.
 */
export function mutatorText(t: TFunction, id: string): { name: string; description: string } {
  const key = (part: 'name' | 'description') => `mutators.${id}.${part}`;
  const text = (part: 'name' | 'description') => {
    const value = t(key(part) as never) as unknown as string;
    return value === key(part) ? '' : value;
  };
  return { name: text('name') || id, description: text('description') };
}
