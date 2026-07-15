import { ExtractJwt, Strategy } from "passport-jwt";
import {
  ForbiddenException,
  UnauthorizedException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { getKeySet } from "@src/jwks/keys";
import { AccountService } from "./account.service";

@Injectable()
export class AccountStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly accountService: AccountService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: !configService.get("JWT_EXPIRES"),
      secretOrKey: getKeySet().publicKey,
      algorithms: ["RS256"],
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
    return account;
  }
}
