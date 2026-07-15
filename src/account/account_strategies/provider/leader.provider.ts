import axios from 'axios';
import { Injectable } from '@nestjs/common';
import { AccountDto } from '@src/account/account.dto';
import { AccountService } from '@src/account/account.service';
import { AccountStrategiesService } from '@src/account/account_strategies/account_strategies.service';
import { ConfigService } from '@nestjs/config';

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
    return axios
      .post('https://apps.leader-id.ru/api/v1/oauth/token', {
        grant_type: 'authorization_code',
        code: token,
        client_id: this.configService.get('LEADER_CLIENT_ID'),
        client_secret: this.configService.get('LEADER_CLIENT_SECRET'),
      })
      .then((r) => r.data)
      .catch((e) => {
        console.error(e);
      });
  }

  async getUser(userId: string, accessToken: string): Promise<any> {
    return axios
      .get(`https://apps.leader-id.ru/api/v1/users/${userId}`, {
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
      isActivated: !!(profile.emailConfirmed || profile.phoneConfirmed),
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
      name: 'leaderid',
      uid: profile.id,
      json: profile,
      accessToken: profile.accessToken,
      refreshToken: profile.refreshToken,
    });
    return account;
  }
}
