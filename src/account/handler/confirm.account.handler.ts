import { Injectable } from "@nestjs/common";
import { AccountConfirmService } from "@src/account/account_confirm/account_confirm.service";
import { AccountService } from "@src/account/account.service";

@Injectable()
export class ConfirmAccountHandler {
  constructor(
    protected readonly accountService: AccountService,
    protected readonly accountConfirmService: AccountConfirmService
  ) {}

  async confirm(code: string): Promise<boolean> {
    const confirm = await this.accountConfirmService.validate(code);
    if (confirm) {
      const { account } = confirm;
      await this.accountService.update(account.id, {
        isActivated: true,
      });
    }
    return !!confirm;
  }
}
