import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AccountDto } from '@src/account/account.dto';
import { AccountEntity } from '@src/account/account.entity';
import { AccountService } from '@src/account/account.service';
import { AccountConfirmService } from '@src/account/account_confirm/account_confirm.service';
import { HashAccountHandler } from '@src/account/handler/hash.account.handler';
import { MailService } from '@src/mail/mail.service';

@Injectable()
export class RegisterAccountHandler {
  constructor(
    protected readonly accountService: AccountService,
    protected readonly accountConfirmService: AccountConfirmService,
    protected readonly configService: ConfigService,
    protected readonly mailService: MailService,
    protected readonly hashAuthHandler: HashAccountHandler,
  ) {}

  async authCreate(accountDto: AccountDto): Promise<AccountEntity> {
    const authExists = await this.accountService.findByUsername(
      accountDto.username,
    );
    if (authExists) {
      if (+authExists.isActivated) {
        throw new BadRequestException(
          'User with this username is already in the system',
        );
      }
      return authExists;
    }
    accountDto.password = await this.hashAuthHandler.generate(
      accountDto.password,
    );

    // используйте данную строку, если пользователь будет сразу же активирован
    // accountDto.isActivated = true;

    return await this.accountService.create(accountDto);
  }

  async sendMail(account: AccountDto, subject): Promise<void> {
    const { username } = account;

    // закомментируйте строки ниже, если пользователь будет сразу же активирован
    // используйте generate чтобы генерировать код из цифр
    const confirm = await this.accountConfirmService.create(account);
    const url = this.configService.get('FORM_CONFIRM');

    await this.mailService.sendByTemplate(
      {
        to: username,
        subject,
        template: 'register',
      },
      {
        url: `${url}?code=${confirm.code}`,
      },
    );
  }
}
