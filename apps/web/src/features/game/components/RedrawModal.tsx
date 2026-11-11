import { MAX_REDRAWS, type GameState, type PlayerId } from '@gwent/engine';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { useGameStore } from '../store/game.store';
import { CardCarousel } from './CardCarousel';

interface RedrawModalProps {
  state: GameState;
  human: PlayerId;
}

export const RedrawModal = ({ state, human }: RedrawModalProps) => {
  const { t: translate } = useTranslation();
  const dispatch = useGameStore((store) => store.dispatch);
  const me = state.players[human];
  const canRedraw = me.redrawsLeft > 0 && !!me.deck.length;

  return (
    <CardCarousel
      state={state}
      title={translate('match.redrawTitle', { count: me.redrawsLeft })}
      cardIds={me.hand}
      progress={{ used: MAX_REDRAWS - me.redrawsLeft, total: MAX_REDRAWS }}
      selectLabel={translate('match.redrawPick')}
      onSelect={
        canRedraw ? (id) => dispatch({ type: 'REDRAW', player: human, cardId: id }) : undefined
      }
      footer={
        <Button onClick={() => dispatch({ type: 'END_REDRAW', player: human })}>
          {translate('match.redrawDone')}
        </Button>
      }
    />
  );
};
