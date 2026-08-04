import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccountConfirmEntity } from "./account_confirm.entity";
import { AccountConfirmService } from "./account_confirm.service";

@Module({
  controllers: [],
  imports: [TypeOrmModule.forFeature([AccountConfirmEntity])],
  providers: [AccountConfirmService],
  exports: [AccountConfirmService],
})
export class AccountConfirmModule {}
