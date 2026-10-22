import { readFileSync } from "node:fs";
import pg from "pg";
import type { AppConfig } from "./config.js";

const { Pool } = pg;

export function createPool(config: AppConfig) {
  return new Pool({ connectionString: config.databaseUrl });
}

export async function migrate(pool: pg.Pool): Promise<void> {
  const sql = readFileSync(new URL("../migrations/001_init.sql", import.meta.url), "utf8");
  await pool.query(sql);
}
