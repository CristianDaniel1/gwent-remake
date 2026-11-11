import {
  createGame,
  defOf,
  PREMADE_DECKS,
  type CardInstanceId,
  type DeckList,
  type GameEvent,
  type Zone,
} from '@gwent/engine';
import { describe, expect, it } from 'vitest';
import { animationsFrom, arrivals, burnedCards, departures, opponentReveal } from './animations';

const { state: initial } = createGame({
  seed: 1,
  decks: { p1: PREMADE_DECKS[0] as DeckList, p2: PREMADE_DECKS[2] as DeckList },
});

const board = () => {
  const state = structuredClone(initial);
  const [action, right, card] = state.players.p1.hand as unknown as [
    CardInstanceId,
    CardInstanceId,
    CardInstanceId,
  ];
  state.players.p1.hand = state.players.p1.hand.slice(3);
  state.players.p1.rows.close.units = [action, right];
  state.players.p1.rows.ranged.special = card;
  return { state, a: action, b: right, c: card };
};

describe('move animations', () => {
  it('shows the ability icon over the card that triggered it', () => {
    const { state, a: action } = board();
    const result = animationsFrom(
      [{ type: 'ABILITY_TRIGGERED', ability: 'medic', player: 'p1', cardId: action }],
      state,
    );
    expect(result.cards).toEqual({ [action]: 'medic' });
    expect(result.rows).toEqual([]);
  });

  it("lights the whole row for the Commander's Horn, also from the special slot", () => {
    const { state, c: card } = board();
    const result = animationsFrom(
      [{ type: 'ABILITY_TRIGGERED', ability: 'horn', player: 'p1', cardId: card }],
      state,
    );
    expect(result.rows).toEqual([{ side: 'p1', row: 'ranged', anim: 'horn' }]);
  });

  it('ignores abilities without an animation', () => {
    const { state, a: action } = board();
    const result = animationsFrom(
      [{ type: 'ABILITY_TRIGGERED', ability: 'decoy', player: 'p1', cardId: action }],
      state,
    );
    expect(result).toEqual({ cards: {}, rows: [], heroes: [] });
  });

  it('burns only units destroyed on the board', () => {
    const events: GameEvent[] = [
      {
        type: 'CARD_MOVED',
        cardId: 'x',
        from: { kind: 'row', side: 'p2', row: 'close' },
        to: { kind: 'grave', player: 'p2' },
        reason: 'destroy',
      },
      {
        type: 'CARD_MOVED',
        cardId: 'y',
        from: { kind: 'hand', player: 'p1' },
        to: { kind: 'grave', player: 'p1' },
        reason: 'discard',
      },
    ] as GameEvent[];
    expect(burnedCards(events)).toEqual(['x']);
  });

  it("spotlights only the opponent's card", () => {
    const { state, a: action } = board();
    const played = (player: 'p1' | 'p2'): GameEvent[] => [
      { type: 'CARD_PLAYED', player, cardId: action } as GameEvent,
    ];
    expect(opponentReveal(played('p2'), 'p1', state)).toBe(action);
    expect(opponentReveal(played('p1'), 'p1', state)).toBeNull();
  });

  it('sets heroes on fire only when they enter the board', () => {
    const hero = (Object.keys(initial.cards) as CardInstanceId[]).find(
      (id) => defOf(initial, id).hero,
    );
    expect(hero).toBeDefined();
    const moved = (reason: 'play' | 'return'): GameEvent[] => [
      {
        type: 'CARD_MOVED',
        cardId: hero as CardInstanceId,
        from: { kind: 'hand', player: 'p1' },
        to: { kind: 'row', side: 'p1', row: 'close' },
        reason,
      },
    ];
    expect(animationsFrom(moved('play'), initial).heroes).toEqual([hero]);
    expect(animationsFrom(moved('return'), initial).heroes).toEqual([]);
  });
});

describe('cards flying to and from the piles', () => {
  const cards = () => {
    const state = structuredClone(initial);
    const [first, second, third] = state.players.p1.hand as unknown as [
      CardInstanceId,
      CardInstanceId,
      CardInstanceId,
    ];
    state.players.p1.hand = state.players.p1.hand.slice(3);
    return { state, x: first, y: second, z: third };
  };
  const move = (
    cardId: CardInstanceId,
    from: Zone,
    to: Zone,
    reason: 'revive' | 'draw' | 'destroy' = 'revive',
  ) => ({ type: 'CARD_MOVED', cardId, from, to, reason }) as GameEvent;
  const grave = { kind: 'grave', player: 'p1' } as const;
  const deck = { kind: 'deck', player: 'p1' } as const;
  const row = { kind: 'row', side: 'p1', row: 'close' } as const;

  it('flies a card revived from deep in the grave to its row', () => {
    const before = cards();
    before.state.players.p1.grave = [before.x, before.y];
    const after = structuredClone(before.state);
    after.players.p1.grave = [before.y];
    after.players.p1.rows.close.units = [before.x];

    const events = [move(before.x, grave, row)];
    expect(arrivals(events, before.state, after, 'p1', null)).toEqual([
      { cardId: before.x, zone: grave },
    ]);
    expect(arrivals(events, before.state, after, 'p1', before.x)).toEqual([]);
  });

  it('does not duplicate the top card of the grave (it is already drawn)', () => {
    const before = cards();
    before.state.players.p1.grave = [before.y, before.x];
    const after = structuredClone(before.state);
    after.players.p1.grave = [before.y];
    after.players.p1.rows.close.units = [before.x];
    expect(arrivals([move(before.x, grave, row)], before.state, after, 'p1', null)).toEqual([]);
  });

  it("flies drawn cards from the deck to the human's hand, not to the opponent's", () => {
    const { state, x: left } = cards();
    const after = structuredClone(state);
    after.players.p1.hand = [left, ...after.players.p1.hand];
    expect(
      arrivals(
        [move(left, deck, { kind: 'hand', player: 'p1' }, 'draw')],
        state,
        after,
        'p1',
        null,
      ),
    ).toEqual([{ cardId: left, zone: deck }]);
    expect(
      arrivals(
        [move(left, deck, { kind: 'hand', player: 'p1' }, 'draw')],
        state,
        after,
        'p2',
        null,
      ),
    ).toEqual([]);
  });

  it('flies cards buried in the grave from the board, but not the new top card', () => {
    const { state, x: left, y: top } = cards();
    const after = structuredClone(state);
    after.players.p1.grave = [left, top];
    const events = [move(left, row, grave, 'destroy'), move(top, row, grave, 'destroy')];
    expect(departures(events, after, 'p1')).toEqual([{ cardId: left, zone: grave }]);
  });
});
