import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenModule } from '@src/token/token.module';
// import { AccountModule } from '@src/account/account.module';

import { ClientsController } from './clients.controller';
import { ClientsEntity } from './clients.entity';
import { ClientsService } from './clients.service';
import { ClientsStrategy } from './clients.strategy';
import { ClientsRedirectsModule } from './clients_redirects/clients_redirects.module';

@Module({
  controllers: [ClientsController],
  imports: [
    TypeOrmModule.forFeature([ClientsEntity]),
    // forwardRef(() => AccountModule),
    forwardRef(() => ClientsRedirectsModule),
    forwardRef(() => TokenModule),
    ConfigModule,
  ],
  providers: [ClientsService, ClientsStrategy],
  exports: [ClientsService],
})
export class ClientsModule {}
