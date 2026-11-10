import {
  applyAction,
  createGame,
  deriveSeed,
  opponentOf,
  randomFrom,
  type AiDifficulty,
  type CardInstanceId,
  type GameAction,
  type GameEvent,
  type GameState,
  type PlayerId,
  type RandomSource,
} from '@gwent/engine';
import type { GameUpdate } from '@gwent/shared';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { noticesFrom, type Notice } from '../lib/notices';
import type { MatchSetup } from '../lib/setup';

interface MatchBase {
  /** State the human sees (online, already projected by the server). */
  state: GameState;
  /** Human's side (at the bottom of the board). */
  human: PlayerId;
  opponent: PlayerId;
}

/** Against the bot: the engine runs here in the browser. */
export interface LocalMatch extends MatchBase {
  mode: 'local';
  setup: MatchSetup;
  /** Bot randomness: derived from the seed, so the match is reproducible. */
  botRandom: RandomSource;
  /** Computer opponent strength, fixed when the match starts. */
  difficulty: AiDifficulty;
  /** Applied actions, in order: with the seed and the decks, they reproduce the match (history/replay). */
  actions: GameAction[];
}

/** Against another person: the server is the authority; here we only send actions and receive state. */
export interface OnlineMatch extends MatchBase {
  mode: 'online';
  opponentName: string;
  /** Sends to the server; resolves with false when the move is rejected. */
  send(action: GameAction): Promise<boolean>;
  /** Move sent, waiting for the server's answer (the interface is locked). */
  awaiting: boolean;
}

export type Match = LocalMatch | OnlineMatch;

/**
 * A match being watched: a replay (state from the replay timeline) or a live match as a
 * spectator (state from the server, without hands). Read-only.
 */
export interface ReadOnlyMatch extends MatchBase {
  mode: 'replay' | 'spectate';
  /** Names shown on the player panels (bottom and top). */
  humanName: string;
  opponentName: string;
}

/** Anything the board can show. */
export type BoardMatch = Match | ReadOnlyMatch;

interface GameStore {
  match: Match | null;
  /** Queued notifications (one at a time on screen). */
  notices: Notice[];
  /** Opponent hand cards revealed to the human (Emhyr, the Emperor). */
  revealed: CardInstanceId[] | null;
  lastTurn: PlayerId | null;
  /** Latest batch of events (numbered), for side effects such as sounds. */
  eventLog: { seq: number; events: GameEvent[]; notices: Notice[] } | null;

  startMatch(setup: MatchSetup): void;
  /** Online match: the first state (and every later one) comes from the server. */
  receiveOnline(update: GameUpdate, connection: Pick<OnlineMatch, 'opponentName' | 'send'>): void;
  /** Plays: applies it in the engine (local) or sends it to the server (online). False if rejected. */
  dispatch(action: GameAction): boolean;
  dismissNotice(): void;
  closeReveal(): void;
  leave(): void;
}

/** State without pending notifications (a new object on each use). */
const empty = (): Pick<GameStore, 'notices' | 'revealed' | 'lastTurn' | 'eventLog'> => ({
  notices: [],
  revealed: null,
  lastTurn: null,
  eventLog: null,
});

export const useGameStore = create<GameStore>()(
  devtools(
    (set, get) => {
      /** Turns the events of an action into notifications and reveals for the human. */
      const absorb = (events: GameEvent[], human: PlayerId) => {
        const { notices, lastTurn } = noticesFrom(events, human, get().lastTurn);
        const reveal = events.find(
          (e): e is Extract<GameEvent, { type: 'CARDS_REVEALED' }> =>
            e.type === 'CARDS_REVEALED' && e.player === human,
        );
        set((s) => ({
          notices: [...s.notices, ...notices],
          lastTurn,
          eventLog: { seq: (s.eventLog?.seq ?? 0) + 1, events, notices },
          ...(reveal ? { revealed: reveal.cardIds } : {}),
        }));
      };

      return {
        match: null,
        ...empty(),

        startMatch: (setup) => {
          const { state, events } = createGame(setup);
          set({
            match: {
              mode: 'local',
              setup,
              state,
              human: 'p1',
              opponent: 'p2',
              botRandom: randomFrom({ state: deriveSeed(setup.seed, 'bot') }),
              difficulty: setup.difficulty ?? 'normal',
              actions: [],
            },
            ...empty(),
          });
          absorb(events, 'p1');
        },

        receiveOnline: (update, connection) => {
          const current = get().match;
          // Rematch: a new match in the same room (the state goes back to the initial redraw)
          const fresh = current?.mode !== 'online' || update.state.round < current.state.round;
          set({
            match: {
              mode: 'online',
              state: update.state,
              human: update.you,
              opponent: opponentOf(update.you),
              ...connection,
              awaiting: false,
            },
            ...(fresh ? empty() : {}),
          });
          absorb(update.events, update.you);
        },

        dispatch: (action) => {
          const match = get().match;
          if (!match) return false;
          if (match.mode === 'online') {
            // One move at a time: until the server answers, the state on screen is still the old one
            // and a second click would become an illegal move.
            if (match.awaiting) return false;
            set({ match: { ...match, awaiting: true } });
            void match.send(action).then((ok) => {
              const current = get().match;
              if (!ok && current?.mode === 'online')
                set({ match: { ...current, awaiting: false } });
            });
            return true;
          }
          const result = applyAction(match.state, action);
          if (!result.ok) {
            console.warn('Action rejected by the engine', result.error);
            return false;
          }
          set({ match: { ...match, state: result.state, actions: [...match.actions, action] } });
          absorb(result.events, match.human);
          return true;
        },

        dismissNotice: () => set((s) => ({ notices: s.notices.slice(1) })),
        closeReveal: () => set({ revealed: null }),
        leave: () => set({ match: null, ...empty() }),
      };
    },
    { name: 'game', enabled: import.meta.env.DEV },
  ),
);
