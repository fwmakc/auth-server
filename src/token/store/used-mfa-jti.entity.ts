import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from "typeorm";

/**
 * Single-use ledger for mfa challenge tokens. The `jti` of an mfa JWT is
 * recorded here right after a successful 2FA verification; the unique
 * index makes any second exchange with the same challenge token a no-op,
 * so a captured mfa_token cannot be replayed within its 5-minute window.
 *
 * Direct TypeORM decorators + explicit index name so the migration and
 * the entity agree byte-for-byte (same pattern as refresh_tokens).
 */
@Entity("used_mfa_jti")
@Index("idx_used_mfa_jti_jti", ["jti"], { unique: true })
export class UsedMfaJtiEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "jti", type: "varchar", length: 64 })
  jti: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt: Date;
}
