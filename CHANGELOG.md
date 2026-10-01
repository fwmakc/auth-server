# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.10.0] - 2026-10-01
### Added
- **Optional JWT issuer/audience verification** (`JWT_ISSUER` / `JWT_AUDIENCE`):
  when set, auth signs tokens with `iss`/`aud` claims and every verification
  (local `AccountStrategy` and the toolkit one) enforces them. Off by
  default — set the SAME values on every service of the stack and roll in
  one deployment: validators reject tokens without the claims.
- **Single-use 2FA challenge tokens**: the `mfa_token` issued at login now
  carries a random `jti`; a successful verify records it in the new
  `used_mfa_jti` ledger (unique index, `ON CONFLICT` decides atomically —
  parallel replays cannot both win). Exchanging the same challenge twice
  returns the same 401 "Invalid verification code" as a wrong code, so a
  successful first exchange leaks no oracle. Challenge tokens signed before
  this release (no `jti`) keep working.
### Fixed
- **Refresh-token rotation race (TOCTOU)**: `verify()` did
  read-check-revoke in three statements — two parallel refreshes with the
  same token could both pass the `revoked = false` check and both rotate.
  Now a single atomic `UPDATE ... WHERE token_hash = :hash AND revoked =
  false RETURNING ...` consumes the token; zero rows means either unknown
  token ("Invalid refresh token") or a replay, which revokes the whole
  token family ("Refresh token reuse detected") as before. Expired tokens
  are consumed without family teardown (expiry is normal lifecycle, not
  theft).
- `registerFailure`'s `RETURNING` listed database column names, which
  TypeORM resolves as property paths — it returned no rows, so the
  lockout audit event always said `locked: false` (enforcement itself read
  the fresh row and was correct).
- Local test runs honor `DB_PASSWORD` from the environment instead of
  hardcoding `1234`.

## [0.9.0] - 2026-09-30
### Added
- **Redis-backed rate-limit storage** (HA wave): `THROTTLE_STORAGE=redis` +
  `REDIS_URL` moves the throttler counters into Redis via
  `ThrottlerStorageRedisService`, so N auth replicas enforce ONE shared limit
  instead of N independent ones (in-memory counters multiply the effective
  caps by the replica count). Default stays `memory` — single-replica
  behavior unchanged. Fail-closed: while Redis is unreachable, storage calls
  reject and guarded requests fail (a rate limiter must not fail open);
  the client connects at boot, fails fast (`enableOfflineQueue: false`,
  2 retries, 3s connect timeout) — lazy connect would 500 the first
  requests on the not-yet-open stream. Compose service `redis` added in
  gateway-server; `THROTTLE_STORAGE` / `REDIS_URL` pass through there.
- **Boot migrations are multi-replica safe**: `dataSourceFactory` now runs
  them through toolkit `runMigrationsUnderLock()` (pg advisory xact lock) —
  simultaneously scaling replicas serialize instead of racing `InitialSchema`
  on a cold database.
### Fixed
- **2FA lockout counter was read-modify-write** (HA audit): `registerFailure`
  saved the whole row after incrementing `failed_attempts` in memory —
  concurrent verification attempts (parallel requests or replicas) lost
  increments, silently weakening the lockout threshold. One atomic
  `UPDATE ... RETURNING` now decides both the increment and the lock
  transition; the `auth.2fa.locked` audit entry is emitted from the verify
  flow when the update stamps a future `locked_until`.

## [0.8.10] - 2026-09-30
### Added
- **Env-tunable rate limiting** (load-testing wave): the named throttle sets
  read from env — `THROTTLE_AUTH_TTL` / `THROTTLE_AUTH_LIMIT` (login, confirm,
  2FA verification), `THROTTLE_AUTH_STRICT_LIMIT` (register, reset),
  `THROTTLE_TOKEN_LIMIT` (token endpoints), `THROTTLE_DEFAULT_TTL/LIMIT`
  (everything else). The per-route `@Throttle` decorators now share the same
  constants as `ThrottlerModule.forRoot`, so a deployment can trade
  brute-force protection for throughput without a rebuild. Defaults keep the
  historical limits (5/min login, 3/min register/reset, 10/min tokens,
  10/s default); a bad value falls back to the default (fail closed).
