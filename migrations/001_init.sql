-- Refresh sessions and the access-token denylist. Applied by the process
-- after config validation, never via an ORM synchronize.

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('buyer', 'seller', 'admin'))
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES users (id)
);

CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES users (id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id uuid PRIMARY KEY,
  token_hash text NOT NULL,
  family_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES users (id),
  used_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS refresh_tokens_token_hash_idx
  ON refresh_tokens (token_hash);

CREATE INDEX IF NOT EXISTS refresh_tokens_family_id_idx
  ON refresh_tokens (family_id);

CREATE TABLE IF NOT EXISTS access_denylist (
  jti text PRIMARY KEY,
  expires_at timestamptz NOT NULL
);
