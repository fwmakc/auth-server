import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  // Generated,
} from 'typeorm';
import {
  BooleanColumn,
  CreatedColumn,
  EnumColumn,
  IdColumn,
  TextColumn,
  UpdatedColumn,
  VarcharColumn,
} from '@src/common/common.column';
import { TypeClients } from '@src/common/common.enum';
import { AccountEntity } from '@src/account/account.entity';
import { ClientsRedirectsEntity } from './clients_redirects/clients_redirects.entity';

@Entity({ name: 'clients' })
export class ClientsEntity extends BaseEntity {
  @IdColumn()
  id: number;

  @ManyToOne(() => AccountEntity)
  @JoinColumn({ name: 'account_id', referencedColumnName: 'id' })
  account: AccountEntity;

  @CreatedColumn()
  createdAt?: Date;

  @UpdatedColumn()
  updatedAt?: Date;

  @VarcharColumn('client_id', 'normal', { index: 'unique' })
  client_id: string;

  @VarcharColumn('client_secret', 'long')
  client_secret: string;

  @VarcharColumn('client_password', 'long')
  client_password: string;

  @EnumColumn('client_type', TypeClients, TypeClients.DEFAULT)
  client_type?: TypeClients;

  @VarcharColumn('title')
  title: string;

  @TextColumn('description')
  description: string;

  @VarcharColumn('client_uri', 'long')
  client_uri: string;

  @VarcharColumn('code', 'long')
  code: string;

  @CreatedColumn('published_at')
  publishedAt: Date;

  @BooleanColumn('is_published', true)
  isPublished: boolean;

  @OneToMany(() => ClientsRedirectsEntity, (redirect) => redirect.client, {
    cascade: true,
  })
  redirects: ClientsRedirectsEntity[];
}
