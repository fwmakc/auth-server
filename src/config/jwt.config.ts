import { ConfigService } from "@nestjs/config";
import { JwtModuleOptions } from "@nestjs/jwt";
import { getKeySet } from "@src/jwks/keys";

export const getJwtConfig = async (
  ConfigService: ConfigService
): Promise<JwtModuleOptions> => {
  const keySet = getKeySet();

  return {
    privateKey: keySet.privateKey,
    publicKey: keySet.publicKey,
    signOptions: {
      algorithm: "RS256",
      keyid: keySet.kid,
    },
    verifyOptions: {
      algorithms: ["RS256"],
    },
  };
};
