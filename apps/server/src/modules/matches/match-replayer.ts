import { Injectable, UnprocessableEntityException } from '@nestjs/common';
import { applyAction, createGame, getMutator, validateDeck, type GameAction } from '@gwent/engine';
import type { CreateMatch } from '@gwent/shared';
import { resultFor } from './helpers/match-result';
import type { ReplayOutcome } from './interfaces/match.interfaces';

/** Replays matches with the engine, so results always come from the server, never the client. */
@Injectable()
export class MatchReplayer {
  /**
   * Replays a match, checking that the mutators exist, the decks are valid, every action was legal
   * at the time and the match finished.
   *
   * @param match - Seed, decks, mutators and actions of the match.
   * @returns The final state, the result for p1 and the round scores.
   * @throws UnprocessableEntityException - When a mutator, deck or action is invalid, or the match
   * did not finish.
   */
  replay({ seed, decks, actions, mutators = [] }: CreateMatch): ReplayOutcome {
    const unknownMutators = mutators.filter((mutator) => !getMutator(mutator));
    if (unknownMutators.length) {
      throw new UnprocessableEntityException({
        message: 'Unknown mutators',
        details: unknownMutators,
      });
    }
    for (const player of ['p1', 'p2'] as const) {
      const issues = validateDeck(decks[player]);
      if (issues.length) {
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

    if (state.phase !== 'gameOver' || !state.result) {
      throw new UnprocessableEntityException('The match did not finish');
    }
    return { state, result: resultFor(state, 'p1'), rounds: state.roundHistory };
  }
}
