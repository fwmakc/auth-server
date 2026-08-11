import { BaseEntity, Entity, OneToMany } from "typeorm";
import { CreatedColumn, IdColumn, UpdatedColumn, VarcharColumn } from "api-server-toolkit";
import { AccountRoleEntity } from "../account_roles/account_role.entity";

@Entity({ name: "roles" })
export class RoleEntity extends BaseEntity {
  @IdColumn()
  id: number;

  @CreatedColumn()
  createdAt?: Date;

  @UpdatedColumn()
  updatedAt?: Date;

  @VarcharColumn("name", "normal", { index: "unique" })
  name: string;

  @VarcharColumn("description")
  description: string;

  @OneToMany(() => AccountRoleEntity, (ar) => ar.role)
  accountRoles: AccountRoleEntity[];
}
