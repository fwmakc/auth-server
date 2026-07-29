import { Injectable, UnauthorizedException } from "@nestjs/common";
import { compare } from "bcryptjs";
import { AccountService } from "@src/account/account.service";
import { AccountSessionsService } from "@src/account/account_sessions/account_sessions.service";
import { Cookie } from "api-server-toolkit";

@Injectable()
export class DeactivateAccountHandler {
  constructor(
    protected readonly accountService: AccountService,
    protected readonly accountSessionsService: AccountSessionsService
  ) {}

  async deactivate(account: any, password: string, request: any, response: any): Promise<any> {
    const fullAccount = await this.accountService.findByUsername(account.username);

    if (!fullAccount) {
      throw new UnauthorizedException("User not found");
    }

    const isValid = await compare(password, fullAccount.password);
    if (!isValid) {
      throw new UnauthorizedException("Invalid password");
    }

    fullAccount.isDeleted = true;
    fullAccount.deletedAt = new Date();
    await fullAccount.save();

    try {
      await this.accountSessionsService.destroy(fullAccount, request);
    } catch {
      // session cleanup is best-effort
    }

    if (request && response) {
      const cookie = new Cookie(request, response);
      cookie.reset("id");
      cookie.reset("query");
    }

    delete request.user;

    return fullAccount;
  }
}
