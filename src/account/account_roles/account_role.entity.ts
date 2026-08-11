import { BaseEntity, Entity, ManyToOne, JoinColumn } from "typeorm";
import { IdColumn, BigIntColumn, VarcharColumn } from "api-server-toolkit";
import { AccountEntity } from "../account.entity";
import { RoleEntity } from "../roles/role.entity";

@Entity({ name: "account_roles" })
export class AccountRoleEntity extends BaseEntity {
  @IdColumn()
  id: number;

  @BigIntColumn("account_id")
  accountId: number;

  @BigIntColumn("role_id")
  roleId: number;

  @VarcharColumn("tenant_scope")
  tenantScope: string;

  @ManyToOne(() => AccountEntity, (account) => account.accountRoles, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "account_id", referencedColumnName: "id" })
  account: AccountEntity;

  @ManyToOne(() => RoleEntity, (role) => role.accountRoles, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "role_id", referencedColumnName: "id" })
  role: RoleEntity;
}
