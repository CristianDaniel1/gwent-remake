import type { PlayerId, CombatRow, CardInstanceId, Zone } from '@gwent/engine';

export type AbilityAnimation = 'bond' | 'horn' | 'medic' | 'morale' | 'muster' | 'spy';

export interface RowAnimation {
  side: PlayerId;
  row: CombatRow;
  anim: AbilityAnimation;
}

export interface MoveAnimations {
  cards: Partial<Record<CardInstanceId, AbilityAnimation>>;
  rows: RowAnimation[];
  heroes: CardInstanceId[];
}

export interface Flight {
  cardId: CardInstanceId;
  zone: Zone;
}
