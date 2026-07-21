import { ConfigModule, ConfigService } from "@nestjs/config";
import { Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SentryGlobalFilter, SentryModule } from "@sentry/nestjs/setup";
import { DataSource } from "typeorm";
import { addTransactionalDataSource } from "typeorm-transactional";
import { getDbConfig } from "@config/db.config";
import { EventBusModule } from "@core/common";
import AppImports from "./app.imports";

let transactionalDataSource: DataSource | undefined;

@Module({
  imports: [
    SentryModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
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
    EventBusModule,
    ...AppImports,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryGlobalFilter,
    },
  ],
})
export class AppModule {}