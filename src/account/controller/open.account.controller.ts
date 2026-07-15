import { Controller, Get, Req, Res } from "@nestjs/common";
import { OpenAccountService } from "@src/account/service/open.account.service";
import { OpenAccountDto } from "@src/account/dto/open.account.dto";
import { ApiTags } from "@nestjs/swagger";
import { Data } from "@lms/common";
import { CommonDoc } from "@lms/common";
import { Cookie } from "@lms/common";
import { ConfigService } from "@nestjs/config";

@ApiTags("OAuth 2.0")
@Controller("account")
export class OpenAccountController {
  constructor(
    private readonly configService: ConfigService,
    private readonly openAccountService: OpenAccountService
  ) {}

  @Get("")
  @CommonDoc({
    title: "Базовый метод авторизации по протоколу OAuth 2.0",
    models: [OpenAccountDto],
    queries: [
      {
        name: "openAccountDto",
        required: true,
        description: "Объект полей авторизации",
        type: "[OpenAccountDto]",
        example: [
          { response_type: "code", client_id: "...", redirect_uri: "..." },
        ],
      },
    ],
  })
  async openAuth(
    @Data() openAccountDto: OpenAccountDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    const client = await this.openAccountService.verify(openAccountDto);
    const cookie = new Cookie(req, res);
    const idCookie = cookie.get("id");
    if (!idCookie) {
      const url = this.configService.get("FORM_LOGIN");
      const queries = Object.entries(openAccountDto)
        ?.map(([key, value]) => `${key}=${encodeURIComponent(`${value}`)}`)
        ?.join("&");
      return await res.redirect(`${url}?${queries}`);
    }
    if (openAccountDto.response_type === "code") {
      // response_type=code
      // client_id=s6BhdRkqt3
      // state=xyz
      // redirect_uri=https%3A%2F%2Fclient%2Eexample%2Ecom%2Fcb
      const url = await this.openAccountService.code(
        client,
        idCookie,
        openAccountDto.state
      );
      return await res.redirect(url);
    }
    if (openAccountDto.response_type === "token") {
      // response_type=token
      // client_id=s6BhdRkqt3
      // state=xyz
      // redirect_uri=https%3A%2F%2Fclient%2Eexample%2Ecom%2Fcb
      const url = await this.openAccountService.token(
        client,
        idCookie,
        openAccountDto.state
      );
      return await res.redirect(url);
    }
  }
}
