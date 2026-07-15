import { Injectable } from "@nestjs/common";
import { AccountDto } from "@src/account/account.dto";
import { GrantsTokenDto } from "@src/token/dto/grants.token.dto";
import { ConfigService } from "@nestjs/config";
import { MethodsAccountService } from "./methods.account.service";

@Injectable()
export class FormsAccountService {
  constructor(
    private readonly configService: ConfigService,
    protected readonly methodsAccountService: MethodsAccountService
  ) {}

  async change(accountDto: AccountDto, code: string, req, res): Promise<any> {
    const result = await this.methodsAccountService.change(
      accountDto,
      code,
      req,
      res
    );
    if (!result?.success) {
      const errorPrepared = await this.prepareRedirectError(result);
      const url = this.configService.get("FORM_CHANGE");
      return await res.redirect(`${url}${errorPrepared}`);
    }
    const url = this.configService.get("FORM_CHANGE_COMPLETE");
    return await res.redirect(url);
  }

  async confirm(code: string, req, res): Promise<any> {
    const result = await this.methodsAccountService.confirm(code, req, res);
    if (!result?.success) {
      const errorPrepared = await this.prepareRedirectError(result);
      const url = this.configService.get("FORM_CONFIRM");
      return await res.redirect(`${url}${errorPrepared}`);
    }
    const url = this.configService.get("FORM_CONFIRM_COMPLETE");
    return await res.redirect(url);
  }

  async login(
    grantsTokenDto: GrantsTokenDto,
    response_type: string,
    req,
    res
  ): Promise<any> {
    const result = await this.methodsAccountService.login(
      grantsTokenDto,
      req,
      res
    );
    if (!result?.success) {
      const errorPrepared = await this.prepareRedirectError(result);
      const url = this.configService.get("FORM_LOGIN");
      return await res.redirect(`${url}${errorPrepared}`);
    }
    if (!response_type) {
      return result;
    }
    const { headers, protocol } = req;
    const prefix = this.configService.get("PREFIX");
    const { redirect_uri, client_id } = grantsTokenDto;
    const url = `/account?client_id=${client_id}&response_type=${response_type}&redirect_uri=${redirect_uri}`;
    return await res.redirect(`${protocol}://${headers.host}${prefix}${url}`);
  }

  async logout(req, res): Promise<any> {
    const result = await this.methodsAccountService.logout(req, res);
    if (!result?.success) {
      const errorPrepared = await this.prepareRedirectError(result);
      const url = this.configService.get("FORM_LOGIN");
      return await res.redirect(`${url}${errorPrepared}`);
    }
    const url = this.configService.get("FORM_LOGIN");
    return await res.redirect(url);
  }

  async register(
    accountDto: AccountDto,
    subject: string,
    req,
    res
  ): Promise<any> {
    const result = await this.methodsAccountService.register(
      accountDto,
      subject,
      req,
      res
    );
    if (!result?.success) {
      const errorPrepared = await this.prepareRedirectError(result);
      const url = this.configService.get("FORM_REGISTER");
      return await res.redirect(`${url}${errorPrepared}`);
    }
    const url = this.configService.get("FORM_REGISTER_COMPLETE");
    return await res.redirect(url);
  }

  async reset(accountDto: AccountDto, subject: string, req, res): Promise<any> {
    const result = await this.methodsAccountService.reset(
      accountDto,
      subject,
      req,
      res
    );
    if (!result?.success) {
      const errorPrepared = await this.prepareRedirectError(result);
      const url = this.configService.get("FORM_RESET");
      return await res.redirect(`${url}${errorPrepared}`);
    }
    const url = this.configService.get("FORM_RESET_COMPLETE");
    return await res.redirect(url);
  }

  async prepareRedirectError(error = undefined) {
    if (!error) {
      error = {
        error: "Bad request",
        message: "Unknown error",
      };
    }
    const errorArray = [];
    for (const [key, value] of Object.entries({ ...error })) {
      errorArray.push(`${key}=${encodeURI(`${value}`)}`);
    }
    return `?${errorArray.join("&")}`;
  }
}
