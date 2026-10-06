import * as request from "supertest";
import { INestApplication } from "@nestjs/common";
import { createHttpTestApp } from "../app.testingModule";

describe("Access Control — guards, internal API, logout", () => {
  let app: INestApplication;
  let accessToken: string;

  beforeAll(async () => {
    const ctx = await createHttpTestApp();
    app = ctx.app;

    const res = await request(app.getHttpServer())
      .post("/account/methods/login")
      .send({ username: "bob@test", password: "password123" });

    accessToken = res.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  // ═══════════════════════════════════════════════════════════
  // @Account() GUARD
  // ═══════════════════════════════════════════════════════════
  describe("GET /account/self", () => {
    it("without token → 401", async () => {
      await request(app.getHttpServer()).get("/account/self").expect(401);
    });

    it("with valid token → 200, returns account", async () => {
      const res = await request(app.getHttpServer())
        .get("/account/self")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.username).toBe("bob@test");
      expect(res.body.id).toBeDefined();
    });

    it("with malformed token → 401", async () => {
      await request(app.getHttpServer())
        .get("/account/self")
        .set("Authorization", "Bearer invalid.token.here")
        .expect(401);
    });

    it("with expired/invalid signature token → 401", async () => {
      await request(app.getHttpServer())
        .get("/account/self")
        .set(
          "Authorization",
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.invalid",
        )
        .expect(401);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // LOGOUT (requires @Account() guard)
  // ═══════════════════════════════════════════════════════════
  describe("POST /account/methods/logout", () => {
    it("without token → 401", async () => {
      await request(app.getHttpServer())
        .post("/account/methods/logout")
        .expect(401);
    });

    it("with valid token → 201", async () => {
      await request(app.getHttpServer())
        .post("/account/methods/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(201);
    });

    it("second logout with same token → 201 (stateless, token still valid)", async () => {
      await request(app.getHttpServer())
        .post("/account/methods/logout")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(201);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // INTERNAL API
  // ═══════════════════════════════════════════════════════════
  describe("GET /account/internal/info/:id", () => {
    it("without internal key → 404", async () => {
      await request(app.getHttpServer())
        .get("/account/internal/info/1")
        .expect(404);
    });

    it("with wrong internal key → 404", async () => {
      await request(app.getHttpServer())
        .get("/account/internal/info/1")
        .set("x-internal-api-key", "wrong-key")
        .expect(404);
    });

    it("with previous internal key during the rotation window → 200", async () => {
      process.env.INTERNAL_API_KEY_PREVIOUS = "retired-internal-key";
      try {
        const res = await request(app.getHttpServer())
          .get("/account/internal/info/1")
          .set("x-internal-api-key", "retired-internal-key")
          .expect(200);
        expect(Number(res.body.id)).toBe(1);
      } finally {
        delete process.env.INTERNAL_API_KEY_PREVIOUS;
      }
    });

    it("previous key rejected once the window closes → 404", async () => {
      await request(app.getHttpServer())
        .get("/account/internal/info/1")
        .set("x-internal-api-key", "retired-internal-key")
        .expect(404);
    });

    it("with valid internal key → 200, returns account info", async () => {
      const res = await request(app.getHttpServer())
        .get("/account/internal/info/1")
        .set("x-internal-api-key", "test-internal-key")
        .expect(200);

      expect(Number(res.body.id)).toBe(1);
      expect(res.body.username).toBe("alice@test");
      expect(res.body.isActivated).toBe(true);
      expect(res.body.isSuperuser).toBe(false);
    });

    it("with valid key, non-existent user → 404", async () => {
      await request(app.getHttpServer())
        .get("/account/internal/info/9999")
        .set("x-internal-api-key", "test-internal-key")
        .expect(404);
    });
  });

  describe("GET /account/internal/list", () => {
    it("without internal key → 404", async () => {
      await request(app.getHttpServer())
        .get("/account/internal/list")
        .expect(404);
    });

    it("with valid key → cursor page after the given id", async () => {
      const res = await request(app.getHttpServer())
        .get("/account/internal/list?after=1&limit=1")
        .set("x-internal-api-key", "test-internal-key")
        .expect(200);

      expect(res.body.items).toHaveLength(1);
      expect(Number(res.body.items[0].id)).toBe(2);
      expect(res.body.items[0].username).toBeDefined();
      expect(typeof res.body.items[0].isActivated).toBe("boolean");
      // минимальный срез: ни ролей, ни хешей паролей
      expect(res.body.items[0].password).toBeUndefined();
      expect(res.body.items[0].roles).toBeUndefined();
    });

    it("cursor beyond the last id → empty page", async () => {
      const res = await request(app.getHttpServer())
        .get("/account/internal/list?after=99999")
        .set("x-internal-api-key", "test-internal-key")
        .expect(200);

      expect(res.body.items).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // JWKS / DISCOVERY
  // ═══════════════════════════════════════════════════════════
  describe("JWKS & OIDC Discovery", () => {
    it("GET /.well-known/jwks.json → 200 with keys", async () => {
      const res = await request(app.getHttpServer())
        .get("/.well-known/jwks.json")
        .expect(200);

      expect(res.body.keys).toBeDefined();
      expect(res.body.keys.length).toBeGreaterThan(0);
      expect(res.body.keys[0].kty).toBe("RSA");
      expect(res.body.keys[0].kid).toBeDefined();
    });

    it("GET /.well-known/openid-configuration → 200 with discovery doc", async () => {
      const res = await request(app.getHttpServer())
        .get("/.well-known/openid-configuration")
        .expect(200);

      expect(res.body.issuer).toBeDefined();
      expect(res.body.jwks_uri).toContain("jwks.json");
    });
  });
});
