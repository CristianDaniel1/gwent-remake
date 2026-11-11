import { reportError } from '@/shared/lib/report-error';
import { SEAT_TOKEN_KEY } from '../constants/online';

/**
 * Reads the saved room seat token.
 *
 * @returns The token, or null.
 */
export const readSeatToken = (): string | null => {
  try {
    return sessionStorage.getItem(SEAT_TOKEN_KEY);
  } catch (error) {
    reportError('online: read seat token', error);
    return null;
  }
};

/**
 * Saves the room seat token.
 *
 * @param value - Token to save, or null to remove it.
 */
export const saveSeatToken = (value: string | null): void => {
  try {
    if (value) sessionStorage.setItem(SEAT_TOKEN_KEY, value);
    else sessionStorage.removeItem(SEAT_TOKEN_KEY);
  } catch (error) {
    reportError('online: save seat token', error);
  }
};
