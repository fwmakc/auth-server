import {
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  ParseIntPipe,
  UseGuards,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { AccountService } from "./account.service";

@ApiExcludeController()
@Controller("account/internal")
export class InternalAccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly configService: ConfigService
  ) {}

  @Get("info/:id")
  async getInfo(
    @Param("id", ParseIntPipe) id: number,
    @Headers("x-internal-key") internalKey: string
  ) {
    const expectedKey = this.configService.get("INTERNAL_API_KEY");
    if (!expectedKey || internalKey !== expectedKey) {
      throw new NotFoundException();
    }

    const account = await this.accountService.findOne({ id });
    if (!account?.id) {
      throw new NotFoundException();
    }

    return {
      id: account.id,
      username: account.username,
      isActivated: account.isActivated,
      isSuperuser: account.isSuperuser,
    };
  }
}
