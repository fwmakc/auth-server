import { MigrationInterface, QueryRunner } from "typeorm";

export class AccountRoles1790695680781 implements MigrationInterface {
    name = 'AccountRoles1790695680781'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "roles" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(255) DEFAULT '', "description" character varying(255) DEFAULT '', CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_648e3f5447f725579d7d4ffdfb" ON "roles" ("name") `);
        await queryRunner.query(`CREATE TABLE "account_roles" ("id" BIGSERIAL NOT NULL, "account_id" bigint NOT NULL DEFAULT '0', "role_id" bigint NOT NULL DEFAULT '0', "tenant_scope" character varying(255) DEFAULT '', CONSTRAINT "PK_d29411fdd88d973ec91cbbd179e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "account_roles" ADD CONSTRAINT "FK_0e94d53a5ed46deaae79475e427" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "account_roles" ADD CONSTRAINT "FK_70186a37bf7b84898bd08f61fba" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "account_roles" DROP CONSTRAINT "FK_70186a37bf7b84898bd08f61fba"`);
        await queryRunner.query(`ALTER TABLE "account_roles" DROP CONSTRAINT "FK_0e94d53a5ed46deaae79475e427"`);
        await queryRunner.query(`DROP TABLE "account_roles"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_648e3f5447f725579d7d4ffdfb"`);
        await queryRunner.query(`DROP TABLE "roles"`);
    }

}
