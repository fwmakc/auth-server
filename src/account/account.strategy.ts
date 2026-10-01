import { ExtractJwt, Strategy } from "passport-jwt";
import {
  ForbiddenException,
  UnauthorizedException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { findVerificationKey, kidOfToken } from "@src/jwks/keys";
import { AccountService } from "./account.service";

@Injectable()
export class AccountStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly accountService: AccountService,
  ) {
    // Mirror the jwt.config signing claims: when JWT_ISSUER/JWT_AUDIENCE are
    // set, verification enforces them (undefined option = check skipped).
    const issuer = configService.get<string>("JWT_ISSUER");
    const audience = configService.get<string>("JWT_AUDIENCE");
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Key-rotation overlap: select the verification key by the token's
      // kid header — tokens signed by a retired key stay valid until they
      // expire naturally (see JWT_PREVIOUS_PUBLIC_KEY_PATHS).
      secretOrKeyProvider: (_request, rawJwtToken, done) => {
        try {
          done(null, findVerificationKey(kidOfToken(rawJwtToken)).publicKey);
        } catch (e) {
          done(e as Error);
        }
      },
      algorithms: ["RS256"],
      ...(issuer ? { issuer } : {}),
      ...(audience ? { audience } : {}),
    });
  }

  async validate({ id, type, key }) {
    if (!type || type !== "access") {
      throw new UnauthorizedException("Invalid token or expired!");
    }
    const account = await this.accountService.findOne({ id });
    if (!account.id || (!account.isActivated && !key)) {
      throw new ForbiddenException("You have no rights!");
    }
    if (account.isDeleted) {
      throw new UnauthorizedException("Account is deleted");
    }
    return account;
  }
}
