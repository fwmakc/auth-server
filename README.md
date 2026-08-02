# Auth Server

OAuth2 authorization server with partial OIDC support — registration, login, JWT issuance (RS256), social login, and event-driven account lifecycle notifications.

Port **3001**. Part of the microservices split (Stage 2, Issue #6).

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
| GET | `/account` | — | OAuth2 `/authorize` (code + implicit flow) |

**Supported grant types:**

| Grant | Behavior |
|-------|----------|
| `password` | Username/password authentication, issues access + refresh token pair |
| `refresh_token` | Refresh access token (account or client) |
| `authorization_code` | Exchange code for tokens |
| `client_credentials` | Client authentication (client_id/secret) |
| `key` | Passwordless login via hash key (custom, auto-creates account if missing) |

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

## Development

```bash
cp .env.example .env
# Set DB_SYNCHRONIZE=true for dev schema sync
npm install
npm run dev
```

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
