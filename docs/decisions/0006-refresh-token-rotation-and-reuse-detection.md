# ADR 0006: Refresh-token rotation and reuse-detection design

- Status: Accepted
- Date: 2026-10-21

## Context

Phase 2 adds real accounts. The auth core is built by hand, as a learning goal (ROADMAP Phase 2, item 1), and built once: Phase 7 adds email flows, 2FA, and API keys on top of it, but doesn't replace it.

The constraints:

- `apps/web` is the BFF. The browser never sees a token: the web server keeps them in `HttpOnly` cookies and calls the api server to server. The api never sets cookies.
- Sessions must survive weeks on a phone (the Phase 2 product check), yet a stolen credential has to stop working on its own, and the theft has to be detectable.
- One person runs this. No auth vendor, and no infrastructure beyond Postgres and Redis.
- The web runs on Vercel, so several server instances can handle one browser's requests at the same moment.

### Options considered

| Option | Verdict |
|---|---|
| **Short-lived JWT access token + rotating opaque refresh token with family-based reuse detection** | **Chosen.** Reads need no database lookup. Refresh tokens can be revoked. A replayed refresh token is noticed and kills the whole family. |
| Server-side sessions only (an opaque session id in a cookie, looked up on every request) | Simplest and instantly revocable, but it skips the token-rotation lesson the roadmap asks for, and puts a database or Redis hit on every api call. |
| Long-lived JWT, no refresh token | Can't be revoked. Ruled out. |
| Rotating refresh tokens without families | Detects reuse of one token, but can't find and revoke the tokens rotated from it, so the attacker or the victim keeps a live chain. |
| An auth library or vendor (Auth.js, Lucia, Clerk, Auth0) | Production-grade, but nothing to learn. What we'd use in production for anything with other people's money: see Consequences. |

## Decision

### 1. Two tokens

| | Access token | Refresh token |
|---|---|---|
| Format | JWT, HS256, signed with `JWT_SECRET` (at least 32 bytes, validated at boot) | 32 random bytes from `crypto.randomBytes`, base64url |
| Lifetime | 10 minutes | 30 days, never past its session's `expires_at` |
| Claims or storage | `sub` (user id), `sid` (session id), `iat`, `exp` | Only the SHA-256 hash, in `refresh_tokens.token_hash` |
| Checked by | Signature and `exp` only. No database lookup | A database lookup on every use |

The JWT is signed and verified by hand with `node:crypto` (`createHmac` and `timingSafeEqual`): base64url header and payload, a fixed `alg` (a token whose header says anything other than `HS256` is rejected, never trusted), and `exp` checked with no clock leeway beyond a few seconds. In production we'd use `jose`.

A refresh token has 256 bits of entropy, so a fast hash is enough: there's nothing to brute-force. A slow hash like Argon2 is for passwords, which people choose. Hashing means a leaked `refresh_tokens` table yields nothing usable.

### 2. A session is a token family

A login creates a `sessions` row (one signed-in device) and its first refresh token. Each refresh, in one transaction:

1. Hash the presented token and look it up with `SELECT ... FOR UPDATE`, which locks the row so two refreshes of the same token run one after the other.
2. Reject it if it doesn't exist, or it has expired, or its session is revoked or past its `expires_at`.
3. If it's **already rotated**:
   - rotated within the last **10 seconds** (the grace window, below): issue another child token and carry on;
   - otherwise it's **reuse**: revoke the session (`revoked_reason = reuse_detected`), write a `refresh_reused` audit entry, and reject.
4. Otherwise set `rotated_at = now()`, insert a child with `parent_id` set, and return a new access token and refresh token.

Reuse means two parties hold the same family: the real user and whoever copied a token. The api can't tell which is which, so it ends the family, and both have to sign in again. The real user can; the thief can't.

The session's `expires_at` (90 days after login) is absolute. Rotation never extends it, so a stolen family that keeps refreshing still dies on schedule.

### 3. The grace window

