import {
  createGame,
  PREMADE_DECKS,
  type CardInstanceId,
  type DeckList,
  type GameEvent,
} from '@gwent/engine';
import { describe, expect, it } from 'vitest';
import { soundsFor } from './sounds';

const { state } = createGame({
  seed: 1,
  decks: { p1: PREMADE_DECKS[0] as DeckList, p2: PREMADE_DECKS[2] as DeckList },
});
const handCard = state.players.p1.hand[0] as CardInstanceId;

describe('soundsFor', () => {
  it("plays abilities, passes and round end from the human's point of view", () => {
    const events: GameEvent[] = [
      { type: 'ABILITY_TRIGGERED', ability: 'medic', player: 'p1' },
      { type: 'ABILITY_TRIGGERED', ability: 'storm', player: 'p1' },
      { type: 'PLAYER_PASSED', player: 'p2', automatic: false },
      { type: 'ROUND_ENDED', round: 1, winner: 'p2', scores: { p1: 1, p2: 2 } },
    ];
    expect(soundsFor(events, [], state, 'p1')).toEqual(['medic', 'fog', 'pass', 'round_lose']);
  });

  it('plays a single game start sound for the 20 initial draws', () => {
    const draw = (cardId: CardInstanceId): GameEvent => ({
      type: 'CARD_MOVED',
      cardId,
      from: { kind: 'deck', player: 'p1' },
      to: { kind: 'hand', player: 'p1' },
      reason: 'draw',
    });
    expect(soundsFor([draw(handCard), draw(handCard)], [], state, 'p1')).toEqual(['game_start']);
  });

  it('plays the turn sound only when the turn notification shows up', () => {
    expect(soundsFor([], [{ key: 'op-turn', icon: '' }], state, 'p1')).toEqual(['turn_op']);
    expect(soundsFor([], [], state, 'p1')).toEqual([]);
  });

  it('plays match victory and defeat', () => {
    expect(soundsFor([{ type: 'GAME_ENDED', result: 'p1' }], [], state, 'p1')).toEqual([
      'game_win',
    ]);
    expect(soundsFor([{ type: 'GAME_ENDED', result: 'draw' }], [], state, 'p1')).toEqual([
      'game_lose',
    ]);
  });
});
