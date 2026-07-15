import axios from "axios";
import { Injectable } from "@nestjs/common";
import { AccountDto } from "@src/account/account.dto";
import { AccountService } from "@src/account/account.service";
import { AccountStrategiesService } from "@src/account/account_strategies/account_strategies.service";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class UntiProvider {
  constructor(
    private readonly accountService: AccountService,
    private readonly configService: ConfigService,
    private readonly strategiesService: AccountStrategiesService
  ) {}

  async activate(request): Promise<any> {
    const token = request?.query?.code;

    if (!token) {
      return null;
    }

    const res = await this.getToken(token);
    const user = res.access_token
      ? await this.getUser(res.access_token)
      : undefined;
    return {
      ...user,
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
    };
  }

  async getToken(token: string): Promise<any> {
    return axios
      .post(
        "https://sso.2035.university/oauth2/access_token",
        {
          grant_type: "authorization_code",
          code: token,
          client_id: this.configService.get("UNTI_CLIENT_ID"),
          client_secret: this.configService.get("UNTI_CLIENT_SECRET"),
          redirect_uri: this.configService.get("UNTI_CLIENT_REDIRECT"),
        },
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      )
      .then((r) => r.data)
      .catch((e) => {
        console.error(e);
      });
  }

  async getUser(accessToken: string): Promise<any> {
    return axios
      .get("https://sso.2035.university/users/me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      .then((r) => r.data)
      .catch((e) => {
        console.error(e);
      });
  }

  async validate(profile) {
    const account = await this.accountService.findByUsername(profile.email);

    const accountDto: AccountDto = {
      username: profile.email,
      isActivated: true,
    };

    if (!account) {
      return await this.accountService
        .create(accountDto)
        .then(async (result) => await this.prepareResult(result, profile));
    }

    return await this.accountService
      .update(account.id, accountDto)
      .then(async (result) => await this.prepareResult(result, profile));
  }

  async prepareResult(account, profile): Promise<AccountDto> {
    await this.strategiesService.updateBy({
      account: { id: account.id },
      name: "unti",
      uid: profile.unti_id,
      json: profile,
      accessToken: profile.accessToken,
      refreshToken: profile.refreshToken,
    });

    return account;
  }
}
