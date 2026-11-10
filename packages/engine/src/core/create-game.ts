import { produce } from 'immer';
import { getCardDef } from '../data/catalog';
import type { CardInstance, DeckList } from '../model/card';
import type { GameEvent } from '../model/events';
import { cardDefId, cardInstanceId, type CardInstanceId, type PlayerId } from '../model/ids';
import type { BoardSide, GameState, PlayerState } from '../model/state';
import { getAbility, getMutator } from '../mechanics/registry';
import { createContext } from './context';
import { insertRandom } from './board';
import { createRngStreams, randomFrom } from './rng';
import { runStack } from './stack';

export { HAND_SIZE } from './turn-flow';
export const MAX_REDRAWS = 2;
export const STARTING_HEALTH = 2;

/** Leader that cancels both players' leader abilities. */
const LEADER_CANCELLER = 'emhyr_whiteflame';

export interface CreateGameOptions {
  /** Match seed: same seed + same actions = same match. */
  seed: number;
  decks: Record<PlayerId, DeckList>;
  /** Extra match rules (see mechanics/mutators). Unknown ids are rejected. */
  mutators?: readonly string[];
}

export interface GameUpdate {
  state: GameState;
  events: GameEvent[];
}

const emptySide = (): BoardSide => ({
  close: { units: [], special: null },
  ranged: { units: [], special: null },
  siege: { units: [], special: null },
});

/**
 * Creates a new match: builds the shuffled decks, runs the start effects,
 * decides who starts and draws the hands. Decks must be validated beforehand (validateDeck).
 * If a faction asks for a choice at the start (Scoia'tael), the match stays in "setup" until the CHOOSE.
 */
export function createGame({ seed, decks, mutators = [] }: CreateGameOptions): GameUpdate {
  for (const id of mutators) {
    if (!getMutator(id)) throw new Error(`Unknown mutator: ${id}`);
  }
  const rng = createRngStreams(seed);
  const cards: Record<CardInstanceId, CardInstance> = {};
  let nextInstanceId = 0;
  const spawn = (defId: number, owner: PlayerId): CardInstanceId => {
    getCardDef(cardDefId(defId)); // fail early when the id does not exist
    const id = cardInstanceId(`c${nextInstanceId++}`);
    cards[id] = { id, defId: cardDefId(defId), owner };
    return id;
  };

  const leaderAbilities = (player: PlayerId) =>
    getCardDef(cardDefId(decks[player].leader)).abilities;
  const leadersCancelled = (['p1', 'p2'] as const).some((p) =>
    leaderAbilities(p).includes(LEADER_CANCELLER),
  );

  const buildPlayer = (player: PlayerId): PlayerState => {
    const deckList = decks[player];
    const leader = spawn(deckList.leader, player);
    const deckRng = randomFrom(player === 'p1' ? rng.deckHost : rng.deckGuest);
    const deck: CardInstanceId[] = [];
    for (const [defId, count] of deckList.cards) {
      for (let i = 0; i < count; i++) insertRandom(deck, spawn(defId, player), deckRng);
    }
    return {
      id: player,
      faction: deckList.faction,
      leader,
      leaderAvailable:
        !leadersCancelled && leaderAbilities(player).some((a) => getAbility(a)?.onActivate),
      leaderDisabled: leadersCancelled,
      halfWeather: false,
      deck,
      hand: [],
      grave: [],
      rows: emptySide(),
      health: STARTING_HEALTH,
      passed: false,
      redrawsLeft: MAX_REDRAWS,
      redrawDone: false,
    };
  };

  const initial: GameState = {
    seed: seed >>> 0,
    phase: 'setup',
    cards,
    players: { p1: buildPlayer('p1'), p2: buildPlayer('p2') },
    weather: [],
    currentPlayer: null,
    firstPlayer: null,
    round: 0,
    roundHistory: [],
    result: null,
    flags: {
      doubleSpyPower: false,
      randomRespawn: false,
      // Scoia'tael against Scoia'tael: neither uses the faction ability.
      factionAbilitiesDisabled:
        decks.p1.faction === 'scoiatael' && decks.p2.faction === 'scoiatael',
    },
    mutators: [...new Set(mutators)],
    pendingChoice: null,
    stack: [],
    rng,
    nextInstanceId, // already includes every card created above
  };

  const events: GameEvent[] = [];
  const state = produce(initial, (draft) => {
    const ctx = createContext(draft, events);
    for (const id of draft.mutators) getMutator(id)?.setup?.(draft);
    // Start effects (e.g. Scoia'tael choosing who starts) run before the coin flip.
    ctx.schedule({ type: 'HOOKS', hook: 'gameStart' }, { type: 'DEAL' });
    runStack(ctx);
  });

  return { state, events };
}
