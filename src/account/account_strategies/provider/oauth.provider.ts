import { httpPost, httpGet } from "api-server-toolkit";
import { Injectable, BadRequestException } from "@nestjs/common";
import { AccountDto } from "@src/account/account.dto";
import { AccountService } from "@src/account/account.service";
import { AccountStrategiesService } from "@src/account/account_strategies/account_strategies.service";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class OauthProvider {
  constructor(
    private readonly accountService: AccountService,
    private readonly configService: ConfigService,
    private readonly strategiesService: AccountStrategiesService
  ) {}

  async activate(request): Promise<any> {
    const code = request?.query?.code;

    if (!code) {
      return null;
    }

    const res = await this.getToken(code);
    const user = res.access_token
      ? await this.getUser(res.access_token, res.refresh_token)
      : undefined;
    return {
      ...user,
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
    };
  }

  async getToken(code: string) {
    const customAccountServer = this.configService.get("OAUTH_SERVER");
    const redirect_uri = this.configService.get("OAUTH_CLIENT_REDIRECT");
    const client_id = this.configService.get("OAUTH_CLIENT_ID");

    try {
      const { data } = await httpPost(`${customAccountServer}/token`, {
        grant_type: "authorization_code",
        code,
        client_id,
        redirect_uri,
      });
      return data;
    } catch (e) {
      console.error(e);
    }
  }

  async getUser(accessToken: string, refreshToken: string): Promise<any> {
    const customAccountServer = this.configService.get("OAUTH_SERVER");

    try {
      const { data } = await httpGet(`${customAccountServer}/account/self`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      return data;
    } catch (e) {
      console.error(e);
    }
  }

  async validate(profile) {
    if (!profile.isActivated) {
      throw new BadRequestException("Account not activated on OAuth server");
    }

    const account = await this.accountService.findByUsername(profile.username);

    const accountDto: AccountDto = {
      username: profile.username,
      isActivated: !!profile.isActivated,
    };

    const userData = profile?.users;
    const { accessToken, refreshToken } = profile;

    if (!account) {
      return await this.accountService
        .create(accountDto)
        .then(
          async (result) =>
            await this.prepareResult(
              result,
              userData,
              accessToken,
              refreshToken
            )
        );
    }

    return await this.accountService
      .update(account.id, accountDto)
      .then(
        async (result) =>
          await this.prepareResult(result, userData, accessToken, refreshToken)
      );
  }

  async prepareResult(
    result,
    userData,
    accessToken,
    refreshToken
  ): Promise<AccountDto> {
    await this.strategiesService.updateBy({
      account: { id: result.id },
      name: "oauthid",
      uid: result.id,
      json: userData,
      accessToken,
      refreshToken,
    });

    return result;
  }
}
