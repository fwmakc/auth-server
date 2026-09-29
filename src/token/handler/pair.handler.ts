import { Injectable } from "@nestjs/common";
import { OneHandler } from "@src/token/handler/one.handler";
import { DbRefreshStore } from "@src/token/store";

@Injectable()
export class PairHandler {
  constructor(
    private readonly oneHandler: OneHandler,
    private readonly refreshStore: DbRefreshStore,
  ) {}

  async pair(data, familyId?: string): Promise<any> {
    const accessTokenData = await this.oneHandler.one(
      {
        ...data,
        type: "access",
      },
      "JWT_ACCESS_EXPIRES",
    );

    // familyId передаётся только при ротации — свежий логин начинает новую семью
    const refreshToken = await this.refreshStore.issue(
      {
        accountId: data.id,
        clientId: data.client_id,
      },
      familyId,
    );

    return {
      access_token: accessTokenData.token,
      expires_in: accessTokenData.expiresIn,
      refresh_token: refreshToken.token,
    };
  }
}
