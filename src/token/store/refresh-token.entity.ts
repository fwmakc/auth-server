import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from "typeorm";

@Entity("refresh_tokens")
@Index("idx_refresh_tokens_account", ["accountId"])
@Index("idx_refresh_tokens_hash", ["tokenHash"])
@Index("idx_refresh_tokens_family", ["familyId"])
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "account_id", type: "bigint", nullable: true })
  accountId: number;

  @Column({ name: "client_id", type: "varchar", length: 255, nullable: true })
  clientId: string | null;

  @Column({ name: "token_hash", type: "varchar", length: 64 })
  tokenHash: string;

  /**
   * Семья токенов: свежий логин создаёт новую семью, ротация наследует её.
   * Переиспользование отозванного токена инвалидирует всю семью.
   */
  @Column({ name: "family_id", type: "varchar", length: 64, nullable: true })
  familyId: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @Column({ name: "expires_at", type: "timestamp" })
  expiresAt: Date;

  @Column({ type: "boolean", default: false })
  revoked: boolean;
}
