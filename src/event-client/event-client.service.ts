import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

export interface PublishOptions {
  source?: string;
  broadcast?: boolean;
  priority?: "low" | "normal" | "high";
  delay?: number;
  log?: boolean;
  ttl?: number;
}

@Injectable()
export class EventClientService {
  private readonly logger = new Logger(EventClientService.name);
  private readonly eventServerUrl: string;
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    this.eventServerUrl = this.config.get<string>(
      "EVENT_SERVER_URL",
      "http://event-server:3005"
    );
    this.apiKey = this.config.get<string>("INTERNAL_API_KEY", "changeme");
  }

  async publish(
    pattern: string,
    payload: Record<string, any>,
    options?: PublishOptions
  ): Promise<void> {
    const body: Record<string, any> = {
      pattern,
      payload,
      source: options?.source || "auth-server",
      broadcast: options?.broadcast ?? true,
      priority: options?.priority || "normal",
    };

    if (options?.delay) body.delay = options.delay;
    if (options?.log !== undefined) body.log = options.log;
    if (options?.ttl) body.ttl = options.ttl;

    try {
      await axios.post(`${this.eventServerUrl}/events`, body, {
        headers: { "X-Internal-Api-Key": this.apiKey },
        timeout: 5000,
      });
      this.logger.log(`Event published: ${pattern}`);
    } catch (err) {
      this.logger.error(
        `Failed to publish event "${pattern}": ${err.message || err}`
      );
    }
  }
}
