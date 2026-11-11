import { computeBoard, COMBAT_ROWS, defOf, opponentOf, type CardInstanceId } from '@gwent/engine';
import { Keyboard, Settings } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsModal } from '@/features/settings';
import { sfx } from '@/shared/audio/audio-manager';
import { assets } from '@/shared/lib/assets';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { useGamepadKeyMode } from '@/shared/input/useGamepad';
import { Stage } from '@/shared/ui/Stage';
import { useHumanControls } from '../hooks/useHumanControls';
import { useMatchRecording } from '../hooks/useMatchRecording';
import { PASS_HOLD_MS, useKeyboardControls } from '../hooks/useKeyboardControls';
import { weatherOverlays } from '../lib/board';
import { box, LAYOUT, ROW_COINS, ROWS } from '../layout';
import { useGameStore, type BoardMatch } from '../store/game.store';
import { useUiStore } from '../store/ui.store';
import { BoardRow } from './BoardRow';
import { CardListModal } from './CardListModal';
import { CardPreview } from './CardPreview';
import { ChoiceModal } from './ChoiceModal';
import { EndScreen } from './EndScreen';
import { FlyingCards } from './FlyingCards';
import { Hand } from './Hand';
import { KeyboardHelp } from './KeyboardHelp';
import { LeaderSlot } from './LeaderSlot';
import { MutatorBadges } from './MutatorBadges';
import { NoticeBanner } from './NoticeBanner';
import { Piles } from './Piles';
import { PlayerStats } from './PlayerStats';
import { RedrawModal } from './RedrawModal';
import { SpotlightCard } from './SpotlightCard';
import { WeatherZone } from './WeatherZone';

type BoardProps = {
  match: BoardMatch;
  onPlayAgain: () => void;
  onExit: () => void;
  /** End screen: label of the play-again button (e.g. "Rematch") and a note below it. */
  playAgainLabel?: string;
  endNote?: string | null;
  /** Opens the replay from the end screen (matches against the bot). */
  onWatchReplay?: () => void;
  /** Extra layer over the board (e.g. multiplayer notices). */
  overlay?: ReactNode;
};

