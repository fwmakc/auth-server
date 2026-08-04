import {
  Controller,
  Get,
  Header,
  Headers,
  NotFoundException,
  Param,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "crypto";
import { AccountService } from "./account.service";

@ApiExcludeController()
@Controller("account/internal")
export class InternalAccountController {
  private readonly cacheTtl: number;

  constructor(
    private readonly accountService: AccountService,
    private readonly configService: ConfigService
  ) {
    this.cacheTtl = Number(this.configService.get("INTERNAL_INFO_CACHE_TTL")) || 30;
  }

  private verifyInternalKey(provided: string): boolean {
    const expected = this.configService.get("INTERNAL_API_KEY");
    if (!expected || !provided) return false;
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  @Get("info/:id")
  @Header("Cache-Control", `max-age=30`)
  async getInfo(
    @Param("id", ParseIntPipe) id: number,
    @Headers("x-internal-api-key") internalKey: string
  ) {
    if (!this.verifyInternalKey(internalKey)) {
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
