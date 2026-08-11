import {
  Controller,
  Post,
  Delete,
  Param,
  ParseIntPipe,
  ForbiddenException,
  Body,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Account, Self, isSuperuser } from "api-server-toolkit";
import { AccountInfo } from "api-server-toolkit";
import { AccountRolesService } from "./account_role.service";
import { AccountRoleAssignmentDto } from "./account_role.dto";

@ApiTags("account-roles")
@Controller("account/:accountId/roles")
export class AccountRoleAssignmentController {
  constructor(private readonly accountRolesService: AccountRolesService) {}

  @Account()
  @Post()
  async assign(
    @Param("accountId", ParseIntPipe) accountId: number,
    @Body() dto: AccountRoleAssignmentDto,
    @Self() caller: AccountInfo,
  ): Promise<void> {
    if (!isSuperuser(caller)) {
      throw new ForbiddenException("Only superuser can assign roles");
    }
    await this.accountRolesService.assign(accountId, dto.roleIds);
  }

  @Account()
  @Delete()
  async remove(
    @Param("accountId", ParseIntPipe) accountId: number,
    @Self() caller: AccountInfo,
  ): Promise<boolean> {
    if (!isSuperuser(caller)) {
      throw new ForbiddenException("Only superuser can remove roles");
    }
    await this.accountRolesService.removeByAccount(accountId);
    return true;
  }
}
