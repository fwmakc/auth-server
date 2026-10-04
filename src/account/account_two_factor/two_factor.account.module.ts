import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AccountModule } from "../account.module";
import { AccountConfirmModule } from "../account_confirm/account_confirm.module";
import { TokenModule } from "@src/token/token.module";
import { OutboxModule } from "api-server-toolkit";
import { AuthEventOutboxEntity } from "../../db/outbox.entity";

import { AccountTwoFactorEntity } from "./account_two_factor.entity";
import { UsedMfaJtiEntity } from "@src/token/store";
import { TwoFactorAccountService } from "./two_factor.account.service";
import { TwoFactorAccountController } from "./two_factor.account.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountTwoFactorEntity, UsedMfaJtiEntity]),
    forwardRef(() => AccountModule),
    forwardRef(() => AccountConfirmModule),
    forwardRef(() => TokenModule),
    OutboxModule.forRoot(AuthEventOutboxEntity),
    ConfigModule,
  ],
  controllers: [TwoFactorAccountController],
  providers: [TwoFactorAccountService],
  exports: [TwoFactorAccountService],
})
export class TwoFactorModule {}
