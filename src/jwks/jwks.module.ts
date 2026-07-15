import { Module } from "@nestjs/common";
import { JwksController } from "@src/jwks/jwks.controller";
import { JwksService } from "@src/jwks/jwks.service";

@Module({
  controllers: [JwksController],
  providers: [JwksService],
  exports: [JwksService],
})
export class JwksModule {}
