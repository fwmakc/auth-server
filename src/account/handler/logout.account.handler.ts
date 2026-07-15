import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AccountSessionsService } from "@src/account/account_sessions/account_sessions.service";
import { Cookie } from "@src/common/service/cookie.service";

@Injectable()
export class LogoutAccountHandler {
  constructor(
    protected readonly accountSessionsService: AccountSessionsService
  ) {}

  async logout(request: any = null, response: any = null): Promise<boolean> {
    if (!request || !request?.user) {
      return false;
    }
    try {
      await this.accountSessionsService.destroy(request?.user, request);
    } catch {
      throw new UnauthorizedException("Session does not exist!");
    }
    delete request.user;

    const cookie = new Cookie(request, response);
    cookie.reset("id");
    cookie.reset("query");

    return true;
  }
}
