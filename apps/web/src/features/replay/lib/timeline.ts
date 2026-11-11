import {
  applyAction,
  chooseAiAction,
  createGame,
  randomFrom,
  type GameAction,
  type GameState,
  type PlayerId,
} from '@gwent/engine';
import type { Frame, ReplaySource, Timeline } from '../interfaces/timeline';

/**
 * Replays the actions and keeps the state after each one.
 *
 * @param source - Seed, decks, actions and rules of the match.
 * @returns The frames, round starts and the first invalid action, if any.
 */
export const buildTimeline = ({ seed, decks, actions, mutators = [] }: ReplaySource): Timeline => {
  const start = createGame({ seed, decks, mutators });
  const frames: Frame[] = [{ state: start.state, action: null, events: start.events }];
  const roundStarts: number[] = [];
  let brokenAt: number | null = null;

  for (const [index, entry] of actions.entries()) {
    const action = entry as GameAction;
    const result = applyAction(frames[index]!.state, action);
    if (!result.ok) {
      brokenAt = index;
      break;
    }
    frames.push({ state: result.state, action, events: result.events });
    if (result.events.some((event) => event.type === 'ROUND_STARTED')) roundStarts.push(index + 1);
  }
  return { frames, roundStarts, brokenAt };
};

/**
 * Finds the round shown at a frame.
 *
 * @param timeline - Replay timeline.
 * @param frame - Frame index.
 * @returns The round number, 0 before the first round.
 */
export const roundAt = (timeline: Timeline, frame: number): number =>
  timeline.roundStarts.filter((start) => start <= frame).length;

/**
 * Finds the action the rule-based bot would choose.
 *
 * @param state - Game state.
 * @param player - Player to act.
 * @param frame - Frame index, used as the random seed.
 * @returns The suggested action, or null.
 */
export const botSuggestion = (
  state: GameState,
  player: PlayerId,
  frame: number,
): GameAction | null =>
  chooseAiAction(state, player, randomFrom({ state: (state.seed ^ (frame * 2654435761)) >>> 0 }));
