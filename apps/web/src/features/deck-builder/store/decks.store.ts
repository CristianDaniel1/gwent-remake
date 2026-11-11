import { FACTIONS, leadersOf, premadeDecksFor, type DeckList, type Faction } from '@gwent/engine';
import { DeckSchema } from '@gwent/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { addCopy, removeCopy } from '../lib/deck-edit';
import type { DecksState } from '../interfaces/decks-store';

const defaultDeck = (faction: Faction): DeckList => {
  const premade = premadeDecksFor(faction)[0];
  return premade ?? { faction, leader: leadersOf(faction)[0]?.id ?? 0, cards: [] };
};

const defaultDecks = () =>
  Object.fromEntries(FACTIONS.map((faction) => [faction, defaultDeck(faction)])) as Record<
    Faction,
    DeckList
  >;

const isFaction = (value: unknown): value is Faction =>
  typeof value === 'string' && (FACTIONS as readonly string[]).includes(value);

const sanitize = (persisted: unknown): Pick<DecksState, 'faction' | 'decks' | 'opponent'> => {
  const saved = (persisted ?? {}) as Partial<DecksState>;
  const decks = defaultDecks();
  for (const faction of FACTIONS) {
    const parsed = DeckSchema.safeParse(saved.decks?.[faction]);
    if (parsed.success && parsed.data.faction === faction) decks[faction] = parsed.data;
  }
  const customOpponent =
    saved.opponent?.kind === 'custom' && DeckSchema.safeParse(saved.opponent.deck).success;
  return {
    faction: isFaction(saved.faction) ? saved.faction : 'realms',
    decks,
    opponent: customOpponent && saved.opponent ? saved.opponent : { kind: 'random' },
  };
};

/** Store of the edited decks (one per faction) and the computer's deck, persisted in the browser. */
export const useDecksStore = create<DecksState>()(
  persist(
    (set) => {
      const editCurrent = (edit: (deck: DeckList) => DeckList) =>
        set((current) => ({
          decks: { ...current.decks, [current.faction]: edit(current.decks[current.faction]) },
        }));

      return {
        faction: 'realms',
        decks: defaultDecks(),
        opponent: { kind: 'random' },
        setFaction: (faction) => set({ faction }),
        setLeader: (leader) => editCurrent((deck) => ({ ...deck, leader })),
        addCard: (cardId) => editCurrent((deck) => addCopy(deck, cardId)),
        removeCard: (cardId) => editCurrent((deck) => removeCopy(deck, cardId)),
        importDeck: (deck) =>
          set((current) => ({
            faction: deck.faction,
            decks: { ...current.decks, [deck.faction]: deck },
          })),
        setOpponent: (opponent) => set({ opponent }),
      };
    },
    {
      name: 'gwent:decks',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ faction, decks, opponent }) => ({ faction, decks, opponent }),
      merge: (persisted, current) => ({ ...current, ...sanitize(persisted) }),
    },
  ),
);

/**
 * Selects the deck of the current faction.
 *
 * @param state - Decks store state.
 * @returns The deck being edited.
 */
export const selectCurrentDeck = (state: DecksState) => state.decks[state.faction];
