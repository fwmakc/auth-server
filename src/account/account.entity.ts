import { BaseEntity, Column, Entity, OneToMany, OneToOne } from "typeorm";
import {
  BooleanColumn,
  CreatedColumn,
  IdColumn,
  UpdatedColumn,
  VarcharColumn,
} from "@lms/common";
import { ClientsEntity } from "@src/clients/clients.entity";
import { UsersEntity } from "@src/db/users/users.entity";
import { AccountConfirmEntity } from "./account_confirm/account_confirm.entity";
import { AccountSessionsEntity } from "./account_sessions/account_sessions.entity";
import { AccountStrategiesEntity } from "./account_strategies/account_strategies.entity";

@Entity({ name: "accounts" })
export class AccountEntity extends BaseEntity {
  @IdColumn()
  id: number;

  @CreatedColumn()
  createdAt?: Date;

  @UpdatedColumn()
  updatedAt?: Date;

  @VarcharColumn("username", "normal", { index: "unique" })
  username: string;

  @VarcharColumn("password")
  password: string;

  @BooleanColumn("is_activated")
  isActivated: boolean;

  @BooleanColumn("is_superuser")
  isSuperuser: boolean;

  @OneToMany(() => AccountSessionsEntity, (session) => session.account, {
    cascade: true,
  })
  sessions: AccountSessionsEntity[];

  @OneToMany(() => AccountStrategiesEntity, (strategy) => strategy.account, {
    cascade: true,
  })
  strategies: AccountStrategiesEntity[];

  @OneToMany(() => AccountConfirmEntity, (confirm) => confirm.account, {
    cascade: true,
  })
  confirm: AccountConfirmEntity[];

  @OneToMany(() => ClientsEntity, (clients) => clients.account, {
    cascade: true,
  })
  clients: ClientsEntity[];

  @OneToOne(() => UsersEntity, (users) => users.account, {
    cascade: true,
  })
  users: UsersEntity;
}
