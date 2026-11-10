import { describe, expect, it } from 'vitest';
import { act, expectCardsConserved, newGame } from '../testing/builders';
import { applyAction } from './apply-action';
import { getLegalActions } from './legal-actions';

describe('redraw phase', () => {
  it('swaps the card for the top of the deck and sends the old one to the bottom', () => {
    const { state } = newGame();
    const me = state.players.p1;
    const returned = me.hand[3]!;
    const top = me.deck[0]!;

    const { state: next, events } = act(state, { type: 'REDRAW', player: 'p1', cardId: returned });

    expect(next.players.p1.hand[3]).toBe(top);
    expect(next.players.p1.deck.at(-1)).toBe(returned);
    expect(next.players.p1.redrawsLeft).toBe(1);
    expect(events).toEqual([{ type: 'CARD_REDRAWN', player: 'p1', returned, drawn: top }]);
    expectCardsConserved(next);
  });

  it('ends on its own after 2 redraws', () => {
    let { state } = newGame();
    state = act(state, { type: 'REDRAW', player: 'p1', cardId: state.players.p1.hand[0]! }).state;
    const result = act(state, { type: 'REDRAW', player: 'p1', cardId: state.players.p1.hand[1]! });
    expect(result.state.players.p1.redrawDone).toBe(true);
    expect(result.events.at(-1)).toEqual({ type: 'REDRAW_ENDED', player: 'p1' });
    expect(getLegalActions(result.state, 'p1')).toEqual([]);
  });

  it('lets both players redraw at the same time and starts the round when both finish', () => {
    let { state } = newGame();
    state = act(state, { type: 'END_REDRAW', player: 'p2' }).state;
    expect(state.phase).toBe('redraw');

    const { state: started, events } = act(state, { type: 'END_REDRAW', player: 'p1' });
    expect(started.phase).toBe('playing');
    expect(started.round).toBe(1);
    expect(started.currentPlayer).toBe(state.firstPlayer);
    expect(events.map((e) => e.type)).toEqual(['REDRAW_ENDED', 'ROUND_STARTED', 'TURN_STARTED']);
  });

  it('rejects playing a card during the redraw', () => {
    const { state } = newGame();
    const result = applyAction(state, {
      type: 'PLAY_CARD',
      player: 'p1',
      cardId: state.players.p1.hand[0]!,
    });
    expect(result).toMatchObject({ ok: false, error: { code: 'WRONG_PHASE' } });
  });

  it('rejects redrawing a card that is not in the hand', () => {
    const { state } = newGame();
    const result = applyAction(state, {
      type: 'REDRAW',
      player: 'p1',
      cardId: state.players.p1.deck[0]!,
    });
    expect(result).toMatchObject({ ok: false, error: { code: 'ILLEGAL_ACTION' } });
  });
});
