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
import { compare, genSalt, hash } from "bcryptjs";
import { randomBytes } from "crypto";
import { authenticator } from "otplib";
import { Cookie, decrypt, encrypt, IEventClient } from "api-server-toolkit";

import { AccountEntity } from "../account.entity";
import { AccountService } from "../account.service";
import { AccountConfirmService } from "../account_confirm/account_confirm.service";
import { AccountTwoFactorEntity } from "./account_two_factor.entity";
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
    protected readonly configService: ConfigService,
    @Inject(forwardRef(() => AccountService))
    protected readonly accountService: AccountService,
    @Inject(forwardRef(() => AccountConfirmService))
    protected readonly accountConfirmService: AccountConfirmService,
    @Inject(forwardRef(() => TokenService))
    protected readonly tokenService: TokenService,
    @Inject(IEventClient) protected readonly eventClient: IEventClient
  ) {}

  /** Master switch: without it no login is ever challenged. */
  enabled(): boolean {
    return ["true", "1", "yes", "on"].includes(
      String(this.configService.get("TWO_FACTOR_ENABLED")).toLowerCase()
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
      { id: account.id, type: "mfa" },
      "JWT_MFA_EXPIRES",
      "5m"
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
    method: TwoFactorMethod
  ): Promise<{ otpauth?: string; sent?: boolean }> {
    const existing = await this.find(account.id);
    if (existing?.enabled) {
      throw new BadRequestException(
        "Two-factor authentication is already enabled; disable it first"
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
          secret
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
    code: string
  ): Promise<{ recoveryCodes: string[] }> {
    const row = await this.find(account.id);
    if (!row || row.enabled) {
      throw new BadRequestException("No pending two-factor setup");
    }

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

    return { recoveryCodes: recoveryCodes.plain };
  }

  /** Requires the account password — dropping a second factor is sensitive. */
  async disable(account: AccountEntity, password: string): Promise<boolean> {
    await this.accountService.login({ username: account.username, password });
    const row = await this.find(account.id);
    if (row) {
      await this.repository.delete(row.id);
    }
    return true;
  }

  /**
   * Second login step: exchange a short-lived mfa_token + code for tokens.
   */
  async verify(mfaToken: string, code: string, request?: any, response?: any, state?: any): Promise<any> {
    const payload = await this.tokenService.verify(mfaToken, "mfa");
    const account = await this.accountService.findOne({ id: payload.id });
    if (!account?.id) {
      throw new UnauthorizedException("Invalid token or expired!");
    }
    const row = await this.find(account.id);
    if (!row?.enabled) {
      throw new UnauthorizedException("Two-factor authentication is not enabled");
    }
    if (row.lockedUntil && row.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        "Too many failed attempts; try again later"
      );
    }

    const valid =
      (row.method === "totp" && (await this.checkTotp(row, code))) ||
      (row.method === "email" &&
        !!(await this.accountConfirmService.validate(code, "2fa"))) ||
      (await this.consumeRecoveryCode(row, code));

    if (!valid) {
      await this.registerFailure(row);
      throw new UnauthorizedException("Invalid verification code");
    }

    row.failedAttempts = 0;
    row.lockedUntil = null;
    await this.repository.save(row);

    if (response) {
      const cookie = new Cookie(request, response);
      cookie.set("id", account.id);
    }

    const token = await this.tokenService.pair({ id: account.id });
    return await this.tokenService.prepare(token, state);
  }

  private async checkTotp(
    row: AccountTwoFactorEntity,
    code: string
  ): Promise<boolean> {
    const secret = await this.decryptSecret(row.secret);
    if (!secret) {
      return false;
    }
    return authenticator.check(code, secret);
  }

  private async sendCode(account: AccountEntity): Promise<void> {
    const confirm = await this.accountConfirmService.generate(account, "2fa");
    this.eventClient.publish("user.two_factor_code", {
      userId: Number(account.id),
      username: account.username,
      email: account.username,
      code: confirm.code,
    });
  }

  private async upsertPending(
    accountId: number,
    method: TwoFactorMethod,
    secret: { encrypted: string; iv: string } | null
  ): Promise<AccountTwoFactorEntity> {
    const existing = await this.find(accountId);
    const row = existing || this.repository.create({ account: { id: accountId } });
    row.method = method;
    row.secret = secret;
    row.enabled = false;
    row.recoveryCodes = null;
    row.failedAttempts = 0;
    row.lockedUntil = null;
    return await this.repository.save(row);
  }

  private async encryptSecret(
    secret: string
  ): Promise<{ encrypted: string; iv: string }> {
    return (await encrypt(secret)) as { encrypted: string; iv: string };
  }

  private async decryptSecret(
    secret: { encrypted: string; iv: string } | null | undefined
  ): Promise<string | null> {
    if (!secret?.encrypted || !secret?.iv) {
      return null;
    }
    return await decrypt(secret.encrypted, secret.iv);
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
      hashes.push(await hash(code, await genSalt(10)));
    }
    return { plain, hashes };
  }

  private async consumeRecoveryCode(
    row: AccountTwoFactorEntity,
    code: string
  ): Promise<boolean> {
    const codes = row.recoveryCodes || [];
    for (let i = 0; i < codes.length; i++) {
      if (await compare(code, codes[i])) {
        codes.splice(i, 1);
        row.recoveryCodes = codes;
        return true;
      }
    }
    return false;
  }

  private async registerFailure(row: AccountTwoFactorEntity): Promise<void> {
    row.failedAttempts = (row.failedAttempts || 0) + 1;
    if (row.failedAttempts >= MAX_FAILED_ATTEMPTS) {
      row.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      row.failedAttempts = 0;
    }
    await this.repository.save(row);
  }
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
