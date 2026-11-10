import {
  applyAction,
  chooseAiAction,
  createGame,
  randomFrom,
  type GameAction,
  type GameEvent,
  type GameState,
  type PlayerId,
} from '@gwent/engine';
import type { ReplayFile } from '@gwent/shared';

/** Seed, decks, rules and actions: everything the engine needs to rebuild the match. */
export type ReplaySource = Pick<ReplayFile, 'seed' | 'decks' | 'actions' | 'mutators'>;

/** One moment of the match: the state after an action (or the starting state). */
export interface Frame {
  state: GameState;
  /** Action that led here (null for the starting frame). */
  action: GameAction | null;
  /** Events of that action (the starting frame has the dealing events). */
  events: readonly GameEvent[];
}

export interface Timeline {
  /** frames[0] is the start; frames[i] comes after actions[i - 1]. */
  frames: Frame[];
  /** Frame index where each round starts (round 1 first). */
  roundStarts: number[];
  /** Position of the first action the engine rejected (corrupt file), or null. */
  brokenAt: number | null;
}

/**
 * Rebuilds every state of a recorded match with the engine. The engine is deterministic,
 * so the same seed, decks and actions always produce the same match. Every state is kept:
 * Immer shares the unchanged parts, so a whole match is cheap to hold and jumping around is instant.
 */
export function buildTimeline({ seed, decks, actions, mutators = [] }: ReplaySource): Timeline {
  const start = createGame({ seed, decks, mutators });
  const frames: Frame[] = [{ state: start.state, action: null, events: start.events }];
  const roundStarts: number[] = [];
  let brokenAt: number | null = null;

  for (const [index, entry] of actions.entries()) {
    // Same shape as GameAction (validated by the schema); legality is checked by the engine
    const action = entry as GameAction;
    const result = applyAction(frames[index]!.state, action);
    if (!result.ok) {
      brokenAt = index;
      break;
    }
    frames.push({ state: result.state, action, events: result.events });
    if (result.events.some((e) => e.type === 'ROUND_STARTED')) roundStarts.push(index + 1);
  }
  return { frames, roundStarts, brokenAt };
}

/** Round being played at a frame (0 before the first round starts). */
export function roundAt(timeline: Timeline, frame: number): number {
  return timeline.roundStarts.filter((start) => start <= frame).length;
}

/**
 * What the rule-based bot would do in this state for `player`: a hint to compare with the
 * move that was actually made. Deterministic per frame (the same frame, the same hint).
 */
export function botSuggestion(
  state: GameState,
  player: PlayerId,
  frame: number,
): GameAction | null {
  return chooseAiAction(
    state,
    player,
    randomFrom({ state: (state.seed ^ (frame * 2654435761)) >>> 0 }),
  );
}
