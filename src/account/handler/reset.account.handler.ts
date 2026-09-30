import { Injectable } from "@nestjs/common";
import { AccountDto } from "@src/account/account.dto";
import { AccountConfirmService } from "@src/account/account_confirm/account_confirm.service";
import { AccountService } from "@src/account/account.service";
import { HashAccountHandler } from "@src/account/handler/hash.account.handler";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ResetAccountHandler {
  constructor(
    protected readonly accountService: AccountService,
    protected readonly accountConfirmService: AccountConfirmService,
    protected readonly configService: ConfigService,
    protected readonly hashAuthHandler: HashAccountHandler,
  ) {}

  /**
   * Несуществующий аккаунт отвечает как успешный запрос (null вместо
   * подтверждения): письмо некому отправлять, но ответ и тайминг
   * (dummy-хеш) совпадают с существующим — иначе перебор логинов.
   */
  async confirmCreate(accountDto: AccountDto): Promise<any> {
    const account = await this.accountService.findByUsername(
      accountDto.username,
    );
    if (!account) {
      await this.hashAuthHandler.dummyHash();
      return null;
    }
    return await this.accountConfirmService.generate(account, "reset");
  }

  async sendMail(username: string, code: string): Promise<string> {
    const url = this.configService.get("FORM_CHANGE");
    return `${url}?code=${code}`;
  }
}
