import type { GameState, PlayerId } from '@gwent/engine';
import { AnimatePresence } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../store/game.store';
import { useUiStore } from '../store/ui.store';
import { CardCarousel } from './CardCarousel';
import { ChoiceModal } from './ChoiceModal';
import { RedrawModal } from './RedrawModal';

interface MatchDialogsProps {
  state: GameState;
  human: PlayerId;
  readOnly: boolean;
}

export const MatchDialogs = ({ state, human, readOnly }: MatchDialogsProps) => {
  const { t: translate } = useTranslation();
  const noticeShowing = useGameStore((store) => !!store.notices.length);
  const revealed = useGameStore((store) => store.revealed);
  const closeReveal = useGameStore((store) => store.closeReveal);
  const viewing = useUiStore((store) => store.viewing);
  const view = useUiStore((store) => store.view);
  const playing = !readOnly && !noticeShowing;
  const choice = playing && state.pendingChoice?.player === human ? state.pendingChoice : null;
  const redrawing = playing && state.phase === 'redraw' && !state.players[human].redrawDone;

  return (
    <AnimatePresence>
      {redrawing && <RedrawModal key="redraw" state={state} human={human} />}
      {choice && (
        <ChoiceModal
          key={JSON.stringify(choice.resume)}
          state={state}
          choice={choice}
          human={human}
        />
      )}
      {viewing && (
        <CardCarousel
          key="viewing"
          state={state}
          title={viewing.title}
          cardIds={viewing.cardIds}
          startId={viewing.startId}
          onClose={() => view(null)}
        />
      )}
      {revealed && (
        <CardCarousel
          key="revealed"
          state={state}
          title={translate('match.revealed')}
          cardIds={revealed}
          onClose={closeReveal}
        />
      )}
    </AnimatePresence>
  );
};