Two server instances can refresh with the same cookie at once: a page that sends three requests just after the access token expired. Without a grace window, the second refresh would look like reuse and sign the user out. Locking the row only puts them in order; it doesn't make the second one valid.

So a token rotated less than 10 seconds ago can be exchanged again. It gets its own child, a sibling of the first. The first child isn't revoked, because the browser keeps whichever `Set-Cookie` arrives last, and that may be either of them. The cost: someone who copies a token and uses it within 10 seconds of the real user isn't caught. That's acceptable next to signing users out at random. The BFF also refreshes at most once per request, which keeps the window rarely used.

### 4. Passwords

- **Argon2id** from `node:crypto` (`crypto.argon2`, Node 24.7 and later; the repo pins Node 24 in `.nvmrc`, CI, and the api image). No native dependency to build. If that API changes before it's stable, `@node-rs/argon2` is the drop-in fallback.
- OWASP's minimum: 19 MiB memory, 2 iterations, parallelism 1, a 16-byte random salt. Stored as a PHC string (`$argon2id$v=19$m=19456,t=2,p=1$...`), so the parameters can be raised later: a login that verifies against old parameters rehashes the password.
- Passwords are 12 to 128 characters. No composition rules (NIST SP 800-63B).
- A login with an unknown email still runs one Argon2 verification against a fixed dummy hash, so its response time doesn't reveal which emails exist. Errors never do either: "Email or password is incorrect".

### 5. Registration is invite-only

`INVITE_EMAILS`, a comma-separated allowlist validated at boot, decides who may register until Phase 7 adds email verification. A registration for any other email is refused with a message that names no account.

Emails are trimmed and lower-cased before they reach the database, and a CHECK constraint (`users_email_normalized_check`) rejects anything else, so the unique index is case-insensitive without the `citext` extension.

### 6. Logout

- **Logout** revokes the current session (`logout`). The BFF clears both cookies.
- **Log out everywhere** revokes every live session of the user (`logout_all`).
- Access tokens aren't checked against the database, so an access token issued before a logout keeps working until it expires: at most 10 minutes. That's the price of stateless reads, and why the access lifetime is short. If it ever matters, a Redis set of revoked session ids, kept for 10 minutes, closes the gap.

### 7. Cookies and CSRF (in the web, Phase 2 PR 4)

- Both tokens live in cookies that are `HttpOnly`, `Secure` (outside local dev), `SameSite=Lax`, and `Path=/`, with the `__Host-` prefix in production, so no subdomain can set or read them. The refresh cookie's `Max-Age` matches the token's expiry.
- The BFF refreshes in `proxy.ts` when the access token is missing or about to expire, before rendering, so server components always see a valid token.
- CSRF: `SameSite=Lax` keeps the cookies off cross-site `POST`s, and every mutation goes through a Server Action or a route handler that checks `Origin`. No `GET` changes state.

### 8. Schema

Migration `20261021120000_auth`: `users`, `sessions` (the families), `refresh_tokens` (`parent_id` links each token to the one it was rotated from), and `audit_logs`. Ids are UUIDv7: ordered by time like a serial, without revealing how many users exist. `audit_logs` records registrations, logins (successful and failed), detected reuse, and logouts, with the ip and user agent, and is only ever inserted into. Watchlists get their own migration with the watchlist PR.

## Consequences

- Every api call is a signature check, not a lookup. Every refresh is one transaction with a row lock.
- A revoked session's access tokens live up to 10 more minutes (section 6).
- Refresh tokens pile up: each refresh adds a row. A cleanup job that deletes tokens of expired or revoked sessions comes with BullMQ in Phase 4; until then, at about one refresh per 10 minutes of use, the table stays small.
- The api never sees a cookie and the browser never sees a token, so the api's contract is plain JSON: `POST /api/auth/register`, `/login`, `/refresh`, `/logout`, `/logout-all`.
- What we'd change for production with other people's money: `jose` for JWTs (or a managed identity provider), asymmetric keys (EdDSA) with a `kid` and key rotation, and a device-bound proof of possession (DPoP) instead of bearer refresh tokens.
