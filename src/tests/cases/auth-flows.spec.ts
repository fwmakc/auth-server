import { Test, TestingModule } from "@nestjs/testing";
import * as request from "supertest";
import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import { createHttpTestApp, mockPublish } from "../app.testingModule";
import { AccountEntity } from "@src/account/account.entity";
import { AccountConfirmEntity } from "@src/account/account_confirm/account_confirm.entity";

describe("Auth Flows — register, confirm, login, reset", () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let moduleRef: TestingModule;

  beforeAll(async () => {
    const ctx = await createHttpTestApp();
    app = ctx.app;
    moduleRef = ctx.moduleRef;
    dataSource = moduleRef.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  // Helper: get latest reset code for a user
  async function getLatestResetCode(username: string): Promise<string> {
    const repo = dataSource.getRepository(AccountConfirmEntity);
    const record = await repo.findOne({
      where: { type: "reset" },
      relations: ["account"],
      order: { createdAt: "DESC" },
    });
    if (record?.account?.username === username) {
      return record.code;
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════
  // REGISTRATION
  // ═══════════════════════════════════════════════════════════
  describe("POST /account/methods/register", () => {
    it("register new user → 201, {success: true}, event published", async () => {
      mockPublish.mockClear();

      const res = await request(app.getHttpServer())
        .post("/account/methods/register")
        .send({
          username: "newuser@test",
          password: "password123",
          subject: "Confirm your account",
        })
        .expect(201);

      expect(res.body.success).toBe(true);

      const account = await dataSource
        .getRepository(AccountEntity)
        .findOneBy({ username: "newuser@test" });
      expect(account).toBeDefined();
      expect(account.isActivated).toBe(false);

      expect(mockPublish).toHaveBeenCalledWith(
        "user.registered",
        expect.objectContaining({ username: "newuser@test" })
      );
    });

    it("register duplicate activated user → error", async () => {
      const res = await request(app.getHttpServer())
        .post("/account/methods/register")
        .send({
          username: "alice@test",
          password: "password123",
          subject: "Confirm",
        })
        .expect(201);

      expect(res.body.success).toBeFalsy();
      expect(JSON.stringify(res.body)).toContain("already in the system");
    });

    it("register duplicate unactivated user → returns existing (no error)", async () => {
      const res = await request(app.getHttpServer())
        .post("/account/methods/register")
        .send({
          username: "pending@test",
          password: "password123",
          subject: "Confirm",
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════
  // CONFIRMATION
  // ═══════════════════════════════════════════════════════════
  describe("GET /account/methods/confirm/:code", () => {
    it("confirm with valid code → {success: true}, event published", async () => {
      mockPublish.mockClear();

      const res = await request(app.getHttpServer())
        .get("/account/methods/confirm/confirm-alice-code-123456")
        .expect(200);

      expect(res.body.success).toBe(true);

      const account = await dataSource
        .getRepository(AccountEntity)
        .findOneBy({ username: "alice@test" });
      expect(account.isActivated).toBe(true);

      expect(mockPublish).toHaveBeenCalledWith(
        "user.confirmed",
        expect.objectContaining({ username: "alice@test" })
      );
    });

    it("confirm with invalid code → error", async () => {
      const res = await request(app.getHttpServer())
        .get("/account/methods/confirm/invalid-code-999999")
        .expect(200);

      expect(res.body.success).toBeFalsy();
      expect(res.body.error).toBeDefined();
    });

    it("confirm with already used code → error", async () => {
      const res = await request(app.getHttpServer())
        .get("/account/methods/confirm/confirm-alice-code-123456")
        .expect(200);

      expect(res.body.success).toBeFalsy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // LOGIN
  // ═══════════════════════════════════════════════════════════
  describe("POST /account/methods/login", () => {
    it("login with valid credentials → tokens returned", async () => {
      const res = await request(app.getHttpServer())
        .post("/account/methods/login")
        .send({
          username: "bob@test",
          password: "password123",
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.access_token).toBeDefined();
      expect(res.body.refresh_token).toBeDefined();
      expect(res.body.token_type).toBe("Bearer");
      expect(res.body.expires_in).toBeGreaterThan(0);
    });

    it("login with wrong password → error", async () => {
      const res = await request(app.getHttpServer())
        .post("/account/methods/login")
        .send({
          username: "bob@test",
          password: "wrongpassword",
        })
        .expect(201);

      expect(res.body.success).toBeFalsy();
      expect(res.body.error).toBe("Unauthorized");
    });

    it("login with unactivated account → error", async () => {
      const res = await request(app.getHttpServer())
        .post("/account/methods/login")
        .send({
          username: "pending@test",
          password: "password123",
        })
        .expect(201);

      expect(res.body.success).toBeFalsy();
      expect(res.body.error).toBe("Unauthorized");
    });

    it("login with non-existent user → error", async () => {
      const res = await request(app.getHttpServer())
        .post("/account/methods/login")
        .send({
          username: "ghost@test",
          password: "password123",
        })
        .expect(201);

      expect(res.body.success).toBeFalsy();
      expect(res.body.error).toBe("Unauthorized");
    });
  });

  // ═══════════════════════════════════════════════════════════
  // PASSWORD RESET + CHANGE (full flow via API)
  // ═══════════════════════════════════════════════════════════
  describe("POST /account/methods/reset + change", () => {
    it("reset request for bob → {success: true}, event published", async () => {
      mockPublish.mockClear();

      const res = await request(app.getHttpServer())
        .post("/account/methods/reset")
        .send({
          username: "bob@test",
          subject: "Reset your password",
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(mockPublish).toHaveBeenCalledWith(
        "password.reset",
        expect.objectContaining({ username: "bob@test" })
      );
    });

    it("reset non-existent user → error", async () => {
      const res = await request(app.getHttpServer())
        .post("/account/methods/reset")
        .send({
          username: "ghost@test",
          subject: "Reset",
        })
        .expect(201);

      expect(res.body.success).toBeFalsy();
    });

    it("reset for alice → create fresh code via API, then change password", async () => {
      const resetRes = await request(app.getHttpServer())
        .post("/account/methods/reset")
        .send({
          username: "alice@test",
          subject: "Reset your password",
        })
        .expect(201);

      expect(resetRes.body.success).toBe(true);

      const resetCode = await getLatestResetCode("alice@test");
      expect(resetCode).toBeDefined();
      expect(resetCode).not.toBeNull();

      const changeRes = await request(app.getHttpServer())
        .post(`/account/methods/change/${resetCode}`)
        .send({
          username: "alice@test",
          password: "newpassword123",
        })
        .expect(201);

      expect(changeRes.body.success).toBe(true);
    });

    it("new password works after change", async () => {
      const res = await request(app.getHttpServer())
        .post("/account/methods/login")
        .send({
          username: "alice@test",
          password: "newpassword123",
        })
        .expect(201);

      expect(res.body.success).toBe(true);
    });

    it("old password no longer works after change", async () => {
      const res = await request(app.getHttpServer())
        .post("/account/methods/login")
        .send({
          username: "alice@test",
          password: "password123",
        })
        .expect(201);

      expect(res.body.success).toBeFalsy();
    });

    it("change password with invalid code → error", async () => {
      const res = await request(app.getHttpServer())
        .post("/account/methods/change/invalid-reset-code-999999")
        .send({
          username: "alice@test",
          password: "anotherpassword123",
        })
        .expect(201);

      expect(res.body.success).toBeFalsy();
    });
  });

  // ═══════════════════════════════════════════════════════════
  // HASH
  // ═══════════════════════════════════════════════════════════
  describe("POST /account/methods/hash/:string", () => {
    it("hash a string → {success: true, hash: ...}", async () => {
      const res = await request(app.getHttpServer())
        .post("/account/methods/hash/teststring")
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.hash).toBeDefined();
      expect(res.body.hash.length).toBeGreaterThan(20);
    });
  });
});
