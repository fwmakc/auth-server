import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
  forwardRef,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { compare, hash } from "@node-rs/bcrypt";
import { randomBytes, randomUUID } from "crypto";
import { authenticator } from "otplib";
import { Cookie, decrypt, encrypt, IEventClient, AuditService } from "api-server-toolkit";

import { AccountEntity } from "../account.entity";
import { AccountService } from "../account.service";
import { AccountConfirmService } from "../account_confirm/account_confirm.service";
import { AccountTwoFactorEntity } from "./account_two_factor.entity";
import { UsedMfaJtiEntity } from "@src/token/store";
import { TokenService } from "@src/token/token.service";

export type TwoFactorMethod = "totp" | "email";

const RECOVERY_CODES_COUNT = 10;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 5;

@Injectable()
export class TwoFactorAccountService {
  constructor(
    @InjectRepository(AccountTwoFactorEntity)
    protected readonly repository: Repository<AccountTwoFactorEntity>,
    @InjectRepository(UsedMfaJtiEntity)
    protected readonly mfaJtiRepository: Repository<UsedMfaJtiEntity>,
    protected readonly configService: ConfigService,
    @Inject(forwardRef(() => AccountService))
    protected readonly accountService: AccountService,
    @Inject(forwardRef(() => AccountConfirmService))
    protected readonly accountConfirmService: AccountConfirmService,
    @Inject(forwardRef(() => TokenService))
    protected readonly tokenService: TokenService,
    @Inject(IEventClient) protected readonly eventClient: IEventClient,
    protected readonly audit: AuditService,
  ) {}

  /** Master switch: without it no login is ever challenged. */
  enabled(): boolean {
    return ["true", "1", "yes", "on"].includes(
      String(this.configService.get("TWO_FACTOR_ENABLED")).toLowerCase(),
    );
  }

  async find(accountId: number): Promise<AccountTwoFactorEntity | null> {
    return await this.repository.findOne({
      where: { account: { id: accountId } },
    });
  }

  async status(account: AccountEntity): Promise<{
    enabled: boolean;
    method?: TwoFactorMethod;
  }> {
    const row = await this.find(account.id);
    return {
      enabled: !!row?.enabled,
      method: row?.enabled ? row.method : undefined,
    };
  }

  /**
   * Called by the password grant after credentials are verified.
   * Returns a challenge instead of tokens when the account has 2FA active.
   */
  async challenge(account: AccountEntity): Promise<{
    twoFactorRequired: true;
    mfa_token: string;
    expires_in: number;
  } | null> {
    if (!this.enabled()) {
      return null;
    }
    const row = await this.find(account.id);
    if (!row?.enabled) {
      return null;
    }
    if (row.method === "email") {
      await this.sendCode(account);
    }
    const mfa = await this.tokenService.one(
      // jti makes the challenge single-use: verify() records it in
      // used_mfa_jti, a second exchange with the same token is rejected.
      { id: account.id, type: "mfa", jti: randomUUID() },
      "JWT_MFA_EXPIRES",
      "5m",
    );
    return {
      twoFactorRequired: true,
      mfa_token: mfa.token,
      expires_in: mfa.expiresIn,
    };
  }

  /** First step: register a pending (not yet enabled) configuration. */
  async setup(
    account: AccountEntity,
    method: TwoFactorMethod,
  ): Promise<{ otpauth?: string; sent?: boolean }> {
    const existing = await this.find(account.id);
    if (existing?.enabled) {
      throw new BadRequestException(
        "Two-factor authentication is already enabled; disable it first",
      );
    }

    if (method === "totp") {
      const secret = authenticator.generateSecret();
      const row = await this.upsertPending(account.id, method, null);
      row.secret = await this.encryptSecret(secret);
      await this.repository.save(row);
      return {
        otpauth: authenticator.keyuri(
          account.username,
          this.configService.get("TWO_FACTOR_ISSUER") || "Auth",
          secret,
        ),
      };
    }

    await this.upsertPending(account.id, method, null);
    await this.sendCode(account);
    return { sent: true };
  }

  /** Second step: verify the first code and activate. */
  async confirmSetup(
    account: AccountEntity,
    code: string,
  ): Promise<{ recoveryCodes: string[] }> {
    const row = await this.find(account.id);
    if (!row || row.enabled) {
      throw new BadRequestException("No pending two-factor setup");
    }

    try {
      if (row.method === "totp") {
        const secret = await this.decryptSecret(row.secret);
        if (!secret || !authenticator.check(code, secret)) {
          throw new BadRequestException("Invalid verification code");
        }
      } else {
        const confirm = await this.accountConfirmService.validate(code, "2fa");
        if (!confirm) {
          throw new BadRequestException("Invalid verification code");
        }
      }

      const recoveryCodes = await this.generateRecoveryCodes();
      row.enabled = true;
      row.recoveryCodes = recoveryCodes.hashes;
      row.failedAttempts = 0;
      row.lockedUntil = null;
      await this.repository.save(row);

      this.audit.log({
        action: "auth.2fa.enabled",
        accountId: Number(account.id),
        accountUsername: account.username,
        details: { method: row.method },
      });
      return { recoveryCodes: recoveryCodes.plain };
    } catch (e) {
      this.audit.log({
        action: "auth.2fa.enabled",
        outcome: "failure",
        accountId: Number(account.id),
        accountUsername: account.username,
        details: { method: row.method, reason: e?.message },
      });
      throw e;
    }
  }

