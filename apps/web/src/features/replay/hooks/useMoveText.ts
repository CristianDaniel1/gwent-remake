import {
  defOf,
  type CardInstanceId,
  type GameAction,
  type GameState,
  type PlayerId,
} from '@gwent/engine';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useCardText } from '@/shared/i18n/useCardText';

/**
 * Describes a move in words ("play Geralt (Close Combat)"). `before` is the state the move
 * was made in: it has the cards and the pending choice the move refers to.
 */
export function useMoveText(names: Record<PlayerId, string>) {
  const { t } = useTranslation();
  const cardText = useCardText();

  return useCallback(
    (action: GameAction, before: GameState): string => {
      const card = (id: CardInstanceId) =>
        before.cards[id] ? cardText(defOf(before, id)).name : '?';
      switch (action.type) {
        case 'PLAY_CARD':
          if (action.targetId) {
            return t('replay.move.playTarget', {
              card: card(action.cardId),
              target: card(action.targetId),
            });
          }
          if (action.row) {
            return t('replay.move.playRow', {
              card: card(action.cardId),
              row: t(`match.choice.${action.row}`),
            });
          }
          return t('replay.move.play', { card: card(action.cardId) });
        case 'ACTIVATE_LEADER':
          return t('replay.move.leader');
        case 'PASS':
          return t('replay.move.pass');
        case 'REDRAW':
          return t('replay.move.redraw', { card: card(action.cardId) });
        case 'END_REDRAW':
          return t('replay.move.endRedraw');
        case 'CHOOSE': {
          const options = before.pendingChoice?.options ?? [];
          const choice = action.optionIds
            .map((id) => {
              const option = options.find((o) => o.id === id);
              if (option?.cardId) return card(option.cardId);
              if (option?.row) return t(`match.choice.${option.row}`);
              if (option?.player) return names[option.player];
              return id;
            })
            .join(', ');
          return t('replay.move.choose', { choice });
        }
      }
    },
    [t, cardText, names],
  );
}
