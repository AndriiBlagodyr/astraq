import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type pg from "pg";
import {
  ACCESS_TTL_SECONDS,
  JWT_AUDIENCE,
  JWT_ISSUER,
  type AppConfig,
} from "./config.js";
import { verifyPassword } from "./password.js";

export type AccessClaims = {
  sub: string;
  role: string;
  jti: string;
  exp: number;
};

type UserRow = { id: string; role: string; password_hash?: string };

const REFRESH_TTL = "30 days";

export function hashRefreshToken(token: string, pepper: string): string {
  return createHmac("sha256", pepper).update(token).digest("hex");
}

function newRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function signAccess(
  config: AppConfig,
  user: { id: string; role: string },
): Promise<{ token: string; jti: string; exp: number }> {
  const jti = randomUUID();
  const exp = Math.floor(Date.now() / 1000) + ACCESS_TTL_SECONDS;
  const token = await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "ES256", kid: config.kid })
    .setSubject(user.id)
    .setJti(jti)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(exp)
    .sign(config.privateKey);
  return { token, jti, exp };
}

export async function verifyAccess(
  config: AppConfig,
  token: string,
): Promise<AccessClaims | null> {
  try {
    const { payload, protectedHeader } = await jwtVerify(token, config.publicKey, {
      algorithms: ["ES256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (protectedHeader.kid !== config.kid) return null;
    if (typeof payload.sub !== "string" || typeof payload.jti !== "string") return null;
    if (typeof payload.role !== "string" || typeof payload.exp !== "number") return null;
    return { sub: payload.sub, role: payload.role, jti: payload.jti, exp: payload.exp };
  } catch {
    return null;
  }
}

async function issuePair(
  client: pg.PoolClient,
  config: AppConfig,
  user: { id: string; role: string },
  familyId: string,
) {
  const refreshToken = newRefreshToken();
  const access = await signAccess(config, user);
  await client.query(
    `INSERT INTO refresh_tokens (id, token_hash, family_id, user_id, expires_at)
     VALUES ($1, $2, $3, $4, now() + $5::interval)`,
    [randomUUID(), hashRefreshToken(refreshToken, config.pepper), familyId, user.id, REFRESH_TTL],
  );
  return { accessToken: access.token, refreshToken };
}

export async function login(pool: pg.Pool, config: AppConfig, email: string, password: string) {
  const found = await pool.query<UserRow>(
    "SELECT id, role, password_hash FROM users WHERE email = $1",
    [email],
  );
  const user = found.rows[0];
  if (!user?.password_hash || !verifyPassword(password, user.password_hash)) return null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const pair = await issuePair(client, config, user, randomUUID());
    await client.query("COMMIT");
    return pair;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function refresh(pool: pg.Pool, config: AppConfig, rawToken: string) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query<{
      id: string;
      family_id: string;
      user_id: string;
      used_at: Date | null;
      revoked_at: Date | null;
      expires_at: Date;
    }>(
      `SELECT id, family_id, user_id, used_at, revoked_at, expires_at
       FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE`,
      [hashRefreshToken(rawToken, config.pepper)],
    );
    const row = found.rows[0];
    if (!row || row.expires_at.getTime() <= Date.now()) {
      await client.query("ROLLBACK");
      return null;
    }
    if (row.revoked_at) {
      await client.query("ROLLBACK");
      return null;
    }
    if (row.used_at) {
      await client.query(
        `UPDATE refresh_tokens SET revoked_at = now()
         WHERE family_id = $1 AND revoked_at IS NULL`,
        [row.family_id],
      );
      await client.query("COMMIT");
      console.log(`refresh reuse detected family_id=${row.family_id}`);
      return null;
    }

    await client.query("UPDATE refresh_tokens SET used_at = now() WHERE id = $1", [row.id]);
    const userResult = await client.query<UserRow>("SELECT id, role FROM users WHERE id = $1", [
      row.user_id,
    ]);
    const user = userResult.rows[0];
    if (!user) {
      await client.query("ROLLBACK");
      return null;
    }
    const pair = await issuePair(client, config, user, row.family_id);
    await client.query("COMMIT");
    return pair;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function logout(
  pool: pg.Pool,
  config: AppConfig,
  accessToken: string,
  rawRefresh: string,
): Promise<boolean> {
  const claims = await verifyAccess(config, accessToken);
  if (!claims || (await isDenied(pool, claims.jti))) return false;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const found = await client.query<{ family_id: string; user_id: string }>(
      `SELECT family_id, user_id FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE`,
      [hashRefreshToken(rawRefresh, config.pepper)],
    );
    const row = found.rows[0];
    if (!row || row.user_id !== claims.sub) {
      await client.query("ROLLBACK");
      return false;
    }
    await client.query(
      `UPDATE refresh_tokens SET revoked_at = now()
       WHERE family_id = $1 AND revoked_at IS NULL`,
      [row.family_id],
    );
    await client.query(
      `INSERT INTO access_denylist (jti, expires_at)
       VALUES ($1, to_timestamp($2))
       ON CONFLICT (jti) DO UPDATE SET expires_at = EXCLUDED.expires_at`,
      [claims.jti, claims.exp],
    );
    await client.query("COMMIT");
    console.log(`logout family_id=${row.family_id} jti=${claims.jti}`);
    return true;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function isDenied(pool: pg.Pool, jti: string): Promise<boolean> {
  await pool.query("DELETE FROM access_denylist WHERE expires_at <= now()");
  const found = await pool.query("SELECT 1 FROM access_denylist WHERE jti = $1", [jti]);
  return (found.rowCount ?? 0) > 0;
}
