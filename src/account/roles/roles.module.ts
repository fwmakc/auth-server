import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
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
  ],
  providers: [RoleService, AccountRolesService],
  exports: [RoleService, AccountRolesService],
})
export class RolesModule {}
