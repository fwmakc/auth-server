import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import {
  IRefreshTokenStore,
  RefreshTokenPayload,
  IssuedRefreshToken,
} from "./refresh-token-store.interface";

@Injectable()
export class StatelessRefreshStore extends IRefreshTokenStore {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {
    super();
  }

  async issue(payload: RefreshTokenPayload): Promise<IssuedRefreshToken> {
    const data: any = { id: payload.accountId, type: "refresh" };
    if (payload.clientId) data.client_id = payload.clientId;

    const expires = this.configService.get("JWT_REFRESH_EXPIRES") || "";
    const token = await this.jwtService.signAsync(
      data,
      expires ? { expiresIn: expires } : {}
    );

    const expiresAt = new Date();
    if (expires) {
      const match = expires.match(/(\d+)([smhd])/);
      if (match) {
        const units = { s: 1, m: 60, h: 3600, d: 86400 };
        expiresAt.setSeconds(expiresAt.getSeconds() + Number(match[1]) * units[match[2]]);
      }
    }

    return { token, expiresAt };
  }

  async verify(token: string): Promise<RefreshTokenPayload> {
    try {
      const result = await this.jwtService.verifyAsync(token);
      if (!result || result.type !== "refresh") {
        throw new UnauthorizedException("Invalid refresh token");
      }
      return { accountId: result.id, clientId: result.client_id };
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async revoke(): Promise<void> {}

  async revokeAll(): Promise<void> {}
}
