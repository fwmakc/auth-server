import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Account, Self } from "api-server-toolkit";
import { AccountEntity } from "../account.entity";
import { TwoFactorAccountService } from "./two_factor.account.service";
import {
  TwoFactorCodeDto,
  TwoFactorDisableDto,
  TwoFactorSetupDto,
  TwoFactorVerifyDto,
} from "./two_factor.account.dto";

@ApiTags("Двухфакторная аутентификация")
@Controller("account/methods/2fa")
export class TwoFactorAccountController {
  constructor(
    private readonly twoFactorAccountService: TwoFactorAccountService,
  ) {}

  @Account()
  @Get("status")
  async status(@Self() account: AccountEntity) {
    return await this.twoFactorAccountService.status(account);
  }

  @Account()
  @Throttle({ auth: { ttl: 60000, limit: 5 } })
  @Post("setup")
  async setup(@Self() account: AccountEntity, @Body() dto: TwoFactorSetupDto) {
    return await this.twoFactorAccountService.setup(account, dto.method);
  }

  @Account()
  @Throttle({ auth: { ttl: 60000, limit: 5 } })
  @Post("setup/confirm")
  async confirmSetup(
    @Self() account: AccountEntity,
    @Body() dto: TwoFactorCodeDto,
  ) {
    return await this.twoFactorAccountService.confirmSetup(account, dto.code);
  }

  @Account()
  @Throttle({ auth: { ttl: 60000, limit: 5 } })
  @Post("disable")
  async disable(
    @Self() account: AccountEntity,
    @Body() dto: TwoFactorDisableDto,
  ) {
    return {
      success: await this.twoFactorAccountService.disable(
        account,
        dto.password,
      ),
    };
  }

  @Throttle({ auth: { ttl: 60000, limit: 5 } })
  @Post("verify")
  async verify(
    @Body() dto: TwoFactorVerifyDto,
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    const token = await this.twoFactorAccountService.verify(
      dto.mfa_token,
      dto.code,
      req,
      res,
      dto.state,
    );
    return { success: true, ...token };
  }
}
