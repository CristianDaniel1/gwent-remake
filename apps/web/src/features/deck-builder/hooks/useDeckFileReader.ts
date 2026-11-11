import type { DeckList } from '@gwent/engine';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { parseDeckFile } from '../lib/deck-file';

/**
 * Parses uploaded deck files and keeps the status message to show for them.
 *
 * @returns The current message, its setter and the deck reader.
 */
export const useDeckFileReader = () => {
  const { t: translate } = useTranslation('game');
  const [message, setMessage] = useState<string | null>(null);

  const readDeck = (text: string): DeckList | null => {
    const result = parseDeckFile(text);
    if (result.ok) {
      setMessage(null);
      return result.deck;
    }
    setMessage(
      translate(result.error === 'notParsable' ? 'deck.uploadNotParsable' : 'deck.uploadBadFormat'),
    );
    return null;
  };

  return { message, setMessage, readDeck };
};
