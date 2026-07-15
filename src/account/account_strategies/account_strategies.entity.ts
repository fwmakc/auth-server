import { BaseEntity, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import {
  CreatedColumn,
  IdColumn,
  JsonColumn,
  UpdatedColumn,
  VarcharColumn,
} from '@src/common/common.column';
import { AccountEntity } from '../account.entity';

@Entity({ name: 'account_strategies' })
@Index(['name', 'uid'], { unique: true })
export class AccountStrategiesEntity extends BaseEntity {
  @IdColumn()
  id: number;

  @CreatedColumn()
  createdAt?: Date;

  @UpdatedColumn()
  updatedAt?: Date;

  @VarcharColumn('name')
  name: string;

  @VarcharColumn('uid')
  uid: string;

  @JsonColumn('json')
  json?: string;

  @VarcharColumn('access_token', 'long')
  accessToken?: string;

  @VarcharColumn('refresh_token', 'long')
  refreshToken?: string;

  @ManyToOne(() => AccountEntity, (account) => account.strategies, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id', referencedColumnName: 'id' })
  account: AccountEntity;
}
