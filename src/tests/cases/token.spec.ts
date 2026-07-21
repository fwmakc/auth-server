import * as request from "supertest";
import { INestApplication } from "@nestjs/common";
import { createHttpTestApp } from "../app.testingModule";

describe("Token Endpoint — POST /token (all grant types)", () => {
  let app: INestApplication;
  let bobToken: { access_token: string; refresh_token: string };

  beforeAll(async () => {
    const ctx = await createHttpTestApp();
    app = ctx.app;

    const res = await request(app.getHttpServer())
      .post("/account/methods/login")
      .send({ username: "bob@test", password: "password123" });

    bobToken = {
      access_token: res.body.access_token,
      refresh_token: res.body.refresh_token,
    };
  });

  afterAll(async () => {
    await app.close();
  });

  // ═══════════════════════════════════════════════════════════
  // PASSWORD GRANT
  // ═══════════════════════════════════════════════════════════
  describe("grant_type=password", () => {
    it("valid credentials → token pair", async () => {
      const res = await request(app.getHttpServer())
        .post("/token")
        .send({
          grant_type: "password",
          username: "bob@test",
          password: "password123",
        })
        .expect(201);

      expect(res.body.access_token).toBeDefined();
      expect(res.body.refresh_token).toBeDefined();
      expect(res.body.token_type).toBe("Bearer");
      expect(res.body.expires_in).toBeGreaterThan(0);
    });

    it("wrong password → error", async () => {
      const res = await request(app.getHttpServer())
        .post("/token")
        .send({
          grant_type: "password",
          username: "bob@test",
          password: "wrongpassword",
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("missing username → error", async () => {
      const res = await request(app.getHttpServer())
        .post("/token")
        .send({
          grant_type: "password",
          password: "password123",
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("unactivated user → error", async () => {
      const res = await request(app.getHttpServer())
        .post("/token")
        .send({
          grant_type: "password",
          username: "pending@test",
          password: "password123",
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // REFRESH TOKEN GRANT
  // ═══════════════════════════════════════════════════════════
  describe("grant_type=refresh_token", () => {
    it("valid refresh token → new token pair", async () => {
      const res = await request(app.getHttpServer())
        .post("/token")
        .send({
          grant_type: "refresh_token",
          refresh_token: bobToken.refresh_token,
        })
        .expect(201);

      expect(res.body.access_token).toBeDefined();
      expect(res.body.refresh_token).toBeDefined();
      expect(res.body.token_type).toBe("Bearer");
    });

    it("invalid refresh token → error", async () => {
      const res = await request(app.getHttpServer())
        .post("/token")
        .send({
          grant_type: "refresh_token",
          refresh_token: "invalid.refresh.token",
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CLIENT CREDENTIALS GRANT
  // ═══════════════════════════════════════════════════════════
  describe("grant_type=client_credentials", () => {
    it("valid client_id + client_secret → token", async () => {
      const res = await request(app.getHttpServer())
        .post("/token")
        .send({
          grant_type: "client_credentials",
          client_id: "test-client-id",
          client_secret: "test-client-secret-jwt-token",
        });

      expect(res.status).toBe(201);
      expect(res.body.access_token).toBeDefined();
    });

    it("invalid client_secret → error", async () => {
      const res = await request(app.getHttpServer())
        .post("/token")
        .send({
          grant_type: "client_credentials",
          client_id: "test-client-id",
          client_secret: "wrong-secret",
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("non-existent client_id → error", async () => {
      const res = await request(app.getHttpServer())
        .post("/token")
        .send({
          grant_type: "client_credentials",
          client_id: "nonexistent-client",
          client_secret: "any-secret",
        });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // INVALID GRANT TYPES
  // (controller has no fallback — returns 201 with undefined body)
  // ═══════════════════════════════════════════════════════════
  describe("invalid grant_type", () => {
    it("unsupported grant_type → 201, empty body (falls through)", async () => {
      const res = await request(app.getHttpServer())
        .post("/token")
        .send({
          grant_type: "invalid_grant",
          username: "bob@test",
          password: "password123",
        })
        .expect(201);

      expect(res.body.access_token).toBeUndefined();
    });

    it("missing grant_type → 201, empty body (falls through)", async () => {
      const res = await request(app.getHttpServer())
        .post("/token")
        .send({
          username: "bob@test",
          password: "password123",
        })
        .expect(201);

      expect(res.body.access_token).toBeUndefined();
    });
  });
});
