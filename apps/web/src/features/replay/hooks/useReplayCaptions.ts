import type { PlayerId } from '@gwent/engine';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { botSuggestion, roundAt } from '../lib/timeline';
import { type Timeline } from '../interfaces/timeline';
import { useMoveText } from './useMoveText';

/**
 * Builds the texts shown under the replay controls.
 *
 * @param timeline - Replay timeline.
 * @param frame - Current frame.
 * @param names - Player names.
 * @returns The round label, caption and bot hint.
 */
export const useReplayCaptions = (
  timeline: Timeline,
  frame: number,
  names: Record<PlayerId, string>,
) => {
  const { t: translate } = useTranslation();
  const moveText = useMoveText(names);
  const last = timeline.frames.length - 1;
  const current = timeline.frames[frame];
  const before = timeline.frames[frame - 1];
  const next = timeline.frames[frame + 1];
  const state = current?.state;

  const hint = useMemo(() => {
    if (!next?.action || !state) return null;
    const suggestion = botSuggestion(state, next.action.player, frame);
    return suggestion ? translate('replay.botWould', { move: moveText(suggestion, state) }) : null;
  }, [next, state, frame, moveText, translate]);

  const round = roundAt(timeline, frame);
  const roundLabel = round ? translate('replay.round', { n: round }) : translate('replay.start');
  const atEnd = frame === last;

  const resultText = (): string | null => {
    if (!atEnd || !state?.result) return null;
    if (state.result === 'draw') return translate('replay.result.draw');
    return translate('replay.result.win', { name: names[state.result] });
  };
  const result = resultText();
  const broken =
    atEnd && timeline.brokenAt !== null
      ? translate('replay.broken', { n: timeline.brokenAt + 1 })
      : null;
  const lastMove =
    current?.action && before
      ? translate('replay.lastMove', {
          player: names[current.action.player],
          move: moveText(current.action, before.state),
        })
      : translate('replay.start');

  return { roundLabel, caption: broken ?? result ?? lastMove, hint: result ? null : hint };
};
