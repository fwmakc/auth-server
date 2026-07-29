import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { getKeySet } from "@src/jwks/keys";
import { AccountEntity } from "@src/account/account.entity";
import { UsersEntity } from "@src/db/users/users.entity";

@Injectable()
export class JwksService {
  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(AccountEntity)
    private readonly accountRepo: Repository<AccountEntity>,
    @InjectRepository(UsersEntity)
    private readonly usersRepo: Repository<UsersEntity>,
  ) {}

  getJwk() {
    return getKeySet().jwk;
  }

  getIssuer() {
    const port = this.configService.get("PORT") || "3001";
    const ip = this.configService.get("IP") || "localhost";
    return `http://${ip}:${port}`;
  }

  getOidcDiscovery() {
    const issuer = this.getIssuer();

    return {
      issuer,
      jwks_uri: `${issuer}/.well-known/jwks.json`,
      token_endpoint: `${issuer}/token`,
      userinfo_endpoint: `${issuer}/userinfo`,
      grant_types_supported: [
        "password",
        "refresh_token",
        "authorization_code",
        "client_credentials",
      ],
      token_endpoint_auth_methods_supported: [
        "client_secret_post",
        "client_secret_basic",
      ],
      response_types_supported: ["token", "code"],
      scopes_supported: ["openid", "profile", "email"],
      claims_supported: [
        "sub",
        "name",
        "given_name",
        "family_name",
        "middle_name",
        "preferred_username",
        "email",
        "email_verified",
        "phone",
        "picture",
        "birthdate",
        "locale",
        "zoneinfo",
        "address",
        "gender",
        "updated_at",
      ],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256"],
      token_endpoint_auth_signing_alg_values_supported: ["RS256"],
    };
  }

  async getUserinfo(accountId: number) {
    const account = await this.accountRepo.findOne({
      where: { id: accountId },
    });

    if (!account) {
      return { sub: String(accountId) };
    }

    const user = await this.usersRepo.findOne({
      where: { account: { id: accountId } },
    });

    const info: Record<string, any> = {
      sub: String(account.id),
      preferred_username: account.username,
      email: account.username,
      email_verified: account.isActivated,
    };

    if (user) {
      const parts = [user.name, user.lastName].filter(Boolean);
      if (parts.length) info.name = parts.join(" ");
      if (user.name) info.given_name = user.name;
      if (user.lastName) info.family_name = user.lastName;
      if (user.parentName) info.middle_name = user.parentName;
      if (user.phone) info.phone = user.phone;
      if (user.avatar) info.picture = user.avatar;
      if (user.birthday) info.birthdate = user.birthday.toISOString().split("T")[0];
      if (user.locale) info.locale = user.locale;
      if (user.timezone) info.zoneinfo = user.timezone;
      if (user.address) info.address = { formatted: user.address };
      if (user.gender) info.gender = user.gender;
    }

    if (account.updatedAt) {
      info.updated_at = Math.floor(account.updatedAt.getTime() / 1000);
    }

    return info;
  }
}
