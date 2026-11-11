import { ReplayFileSchema, type ReplayFile } from '@gwent/shared';

/**
 * Parses a replay file.
 *
 * @param text - File content.
 * @returns The replay, or null when it is not valid.
 */
export const parseReplayFile = (text: string): ReplayFile | null => {
  try {
    const parsed = ReplayFileSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
};
