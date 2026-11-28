# ADR 0015: Review access and activity tracking

- Status: Accepted for access (sections 1 to 6, built); proposed for tracking (section 7, not built)
- Date: 2026-11-27

## Context

The app is private: every page needs a session, and registration is open only to the emails in `INVITE_EMAILS` (ADR 0006, section 5). The owner wants to show it to a company: hand them a way in, close it after a few weeks, and see whether they looked.

The allowlist can't do this. It decides who may register and nothing afterwards: an email taken off it keeps its account and its sessions. It also needs a redeploy to change, and the person invited has to register themselves.

Numbers 0013 and 0014 are taken by ADRs that Phases 5 and 7 have planned and not yet written.

## Decision

### 1. A review account is an ordinary user plus one row

`review_access` has the user's id as its key, with `company`, `note`, `expires_at`, `revoked_at`, two password flags, and who made it. A user with a row is a review account; everything else about it (watchlists, a paper portfolio, sessions) is what any user has. It is made by an admin (`POST /api/admin/access`), never by registering, so the allowlist plays no part.

A role column on `users` was the alternative. Roles are Phase 7's, and this needs dates and a company name that a role wouldn't carry.

### 2. Shared email and password, not a one-time token link

The company is sent an email address and a password. A link with a single-use token would be the stronger design, and was proposed; the owner chose credentials knowing the cost, because a sign-in that several people at the company can use, more than once, over weeks, is the point.

What bounds the risk:

- The password is generated (120 random bits), returned by the api once, and stored only as an Argon2id hash. It is never one the owner uses elsewhere.
- By default the first sign-in must replace it (section 4), so the password that travelled in a message stops working there.
- The account has an end date and a revoke switch, holds nothing private, and can't be an admin: an email in `ADMIN_EMAILS` is refused as a review account.
- The link that is sent, `/login?email=…`, fills in the email only. A password in a URL would sit in browser history, proxy logs, and chat previews for no gain over typing it.

### 3. Closing is a property of the account, checked at login and at refresh

An account is `active`, `expired` (past `expires_at`), or `revoked` (`revoked_at` set; this wins over expired). Login and refresh refuse anything but `active`:

- **Login** answers a correct password on a closed account exactly as it answers a wrong one, so the response says neither that the account exists nor why it is refused. The audit log records `review_access_refused`.
- **Refresh** looks the account up after rotating the token, and on a closed account ends its sessions and answers 401.
- **Revoke** sets `revoked_at` and ends every session in one transaction. **A new end date** clears `revoked_at`: extending is how an account is reopened.

Access tokens are not checked against the database on each request (ADR 0006 keeps the guard to a signature check). So:

- An account that **expires** stops at that moment: its access tokens are signed to expire no later than `expires_at`.
- An account that is **revoked** keeps a page it has open working until its current access token runs out, at most ten minutes. Then the refresh fails and the browser is sent to sign in, where it is refused.

Checking every request would close that window at the price of a query per request for all users. Ten minutes is accepted for an account that holds nothing private. If it stops being acceptable, the check belongs in the guard behind a short cache, for tokens that carry a review claim only.

### 4. The forced password change is a claim in the token

While `must_change_password` is set, the access token carries `pwd: true`. `JwtAuthGuard` refuses such a token with a 403 on every route that isn't marked `@AllowBeforePasswordChange()`: changing the password, `GET /api/me`, and the two sign-outs. The web's proxy reads the same claim and sends every page to `/change-password`.

`POST /api/auth/password` takes the current and the new password, ends every session of the account (whoever else held the old password is signed out), and returns a new token pair without the claim. It works for any account, not only review accounts.

The flag is chosen per account. An account marked **shared** (several people use the one sign-in) never has it, and its password can't be changed at all: one of them changing it would lock the others out. A CHECK constraint keeps the two flags from being true together.

A claim rather than a lookup, for the reason in section 3: the guard stays a signature check. The claim is recomputed at every refresh, so it can't outlive the flag by more than a token's lifetime, and a password change replaces the tokens at once.

### 5. Recovery is an admin's reset

There is no password reset by email until Phase 7. An admin's "reset password" makes a new password, shows it once, ends the sessions, and sets the forced change again (unless the account is shared).

### 6. Everything is in the audit log

`review_access_created`, `_updated`, `_revoked`, `_refused`, `password_changed`, and `password_reset` join the existing actions, with the admin who acted under `metadata.by`. Sessions ended by a revoke carry the reason `access_closed`; by a password change or reset, `password_changed`.

### 7. Tracking: first-party events, for review accounts only (proposed)

Not built; items 3 and 4 of the roadmap's side track. The plan: page views and successful writes are stored in Postgres per user and session, only for users with a `review_access` row, read on an admin page, and deleted 90 days after access ends. The account is told on its first page that its activity is recorded.

Google Analytics was the alternative the owner raised. It reports aggregates, forbids identifying data, and needs a consent banner; the question here is about one named account, which the app can answer from its own tables.

## Consequences

- An admin can give access, see whether it was used (`lastSignInAt`, and whether the first password was replaced), and end it, without a redeploy.
- `INVITE_EMAILS` is unchanged and still the only way to register. Whether it stays is Phase 7's decision.
- A revoked account can keep using an open page for up to ten minutes.
- A shared account's password is known to everyone it was forwarded to for as long as the account is open. That is what "shared" was chosen to mean; the end date is the control.
- Refresh costs one more query for every user (the lookup of `review_access` by primary key).
- The api now has a way to change a password. The Settings pages don't link to it yet.
