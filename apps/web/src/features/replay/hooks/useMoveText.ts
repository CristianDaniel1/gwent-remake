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
 * Builds a function that describes a move in words.
 *
 * @param names - Player names.
 * @returns The move describer.
 */
export const useMoveText = (names: Record<PlayerId, string>) => {
  const { t: translate } = useTranslation();
  const cardText = useCardText();

  return useCallback(
    (action: GameAction, before: GameState): string => {
      const card = (id: CardInstanceId) =>
        before.cards[id] ? cardText(defOf(before, id)).name : '?';
      switch (action.type) {
        case 'PLAY_CARD':
          if (action.targetId) {
            return translate('replay.move.playTarget', {
              card: card(action.cardId),
              target: card(action.targetId),
            });
          }
          if (action.row) {
            return translate('replay.move.playRow', {
              card: card(action.cardId),
              row: translate(`match.choice.${action.row}`),
            });
          }
          return translate('replay.move.play', { card: card(action.cardId) });
        case 'ACTIVATE_LEADER':
          return translate('replay.move.leader');
        case 'PASS':
          return translate('replay.move.pass');
        case 'REDRAW':
          return translate('replay.move.redraw', { card: card(action.cardId) });
        case 'END_REDRAW':
          return translate('replay.move.endRedraw');
        case 'CHOOSE': {
          const options = before.pendingChoice?.options ?? [];
          const choice = action.optionIds
            .map((id) => {
              const option = options.find((option) => option.id === id);
              if (option?.cardId) return card(option.cardId);
              if (option?.row) return translate(`match.choice.${option.row}`);
              if (option?.player) return names[option.player];
              return id;
            })
            .join(', ');
          return translate('replay.move.choose', { choice });
        }
      }
    },
    [translate, cardText, names],
  );
};
