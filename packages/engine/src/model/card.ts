import type { CardDefId, CardInstanceId, PlayerId } from './ids';

export const FACTIONS = ['realms', 'nilfgaard', 'monsters', 'scoiatael', 'skellige'] as const;
export type Faction = (typeof FACTIONS)[number];

/** A card's "faction" in the catalog: neutral, special and weather cards fit any deck. */
export type CardFaction = Faction | 'neutral' | 'special' | 'weather';

export const COMBAT_ROWS = ['close', 'ranged', 'siege'] as const;
export type CombatRow = (typeof COMBAT_ROWS)[number];

/** Row printed on the card: agile can go to close or ranged. */
export type CardRow = CombatRow | 'agile';

export type CardType = 'unit' | 'leader' | 'special' | 'weather';

/** Ability key (e.g. "medic", "foltest_king"). See mechanics/registry. */
export type AbilityId = string;

/** Static card data (catalog). */
export interface CardDef {
  readonly id: CardDefId;
  /** Canonical English name: identity used by the rules (muster, bond…). */
  readonly name: string;
  readonly faction: CardFaction;
  readonly type: CardType;
  /** Only units have a row. */
  readonly row: CardRow | null;
  readonly strength: number;
  readonly hero: boolean;
  readonly abilities: readonly AbilityId[];
  readonly filename: string;
  /** Image file name (without extension) in img/sm and img/lg. */
  readonly image: string;
  /** Maximum copies in a deck (0 = only enters play through effects, e.g. tokens). */
  readonly count: number;
  /** Alternative muster group (e.g. Geralt/Ciri summon "Roach"). */
  readonly muster?: string;
}

/** A card in play. The data lives in the catalog; here only what changes during the match. */
export interface CardInstance {
  readonly id: CardInstanceId;
  readonly defId: CardDefId;
  /**
   * Who controls the card now: the grave it goes to and the hand it returns to.
   * Changes when a spy lands on the opponent's side or when a card is stolen.
   */
  owner: PlayerId;
  /** Created by an effect (e.g. Avenger): vanishes instead of going to the grave. */
  isToken?: true;
  /** Stays on the board at round end (e.g. Monsters faction, lingering weather). */
  noRemove?: true;
  /** Permanent strength bonus while on the board (e.g. Inspiration); cleared when it leaves its row. */
  boost?: number;
}

/** Deck list (JSON deck format). */
export interface DeckList {
  faction: Faction;
  /** Leader CardDefId. */
  leader: number;
  /** [CardDefId, count] pairs. */
  cards: ReadonlyArray<readonly [number, number]>;
}
