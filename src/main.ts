import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as Sentry from '@sentry/nestjs';
import redoc from 'redoc-express';
import { join } from 'path';
import { AppModule } from '@src/app.module';
import * as cookieParser from 'cookie-parser';
import * as fileStore from 'session-file-store';
import * as morgan from 'morgan';
import * as passport from 'passport';
import * as session from 'express-session';
import { initializeTransactionalContext } from 'typeorm-transactional';

const FileStoreSession = fileStore(session);

async function bootstrap() {
  initializeTransactionalContext();

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENV || 'localhost',
  });

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: {
      allowedHeaders: [
        'Content-Type',
        'Vary',
        'Accept',
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Origin',
        'Authorization',
        'X-Requested-With',
      ],
      exposedHeaders: [
        'Content-Type',
        'Vary',
        'Accept',
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Origin',
        'Authorization',
        'X-Requested-With',
      ],
      origin: true,
      credentials: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      preflightContinue: false,
      optionsSuccessStatus: 204,
    },
    logger: console,
  });

  if (process.env.MORGAN_LOG_FORMAT) {
    app.use(morgan(process.env.MORGAN_LOG_FORMAT));
  }

  if (process.env.PREFIX) {
    app.setGlobalPrefix(process.env.PREFIX);
  }

  if (process.env.SWAGGER_PREFIX) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle(process.env.SWAGGER_TITLE || '')
      .setDescription(process.env.SWAGGER_DESCRIPTION || '')
      .setVersion(process.env.SWAGGER_VERSION || '')
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(process.env.SWAGGER_PREFIX, app, swaggerDocument);
  }

  if (process.env.SWAGGER_PREFIX_REDOC) {
    const redocConfig = {
      title: process.env.SWAGGER_TITLE || '',
      version: process.env.SWAGGER_VERSION || '',
      specUrl: `${process.env.SWAGGER_PREFIX}-json`,
    };
    app.use(`${process.env.SWAGGER_PREFIX_REDOC}`, redoc(redocConfig));
  }

  app.use(cookieParser());
  app.use(
    session({
      secret: process.env.SESSION_SECRET,
      saveUninitialized: false,
      resave: false,
      cookie: {
        maxAge: Number(process.env.SESSION_EXPIRES) || -3600,
      },
      store: new FileStoreSession({}),
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());

  app.setBaseViewsDir(join(process.env.ROOT_PATH || '.', 'views'));
  app.setViewEngine('ejs');

  const port = process.env.PORT || 3001;
  const ip = process.env.IP || 'localhost';
  const message = `Auth server running\nin ${process.env.NODE_ENV} mode on ${port} port\nat http://${ip}:${port}`;

  await app.listen(port, ip).then(() => {
    console.log(message);
  });

  process.on('SIGINT', () => {
    app.close();
  });
}

bootstrap();
