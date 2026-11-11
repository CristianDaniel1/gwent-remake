import { findCardDef, type DeckIssue } from '@gwent/engine';
import { useTranslation } from 'react-i18next';
import { useCardText } from '@/shared/i18n/useCardText';

/**
 * Builds a translator for deck validation issues.
 *
 * @returns A function that turns an issue into translated text.
 */
export const useIssueText = () => {
  const { t: translate } = useTranslation();
  const cardText = useCardText();
  const cardName = (id: number) => {
    const def = findCardDef(id);
    return def ? cardText(def).name : String(id);
  };
  return (issue: DeckIssue) =>
    translate(`deckBuilder.issue.${issue.code}`, {
      ...issue,
      ...('cardId' in issue ? { card: cardName(issue.cardId) } : {}),
    });
};
