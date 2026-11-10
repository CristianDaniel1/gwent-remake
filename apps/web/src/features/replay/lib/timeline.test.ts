import {
  applyAction,
  chooseAiAction,
  createGame,
  getLegalActions,
  PLAYER_IDS,
  PREMADE_DECKS,
  randomFrom,
  type DeckList,
  type GameAction,
} from '@gwent/engine';
import { describe, expect, it } from 'vitest';
import { botSuggestion, buildTimeline, roundAt } from './timeline';

const decks = { p1: PREMADE_DECKS[0] as DeckList, p2: PREMADE_DECKS[4] as DeckList };

/** A full bot-vs-bot match, like one recorded by the game. */
function recordedMatch(seed: number) {
  let { state } = createGame({ seed, decks });
  const rng = randomFrom({ state: seed });
  const actions: GameAction[] = [];
  while (state.phase !== 'gameOver') {
    const action = PLAYER_IDS.map((p) => chooseAiAction(state, p, rng)).find(Boolean)!;
    const result = applyAction(state, action);
    if (!result.ok) throw new Error(result.error.code);
    state = result.state;
    actions.push(action);
  }
  return { seed, decks, actions, final: state };
}

describe('buildTimeline', () => {
  it('rebuilds every state of the match and ends in the same final state', () => {
    const match = recordedMatch(3);
    const timeline = buildTimeline(match);
    expect(timeline.frames).toHaveLength(match.actions.length + 1);
    expect(timeline.frames.at(-1)?.state).toEqual(match.final);
    expect(timeline.frames[0]?.action).toBeNull();
    expect(timeline.frames[1]?.action).toEqual(match.actions[0]);
    expect(timeline.brokenAt).toBeNull();
  });

  it('marks where each round starts', () => {
    const timeline = buildTimeline(recordedMatch(3));
    expect(timeline.roundStarts.length).toBeGreaterThanOrEqual(2);
    expect(timeline.roundStarts).toEqual([...timeline.roundStarts].sort((a, b) => a - b));
    expect(roundAt(timeline, 0)).toBe(0);
    expect(roundAt(timeline, timeline.roundStarts[1]!)).toBe(2);
  });

  it('stops at the first illegal action of a corrupted replay', () => {
    const match = recordedMatch(3);
    const actions = [...match.actions];
    actions.splice(5, 0, { type: 'PASS', player: 'p1' }); // nobody can pass during the redraw
    const timeline = buildTimeline({ ...match, actions });
    expect(timeline.brokenAt).toBe(5);
    expect(timeline.frames).toHaveLength(6);
  });
});

describe('botSuggestion', () => {
  it('suggests a legal move for the player about to act, the same one every time', () => {
    const timeline = buildTimeline(recordedMatch(4));
    const index = timeline.roundStarts[0]!;
    const { state } = timeline.frames[index]!;
    const player = state.currentPlayer!;
    const suggestion = botSuggestion(state, player, index);
    expect(getLegalActions(state, player)).toContainEqual(suggestion);
    expect(botSuggestion(state, player, index)).toEqual(suggestion);
  });
});
