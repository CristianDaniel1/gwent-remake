import type { GameEvent, PlayerId } from '@gwent/engine';
import { NOTICE_ICONS } from '../data/notices';
import type { Notice } from '../interfaces/notices';
import type { FactionAbilityEvent } from '../interfaces/events';

const notice = (key: string): Notice => ({ key, icon: NOTICE_ICONS[key] ?? 'notif_round_start' });

const sideKey = (player: PlayerId, human: PlayerId, action: string) =>
  `${player === human ? 'me' : 'op'}-${action}`;

const roundEndKey = (winner: PlayerId | null, human: PlayerId) => {
  if (!winner) return 'draw-round';
  return winner === human ? 'win-round' : 'lose-round';
};

const factionKey = (event: FactionAbilityEvent, human: PlayerId): string | null => {
  const mine = event.player === human;
  switch (event.faction) {
    case 'realms':
      return 'north';
    case 'monsters':
      return 'monsters';
    case 'skellige':
      return mine ? 'skellige-me' : 'skellige-op';
    case 'scoiatael':
      return mine ? null : 'scoiatael';
    default:
      return null;
  }
};

const eventKey = (event: GameEvent, human: PlayerId): string | null => {
  switch (event.type) {
    case 'COIN_TOSSED':
      return sideKey(event.firstPlayer, human, 'coin');
    case 'FIRST_PLAYER_CHOSEN':
      return sideKey(event.firstPlayer, human, 'first');
    case 'ROUND_STARTED':
      return 'round-start';
    case 'PLAYER_PASSED':
      return sideKey(event.player, human, 'pass');
    case 'ROUND_ENDED':
      return roundEndKey(event.winner, human);
    case 'FACTION_ABILITY':
      return factionKey(event, human);
    default:
      return null;
  }
};

/**
 * Turns the events of a move into notices.
 *
 * @param events - Events of the move.
 * @param human - Human player.
 * @param lastTurn - Player who had the turn before the move.
 * @returns The notices and the player who has the turn after the move.
 */
export const noticesFrom = (
  events: readonly GameEvent[],
  human: PlayerId,
  lastTurn: PlayerId | null,
): { notices: Notice[]; lastTurn: PlayerId | null } => {
  const notices: Notice[] = [];
  let turn = lastTurn;
  for (const event of events) {
    if (event.type === 'TURN_STARTED') {
      if (turn !== event.player) notices.push(notice(sideKey(event.player, human, 'turn')));
      turn = event.player;
      continue;
    }
    if (event.type === 'ROUND_STARTED') turn = null;
    const key = eventKey(event, human);
    if (key) notices.push(notice(key));
  }
  return { notices, lastTurn: turn };
};
