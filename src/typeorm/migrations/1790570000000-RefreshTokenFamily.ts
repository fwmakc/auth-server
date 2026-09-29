import { MigrationInterface, QueryRunner } from "typeorm";

export class RefreshTokenFamily1790570000000 implements MigrationInterface {
  name = "RefreshTokenFamily1790570000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Таблицы может не быть на БД, живших только с миграциями
    // (refresh_tokens отсутствует в InitialSchema и создавался synchronize'м).
    if (!(await queryRunner.hasTable("refresh_tokens"))) {
      await queryRunner.query(
        `CREATE TABLE "refresh_tokens" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "account_id" bigint, "client_id" character varying(255), "token_hash" character varying(64) NOT NULL, "expires_at" TIMESTAMP NOT NULL, "revoked" boolean NOT NULL DEFAULT false, "family_id" character varying(64), CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id"))`,
      );
      await queryRunner.query(
        `CREATE INDEX "idx_refresh_tokens_account" ON "refresh_tokens" ("account_id")`,
      );
      await queryRunner.query(
        `CREATE INDEX "idx_refresh_tokens_hash" ON "refresh_tokens" ("token_hash")`,
      );
    }
    if (!(await queryRunner.hasColumn("refresh_tokens", "family_id"))) {
      await queryRunner.query(
        `ALTER TABLE "refresh_tokens" ADD COLUMN "family_id" character varying(64)`,
      );
    }
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_refresh_tokens_family" ON "refresh_tokens" ("family_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_refresh_tokens_family"`);
    if (await queryRunner.hasColumn("refresh_tokens", "family_id")) {
      await queryRunner.query(
        `ALTER TABLE "refresh_tokens" DROP COLUMN "family_id"`,
      );
    }
  }
}
