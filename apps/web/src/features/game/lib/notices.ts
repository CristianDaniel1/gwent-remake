import type { GameEvent, PlayerId } from '@gwent/engine';

/** Banner notification: text key in `game:notif.*` + icon. */
export interface Notice {
  key: string;
  icon: string;
}

const ICONS: Record<string, string> = {
  'me-coin': 'notif_me_coin',
  'op-coin': 'notif_op_coin',
  'me-first': 'notif_me_coin',
  'op-first': 'notif_op_coin',
  'round-start': 'notif_round_start',
  'me-turn': 'notif_me_turn',
  'op-turn': 'notif_op_turn',
  'me-pass': 'notif_round_passed',
  'op-pass': 'notif_round_passed',
  'win-round': 'notif_win_round',
  'lose-round': 'notif_lose_round',
  'draw-round': 'notif_draw_round',
  north: 'notif_north',
  monsters: 'notif_monsters',
  scoiatael: 'notif_scoiatael',
  'skellige-me': 'notif_skellige',
  'skellige-op': 'notif_skellige',
};

const notice = (key: string): Notice => ({ key, icon: ICONS[key] ?? 'notif_round_start' });

/**
 * Turns engine events into notifications. `lastTurn` is who had the turn before these
 * events: the turn notice only appears when the turn changes.
 */
export function noticesFrom(
  events: readonly GameEvent[],
  human: PlayerId,
  lastTurn: PlayerId | null,
): { notices: Notice[]; lastTurn: PlayerId | null } {
  const notices: Notice[] = [];
  let turn = lastTurn;
  const mine = (p: PlayerId) => p === human;

  for (const e of events) {
    switch (e.type) {
      case 'COIN_TOSSED':
        notices.push(notice(mine(e.firstPlayer) ? 'me-coin' : 'op-coin'));
        break;
      case 'FIRST_PLAYER_CHOSEN':
        notices.push(notice(mine(e.firstPlayer) ? 'me-first' : 'op-first'));
        break;
      case 'ROUND_STARTED':
        notices.push(notice('round-start'));
        turn = null;
        break;
      case 'TURN_STARTED':
        if (turn !== e.player) notices.push(notice(mine(e.player) ? 'me-turn' : 'op-turn'));
        turn = e.player;
        break;
      case 'PLAYER_PASSED':
        notices.push(notice(mine(e.player) ? 'me-pass' : 'op-pass'));
        break;
      case 'ROUND_ENDED':
        notices.push(
          notice(e.winner === null ? 'draw-round' : mine(e.winner) ? 'win-round' : 'lose-round'),
        );
        break;
      case 'FACTION_ABILITY':
        if (e.faction === 'realms') notices.push(notice('north'));
        if (e.faction === 'monsters') notices.push(notice('monsters'));
        if (e.faction === 'skellige') {
          notices.push(notice(mine(e.player) ? 'skellige-me' : 'skellige-op'));
        }
        if (e.faction === 'scoiatael' && !mine(e.player)) notices.push(notice('scoiatael'));
        break;
      default:
        break;
    }
  }
  return { notices, lastTurn: turn };
}
