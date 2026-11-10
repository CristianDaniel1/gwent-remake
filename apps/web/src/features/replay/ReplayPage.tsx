import { opponentOf, type PlayerId } from '@gwent/engine';
import { ReplayFileSchema, type ReplayFile } from '@gwent/shared';
import { ArrowLeft } from 'lucide-react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router';
import { Board, playMoveSounds, useUiStore, type ReadOnlyMatch } from '@/features/game';
import { useMatchDetail, useProfile } from '@/features/server';
import { assets } from '@/shared/lib/assets';
import { Stage } from '@/shared/ui/Stage';
import { ReplayControls } from './components/ReplayControls';
import { useMoveText } from './hooks/useMoveText';
import { usePlayback } from './hooks/usePlayback';
import { downloadReplay, fromMatchDetail } from './lib/replay-file';
import { botSuggestion, buildTimeline, roundAt } from './lib/timeline';

/**
 * Replay of a finished match: `/replay/<match id>` (saved on the server) or `/replay/local`
 * (from the end screen or an imported file, passed in the navigation state).
 */
export function ReplayPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const location = useLocation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const profile = useProfile();
  const isLocal = id === 'local';
  const detail = useMatchDetail(isLocal ? null : id);

  const replay = useMemo<ReplayFile | null>(() => {
    if (isLocal) {
      const parsed = ReplayFileSchema.safeParse(location.state);
      return parsed.success ? parsed.data : null;
    }
    return detail.data ? fromMatchDetail(detail.data, profile?.name ?? '') : null;
  }, [isLocal, location.state, detail.data, profile?.name]);

  const exit = () => void navigate(params.get('from') === 'history' || !isLocal ? '/history' : '/');

  if (!replay) {
    return (
      <Stage background={assets.board()}>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-[1cqw] bg-black/85 text-[1.3cqw]">
          <p role="status">
            {!isLocal && detail.isPending ? t('replay.loading') : t('replay.notFound')}
          </p>
          <button
            type="button"
            onClick={exit}
            className="flex cursor-pointer items-center gap-[0.4cqw] text-[1cqw] hover:text-gold"
          >
            <ArrowLeft aria-hidden className="size-[1.2cqw]" />
            {t('deckBuilder.back')}
          </button>
        </div>
      </Stage>
    );
  }
  return <ReplayViewer replay={replay} onExit={exit} />;
}

function ReplayViewer({ replay, onExit }: { replay: ReplayFile; onExit: () => void }) {
  const { t } = useTranslation();
  const timeline = useMemo(() => buildTimeline(replay), [replay]);
  const last = timeline.frames.length - 1;
  const { frame, playing, speed, setSpeed, seek, toggle } = usePlayback(last);
  const [bottom, setBottom] = useState<PlayerId>(replay.side);
  const resetUi = useUiStore((s) => s.reset);

  const names = useMemo<Record<PlayerId, string>>(() => {
    const fallback = (p: PlayerId) => (p === replay.side ? t('match.you') : t('match.opponent'));
    return {
      p1: replay.names.p1 || fallback('p1'),
      p2: replay.names.p2 || fallback('p2'),
    };
  }, [replay, t]);
  const moveText = useMoveText(names);

  const current = timeline.frames[frame]!;
  const before = timeline.frames[frame - 1];
  const next = timeline.frames[frame + 1];
  const state = current.state;

  // Fresh selection/hover/details when the replay or the side changes
  useEffect(() => resetUi(), [resetUi, bottom, replay]);

  // Sounds only when moving one step forward (playing or stepping), not when jumping around
  const previousFrame = useRef(frame);
  useLayoutEffect(() => {
    const from = previousFrame.current;
    previousFrame.current = frame;
    if (frame === from + 1 && before) {
      playMoveSounds(current.events, state, bottom, before.state.currentPlayer);
    }
  }, [frame, current, before, state, bottom]);

  // Keyboard (and controller, which sends the same keys): space/Enter play, arrows step
  const keys = useRef({ toggle, seek, frame, last });
  useLayoutEffect(() => {
    keys.current = { toggle, seek, frame, last };
  });
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if ((e.target as HTMLElement | null)?.closest?.('input, select, textarea, button')) return;
      if (document.querySelector('[role="dialog"]:not([aria-hidden="true"])')) return;
      const k = keys.current;
      if (e.key === ' ' || e.key === 'Enter') k.toggle();
      else if (e.key === 'ArrowLeft') k.seek(k.frame - 1);
      else if (e.key === 'ArrowRight') k.seek(k.frame + 1);
      else if (e.key === 'Home') k.seek(0);
      else if (e.key === 'End') k.seek(k.last);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const round = roundAt(timeline, frame);
  const roundLabel = round === 0 ? t('replay.start') : t('replay.round', { n: round });

  const result =
    frame === last && state.result
      ? state.result === 'draw'
        ? t('replay.result.draw')
        : t('replay.result.win', { name: names[state.result] })
      : null;
  const lastMove =
    current.action && before
      ? t('replay.lastMove', {
          player: names[current.action.player],
          move: moveText(current.action, before.state),
        })
      : t('replay.start');
  const broken =
    timeline.brokenAt !== null && frame === last
      ? t('replay.broken', { n: timeline.brokenAt + 1 })
      : null;

  // Hint for the move that comes next: what the rule-based bot would have done instead
  const hint = useMemo(() => {
    if (!next?.action) return null;
    const suggestion = botSuggestion(state, next.action.player, frame);
    return suggestion ? t('replay.botWould', { move: moveText(suggestion, state) }) : null;
  }, [next, state, frame, moveText, t]);

  const match: ReadOnlyMatch = {
    mode: 'replay',
    state,
    human: bottom,
    opponent: opponentOf(bottom),
    humanName: names[bottom],
    opponentName: names[opponentOf(bottom)],
  };

  return (
    <Board
      match={match}
      onPlayAgain={() => seek(0)}
      onExit={onExit}
      overlay={
        <ReplayControls
          frame={frame}
          last={last}
          playing={playing}
          speed={speed}
          roundStarts={timeline.roundStarts}
          roundLabel={roundLabel}
          caption={broken ?? result ?? lastMove}
          hint={result ? null : hint}
          otherName={names[opponentOf(bottom)]}
          onSeek={seek}
          onToggle={toggle}
          onSpeed={setSpeed}
          onSwapSides={() => setBottom((b) => opponentOf(b))}
          onExport={() => downloadReplay(replay)}
        />
      }
    />
  );
}
