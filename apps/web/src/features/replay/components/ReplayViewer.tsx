import { opponentOf, type PlayerId } from '@gwent/engine';
import type { ReplayFile } from '@gwent/shared';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Board, useUiStore, type ReadOnlyMatch } from '@/features/game';
import { usePlayback } from '../hooks/usePlayback';
import { useReplayCaptions } from '../hooks/useReplayCaptions';
import { useReplayKeys } from '../hooks/useReplayKeys';
import { useStepSounds } from '../hooks/useStepSounds';
import { downloadReplay } from '../lib/replay-file';
import { buildTimeline } from '../lib/timeline';
import { ReplayControls } from './ReplayControls';

interface ReplayViewerProps {
  replay: ReplayFile;
  onExit: () => void;
}

export const ReplayViewer = ({ replay, onExit }: ReplayViewerProps) => {
  const { t: translate } = useTranslation();
  const timeline = useMemo(() => buildTimeline(replay), [replay]);
  const last = timeline.frames.length - 1;
  const { frame, playing, speed, setSpeed, seek, toggle } = usePlayback(last);
  const [bottom, setBottom] = useState<PlayerId>(replay.side);
  const resetUi = useUiStore((store) => store.reset);
  const top = opponentOf(bottom);

  const names = useMemo<Record<PlayerId, string>>(() => {
    const fallback = (player: PlayerId) =>
      player === replay.side ? translate('match.you') : translate('match.opponent');
    return {
      p1: replay.names.p1 || fallback('p1'),
      p2: replay.names.p2 || fallback('p2'),
    };
  }, [replay, translate]);
  const { roundLabel, caption, hint } = useReplayCaptions(timeline, frame, names);

  useStepSounds(timeline, frame, bottom);
  useReplayKeys({ frame, last, toggle, seek });
  useEffect(() => resetUi(), [resetUi, bottom, replay]);

  const state = timeline.frames[frame]?.state ?? timeline.frames[0]!.state;
  const match: ReadOnlyMatch = {
    mode: 'replay',
    state,
    human: bottom,
    opponent: top,
    humanName: names[bottom],
    opponentName: names[top],
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
          caption={caption}
          hint={hint}
          otherName={names[top]}
          onSeek={seek}
          onToggle={toggle}
          onSpeed={setSpeed}
          onSwapSides={() => setBottom(top)}
          onExport={() => downloadReplay(replay)}
        />
      }
    />
  );
};
