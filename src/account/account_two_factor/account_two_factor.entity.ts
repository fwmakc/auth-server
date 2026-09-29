import {
  BaseEntity,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
} from "typeorm";
import {
  BooleanColumn,
  CreatedColumn,
  DateColumn,
  EnumColumn,
  IdColumn,
  IntColumn,
  JsonColumn,
  UpdatedColumn,
} from "api-server-toolkit";
import { AccountEntity } from "../account.entity";

@Entity({ name: "account_two_factor" })
// One 2FA record per account, enforced at the DB level (matches the
// unique index the TwoFactor migration creates)
@Index("idx_account_two_factor_account", ["account"], { unique: true })
export class AccountTwoFactorEntity extends BaseEntity {
  @IdColumn()
  id: number;

  @ManyToOne(() => AccountEntity, { onDelete: "CASCADE" })
  @JoinColumn({ name: "account_id", referencedColumnName: "id" })
  account: AccountEntity;

  @CreatedColumn()
  createdAt?: Date;

  @UpdatedColumn()
  updatedAt?: Date;

  @EnumColumn("method", ["totp", "email"], "totp")
  method: "totp" | "email";

  // TOTP secret encrypted via toolkit encrypt() (AES-GCM, AES_SECRET);
  // stored as { encrypted, iv }, null for the email method
  @JsonColumn("secret")
  secret?: { encrypted: string; iv: string } | null;

  // false until the first successful setup/confirm
  @BooleanColumn("enabled", false)
  enabled: boolean;

  // bcrypt hashes of one-time recovery codes
  @JsonColumn("recovery_codes")
  recoveryCodes?: string[];

  @IntColumn("failed_attempts", 0)
  failedAttempts: number;

  @DateColumn("locked_until")
  lockedUntil?: Date;
}
