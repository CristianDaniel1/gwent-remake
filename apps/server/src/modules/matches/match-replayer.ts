import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import {
  applyAction,
  createGame,
  getMutator,
  validateDeck,
  type GameAction,
  type GameState,
  type PlayerId,
  type RoundResult,
} from '@gwent/engine';
import type { CreateMatch, MatchResultKind } from '@gwent/shared';

/** Result of a finished match from one seat's point of view. */
export function resultFor(state: GameState, side: PlayerId): MatchResultKind {
  if (state.result === 'draw') return 'draw';
  return state.result === side ? 'win' : 'loss';
}

export interface ReplayOutcome {
  state: GameState;
  /** From p1's point of view (use resultFor for p2). */
  result: MatchResultKind;
  rounds: RoundResult[];
}

/**
 * Replays a match with the engine (the same one the frontend uses). Ensures the decks are valid,
 * that every action was legal at the time and that the match finished. The result comes from here,
 * never from the client.
 */
@Injectable()
export class MatchReplayer {
  replay({ seed, decks, actions, mutators = [] }: CreateMatch): ReplayOutcome {
    const unknown = mutators.filter((id) => !getMutator(id));
    if (unknown.length > 0) {
      throw new UnprocessableEntityException({ message: 'Unknown mutators', details: unknown });
    }
    for (const player of ['p1', 'p2'] as const) {
      const issues = validateDeck(decks[player]);
      if (issues.length > 0) {
        throw new UnprocessableEntityException({
          message: `Invalid deck for ${player}`,
          details: issues,
        });
      }
    }

    let { state } = createGame({ seed, decks, mutators });
    actions.forEach((action, index) => {
      const result = applyAction(state, action as GameAction);
      if (!result.ok) {
        throw new UnprocessableEntityException({
          message: `Illegal action at position ${index}`,
          details: { index, code: result.error.code, action },
        });
      }
      state = result.state;
    });

    if (state.phase !== 'gameOver' || state.result === null) {
      throw new UnprocessableEntityException('The match did not finish');
    }
    return { state, result: resultFor(state, 'p1'), rounds: state.roundHistory };
  }
}
