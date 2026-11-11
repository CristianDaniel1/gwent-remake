import type { DeckList } from '@gwent/engine';

export type ImportResult =
  { ok: true; deck: DeckList } | { ok: false; error: 'notParsable' | 'badFormat' };
