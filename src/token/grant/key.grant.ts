import { Injectable, BadRequestException } from "@nestjs/common";
import { AccountService } from "@src/account/account.service";
import { GrantsTokenDto } from "@src/token/dto/grants.token.dto";
import { TokenService } from "@src/token/token.service";
import { Cookie } from "@core/common";
import { UsersService } from "@src/db/users/users.service";

// мы делаем жесткое привязывание к сущности обучаемых только для того,
// чтобы работала обратная совместимость с беспарольным доступом

@Injectable()
export class KeyGrant {
  constructor(
    private readonly accountService: AccountService,
    private readonly tokenService: TokenService,
    private readonly usersService: UsersService
  ) {}

  async key(grantsTokenDto: GrantsTokenDto, request, response): Promise<any> {
    if (grantsTokenDto.grant_type !== "key") {
      throw new BadRequestException(
        "Specified type of grant_type field is not supported in this request",
        "unsupported_grant_type"
      );
    }
    if (!grantsTokenDto.key) {
      throw new BadRequestException(
        "Not specified key in this request",
        "invalid_grant"
      );
    }
    const { key } = grantsTokenDto;
    const user = await this.usersService.findByHash(key);
    if (!user) {
      throw new BadRequestException(
        "User authentication failed. Unknown user",
        "invalid_user"
      );
    }

    let account = await this.accountService.findByUsername(user.email);
    if (!account) {
      account = await this.accountService.create({ username: user.email });
      if (!account) {
        throw new BadRequestException(
          "User authentication failed. Unknown account",
          "invalid_user"
        );
      }
    }

    if (!user?.["account_id"]) {
      await this.usersService.linkToAuth(user.id, account.id);
    }

    const token = await this.tokenService.pair({ id: account.id, key: true });
    if (!token) {
      throw new BadRequestException(
        "User authentication failed. Unknown user",
        "invalid_user"
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
