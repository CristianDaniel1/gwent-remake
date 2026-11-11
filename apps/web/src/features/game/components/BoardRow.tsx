import type { CardInstanceId, CombatRow, GameState, PlayerId, RowScore } from '@gwent/engine';
import { useTranslation } from 'react-i18next';
import { cardKey, targetKey } from '../hooks/useHumanControls';
import { type Targets } from '../interfaces/controls';
import type { WeatherKind } from '../interfaces/board';
import { boxIn, coinRect, box } from '../lib/layout';
import { ROW_CARDS_WIDTH_CQW, ROW_FRAME } from '../data/layout';
import { ROW_PARTS } from '../data/layout';
import { type Rect } from '../interfaces/layout';
import { BoardCard } from './BoardCard';
import { CardStrip } from './CardStrip';
import { PlayTarget } from './PlayTarget';
import { RowAbilityAnimation } from './animations/RowAbilityAnimation';
import { WeatherOverlay } from './WeatherOverlay';

interface BoardRowProps {
  state: GameState;
  side: PlayerId;
  row: CombatRow;
  rect: Rect;
  coin: readonly [number, number];
  score: RowScore;
  weather: WeatherKind | undefined;
  targets: Targets;
  focusedKey: string | null;
  onPlayRow: (row: CombatRow) => void;
  onPlayCard: (id: CardInstanceId) => void;
}

export const BoardRow = ({
  state,
  side,
  row,
  rect,
  coin,
  score,
  weather,
  targets,
  focusedKey,
  onPlayRow,
  onPlayCard,
}: BoardRowProps) => {
  const { t: translate } = useTranslation();
  const special = state.players[side].rows[row].special;
  const rowName = translate(`match.choice.${row}`);
  const key = targetKey(side, row);
  const focused = focusedKey === key;
  const cardIds = score.cards.map((card) => card.id);

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
        {targets.specials.has(key) && (
          <PlayTarget label={rowName} focused={focused} onClick={() => onPlayRow(row)} />
        )}
      </div>

      <div style={boxIn(ROW_FRAME, ROW_PARTS.cards)}>
        <CardStrip
          items={score.cards}
          widthCqw={ROW_CARDS_WIDTH_CQW}
          getKey={(card) => card.id}
          renderItem={(card) => (
            <BoardCard
              state={state}
              id={card.id}
              power={card.power}
              highlighted={targets.cards.has(card.id)}
              details={{ title: rowName, cardIds }}
              focused={focusedKey === cardKey(card.id)}
              {...(targets.cards.has(card.id) ? { onClick: () => onPlayCard(card.id) } : {})}
            />
          )}
        />
        <RowAbilityAnimation side={side} row={row} />
        {targets.rows.has(key) && (
          <PlayTarget
            label={rowName}
            focused={focused}
            onClick={() => onPlayRow(row)}
            className="z-30"
          />
        )}
      </div>

      <WeatherOverlay weather={weather} />
    </section>
  );
};
