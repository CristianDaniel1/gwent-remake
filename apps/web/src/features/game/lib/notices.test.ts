import type { GameEvent } from '@gwent/engine';
import { describe, expect, it } from 'vitest';
import { noticesFrom } from './notices';

const keys = (events: GameEvent[], lastTurn: 'p1' | 'p2' | null = null) =>
  noticesFrom(events, 'p1', lastTurn).notices.map((n) => n.key);

describe('noticesFrom', () => {
  it('announces the round start followed by the turn notice', () => {
    expect(
      keys([
        { type: 'ROUND_STARTED', round: 1, currentPlayer: 'p2' },
        { type: 'TURN_STARTED', player: 'p2' },
      ]),
    ).toEqual(['round-start', 'op-turn']);
  });

  it('announces the turn only when it changes', () => {
    expect(keys([{ type: 'TURN_STARTED', player: 'p1' }], 'p1')).toEqual([]);
    expect(keys([{ type: 'TURN_STARTED', player: 'p1' }], 'p2')).toEqual(['me-turn']);
  });

  it("reports the round result from the human's point of view", () => {
    const ended = (winner: 'p1' | 'p2' | null): GameEvent => ({
      type: 'ROUND_ENDED',
      round: 1,
      winner,
      scores: { p1: 0, p2: 0 },
    });
    expect(keys([ended('p1')])).toEqual(['win-round']);
    expect(keys([ended('p2')])).toEqual(['lose-round']);
    expect(keys([ended(null)])).toEqual(['draw-round']);
  });

  it('announces faction abilities', () => {
    expect(
      keys([
        { type: 'FACTION_ABILITY', faction: 'realms', player: 'p1' },
        { type: 'FACTION_ABILITY', faction: 'skellige', player: 'p2' },
      ]),
    ).toEqual(['north', 'skellige-op']);
  });
});
