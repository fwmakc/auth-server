import { Controller, Get } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { ApiTags } from "@nestjs/swagger";
import { JwksService } from "@src/jwks/jwks.service";

@ApiTags("Well-Known")
@ApiExcludeController()
@Controller(".well-known")
export class JwksController {
  constructor(private readonly jwksService: JwksService) {}

  @Get("jwks.json")
  getJwks() {
    return { keys: [this.jwksService.getJwk()] };
  }

  @Get("openid-configuration")
  getOidcDiscovery() {
    return this.jwksService.getOidcDiscovery();
  }
}
