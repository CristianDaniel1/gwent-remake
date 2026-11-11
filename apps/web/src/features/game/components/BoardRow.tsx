import type { CardInstanceId, CombatRow, GameState, PlayerId, RowScore } from '@gwent/engine';
import { AnimatePresence, m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { assets } from '@/shared/lib/assets';
import { cn } from '@/shared/lib/cn';
import { cardKey, targetKey } from '../hooks/useHumanControls';
import type { WeatherKind } from '../lib/board';
import { boxIn, coinRect, ROW_FRAME, ROW_PARTS, box, type Rect } from '../layout';
import { BoardCard } from './BoardCard';
import { CardStrip } from './CardStrip';
import { HornRowAnimation } from './CardAnimations';
import { useGameStore } from '../store/game.store';

const CARDS_WIDTH_CQW = ROW_PARTS.cards[2] / 19.2;

type BoardRowProps = {
  state: GameState;
  side: PlayerId;
  row: CombatRow;
  rect: Rect;
  /** Center of the row's score coin on the board artwork. */
  coin: readonly [number, number];
  score: RowScore;
  weather: WeatherKind | undefined;
  /** Rows and special slots where the selected card can go ("p1:close"). */
  rowTargets: ReadonlySet<string>;
  specialTargets: ReadonlySet<string>;
  /** Cards that can be targeted (Decoy). */
  cardTargets: ReadonlySet<CardInstanceId>;
  /** Target chosen with the keyboard (Enter confirms). */
  focusedKey: string | null;
  onPlayRow: (row: CombatRow) => void;
  onPlayCard: (id: CardInstanceId) => void;
};

export function BoardRow({
  state,
  side,
  row,
  rect,
  coin,
  score,
  weather,
  rowTargets,
  specialTargets,
  cardTargets,
  focusedKey,
  onPlayRow,
  onPlayCard,
}: BoardRowProps) {
  const { t } = useTranslation();
  const special = state.players[side].rows[row].special;
  const rowName = t(`match.choice.${row}`);
  const key = targetKey(side, row);
  const rowTarget = rowTargets.has(key);
  const specialTarget = specialTargets.has(key);
  const focused = focusedKey === key;
  const hornSeq = useGameStore((s) =>
    s.animations?.rows.some((r) => r.side === side && r.row === row) ? s.animations.seq : null,
  );

  return (
    <section style={box(rect)} aria-label={rowName} data-side={side} data-row={row}>
      <div
        style={boxIn(rect, coinRect(coin))}
        className="score-number flex items-center justify-center text-[1.75cqw]"
      >
        <span className="sr-only">{rowName}: </span>
        {score.total}
      </div>

      <div style={boxIn(ROW_FRAME, ROW_PARTS.special)} className="flex items-center justify-center">
        {special && (
          <BoardCard state={state} id={special} details={{ title: rowName, cardIds: [special] }} />
        )}
        {specialTarget && (
          <button
            type="button"
            data-target
            aria-label={rowName}
            onClick={() => onPlayRow(row)}
            className={cn(
              'play-target absolute inset-0 cursor-pointer',
              focused && 'play-target-focused',
            )}
          />
        )}
      </div>

      <div style={boxIn(ROW_FRAME, ROW_PARTS.cards)}>
        <CardStrip
          items={score.cards}
          widthCqw={CARDS_WIDTH_CQW}
          getKey={(c) => c.id}
          renderItem={(c) => (
            <BoardCard
              state={state}
              id={c.id}
              power={c.power}
              highlighted={cardTargets.has(c.id)}
              details={{ title: rowName, cardIds: score.cards.map((x) => x.id) }}
              focused={focusedKey === cardKey(c.id)}
              {...(cardTargets.has(c.id) ? { onClick: () => onPlayCard(c.id) } : {})}
            />
          )}
        />
        {hornSeq !== null && <HornRowAnimation key={hornSeq} />}
        {rowTarget && (
          <button
            type="button"
            data-target
            aria-label={rowName}
            onClick={() => onPlayRow(row)}
            className={cn(
              'play-target absolute inset-0 z-30 cursor-pointer',
              focused && 'play-target-focused',
            )}
          />
        )}
      </div>

      <div
        aria-hidden
        style={boxIn(ROW_FRAME, ROW_PARTS.weather)}
        className="pointer-events-none z-20"
      >
        <AnimatePresence>
          {weather && (
            <m.div
              key={weather}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
              style={{ backgroundImage: `url(${assets.icon(`overlay_${weather}`)})` }}
              className="h-full w-full bg-cover bg-bottom bg-no-repeat"
            />
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
