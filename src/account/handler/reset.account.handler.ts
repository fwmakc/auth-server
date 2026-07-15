import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AccountDto } from "@src/account/account.dto";
import { AccountConfirmService } from "@src/account/account_confirm/account_confirm.service";
import { AccountService } from "@src/account/account.service";
import { MailService } from "@src/mail/mail.service";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class ResetAccountHandler {
  constructor(
    protected readonly accountService: AccountService,
    protected readonly accountConfirmService: AccountConfirmService,
    protected readonly configService: ConfigService,
    protected readonly mailService: MailService
  ) {}

  async confirmCreate(accountDto: AccountDto): Promise<any> {
    const account = await this.accountService.findByUsername(
      accountDto.username
    );
    if (!account) {
      throw new UnauthorizedException("User not found");
    }
    return await this.accountConfirmService.create(account, "reset");
  }

  async sendMail(
    username: string,
    subject: string,
    code: string
  ): Promise<void> {
    const url = this.configService.get("FORM_CHANGE");
    await this.mailService.sendByTemplate(
      {
        to: username,
        subject,
        template: "reset",
      },
      {
        url: `${url}?code=${code}`,
      }
    );
  }
}
