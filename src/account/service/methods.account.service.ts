import { Injectable, Inject } from "@nestjs/common";
import { TypeGrants, IEventClient, AuditService } from "api-server-toolkit";
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
    @Inject(IEventClient) protected readonly eventClient: IEventClient,
    protected readonly audit: AuditService,
  ) {}

  async change(accountDto: AccountDto, code: string, req, res): Promise<any> {
    try {
      await this.changeAuthHandler.change(accountDto, code);
    } catch (e) {
      this.audit.log({
        action: "auth.password.change",
        outcome: "failure",
        accountUsername: accountDto.username,
        ip: req?.ip,
        userAgent: req?.headers?.["user-agent"],
        details: { reason: e?.message },
      });
      throw e;
    }
    this.audit.log({
      action: "auth.password.change",
      outcome: "success",
      accountUsername: accountDto.username,
      ip: req?.ip,
      userAgent: req?.headers?.["user-agent"],
    });
    return { success: true };
  }

  async confirm(code: string, req, res): Promise<any> {
    const account = await this.confirmAuthHandler.confirm(code);
    if (!account) {
      this.audit.log({
        action: "auth.confirm.failed",
        outcome: "failure",
        ip: req?.ip,
        userAgent: req?.headers?.["user-agent"],
      });
      return { success: false, message: "Invalid confirm code" };
    }
    this.audit.log({
      action: "auth.confirm.success",
      accountId: Number(account.id),
      accountUsername: account.username,
      ip: req?.ip,
      userAgent: req?.headers?.["user-agent"],
    });
    this.eventClient.publish("user.confirmed", {
      userId: Number(account.id),
      username: account.username,
      email: account.username,
    });
    return { success: true };
  }

  async login(grantsTokenDto: GrantsTokenDto, req, res): Promise<any> {
    grantsTokenDto.grant_type = TypeGrants.PASSWORD;
    const token = await this.grantsTokenService.password(
      grantsTokenDto,
      req,
      res,
    );
    return { success: true, ...token };
  }

  async logout(req, res): Promise<any> {
    await this.logoutAuthHandler.logout(req);
    this.audit.log({
      action: "auth.logout",
      accountId: Number(req?.user?.id),
      accountUsername: req?.user?.username,
      ip: req?.ip,
      userAgent: req?.headers?.["user-agent"],
    });
    return { success: true };
  }

  async register(
    accountDto: AccountDto,
    subject: string,
    req,
    res,
  ): Promise<any> {
    let account;
    try {
      account = await this.registerAuthHandler.authCreate(accountDto);
    } catch (e) {
      this.audit.log({
        action: "auth.register",
        outcome: "failure",
        accountUsername: accountDto.username,
        ip: req?.ip,
        userAgent: req?.headers?.["user-agent"],
        details: { reason: e?.message },
      });
      throw e;
    }
    this.audit.log({
      action: "auth.register",
      accountId: Number(account.id),
      accountUsername: account.username,
      ip: req?.ip,
      userAgent: req?.headers?.["user-agent"],
    });
    if (!account.isActivated) {
      const confirmUrl = await this.registerAuthHandler.sendMail(account);
      this.eventClient.publish("user.registered", {
        userId: Number(account.id),
        username: account.username,
        email: account.username,
        subject,
        confirmUrl,
      });
    } else {
      this.eventClient.publish("user.registered", {
        userId: Number(account.id),
        username: account.username,
        email: account.username,
      });
    }
    return { success: true };
  }

  async reset(accountDto: AccountDto, subject: string, req, res): Promise<any> {
    try {
      const confirm = await this.resetAuthHandler.confirmCreate(accountDto);
      const resetUrl = await this.resetAuthHandler.sendMail(
        accountDto.username,
        confirm.code,
      );
      this.audit.log({
        action: "auth.password.reset_requested",
        accountUsername: accountDto.username,
        ip: req?.ip,
        userAgent: req?.headers?.["user-agent"],
      });
      this.eventClient.publish("password.reset", {
        username: accountDto.username,
        email: accountDto.username,
        subject,
        resetUrl,
      });
      return { success: true };
    } catch (e) {
      this.audit.log({
        action: "auth.password.reset_requested",
        outcome: "failure",
        accountUsername: accountDto.username,
        ip: req?.ip,
        userAgent: req?.headers?.["user-agent"],
        details: { reason: e?.message },
      });
      throw e;
    }
  }

  async deactivate(password: string, req, res): Promise<any> {
    try {
      const account = await this.deactivateAuthHandler.deactivate(
        req.user,
        password,
        req,
        res,
      );
      this.audit.log({
        action: "auth.account.deactivated",
        accountId: Number(account.id),
        accountUsername: account.username,
        ip: req?.ip,
        userAgent: req?.headers?.["user-agent"],
      });
      this.eventClient.publish("user.deactivated", {
        userId: Number(account.id),
        username: account.username,
        email: account.username,
      });
      return { success: true };
    } catch (e) {
      this.audit.log({
        action: "auth.account.deactivated",
        outcome: "failure",
        accountId: Number(req?.user?.id),
        accountUsername: req?.user?.username,
        ip: req?.ip,
        userAgent: req?.headers?.["user-agent"],
        details: { reason: e?.message },
      });
      throw e;
    }
  }

  async delete(targetUserId: number, req, res): Promise<any> {
    const account = await this.deleteAuthHandler.delete(targetUserId, req);
    this.audit.log({
      action: "auth.account.deleted",
      accountId: Number(req?.user?.id),
      accountUsername: req?.user?.username,
      ip: req?.ip,
      userAgent: req?.headers?.["user-agent"],
      targetType: "account",
      targetId: Number(account.id),
      details: { deletedUsername: account.username },
    });
    this.eventClient.publish("user.deleted", {
      userId: Number(account.id),
      username: account.username,
      email: account.username,
    });
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
