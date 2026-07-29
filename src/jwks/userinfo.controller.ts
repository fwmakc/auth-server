import { Controller, Get, Req } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Account } from "api-server-toolkit";
import { JwksService } from "@src/jwks/jwks.service";

@ApiTags("OIDC")
@ApiBearerAuth()
@Controller()
export class UserinfoController {
  constructor(private readonly jwksService: JwksService) {}

  @Get("userinfo")
  @Account()
  async getUserinfo(@Req() req: any) {
    return this.jwksService.getUserinfo(req.user.id);
  }
}