### Fixed
- `POST /account/methods/change/:code` had **no route-level throttle** — it
  accepted a plaintext password + one-time code at the default 10/s. It now
  sits in the strict tier (3/min like register/reset).

## [0.8.9] - 2026-09-30
### Fixed
- **Password change now revokes every refresh token of the account** (self-pentest): `POST /account/methods/change/:code` rotated the password but left all refresh families valid — a stolen refresh token survived the credential rotation. The change handler now calls `DbRefreshStore.revokeAll(account.id)` (the same store logout uses). Access tokens still expire on their own 15-minute budget.
- **Logout actually clears cookies** (self-pentest): `MethodsAccountService.logout` accepted `res` but never passed it to the handler, so the `id`/`query` cookies survived logout in the browser. The handler already supported `response` — it is now forwarded.
- **Account enumeration via register** (self-pentest): registering an already-activated username answered 400 «already in the system», letting anyone probe which emails exist (and re-registering unactivated accounts could bomb arbitrary mailboxes). The response is now uniform `{ success: true }` for duplicates — no email is sent, the attempt is audited as a failure.
- **Account enumeration + timing leak via password reset** (self-pentest): reset for an unknown username answered 401 «User not found» (and skipped the bcrypt work that an existing account performs). The response is now uniform `{ success: true }`, with a dummy bcrypt hash equalizing timing; no reset code is created and no email leaves the system.
- **Confirm-code TTL check broke on TZ≠UTC hosts** (found by tests during this wave): `account_confirm.created_at` is a naive-UTC column (DB `CURRENT_TIMESTAMP`), but the cutoff was a JS `Date` — node-postgres serializes Date params in the host timezone and postgres discards the offset when comparing to `timestamp`, so on a UTC+3 host a seconds-old reset code looked 3 hours old and `findByCode` always returned null («Invalid reset code» for every correct code). The cutoff is now passed as a UTC-naive string, removing the timezone from the comparison entirely.
- Toolkit pinned `#v0.22.0`: `AccessRule.filter` compiles into binds (fail-closed scope rules), delete guards cover tenant binds, scoped `movePosition`, search no longer widens relation loading, `getClientIp()`/`TRUST_PROXY` fix X-Forwarded-For spoofing.

## [0.8.8] - 2026-09-30
### Fixed
- Toolkit `#v0.21.1`: `AuditModule.forRoot()` could not see the app-root `EventClientModule` (Nest module scopes are not shared), so `AuditService` ran without an event client and audit entries degraded to fallback log lines. With 0.21.1 the module binds the client itself — audit events now actually reach event-server's `audit_events` store.

## [0.8.7] - 2026-09-30
### Added
- **Audit logging for every security-relevant action** (toolkit 0.21.0 `AuditService`, published as `audit.event` into event-server 0.8.0's tamper-evident store; `AuditModule.forRoot({ mutations: false })` — all auth mutations are audited explicitly, so the generic mutation interceptor is off):
  - login: `auth.login.success` / `auth.login.failed` (with reason), `auth.2fa.challenge`, 2FA verify success as `auth.login.success` with `method: "2fa"`;
  - 2FA lifecycle: `auth.2fa.enabled` / `auth.2fa.disabled` (failure-safe wrapped), `auth.2fa.challenge_failed`, `auth.2fa.locked` (attempt while locked + threshold lock), `auth.2fa.recovery_used`;
  - account lifecycle: `auth.register`, `auth.confirm.success` / `auth.confirm.failed`, `auth.password.change`, `auth.password.reset_requested`, `auth.logout`, `auth.account.deactivated`, `auth.account.deleted` (with deleted username in details);
  - roles: `auth.roles.changed` on `POST /account/roles` with the acting account and assigned role in details.
- Every entry carries ip / user-agent from the request and `requestId` from the ALS context.

### Changed
- Pins: toolkit `#v0.21.0`, event-server `#v0.8.0` (from legacy `#v1.1.0`) — picks up the `audit.event` contract.

## [0.8.6] - 2026-09-29
### Changed
- Toolkit pinned to v0.20.3 (QueueWorker claim: Postgres forbids FOR UPDATE on the nullable side of an outer join — relations are now hydrated by a second lock-free query inside the claim transaction).

## [0.8.5] - 2026-09-29
### Fixed
- `POST /account/methods/reset` (password reset request) rejected every request with «password must be a string»: it validates `AccountDto`, where `password` was `@IsString()` without `@IsOptional()` — absurd for a forgotten-password flow. `password` is now optional at the DTO level; register and change/:code still enforce presence and the policy through `PasswordPolicyService` (`assertValid` rejects undefined).

## [0.8.4] - 2026-09-29
### Fixed
- `/health` is no longer rate limited: the global ThrottlerGuard counted docker/nginx health probes, a burst of 429s marked the container unhealthy and cascaded into restart flaps. `AppThrottlerGuard` skips exactly `/health`; all other routes keep their limits.

## [0.8.3] - 2026-09-29
### Changed
- Toolkit pinned to v0.20.2 (bootstrap binds 0.0.0.0 by default).

## [0.8.2] - 2026-09-29
] - 2026-09-29
### Fixed
- Boot failed in production with "No storage driver defined … call initializeTransactionalContext()": the call was gated behind an undocumented TRANSACTIONAL env var while app.module.ts unconditionally wraps the DataSource with addTransactionalDataSource. Boot migrations (migrationsRun) exposed the mismatch. The context is now always initialized before TypeORM starts.

