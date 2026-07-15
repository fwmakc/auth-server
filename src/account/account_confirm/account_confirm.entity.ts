import { BaseEntity, Entity, JoinColumn, ManyToOne } from 'typeorm';
import {
  CreatedColumn,
  IdColumn,
  UpdatedColumn,
  VarcharColumn,
} from '@src/common/common.column';
import { AccountEntity } from '../account.entity';

@Entity({ name: 'account_confirm' })
export class AccountConfirmEntity extends BaseEntity {
  @IdColumn()
  id: number;

  @ManyToOne(() => AccountEntity)
  @JoinColumn({ name: 'account_id', referencedColumnName: 'id' })
  account: AccountEntity;

  @CreatedColumn()
  createdAt?: Date;

  @UpdatedColumn()
  updatedAt?: Date;

  @VarcharColumn('code', 'long')
  code: string;

  @VarcharColumn('code', 'tiny')
  type: string;
}
