import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Strategy } from 'passport-oauth2';
import { AccountService } from '@src/account/account.service';
import { AccountDto } from '@src/account/account.dto';
import { AccountStrategiesService } from '@src/account/account_strategies/account_strategies.service';
// import { OauthProvider } from '@src/account/account_strategies/provider/oauth.provider';

import axios from 'axios';
// import { Request } from 'express';

@Injectable()
export class OauthStrategy extends PassportStrategy(Strategy, 'oauth') {
  constructor(
    private readonly configService: ConfigService,
    private readonly accountService: AccountService,
    private readonly accountStrategiesService: AccountStrategiesService, // private readonly oauthProvider: OauthProvider,
  ) {
    const clientID = configService.get('OAUTH_CLIENT_ID');
    const clientSecret = configService.get('OAUTH_CLIENT_SECRET');
    const callbackURL = configService.get('OAUTH_CLIENT_REDIRECT');
    const customAccountServer = configService.get('OAUTH_SERVER');
    const authorizationURL = `${customAccountServer}/account/?client_id=${clientID}&redirect_uri=${callbackURL}&response_type=code`;
    const tokenURL = `${customAccountServer}/token`;

    super({
      clientID,
      clientSecret,
      authorizationURL,
      tokenURL,
      callbackURL,
      // scope: ['profile', 'email'],
    });
  }

  async validate(accessToken: string, refreshToken: string) {
    const customAccountServer = this.configService.get('OAUTH_SERVER');

    const profile = await axios
      .get(`${customAccountServer}/account/self`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
      .then((r) => r.data);

    const account = await this.accountService.findByUsername(profile.username);

    const accountDto: AccountDto = {
      username: profile.username,
      isActivated: !!profile.isActivated,
    };

    if (!account) {
      return await this.accountService
        .create(accountDto)
        .then(
          async (result) =>
            await this.prepareResult(
              result,
              profile.id,
              profile.users,
              accessToken,
              refreshToken,
            ),
        );
    }

    return await this.accountService
      .update(account.id, accountDto)
      .then(
        async (result) =>
          await this.prepareResult(
            result,
            profile.id,
            profile.users,
            accessToken,
            refreshToken,
          ),
      );
  }

  async prepareResult(
    account,
    uid,
    profile,
    accessToken,
    refreshToken,
  ): Promise<AccountDto> {
    await this.accountStrategiesService.updateBy({
      account: { id: account.id },
      name: 'oauth',
      uid,
      json: profile,
      accessToken,
      refreshToken,
      // json: JSON.stringify(profile),
    });

    return account;
  }
}
