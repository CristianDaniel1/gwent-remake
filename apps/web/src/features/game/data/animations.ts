/** Move reasons that put a card on the board. */
export const ENTERS_BOARD = new Set(['play', 'muster', 'revive', 'summon']);

/** Abilities animated over the card that triggered them. */
export const CARD_ANIMATIONS = new Set<string>(['medic', 'morale', 'muster', 'spy']);
