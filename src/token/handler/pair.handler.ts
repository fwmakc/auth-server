import { Injectable } from "@nestjs/common";
import { OneHandler } from "@src/token/handler/one.handler";
import { DbRefreshStore } from "@src/token/store";

@Injectable()
export class PairHandler {
  constructor(
    private readonly oneHandler: OneHandler,
    private readonly refreshStore: DbRefreshStore
  ) {}

  async pair(data): Promise<any> {
    const accessTokenData = await this.oneHandler.one(
      {
        ...data,
        type: "access",
      },
      "JWT_ACCESS_EXPIRES"
    );

    const refreshToken = await this.refreshStore.issue({
      accountId: data.id,
      clientId: data.client_id,
    });

    return {
      access_token: accessTokenData.token,
      expires_in: accessTokenData.expiresIn,
      refresh_token: refreshToken.token,
    };
  }
}
