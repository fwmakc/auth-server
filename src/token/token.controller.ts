import { Body, Controller, Delete, ForbiddenException, Param, ParseIntPipe, Post, Req, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CommonDoc, Account, Self } from "api-server-toolkit";
import { Throttle } from "@nestjs/throttler";
import { GrantsTokenDto } from "@src/token/dto/grants.token.dto";
import { GrantsTokenService } from "@src/token/service/grants.token.service";

@ApiTags("Токены")
@Controller("token")
export class TokenController {
  constructor(private readonly grantsTokenService: GrantsTokenService) {}

  @Throttle({ auth: { ttl: 60000, limit: 10 } })
  @Post("/")
  @CommonDoc({
    title: "Базовый метод получения токена",
    models: [GrantsTokenDto],
    queries: [
      {
        name: "grantsTokenDto",
        required: true,
        description: "Объект полей запроса токена",
        type: "[GrantsTokenDto]",
        example: [
          {
            grant_type: "authorization_code",
            client_id: "...",
            redirect_uri: "...",
          },
        ],
      },
    ],
  })
  async token(
    @Body() grantsTokenDto: GrantsTokenDto,
    @Req() request: any,
    @Res({ passthrough: true }) response: any
  ): Promise<any> {
    if (grantsTokenDto.grant_type === "authorization_code") {
      return await this.grantsTokenService.authorizationCode(grantsTokenDto);
    }
    if (grantsTokenDto.grant_type === "client_credentials") {
      return await this.grantsTokenService.clientCredentials(grantsTokenDto);
    }
    if (grantsTokenDto.grant_type === "key") {
      return await this.grantsTokenService.key(
        grantsTokenDto,
        request,
        response
      );
    }
    if (grantsTokenDto.grant_type === "password") {
      return await this.grantsTokenService.password(
        grantsTokenDto,
        request,
        response
      );
    }
    if (grantsTokenDto.grant_type === "refresh_token") {
      return await this.grantsTokenService.refreshToken(grantsTokenDto);
    }
  }

  @Throttle({ auth: { ttl: 60000, limit: 10 } })
  @Post("revoke")
  async revoke(@Body("token") token: string): Promise<any> {
    return await this.grantsTokenService.revoke(token);
  }

  @Account()
  @Delete("revoke/:id")
  async revokeAccount(
    @Param("id", ParseIntPipe) id: number,
    @Self() account: any
  ): Promise<any> {
    if (!account.isSuperuser) {
      throw new ForbiddenException("Only superuser can revoke other accounts");
    }
    return await this.grantsTokenService.revokeAll(id);
  }
}
