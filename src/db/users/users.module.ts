import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccountModule } from "@src/account/account.module";
import { UsersController } from "./users.controller";
import { UsersEntity } from "./users.entity";
import { UsersService } from "./users.service";

@Module({
  controllers: [UsersController],
  imports: [
    TypeOrmModule.forFeature([UsersEntity]),
    forwardRef(() => AccountModule),
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
