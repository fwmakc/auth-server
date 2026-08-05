import { Injectable, Inject } from "@nestjs/common";
import { OneHandler } from "@src/token/handler/one.handler";
import { IRefreshTokenStore, IREFRESH_TOKEN_STORE } from "@src/token/store";

@Injectable()
export class PairHandler {
  constructor(
    private readonly oneHandler: OneHandler,
    @Inject(IREFRESH_TOKEN_STORE) private readonly refreshStore: IRefreshTokenStore
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
