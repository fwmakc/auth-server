import { ConfigModule, ConfigService } from "@nestjs/config";
import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { SentryGlobalFilter, SentryModule } from "@sentry/nestjs/setup";
import { DataSource } from "typeorm";
import { addTransactionalDataSource } from "typeorm-transactional";
import { getDbConfig } from "@config/db.config";
import { HealthModule } from "api-server-toolkit/health";
import AppImports from "./app.imports";

let transactionalDataSource: DataSource | undefined;

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: "default", ttl: 1000, limit: 10 },
      { name: "auth", ttl: 60000, limit: 5 },
    ]),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDbConfig,
      async dataSourceFactory(option) {
        if (!option) throw new Error("Invalid options passed");
        if (!transactionalDataSource) {
          transactionalDataSource = addTransactionalDataSource(new DataSource(option));
        }
        return transactionalDataSource;
      },
    }),
    ...AppImports,
    HealthModule.forRoot("auth-server"),
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}