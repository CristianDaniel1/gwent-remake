import type { GameState, PlayerId } from '@gwent/engine';
import { useTranslation } from 'react-i18next';
import { assets } from '@/shared/lib/assets';
import { cn } from '@/shared/lib/cn';
import { box } from '../lib/layout';
import { LAYOUT } from '../data/layout';
import { useGameStore } from '../store/game.store';
import { useUiStore } from '../store/ui.store';
import { BoardCard } from './BoardCard';

interface LeaderSlotProps {
  state: GameState;
  player: PlayerId;
  position: 'top' | 'bottom';
  selectable: boolean;
}

export const LeaderSlot = ({ state, player, position, selectable }: LeaderSlotProps) => {
  const { t: translate } = useTranslation();
  const me = state.players[player];
  const selected = useUiStore((store) => store.selected);
  const toggleSelected = useUiStore((store) => store.toggleSelected);
  const available = me.leaderAvailable && !me.leaderDisabled;
  const away = useGameStore((store) => store.spotlight?.cardId === me.leader);

  return (
    <>
      <div
        style={box(LAYOUT.leader[position])}
        className={cn(
          'flex items-center justify-center',
          !available && 'opacity-60 grayscale-[40%]',
        )}
      >
        {!away && (
          <BoardCard
            state={state}
            id={me.leader}
            selected={selected === me.leader}
            details={{ title: translate('match.details'), cardIds: [me.leader] }}
            {...(selectable ? { onClick: () => toggleSelected(me.leader) } : {})}
          />
        )}
      </div>
      {available && (
        <div
          aria-hidden
          style={{
            ...box(LAYOUT.leaderActive[position]),
            backgroundImage: `url(${assets.icon('icon_leader_active')})`,
          }}
          className="bg-contain bg-center bg-no-repeat"
        />
      )}
    </>
  );
};
