import {
  Inject,
  Injectable,
  BadRequestException,
  forwardRef,
} from "@nestjs/common";
import { AccountService } from "@src/account/account.service";
import { TwoFactorAccountService } from "@src/account/account_two_factor/two_factor.account.service";
import { GrantsTokenDto } from "@src/token/dto/grants.token.dto";
import { TokenService } from "@src/token/token.service";
import { AuditService, Cookie, IEventClient } from "api-server-toolkit";

@Injectable()
export class PasswordGrant {
  constructor(
    private readonly accountService: AccountService,
    private readonly tokenService: TokenService,
    @Inject(forwardRef(() => TwoFactorAccountService))
    private readonly twoFactorAccountService: TwoFactorAccountService,
    private readonly audit: AuditService,
    @Inject(IEventClient) private readonly eventClient: IEventClient,
  ) {}

  async password(
    grantsTokenDto: GrantsTokenDto,
    request,
    response,
  ): Promise<any> {
    if (grantsTokenDto.grant_type !== "password") {
      throw new BadRequestException(
        "Specified type of grant_type field is not supported in this request",
        "unsupported_grant_type",
      );
    }
    if (!grantsTokenDto.username || !grantsTokenDto.password) {
      throw new BadRequestException(
        "Not specified username or password in this request",
        "invalid_grant",
      );
    }
    const { username, password } = grantsTokenDto;
    const meta = {
      ip: request?.ip,
      userAgent: request?.headers?.["user-agent"],
    };
    let account;
    try {
      account = await this.accountService.login({ username, password });
    } catch (e) {
      this.audit.log({
        action: "auth.login.failed",
        outcome: "failure",
        accountUsername: username,
        ...meta,
        details: { reason: e?.message },
      });
      throw e;
    }

    // 2FA: no tokens, no id cookie until the second factor is verified
    const challenge = await this.twoFactorAccountService.challenge(account);
    if (challenge) {
      this.audit.log({
        action: "auth.2fa.challenge",
        accountId: Number(account.id),
        accountUsername: account.username,
        ...meta,
      });
      return challenge;
    }

    try {
      const token = await this.tokenService.pair({ id: account.id });
      if (!token) {
        throw new BadRequestException(
          "User authentication failed. Unknown user",
          "invalid_user",
        );
      }
      // if (request) {
      //   await this.accountSessionsService.start(account, request);
      // }
      if (response) {
        const cookie = new Cookie(request, response);
        cookie.set("id", account.id);
      }
      this.audit.log({
        action: "auth.login.success",
        accountId: Number(account.id),
        accountUsername: account.username,
        ...meta,
      });
      this.eventClient.publish("user.login", {
        userId: Number(account.id),
        username: account.username,
        email: account.username,
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      return await this.tokenService.prepare(token, grantsTokenDto.state);
    } catch (e) {
      this.audit.log({
        action: "auth.login.failed",
        outcome: "failure",
        accountId: Number(account.id),
        accountUsername: account.username,
        ...meta,
        details: { reason: e?.message },
      });
      throw e;
    }
  }
}