  /** Requires the account password — dropping a second factor is sensitive. */
  async disable(account: AccountEntity, password: string): Promise<boolean> {
    try {
      await this.accountService.login({ username: account.username, password });
    } catch (e) {
      this.audit.log({
        action: "auth.2fa.disabled",
        outcome: "failure",
        accountId: Number(account.id),
        accountUsername: account.username,
        details: { reason: e?.message },
      });
      throw e;
    }
    const row = await this.find(account.id);
    if (row) {
      await this.repository.delete(row.id);
    }
    this.audit.log({
      action: "auth.2fa.disabled",
      accountId: Number(account.id),
      accountUsername: account.username,
    });
    return true;
  }

  /**
   * Second login step: exchange a short-lived mfa_token + code for tokens.
   */
  async verify(
    mfaToken: string,
    code: string,
    request?: any,
    response?: any,
    state?: any,
  ): Promise<any> {
    const payload = await this.tokenService.verify(mfaToken, "mfa");
    const account = await this.accountService.findOne({ id: payload.id });
    if (!account?.id) {
      throw new UnauthorizedException("Invalid token or expired!");
    }
    const row = await this.find(account.id);
    if (!row?.enabled) {
      throw new UnauthorizedException(
        "Two-factor authentication is not enabled",
      );
    }
    if (row.lockedUntil && utcFromNaive(row.lockedUntil) > new Date()) {
      this.audit.log({
        action: "auth.2fa.locked",
        outcome: "failure",
        accountId: Number(account.id),
        accountUsername: account.username,
        details: { reason: "attempt while locked" },
      });
      throw new UnauthorizedException(
        "Too many failed attempts; try again later",
      );
    }

    let recoveryUsed = false;
    const valid =
      (row.method === "totp" && (await this.checkTotp(row, code))) ||
      (row.method === "email" &&
        !!(await this.accountConfirmService.validate(code, "2fa"))) ||
      (recoveryUsed = await this.consumeRecoveryCode(row, code));

    if (!valid) {
      const { failedAttempts, locked } = await this.registerFailure(row);
      this.audit.log({
        action: "auth.2fa.challenge_failed",
        outcome: "failure",
        accountId: Number(account.id),
        accountUsername: account.username,
        details: {
          method: row.method,
          failedAttempts,
        },
      });
      if (locked) {
        this.audit.log({
          action: "auth.2fa.locked",
          outcome: "failure",
          accountId: Number(account.id),
          accountUsername: account.username,
          details: {
            reason: `${MAX_FAILED_ATTEMPTS} failed attempts`,
            lockedMinutes: LOCK_MINUTES,
          },
        });
      }
      throw new UnauthorizedException("Invalid verification code");
    }

    // Partial update on purpose: saving the whole row would write back the
    // in-memory recoveryCodes snapshot and resurrect a code consumed
    // atomically in the DB (possibly by a concurrent challenge).
    await this.repository.update(row.id, {
      failedAttempts: 0,
      lockedUntil: null,
    });

    // Single-use challenge: record the jti atomically. Empty returning =
    // this challenge was already exchanged — replay gets the same response
    // as a wrong code (no oracle for "the code was right the first time").
    if (payload.jti) {
      const recorded = await this.mfaJtiRepository
        .createQueryBuilder()
        .insert()
        .into(UsedMfaJtiEntity)
        .values({ jti: payload.jti })
        .orIgnore()
        .returning("id")
        .execute();
      if (recorded.raw.length === 0) {
        throw new UnauthorizedException("Invalid verification code");
      }
    }

    if (recoveryUsed) {
      this.audit.log({
        action: "auth.2fa.recovery_used",
        accountId: Number(account.id),
        accountUsername: account.username,
      });
    }

    if (response) {
      const cookie = new Cookie(request, response);
      cookie.set("id", account.id);
    }

    const token = await this.tokenService.pair({ id: account.id });
    this.audit.log({
      action: "auth.login.success",
      accountId: Number(account.id),
      accountUsername: account.username,
      ip: request?.ip,
      userAgent: request?.headers?.["user-agent"],
      details: { method: "2fa" },
    });
    return await this.tokenService.prepare(token, state);
  }

  private async checkTotp(
    row: AccountTwoFactorEntity,
    code: string,
  ): Promise<boolean> {
    const secret = await this.decryptSecret(row.secret);
    if (!secret) {
      return false;
    }
    return authenticator.check(code, secret);
  }

