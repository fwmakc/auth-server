# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.2] - 2026-09-29
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
