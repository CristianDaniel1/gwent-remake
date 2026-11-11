import { defOf, type GameState } from '@gwent/engine';
import { AnimatePresence, m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/ui/Button';
import { GameCard } from '@/shared/ui/GameCard';
import { useCardText } from '@/shared/i18n/useCardText';
import { abilityIcon } from '@/shared/lib/card-visuals';
import { cn } from '@/shared/lib/cn';
import { box, PREVIEW } from '../layout';
import { useGameStore } from '../store/game.store';
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
  // The opponent's card enlarged takes this place for a moment
  const spotlight = useGameStore((s) => s.spotlight !== null);
  const shown = spotlight ? null : hovered && state.cards[hovered] ? hovered : selected;
  const def = shown && state.cards[shown] ? defOf(state, shown) : null;
  const text = def ? cardText(def) : null;

  const icon = def ? abilityIcon(def) : null;
  const [x, y, w] = PREVIEW.info;
  const hasInfo = text !== null && text.abilities.length > 0;

  return (
    <aside className="pointer-events-none contents">
      <div style={box(PREVIEW.card)} className="z-30">
        <AnimatePresence mode="wait">
          {def && text && (
            <m.div
              key={shown}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="h-full w-full"
            >
              <GameCard def={def} size="fill" label={text.name} lift={false} />
            </m.div>
          )}
        </AnimatePresence>
      </div>

      {/* Abilities (the card image already has the name), like the details carousel */}
      {(hasInfo || selected) && (
        <div
          style={{
            position: 'absolute',
            left: `${(x / 1920) * 100}%`,
            top: `${(y / 1080) * 100}%`,
            width: `${(w / 1920) * 100}%`,
          }}
          className="z-30 flex flex-col items-stretch"
        >
          {hasInfo && (
            <m.div
              key={shown}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="relative border-y-[0.1cqw] border-white/35 bg-[rgba(20,20,20,0.95)] py-[0.6cqw] text-center text-[tan] shadow-[0_0_1cqw_rgba(0,0,0,0.7)]"
            >
              {icon && (
                <span
                  aria-hidden
                  className="absolute top-[0.7cqw] left-[0.7cqw] size-[1.8cqw] bg-cover bg-center"
                  style={{ backgroundImage: `url(${icon})` }}
                />
              )}
              {text.abilities.map((a) => (
                <p
                  key={a.name + a.description}
                  className={cn('text-[0.85cqw] leading-snug', icon ? 'px-[2.9cqw]' : 'px-[1cqw]')}
                >
                  {a.name && (
                    <strong className="block text-[1cqw] text-gold-light capitalize">
                      {a.name}
                    </strong>
                  )}
                  {a.description}
                </p>
              ))}
            </m.div>
          )}
          {selected && (
            <div className="pointer-events-auto mt-[0.5cqw] flex justify-center gap-[0.5cqw]">
              {primaryAction && <Button onClick={primaryAction.run}>{primaryAction.label}</Button>}
              <Button onClick={clearSelected}>{t('match.cancel')}</Button>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