  private async sendCode(account: AccountEntity): Promise<void> {
    const confirm = await this.accountConfirmService.generate(account, "2fa");
    await this.eventClient.publish("user.two_factor_code", {
      userId: Number(account.id),
      username: account.username,
      email: account.username,
      code: confirm.code,
    });
  }

  private async upsertPending(
    accountId: number,
    method: TwoFactorMethod,
    secret: { encrypted: string; iv: string } | null,
  ): Promise<AccountTwoFactorEntity> {
    const existing = await this.find(accountId);
    const row =
      existing || this.repository.create({ account: { id: accountId } });
    row.method = method;
    row.secret = secret;
    row.enabled = false;
    row.recoveryCodes = null;
    row.failedAttempts = 0;
    row.lockedUntil = null;
    return await this.repository.save(row);
  }

  private async encryptSecret(
    secret: string,
  ): Promise<{ v?: number; encrypted: string; iv: string }> {
    return (await encrypt(secret)) as { v?: number; encrypted: string; iv: string };
  }

  private async decryptSecret(
    secret: { v?: number; encrypted: string; iv: string } | null | undefined,
  ): Promise<string | null> {
    if (!secret?.encrypted || !secret?.iv) {
      return null;
    }
    return await decrypt(secret.encrypted, secret.iv, secret.v);
  }

  private async generateRecoveryCodes(): Promise<{
    plain: string[];
    hashes: string[];
  }> {
    const plain: string[] = [];
    const hashes: string[] = [];
    for (let i = 0; i < RECOVERY_CODES_COUNT; i++) {
      const code = `${randomBlock()}-${randomBlock()}`;
      plain.push(code);
      hashes.push(await hash(code, 10));
    }
    return { plain, hashes };
  }

  /**
   * Atomic recovery-code consumption: the matched hash is removed by the
   * UPDATE itself (jsonb containment in WHERE, array rebuilt without the
   * hash). Two concurrent challenges of the same code race on that WHERE —
   * exactly one UPDATE returns a row; the loser sees none and the code
   * counts as used (no double-spend).
   */
  private async consumeRecoveryCode(
    row: AccountTwoFactorEntity,
    code: string,
  ): Promise<boolean> {
    const codes = row.recoveryCodes || [];
    for (const hashValue of codes) {
      if (!(await compare(code, hashValue))) continue;
      const result = await this.repository.query(
        `UPDATE account_two_factor
         SET recovery_codes = (
           SELECT COALESCE(json_agg(e), '[]'::json)
           FROM json_array_elements(recovery_codes) AS e
           WHERE e::text <> to_jsonb($1::text)::text
         )
         WHERE id = $2 AND recovery_codes::jsonb @> to_jsonb($1::text)
         RETURNING id`,
        [hashValue, row.id],
      );
      if (result?.length > 0) {
        row.recoveryCodes = codes.filter((c) => c !== hashValue);
        return true;
      }
      return false;
    }
    return false;
  }

  /**
   * Atomic failure counter: concurrent attempts (parallel requests or
   * replicas) must each land their increment, otherwise the lockout
   * threshold silently weakens. A single UPDATE decides both the
   * increment and the lock transition, so no read-modify-write race.
   */
  private async registerFailure(
    row: AccountTwoFactorEntity,
  ): Promise<{ failedAttempts: number; locked: boolean }> {
    const result = await this.repository
      .createQueryBuilder()
      .update(AccountTwoFactorEntity)
      .set({
        failedAttempts: () =>
          `CASE WHEN COALESCE(failed_attempts, 0) + 1 >= ${MAX_FAILED_ATTEMPTS} ` +
          `THEN 0 ELSE COALESCE(failed_attempts, 0) + 1 END`,
        lockedUntil: () =>
          `CASE WHEN COALESCE(failed_attempts, 0) + 1 >= ${MAX_FAILED_ATTEMPTS} ` +
          `THEN NOW() + INTERVAL '${LOCK_MINUTES} minutes' ELSE locked_until END`,
      })
      .where("id = :id", { id: row.id })
      // returning() resolves property paths; raw rows use database names.
      .returning(["failedAttempts", "lockedUntil"])
      .execute();
    const updated = result?.raw?.[0] as
      | { failed_attempts: number; locked_until: Date | null }
      | undefined;
    const lockedUntil = updated?.locked_until
      ? utcFromNaive(new Date(updated.locked_until))
      : null;
    return {
      failedAttempts: Number(updated?.failed_attempts ?? 0),
      locked: !!lockedUntil && lockedUntil > new Date(),
    };
  }
}

// DateColumn stores naive UTC wallclock; the pg driver parses it as local
// time, so re-anchor by the host offset before any comparison (TZ-safe).
// UTC+3 example: wallclock 18:31 parsed as local -> epoch 15:31Z; offset is
// -180 min, so epoch - offset restores 18:31Z.
function utcFromNaive(date: Date): Date {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
}

function randomBlock(): string {
  // 4 chars from a 32-symbol alphabet — no ambiguous 0/O/1/I
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (const byte of randomBytes(4)) {
    out += alphabet[byte % alphabet.length];
  }
  return out;
}
