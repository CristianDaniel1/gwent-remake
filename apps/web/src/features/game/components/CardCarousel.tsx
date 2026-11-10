import { defOf, type CardInstanceId, type GameState } from '@gwent/engine';
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { AnimatePresence, m, useIsPresent } from 'motion/react';
import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { sfx } from '@/shared/audio/audio-manager';
import { useCardText } from '@/shared/i18n/useCardText';
import { abilityIcon } from '@/shared/lib/card-visuals';
import { cn } from '@/shared/lib/cn';
import { GameCard } from '@/shared/ui/GameCard';

/**
 * Position of each card relative to the center one (in cqw, on a 1920 px base):
 * the center one is the largest; the neighbors shrink. ±3 are invisible, only so entering cards slide in.
 */
const SLOTS: Record<number, { x: number; w: number; h: number; opacity: number }> = {
  0: { x: 50, w: 16.1, h: 30.4, opacity: 1 },
  1: { x: 66.5, w: 13.75, h: 25.9, opacity: 1 },
  2: { x: 81, w: 11.3, h: 21.3, opacity: 1 },
  3: { x: 92, w: 9, h: 17, opacity: 0 },
};
const slot = (offset: number) => {
  const s = SLOTS[Math.min(3, Math.abs(offset))] ?? SLOTS[3]!;
  return { ...s, x: offset < 0 ? 100 - s.x : s.x };
};
const TOP_CQW = 11.5;

export type CardCarouselProps = {
  state: GameState;
  title: string;
  cardIds: readonly CardInstanceId[];
  /** Card that starts in the center. */
  startId?: CardInstanceId | undefined;
  /** Click (or Enter) on the center card. Without it, the carousel is view-only. */
  onSelect?: ((id: CardInstanceId) => void) | undefined;
  /** What clicking the center does (screen readers), e.g. "Redraw". */
  selectLabel?: string | undefined;
  /** Cards marked in a multiple choice. */
  marked?: ReadonlySet<CardInstanceId> | undefined;
  /** Can close without choosing (Esc, × button). */
  onClose?: (() => void) | undefined;
  /** Buttons at the bottom (e.g. "Finish redraw", "Confirm"). */
  footer?: ReactNode;
  /** Progress dots (e.g. redraws used). */
  progress?: { used: number; total: number } | undefined;
};

/**
 * Large card carousel: the center card highlighted, arrows and
 * mouse wheel to navigate, description below. Used for the initial redraw, choices
 * and for viewing card details (row, grave, hand).
 */
