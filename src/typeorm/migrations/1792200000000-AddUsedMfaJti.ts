import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUsedMfaJti1792200000000 implements MigrationInterface {
  name = "AddUsedMfaJti1792200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Single-use ledger for mfa challenge tokens: a jti recorded here can
    // never be exchanged again (unique index decides atomically).
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "used_mfa_jti" (
        "id" SERIAL NOT NULL,
        "jti" character varying(64) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_used_mfa_jti_id" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "idx_used_mfa_jti_jti" ON "used_mfa_jti" ("jti")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_used_mfa_jti_jti"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "used_mfa_jti"`);
  }
}
