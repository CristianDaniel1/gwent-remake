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
import { prefersReducedMotion } from '@/shared/lib/motion';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  animationsFrom,
  arrivals,
  burnedCards,
  departures,
  opponentReveal,
  type Flight,
  type MoveAnimations,
} from '../lib/animations';
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

/** How long the opponent's card stays enlarged before it goes to the board. */
export const SPOTLIGHT_MS = 1100;
/** Scorched units burn this long before going to the grave. */
export const BURN_MS = 750;
/** Ability animations (icons over cards and rows) stay this long. */
export const ABILITY_ANIMATION_MS = 1300;
/** Time for a played card to reach its place on the board. */
export const LANDING_MS = 650;
/** Cards coming out of a pile are drawn there for this long before they fly. */
export const TAKEOFF_MS = 80;
/** Cards going into a pile stay drawn until they get there. */
export const FLIGHT_MS = 700;

/** Card shown large in the middle of a move (`state` knows the card). */
export interface Spotlight {
  cardId: CardInstanceId;
  state: GameState;
}

interface GameStore {
  match: Match | null;
  /** Queued notifications (one at a time on screen). */
  notices: Notice[];
  /** Opponent hand cards revealed to the human (Emhyr, the Emperor). */
  revealed: CardInstanceId[] | null;
  lastTurn: PlayerId | null;
  /** Latest batch of events (numbered), for side effects such as sounds. */
  eventLog: { seq: number; events: GameEvent[]; notices: Notice[] } | null;
  /**
   * A move being shown before it is applied: the opponent's card enlarged, then the
   * units hit by Scorch burning. Meanwhile the board still shows the previous state.
   */
  spotlight: Spotlight | null;
  burning: readonly CardInstanceId[];
  /** Cards drawn over a pile so they fly from/to it (`state` knows the cards). */
  flights: { cards: Flight[]; state: GameState } | null;
  /** Ability animations of the latest move (numbered, so each one plays once). */
  animations: (MoveAnimations & { seq: number }) | null;
  /**
   * A played card is still landing (and its ability animating): the turn notices wait,
   * and so does the bot.
   */
  settling: boolean;

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
const empty = (): Pick<
  GameStore,
  | 'notices'
  | 'revealed'
  | 'lastTurn'
  | 'eventLog'
  | 'spotlight'
  | 'burning'
  | 'flights'
  | 'animations'
  | 'settling'
> => ({
  notices: [],
  revealed: null,
  lastTurn: null,
  eventLog: null,
  spotlight: null,
  burning: [],
  flights: null,
  animations: null,
  settling: false,
});

export const useGameStore = create<GameStore>()(
  devtools(
    (set, get) => {
      // Moves being shown (see `present`): later moves wait in line, in order.
      let timers: ReturnType<typeof setTimeout>[] = [];
      let queue: (() => void)[] = [];
      // Notices held until the played card lands (see `absorb`)
      let settleTimer: ReturnType<typeof setTimeout> | null = null;
      let held: Notice[] = [];
      let landingTimer: ReturnType<typeof setTimeout> | null = null;
      const presenting = () => timers.length > 0;
      const stopPresenting = () => {
        timers.forEach(clearTimeout);
        timers = [];
        queue = [];
        if (settleTimer) clearTimeout(settleTimer);
        settleTimer = null;
        held = [];
        if (landingTimer) clearTimeout(landingTimer);
        landingTimer = null;
      };
      const afterPresenting = (task: () => void) => {
        if (presenting()) queue.push(task);
        else task();
      };

      /**
       * Applies a move, first showing what the human would otherwise miss: the card the
       * opponent played (enlarged) and the units Scorch destroys (burning in place).
       * `commit` applies the new state; it runs together with clearing the spotlight, so the
       * card flies from the spotlight straight to its place on the board.
       */
      const present = (
        events: GameEvent[],
        next: GameState,
        human: PlayerId,
        commit: () => Partial<GameStore>,
      ) => {
        const before = get().match?.state ?? next;
        // Reduced motion: no pauses, the move is applied at once
        const still = prefersReducedMotion();
        const shown = still ? null : opponentReveal(events, human, next);
        const burned = still ? [] : burnedCards(events);
        const takeoff = still ? [] : arrivals(events, before, next, human, shown);
        const leaving = still ? [] : departures(events, next, human);
        const steps: { ms: number; run: () => void }[] = [];
        if (shown)
          steps.push({
            ms: SPOTLIGHT_MS,
            run: () => set({ spotlight: { cardId: shown, state: next } }),
          });
        if (burned.length > 0) steps.push({ ms: BURN_MS, run: () => set({ burning: burned }) });
        // Last: cards appear on their piles (Medic's grave, Muster's deck…), then fly out
        if (takeoff.length > 0)
          steps.push({
            ms: TAKEOFF_MS,
            run: () => set({ flights: { cards: takeoff, state: next } }),
          });
        const finish = () => {
          timers = [];
          // Cards going into a pile replace the ones that took off, in the same render
          set({
            ...commit(),
            spotlight: null,
            burning: [],
            flights: leaving.length > 0 ? { cards: leaving, state: next } : null,
          });
          if (landingTimer) clearTimeout(landingTimer);
          landingTimer =
            leaving.length > 0
              ? setTimeout(() => {
                  landingTimer = null;
                  set({ flights: null });
                }, FLIGHT_MS)
              : null;
          absorb(events, human);
          while (!presenting() && queue.length > 0) queue.shift()?.();
        };
        if (steps.length === 0) return finish();
        let at = 0;
        for (const step of steps) {
          timers.push(setTimeout(step.run, at));
          at += step.ms;
        }
        timers.push(setTimeout(finish, at));
      };

      /** Turns the events of an action into notifications and reveals for the human. */
      const absorb = (events: GameEvent[], human: PlayerId) => {
        const { notices, lastTurn } = noticesFrom(events, human, get().lastTurn);
        const reveal = events.find(
          (e): e is Extract<GameEvent, { type: 'CARDS_REVEALED' }> =>
            e.type === 'CARDS_REVEALED' && e.player === human,
        );
        const match = get().match;
        const animations = match ? animationsFrom(events, match.state) : null;
        const hasAnimations =
          animations &&
          (animations.rows.length > 0 ||
            animations.heroes.length > 0 ||
            Object.keys(animations.cards).length > 0);
        // A card was played: "Your turn" and the like wait until it lands and animates
        const played = events.some(
          (e) => e.type === 'CARD_PLAYED' || e.type === 'LEADER_ACTIVATED',
        );
        const settleMs =
          played && !prefersReducedMotion()
            ? LANDING_MS + (hasAnimations ? ABILITY_ANIMATION_MS : 0)
            : 0;
        // Notices already held keep their order: later ones wait behind them
        const hold = notices.length > 0 && (settleMs > 0 || settleTimer !== null);
        if (hold) {
          held = [...held, ...notices];
          if (settleMs > 0) {
            if (settleTimer) clearTimeout(settleTimer);
            settleTimer = setTimeout(() => {
              settleTimer = null;
              const release = held;
              held = [];
              set((s) => ({ notices: [...s.notices, ...release], settling: false }));
            }, settleMs);
          }
        }
        set((s) => ({
          ...(hasAnimations
            ? { animations: { ...animations, seq: (s.animations?.seq ?? 0) + 1 } }
            : {}),
          ...(hold ? { settling: true } : { notices: [...s.notices, ...notices] }),
          lastTurn,
          eventLog: { seq: (s.eventLog?.seq ?? 0) + 1, events, notices },
          ...(reveal ? { revealed: reveal.cardIds } : {}),
        }));
        const seq = get().animations?.seq;
        if (hasAnimations)
          setTimeout(() => {
            if (get().animations?.seq === seq) set({ animations: null });
          }, ABILITY_ANIMATION_MS);
      };

      return {
        match: null,
        ...empty(),

        startMatch: (setup) => {
          stopPresenting();
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
          const match: OnlineMatch = {
            mode: 'online',
            state: update.state,
            human: update.you,
            opponent: opponentOf(update.you),
            ...connection,
            awaiting: false,
          };
          if (fresh) {
            stopPresenting();
            set({ match, ...empty() });
            absorb(update.events, update.you);
            return;
          }
          afterPresenting(() =>
            present(update.events, update.state, update.you, () => ({ match })),
          );
        },

        dispatch: (action) => {
          const match = get().match;
          if (!match) return false;
          // A move is still being shown: the board is not up to date yet
          if (presenting()) return false;
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
          const next = { ...match, state: result.state, actions: [...match.actions, action] };
          present(result.events, result.state, match.human, () => ({ match: next }));
          return true;
        },

        dismissNotice: () => set((s) => ({ notices: s.notices.slice(1) })),
        closeReveal: () => set({ revealed: null }),
        leave: () => {
          stopPresenting();
          set({ match: null, ...empty() });
        },
      };
    },
    { name: 'game', enabled: import.meta.env.DEV },
  ),
);
