import { Injectable, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AccountService } from "@src/account/account.service";

@Injectable()
export class DeleteAccountHandler {
  constructor(
    protected readonly accountService: AccountService
  ) {}

  async delete(targetUserId: number, request: any): Promise<any> {
    if (!request?.user?.isSuperuser) {
      throw new ForbiddenException("Admin access required");
    }

    const account = await this.accountService.findOne({ id: targetUserId });
    if (!account) {
      throw new NotFoundException(`Account ${targetUserId} not found`);
    }

    if (account.isSuperuser) {
      throw new ForbiddenException("Cannot delete superuser account");
    }

    await this.accountService.hardDelete(targetUserId);

    return { id: targetUserId, username: account.username };
  }
}
