import { PassportModule } from "@nestjs/passport";
import { AccountModule } from "./account/account.module";
import { AccountConfirmModule } from "./account/account_confirm/account_confirm.module";
import { AccountSessionsModule } from "./account/account_sessions/account_sessions.module";
import { AccountStrategiesModule } from "./account/account_strategies/account_strategies.module";
import { ClientsModule } from "./clients/clients.module";
import { ClientsRedirectsModule } from "./clients/clients_redirects/clients_redirects.module";
import { MailModule } from "./mail/mail.module";
import { RandomModule } from "./random/random.module";
import { TokenModule } from "./token/token.module";
import { UsersModule } from "./db/users/users.module";
import { JwksModule } from "./jwks/jwks.module";

export default [
  PassportModule.register({ session: true }),
  AccountModule,
  AccountConfirmModule,
  AccountSessionsModule,
  AccountStrategiesModule,
  ClientsModule,
  ClientsRedirectsModule,
  JwksModule,
  MailModule,
  RandomModule,
  TokenModule,
  UsersModule,
];
