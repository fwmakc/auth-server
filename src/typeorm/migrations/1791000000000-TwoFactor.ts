import { MigrationInterface, QueryRunner } from "typeorm";

export class TwoFactor1791000000000 implements MigrationInterface {
  name = "TwoFactor1791000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    if (!(await queryRunner.hasTable("account_two_factor"))) {
      await queryRunner.query(
        `CREATE TYPE "public"."account_two_factor_method_enum" AS ENUM('totp', 'email')`,
      );
      await queryRunner.query(
        `CREATE TABLE "account_two_factor" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "method" "public"."account_two_factor_method_enum" DEFAULT 'totp', "secret" json, "enabled" smallint NOT NULL DEFAULT 0, "recovery_codes" json, "failed_attempts" integer NOT NULL DEFAULT 0, "locked_until" TIMESTAMP, "account_id" bigint, CONSTRAINT "PK_account_two_factor" PRIMARY KEY ("id"))`,
      );
      await queryRunner.query(
        `CREATE UNIQUE INDEX "idx_account_two_factor_account" ON "account_two_factor" ("account_id") `,
      );
      await queryRunner.query(
        `ALTER TABLE "account_two_factor" ADD CONSTRAINT "FK_a3356b84c252bca126eb28ac078" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    if (await queryRunner.hasTable("account_two_factor")) {
      await queryRunner.query(`DROP TABLE "account_two_factor"`);
      await queryRunner.query(
        `DROP TYPE "public"."account_two_factor_method_enum"`,
      );
    }
  }
}
