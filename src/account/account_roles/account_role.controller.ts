import {
  Controller,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  Body,
  Req,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Access } from "api-server-toolkit";
import { AccessRule } from "api-server-toolkit";
import { AccountRolesService } from "./account_role.service";
import { AccountRoleAssignmentDto } from "./account_role.dto";

const SUPERUSER: AccessRule[] = [{ who: ["superuser"] }];

@ApiTags("account-roles")
@Controller("account/:accountId/roles")
export class AccountRoleAssignmentController {
  constructor(private readonly accountRolesService: AccountRolesService) {}

  @Access(SUPERUSER)
  @Post()
  async assign(
    @Param("accountId", ParseIntPipe) accountId: number,
    @Body() dto: AccountRoleAssignmentDto,
    @Req() req: any,
  ): Promise<void> {
    await this.accountRolesService.assign(accountId, dto, req?.user);
  }

  @Access(SUPERUSER)
  @Delete()
  async remove(
    @Param("accountId", ParseIntPipe) accountId: number,
  ): Promise<boolean> {
    await this.accountRolesService.removeByAccount(accountId);
    return true;
  }
}
