/**
 * Wiring check (Wave 6, stage 2): boots the REAL AppModule (real entities,
 * real boot migrations through runMigrationsUnderLock, real DI graph) against
 * a fresh throwaway database, then probes one real write per critical
 * subsystem. Runs under ts-node — the production module system, no jest
 * runtime — because jest's module registry races with pg's lazy native
 * getter here (module exports end up emptied mid-boot; jest-only artifact,
 * does not happen in real node boots).
 *
 * Usage: npm run test:wiring   (requires postgres on 127.0.0.1:5432 root/1234)
 * Exit code 0 = all probes green.
 */
process.env.DB_TYPE = "postgres";
process.env.DB_HOST = "127.0.0.1";
process.env.DB_PORT = process.env.DB_PORT || "5432";
process.env.DB_USER = "root";
process.env.DB_PASSWORD = process.env.DB_PASSWORD || "1234";
process.env.DB_NAME = "auth_server_wiring_test";
// Instant connection-refused instead of a hanging webhook: audit/event
// publishes are fire-and-forget (.catch → log) and must not fail the probes.
process.env.EVENT_SERVER_URL = "http://127.0.0.1:9";
// Throttler counters stay in memory; no Redis dependency in the wiring check.
process.env.THROTTLE_STORAGE = "memory";
// verify() does not consult the master switch, but keep login probes simple.
process.env.TWO_FACTOR_ENABLED = "false";
// OAuth strategy providers construct unconditionally and demand credentials
// (passport-oauth2 throws without clientID); dummies keep the boot intact.
process.env.OAUTH_CLIENT_ID = "wiring-dummy";
process.env.OAUTH_CLIENT_SECRET = "wiring-dummy";
process.env.GOOGLE_CLIENT_ID = "wiring-dummy";
process.env.GOOGLE_CLIENT_SECRET = "wiring-dummy";
process.env.LEADER_CLIENT_ID = "wiring-dummy";
process.env.LEADER_CLIENT_SECRET = "wiring-dummy";
process.env.UNTI_CLIENT_ID = "wiring-dummy";
process.env.UNTI_CLIENT_SECRET = "wiring-dummy";

import { Client } from "pg";
import { hash } from "@node-rs/bcrypt";
import { randomUUID } from "crypto";
import { DataSource } from "typeorm";
import { UnauthorizedException } from "@nestjs/common";

const WIRING_DB = "auth_server_wiring_test";

let passed = 0;
let failed = 0;

