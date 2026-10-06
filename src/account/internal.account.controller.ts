import {
  Controller,
  Get,
  Header,
  Headers,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
} from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { timingSafeEqual } from "crypto";
import { AccountService } from "./account.service";

@ApiExcludeController()
@Controller("account/internal")
export class InternalAccountController {
  constructor(
    private readonly accountService: AccountService,
    private readonly configService: ConfigService,
  ) {}

  // Local check (not the toolkit InternalAuthGuard) on purpose: this route
  // masks a bad key as 404 so probes can't distinguish "no route" from "no
  // access" — an e2e test pins that. Same rotation window as the guard:
  // INTERNAL_API_KEY_PREVIOUS (comma-separated) stays valid while callers
  // switch to the new key (docs/secret-rotation.md).
  private verifyInternalKey(provided: string): boolean {
    if (!provided) return false;
    const current = this.configService.get("INTERNAL_API_KEY");
    const previous = (this.configService.get("INTERNAL_API_KEY_PREVIOUS") || "")
      .split(",")
      .map((key) => key.trim())
      .filter(Boolean);
    return [current, ...previous].filter(Boolean).some((expected) => {
      const a = Buffer.from(provided);
      const b = Buffer.from(expected);
      return a.length === b.length && timingSafeEqual(a, b);
    });
  }

  @Get("info/:id")
  @Header("Cache-Control", `max-age=30`)
  async getInfo(
    @Param("id", ParseIntPipe) id: number,
    @Headers("x-internal-api-key") internalKey: string,
  ) {
    if (!this.verifyInternalKey(internalKey)) {
      throw new NotFoundException();
    }

    const account = await this.accountService.findOne({
      id,
      relations: [{ name: "accountRoles.role" }],
    });
    if (!account?.id) {
      throw new NotFoundException();
    }

    return {
      id: account.id,
      username: account.username,
      isActivated: account.isActivated,
      isSuperuser: account.isSuperuser,
      roles: account.roles,
      roleEntries: account.roleEntries,
    };
  }

  // Курсорная страница аккаунтов для бэкфилла accounts-зеркала в
  // api-server (scripts/backfill-accounts.ts): id/username/isActivated —
  // минимальный срез, без ролей и без хешей паролей.
  @Get("list")
  async list(
    @Query("after") after: string,
    @Query("limit") limit: string,
    @Headers("x-internal-api-key") internalKey: string,
  ) {
    if (!this.verifyInternalKey(internalKey)) {
      throw new NotFoundException();
    }

    const afterId = Number.parseInt(after ?? "", 10) || 0;
    const take = Math.min(
      Math.max(Number.parseInt(limit ?? "", 10) || 500, 1),
      1000,
    );

    const rows = await this.accountService.listAfter(afterId, take);

    return {
      items: rows.map((row) => ({
        id: Number(row.id),
        username: row.username,
        isActivated: row.isActivated,
      })),
    };
  }
}
