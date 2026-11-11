import { randomInt } from 'node:crypto';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH } from '@gwent/shared';

/**
 * Draws a random room code.
 *
 * @returns A code of ROOM_CODE_LENGTH letters from ROOM_CODE_ALPHABET.
 */
export const randomRoomCode = (): string =>
  Array.from(
    { length: ROOM_CODE_LENGTH },
    () => ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)],
  ).join('');
