import {
  BadRequestException,
  Injectable,
  Optional,
  UnauthorizedException,
} from "@nestjs/common";
import { AccountDto } from "@src/account/account.dto";
import { AccountConfirmService } from "@src/account/account_confirm/account_confirm.service";
import { AccountService } from "@src/account/account.service";
import { HashAccountHandler } from "@src/account/handler/hash.account.handler";
import { PasswordPolicyService } from "@src/account/service/password.policy.service";
import { DbRefreshStore } from "@src/token/store";

@Injectable()
export class ChangeAccountHandler {
  constructor(
    protected readonly accountService: AccountService,
    protected readonly accountConfirmService: AccountConfirmService,
    protected readonly hashAuthHandler: HashAccountHandler,
    protected readonly passwordPolicyService: PasswordPolicyService,
    // тот же store, что у logout: смена пароля должна разлогинить украденные сессии
    @Optional() protected readonly refreshStore?: DbRefreshStore,
  ) {}

  async change(accountDto: AccountDto, code: string): Promise<boolean> {
    const confirm = await this.accountConfirmService.validate(code, "reset");
    if (!confirm) {
      throw new BadRequestException("Invalid reset code");
    }
    const { account } = confirm;
    if (!account || account.username !== accountDto.username) {
      throw new UnauthorizedException("User not found");
    }
    this.passwordPolicyService.assertValid(accountDto.password);
    const password = await this.hashAuthHandler.generate(accountDto.password);
    await this.accountService.update(account.id, {
      password,
    });
    if (this.refreshStore) {
      await this.refreshStore.revokeAll(account.id);
    }
    return !!confirm;
  }
}
