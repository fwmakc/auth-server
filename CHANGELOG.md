# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.13.0] - 2026-10-06
### Added
- **`GET /account/internal/list?after=<id>&limit=<n>`** — курсорный
  листинг аккаунтов (`{items: [{id, username, isActivated}]}`, limit ≤
  1000) для бэкфилла accounts-зеркала в api-server
  (`scripts/backfill-accounts.ts`). Тот же masked-404 internal-контракт,
  что у `info/:id` (плохой ключ неотличим от отсутствующего маршрута);
  срез минимальный — без ролей и без хешей паролей. `AccountService.
  listAfter(afterId, take)` под ним; +3 теста (404 без/с неверным ключом,
  курсорная страница, пустая страница за концом).

## [Unreleased]
### Fixed
- **`isActivated` из публичного register-пейлоада больше не применяется**:
  `RegisterAccountHandler.authCreate` стрипает флаг — запрос на регистрацию
  не может сам себя активировать и перескочить подтверждение по email
  (иначе аккаунт создавался активированным, а `user.registered` уходил без
  `confirmUrl`). OAuth-провайдеры (leaderid/unti) не задеты — они создают
  активированные аккаунты серверно через `accountService.create` напрямую.
  Регрессионные тесты: `register.account.handler.spec.ts`.
- **Логины перестали блокировать event loop**: `bcryptjs` (чистый JS, ~55–270 мс
  синхронного CPU на хеш) заменён на нативный `@node-rs/bcrypt` (Rust, работает
  на libuv threadpool; прекомпилированные бинарники в комплекте — переживает
  `npm install --ignore-scripts` в Dockerfile, musl/gnu сборки в lockfile).
  Найдено нагрузочным тестом (Wave 6 / Stage 4): cost-12 шторм давал 2–3.4%
  500-х — забитый цикл событий морил pg-соединения, TypeORM-раннеры
  освобождались посреди запроса (`QueryRunnerAlreadyReleasedError` в
  `DbRefreshStore.issue`). Старые хеши `$2a$` проверяются без миграции
  (и зафиксированы спекой). Cost 10 не тронут. Вызов `hash(input, cost?,
  salt?)` берёт cost напрямую, `genSalt` выпилен из точек вызова
  (register/2FA recovery-коды/clients secrets/test-seeding/wiring).

### Tests

- `hash.account.handler.spec.ts`: механизм-пин — 4 параллельных хеша не
  задерживают сэмплер event loop дольше 100 мс (под bcryptjs тест падал бы на
  ~220 мс блокировки), плюс round-trip и проверка legacy-хеша `$2a$`.
- `scripts/wiring.ts`: порт БД переопределяется через env (`DB_PORT`, дефолт
  5432), bcrypt-сиды переведены на нативную библиотеку. 11/11 на реальном
  Postgres после замены.

### Previous (wiring)

- `scripts/wiring.ts`: кредиты БД переопределяются через env (`DB_PASSWORD`), дефолт не изменился.
- **Wiring check for a real boot** (`scripts/wiring.ts`, `npm run test:wiring`): boots the real `AppModule` in an application context against a fresh `auth_server_wiring_test` database (drop/create + real `runMigrationsUnderLock` boot migrations — catches entity↔migrations drift that the existing suites, which run test entities with `synchronize: true`, cannot see), then probes live behavior on real Postgres: account round-trip, login (bcrypt verify + 401 on wrong password), confirm-code lifecycle (generate / validate / replay rejected / stale rejected), 2FA email-code lockout (5 wrong codes → `locked_until` set with the attempt counter reset, 6th attempt → rejected). 11/11 checks, process exit code is CI-friendly. Runs via ts-node, not jest: under the jest runtime a full AppModule boot corrupts the `pg` module cache (second `require("pg")` returns an emptied cache — race, jest-only artifact; production node boots are unaffected).
- CI: new `wiring` job with a TZ matrix (UTC + Europe/Moscow) — the naive-UTC `locked_until` logic is pinned TZ-proof on both frames (the jest suite itself is pinned `TZ=UTC`).

