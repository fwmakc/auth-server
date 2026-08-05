import { Injectable } from "@nestjs/common";
import { GrantsTokenDto } from "@src/token/dto/grants.token.dto";

import { AuthorizationCodeGrant } from "@src/token/grant/authorization_code.grant";
import { ClientCredentialsGrant } from "@src/token/grant/client_credentials.grant";
import { PasswordGrant } from "@src/token/grant/password.grant";
import { RefreshTokenGrant } from "@src/token/grant/refresh_token.grant";
import { KeyGrant } from "@src/token/grant/key.grant";
import { DbRefreshStore } from "@src/token/store";

@Injectable()
export class GrantsTokenService {
  constructor(
    private readonly authorizationCodeGrant: AuthorizationCodeGrant,
    private readonly clientCredentialsGrant: ClientCredentialsGrant,
    private readonly keyGrant: KeyGrant,
    private readonly passwordGrant: PasswordGrant,
    private readonly refreshTokenGrant: RefreshTokenGrant,
    private readonly refreshStore: DbRefreshStore
  ) {}

  async authorizationCode(grantsTokenDto: GrantsTokenDto): Promise<any> {
    return await this.authorizationCodeGrant.authorizationCode(grantsTokenDto);
  }

  async clientCredentials(grantsTokenDto: GrantsTokenDto): Promise<any> {
    return await this.clientCredentialsGrant.clientCredentials(grantsTokenDto);
  }

  async key(grantsTokenDto: GrantsTokenDto, request, response): Promise<any> {
    return await this.keyGrant.key(grantsTokenDto, request, response);
  }

  async password(
    grantsTokenDto: GrantsTokenDto,
    request,
    response
  ): Promise<any> {
    return await this.passwordGrant.password(grantsTokenDto, request, response);
  }

  async refreshToken(grantsTokenDto: GrantsTokenDto): Promise<any> {
    return await this.refreshTokenGrant.refreshToken(grantsTokenDto);
  }

  async revoke(token: string): Promise<any> {
    await this.refreshStore.revoke(token);
    return { success: true };
  }

  async revokeAll(accountId: number): Promise<any> {
    await this.refreshStore.revokeAll(accountId);
    return { success: true };
  }
}