export function CardCarousel({
  state,
  title,
  cardIds,
  startId,
  onSelect,
  selectLabel,
  marked,
  onClose,
  footer,
  progress,
}: CardCarouselProps) {
  const { t } = useTranslation();
  const cardText = useCardText();
  const titleId = useId();
  const isPresent = useIsPresent();
  const dialogRef = useRef<HTMLDivElement>(null);
  const ids = cardIds.filter((id) => state.cards[id]);
  const [index, setIndex] = useState(() => Math.max(0, startId ? ids.indexOf(startId) : 0));
  const current = Math.min(index, Math.max(0, ids.length - 1));
  const centerId = ids[current];

  const shift = (step: number) => {
    const next = Math.max(0, Math.min(ids.length - 1, current + step));
    if (next === current) return;
    setIndex(next);
    sfx.play('ui_card');
  };
  const select = () => {
    if (centerId && onSelect) onSelect(centerId);
  };

  // Keyboard (and controller, which produces the same keys): the listener always reads the latest render.
  const keys = useRef({ shift, select, onClose });
  useLayoutEffect(() => {
    keys.current = { shift, select, onClose };
  });
  useEffect(() => {
    if (!isPresent) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Two carousels open (e.g. revealed cards over a choice): only the front one responds
      if ([...document.querySelectorAll('[data-carousel]')].at(-1) !== dialogRef.current) return;
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const { shift: move, select: pick, onClose: close } = keys.current;
      const footerButton = dialogRef.current?.querySelector<HTMLElement>(
        'footer button:not([disabled])',
      );
      if (key === 'ArrowLeft' || key === 'a') move(-1);
      // ↓ goes to the bottom buttons (e.g. "Finish redraw"); ↑ goes back to the cards
      else if ((key === 'ArrowDown' || key === 's') && footerButton)
        footerButton.focus({ focusVisible: true } as FocusOptions);
      else if (key === 'ArrowUp' || key === 'w')
        (document.activeElement as HTMLElement | null)?.blur();
      else if (key === 'ArrowRight' || key === 'd') move(1);
      else if (key === 'Enter' || key === ' ') {
        // Enter on a focused footer button: let the button act
        if ((e.target as HTMLElement | null)?.closest?.('footer button')) return;
        pick();
      } else if ((key === 'Escape' || key === 'q' || key === 'Backspace') && close) close();
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isPresent]);

  // The mouse wheel moves through the cards (one per wheel "click")
  const lastWheel = useRef(0);
  const onWheel = (e: React.WheelEvent) => {
    const now = performance.now();
    if (now - lastWheel.current < 120 || Math.abs(e.deltaY) + Math.abs(e.deltaX) < 4) return;
    lastWheel.current = now;
    shift(e.deltaY + e.deltaX > 0 ? 1 : -1);
  };

  const centerDef = centerId ? defOf(state, centerId) : null;
  const centerText = centerDef ? cardText(centerDef) : null;
  const centerIcon = centerDef ? abilityIcon(centerDef) : null;

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      inert={!isPresent}
      aria-hidden={!isPresent}
      onWheel={onWheel}
      className="absolute inset-0 z-50 bg-black/80"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-carousel
        className="absolute inset-0"
      >
        {progress && (
          <div
            aria-hidden
            className="absolute top-[6%] left-1/2 flex -translate-x-1/2 gap-[1cqw] rounded-[2cqw] bg-ink/70 px-[1.2cqw] py-[0.7cqw]"
          >
            {Array.from({ length: progress.total }, (_, i) => (
              <span
                key={i}
                className={cn(
                  'size-[1cqw] rounded-full border-[0.12cqw] border-gold transition-all duration-300',
                  i < progress.used
                    ? 'scale-115 bg-gold shadow-[0_0_0.8cqw] shadow-gold'
                    : 'bg-white/10',
                )}
              />
            ))}
          </div>
        )}

        <h2
          id={titleId}
          className="absolute top-[12%] flex h-[7.5%] w-full items-center justify-center bg-ink/95 text-[1.75cqw] text-gold-light shadow-[0_0_1cqw_#ffffff54]"
        >
          {title}
        </h2>

        <AnimatePresence initial={false}>
          {ids.map((id, i) => {
            const offset = i - current;
            if (Math.abs(offset) > 3) return null;
            const s = slot(offset);
            const def = defOf(state, id);
            const name = cardText(def).name;
            const isCenter = offset === 0;
            const isMarked = marked?.has(id) ?? false;
            return (
              <m.div
                key={id}
                initial={{ opacity: 0, scale: 0.78 }}
                animate={{
                  left: `${s.x - s.w / 2}cqw`,
                  width: `${s.w}cqw`,
                  height: `${s.h}cqw`,
                  opacity: s.opacity,
                  scale: 1,
                  filter: 'none',
                }}
                // Redrawn/chosen card: falls and fades out
                exit={{
                  opacity: 0,
                  y: '9cqw',
                  scale: 0.5,
                  rotate: -10,
                  filter: 'grayscale(0.8) brightness(0.5)',
                  transition: {
                    duration: 0.6,
                    ease: [0.55, -0.2, 0.6, 1],
                    opacity: { duration: 0.35, delay: 0.3 },
                  },
                }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                style={{ top: `${TOP_CQW}cqw` }}
                className={cn(
                  'absolute rounded-[1.5cqw]',
                  Math.abs(offset) === 3 && 'pointer-events-none',
                  isCenter &&
                    'z-10 shadow-[0_0_4cqw] shadow-gold outline-[0.3cqw] outline-gold hover:shadow-[0_0_2cqw]',
                  !isCenter && 'hover:shadow-[0_0_1cqw] hover:shadow-gold',
                )}
              >
                <GameCard
                  def={def}
                  size="fill"
                  lift={false}
                  label={isCenter && onSelect && selectLabel ? `${selectLabel}: ${name}` : name}
                  className="rounded-[1.5cqw]"
                  {...(isCenter
                    ? onSelect
                      ? { onClick: select }
                      : {}
                    : { onClick: () => shift(offset) })}
                />
                {isMarked && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute top-[3%] right-[5%] flex size-[2.4cqw] items-center justify-center rounded-full border-[0.15cqw] border-gold bg-ink/90 text-gold-light"
                  >
                    <Check className="size-[70%]" />
                  </span>
                )}
              </m.div>
            );
          })}
        </AnimatePresence>

        {centerText && centerText.abilities.length > 0 && (
          <div
            aria-live="polite"
            className="absolute top-[77%] left-[35.35%] w-[29.12cqw] border-y-[0.1cqw] border-white/35 bg-[rgba(20,20,20,0.95)] py-[0.6cqw] text-center text-[tan]"
          >
            {centerIcon && (
              <span
                aria-hidden
                className="absolute top-[0.8cqw] left-[0.9cqw] size-[1.95cqw] bg-cover bg-center"
                style={{ backgroundImage: `url(${centerIcon})` }}
              />
            )}
            {centerText.abilities.map((a) => (
              <p
                key={a.name + a.description}
                className={cn(
                  'text-[0.9cqw] leading-snug',
                  centerIcon ? 'px-[3.2cqw]' : 'px-[1cqw]',
                )}
              >
                {a.name && <strong className="block text-[1cqw] capitalize">{a.name}</strong>}
                {a.description}
              </p>
            ))}
          </div>
        )}

        <button
          type="button"
          aria-label={t('match.previous')}
          disabled={current <= 0}
          onClick={() => shift(-1)}
          className="carousel-arrow left-[2%]"
        >
          <ChevronLeft aria-hidden className="size-[70%]" />
        </button>
        <button
          type="button"
          aria-label={t('match.next')}
          disabled={current >= ids.length - 1}
          onClick={() => shift(1)}
          className="carousel-arrow right-[2%]"
        >
          <ChevronRight aria-hidden className="size-[70%]" />
        </button>

        {onClose && (
          <button
            type="button"
            aria-label={t('match.close')}
            title={t('match.close')}
            onClick={onClose}
            className="absolute top-[13%] right-[2%] z-10 flex size-[3cqw] cursor-pointer items-center justify-center rounded-full border-[0.12cqw] border-gold bg-ink/60 text-gold hover:bg-gold/20"
          >
            <X aria-hidden className="size-[70%]" />
          </button>
        )}

        {footer && (
          <footer className="absolute top-[92%] left-1/2 flex -translate-x-1/2 gap-[0.8cqw]">
            {footer}
          </footer>
        )}
      </div>
    </m.div>
  );
}
