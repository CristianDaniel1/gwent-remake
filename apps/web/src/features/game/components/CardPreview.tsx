import { defOf, type CardInstanceId, type GameState } from '@gwent/engine';
import { AnimatePresence, m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { useCardText } from '@/shared/i18n/useCardText';
import { Button } from '@/shared/ui/Button';
import { GameCard } from '@/shared/ui/GameCard';
import type { PrimaryAction } from '../interfaces/controls';
import { box, boxFrom } from '../lib/layout';
import { PREVIEW } from '../data/layout';
import { useGameStore } from '../store/game.store';
import { useUiStore } from '../store/ui.store';
import { AbilityList } from './AbilityList';
import { PRIMARY_ACTION_LABELS } from '../data/primary-actions';

interface CardPreviewProps {
  state: GameState;
  primaryAction: PrimaryAction | null;
}

const previewedCard = (
  state: GameState,
  hovered: CardInstanceId | null,
  selected: CardInstanceId | null,
) => (hovered && state.cards[hovered] ? hovered : selected);

export const CardPreview = ({ state, primaryAction }: CardPreviewProps) => {
  const { t: translate } = useTranslation();
  const cardText = useCardText();
  const selected = useUiStore((store) => store.selected);
  const hovered = useUiStore((store) => store.hovered);
  const clearSelected = useUiStore((store) => store.clearSelected);
  const spotlight = useGameStore((store) => !!store.spotlight);
  const shown = spotlight ? null : previewedCard(state, hovered, selected);
  const def = shown && state.cards[shown] ? defOf(state, shown) : null;

  return (
    <aside className="pointer-events-none contents">
      <div style={box(PREVIEW.card)} className="z-30">
        <AnimatePresence mode="wait">
          {def && (
            <m.div
              key={shown}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full w-full"
            >
              <GameCard def={def} size="fill" label={cardText(def).name} lift={false} />
            </m.div>
          )}
        </AnimatePresence>
      </div>

      <div style={boxFrom(PREVIEW.info)} className="z-30 flex flex-col items-stretch">
        {def && <AbilityList key={shown} def={def} />}
        {selected && (
          <div className="pointer-events-auto mt-[0.5cqw] flex justify-center gap-[0.5cqw]">
            {primaryAction && (
              <Button onClick={primaryAction.run}>
                {translate(PRIMARY_ACTION_LABELS[primaryAction.kind])}
              </Button>
            )}
            <Button onClick={clearSelected}>{translate('match.cancel')}</Button>
          </div>
        )}
      </div>
    </aside>
  );
};
