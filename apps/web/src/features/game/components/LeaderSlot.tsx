import type { GameState, PlayerId } from '@gwent/engine';
import { useTranslation } from 'react-i18next';
import { assets } from '@/shared/lib/assets';
import { cn } from '@/shared/lib/cn';
import { box, LAYOUT } from '../layout';
import { useGameStore } from '../store/game.store';
import { useUiStore } from '../store/ui.store';
import { BoardCard } from './BoardCard';

type LeaderSlotProps = {
  state: GameState;
  player: PlayerId;
  position: 'top' | 'bottom';
  /** The human can activate the leader now (click selects; the preview shows the button). */
  selectable: boolean;
};

export function LeaderSlot({ state, player, position, selectable }: LeaderSlotProps) {
  const { t } = useTranslation();
  const me = state.players[player];
  const selected = useUiStore((s) => s.selected);
  const toggleSelected = useUiStore((s) => s.toggleSelected);
  const available = me.leaderAvailable && !me.leaderDisabled;
  // While the opponent's leader is shown enlarged, it leaves its slot (and flies back)
  const away = useGameStore((s) => s.spotlight?.cardId === me.leader);

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
            details={{ title: t('match.details'), cardIds: [me.leader] }}
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
}
