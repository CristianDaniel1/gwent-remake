import type { RealtimeErrorCode } from '@gwent/shared';

/** Expected rejection of a multiplayer message; the gateway sends its code back to the client. */
export class RealtimeError extends Error {
  constructor(readonly code: RealtimeErrorCode) {
    super(code);
  }
}
