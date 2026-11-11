import type { DeckList } from '@gwent/engine';
import type { RoomView } from '@gwent/shared';
import type { OnlinePhase } from '../interfaces/online';

/**
 * Finds the lobby phase that matches a room.
 *
 * @param room - Room view.
 * @returns The lobby phase.
 */
export const phaseOf = (room: RoomView): OnlinePhase => {
  if (!room.you) return 'watching';
  return room.status === 'waiting' ? 'waiting' : 'playing';
};

/**
 * Builds the message that enters a room.
 *
 * @param name - Player name.
 * @param deck - Player deck.
 * @param profileId - Server profile that records the match.
 * @returns The entry message.
 */
export const roomEntry = (name: string, deck: DeckList, profileId?: string) => ({
  name,
  deck,
  ...(profileId ? { profileId } : {}),
});
