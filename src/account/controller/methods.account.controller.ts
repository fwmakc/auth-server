import { Body, Controller, Get, Param, Post, Req, Res } from "@nestjs/common";
import { AccountDto } from "@src/account/account.dto";
import { ApiTags } from "@nestjs/swagger";
import { Account } from "@lms/common";
import { MethodsAccountService } from "@src/account/service/methods.account.service";
import { GrantsTokenDto } from "@src/token/dto/grants.token.dto";

@ApiTags("Авторизация")
@Controller("account/methods")
export class MethodsAccountController {
  constructor(private readonly methodsAccountService: MethodsAccountService) {}

  @Post("change/:code")
  async change(
    @Body() accountDto: AccountDto,
    @Param("code") code: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    return await this.methodsAccountService.change(accountDto, code, req, res);
  }

  @Get("confirm/:code")
  async confirm(
    @Param("code") code: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    return await this.methodsAccountService.confirm(code, req, res);
  }

  @Post("login")
  async login(
    @Body() grantsTokenDto: GrantsTokenDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    return await this.methodsAccountService.login(grantsTokenDto, req, res);
  }

  @Account()
  @Post("logout")
  async logout(@Req() req: any, @Res({ passthrough: true }) res: any) {
    return await this.methodsAccountService.logout(req, res);
  }

  @Post("register")
  async register(
    @Body() accountDto: AccountDto,
    @Body("subject") subject: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    return await this.methodsAccountService.register(
      accountDto,
      subject,
      req,
      res
    );
  }

  @Post("reset")
  async reset(
    @Body() accountDto: AccountDto,
    @Body("subject") subject: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: any
  ) {
    return await this.methodsAccountService.reset(
      accountDto,
      subject,
      req,
      res
    );
  }

  @Post("hash/:string")
  async hash(@Param("string") string: string) {
    return await this.methodsAccountService.hash(string);
  }
}
