import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { findVerificationKey, kidOfToken } from "@src/jwks/keys";

@Injectable()
export class VerifyHandler {
  constructor(private readonly jwtService: JwtService) {}

  async verify(token: string, type: string): Promise<any> {
    let result;
    try {
      // Rotation overlap: verify against the key matching the token's kid
      // (current signing key by default), claims from the module config.
      result = await this.jwtService.verifyAsync(token, {
        secret: findVerificationKey(kidOfToken(token)).publicKey,
      });
    } catch {
      throw new UnauthorizedException("Invalid token or expired!");
    }
    if (!result || !result.type || result.type !== type) {
      throw new UnauthorizedException("Invalid token or expired!");
    }
    return result;
  }
}
