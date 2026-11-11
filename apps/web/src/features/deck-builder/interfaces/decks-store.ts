import type { DeckList, Faction } from '@gwent/engine';

export type OpponentDeck = { kind: 'random' } | { kind: 'custom'; deck: DeckList };

export interface DecksState {
  faction: Faction;
  decks: Record<Faction, DeckList>;
  opponent: OpponentDeck;
  /**
   * Switches the deck being edited to another faction.
   *
   * @param faction - Faction to edit.
   */
  setFaction(faction: Faction): void;
  /**
   * Sets the leader of the current deck.
   *
   * @param leader - Card id of the leader.
   */
  setLeader(leader: number): void;
  /**
   * Adds one copy of a card to the current deck, if it still fits.
   *
   * @param cardId - Card id to add.
   */
  addCard(cardId: number): void;
  /**
   * Removes one copy of a card from the current deck.
   *
   * @param cardId - Card id to remove.
   */
  removeCard(cardId: number): void;
  /**
   * Replaces the deck of the imported deck's faction and switches to it.
   *
   * @param deck - Deck to import.
   */
  importDeck(deck: DeckList): void;
  /**
   * Sets the deck the computer plays with.
   *
   * @param opponent - Random premade deck or a custom one.
   */
  setOpponent(opponent: OpponentDeck): void;
}
