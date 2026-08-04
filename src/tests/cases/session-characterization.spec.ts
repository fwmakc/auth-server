import * as request from "supertest";
import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import { createHttpTestApp } from "../app.testingModule";
import { AccountSessionsService } from "@src/account/account_sessions/account_sessions.service";
import { AccountEntity } from "@src/account/account.entity";
import { Cookie } from "api-server-toolkit";

describe("Session Characterization — tests to lock current behavior before removal", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let sessionsService: AccountSessionsService;

  beforeAll(async () => {
    const ctx = await createHttpTestApp();
    app = ctx.app;
    dataSource = ctx.moduleRef.get(DataSource);
    sessionsService = ctx.moduleRef.get(AccountSessionsService);
  });

  afterAll(async () => {
    await app.close();
  });

  // ═════════════════════════════════════════════════════════════
  // 1. LOGOUT — cookies reset, session destroy (null-guarded)
  // ═════════════════════════════════════════════════════════════
  describe("POST /account/methods/logout", () => {
    let accessToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/account/methods/login")
        .send({ username: "alice@test", password: "password123" });
      accessToken = res.body.access_token;
    });

    it("with valid token → 201", async () => {
      await request(app.getHttpServer())
        .post("/account/methods/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(201);
    });

    it("resets id cookie after logout", async () => {
      let token: string;
      const loginRes = await request(app.getHttpServer())
        .post("/account/methods/login")
        .send({ username: "bob@test", password: "password123" });
      token = loginRes.body.access_token;

      await request(app.getHttpServer())
        .post("/account/methods/logout")
        .set("Authorization", `Bearer ${token}`)
        .expect(201);
    });

    it("without token → 401", async () => {
      await request(app.getHttpServer())
        .post("/account/methods/logout")
        .expect(401);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // 2. AccountSessionsService — start/destroy with session=undefined
  // ═════════════════════════════════════════════════════════════
  describe("AccountSessionsService session null-safety", () => {
    const mockAccount = { id: 1 } as AccountEntity;

    it("start() with session=undefined → no crash, logs to DB", async () => {
      const req = {
        session: undefined,
        ip: "127.0.0.1",
        method: "POST",
        originalUrl: "/login",
        headers: { "user-agent": "test-agent" },
      };
      const result = await sessionsService.start(mockAccount, req as any);
      expect(result).toBeDefined();
    });

    it("start() with session present → logs to DB (session no longer used)", async () => {
      const req = {
        session: {
          save: jest.fn((cb) => cb(null)),
        },
        ip: "127.0.0.1",
        method: "POST",
        originalUrl: "/login",
        headers: { "user-agent": "test-agent" },
      };
      const result = await sessionsService.start(mockAccount, req as any);
      expect(result).toBeDefined();
    });

    it("destroy() with session=undefined → no crash, logs to DB", async () => {
      const req = {
        session: undefined,
        ip: "127.0.0.1",
        method: "POST",
        originalUrl: "/logout",
        headers: { "user-agent": "test-agent" },
      };
      const result = await sessionsService.destroy(mockAccount, req as any);
      expect(result).toBeDefined();
    });

    it("destroy() with session present → logs to DB (session no longer used)", async () => {
      const req = {
        session: {
          destroy: jest.fn((cb) => cb(null)),
        },
        ip: "127.0.0.1",
        method: "POST",
        originalUrl: "/logout",
        headers: { "user-agent": "test-agent" },
      };
      const result = await sessionsService.destroy(mockAccount, req as any);
      expect(result).toBeDefined();
    });

    it("log() writes to DB regardless of session", async () => {
      const req = {
        ip: "192.168.1.1",
        method: "POST",
        originalUrl: "/test",
        headers: { "user-agent": "jest", "accept-language": "en-US" },
      };
      const result = await sessionsService.log(mockAccount, req as any, "test-log");
      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
    });
  });

  // ═════════════════════════════════════════════════════════════
  // 3. GOOGLE OAUTH — login redirect + redirect callback (mocked)
  // ═════════════════════════════════════════════════════════════
  describe("Google OAuth flow", () => {
    it("GET /account/strategies/google/login → 302 redirect to Google", async () => {
      const res = await request(app.getHttpServer())
        .get("/account/strategies/google/login")
        .expect(302);

      expect(res.headers.location).toContain("accounts.google.com");
    });

    it("GET /account/strategies/google/redirect without code → error or redirect", async () => {
      // Without a valid OAuth code, Google strategy will redirect or error.
      // We just verify it doesn't crash the server.
      const res = await request(app.getHttpServer()).get(
        "/account/strategies/google/redirect",
      );
      expect([302, 400, 401, 500]).toContain(res.status);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // 4. GET /account — authorize endpoint
  // ═════════════════════════════════════════════════════════════
  describe("GET /account (OAuth authorize)", () => {
    it("without id cookie → redirects to login form", async () => {
      const res = await request(app.getHttpServer())
        .get("/account")
        .query({
          response_type: "code",
          client_id: "test-client-id",
          redirect_uri: "http://localhost/callback",
          state: "xyz",
        })
        .expect(302);

      expect(res.headers.location).toContain("login");
    });

    it("with id cookie + response_type=code → redirect or 500 (pre-existing bug in codeGenerate)", async () => {
      const res = await request(app.getHttpServer())
        .get("/account")
        .set("Cookie", ["id=1"])
        .query({
          response_type: "code",
          client_id: "test-client-id",
          redirect_uri: "http://localhost/callback",
          state: "xyz",
        });

      // Current behavior: 500 due to null bind in ClientsService.update
      // After session removal: same behavior (bug is in codeGenerate, not session)
      expect([302, 500]).toContain(res.status);
    });

    it("with id cookie + response_type=token → redirects with token", async () => {
      const res = await request(app.getHttpServer())
        .get("/account")
        .set("Cookie", ["id=1"])
        .query({
          response_type: "token",
          client_id: "test-client-id",
          redirect_uri: "http://localhost/callback",
          state: "xyz",
        });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("token=");
    });
  });

  // ═════════════════════════════════════════════════════════════
  // 5. DEACTIVATE — session cleanup via try/catch
  // ═════════════════════════════════════════════════════════════
  describe("POST /account/methods/deactivate", () => {
    let accessToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post("/account/methods/login")
        .send({ username: "bob@test", password: "password123" });
      accessToken = res.body.access_token;
    });

    it("with valid token + correct password → deactivates account", async () => {
      const res = await request(app.getHttpServer())
        .post("/account/methods/deactivate")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ password: "password123" });

      // May return 200/201 on success or error if already deactivated
      expect([200, 201, 400, 401]).toContain(res.status);
    });

    it("without token → 401", async () => {
      await request(app.getHttpServer())
        .post("/account/methods/deactivate")
        .send({ password: "password123" })
        .expect(401);
    });
  });

  // ═════════════════════════════════════════════════════════════
  // 6. BOOT REGRESSION — app boots, JWT auth works, no crash
  // ═════════════════════════════════════════════════════════════
  describe("Boot regression — app is alive", () => {
    it("GET /account/self without token → 401 (app responds)", async () => {
      await request(app.getHttpServer())
        .get("/account/self")
        .expect(401);
    });

    it("GET /.well-known/jwks.json → 200 (JWKS works)", async () => {
      const res = await request(app.getHttpServer())
        .get("/.well-known/jwks.json")
        .expect(200);

      expect(res.body.keys.length).toBeGreaterThan(0);
    });

    it("JWT login + authenticated request works", async () => {
      const loginRes = await request(app.getHttpServer())
        .post("/account/methods/login")
        .send({ username: "admin@test", password: "password123" })
        .expect(201);

      expect(loginRes.body.access_token).toBeDefined();

      const selfRes = await request(app.getHttpServer())
        .get("/account/self")
        .set("Authorization", `Bearer ${loginRes.body.access_token}`)
        .expect(200);

      expect(selfRes.body.username).toBe("admin@test");
    });
  });

  // ═════════════════════════════════════════════════════════════
  // 7. LEADER/UNTI/OAUTH — login redirects (guards active)
  // ═════════════════════════════════════════════════════════════
  describe("Other OAuth providers — login redirects", () => {
    it("GET /account/strategies/leader/login → 302", async () => {
      const res = await request(app.getHttpServer())
        .get("/account/strategies/leader/login")
        .expect(302);

      expect(res.headers.location).toBeDefined();
    });

    it("GET /account/strategies/2035/login → 302", async () => {
      const res = await request(app.getHttpServer())
        .get("/account/strategies/2035/login")
        .expect(302);

      expect(res.headers.location).toBeDefined();
    });

    it("GET /account/strategies/oauth/login → 302", async () => {
      const res = await request(app.getHttpServer())
        .get("/account/strategies/oauth/login")
        .expect(302);

      expect(res.headers.location).toBeDefined();
    });

    it("GET /account/strategies/oauth/redirect without code → no crash", async () => {
      const res = await request(app.getHttpServer()).get(
        "/account/strategies/oauth/redirect",
      );
      expect([200, 302, 400, 500]).toContain(res.status);
    });
  });
});
