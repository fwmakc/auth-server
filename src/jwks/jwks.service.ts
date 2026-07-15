import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { getKeySet } from "@src/jwks/keys";

@Injectable()
export class JwksService {
  constructor(private readonly configService: ConfigService) {}

  getJwk() {
    return getKeySet().jwk;
  }

  getOidcDiscovery() {
    const port = this.configService.get("PORT") || "3001";
    const ip = this.configService.get("IP") || "localhost";
    const issuer = `http://${ip}:${port}`;

    return {
      issuer,
      jwks_uri: `${issuer}/.well-known/jwks.json`,
      token_endpoint: `${issuer}/token`,
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
      scopes_supported: ["openid"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256"],
      token_endpoint_auth_signing_alg_values_supported: ["RS256"],
    };
  }
}
