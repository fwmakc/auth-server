import { Injectable, Inject } from "@nestjs/common";
import { TypeGrants, IEventClient } from "api-server-toolkit";
import {
  UserRegisteredDto,
  UserConfirmedDto,
  PasswordResetDto,
  UserDeactivatedDto,
  UserDeletedDto,
} from "event-server/contracts";
import { ChangeAccountHandler } from "@src/account/handler/change.account.handler";
import { ConfirmAccountHandler } from "@src/account/handler/confirm.account.handler";
import { DeactivateAccountHandler } from "@src/account/handler/deactivate.account.handler";
import { DeleteAccountHandler } from "@src/account/handler/delete.account.handler";
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
    protected readonly deactivateAuthHandler: DeactivateAccountHandler,
    protected readonly deleteAuthHandler: DeleteAccountHandler,
    protected readonly hashAuthHandler: HashAccountHandler,
    protected readonly logoutAuthHandler: LogoutAccountHandler,
    protected readonly registerAuthHandler: RegisterAccountHandler,
    protected readonly resetAuthHandler: ResetAccountHandler,
    protected readonly grantsTokenService: GrantsTokenService,
    protected readonly openAccountService: OpenAccountService,
    @Inject(IEventClient) protected readonly eventClient: IEventClient
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
    const account = await this.confirmAuthHandler.confirm(code).catch((e) => {
      error = e?.response;
    });
    if (!account) {
      return error;
    }
    this.eventClient.publish("user.confirmed", {
      userId: account.id,
      username: account.username,
      email: account.username,
    } as UserConfirmedDto);
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
      const confirmUrl = await this.registerAuthHandler.sendMail(account);
      this.eventClient.publish("user.registered", {
        userId: account.id,
        username: account.username,
        email: account.username,
        subject,
        confirmUrl,
      } as UserRegisteredDto);
    } else {
      this.eventClient.publish("user.registered", {
        userId: account.id,
        username: account.username,
        email: account.username,
      } as UserRegisteredDto);
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
    const resetUrl = await this.resetAuthHandler.sendMail(
      accountDto.username,
      confirm.code
    );
    this.eventClient.publish("password.reset", {
      username: accountDto.username,
      email: accountDto.username,
      subject,
      resetUrl,
    } as PasswordResetDto);
    return { success: true };
  }

  async deactivate(password: string, req, res): Promise<any> {
    let error;
    const account = await this.deactivateAuthHandler
      .deactivate(req.user, password, req, res)
      .catch((e) => {
        error = e?.response;
      });
    if (!account) {
      return error;
    }
    this.eventClient.publish("user.deactivated", {
      userId: account.id,
      username: account.username,
      email: account.username,
    } as UserDeactivatedDto);
    return { success: true };
  }

  async delete(targetUserId: number, req, res): Promise<any> {
    let error;
    const account = await this.deleteAuthHandler
      .delete(targetUserId, req)
      .catch((e) => {
        error = e?.response;
      });
    if (!account) {
      return error;
    }
    this.eventClient.publish("user.deleted", {
      userId: account.id,
      username: account.username,
      email: account.username,
    } as UserDeletedDto);
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
