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
      await request(app.getHttpServer())
        .get("/account/self")
        .expect(401);
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
        .set("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.invalid")
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
        .set("x-internal-key", "wrong-key")
        .expect(404);
    });

    it("with valid internal key → 200, returns account info", async () => {
      const res = await request(app.getHttpServer())
        .get("/account/internal/info/1")
        .set("x-internal-key", "test-internal-key")
        .expect(200);

      expect(Number(res.body.id)).toBe(1);
      expect(res.body.username).toBe("alice@test");
      expect(res.body.isActivated).toBe(true);
      expect(res.body.isSuperuser).toBe(false);
    });

    it("with valid key, non-existent user → 404", async () => {
      await request(app.getHttpServer())
        .get("/account/internal/info/9999")
        .set("x-internal-key", "test-internal-key")
        .expect(404);
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