/** Board: the human at the bottom, the bot at the top. */
export function Board({
  match,
  onPlayAgain,
  onExit,
  playAgainLabel,
  endNote,
  onWatchReplay,
  overlay,
}: BoardProps) {
  const { t } = useTranslation();
  const { t: tGame } = useTranslation('game');
  const { state, human, opponent: bot } = match;
  // Replays and spectating: nothing to play, no dialogs and no end screen
  const readOnly = match.mode === 'replay' || match.mode === 'spectate';
  const opponentName = match.mode === 'local' ? t('match.opponent') : match.opponentName;
  const exitLabel =
    match.mode === 'replay'
      ? t('replay.exit')
      : match.mode === 'spectate'
        ? t('online.stopWatching')
        : t('match.exit');
  const humanName = readOnly ? match.humanName : t('match.you');
  const controls = useHumanControls(match);
  const recording = useMatchRecording(match);
  const { targets } = controls;
  const score = useMemo(() => computeBoard(state), [state]);
  const weather = useMemo(() => weatherOverlays(state), [state]);
  const noticeShowing = useGameStore((s) => s.notices.length > 0);
  const revealed = useGameStore((s) => s.revealed);
  const closeReveal = useGameStore((s) => s.closeReveal);
  const selected = useUiStore((s) => s.selected);
  const viewing = useUiStore((s) => s.viewing);
  const view = useUiStore((s) => s.view);
  const confirmingExit = useUiStore((s) => s.confirmingExit);
  const setConfirmingExit = useUiStore((s) => s.setConfirmingExit);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const targetIndex = useUiStore((s) => s.targetIndex);
  const passHolding = useUiStore((s) => s.passHolding);
  const helpOpen = useUiStore((s) => s.helpOpen);
  const setHelpOpen = useUiStore((s) => s.setHelpOpen);

  const playable = useMemo(
    () =>
      new Set(
        controls.legal.flatMap((a) => (a.type === 'PLAY_CARD' ? [a.cardId] : [])),
      ) as ReadonlySet<CardInstanceId>,
    [controls.legal],
  );

  // In a match, the controller becomes the same keys as the keyboard
  useGamepadKeyMode();
  useKeyboardControls({
    match,
    enabled: !readOnly,
    options: controls.options.map((o) => o.action),
    playable,
    canPass: controls.canPass,
    canUseLeader: controls.canUseLeader,
    act: controls.act,
    pass: controls.pass,
    handTitle: t('match.cardsInHand', { count: state.players[human].hand.length }),
  });
  /** Target that Enter confirms (highlighted on the board). */
  const focusedKey =
    controls.options.length > 0
      ? (controls.options[targetIndex % controls.options.length]?.key ?? null)
      : null;

  const leaderSelected = selected === state.players[human].leader;
  const primaryAction = leaderSelected
    ? controls.canUseLeader
      ? { label: t('match.useLeader'), run: controls.useLeader }
      : null
    : targets.free
      ? { label: t('match.play'), run: () => controls.act(targets.free) }
      : null;
  const freeIsWeather = targets.free && selected && defOf(state, selected).type === 'weather';

  const choice = !readOnly && state.pendingChoice?.player === human ? state.pendingChoice : null;
  const redrawing = !readOnly && state.phase === 'redraw' && !state.players[human].redrawDone;
  // A replay shows the result in its own controls instead of the end screen
  const gameOver = state.phase === 'gameOver' && !noticeShowing && !readOnly;
  /** Whose turn it is (the panel glows); a pending choice belongs to who must answer it. */
  const turn =
    state.phase !== 'playing' ? null : (state.pendingChoice?.player ?? state.currentPlayer);

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
            rowTargets={targets.rows}
            specialTargets={targets.specials}
            cardTargets={targets.cards}
            focusedKey={focusedKey}
            onPlayRow={controls.playOnRow}
            onPlayCard={controls.playOnCard}
          />
        ));
      })}

      <WeatherZone
        state={state}
        onPlay={freeIsWeather ? () => controls.act(targets.free) : null}
        focused={freeIsWeather === true && focusedKey === 'free'}
      />

      <PlayerStats
        player={state.players[bot]}
        position="top"
        name={opponentName}
        total={score[bot].total}
        leading={score[bot].total > score[human].total}
        active={turn === bot}
      />
      <PlayerStats
        player={state.players[human]}
        position="bottom"
        name={humanName}
        total={score[human].total}
        leading={score[human].total > score[bot].total}
        active={turn === human}
      />
      <LeaderSlot state={state} player={bot} position="top" selectable={false} />
      <LeaderSlot
        state={state}
        player={human}
        position="bottom"
        selectable={controls.canUseLeader}
      />
      <Piles state={state} player={bot} position="top" />
      <Piles state={state} player={human} position="bottom" />
      <Hand state={state} player={human} playable={playable} />
      <FlyingCards human={human} />

      <button
        type="button"
        style={box(LAYOUT.pass)}
        disabled={!controls.canPass}
        onClick={controls.pass}
        className="pass-button relative overflow-hidden"
      >
        {/* "Hold to pass" bar (P/F shortcut) */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-[linear-gradient(90deg,rgba(255,200,90,0.15),rgba(255,210,120,0.45))] ease-linear"
          style={{
            width: passHolding ? '100%' : '0%',
            transitionProperty: 'width',
            transitionDuration: passHolding ? `${PASS_HOLD_MS}ms` : '0ms',
          }}
        />
        <span className="relative">{tGame('game.pass')}</span>
      </button>

      <button
        type="button"
        aria-label={exitLabel}
        title={exitLabel}
        onClick={() => {
          // Leaving a replay or a watched match loses nothing: no confirmation
          if (readOnly) return onExit();
          sfx.play('warning');
          setConfirmingExit(true);
        }}
        style={{ ...box(LAYOUT.exit), backgroundImage: `url(${assets.svg('exit')})` }}
        className="z-30 cursor-pointer bg-contain bg-no-repeat opacity-55 hover:opacity-100"
      />

      <button
        type="button"
        aria-label={t('settings.open')}
        title={t('settings.open')}
        onClick={() => setSettingsOpen(true)}
        style={box(LAYOUT.settings)}
        className="z-30 flex cursor-pointer items-center justify-center text-gold opacity-55 hover:opacity-100"
      >
        <Settings aria-hidden className="size-full" />
      </button>

      <button
        type="button"
        aria-label={t('match.shortcuts')}
        title={t('match.shortcuts')}
        onClick={() => setHelpOpen(true)}
        style={box(LAYOUT.help)}
        className="z-30 flex cursor-pointer items-center justify-center text-gold opacity-55 hover:opacity-100"
      >
        <Keyboard aria-hidden className="size-full" />
      </button>

      <MutatorBadges mutators={state.mutators} />
      <CardPreview state={state} primaryAction={primaryAction} />
      <SpotlightCard />
      <NoticeBanner />

      <AnimatePresence>
        {redrawing && !noticeShowing && <RedrawModal key="redraw" state={state} human={human} />}
        {choice && !noticeShowing && (
          <ChoiceModal
            key={JSON.stringify(choice.resume)}
            state={state}
            choice={choice}
            human={human}
          />
        )}
        {viewing && (
          <CardListModal
            key="viewing"
            state={state}
            title={viewing.title}
            cardIds={viewing.cardIds}
            startId={viewing.startId}
            onClose={() => view(null)}
          />
        )}
        {revealed && (
          <CardListModal
            key="revealed"
            state={state}
            title={t('match.revealed')}
            cardIds={revealed}
            onClose={closeReveal}
          />
        )}
        {settingsOpen && <SettingsModal key="settings" onClose={() => setSettingsOpen(false)} />}
        {helpOpen && <KeyboardHelp key="help" onClose={() => setHelpOpen(false)} />}
        {confirmingExit && (
          <Modal
            key="exit"
            title={t('match.exit')}
            footer={
              <>
                <Button onClick={onExit}>{tGame('game.exit')}</Button>
                <Button onClick={() => setConfirmingExit(false)}>{tGame('game.resume')}</Button>
              </>
            }
          >
            <p className="text-[1.1cqw]">{tGame('game.quitBody')}</p>
          </Modal>
        )}
      </AnimatePresence>

      {gameOver && (
        <EndScreen
          state={state}
          human={human}
          bot={bot}
          opponentName={opponentName}
          recording={recording}
          note={endNote ?? null}
          playAgainLabel={playAgainLabel ?? t('match.end.playAgain')}
          onPlayAgain={onPlayAgain}
          onMenu={onExit}
          onWatchReplay={onWatchReplay}
        />
      )}
      {overlay}
    </Stage>
  );
}
