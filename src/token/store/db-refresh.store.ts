import { Injectable, UnauthorizedException, Logger, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, LessThan } from "typeorm";
import { createHash, randomUUID } from "crypto";
import { RefreshTokenEntity } from "./refresh-token.entity";

export interface RefreshTokenPayload {
  accountId: number;
  clientId?: string;
}

export interface IssuedRefreshToken {
  token: string;
  expiresAt: Date;
}

@Injectable()
export class DbRefreshStore implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DbRefreshStore.name);
  private cleanupTimer: NodeJS.Timeout | null = null;
  private readonly cleanupInterval = 3600000; // 1 hour

  constructor(
    @InjectRepository(RefreshTokenEntity)
    private readonly repo: Repository<RefreshTokenEntity>
  ) {}

  onModuleInit() {
    this.scheduleCleanup();
    this.logger.log("Refresh token cleanup scheduled (every 1 hour)");
  }

  onModuleDestroy() {
    if (this.cleanupTimer) clearTimeout(this.cleanupTimer);
  }

  private scheduleCleanup() {
    this.cleanupTimer = setTimeout(async () => {
      await this.runCleanup();
      this.scheduleCleanup();
    }, this.cleanupInterval);
  }

  private async runCleanup() {
    try {
      const result = await this.repo.delete({
        expiresAt: LessThan(new Date()),
      });
      if (result.affected > 0) {
        this.logger.log(`Cleanup: deleted ${result.affected} expired refresh tokens`);
      }
    } catch (err) {
      this.logger.error(`Cleanup failed: ${err.message}`);
    }
  }

  private hash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  async issue(payload: RefreshTokenPayload): Promise<IssuedRefreshToken> {
    const rawToken = `r_${randomUUID()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await this.repo.save({
      accountId: payload.accountId,
      clientId: payload.clientId || null,
      tokenHash: this.hash(rawToken),
      expiresAt,
      revoked: false,
    });

    return { token: rawToken, expiresAt };
  }

  async verify(token: string): Promise<RefreshTokenPayload> {
    const record = await this.repo.findOne({
      where: {
        tokenHash: this.hash(token),
        revoked: false,
      },
    });

    if (!record) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    if (record.expiresAt < new Date()) {
      await this.repo.remove(record);
      throw new UnauthorizedException("Refresh token expired");
    }

    return {
      accountId: record.accountId,
      clientId: record.clientId || undefined,
    };
  }

  async revoke(token: string): Promise<void> {
    await this.repo.update(
      { tokenHash: this.hash(token) },
      { revoked: true }
    );
  }

  async revokeAll(accountId: number): Promise<void> {
    await this.repo.update(
      { accountId, revoked: false },
      { revoked: true }
    );
  }
}
