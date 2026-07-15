import { Body, Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { AccountDto } from '@src/account/account.dto';
import { ApiTags } from '@nestjs/swagger';
import { Account } from '@src/account/account.decorator';
import { CommonDoc } from '@src/common/common.doc';
import { FormsAccountService } from '@src/account/service/forms.account.service';
import { GrantsTokenDto } from '@src/token/dto/grants.token.dto';

@ApiTags('Авторизация через формы')
@Controller('account')
export class FormsAccountController {
  constructor(private readonly formsAccountService: FormsAccountService) {}

  @Post('change/:code')
  @CommonDoc({
    title: 'Смена пароля пользователя',
    models: [],
    params: [
      {
        name: 'code',
        required: true,
        description: 'Код подтверждения',
      },
    ],
    queries: [
      {
        name: 'accountDto',
        required: true,
        description: 'Объект полей регистрации',
        type: '[AccountDto]',
        example: [{ password: '...' }],
      },
    ],
  })
  async change(
    @Body() accountDto: AccountDto,
    @Param('code') code: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    return await this.formsAccountService.change(accountDto, code, req, res);
  }

  @Get('confirm/:code')
  @CommonDoc({
    title: 'Подтверждение регистрации и активация учетной записи',
    models: [],
    params: [
      {
        name: 'code',
        required: true,
        description: 'Код подтверждения',
      },
    ],
  })
  async confirm(
    @Param('code') code: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    return await this.formsAccountService.confirm(code, req, res);
  }

  @Post('login')
  @CommonDoc({
    title: 'Авторизация',
    models: [],
    queries: [
      {
        name: 'accountDto',
        required: true,
        description: 'Объект полей авторизации',
        type: '[AccountDto]',
        example: { username: '...', password: '...' },
      },
    ],
  })
  async login(
    @Body() grantsTokenDto: GrantsTokenDto,
    @Body('response_type') response_type: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    return await this.formsAccountService.login(
      grantsTokenDto,
      response_type,
      req,
      res,
    );
  }

  @Account()
  @Post('logout')
  @CommonDoc({
    title: 'Выход',
    models: [],
  })
  async logout(@Req() req: any, @Res({ passthrough: true }) res: any) {
    return await this.formsAccountService.logout(req, res);
  }

  @Post('register')
  @CommonDoc({
    title: 'Регистрация',
    models: [],
    queries: [
      {
        name: 'accountDto',
        required: true,
        description: 'Объект полей регистрации',
        type: '[AccountDto]',
        example: { username: '...', password: '...' },
      },
    ],
  })
  async register(
    @Body() accountDto: AccountDto,
    @Body('subject') subject: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    return await this.formsAccountService.register(
      accountDto,
      subject,
      req,
      res,
    );
  }

  @Post('reset')
  @CommonDoc({
    title: 'Запрос на сброс пароля пользователя',
    models: [],
    queries: [
      {
        name: 'accountDto',
        required: true,
        description: 'Объект полей регистрации',
        type: '[AccountDto]',
        example: [{ username: '...' }],
      },
    ],
  })
  async reset(
    @Body() accountDto: AccountDto,
    @Body('subject') subject: string,
    @Req() req: any,
    @Res({ passthrough: true }) res: any,
  ) {
    return await this.formsAccountService.reset(accountDto, subject, req, res);
  }
}