function ok(label: string, cond: boolean, extra?: string): void {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}${extra ? ` — ${extra}` : ""}`);
  }
}

async function recreateDatabase(): Promise<void> {
  const client = new Client({
    host: "127.0.0.1",
    port: Number(process.env.DB_PORT || 5432),
    user: "root",
    password: process.env.DB_PASSWORD || "1234",
    database: "postgres",
  });
  await client.connect();
  await client.query(`DROP DATABASE IF EXISTS ${WIRING_DB} WITH (FORCE)`);
  await client.query(`CREATE DATABASE ${WIRING_DB}`);
  await client.end();
}

async function main(): Promise<void> {
  console.log("Wiring check — auth-server real boot");
  await recreateDatabase();

  // Must run before TypeORM initializes, same as src/main.ts: boot migrations
  // (migrationsRun) touch the patched EntityManager during initialize().
  const { initializeTransactionalContext } = await import("typeorm-transactional");
  initializeTransactionalContext();

  const { AppModule } = await import("../src/app.module");
  const { NestFactory } = await import("@nestjs/core");
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const dataSource = app.get(DataSource);
  console.log("  ✓ AppModule booted (real DI graph, boot migrations ran)");

  const { AccountEntity } = await import("../src/account/account.entity");
  const { AccountService } = await import("../src/account/account.service");
  const { AccountConfirmService } = await import(
    "../src/account/account_confirm/account_confirm.service"
  );
  const { TwoFactorAccountService } = await import(
    "../src/account/account_two_factor/two_factor.account.service"
  );
  const { AccountTwoFactorEntity } = await import(
    "../src/account/account_two_factor/account_two_factor.entity"
  );
  const { TokenService } = await import("../src/token/token.service");

  // ── Schema: migrations actually applied ──
  const migrations: any[] = await dataSource.query(
    "SELECT count(*)::int AS n FROM migrations_typeorm",
  );
  ok("boot migrations applied", migrations[0].n > 0, `count=${migrations[0].n}`);

  // ── Probe: accounts ──
  console.log("probe: accounts");
  const accountRepo = dataSource.getRepository(AccountEntity);
  const wiringAccount = await accountRepo.save(
    accountRepo.create({
      username: "wiring@test",
      password: await hash("wiring-password-1", 10),
      isActivated: true,
    }),
  );
  const found = await accountRepo.findOne({ where: { id: wiringAccount.id } });
  ok("entity round-trip matches migrated schema", found?.username === "wiring@test");

  const accountService = app.get(AccountService);
  const logged = await accountService.login({
    username: "wiring@test",
    password: "wiring-password-1",
  } as any);
  ok("AccountService.login validates bcrypt against real row",
    Number(logged.id) === Number(wiringAccount.id));
  const badLogin = await accountService
    .login({ username: "wiring@test", password: "wrong" } as any)
    .then(() => null)
    .catch((e: unknown) => e);
  ok("wrong password → 401", badLogin instanceof UnauthorizedException);

  // ── Probe: account_confirm atomic consume (raw DELETE...RETURNING seam) ──
  console.log("probe: account_confirm atomic consume");
  const confirmService = app.get(AccountConfirmService);
  const confirmAccount = await accountRepo.save(
    accountRepo.create({
      username: "confirm@test",
      password: await hash("x", 10),
      isActivated: false,
    }),
  );
  const created = await confirmService.generate(confirmAccount, "confirm");
  ok("generate() issues a 6-digit code", /^\d{6}$/.test(String(created?.code)));

  const consumed = await confirmService.validate(created.code, "confirm");
  ok("validate() claims the row and hydrates the account",
    !!consumed && Number(consumed.account?.id) === Number(confirmAccount.id));

  const replay = await confirmService.validate(created.code, "confirm");
  ok("replay of a consumed code returns null", replay === null);

  const staleRow = await confirmService.generate(confirmAccount, "reset");
  await dataSource.query(
    "UPDATE account_confirm SET created_at = NOW() - INTERVAL '2 hours' WHERE id = $1",
    [staleRow.id],
  );
  const stale = await confirmService.validate(staleRow.code, "reset");
  ok("stale code past TTL never validates", stale === null);

  // ── Probe: 2FA lockout (naive-UTC timestamp round-trip) ──
  console.log("probe: 2FA lockout (naive-UTC round-trip)");
  const lockedAccount = await accountRepo.save(
    accountRepo.create({
      username: "locked@test",
      password: await hash("x", 10),
      isActivated: true,
    }),
  );
  const twoFactorRepo = dataSource.getRepository(AccountTwoFactorEntity);
  // email method: verify() consults account_confirm (no TOTP secret
  // encryption involved), and any 6-digit submission is a wrong code.
  await twoFactorRepo.save(
    twoFactorRepo.create({
      account: { id: lockedAccount.id },
      method: "email",
      enabled: true,
      secret: null,
      recoveryCodes: [],
      failedAttempts: 0,
      lockedUntil: null,
    }),
  );

  const tokenService = app.get(TokenService);
  const twoFactorService = app.get(TwoFactorAccountService);
  const mfa = await tokenService.one(
    { id: Number(lockedAccount.id), type: "mfa", jti: randomUUID() },
    "JWT_MFA_EXPIRES",
    "5m",
  );

  let wrongRejections = 0;
  for (let i = 0; i < 5; i++) {
    try {
      await twoFactorService.verify(mfa.token, "000000");
    } catch (e) {
      if (e instanceof UnauthorizedException) wrongRejections++;
    }
  }
  ok("five wrong codes rejected as invalid", wrongRejections === 5);

  const stored = await twoFactorRepo.findOne({
    where: { account: { id: lockedAccount.id } },
  });
  // The lock counter resets to 0 on the locking attempt; the lock itself is
  // carried by locked_until (NOW() + 5 minutes in SQL).
  ok("registerFailure reset the counter and set locked_until in real PG",
    Number(stored?.failedAttempts) === 0 && !!stored?.lockedUntil,
    `attempts=${stored?.failedAttempts} lockedUntil=${stored?.lockedUntil}`);

  const lockedError = await twoFactorService
    .verify(mfa.token, "000000")
    .then(() => null)
    .catch((e: unknown) => e);
  ok("sixth attempt rejected while locked (naive-UTC re-anchor)",
    lockedError instanceof UnauthorizedException &&
      /Too many failed attempts/.test(lockedError.message),
    String(lockedError));

  await app.close();

  console.log(`\nWiring: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Wiring check crashed:", e);
  process.exit(1);
});
