import type { CardInstanceId, CombatRow, GameState, PlayerId, RowScore } from '@gwent/engine';
import { AnimatePresence, m } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { assets } from '@/shared/lib/assets';
import { cn } from '@/shared/lib/cn';
import { cardKey, targetKey } from '../hooks/useHumanControls';
import type { WeatherKind } from '../lib/board';
import { boxIn, ROW_FRAME, ROW_PARTS, box, type Rect } from '../layout';
import { BoardCard } from './BoardCard';
import { CardStrip } from './CardStrip';

const CARDS_WIDTH_CQW = ROW_PARTS.cards[2] / 19.2;

type BoardRowProps = {
  state: GameState;
  side: PlayerId;
  row: CombatRow;
  rect: Rect;
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

  return (
    <section style={box(rect)} aria-label={rowName} data-side={side} data-row={row}>
      <div
        style={boxIn(ROW_FRAME, ROW_PARTS.score)}
        className="flex items-center justify-center text-[1.8cqw] font-bold text-black [text-shadow:0_0_5px_white]"
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
              'absolute inset-0 animate-pulse cursor-pointer bg-gold/20 outline-[0.15cqw] outline-gold',
              focused && 'animate-none bg-gold/40 outline-[0.3cqw] outline-white',
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
        {rowTarget && (
          <button
            type="button"
            data-target
            aria-label={rowName}
            onClick={() => onPlayRow(row)}
            className={cn(
              'absolute inset-0 z-30 cursor-pointer bg-gold/15 outline-[0.15cqw] outline-gold hover:bg-gold/25',
              focused && 'bg-gold/30 outline-[0.3cqw] outline-white',
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
