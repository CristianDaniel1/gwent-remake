import { FACTIONS, leadersOf, premadeDecksFor, type DeckList, type Faction } from '@gwent/engine';
import { DeckSchema } from '@gwent/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { addCopy, removeCopy } from '../lib/deck-edit';

export type OpponentDeck = { kind: 'random' } | { kind: 'custom'; deck: DeckList };

interface DecksState {
  faction: Faction;
  /** One saved deck per faction. */
  decks: Record<Faction, DeckList>;
  opponent: OpponentDeck;
  setFaction(faction: Faction): void;
  setLeader(leader: number): void;
  addCard(cardId: number): void;
  removeCard(cardId: number): void;
  /** Replaces the deck of the file's faction and switches to that faction. */
  importDeck(deck: DeckList): void;
  setOpponent(opponent: OpponentDeck): void;
}

/** Starting deck of each faction: its first premade deck. */
function defaultDeck(faction: Faction): DeckList {
  const premade = premadeDecksFor(faction)[0];
  return premade ?? { faction, leader: leadersOf(faction)[0]?.id ?? 0, cards: [] };
}

const defaultDecks = () =>
  Object.fromEntries(FACTIONS.map((f) => [f, defaultDeck(f)])) as Record<Faction, DeckList>;

const isFaction = (value: unknown): value is Faction =>
  typeof value === 'string' && (FACTIONS as readonly string[]).includes(value);

export const useDecksStore = create<DecksState>()(
  persist(
    (set) => {
      /** Applies a change to the current faction's deck. */
      const editCurrent = (edit: (deck: DeckList) => DeckList) =>
        set((s) => ({ decks: { ...s.decks, [s.faction]: edit(s.decks[s.faction]) } }));

      return {
        faction: 'realms',
        decks: defaultDecks(),
        opponent: { kind: 'random' },
        setFaction: (faction) => set({ faction }),
        setLeader: (leader) => editCurrent((deck) => ({ ...deck, leader })),
        addCard: (cardId) => editCurrent((deck) => addCopy(deck, cardId)),
        removeCard: (cardId) => editCurrent((deck) => removeCopy(deck, cardId)),
        importDeck: (deck) =>
          set((s) => ({ faction: deck.faction, decks: { ...s.decks, [deck.faction]: deck } })),
        setOpponent: (opponent) => set({ opponent }),
      };
    },
    {
      name: 'gwent:decks',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ faction, decks, opponent }) => ({ faction, decks, opponent }),
      // Validates what came from the browser on every load: broken decks go back to the default.
      merge: (persisted, current) => ({ ...current, ...sanitize(persisted) }),
    },
  ),
);

function sanitize(persisted: unknown): Pick<DecksState, 'faction' | 'decks' | 'opponent'> {
  const saved = (persisted ?? {}) as Partial<DecksState>;
  const decks = defaultDecks();
  for (const f of FACTIONS) {
    const parsed = DeckSchema.safeParse(saved.decks?.[f]);
    if (parsed.success && parsed.data.faction === f) decks[f] = parsed.data;
  }
  const customOpponent =
    saved.opponent?.kind === 'custom' && DeckSchema.safeParse(saved.opponent.deck).success;
  return {
    faction: isFaction(saved.faction) ? saved.faction : 'realms',
    decks,
    opponent: customOpponent && saved.opponent ? saved.opponent : { kind: 'random' },
  };
}

/** Deck the player is editing now. */
export const selectCurrentDeck = (s: DecksState) => s.decks[s.faction];
