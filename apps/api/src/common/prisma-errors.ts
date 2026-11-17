import { Prisma } from '../generated/prisma/client';

/**
 * Whether a write failed on a unique index (Prisma's P2002). Repositories
 * turn this into their own domain error (a name already taken, an email
 * already registered): the index is what decides, since a check before the
 * write can always lose a race.
 */
export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}
