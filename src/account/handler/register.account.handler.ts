import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccountDto } from "@src/account/account.dto";
import { AccountEntity } from "@src/account/account.entity";
import { AccountService } from "@src/account/account.service";
import { AccountConfirmService } from "@src/account/account_confirm/account_confirm.service";
import { HashAccountHandler } from "@src/account/handler/hash.account.handler";
import { PasswordPolicyService } from "@src/account/service/password.policy.service";

@Injectable()
export class RegisterAccountHandler {
  constructor(
    protected readonly accountService: AccountService,
    protected readonly accountConfirmService: AccountConfirmService,
    protected readonly configService: ConfigService,
    protected readonly hashAuthHandler: HashAccountHandler,
    protected readonly passwordPolicyService: PasswordPolicyService,
  ) {}

  /**
   * Активный дубликат возвращает null (не throw): ответ registration-эндпоинта
   * не должен различать «занят» и «создан», иначе — перебор логинов.
   * Письмо на чужой адрес в этом случае не уходит (email-bombing).
   */
  async authCreate(accountDto: AccountDto): Promise<AccountEntity | null> {
    const authExists = await this.accountService.findByUsername(
      accountDto.username,
    );
    if (authExists) {
      if (+authExists.isActivated) {
        return null;
      }
      return authExists;
    }
    this.passwordPolicyService.assertValid(accountDto.password);
    accountDto.password = await this.hashAuthHandler.generate(
      accountDto.password,
    );

    // используйте данную строку, если пользователь будет сразу же активирован
    // accountDto.isActivated = true;

    return await this.accountService.create(accountDto);
  }

  async sendMail(account: AccountDto): Promise<string> {
    const confirm = await this.accountConfirmService.generate(account);
    const url = this.configService.get("FORM_CONFIRM");

    return `${url}?code=${confirm.code}`;
  }
}