## [0.12.0] - 2026-10-01
### Security (Wave 6)
- **`grant_type=key` removed** from `POST /token`: the grant minted a token pair from a static hash in the legacy `users` table — passwordless login with a long-lived shared secret, no 2FA, no rotation. No consumers left in the workspace (grep over api/message/file). `KeyGrant`, its module wiring, the dispatch branch and the `key` DTO field are gone; `findByHash` on users stays (chat identity link, read-only).
- **Single-use codes are consumed atomically**: confirm/reset/2fa codes now claim the row with `DELETE ... RETURNING` in one statement — two concurrent submissions of the same code can no longer both pass the old find-then-delete race (winner takes the row, loser gets "invalid code"). The entity is hydrated from the RETURNING payload plus a fresh account lookup (the row is gone by then); done via raw SQL because the query-builder `.returning()` silently drops non-property columns like `account_id`.
- **OAuth logins can no longer activate an inactive account**: a login via Google/Leader-ID/UNTI/generic OAuth verified the email and then flipped `isActivated` to true — bypassing the local confirm flow (and its email-ownership proof for accounts created with an unverified address). Existing accounts now log in without any write; only NEW provider-verified accounts are born activated. Leader-ID additionally requires an email-confirmed profile (username IS email, so phone-confirmed profiles were unusable anyway).
- **`account_sessions.get_by_auth_id` no longer echoes other users' sessions**: the route took `auth_id` straight from the query string and joined account relations — any authenticated user could read session rows of any id. Rebuilt as a self-scoped `@Account()` + `@Self()` handler; relation injection whitelist (`account`) instead of an arbitrary join.
- **2FA lockout is TZ-safe**: `locked_until` is a naive UTC wallclock; the pg driver parses it in the host's local frame, so on any TZ≠UTC host the lock appeared already expired (5-attempt lockout never engaged — pinned by the integration test, failed live on a UTC+3 host before the fix). Comparisons re-anchor by the host offset (`utcFromNaive`).
- **Recovery-code consumption is race-free and self-healing**: the burned hash is removed with an atomic `jsonb @>`-contained UPDATE (returning the id decides), and the row bookkeeping (`failedAttempts`/`lockedUntil` reset) uses a partial `repository.update` — a full `save(row)` could resurrect a just-consumed code from the in-memory snapshot.
- **`JWT_ACCESS_EXPIRES` has a 15m default** in the pair handler — an unset env var used to mint non-expiring access tokens.
- **Login with an empty credential hash fails closed**: accounts without a local password (OAuth-only) got `compare(password, null)` → driver-level error/500-ish path instead of a clean 401; guard added in login + deactivate.

### Removed
- `src/token/grant/key.grant.ts` and the `key` field of the token request DTO.

### Tests
- Full suite 151/151 against real Postgres (integration): 2FA flows (TOTP+email, lockout, recovery, mfa single-use), auth flows, access control, sessions, token grants, refresh families.
- `registerFailure` unit spec mocks now emulate the pg naive-timestamp parse (TZ-proof on any host).

### Assessed, no action
- Client secrets (`clients.client_secret`): JWT minted at registration, stored bcrypt-hashed, verified by compare only — the JWT signature is never checked at verify time, so JWKS key rotation cannot invalidate existing client secrets; a `kid` ring for client secrets is unnecessary.

## [0.11.1] - 2026-10-01
### Fixed
- `GET /account/internal/info/:id` joins the rotation window: it keeps its **local** key check (not the toolkit guard) on purpose — this route masks a bad key as 404 so probes can't distinguish "no route" from "no access" (pinned by e2e); the check now also accepts `INTERNAL_API_KEY_PREVIOUS` (comma-separated, per-key constant-time), same semantics as `InternalAuthGuard`. Found live: during the stand rotation the retired key was rejected here while every other validator already accepted it.

## [0.11.0] - 2026-10-01
### Added
- **JWT key rotation (dual-key overlap)**: `JWT_PREVIOUS_PUBLIC_KEY_PATHS` (comma-separated retired public keys) — the key ring verifies tokens against the current pair **plus** every listed previous key and publishes all of them in `/.well-known/jwks.json`, so api/file/message keep accepting old-key tokens through the same JWKS (consumers already select by the token's `kid`). auth-server's own `AccountStrategy` and the token verify handler now select the verification key by `kid` too (previously: single local public key — old-key tokens would 401 on auth routes during rotation). Missing previous-key file is a hard boot error (a silent drop would 401 every outstanding token). Zero-downtime procedure: gateway-server `scripts/rotate-jwt-keys.sh` + `docs/secret-rotation.md`.
- **AES envelope versions** flow through: OAuth strategy tokens and 2FA secrets store `{ v, encrypted, iv }` and decrypt by the stored version (legacy envelopes without `v` = key v1 — unchanged behavior).
- `scripts/reencrypt-aes.mjs` — one-pass re-encryption of `account_strategies` + `account_two_factor` envelopes to the current key version (dry run by default, `--apply`, idempotent, ships in the Docker image).

### Tests
- `keys.spec.ts` (7): ring composition (signing first), retired-kid selection (old token verifies against the retired key and NOT the current one), kid-header parsing, unknown-kid fallback, fail-fast on missing previous file, empty-window shape.

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
