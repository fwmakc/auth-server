import { httpPost, httpGet } from "api-server-toolkit";
import { Injectable, BadRequestException } from "@nestjs/common";
import { AccountDto } from "@src/account/account.dto";
import { AccountService } from "@src/account/account.service";
import { AccountStrategiesService } from "@src/account/account_strategies/account_strategies.service";
import { ConfigService } from "@nestjs/config";

interface OAuthTokenResponse {
  access_token?: string;
  refresh_token?: string;
}

interface OAuthProfile {
  id?: number;
  username: string;
  isActivated?: boolean;
  users?: unknown;
}

@Injectable()
export class OauthProvider {
  constructor(
    private readonly accountService: AccountService,
    private readonly configService: ConfigService,
    private readonly strategiesService: AccountStrategiesService,
  ) {}

  async activate(request): Promise<any> {
    const code = request?.query?.code;

    if (!code) {
      return null;
    }

    const res = await this.getToken(code);
    const user = res?.access_token
      ? await this.getUser(res.access_token, res.refresh_token)
      : undefined;
    return {
      ...user,
      accessToken: res?.access_token,
      refreshToken: res?.refresh_token,
    };
  }

  async getToken(code: string): Promise<OAuthTokenResponse | undefined> {
    const customAccountServer = this.configService.get("OAUTH_SERVER");
    const redirect_uri = this.configService.get("OAUTH_CLIENT_REDIRECT");
    const client_id = this.configService.get("OAUTH_CLIENT_ID");

    try {
      const { data } = await httpPost<OAuthTokenResponse>(
        `${customAccountServer}/token`,
        {
          grant_type: "authorization_code",
          code,
          client_id,
          redirect_uri,
        },
      );
      return data;
    } catch (e) {
      console.error(e);
    }
  }

  async getUser(
    accessToken: string,
    refreshToken: string,
  ): Promise<OAuthProfile | undefined> {
    const customAccountServer = this.configService.get("OAUTH_SERVER");

    try {
      const { data } = await httpGet<OAuthProfile>(
        `${customAccountServer}/account/self`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
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

    const userData = profile?.users;
    const { accessToken, refreshToken } = profile;

    if (!account) {
      return await this.accountService
        .create({
          username: profile.username,
          isActivated: !!profile.isActivated,
        })
        .then(
          async (result) =>
            await this.prepareResult(
              result,
              userData,
              accessToken,
              refreshToken,
            ),
        );
    }

    // Existing accounts keep their activation state: the local confirmation
    // flow owns it, an OAuth login must not flip it.
    return await this.prepareResult(
      account,
      userData,
      accessToken,
      refreshToken,
    );
  }

  async prepareResult(
    result,
    userData,
    accessToken,
    refreshToken,
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
