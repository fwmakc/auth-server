import { Injectable } from "@nestjs/common";
import { TypeGrants } from "@src/common/common.enum";
import { ChangeAccountHandler } from "@src/account/handler/change.account.handler";
import { ConfirmAccountHandler } from "@src/account/handler/confirm.account.handler";
import { HashAccountHandler } from "@src/account/handler/hash.account.handler";
import { LogoutAccountHandler } from "@src/account/handler/logout.account.handler";
import { RegisterAccountHandler } from "@src/account/handler/register.account.handler";
import { ResetAccountHandler } from "@src/account/handler/reset.account.handler";
import { AccountDto } from "@src/account/account.dto";
import { GrantsTokenDto } from "@src/token/dto/grants.token.dto";
import { GrantsTokenService } from "@src/token/service/grants.token.service";
import { OpenAccountService } from "./open.account.service";

@Injectable()
export class MethodsAccountService {
  constructor(
    protected readonly changeAuthHandler: ChangeAccountHandler,
    protected readonly confirmAuthHandler: ConfirmAccountHandler,
    protected readonly hashAuthHandler: HashAccountHandler,
    protected readonly logoutAuthHandler: LogoutAccountHandler,
    protected readonly registerAuthHandler: RegisterAccountHandler,
    protected readonly resetAuthHandler: ResetAccountHandler,
    protected readonly grantsTokenService: GrantsTokenService,
    protected readonly openAccountService: OpenAccountService
  ) {}

  async change(accountDto: AccountDto, code: string, req, res): Promise<any> {
    let error;
    const result = await this.changeAuthHandler
      .change(accountDto, code)
      .catch((e) => {
        error = e?.response;
      });
    if (!result) {
      return error;
    }
    return { success: true };
  }

  async confirm(code: string, req, res): Promise<any> {
    let error = {
      error: "Bad request",
      message: "Invalid confirm code",
    };
    const result = await this.confirmAuthHandler.confirm(code).catch((e) => {
      error = e?.response;
    });
    if (!result) {
      return error;
    }
    return { success: true };
  }

  async login(grantsTokenDto: GrantsTokenDto, req, res): Promise<any> {
    let error = {
      error: "Unauthorized",
      message: "Unknown error",
    };
    grantsTokenDto.grant_type = TypeGrants.PASSWORD;
    const token = await this.grantsTokenService
      .password(grantsTokenDto, req, res)
      .catch((e) => {
        error = e?.response;
      });
    if (!token) {
      return error;
    }
    return { success: true, ...token };
  }

  async logout(req, res): Promise<any> {
    let error;
    const result = await this.logoutAuthHandler.logout(req).catch((e) => {
      error = e?.response;
    });
    if (!result) {
      return error;
    }
    return { success: true };
  }

  async register(
    accountDto: AccountDto,
    subject: string,
    req,
    res
  ): Promise<any> {
    let error;
    const account = await this.registerAuthHandler
      .authCreate(accountDto)
      .catch((e) => {
        error = e?.response;
      });
    if (!account) {
      return error;
    }
    if (!account.isActivated) {
      await this.registerAuthHandler.sendMail(account, subject);
    }
    return { success: true };
  }

  async reset(accountDto: AccountDto, subject: string, req, res): Promise<any> {
    let error;
    const confirm = await this.resetAuthHandler
      .confirmCreate(accountDto)
      .catch((e) => {
        error = e?.response;
      });
    if (!confirm?.code) {
      return error;
    }
    await this.resetAuthHandler.sendMail(
      accountDto.username,
      subject,
      confirm.code
    );
    return { success: true };
  }

  async hash(string: string): Promise<any> {
    const hashedString = await this.hashAuthHandler.generate(string);
    return {
      success: true,
      hash: hashedString,
    };
  }
}
