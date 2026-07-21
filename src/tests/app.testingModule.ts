import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { DataSource } from "typeorm";
import { addTransactionalDataSource, initializeTransactionalContext } from "typeorm-transactional";
import * as cookieParser from "cookie-parser";
import * as session from "express-session";
import * as passport from "passport";
import { getKeySet } from "@src/jwks/keys";

import { AccountModule } from "@src/account/account.module";
import { AccountConfirmModule } from "@src/account/account_confirm/account_confirm.module";
import { AccountSessionsModule } from "@src/account/account_sessions/account_sessions.module";
import { AccountStrategiesModule } from "@src/account/account_strategies/account_strategies.module";
import { ClientsModule } from "@src/clients/clients.module";
import { ClientsRedirectsModule } from "@src/clients/clients_redirects/clients_redirects.module";
import { JwksModule } from "@src/jwks/jwks.module";
import { MailModule } from "@src/mail/mail.module";
import { MailService } from "@src/mail/mail.service";
import { RandomModule } from "@src/random/random.module";
import { TokenModule } from "@src/token/token.module";
import { UsersModule } from "@src/db/users/users.module";
import { EventClientModule } from "@src/event-client/event-client.module";
import { EventClientService } from "@src/event-client/event-client.service";

import { AccountEntity } from "@src/account/account.entity";
import { AccountConfirmEntity } from "@src/account/account_confirm/account_confirm.entity";
import { AccountSessionsEntity } from "@src/account/account_sessions/account_sessions.entity";
import { AccountStrategiesEntity } from "@src/account/account_strategies/account_strategies.entity";
import { ClientsEntity } from "@src/clients/clients.entity";
import { ClientsRedirectsEntity } from "@src/clients/clients_redirects/clients_redirects.entity";
import { UsersEntity } from "@src/db/users/users.entity";

import { genSalt, hash } from "bcryptjs";
import { TypeClients } from "@core/common";

const TEST_ENTITIES = [
  AccountEntity,
  AccountConfirmEntity,
  AccountSessionsEntity,
  AccountStrategiesEntity,
  ClientsEntity,
  ClientsRedirectsEntity,
  UsersEntity,
];

function setTestEnv() {
  process.env.TZ = "UTC";
  process.env.DB_TYPE = "postgres";
  process.env.DB_HOST = "localhost";
  process.env.DB_PORT = "5432";
  process.env.DB_NAME = "auth_server_test";
  process.env.DB_USER = "root";
  process.env.DB_PASSWORD = "1234";
  process.env.DB_SYNCHRONIZE = "true";
  process.env.DB_LOG = "false";
  process.env.JWT_ACCESS_EXPIRES = "15m";
  process.env.JWT_REFRESH_EXPIRES = "30d";
  process.env.JWT_CLIENTS_EXPIRES = "30d";
  process.env.JWT_EXPIRES = "true";
  process.env.SESSION_SECRET = "test-session-secret";
  process.env.SESSION_EXPIRES = "2592000";
  process.env.AES_SECRET = "change_me_to_32_characters__";
  process.env.ROOT_PATH = ".";
  process.env.FORM_CONFIRM = "http://localhost/confirm";
  process.env.FORM_CHANGE = "http://localhost/change";
  process.env.FORM_LOGIN = "http://localhost/login";
  process.env.FORM_REGISTER = "http://localhost/register";
  process.env.FORM_RESET = "http://localhost/reset";
  process.env.INTERNAL_API_KEY = "test-internal-key";
  process.env.EVENT_SERVER_URL = "http://localhost:3005";
  process.env.SMTP_HOST = "localhost";
  process.env.SMTP_PORT = "587";
  process.env.SMTP_USER = "test";
  process.env.SMTP_PASSWORD = "test";
  process.env.SMTP_SECURE = "false";
  process.env.SMTP_SENDER_NAME = "Test";
  process.env.SMTP_SENDER_EMAIL = "test@test.test";
  process.env.LEADER_CLIENT_ID = "test-leader-id";
  process.env.LEADER_CLIENT_SECRET = "test-leader-secret";
  process.env.LEADER_CLIENT_REDIRECT = "http://localhost/auth/leader/redirect";
  process.env.UNTI_CLIENT_ID = "test-unti-id";
  process.env.UNTI_CLIENT_SECRET = "test-unti-secret";
  process.env.UNTI_CLIENT_REDIRECT = "http://localhost/auth/unti/redirect";
  process.env.GOOGLE_CLIENT_ID = "test-google-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-google-secret";
  process.env.GOOGLE_CLIENT_REDIRECT = "http://localhost/auth/google/redirect";
  process.env.OAUTH_CLIENT_ID = "test-oauth-id";
  process.env.OAUTH_CLIENT_SECRET = "test-oauth-secret";
  process.env.OAUTH_CLIENT_REDIRECT = "http://localhost/auth/oauth/redirect";
  process.env.OAUTH_SERVER = "http://auth-server:3001";
}

