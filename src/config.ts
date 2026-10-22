import { createHash } from "node:crypto";
import { importPKCS8, importSPKI, type CryptoKey } from "jose";

export const JWT_ISSUER = "hw-24";
export const JWT_AUDIENCE = "hw-24-api";
export const ACCESS_TTL_SECONDS = 10 * 60;

const VAULT_VARS = [
  "JWT_PRIVATE_KEY",
  "JWT_PUBLIC_KEY",
  "JWT_KID",
  "REFRESH_TOKEN_PEPPER",
] as const;

export type AppConfig = {
  databaseUrl: string;
  kid: string;
  pepper: string;
  privateKey: CryptoKey;
  publicKey: CryptoKey;
  publicKeyFingerprint: string;
  port: number;
};

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) fail(`Missing required configuration: ${name}`);
  return value;
}

function decodePem(name: string): string {
  const raw = requireEnv(name);
  const pem = Buffer.from(raw, "base64").toString("utf8");
  if (!pem.includes("-----BEGIN")) {
    fail(`${name} must be a base64-encoded PEM`);
  }
  return pem;
}

/**
 * Validates secrets before any database connection. A missing signing key
 * must name itself and exit; it must not surface as a later ECONNREFUSED.
 */
export async function loadConfig(): Promise<AppConfig> {
  const missing = VAULT_VARS.filter((name) => !process.env[name]?.trim());
  if (missing.length > 0) {
    fail(
      `Missing required configuration from the secret store: ${missing.join(", ")}`,
    );
  }

  const databaseUrl = requireEnv("DATABASE_URL");
  const kid = requireEnv("JWT_KID");
  const pepper = requireEnv("REFRESH_TOKEN_PEPPER");
  const privatePem = decodePem("JWT_PRIVATE_KEY");
  const publicPem = decodePem("JWT_PUBLIC_KEY");

  let privateKey: CryptoKey;
  let publicKey: CryptoKey;
  try {
    privateKey = await importPKCS8(privatePem, "ES256");
    publicKey = await importSPKI(publicPem, "ES256");
  } catch (error) {
    const detail = error instanceof Error ? error.message : "invalid key";
    fail(`JWT_PRIVATE_KEY or JWT_PUBLIC_KEY is not a valid ES256 PEM: ${detail}`);
  }

  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port <= 0) fail("PORT must be a positive integer");

  return {
    databaseUrl,
    kid,
    pepper,
    privateKey,
    publicKey,
    publicKeyFingerprint: createHash("sha256").update(publicPem).digest("hex").slice(0, 16),
    port,
  };
}
