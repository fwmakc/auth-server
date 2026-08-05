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
export class RefreshTokenEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "account_id", type: "bigint", nullable: true })
  accountId: number;

  @Column({ name: "client_id", type: "varchar", length: 255, nullable: true })
  clientId: string | null;

  @Column({ name: "token_hash", type: "varchar", length: 64 })
  tokenHash: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @Column({ name: "expires_at", type: "timestamp" })
  expiresAt: Date;

  @Column({ type: "boolean", default: false })
  revoked: boolean;
}