export const mockPublish = jest.fn().mockResolvedValue(undefined);

export const createTestModule = async (): Promise<TestingModule> => {
  setTestEnv();
  initializeTransactionalContext();

  const keySet = getKeySet();

  let transactionalDataSource: DataSource | undefined;

  const moduleRef = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({ isGlobal: true }),
      TypeOrmModule.forRoot({
        type: "postgres",
        host: "localhost",
        port: 5432,
        username: "root",
        password: "1234",
        database: "auth_server_test",
        entities: TEST_ENTITIES,
        synchronize: true,
        dropSchema: true,
        logging: false,
      }),
      PassportModule.register({ session: true }),
      JwtModule.register({
        privateKey: keySet.privateKey,
        publicKey: keySet.publicKey,
        signOptions: { algorithm: "RS256", keyid: keySet.kid },
        verifyOptions: { algorithms: ["RS256"] },
      }),
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
    ],
  })
    .overrideProvider(MailService)
    .useValue({
      send: jest.fn().mockResolvedValue(undefined),
      sendByTemplate: jest.fn().mockResolvedValue(undefined),
    })
    .overrideProvider(EventClientService)
    .useValue({
      publish: mockPublish,
    })
    .compile();

  return moduleRef;
};

export const createHttpTestApp = async (): Promise<{
  app: INestApplication;
  moduleRef: TestingModule;
}> => {
  const moduleRef = await createTestModule();

  await seedDatabase(moduleRef);

  const app = moduleRef.createNestApplication();

  app.use(cookieParser());
  app.use(
    session({
      secret: "test-session-secret",
      resave: false,
      saveUninitialized: false,
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());

  await app.init();

  return { app, moduleRef };
};

export const seedDatabase = async (moduleRef: TestingModule) => {
  const dataSource = moduleRef.get(DataSource);

  const accountRepo = dataSource.getRepository(AccountEntity);
  const confirmRepo = dataSource.getRepository(AccountConfirmEntity);
  const clientsRepo = dataSource.getRepository(ClientsEntity);
  const redirectsRepo = dataSource.getRepository(ClientsRedirectsEntity);

  const salt = await genSalt(10);
  const pw = await hash("password123", salt);

  const [alice, bob, admin, pending] = await accountRepo.save([
    accountRepo.create({
      id: 1,
      username: "alice@test",
      password: pw,
      isActivated: true,
      isSuperuser: false,
    }),
    accountRepo.create({
      id: 2,
      username: "bob@test",
      password: pw,
      isActivated: true,
      isSuperuser: false,
    }),
    accountRepo.create({
      id: 3,
      username: "admin@test",
      password: pw,
      isActivated: true,
      isSuperuser: true,
    }),
    accountRepo.create({
      id: 4,
      username: "pending@test",
      password: pw,
      isActivated: false,
      isSuperuser: false,
    }),
  ]);

  await confirmRepo.save([
    confirmRepo.create({
      account: alice,
      code: "confirm-alice-code-123456",
      type: "code",
    }),
    confirmRepo.create({
      account: alice,
      code: "reset-alice-code-123456",
      type: "reset",
    }),
  ]);

  const client = clientsRepo.create({
    account: alice,
    client_id: "test-client-id",
    client_secret: "test-client-secret-jwt-token",
    client_password: pw,
    client_type: TypeClients.CONFIDENTIAL,
    title: "Test Client",
    description: "Test OAuth2 Client",
    client_uri: "http://localhost/callback",
    isPublished: true,
    publishedAt: new Date(),
  });
  await clientsRepo.save(client);

  await redirectsRepo.save(
    redirectsRepo.create({
      client,
      uri: "http://localhost/callback",
    })
  );
};
