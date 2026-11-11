import { computeBoard, COMBAT_ROWS, opponentOf } from '@gwent/engine';
import { useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useGamepadKeyMode } from '@/shared/input/useGamepad';
import { assets } from '@/shared/lib/assets';
import { Stage } from '@/shared/ui/Stage';
import { useHumanControls } from '../hooks/useHumanControls';
import { useKeyboardControls } from '../hooks/useKeyboardControls';
import { currentTurn, weatherOverlays } from '../lib/board';
import { ROW_COINS } from '../data/layout';
import { ROWS } from '../data/layout';
import type { BoardMatch } from '../interfaces/match';
import { useGameStore } from '../store/game.store';
import { BoardMenu } from './BoardMenu';
import { BoardRow } from './BoardRow';
import { CardPreview } from './CardPreview';
import { EndScreen } from './EndScreen';
import { FlyingCards } from './FlyingCards';
import { Hand } from './Hand';
import { LeaderSlot } from './LeaderSlot';
import { MatchDialogs } from './MatchDialogs';
import { MutatorBadges } from './MutatorBadges';
import { NoticeBanner } from './NoticeBanner';
import { PassButton } from './PassButton';
import { Piles } from './Piles';
import { PlayerStats } from './PlayerStats';
import { SpotlightCard } from './SpotlightCard';
import { WeatherZone } from './WeatherZone';

interface BoardProps {
  match: BoardMatch;
  onPlayAgain: () => void;
  onExit: () => void;
  playAgainLabel?: string;
  endNote?: string | null;
  onWatchReplay?: (() => void) | undefined;
  overlay?: ReactNode;
}

export const Board = ({
  match,
  onPlayAgain,
  onExit,
  playAgainLabel,
  endNote,
  onWatchReplay,
  overlay,
}: BoardProps) => {
  const { t: translate } = useTranslation();
  const { state, human, opponent } = match;
  const readOnly = match.mode === 'replay' || match.mode === 'spectate';
  const opponentName = match.mode === 'local' ? translate('match.opponent') : match.opponentName;
  const humanName = readOnly ? match.humanName : translate('match.you');
  const controls = useHumanControls(match);
  const score = useMemo(() => computeBoard(state), [state]);
  const weather = weatherOverlays(state);
  const turn = currentTurn(state);
  const noticeShowing = useGameStore((store) => !!store.notices.length);
  const gameOver = state.phase === 'gameOver' && !noticeShowing && !readOnly;

  useGamepadKeyMode();
  useKeyboardControls({
    match,
    enabled: !readOnly,
    options: controls.options.map((option) => option.action),
    playable: controls.playable,
    canPass: controls.canPass,
    canUseLeader: controls.canUseLeader,
    act: controls.act,
    pass: controls.pass,
    handTitle: translate('match.cardsInHand', { count: state.players[human].hand.length }),
  });

  return (
    <Stage background={assets.board()}>
      {(['top', 'bottom'] as const).map((position) => {
        const side = position === 'bottom' ? human : opponentOf(human);
        return COMBAT_ROWS.map((row) => (
          <BoardRow
            key={`${side}-${row}`}
            state={state}
            side={side}
            row={row}
            rect={ROWS[position][row]}
            coin={ROW_COINS[position][row]}
            score={score[side].rows[row]}
            weather={weather[row]}
            targets={controls.targets}
            focusedKey={controls.focusedKey}
            onPlayRow={controls.playOnRow}
            onPlayCard={controls.playOnCard}
          />
        ));
      })}

      <WeatherZone
        state={state}
        onPlay={controls.weatherTarget ? () => controls.act(controls.targets.free) : null}
        focused={controls.weatherTarget && controls.focusedKey === 'free'}
      />

      <PlayerStats
        player={state.players[opponent]}
        position="top"
        name={opponentName}
        total={score[opponent].total}
        leading={score[opponent].total > score[human].total}
        active={turn === opponent}
      />
      <PlayerStats
        player={state.players[human]}
        position="bottom"
        name={humanName}
        total={score[human].total}
        leading={score[human].total > score[opponent].total}
        active={turn === human}
      />
      <LeaderSlot state={state} player={opponent} position="top" selectable={false} />
      <LeaderSlot
        state={state}
        player={human}
        position="bottom"
        selectable={controls.canUseLeader}
      />
      <Piles state={state} player={opponent} position="top" />
      <Piles state={state} player={human} position="bottom" />
      <Hand state={state} player={human} playable={controls.playable} />
      <FlyingCards human={human} />
      <PassButton disabled={!controls.canPass} onPass={controls.pass} />

      <MutatorBadges mutators={state.mutators} />
      <CardPreview state={state} primaryAction={controls.primaryAction} />
      <SpotlightCard />
      <NoticeBanner />
      <MatchDialogs state={state} human={human} readOnly={readOnly} />
      <BoardMenu mode={match.mode} onExit={onExit} />

      {gameOver && (
        <EndScreen
          match={match}
          opponentName={opponentName}
          note={endNote ?? null}
          playAgainLabel={playAgainLabel ?? translate('match.end.playAgain')}
          onPlayAgain={onPlayAgain}
          onMenu={onExit}
          onWatchReplay={onWatchReplay}
        />
      )}
      {overlay}
    </Stage>
  );
};
