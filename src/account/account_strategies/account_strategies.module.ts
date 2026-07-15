import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TokenModule } from "@src/token/token.module";
import { UsersModule } from "@src/db/users/users.module";
import { AccountStrategiesController } from "./account_strategies.controller";
import { AccountStrategiesEntity } from "./account_strategies.entity";
import { AccountStrategiesService } from "./account_strategies.service";
import { LeaderProvider } from "./provider/leader.provider";
import { OauthProvider } from "./provider/oauth.provider";
import { UntiProvider } from "./provider/unti.provider";
import { SessionSerializer } from "./serializer/session.serializer";
import { GoogleStrategy } from "./strategy/google.strategy";
import { LeaderStrategy } from "./strategy/leader.strategy";
import { OauthStrategy } from "./strategy/oauth.strategy";
import { UntiStrategy } from "./strategy/unti.strategy";
import { AccountModule } from "../account.module";
import { AccountSessionsModule } from "../account_sessions/account_sessions.module";

@Module({
  controllers: [AccountStrategiesController],
  imports: [
    TypeOrmModule.forFeature([AccountStrategiesEntity]),
    forwardRef(() => AccountModule),
    forwardRef(() => AccountSessionsModule),
    forwardRef(() => TokenModule),
    forwardRef(() => UsersModule),
    ConfigModule,
  ],
  providers: [
    SessionSerializer,
    AccountStrategiesService,
    GoogleStrategy,
    LeaderProvider,
    LeaderStrategy,
    UntiProvider,
    UntiStrategy,
    OauthStrategy,
    OauthProvider,
  ],
  exports: [AccountStrategiesService],
})
export class AccountStrategiesModule {}
