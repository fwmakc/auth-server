import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OutboxModule } from "api-server-toolkit";
import { AuthEventOutboxEntity } from "../../db/outbox.entity";
import { AccountRoleEntity } from "./account_role.entity";
import { AccountRolesService } from "./account_role.service";
import { AccountRoleAssignmentController } from "./account_role.controller";
import { RoleEntity } from "../roles/role.entity";
import { AccountModule } from "../account.module";

@Module({
  controllers: [AccountRoleAssignmentController],
  imports: [
    TypeOrmModule.forFeature([AccountRoleEntity, RoleEntity]),
    forwardRef(() => AccountModule),
    // IEventClient for the user.roles_changed emission — same outbox
    // instance everywhere (toolkit dedupes identical forRoot calls).
    OutboxModule.forRoot(AuthEventOutboxEntity),
  ],
  providers: [AccountRolesService],
  exports: [AccountRolesService],
})
export class AccountRolesModule {}
