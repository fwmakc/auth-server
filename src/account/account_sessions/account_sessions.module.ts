import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccountSessionsController } from "./account_sessions.controller";
import { AccountSessionsEntity } from "./account_sessions.entity";
import { AccountSessionsService } from "./account_sessions.service";

@Module({
  controllers: [AccountSessionsController],
  imports: [TypeOrmModule.forFeature([AccountSessionsEntity])],
  providers: [AccountSessionsService],
  exports: [AccountSessionsService],
})
export class AccountSessionsModule {}
