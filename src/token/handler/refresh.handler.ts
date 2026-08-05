import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PairHandler } from "@src/token/handler/pair.handler";
import { DbRefreshStore } from "@src/token/store";

@Injectable()
export class RefreshHandler {
  constructor(
    private readonly pairHandler: PairHandler,
    private readonly refreshStore: DbRefreshStore
  ) {}

  async refresh(refresh_token: string, callback = null): Promise<any> {
    if (!refresh_token) {
      throw new UnauthorizedException("Please sign in!");
    }

    const payload = await this.refreshStore.verify(refresh_token);

    if (callback) {
      const matched = callback({
        id: payload.accountId,
        client_id: payload.clientId,
      });
      if (!matched) {
        throw new UnauthorizedException("Refresh token is not valid!");
      }
    }

    await this.refreshStore.revoke(refresh_token);

    const data: any = { id: payload.accountId };
    if (payload.clientId) {
      data.client_id = payload.clientId;
    }

    return await this.pairHandler.pair(data);
  }
}
