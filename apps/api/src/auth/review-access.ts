import type { ReviewAccessState } from '@astraq/shared';

/** The columns of `review_access` that decide whether it lets anyone in. */
export interface AccessWindow {
  expiresAt: Date;
  revokedAt: Date | null;
}

/**
 * Whether a review account is open at `now`. Closed by an admin wins over
 * past its end date: "revoked" is the more specific answer, and the one an
 * admin has to undo.
 */
export function accessState(access: AccessWindow, now: Date): ReviewAccessState {
  if (access.revokedAt !== null) return 'revoked';
  return access.expiresAt <= now ? 'expired' : 'active';
}
