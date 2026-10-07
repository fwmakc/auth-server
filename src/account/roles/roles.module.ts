import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OutboxModule } from "api-server-toolkit";
import { AuthEventOutboxEntity } from "../../db/outbox.entity";
import { RoleEntity } from "./role.entity";
import { RoleService } from "./role.service";
import { RolesController } from "./roles.controller";
import { AccountRoleEntity } from "../account_roles/account_role.entity";
import { AccountRolesService } from "../account_roles/account_role.service";
import { AccountModule } from "../account.module";

@Module({
  controllers: [RolesController],
  imports: [
    TypeOrmModule.forFeature([RoleEntity, AccountRoleEntity]),
    forwardRef(() => AccountModule),
    // AccountRolesService is provided here too (legacy duplicate) and needs
    // IEventClient for the user.roles_changed emission — same outbox
    // instance everywhere (toolkit dedupes identical forRoot calls).
    OutboxModule.forRoot(AuthEventOutboxEntity),
  ],
  providers: [RoleService, AccountRolesService],
  exports: [RoleService, AccountRolesService],
})
export class RolesModule {}
