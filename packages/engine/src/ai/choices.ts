// How the bot answers pending choices (medic, agile row, leaders, Scoia'tael).
import type { RandomSource } from '../core/rng';
import { defOf, instanceOf, isRegularUnit } from '../core/zones';
import type { GameAction } from '../model/actions';
import { opponentOf, type CardInstanceId, type PlayerId } from '../model/ids';
import type { GameState } from '../model/state';
import type { PendingChoice } from '../model/tasks';
import { analyze, bestAgileRow, compareCards, countCards, discardOrder } from './analysis';
import { bestWeatherInDeck } from './turn';

/**
 * Best unit to take from a grave:
 * weakest spy, else strongest medic, else one with Scorch, else the strongest.
 */
export function pickFromGrave(
  state: GameState,
  options: readonly CardInstanceId[],
  rng: RandomSource,
): CardInstanceId | undefined {
  const strength = (id: CardInstanceId) => defOf(state, id).strength;
  const counts = countCards(state, options);
  if (counts.spy.length) {
    const min = Math.min(...counts.spy.map(strength));
    return counts.spy.find((id) => strength(id) === min);
  }
  if (counts.medic.length) {
    const max = Math.max(...counts.medic.map(strength));
    return counts.medic.find((id) => strength(id) === max);
  }
  if (counts.scorch.length) return counts.scorch[rng.int(counts.scorch.length)];
  const units = options.filter((id) => isRegularUnit(defOf(state, id)));
  return units.reduce<CardInstanceId | undefined>(
    (best, id) => (best === undefined || strength(best) < strength(id) ? id : best),
    undefined,
  );
}

/** Two cards to discard (Eredin, Destroyer of Worlds): the most disposable, filled up with the weakest. */
function pickDiscards(
  state: GameState,
  me: PlayerId,
  count: number,
  rng: RandomSource,
): CardInstanceId[] {
  const preferred = discardOrder(state, me, rng)
    .slice(0, count)
    .filter((id) => defOf(state, id).strength < 7);
  const rest = state.players[me].hand
    .filter((id) => !preferred.includes(id))
    .sort((x, y) => compareCards(defOf(state, x), defOf(state, y)));
  return [...preferred, ...rest].slice(0, count);
}

export function planChoice(state: GameState, choice: PendingChoice, rng: RandomSource): GameAction {
  const me = choice.player;
  const choose = (...optionIds: string[]): GameAction => ({
    type: 'CHOOSE',
    player: me,
    optionIds,
  });
  const cards = choice.options.flatMap((o) => (o.cardId ? [o.cardId] : []));

  switch (choice.kind) {
    case 'medic':
    case 'stealFromGrave':
    case 'returnFromGrave': {
      const pick = pickFromGrave(state, cards, rng);
      if (pick) return choose(pick);
      break;
    }
    case 'agileRow': {
      const cardId = choice.sourceCardId;
      if (cardId) {
        const owner = instanceOf(state, cardId).owner;
        return choose(bestAgileRow(state, owner, cardId, rng));
      }
      break;
    }
    case 'discard':
      return choose(...pickDiscards(state, me, choice.min, rng));
    case 'drawFromDeck':
      // Draws the top of the deck
      break;
    case 'weatherFromDeck': {
      const best = bestWeatherInDeck(analyze(state, me), cards);
      if (best) return choose(best.cardId);
      break;
    }
    case 'firstPlayer':
      return choose(rng.coin() ? me : opponentOf(me));
  }
  // Unknown choice (new mechanic) or no preference: the first options.
  return choose(...choice.options.slice(0, Math.max(1, choice.min)).map((o) => o.id));
}
