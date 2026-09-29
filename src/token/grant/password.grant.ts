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
import { Cookie } from "api-server-toolkit";

@Injectable()
export class PasswordGrant {
  constructor(
    private readonly accountService: AccountService,
    private readonly tokenService: TokenService,
    @Inject(forwardRef(() => TwoFactorAccountService))
    private readonly twoFactorAccountService: TwoFactorAccountService,
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
    const account = await this.accountService.login({ username, password });

    // 2FA: no tokens, no id cookie until the second factor is verified
    const challenge = await this.twoFactorAccountService.challenge(account);
    if (challenge) {
      return challenge;
    }

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
    return await this.tokenService.prepare(token, grantsTokenDto.state);
  }
}
