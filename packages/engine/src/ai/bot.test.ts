import { describe, expect, it } from 'vitest';
import { applyAction } from '../core/apply-action';
import { createGame } from '../core/create-game';
import { getLegalActions, isLegalAction } from '../core/legal-actions';
import { deriveSeed, randomFrom, type RandomSource } from '../core/rng';
import { allCardDefs } from '../data/catalog';
import { PREMADE_DECKS } from '../data/premade';
import type { DeckList } from '../model/card';
import { PLAYER_IDS, type PlayerId } from '../model/ids';
import type { GameState } from '../model/state';
import { expectCardsConserved } from '../testing/builders';
import { planAiAction } from './index';

const LEADERS = allCardDefs().filter((d) => d.type === 'leader');

function randomDeck(rng: RandomSource): DeckList {
  const deck = PREMADE_DECKS[rng.int(PREMADE_DECKS.length)] as DeckList;
  const leaders = LEADERS.filter((l) => l.faction === deck.faction);
  return { ...deck, leader: leaders[rng.int(leaders.length)]!.id };
}

type Controller = 'bot' | 'random';

/** Full match; the bot must never plan an illegal action. */
function playMatch(seed: number, controllers: Record<PlayerId, Controller>): GameState {
  const setup = randomFrom({ state: deriveSeed(seed, 'decks') });
  const rngs = {
    p1: randomFrom({ state: deriveSeed(seed, 'p1') }),
    p2: randomFrom({ state: deriveSeed(seed, 'p2') }),
  };
  let { state } = createGame({ seed, decks: { p1: randomDeck(setup), p2: randomDeck(setup) } });

  for (let steps = 0; state.phase !== 'gameOver'; steps++) {
    if (steps > 1000) throw new Error(`Match ${seed} did not finish`);
    let action = null;
    for (const p of PLAYER_IDS) {
      if (controllers[p] === 'bot') {
        action = planAiAction(state, p, rngs[p]);
      } else {
        const legal = getLegalActions(state, p);
        action = legal[rngs[p].int(legal.length)] ?? null;
      }
      if (action) break;
    }
    if (!action) throw new Error(`Nobody acts in match ${seed} (phase ${state.phase})`);
    if (!isLegalAction(state, action)) {
      throw new Error(`Bot planned an illegal action in match ${seed}: ${JSON.stringify(action)}`);
    }
    const result = applyAction(state, action);
    if (!result.ok) throw new Error(result.error.code);
    state = result.state;
  }
  return state;
}

describe('bot', () => {
  it('plays 1000 bot-vs-bot matches with only legal actions, all of them finishing', () => {
    const started = Date.now();
    const results = { p1: 0, p2: 0, draw: 0 };
    for (let seed = 1; seed <= 1000; seed++) {
      const final = playMatch(seed, { p1: 'bot', p2: 'bot' });
      expectCardsConserved(final);
      results[final.result!]++;
    }
    const elapsed = Date.now() - started;
    expect(results.p1).toBeGreaterThan(300);
    expect(results.p2).toBeGreaterThan(300);
    expect(elapsed).toBeLessThan(30_000);
  }, 120_000);

  it('beats a random player in the vast majority of matches', () => {
    let wins = 0;
    const games = 200;
    for (let seed = 1; seed <= games; seed++) {
      const bot: PlayerId = seed % 2 ? 'p1' : 'p2';
      const final = playMatch(seed, {
        p1: bot === 'p1' ? 'bot' : 'random',
        p2: bot === 'p2' ? 'bot' : 'random',
      });
      if (final.result === bot) wins++;
    }
    expect(wins / games).toBeGreaterThan(0.8);
  }, 120_000);

  it('is deterministic: same seed, same match', () => {
    const a = playMatch(7, { p1: 'bot', p2: 'bot' });
    const b = playMatch(7, { p1: 'bot', p2: 'bot' });
    expect(a).toEqual(b);
  });
});
