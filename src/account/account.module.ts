import { ConfigModule } from "@nestjs/config";
import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AccountController } from "./account.controller";
import { InternalAccountController } from "./internal.account.controller";
import { AccountEntity } from "./account.entity";
import { AccountService } from "./account.service";
import { AccountStrategy } from "./account.strategy";

import { FormsAccountController } from "./controller/forms.account.controller";
import { MethodsAccountController } from "./controller/methods.account.controller";
import { OpenAccountController } from "./controller/open.account.controller";
import { ChangeAccountHandler } from "./handler/change.account.handler";
import { ConfirmAccountHandler } from "./handler/confirm.account.handler";
import { HashAccountHandler } from "./handler/hash.account.handler";
import { LogoutAccountHandler } from "./handler/logout.account.handler";
import { RegisterAccountHandler } from "./handler/register.account.handler";
import { ResetAccountHandler } from "./handler/reset.account.handler";
import { FormsAccountService } from "./service/forms.account.service";
import { MethodsAccountService } from "./service/methods.account.service";
import { OpenAccountService } from "./service/open.account.service";

import { AccountConfirmModule } from "./account_confirm/account_confirm.module";
import { AccountSessionsModule } from "./account_sessions/account_sessions.module";
import { AccountStrategiesModule } from "./account_strategies/account_strategies.module";

import { ClientsModule } from "@src/clients/clients.module";
import { EventClientModule } from "@src/event-client/event-client.module";
import { MailModule } from "@src/mail/mail.module";
import { TokenModule } from "@src/token/token.module";
import { UsersModule } from "@src/db/users/users.module";

@Module({
  controllers: [
    AccountController,
    FormsAccountController,
    MethodsAccountController,
    OpenAccountController,
    InternalAccountController,
  ],
  imports: [
    TypeOrmModule.forFeature([AccountEntity]),
    forwardRef(() => AccountConfirmModule),
    forwardRef(() => AccountSessionsModule),
    forwardRef(() => AccountStrategiesModule),
    forwardRef(() => ClientsModule),
    forwardRef(() => MailModule),
    forwardRef(() => TokenModule),
    forwardRef(() => UsersModule),
    EventClientModule,
    ConfigModule,
  ],
  providers: [
    AccountService,
    AccountStrategy,
    FormsAccountService,
    MethodsAccountService,
    OpenAccountService,

    ChangeAccountHandler,
    ConfirmAccountHandler,
    HashAccountHandler,
    LogoutAccountHandler,
    RegisterAccountHandler,
    ResetAccountHandler,
  ],
  exports: [
    AccountService,
    FormsAccountService,
    MethodsAccountService,
    OpenAccountService,
  ],
})
export class AccountModule {}
