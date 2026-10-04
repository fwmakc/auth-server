import { MigrationInterface, QueryRunner } from "typeorm";

export class EventOutbox1792300000000 implements MigrationInterface {
  name = "EventOutbox1792300000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Durable event publishing: OutboxEventClient writes here (optionally in
    // the caller's transaction), OutboxRelayWorker delivers to event-server
    // with retries. Column set mirrors toolkit EventOutboxEntity (QueueJobEntity).
    await queryRunner.query(`CREATE TABLE IF NOT EXISTS "event_outbox" (
        "id" SERIAL NOT NULL,
        "status" character varying NOT NULL DEFAULT 'pending',
        "attempts" integer NOT NULL DEFAULT '0',
        "last_attempt_at" TIMESTAMP WITH TIME ZONE,
        "next_attempt_at" TIMESTAMP WITH TIME ZONE,
        "error_message" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "pattern" character varying NOT NULL,
        "payload" jsonb NOT NULL,
        "source" character varying,
        "opts" jsonb,
        CONSTRAINT "PK_event_outbox_id" PRIMARY KEY ("id")
    )`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_event_outbox_claim" ON "event_outbox" ("status", "next_attempt_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_event_outbox_claim"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "event_outbox"`);
  }
}