## [0.8.1] - 2026-09-29
### Fixed
- Docker image failed to boot with `Cannot find module '/app/dist/main'`: root-level `jest.config.js` and `scripts/` (allowJs) shifted the tsc common root, so the build landed in `dist/src/`. `tsconfig.build.json` now pins `rootDir: "src"` and `include: ["src/**/*.ts"]`.

## [0.8.0] - 2026-09-29
### Changed
- Database schema is now owned exclusively by TypeORM migrations. DB_SYNCHRONIZE is removed: pending migrations are applied on every boot (hardcoded migrationsRun: true), so the first boot on an empty database initializes the schema. Test env no longer sets the dead variable.
### Fixed
- src/config/typeorm.config.ts no longer self-initializes the DataSource on import — it raced with the CLI initialization and made migration commands flaky.
- New `AccountRoles` migration: `roles` and `account_roles` tables (introduced with the Access model) had no migration — a database built from migrations alone was missing them. CI now also verifies entities have no drift against the migration chain.
- `account_two_factor`: declared the unique account index and `ON DELETE CASCADE` in the entity (previously only in the hand-written migration) and aligned the FK constraint name.
- `refresh_tokens` migration: `id` is SERIAL (matching the entity's `@PrimaryGeneratedColumn`) with the metadata PK constraint name.

## [0.7.1] - 2026-09-28
### Changed
- Node.js runtime bumped 22 → 24 LTS: Docker images `node:24-alpine`, CI `node-version: 24`.
- Toolkit pinned to `api-server-toolkit#v0.18.0` (adds `ApiKeyGuard` / `@ApiKey()`; no behavior change for existing routes).

## [0.7.0] - 2026-09-28

### Added
- Refresh token reuse detection: `refresh_tokens.family_id` tracks the rotation chain. Presenting an already-revoked refresh token is treated as theft — the whole family is revoked immediately. Fresh logins start a new family; rotation inherits it.
- Migration `RefreshTokenFamily1790570000000` — adds `family_id` (creates `refresh_tokens` too: the table was missing from `InitialSchema` and previously existed only via `DB_SYNCHRONIZE`).
- `JWT_REFRESH_EXPIRES` is now honored by the refresh store (was documented but hardcoded to 30 days).

### Changed
- `DbRefreshStore.verify` distinguishes unknown tokens from revoked ones (`Invalid` vs `Refresh token reuse detected`).
- Toolkit v0.17.0 `Cors.setup` allowlist semantics (`CORS_ORIGINS` env).

## [0.5.0] - 2026-08-03

Version reset to pre-release. The auth server is functional (41 tests, JWT/JWKS, SSO providers, account lifecycle) but the overall stack is not yet production-hardened. Pinned to `api-server-toolkit#v0.9.0`.

## [2.0.0] - 2026-08-03

### Stack v2 alignment
- Major version aligned with api-server-toolkit v2.x
- Pinned to `api-server-toolkit#v2.1.0`
- Pinned to `event-server#v2.0.0`
- OAuth2 authorization server: JWT RS256, social login (Google, Leader-ID, UNTI), password reset, event publishing
- OIDC: JWKS, discovery, `/userinfo`
- 5 grant types: password, refresh_token, authorization_code, client_credentials, key
- 5 test suites, 41 tests
