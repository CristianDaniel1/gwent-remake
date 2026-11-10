import { defOf, type GameState } from '@gwent/engine';
import { AnimatePresence, m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { GameCard } from '@/shared/ui/GameCard';
import { useCardText } from '@/shared/i18n/useCardText';
import { box, LAYOUT } from '../layout';
import { useUiStore } from '../store/ui.store';

type CardPreviewProps = {
  state: GameState;
  /** Main button for the selected card (e.g. "Play" weather, "Use" leader). */
  primaryAction: { label: string; run: () => void } | null;
};

/** Selected (or hovered) card enlarged, with name and abilities in the current language. */
export function CardPreview({ state, primaryAction }: CardPreviewProps) {
  const { t } = useTranslation();
  const cardText = useCardText();
  const selected = useUiStore((s) => s.selected);
  const hovered = useUiStore((s) => s.hovered);
  const clearSelected = useUiStore((s) => s.clearSelected);
  const shown = hovered && state.cards[hovered] ? hovered : selected;
  const def = shown && state.cards[shown] ? defOf(state, shown) : null;
  const text = def ? cardText(def) : null;

  return (
    <aside
      style={box(LAYOUT.preview)}
      className="pointer-events-none z-30 flex flex-col items-center"
    >
      <AnimatePresence mode="wait">
        {def && text && (
          <m.div
            key={shown}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex w-full flex-col items-center gap-[0.5cqw]"
          >
            <div className="h-[17cqw] w-[9cqw]">
              <GameCard def={def} size="fill" label={text.name} />
            </div>
            <div className="w-full rounded-[0.3cqw] border border-gold/40 bg-ink/90 p-[0.6cqw]">
              <h2 className="text-[1.15cqw] font-bold text-gold-light">{text.name}</h2>
              {text.abilities.map((a) => (
                <p key={a.name + a.description} className="mt-[0.3cqw] text-[0.85cqw] leading-snug">
                  {a.name && <strong className="text-gold capitalize">{a.name}: </strong>}
                  {a.description}
                </p>
              ))}
            </div>
          </m.div>
        )}
      </AnimatePresence>
      {selected && (
        <div className="pointer-events-auto mt-[0.6cqw] flex gap-[0.5cqw]">
          {primaryAction && <Button onClick={primaryAction.run}>{primaryAction.label}</Button>}
          <Button onClick={clearSelected}>{t('match.cancel')}</Button>
        </div>
      )}
    </aside>
  );
}
