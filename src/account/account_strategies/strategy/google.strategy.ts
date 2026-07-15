import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { Profile, Strategy } from 'passport-google-oauth20';
import { AccountService } from '@src/account/account.service';
import { AccountDto } from '@src/account/account.dto';
import { AccountStrategiesService } from '@src/account/account_strategies/account_strategies.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly accountService: AccountService,
    private readonly strategiesService: AccountStrategiesService,
  ) {
    super({
      clientID: configService.get('GOOGLE_CLIENT_ID'),
      clientSecret: configService.get('GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get('GOOGLE_CLIENT_REDIRECT'),
      scope: ['profile', 'email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    const data = profile._json;
    const account = await this.accountService.findByUsername(data.email);

    const accountDto: AccountDto = {
      username: data.email,
      isActivated: !!data.email_verified,
    };

    if (!account) {
      return await this.accountService
        .create(accountDto)
        .then(
          async (result) =>
            await this.prepareResult(
              result,
              profile,
              accessToken,
              refreshToken,
            ),
        );
    }

    return await this.accountService
      .update(account.id, accountDto)
      .then(
        async (result) =>
          await this.prepareResult(result, profile, accessToken, refreshToken),
      );
  }

  async prepareResult(
    account,
    profile,
    accessToken,
    refreshToken,
  ): Promise<AccountDto> {
    const data = profile._json;
    await this.strategiesService.updateBy({
      account: { id: account.id },
      name: profile.provider,
      uid: profile.id,
      json: data,
      accessToken,
      refreshToken,
    });

    return account;
  }
}
