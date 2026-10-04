import { ConfigModule, ConfigService } from "@nestjs/config";
import { Module } from "@nestjs/common";
import { APP_FILTER, APP_GUARD } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ThrottlerModule } from "@nestjs/throttler";
import { SentryGlobalFilter, SentryModule } from "@sentry/nestjs/setup";
import { DataSource, DataSourceOptions } from "typeorm";
import { addTransactionalDataSource } from "typeorm-transactional";
import { getDbConfig } from "@config/db.config";
import { HealthModule } from "api-server-toolkit/health";
import { MetricsModule } from "api-server-toolkit/metrics";
import { AuditModule, OutboxModule, runMigrationsUnderLock } from "api-server-toolkit";
import { AuthEventOutboxEntity } from "./db/outbox.entity";
import {
  AppThrottlerGuard,
  buildThrottleStorage,
  throttlerDefaults,
} from "./app.throttler";
import AppImports from "./app.imports";

let transactionalDataSource: DataSource | undefined;

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({
      throttlers: throttlerDefaults(),
      storage: buildThrottleStorage(),
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: getDbConfig,
      async dataSourceFactory(option) {
        if (!option) throw new Error("Invalid options passed");
        // Serialize boot migrations across replicas: TypeORM has no
        // built-in migration locking, so simultaneous boots on a cold DB
        // race. The helper consumes `migrationsRun` from the options.
        const { migrationsRun, ...dsOption } = option;
        if (migrationsRun) {
          await runMigrationsUnderLock(dsOption as DataSourceOptions);
        }
        if (!transactionalDataSource) {
          transactionalDataSource = addTransactionalDataSource(
            new DataSource(dsOption as DataSourceOptions),
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
    // client: false + explicit OutboxModule import: audit records travel through
    // the durable outbox relay instead of the fire-and-forget EventClientModule
    AuditModule.forRoot({
      mutations: false,
      client: false,
      imports: [OutboxModule.forRoot(AuthEventOutboxEntity)],
    }),
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
