import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccountEntity } from "@src/account/account.entity";
import { UsersEntity } from "@src/db/users/users.entity";
import { JwksController } from "@src/jwks/jwks.controller";
import { UserinfoController } from "@src/jwks/userinfo.controller";
import { JwksService } from "@src/jwks/jwks.service";

@Module({
  imports: [TypeOrmModule.forFeature([AccountEntity, UsersEntity])],
  controllers: [JwksController, UserinfoController],
  providers: [JwksService],
  exports: [JwksService],
})
export class JwksModule {}
