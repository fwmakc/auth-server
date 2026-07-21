import { BaseEntity, Entity, JoinColumn, OneToOne } from "typeorm";
import { TypeGenders } from "@core/common";
import { AccountEntity } from "@src/account/account.entity";
import {
  CreatedColumn,
  DateColumn,
  EnumColumn,
  IdColumn,
  UpdatedColumn,
  VarcharColumn,
} from "@core/common";

@Entity({ name: "users" })
export class UsersEntity extends BaseEntity {
  @IdColumn()
  id: number;

  @OneToOne(() => AccountEntity)
  @JoinColumn({ name: "account_id", referencedColumnName: "id" })
  account: AccountEntity;

  @CreatedColumn()
  createdAt?: Date;

  @UpdatedColumn()
  updatedAt?: Date;

  @VarcharColumn("email")
  email?: string;

  @VarcharColumn("phone", "tiny", { clear: "[^0-9]" })
  phone?: string;

  @VarcharColumn("name")
  name?: string;

  @VarcharColumn("last_name")
  lastName?: string;

  @VarcharColumn("parent_name")
  parentName?: string;

  @VarcharColumn("avatar", "long")
  avatar?: string;

  @DateColumn("birthday")
  birthday?: Date;

  @VarcharColumn("locale", "tiny")
  locale?: string;

  @VarcharColumn("address", "medium")
  address?: string;

  @VarcharColumn("timezone", "tiny")
  timezone?: string;

  @EnumColumn("gender", TypeGenders, TypeGenders.DEFAULT)
  gender?: TypeGenders;
}
