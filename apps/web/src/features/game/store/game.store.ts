import {
  applyAction,
  createGame,
  deriveSeed,
  opponentOf,
  randomFrom,
  type GameAction,
  type GameEvent,
  type GameState,
  type PlayerId,
} from '@gwent/engine';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { prefersReducedMotion } from '@/shared/lib/motion';
import { reportError } from '@/shared/lib/report-error';
import { animationsFrom, hasAnimations } from '../lib/animations';
import { planMove, settleDelay } from '../lib/move-plan';
import { noticesFrom } from '../lib/notices';
import { type Notice } from '../interfaces/notices';
import { FLIGHT_MS } from '../constants/timings';
import { TAKEOFF_MS } from '../constants/timings';
import { ABILITY_ANIMATION_MS } from '../constants/timings';
import { BURN_MS } from '../constants/timings';
import { SPOTLIGHT_MS } from '../constants/timings';
import type { OnlineMatch } from '../interfaces/match';
import { createDelay, createHold, createSequencer } from './schedulers';
import { type Step } from '../interfaces/schedulers';
import type { GameStore } from '../interfaces/game-store';

const empty = () => ({
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

/** Store of the current match, its notices and the animations shown for each move. */
export const useGameStore = create<GameStore>()(
  devtools(
    (set, get) => {
      const sequencer = createSequencer();
      const noticeHold = createHold<Notice>((notices) =>
        set((current) => ({ notices: [...current.notices, ...notices], settling: false })),
      );
      const landing = createDelay();
      const animationsEnd = createDelay();

      const stopPresenting = () => {
        sequencer.cancel();
        noticeHold.cancel();
        landing.cancel();
        animationsEnd.cancel();
      };

      const unlockOnlineBoard = () => {
        const current = get().match;
        if (current?.mode === 'online') set({ match: { ...current, awaiting: false } });
      };

      const sendOnline = async (match: OnlineMatch, action: GameAction) => {
        try {
          const accepted = await match.send(action);
          if (!accepted) unlockOnlineBoard();
        } catch (error) {
          reportError('game: send move', error);
          unlockOnlineBoard();
        }
      };

      const absorb = (events: GameEvent[], human: PlayerId) => {
        const { notices, lastTurn } = noticesFrom(events, human, get().lastTurn);
        const reveal = events.find(
          (event): event is Extract<GameEvent, { type: 'CARDS_REVEALED' }> =>
            event.type === 'CARDS_REVEALED' && event.player === human,
        );
        const match = get().match;
        const animations = match ? animationsFrom(events, match.state) : null;
        const animated = !!animations && hasAnimations(animations);
        const delay = settleDelay(events, animated, prefersReducedMotion());
        const hold = !!notices.length && (delay > 0 || noticeHold.holding());
        if (hold) noticeHold.add(notices, delay);

        set((current) => {
          const seq = (current.animations?.seq ?? 0) + 1;
          return {
            ...(animated ? { animations: { ...animations, seq } } : {}),
            ...(hold ? { settling: true } : { notices: [...current.notices, ...notices] }),
            lastTurn,
            eventLog: { seq: (current.eventLog?.seq ?? 0) + 1, events, notices },
            ...(reveal ? { revealed: reveal.cardIds } : {}),
          };
        });
        if (animated) animationsEnd.run(() => set({ animations: null }), ABILITY_ANIMATION_MS);
      };

      const present = (
        events: GameEvent[],
        next: GameState,
        human: PlayerId,
        commit: () => Partial<GameStore>,
      ) => {
        const before = get().match?.state ?? next;
        const plan = planMove(events, before, next, human, prefersReducedMotion());
        const steps: Step[] = [];
        const { spotlight, burned, takeoff, leaving } = plan;
        if (spotlight)
          steps.push({
            ms: SPOTLIGHT_MS,
            run: () => set({ spotlight: { cardId: spotlight, state: next } }),
          });
        if (burned.length) steps.push({ ms: BURN_MS, run: () => set({ burning: burned }) });
        if (takeoff.length)
          steps.push({
            ms: TAKEOFF_MS,
            run: () => set({ flights: { cards: takeoff, state: next } }),
          });

        sequencer.play(steps, () => {
          set({
            ...commit(),
            spotlight: null,
            burning: [],
            flights: leaving.length ? { cards: leaving, state: next } : null,
          });
          if (leaving.length) landing.run(() => set({ flights: null }), FLIGHT_MS);
          absorb(events, human);
        });
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
          const rematch = current?.mode !== 'online' || update.state.round < current.state.round;
          const match: OnlineMatch = {
            mode: 'online',
            state: update.state,
            human: update.you,
            opponent: opponentOf(update.you),
            ...connection,
            awaiting: false,
          };
          if (rematch) {
            stopPresenting();
            set({ match, ...empty() });
            absorb(update.events, update.you);
            return;
          }
          sequencer.enqueue(() =>
            present(update.events, update.state, update.you, () => ({ match })),
          );
        },

        dispatch: (action) => {
          const match = get().match;
          if (!match || sequencer.busy()) return false;
          if (match.mode === 'online') {
            if (match.awaiting) return false;
            set({ match: { ...match, awaiting: true } });
            void sendOnline(match, action);
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

        dismissNotice: () => set((current) => ({ notices: current.notices.slice(1) })),
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
