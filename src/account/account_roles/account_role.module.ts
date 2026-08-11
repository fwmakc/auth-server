import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
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
  ],
  providers: [AccountRolesService],
  exports: [AccountRolesService],
})
export class AccountRolesModule {}
