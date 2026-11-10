import { MAX_REDRAWS, type GameState, type PlayerId } from '@gwent/engine';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { useGameStore } from '../store/game.store';
import { CardCarousel } from './CardCarousel';

type RedrawModalProps = { state: GameState; human: PlayerId };

/**
 * Initial redraw in the carousel: clicking the center card (or Enter) returns it to the deck
 * and draws another. The dots at the top show the redraws used.
 */
export function RedrawModal({ state, human }: RedrawModalProps) {
  const { t } = useTranslation();
  const dispatch = useGameStore((s) => s.dispatch);
  const me = state.players[human];
  const canRedraw = me.redrawsLeft > 0 && me.deck.length > 0;

  return (
    <CardCarousel
      state={state}
      title={t('match.redrawTitle', { count: me.redrawsLeft })}
      cardIds={me.hand}
      progress={{ used: MAX_REDRAWS - me.redrawsLeft, total: MAX_REDRAWS }}
      selectLabel={t('match.redrawPick')}
      onSelect={
        canRedraw ? (id) => dispatch({ type: 'REDRAW', player: human, cardId: id }) : undefined
      }
      footer={
        <Button onClick={() => dispatch({ type: 'END_REDRAW', player: human })}>
          {t('match.redrawDone')}
        </Button>
      }
    />
  );
}
