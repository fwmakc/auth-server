import { bootstrap } from "api-server-toolkit/bootstrap";
import { join } from "path";
import { AppModule } from "@src/app.module";
import * as session from "express-session";
import * as fileStore from "session-file-store";

const FileStoreSession = fileStore(session);

bootstrap({
  module: AppModule,
  serviceName: "auth-server",
  cors: true,
  morgan: true,
  transactional: true,
  beforeListen: (app) => {
    const cookieParser = require("cookie-parser");
    const passport = require("passport");

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

    app.setBaseViewsDir(join(process.env.ROOT_PATH || ".", "views"));
    app.setViewEngine("ejs");
  },
});
