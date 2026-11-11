import type { Profile } from '@gwent/shared';
import type { Profile as ProfileRow } from '../../../generated/prisma/client';

/**
 * Converts a database row into the API format.
 *
 * @param row - Profile row.
 * @returns The profile as the API returns it.
 */
export const toProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  name: row.name,
  createdAt: row.createdAt.toISOString(),
});
