import { bootstrap } from "api-server-toolkit/bootstrap";
import { AppModule } from "@src/app.module";

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
    app.use(passport.initialize());
  },
});
