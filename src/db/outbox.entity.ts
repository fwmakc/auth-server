import { Entity } from "typeorm";
import { EventOutboxEntity } from "api-server-toolkit";

/**
 * Service-local registration of the toolkit outbox table: TypeORM loads
 * entities by glob from src, so the toolkit's undecorated base class is
 * subclassed here (same pattern as mail_jobs in message-server).
 */
@Entity("event_outbox")
export class AuthEventOutboxEntity extends EventOutboxEntity {}
