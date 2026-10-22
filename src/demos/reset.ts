import { randomUUID } from "node:crypto";
import type pg from "pg";
import { migrate } from "../db.js";
import { hashPassword } from "../password.js";

export const DEMO_PASSWORD = "password";

export const DEMO_USERS = [
  { email: "buyer1@hw24.test", role: "buyer" },
  { email: "buyer2@hw24.test", role: "buyer" },
  { email: "seller@hw24.test", role: "seller" },
] as const;

export async function resetDatabase(pool: pg.Pool): Promise<void> {
  await migrate(pool);
  await pool.query(
    "TRUNCATE access_denylist, refresh_tokens, orders, products, users RESTART IDENTITY CASCADE",
  );
  for (const user of DEMO_USERS) {
    await pool.query(
      "INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, $4)",
      [randomUUID(), user.email, hashPassword(DEMO_PASSWORD), user.role],
    );
  }
}
