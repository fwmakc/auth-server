import { BaseEntity, Entity, JoinColumn, ManyToOne } from "typeorm";
import {
  CreatedColumn,
  IdColumn,
  UpdatedColumn,
  VarcharColumn,
} from "@src/common/common.column";
import { ClientsEntity } from "../clients.entity";

@Entity({ name: "clients_redirects" })
export class ClientsRedirectsEntity extends BaseEntity {
  @IdColumn()
  id: number;

  @CreatedColumn()
  createdAt?: Date;

  @UpdatedColumn()
  updatedAt?: Date;

  @VarcharColumn("uri", "long")
  uri: string;

  @ManyToOne(() => ClientsEntity, (client) => client.redirects, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "client_id", referencedColumnName: "id" })
  client: ClientsEntity;
}
