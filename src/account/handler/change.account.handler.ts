import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AccountDto } from '@src/account/account.dto';
import { AccountConfirmService } from '@src/account/account_confirm/account_confirm.service';
import { AccountService } from '@src/account/account.service';
import { HashAccountHandler } from '@src/account/handler/hash.account.handler';

@Injectable()
export class ChangeAccountHandler {
  constructor(
    protected readonly accountService: AccountService,
    protected readonly accountConfirmService: AccountConfirmService,
    protected readonly hashAuthHandler: HashAccountHandler,
  ) {}

  async change(accountDto: AccountDto, code: string): Promise<boolean> {
    const confirm = await this.accountConfirmService.validate(code, 'reset');
    if (!confirm) {
      throw new BadRequestException('Invalid reset code');
    }
    const { account } = confirm;
    if (!account || account.username !== accountDto.username) {
      throw new UnauthorizedException('User not found');
    }
    const password = await this.hashAuthHandler.generate(accountDto.password);
    await this.accountService.update(account.id, {
      password,
    });
    return !!confirm;
  }
}
