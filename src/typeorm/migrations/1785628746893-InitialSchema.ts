import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1785628746893 implements MigrationInterface {
    name = 'InitialSchema1785628746893'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."users_gender_enum" AS ENUM('', 'm', 'w')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "email" character varying(255) DEFAULT '', "phone" character varying(15) DEFAULT '', "name" character varying(255) DEFAULT '', "last_name" character varying(255) DEFAULT '', "parent_name" character varying(255) DEFAULT '', "avatar" character varying(2047) DEFAULT '', "birthday" TIMESTAMP, "locale" character varying(15) DEFAULT '', "address" character varying(1023) DEFAULT '', "timezone" character varying(15) DEFAULT '', "gender" "public"."users_gender_enum" DEFAULT '', "account_id" bigint, CONSTRAINT "REL_17a709b8b6146c491e6615c29d" UNIQUE ("account_id"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "account_confirm" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "code" character varying(2047) DEFAULT '', "type" character varying(15) DEFAULT '', "account_id" bigint, CONSTRAINT "PK_be6aa545f34ac752a708931f74f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "account_sessions" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "description" character varying(255) DEFAULT '', "ip" character varying(255) DEFAULT '', "user_agent" character varying(1023) DEFAULT '', "referrer" character varying(1023) DEFAULT '', "method" character varying(15) DEFAULT '', "locale" character varying(15) DEFAULT '', "timezone" character varying(15) DEFAULT '', "account_id" bigint, CONSTRAINT "PK_2cd6ab4022fd3aa1e90ca61e3fb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "account_strategies" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" character varying(255) DEFAULT '', "uid" character varying(255) DEFAULT '', "json" json, "access_token" character varying(2047) DEFAULT '', "refresh_token" character varying(2047) DEFAULT '', "account_id" bigint, CONSTRAINT "PK_e90692d00bfcfecd45f8584d161" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_98049cdcd34ec3991da3d97e9a" ON "account_strategies" ("name", "uid") `);
        await queryRunner.query(`CREATE TABLE "accounts" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "username" character varying(255) DEFAULT '', "password" character varying(255) DEFAULT '', "is_activated" smallint NOT NULL DEFAULT '0', "is_superuser" smallint NOT NULL DEFAULT '0', "is_deleted" smallint NOT NULL DEFAULT '0', "deleted_at" TIMESTAMP, CONSTRAINT "PK_5a7a02c20412299d198e097a8fe" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_477e3187cedfb5a3ac121e899c" ON "accounts" ("username") `);
        await queryRunner.query(`CREATE TABLE "clients_redirects" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "uri" character varying(2047) DEFAULT '', "client_id" bigint, CONSTRAINT "PK_e39ed408b09a7d5f75a478b8598" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."clients_client_type_enum" AS ENUM('public', 'confidential')`);
        await queryRunner.query(`CREATE TABLE "clients" ("id" BIGSERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "client_id" character varying(255) DEFAULT '', "client_secret" character varying(2047) DEFAULT '', "client_password" character varying(2047) DEFAULT '', "client_type" "public"."clients_client_type_enum" DEFAULT 'public', "title" character varying(255) DEFAULT '', "description" text, "client_uri" character varying(2047) DEFAULT '', "code" character varying(2047) DEFAULT '', "published_at" TIMESTAMP NOT NULL DEFAULT now(), "is_published" smallint NOT NULL DEFAULT '1', "account_id" bigint, CONSTRAINT "PK_f1ab7cf3a5714dbc6bb4e1c28a4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_49e91f1e368e3f760789e7764a" ON "clients" ("client_id") `);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_17a709b8b6146c491e6615c29d7" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "account_confirm" ADD CONSTRAINT "FK_a8e313a61a9306506fd1c39ad63" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "account_sessions" ADD CONSTRAINT "FK_089c9da3ef4217f28a7df00dbc6" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "account_strategies" ADD CONSTRAINT "FK_863381c7152efaf8186606d0f80" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "clients_redirects" ADD CONSTRAINT "FK_d82d5c78f3f50f17924526d0cef" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "clients" ADD CONSTRAINT "FK_1ad1b715039ea103be3254ce327" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "clients" DROP CONSTRAINT "FK_1ad1b715039ea103be3254ce327"`);
        await queryRunner.query(`ALTER TABLE "clients_redirects" DROP CONSTRAINT "FK_d82d5c78f3f50f17924526d0cef"`);
        await queryRunner.query(`ALTER TABLE "account_strategies" DROP CONSTRAINT "FK_863381c7152efaf8186606d0f80"`);
        await queryRunner.query(`ALTER TABLE "account_sessions" DROP CONSTRAINT "FK_089c9da3ef4217f28a7df00dbc6"`);
        await queryRunner.query(`ALTER TABLE "account_confirm" DROP CONSTRAINT "FK_a8e313a61a9306506fd1c39ad63"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_17a709b8b6146c491e6615c29d7"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_49e91f1e368e3f760789e7764a"`);
        await queryRunner.query(`DROP TABLE "clients"`);
        await queryRunner.query(`DROP TYPE "public"."clients_client_type_enum"`);
        await queryRunner.query(`DROP TABLE "clients_redirects"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_477e3187cedfb5a3ac121e899c"`);
        await queryRunner.query(`DROP TABLE "accounts"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_98049cdcd34ec3991da3d97e9a"`);
        await queryRunner.query(`DROP TABLE "account_strategies"`);
        await queryRunner.query(`DROP TABLE "account_sessions"`);
        await queryRunner.query(`DROP TABLE "account_confirm"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_gender_enum"`);
    }

}
