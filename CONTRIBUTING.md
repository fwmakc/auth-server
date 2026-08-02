# Contributing to auth-server

Thanks for your interest in contributing! This service is part of the
[fwmakc microservices stack](https://github.com/fwmakc/gateway-server).

## Prerequisites

- **Node.js** 20+ (`node -v`)
- **npm** 10+
- **PostgreSQL** 14+ (or use Docker: `docker compose up -d postgres`)
- **RSA key pair** for JWT signing (auto-generated in dev if not provided)

## Development Setup

```bash
git clone https://github.com/fwmakc/auth-server.git
cd auth-server
cp .env.example .env
# Set DB_SYNCHRONIZE=true for dev schema sync
npm install
npm run dev
```

Service runs on port **3001**. Swagger UI at `http://localhost:3001/swagger`.

## Testing

```bash
npm test
```

5 test suites, 41 tests. Tests use real PostgreSQL with `dropSchema: true` +
`synchronize: true`. Tests cover: smoke, token, auth-flows (registration,
confirmation, reset), access-control.

## Code Style

- TypeScript with strict type checking
- NestJS conventions (modules, controllers, services, DTOs)
- Use toolkit columns (`IdColumn`, `VarcharColumn`, etc.) — not native TypeORM decorators
- Use toolkit guards (`@Account()`, `accessGuard`) for auth
- See `AGENTS.md` for detailed conventions

## Pull Request Process

1. Fork the repo, create a branch from `master`
2. Make your changes
3. Ensure tests pass: `npm test`
4. Ensure TypeScript compiles: `npm run build`
5. Create a pull request with a clear description
