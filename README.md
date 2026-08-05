# Auth Server

[![Tests](https://github.com/fwmakc/auth-server/actions/workflows/test.yml/badge.svg)](https://github.com/fwmakc/auth-server/actions/workflows/test.yml)
[![Version](https://img.shields.io/badge/version-v0.5.0-blue)](https://github.com/fwmakc/auth-server/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](https://github.com/fwmakc/auth-server/blob/master/LICENSE)

> Reference implementation: authentication service pattern — JWT RS256, JWKS endpoint, SSO, event-driven lifecycle.

## What This Is

A **working scaffold** — not a demo, not a toy. Production-ready OAuth2 provider
with JWT signing (RS256), JWKS endpoint, social login (Google, Leader-ID, UNTI),
and event publishing. Clone it, configure your OAuth clients, deploy.

Part of a [microservices stack](https://github.com/fwmakc/gateway-server) —
other services verify JWTs via `/.well-known/jwks.json`.

Port **3001**.

---

## Pattern

This service demonstrates the **auth service pattern** in the toolkit stack:

- **JWT signing (RS256)** — asymmetric keys, private signs, JWKS verifies
- **JWKS endpoint** — other services validate tokens without sharing the private key
- **Social login** — Google, Leader-ID, UNTI, custom OAuth2 providers
- **Event publishing** — `user.registered`, `user.confirmed`, `password.reset` via event-server
- **Two auth surfaces** — forms (HTML redirects) and methods (JSON API)

Clone this when you need: authentication, authorization, OIDC, social login, or session management.

---

## Features

- User registration & activation (bcrypt password hashing)
- OAuth2 token endpoint: `password`, `refresh_token`, `authorization_code`, `client_credentials`, `key` (custom)
- OAuth2 authorize endpoint (authorization-code + implicit flows)
- **OIDC**: JWKS, discovery document, `/userinfo` endpoint
- **JWT RS256** asymmetric signing (private key signs, JWKS for verification)
- Social login: Google, Leader-ID, UNTI/2035, custom OAuth2
- OAuth client management (client_id, client_secret, redirect URIs)
- Session tracking & login logging
- Event publishing via event-server (`user.registered`, `user.confirmed`, `password.reset`, `user.deactivated`, `user.deleted`)
- Two auth surfaces: **forms-based** (HTML redirects) and **methods-based** (JSON API)

---

## Architecture

```
Vue frontend ──> auth-server (REST, JWT)
                     │
                     ├── issues JWT (RS256, verified via JWKS by other services)
                     ├── publishes events ──> event-server ──> message-server (email)
                     └── PostgreSQL (auth_server database)
```

### Modules

| Module | Responsibility |
|--------|---------------|
| `AccountModule` | Core auth: registration, login, logout, confirm, reset, deactivate, delete. 5 controllers, sub-services, 8 handlers. Imports `EventClientModule`. |
| `TokenModule` | JWT issuance (RS256), 5 grant classes, token handlers |
| `JwksModule` | JWKS endpoint, OIDC discovery, `/userinfo` |
| `AccountStrategiesModule` | Social login (Google, Leader, UNTI, OAuth), session serialization |
| `AccountSessionsModule` | Login session logging (auto-CRUD) |
| `AccountConfirmModule` | Confirmation codes |
| `ClientsModule` | OAuth client apps + client JWT strategy |
| `ClientsRedirectsModule` | Client redirect URIs |
| `UsersModule` | User profiles (auto-CRUD) |
| `MailModule` | SMTP email sending (registration confirm, password reset) |
| `RandomModule` | Random data generation utilities |

### Entities

| Entity | Table | Key columns |
|--------|-------|-------------|
| `AccountEntity` | `accounts` | id, username (email), password, is_activated, is_superuser, is_deleted |
| `UsersEntity` | `users` | id, email, phone, name, last_name, avatar, birthday, locale, gender |
| `ClientsEntity` | `clients` | id, client_id, client_secret, client_type, title, client_uri |
| `ClientsRedirectsEntity` | `clients_redirects` | id, uri (FK→clients CASCADE) |
| `AccountSessionsEntity` | `account_sessions` | id, ip, user_agent, method, locale (FK→accounts CASCADE) |
| `AccountConfirmEntity` | `account_confirm` | id, code, type (FK→accounts NO ACTION) |
| `AccountStrategiesEntity` | `account_strategies` | id, name, uid, json, access_token, refresh_token (FK→accounts CASCADE) |

> **Note:** `username` IS the email address in this system.

---

## API Endpoints

### OAuth2 / Token

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/token` | — | Token issuance (dispatches on `grant_type`) |
| GET | `/account` | — | OAuth2 `/authorize` (authorization_code flow only) |

**Supported grant types:**

| Grant | Behavior | Status |
|-------|----------|--------|
| `password` | Username/password → access + refresh token pair | **Deprecated** (first-party only) |
| `refresh_token` | Refresh access token (account or client), rotation supported | Active |
| `authorization_code` | Exchange signed code for tokens (HMAC-SHA256) | Active |
| `client_credentials` | Client authentication (client_id/secret, bcrypt-hashed) | Active |
| `key` | Passwordless login via hash key (auto-creates activated account) | Custom |

> **Password grant (deprecated):** `grant_type=password` is intended for **first-party
> clients only** (your own frontend/backend). Third-party applications must use the
> `authorization_code` flow. This grant type is deprecated in OAuth 2.1. Rate-limited
> at 10 requests/minute via `@nestjs/throttler`.

### OIDC / Well-Known

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/.well-known/jwks.json` | — | RSA public key set (JWK) |
| GET | `/.well-known/openid-configuration` | — | OIDC Discovery document |
| GET | `/userinfo` | JWT | OIDC UserInfo — returns account/user claims |

### Account — Forms (HTML redirects)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/account/register` | — | Register (redirects via `FORM_*` URLs) |
| POST | `/account/login` | — | Login via form |
| POST | `/account/logout` | JWT | Logout |
| GET | `/account/confirm/:code` | — | Confirm registration |
| POST | `/account/change/:code` | — | Change password with confirmation code |
| POST | `/account/reset` | — | Request password reset |

### Account — Methods (JSON API)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/account/methods/register` | — | Register new account |
| POST | `/account/methods/login` | — | Login |
| POST | `/account/methods/logout` | JWT | Logout |
| GET | `/account/methods/confirm/:code` | — | Confirm account |
| POST | `/account/methods/change/:code` | — | Change password |
| POST | `/account/methods/reset` | — | Request password reset |
| POST | `/account/methods/deactivate` | JWT | Deactivate account |
| DELETE | `/account/methods/delete/:id` | JWT | Delete account by id |
| POST | `/account/methods/hash/:string` | — | Hash a string (bcrypt) |

### Account — Self-info

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/account/self` | JWT | Current authenticated account with strategies |

### Internal (service-to-service)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/account/internal/info/:id` | `X-Internal-Api-Key` | Returns `{id, username, isActivated, isSuperuser}` for other services |

### Social Login Strategies

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/account/strategies/self` | JWT | List current user's linked strategies |
| GET | `/account/strategies/self/:name` | JWT | Get specific linked strategy |
| GET | `/account/strategies/google/login` | OAuth | Start Google login |
| GET | `/account/strategies/google/redirect` | OAuth | Google callback |
| GET | `/account/strategies/leader/login` | OAuth | Start Leader-ID login |
| GET | `/account/strategies/leader/redirect` | OAuth | Leader-ID callback |
| GET | `/account/strategies/2035/login` | OAuth | Start UNTI/2035 login |
| GET | `/account/strategies/2035/redirect` | OAuth | UNTI/2035 callback |
| GET | `/account/strategies/oauth/login` | OAuth | Start custom OAuth login |
| GET | `/account/strategies/oauth/redirect` | OAuth | Custom OAuth callback |

### Other

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/account/sessions/*` | JWT | Session CRUD (auto-generated via `EntityController`) |
| GET | `/clients/*` | JWT/Client | OAuth client CRUD (auto-generated via `EntityController`) |
| GET | `/clients/self` | Client JWT | Current client info |
| GET | `/users/*` | JWT | User profile CRUD (auto-generated via `EntityController`) |
| POST | `/mail/send` | — | Send email (internal) |
| POST | `/mail/send_by_template` | — | Send templated email (internal) |

---

## Event Publishing

Events are published via the toolkit's `IEventClient` (HTTP webhook bus through event-server). Contract DTOs imported from `event-server/contracts`.

| Event | DTO | Trigger |
|-------|-----|---------|
| `user.registered` | `UserRegisteredDto` | On registration (with `confirmUrl` if not yet activated) |
| `user.confirmed` | `UserConfirmedDto` | On account confirmation |
| `password.reset` | `PasswordResetDto` | On password reset request |
| `user.deactivated` | `UserDeactivatedDto` | On account deactivation |
| `user.deleted` | `UserDeletedDto` | On account deletion |

All publishing is centralized in `src/account/service/methods.account.service.ts`.

---

## JWT / RS256

- **Algorithm:** RS256 (asymmetric)
- **Signing:** auth-server signs with RSA private key
- **Verification:** other services fetch public key from `/.well-known/jwks.json`
- **Key management:** `JWT_PRIVATE_KEY_PATH` / `JWT_PUBLIC_KEY_PATH` for persistent keys; auto-generated in-memory pair for dev
- **Key ID (`kid`):** SHA-256 hash of the public JWK
- **Token types:** access, refresh, client (separate expiry settings)

### Guards

| Guard | Decorator | Purpose |
|-------|-----------|---------|
| `AccountStrategy` (JWT) | `@Account()` | Standard JWT auth (verifies RS256 token, checks account activated) |
| `ClientsStrategy` (JWT) | `@Client()` | OAuth client auth (verifies client_secret) |
| Social guards | `@UseGuards(GoogleGuard)` etc. | Passport OAuth flows with session |

---

## Configuration

See `.env.example`. Key variables:

### Server
- `PORT` (3001), `IP`, `NODE_ENV`, `ROOT_PATH`, `PREFIX`
- `SENTRY_DSN`, `SENTRY_ENV`

### Database
- `DB_TYPE`, `DB_HOST`, `DB_PORT`, `DB_NAME` (auth_server), `DB_USER`, `DB_PASSWORD`
- `DB_SYNCHRONIZE` (default: false — set `true` for dev schema sync)
- `DB_LOG`, `DB_SCHEMA`

### JWT / RS256 Keys
- `JWT_PRIVATE_KEY_PATH`, `JWT_PUBLIC_KEY_PATH` (persistent keys)
- `JWT_ACCESS_EXPIRES`, `JWT_REFRESH_EXPIRES`, `JWT_CLIENTS_EXPIRES`, `JWT_EXPIRES`

### Sessions
- `SESSION_SECRET`, `SESSION_EXPIRES`

### SMTP / Mail
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_SECURE`
- `SMTP_SENDER_NAME`, `SMTP_SENDER_EMAIL`

### Social SSO Providers
- Generic OAuth: `OAUTH_SERVER`, `OAUTH_CLIENT_ID`, `OAUTH_CLIENT_SECRET`, `OAUTH_CLIENT_REDIRECT`
- Google: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CLIENT_REDIRECT`
- Leader-ID: `LEADER_CLIENT_ID`, `LEADER_CLIENT_SECRET`, `LEADER_CLIENT_REDIRECT`
- UNTI/2035: `UNTI_CLIENT_ID`, `UNTI_CLIENT_SECRET`, `UNTI_CLIENT_REDIRECT`

### Form Redirect URLs
- `FORM_LOGIN`, `FORM_REGISTER`, `FORM_RESET`
- `FORM_CONFIRM`, `FORM_CHANGE`, `FORM_REGISTER_COMPLETE`, `FORM_CONFIRM_COMPLETE`, `FORM_RESET_COMPLETE`

### Inter-service / Events
- `INTERNAL_API_KEY` (validates `X-Internal-Api-Key` header)
- `EVENT_SERVER_URL` (event-server base URL)
- `AUTH_SERVER_URL` (for other services to verify JWT)

### Swagger
- `SWAGGER_PREFIX`, `SWAGGER_PREFIX_REDOC`, `SWAGGER_TITLE`, `SWAGGER_DESCRIPTION`, `SWAGGER_VERSION`

---

## Docker

Built from repo root (context = `..`) so the Dockerfile can access `api-server-toolkit/` and `event-server/` siblings.

**Key build steps:**
1. `npm install --legacy-peer-deps --ignore-scripts` (skips git dep preparation)
2. Override `api-server-toolkit` with local `dist/` + `src/`
3. Override `event-server` with pre-built `dist/contracts/`
4. Compile TypeScript

```yaml
# gateway-server/docker-compose.yml
auth-server:
  build:
    context: ..
    dockerfile: auth-server/Dockerfile
  environment:
    - PORT=3001
    - DB_HOST=postgres
    - DB_NAME=auth_server
    - EVENT_SERVER_URL=http://event-server:3005
    - INTERNAL_API_KEY=${INTERNAL_API_KEY:-changeme}
    # ... see .env.example for full list
```

---

## Quick start

```bash
cp .env.example .env
# Set DB_SYNCHRONIZE=true for dev schema sync
npm install
npm run dev
```

Auth server runs on port **3001**.
Swagger UI at `http://localhost:3001/swagger`.

### Testing

```bash
npm test
```

Test suites: smoke, token, auth-flows (registration, confirmation, reset with mocked event client), access-control.

### TypeORM Migrations

```bash
npm run migration:auto   # Generate migration from entity changes
npm run migration:create -- --name=Init  # Create empty migration
npm run migration:run    # Apply migrations
npm run migration:revert # Revert last migration
npm run migration:fake   # Mark as applied without executing
```

---

## Dependencies

- **NestJS 9** — framework, Swagger, TypeORM, JWT, Passport
- **api-server-toolkit** — shared framework (columns, guards, EntityController, EventClient, helpers)
- **event-server** — event contract DTOs (type-safe publishing)
- **passport** — JWT, local, Google OAuth2, custom OAuth2 strategies
- **bcryptjs** — password hashing
- **@casl/ability** — authorization
- **@nestjs-modules/mailer** — SMTP email
- **express-session** — session management (file store)
- **pg** — PostgreSQL driver
- **@sentry/nestjs** — error tracking

---

## Integration into existing infrastructure

**Already have auth?** You can use auth-server alongside an existing provider:
- Use auth-server as the OAuth2 provider for new services, keep existing auth for legacy
- Point all services at auth-server's `/.well-known/jwks.json` for JWT verification
- Social login (Google, Leader-ID, UNTI) works out of the box

**Replacing Keycloak / Auth0?** auth-server provides:
- Standard OAuth2 flows (authorization code, password, refresh, client credentials)
- JWKS endpoint for asymmetric JWT verification (no shared secret)
- Social login with Google, Leader-ID, UNTI/2030
- Client management for first-party and third-party apps

## Migration

**From a monolith:** auth-server was extracted from a monolithic backend. The extraction is
clean — all auth concerns (registration, login, JWT, sessions, social, password reset) live
here. Your domain services only need to verify JWTs via JWKS.

**To another provider:** JWT verification is standard RS256/JWKS. Any service that verifies
auth-server's tokens will work with any compliant provider after updating the JWKS URL.

## Keycloak Comparison & Migration

### Feature Comparison

| Category | auth-server | Keycloak |
|----------|-------------|----------|
| **Auth flows** | password, refresh, auth code, client credentials, custom `key` grant | password, refresh, auth code, client credentials, device, implicit |
| **Identity standards** | OIDC (discovery, JWKS, `/userinfo`), OAuth2 | OIDC (certified), OAuth2, SAML 2.0 |
| **JWT signing** | RS256 only | RS256, ES256, HS256, PS256 |
| **Social login** | Google, Leader-ID, UNTI/2035, custom OAuth2 | Any OIDC/SAML provider via identity brokering |
| **User federation** | — | LDAP, Active Directory |
| **Multi-tenancy** | Single tenant | Realms (full isolation per tenant) |
| **Authorization** | `isSuperuser` boolean + CASL/ability | Realm/client roles, composite roles, groups, UMA 2.0 |
| **Admin UI** | API-only (Swagger/ReDoc) | Full admin console + account console |
| **Themes** | — | Customizable login/account/admin themes |
| **Events** | Webhook via event-server (user.registered, password.reset, etc.) | Built-in event bus, admin events, audit log |
| **WebAuthn/Passkey** | — | Built-in |
| **Step-up auth** | — | Built-in |
| **Session management** | DB-backed session log | Distributed (Infinispan), revocable, idle/timeout |
| **Tech stack** | Node.js / NestJS | Java / Quarkus (JVM) |
| **Resource footprint** | ~100 MB RAM | ~500 MB – 1 GB RAM (JVM) |
| **Docker image** | ~150 MB | ~600 MB |
| **Startup time** | ~2 s | ~10–15 s |
| **Source ownership** | Full — every line is yours, readable NestJS | Open source, but Java/Quarkus internals are complex |

### Where auth-server Wins

- **Simplicity** — the entire auth logic is a few thousand lines of readable NestJS. No
  SPI development, no theme XML, no realm export/import ceremony.
- **Resource footprint** — runs in ~100 MB of RAM. Keycloak needs 5–10x that for the JVM
  alone. On a small VPS, this is the difference between fitting and not fitting.
- **Full source ownership** — every line is yours to read, debug, and modify. No black-box
  framework internals, no "why did Keycloak do this?" spelunking through Java stack traces.
- **Domain-specific social login** — Leader-ID and UNTI/2035 (Russian platforms) are
  pre-built. In Keycloak, you'd configure these as custom OIDC identity providers.
- **Event-driven integration** — publishes typed events (`user.registered`,
  `password.reset`) through event-server. Downstream services (message-server, etc.)
  react via webhooks. Keycloak has admin events, but the integration model is different.
- **Toolkit integration** — `@Account()`, `@Self()`, `accessGuard`, and `EntityController`
  are designed for this auth-server's JWT shape. Zero glue code.
- **Customization speed** — change TypeScript, restart, done. Keycloak customizations
  require Java SPI development, Keycloak Config CLI, or theme overrides.
- **No admin console overhead** — if you don't need a UI for user management, Keycloak's
  console is unnecessary weight. auth-server is API-first; manage users via REST.

### Where Keycloak Wins

- **Battle-tested** — enterprise-grade, security audited, used by large organizations.
- **Multi-tenancy** — realms provide full tenant isolation (separate users, clients,
  identity providers, themes). auth-server is single-tenant.
- **Identity brokering** — any SAML/OIDC provider can be a login method. auth-server
  supports OAuth2 providers but not SAML.
- **User federation** — LDAP/Active Directory integration out of the box. auth-server
  has no federation — all users are local.
- **Fine-grained authorization** — UMA 2.0, permission tickets, resource-scoped policies,
  composite roles, groups. auth-server has `isSuperuser` + CASL/ability.
- **Admin console** — full UI for user/role/group/client management with self-service
  account console. auth-server is API-only.
- **WebAuthn/Passkey** — built-in support. auth-server does not have this.
- **Community/ecosystem** — huge community, extensive documentation, many third-party
  guides and integrations.

### Migration: auth-server → Keycloak

JWT verification is standard RS256/JWKS, so your consuming services need minimal changes
(just update the JWKS URL). The migration work is on the identity provider side:

1. **Export users** — query `accounts` + `users` tables from PostgreSQL. Map to Keycloak's
   realm import JSON format (`username`, `email`, `enabled`, `credentials`). Password
   hashes are bcrypt (`bcryptjs`) — Keycloak supports bcrypt import via realm JSON.

2. **Create realm** — set up a Keycloak realm matching your auth-server's namespace.

3. **Recreate OAuth2 clients** — for each entry in the `clients` table, create a Keycloak
   client with the same `client_id`, `client_secret`, redirect URIs (from
   `clients_redirects`), and grant types.

4. **Configure identity providers** — set up Google as a built-in OIDC provider. For
   Leader-ID and UNTI/2035, add custom OIDC identity providers with the same
   `CLIENT_ID` / `CLIENT_SECRET` / `CLIENT_REDIRECT` from your `.env`.

5. **Protocol mapper for `isSuperuser`** — add a claim mapper in Keycloak that maps the
   `admin` role (or a custom `superuser` role) to an `isSuperuser: true` JWT claim. This
   keeps the toolkit's `JwtAdminGuard` working without code changes.

6. **Update JWKS URL** — point all consuming services at Keycloak's
   `/.well-known/jwks.json` instead of auth-server's. RS256 is RS256 — tokens verify
   the same way.

7. **Replace event integration** — Keycloak has an admin event listener SPI. Configure an
   HTTP event listener (e.g. `keycloak-event-listener-http`) to send events to event-server,
   or replace event-server's auth-related contracts with Keycloak webhooks.

8. **Decommission** — shut down auth-server once all traffic flows through Keycloak.

### Migration: Keycloak → auth-server

Moving from Keycloak to auth-server gives you a lighter stack, full source control, and
toolkit integration — at the cost of multi-tenancy, LDAP federation, and fine-grained
authorization.

1. **Export Keycloak realm** — use `kc.sh export` or the admin REST API to export the realm
   JSON (users, clients, identity providers, roles).

2. **Import users** — map Keycloak users to the `accounts` table:
   - `username` → `accounts.username` (Keycloak username or email)
   - `enabled` → `accounts.is_activated`
   - `email` → `accounts.username` (auth-server uses email as username)
   - Passwords: Keycloak's default hash is PBKDF2. You have two options:
     - Trigger password reset for all users (simplest, safest)
     - Add a PBKDF2 verifier alongside bcrypt in the login flow (more work)

3. **Recreate OAuth2 clients** — for each Keycloak client, insert a row in `clients` with
   matching `client_id`, `client_secret`, `client_type`, and redirect URIs.

4. **Configure social login** — set up Google via `GOOGLE_CLIENT_ID` etc. For other
   Keycloak identity providers, use the custom OAuth2 strategy (`OAUTH_*` env vars).

5. **Map roles** — Keycloak `admin` / `superadmin` role → set `is_superuser = true` on the
   matching accounts. Other roles are not natively supported (CASL/ability can be extended).

6. **Update JWKS URL** — point services at auth-server's `/.well-known/jwks.json`.

7. **Replace Keycloak events** — subscribe auth-server's event publishing
   (`user.registered`, `password.reset`, etc.) to event-server. If you used Keycloak's
   admin event listener, replace those webhooks with auth-server's event contracts.

8. **Limitations** — if you used Keycloak features that auth-server doesn't have, plan
   alternatives:
   - **LDAP/AD federation** — sync users into PostgreSQL via a script, or run LDAP
     alongside auth-server
   - **SAML providers** — not supported; convert to OIDC or drop
   - **Multi-tenancy (realms)** — run multiple auth-server instances, or add a `tenant_id`
     column (requires toolkit fork — see toolkit's "Changing the Domain Model" guide)
   - **Admin console** — manage users via REST API + Swagger UI
   - **WebAuthn/Passkey** — not available; use password + social login

## AI-Friendly Documentation

This service is designed for AI-assisted development. You can feed context
to any LLM (ChatGPT, Claude, Cursor, Copilot) and get code that follows
all conventions — without reading the entire codebase.

### ai-context.md
Auto-generated structured reference: every controller, route, service,
entity, and DTO. Run `npm run ai-context` to regenerate.

### Swagger UI
Interactive API exploration at `/swagger` — test registration, login,
OAuth flows, password reset. See request/response schemas, copy curl commands.

### ReDoc
Clean, readable documentation at `/redoc` — share with your team.

### Why this matters
An LLM with `ai-context.md` can generate OAuth2 client configurations,
JWT verification code, and social login integrations that match your
existing patterns — without studying the auth-server source code.

## Backend-Only — Bring Your Own Frontend

This service provides OAuth2 authentication, JWT issuance, and social login.
No frontend included, by design.

The auth flow is standard OAuth2 — use any OAuth2 client library:
Passport.js, Auth.js, AppAuth, firebase-auth, or roll your own with
`fetch`. Registration, login, password reset, social callback — all
REST + JSON, documented via Swagger/ReDoc.

You get a production-ready auth system without the pain of building it
yourself.

## Related Services

| Service | Role | Repo |
|---------|------|------|
| api-server | Domain CRUD — verifies JWT from auth-server | [fwmakc/api-server](https://github.com/fwmakc/api-server) |
| event-server | Receives auth events (user.registered, etc.) | [fwmakc/event-server](https://github.com/fwmakc/event-server) |
| message-server | Sends welcome/reset emails triggered by auth events | [fwmakc/message-server](https://github.com/fwmakc/message-server) |
| api-server-toolkit | Shared library (guards, columns, bootstrap) | [fwmakc/api-server-toolkit](https://github.com/fwmakc/api-server-toolkit) |
| gateway-server | Nginx reverse proxy + Docker Compose | [fwmakc/gateway-server](https://github.com/fwmakc/gateway-server) |
| scaffold | Template for new services | [fwmakc/scaffold](https://github.com/fwmakc/scaffold) |

---

## Port Assignments

| Service | Port |
|---------|------|
| **auth-server** | **3001** |
| file-server | 3002 |
| message-server | 3003 |
| chat-server | 3004 |
| event-server | 3005 |
| api-server | 5000 |

---

## Versioning

All services in the fwmakc stack share the same **major version**. Same major = guaranteed compatibility.

| Level | Scope | Example |
|-------|-------|---------|
| **Major** | Shared across ALL services. A breaking change in any service bumps the major for everyone. | toolkit 2.x → 3.0.0 ⟹ all services tag v3.0.0 |
| **Minor** | Independent per service. New features (additive). | auth-server 2.1.0 → 2.2.0 |
| **Patch** | Independent per service. Bug fixes. | event-server 2.0.0 → 2.0.1 |

### What triggers a major bump

A breaking change at any intersection point:

- **api-server-toolkit** — guards, columns, decorators, EntityController, bootstrap, services
- **event-server contracts** — DTO field removed/renamed, required field added
- **Inter-service API** — JWT claim format, `X-Internal-Api-Key` scheme, webhook contract
- **Public API** — any endpoint that another service depends on

### What does NOT trigger a major bump

- Bug fixes, performance improvements
- New features (additive — new optional fields, new endpoints)
- Internal refactoring that doesn't change interfaces

### Alignment process

When a service makes a breaking change (e.g., toolkit 2.x → 3.0.0):

1. The changing service bumps its major and tags the release
2. **All other services** get a stack alignment commit:
   - Bump `version` in `package.json`
   - Add CHANGELOG entry: `chore: stack v3 alignment`
   - Update dependency pins if needed
   - Tag `v3.0.0`
3. All services are now on stack v3

### Current versions

| Service | Version |
|---------|---------|
| [api-server-toolkit](https://github.com/fwmakc/api-server-toolkit) | v2.1.0 |
| [event-server](https://github.com/fwmakc/event-server) | v2.0.0 |
| [auth-server](https://github.com/fwmakc/auth-server) | v2.0.0 |
| [message-server](https://github.com/fwmakc/message-server) | v2.0.0 |
| [file-server](https://github.com/fwmakc/file-server) | v2.0.0 |
| [chat-server](https://github.com/fwmakc/chat-server) | v2.0.0 |
| [api-server](https://github.com/fwmakc/api-server) | v2.0.0 |
| [gateway-server](https://github.com/fwmakc/gateway-server) | v2.0.0 |
| [scaffold](https://github.com/fwmakc/scaffold) | v2.0.0 |
