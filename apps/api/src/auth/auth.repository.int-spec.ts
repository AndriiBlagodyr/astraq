import { PrismaService } from '../database/prisma.service';
import { AuthRepository } from './auth.repository';
import {
  generateRefreshToken,
  hashRefreshToken,
  refreshTokenExpiresAt,
  sessionExpiresAt,
} from './token';

// Runs against a real database (`pnpm --filter @astraq/api test:integration`).
// Verifies the exit criterion: reuse of a rotated refresh token revokes the whole session.

describe('AuthRepository (database) — token rotation and reuse detection', () => {
  const prisma = new PrismaService();
  const repo = new AuthRepository(prisma);
  const TEST_EMAIL = 'itest-auth@veracand.test';

  let userId: string;

  beforeAll(async () => {
    await prisma.auditLog.deleteMany({ where: { user: { email: TEST_EMAIL } } });
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    const user = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        passwordHash: '$argon2id$v=19$m=19456,t=2,p=1$dGVzdA$dGVzdGhhc2g',
      },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { user: { email: TEST_EMAIL } } });
    await prisma.user.deleteMany({ where: { email: TEST_EMAIL } });
    await prisma.$disconnect();
  });

  it('rotates a valid token and returns the session owner', async () => {
    const rawToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawToken);
    const now = new Date();
    const sessExp = sessionExpiresAt(now);
    const tokExp = refreshTokenExpiresAt(now, sessExp);

    await repo.createSessionWithToken(userId, tokenHash, sessExp, tokExp, null, null);

    const newRaw = generateRefreshToken();
    const newHash = hashRefreshToken(newRaw);
    const newExp = refreshTokenExpiresAt(new Date(), sessExp);
    const result = await repo.rotateRefreshToken(tokenHash, newHash, newExp, new Date());

    expect(result.userId).toBe(userId);
    expect(result.sessionId).toBeTruthy();
  });

  it('revokes the session when a rotated token is replayed outside the grace window', async () => {
    const rawToken = generateRefreshToken();
    const tokenHash = hashRefreshToken(rawToken);
    const now = new Date();
    const sessExp = sessionExpiresAt(now);
    const tokExp = refreshTokenExpiresAt(now, sessExp);

    await repo.createSessionWithToken(userId, tokenHash, sessExp, tokExp, null, null);

    // Legitimate first rotation.
    const newRaw = generateRefreshToken();
    const newHash = hashRefreshToken(newRaw);
    const newExp = refreshTokenExpiresAt(now, sessExp);
    const { sessionId } = await repo.rotateRefreshToken(tokenHash, newHash, newExp, now);

    // Back-date rotated_at past the 10-second grace window.
    await prisma.$executeRaw`
      UPDATE refresh_tokens
      SET rotated_at = now() - INTERVAL '15 seconds'
      WHERE session_id = ${sessionId}::uuid
        AND token_hash = ${tokenHash}
    `;

    // Replaying the original token must throw and revoke the session.
    const staleHash = hashRefreshToken(generateRefreshToken());
    await expect(
      repo.rotateRefreshToken(tokenHash, staleHash, newExp, new Date()),
    ).rejects.toThrow();

    const session = await prisma.session.findUnique({ where: { id: sessionId } });
    expect(session?.revokedAt).not.toBeNull();
    expect(session?.revokedReason).toBe('reuse_detected');
  });
});
