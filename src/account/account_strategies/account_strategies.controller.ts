import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { Cookie } from "api-server-toolkit";
import { TokenService } from "@src/token/token.service";

import { AccountStrategiesService } from "./account_strategies.service";
import { OauthGuard } from "./guard/oauth.guard";
import { GoogleGuard } from "./guard/google.guard";
import { LeaderGuard } from "./guard/leader.guard";
import { UntiGuard } from "./guard/unti.guard";
import { LeaderProvider } from "./provider/leader.provider";
import { OauthProvider } from "./provider/oauth.provider";
import { UntiProvider } from "./provider/unti.provider";

import { AccountSessionsService } from "../account_sessions/account_sessions.service";
import { AccountDto } from "../account.dto";
import { Account, Self } from "api-server-toolkit";
import { OpenAccountService } from "../service/open.account.service";

@ApiTags("Стратегии авторизации")
@Controller("account/strategies")
export class AccountStrategiesController {
  constructor(
    private readonly accountStrategiesService: AccountStrategiesService,
    private readonly accountSessionsService: AccountSessionsService,
    private readonly tokenService: TokenService,
    private readonly leaderProvider: LeaderProvider,
    private readonly untiProvider: UntiProvider,
    private readonly oauthProvider: OauthProvider,
    private readonly openAccountService: OpenAccountService
  ) {}

  @Account()
  @Get("self")
  // @ApiExcludeEndpoint()
  async self(@Self() account: AccountDto) {
    const { id } = account;
    const result = await this.accountStrategiesService.find({}, { id });
    if (!result) {
      throw new NotFoundException("Entrie not found");
    }
    return result;
  }

  @Account()
  @Get("self/:name")
  // @ApiExcludeEndpoint()
  async selfByName(@Self() account: AccountDto, @Param("name") name: string) {
    const { id } = account;
    const where = { name };
    const result = await this.accountStrategiesService.find({ where }, { id });
    if (!result) {
      throw new NotFoundException("Entrie not found");
    }
    return result;
  }

  @Get("oauth/login")
  @UseGuards(OauthGuard)
  async oauthLogin() {
    return;
  }

  @Get("oauth/redirect")
  @Header("content-type", "application/json")
  // @UseGuards(OauthGuard)
  async oauthRedirect(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const profile = await this.oauthProvider.activate(req);
    if (!profile) {
      return profile;
    }
    const account = await this.oauthProvider.validate(profile);

    const cookie = new Cookie(req, res);
    const openAccountDto = cookie.getJson("query");

    if (openAccountDto?.response_type === "code") {
      const client = await this.openAccountService.verify(openAccountDto);
      const url = await this.openAccountService.code(
        client,
        account.id,
        openAccountDto.state
      );
      return await res.redirect(url);
    }

    const token = await this.tokenService.pair({ id: account.id });
    await this.accountSessionsService.start(account, req);
    delete account.password;
    return { account, token };
  }

  @Get("google/login")
  @UseGuards(GoogleGuard)
  async googleLogin() {
    return;
  }

  @Get("google/redirect")
  @UseGuards(GoogleGuard)
  async googleRedirect(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const { user: account } = req;

    const cookie = new Cookie(req, res);
    const openAccountDto = cookie.getJson("query");

    if (openAccountDto?.response_type === "code") {
      const client = await this.openAccountService.verify(openAccountDto);
      const url = await this.openAccountService.code(
        client,
        account.id,
        openAccountDto.state
      );
      return await res.redirect(url);
    }

    const token = await this.tokenService.pair({ id: account.id });
    await this.accountSessionsService.start(account, req);
    delete account.password;
    return { account, token };
  }

  @Get("leader/login")
  @UseGuards(LeaderGuard)
  async leaderLogin() {
    return;
  }

  @Get("leader/redirect")
  // @UseGuards(LeaderGuard)
  async leaderRedirect(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const profile = await this.leaderProvider.activate(req);
    if (!profile) {
      return profile;
    }
    const account = await this.leaderProvider.validate(profile);

    const cookie = new Cookie(req, res);
    const openAccountDto = cookie.getJson("query");

    if (openAccountDto?.response_type === "code") {
      const client = await this.openAccountService.verify(openAccountDto);
      const url = await this.openAccountService.code(
        client,
        account.id,
        openAccountDto.state
      );
      return await res.redirect(url);
    }

    const token = await this.tokenService.pair({ id: account.id });
    await this.accountSessionsService.start(account, req);
    // account.token = token;
    delete account.password;
    return { account, token };
  }

  @Get("2035/login")
  @UseGuards(UntiGuard)
  async untiLogin() {
    return;
  }

  @Get("2035/redirect")
  // @UseGuards(UntiGuard)
  async untiRedirect(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const profile = await this.untiProvider.activate(req);
    if (!profile) {
      return profile;
    }
    const account = await this.untiProvider.validate(profile);

    const cookie = new Cookie(req, res);
    const openAccountDto = cookie.getJson("query");

    if (openAccountDto?.response_type === "code") {
      const client = await this.openAccountService.verify(openAccountDto);
      const url = await this.openAccountService.code(
        client,
        account.id,
        openAccountDto.state
      );
      return await res.redirect(url);
    }

    const token = await this.tokenService.pair({ id: account.id });
    await this.accountSessionsService.start(account, req);
    // account.token = token;
    delete account.password;
    return { account, token };
  }
}
