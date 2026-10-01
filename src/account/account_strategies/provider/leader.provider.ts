import { httpPost, httpGet } from "api-server-toolkit";
import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { AccountDto } from "@src/account/account.dto";
import { AccountService } from "@src/account/account.service";
import { AccountStrategiesService } from "@src/account/account_strategies/account_strategies.service";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class LeaderProvider {
  constructor(
    private readonly accountService: AccountService,
    private readonly configService: ConfigService,
    private readonly strategiesService: AccountStrategiesService,
  ) {}

  async activate(request): Promise<any> {
    const token = request?.query?.code;

    if (!token) {
      return null;
    }

    const res = await this.getToken(token);
    const user = res.user_id
      ? await this.getUser(res.user_id, res.access_token)
      : undefined;
    return {
      ...user,
      accessToken: res.access_token,
      refreshToken: res.refresh_token,
    };
  }

  async getToken(token: string): Promise<any> {
    try {
      const { data } = await httpPost(
        "https://apps.leader-id.ru/api/v1/oauth/token",
        {
          grant_type: "authorization_code",
          code: token,
          client_id: this.configService.get("LEADER_CLIENT_ID"),
          client_secret: this.configService.get("LEADER_CLIENT_SECRET"),
        },
      );
      return data;
    } catch (e) {
      console.error(e);
    }
  }

  async getUser(userId: string, accessToken: string): Promise<any> {
    try {
      const { data } = await httpGet(
        `https://apps.leader-id.ru/api/v1/users/${userId}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      return data;
    } catch (e) {
      console.error(e);
    }
  }

  async validate(profile) {
    // Username IS email in this system: a phone-confirmed Leader-ID profile
    // says nothing about the email — linking/creating an email-named account
    // on phone confirmation alone is account takeover of that address.
    if (!profile.emailConfirmed) {
      throw new BadRequestException("Email not verified by Leader-ID");
    }

    const account = await this.accountService.findByUsername(profile.email);

    if (!account) {
      return await this.accountService
        .create({ username: profile.email, isActivated: true })
        .then(async (result) => await this.prepareResult(result, profile));
    }

    // Existing accounts keep their activation state: an OAuth login must not
    // confirm an account that never completed the local email confirmation.
    return await this.prepareResult(account, profile);
  }

  async prepareResult(account, profile): Promise<AccountDto> {
    await this.strategiesService.updateBy({
      account: { id: account.id },
      name: "leaderid",
      uid: profile.id,
      json: profile,
      accessToken: profile.accessToken,
      refreshToken: profile.refreshToken,
    });
    return account;
  }
}
