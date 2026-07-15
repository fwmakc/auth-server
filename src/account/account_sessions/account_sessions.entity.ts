import { BaseEntity, Entity, JoinColumn, ManyToOne } from 'typeorm';
import {
  CreatedColumn,
  IdColumn,
  UpdatedColumn,
  VarcharColumn,
} from '@src/common/common.column';
import { AccountEntity } from '../account.entity';

@Entity({ name: 'account_sessions' })
export class AccountSessionsEntity extends BaseEntity {
  @IdColumn()
  id: number;

  @CreatedColumn()
  createdAt?: Date;

  @UpdatedColumn()
  updatedAt?: Date;

  @VarcharColumn('description')
  description?: string;

  @VarcharColumn('ip')
  ip?: string;

  @VarcharColumn('user_agent', 'medium')
  userAgent?: string;

  @VarcharColumn('referrer', 'medium')
  referrer?: string;

  @VarcharColumn('method', 'tiny')
  method?: string;

  @VarcharColumn('locale', 'tiny')
  locale?: string;

  @VarcharColumn('timezone', 'tiny')
  timezone?: string;

  @ManyToOne(() => AccountEntity, (account) => account.sessions, {
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'account_id', referencedColumnName: 'id' })
  account: AccountEntity;
}
