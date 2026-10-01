import { ConfigService } from "@nestjs/config";
import { JwtModuleOptions } from "@nestjs/jwt";
import { getKeySet } from "@src/jwks/keys";

export const getJwtConfig = async (
  ConfigService: ConfigService,
): Promise<JwtModuleOptions> => {
  const keySet = getKeySet();

  // Optional token binding (env-driven): JWT_ISSUER / JWT_AUDIENCE. When set,
  // every issued token carries iss/aud and verification enforces them.
  // All services in the stack must share the values — roll out in one
  // compose deploy, otherwise validators reject tokens issued without them.
  const issuer = ConfigService.get<string>("JWT_ISSUER");
  const audience = ConfigService.get<string>("JWT_AUDIENCE");

  return {
    privateKey: keySet.privateKey,
    publicKey: keySet.publicKey,
    signOptions: {
      algorithm: "RS256",
      keyid: keySet.kid,
      ...(issuer ? { issuer } : {}),
      ...(audience ? { audience } : {}),
    },
    verifyOptions: {
      algorithms: ["RS256"],
      ...(issuer ? { issuer } : {}),
      ...(audience ? { audience } : {}),
    },
  };
};
