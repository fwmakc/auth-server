import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RandomModule } from "@src/random/random.module";
import { AccountConfirmEntity } from "./account_confirm.entity";
import { AccountConfirmService } from "./account_confirm.service";

@Module({
  controllers: [],
  imports: [
    TypeOrmModule.forFeature([AccountConfirmEntity]),
    forwardRef(() => RandomModule),
  ],
  providers: [AccountConfirmService],
  exports: [AccountConfirmService],
})
export class AccountConfirmModule {}
