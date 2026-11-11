import type { GameEvent } from '@gwent/engine';

export type FactionAbilityEvent = Extract<GameEvent, { type: 'FACTION_ABILITY' }>;

export type CardMovedEvent = Extract<GameEvent, { type: 'CARD_MOVED' }>;

export type AbilityTriggeredEvent = Extract<GameEvent, { type: 'ABILITY_TRIGGERED' }>;
