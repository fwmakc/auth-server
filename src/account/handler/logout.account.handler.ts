import { Inject, Injectable, Optional } from "@nestjs/common";
import { AccountSessionsService } from "@src/account/account_sessions/account_sessions.service";
import { Cookie } from "api-server-toolkit";
import { IRefreshTokenStore, IREFRESH_TOKEN_STORE } from "@src/token/store";

@Injectable()
export class LogoutAccountHandler {
  constructor(
    protected readonly accountSessionsService: AccountSessionsService,
    @Inject(IREFRESH_TOKEN_STORE) @Optional()
    protected readonly refreshStore?: IRefreshTokenStore
  ) {}

  async logout(request: any = null, response: any = null): Promise<boolean> {
    if (!request || !request?.user) {
      return false;
    }

    if (this.refreshStore) {
      await this.refreshStore.revokeAll(request.user.id);
    }

    await this.accountSessionsService.destroy(request.user, request);
    delete request.user;

    if (response) {
      const cookie = new Cookie(request, response);
      cookie.reset("id");
      cookie.reset("query");
    }

    return true;
  }
}
