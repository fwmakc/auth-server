import { Entity, Index } from "typeorm";
import { EventOutboxEntity } from "api-server-toolkit";

/**
 * Service-local registration of the toolkit outbox table: TypeORM loads
 * entities by glob from src, so the toolkit's undecorated base class is
 * subclassed here (same pattern as mail_jobs in message-server). The claim
 * index is declared here too — the drift probe compares entity metadata
 * against the migration-built schema, and an undeclared DB index reads
 * as drift.
 */
@Entity("event_outbox")
@Index("IDX_event_outbox_claim", ["status", "nextAttemptAt"])
export class AuthEventOutboxEntity extends EventOutboxEntity {}
