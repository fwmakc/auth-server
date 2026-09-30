import { ConfigModule, ConfigService } from "@nestjs/config";
import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerModule } from "@nestjs/throttler";
import { SentryGlobalFilter, SentryModule } from "@sentry/nestjs/setup";
import { DataSource } from "typeorm";
import { addTransactionalDataSource } from "typeorm-transactional";
import { getDbConfig } from "@config/db.config";
import { HealthModule } from "api-server-toolkit/health";
import { MetricsModule } from "api-server-toolkit/metrics";
import { AuditModule } from "api-server-toolkit";
import { AppThrottlerGuard } from "./app.throttler";
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
          transactionalDataSource = addTransactionalDataSource(
            new DataSource(option),
          );
        }
        return transactionalDataSource;
      },
    }),
    ...AppImports,
    HealthModule.forRoot("auth-server"),
    MetricsModule.forRoot({ service: "auth-server" }),
    // mutations:false — every auth mutation is audited explicitly in its
    // handler, so blanket data.* records would only duplicate them.
    AuditModule.forRoot({ mutations: false }),
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule {}
