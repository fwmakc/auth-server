import {
  Controller,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  Body,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Account, Self, Roles } from "api-server-toolkit";
import { AccountInfo } from "api-server-toolkit";
import { AccountRolesService } from "./account_role.service";
import { AccountRoleAssignmentDto } from "./account_role.dto";

@ApiTags("account-roles")
@Controller("account/:accountId/roles")
export class AccountRoleAssignmentController {
  constructor(private readonly accountRolesService: AccountRolesService) {}

  @Account()
  @Roles("superuser")
  @Post()
  async assign(
    @Param("accountId", ParseIntPipe) accountId: number,
    @Body() dto: AccountRoleAssignmentDto,
  ): Promise<void> {
    await this.accountRolesService.assign(accountId, dto.roleIds);
  }

  @Account()
  @Roles("superuser")
  @Delete()
  async remove(
    @Param("accountId", ParseIntPipe) accountId: number,
  ): Promise<boolean> {
    await this.accountRolesService.removeByAccount(accountId);
    return true;
  }
}
