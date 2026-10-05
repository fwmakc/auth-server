import * as dotenv from "dotenv";
import { join } from "path";
import { DataSource, DataSourceOptions } from "typeorm";

dotenv.config();

type DatabaseTypes =
  // typeorm 1.x removed the sqlite driver; the stack runs postgres
  "mysql" | "postgres" | "mssql" | "oracle" | "mongodb";

const config = {
  type: process.env.DB_TYPE as DatabaseTypes,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  schema: process.env.DB_SCHEMA,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),

  entities: [join(__dirname, "../**/*.entity{.ts,.js}")],
  migrations: [join(__dirname, "../typeorm/migrations/*{.ts,.js}")],
  migrationsTableName: "migrations_typeorm",
} as DataSourceOptions;

// No module-level initialize(): the TypeORM CLI loads and initializes the
// data-source itself, and a second initialize() here races with it, making
// migration commands flaky. The app connects via its own TypeOrmModule.
const AppDataSource = new DataSource(config);

export default AppDataSource;
