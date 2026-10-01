import * as request from "supertest";
import { INestApplication } from "@nestjs/common";
import { DataSource } from "typeorm";
import { authenticator } from "otplib";
import { createHttpTestApp, mockPublish } from "../app.testingModule";
import { AccountConfirmEntity } from "@src/account/account_confirm/account_confirm.entity";

// encrypt/decrypt read process.env.AES_SECRET directly and require hex
const TEST_AES_HEX = "5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a5a";

describe("Two-factor authentication", () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const server = () => app.getHttpServer();

  const login = (username: string, password: string) =>
    request(server())
      .post("/account/methods/login")
      .send({ username, password });

  async function latestCode(): Promise<string> {
    const record = await dataSource
      .getRepository(AccountConfirmEntity)
      .findOne({
        where: { type: "2fa" },
        relations: ["account"],
        order: { createdAt: "DESC" },
      });
    return record?.code || null;
  }

  beforeAll(async () => {
    process.env.TWO_FACTOR_ENABLED = "true";
    const ctx = await createHttpTestApp();
    app = ctx.app;
    dataSource = ctx.moduleRef.get(DataSource);
    // createHttpTestApp → setTestEnv resets AES_SECRET to a non-hex placeholder;
    // encrypt/decrypt read it lazily at call time, so overriding after boot works
    process.env.AES_SECRET = TEST_AES_HEX;
  });

  afterAll(async () => {
    await app.close();
  });

  describe("master switch off", () => {
    it("logs in directly when TWO_FACTOR_ENABLED is not set", async () => {
      process.env.TWO_FACTOR_ENABLED = "false";
      const res = await login("alice@test", "password123").expect(201);
      expect(res.body.access_token).toBeDefined();
      expect(res.body.twoFactorRequired).toBeUndefined();
      process.env.TWO_FACTOR_ENABLED = "true";
    });
  });

  describe("email method — full flow", () => {
    let accessToken: string;
    let recoveryCodes: string[];

    it("setup sends a code via the event bus", async () => {
      const loginRes = await login("alice@test", "password123").expect(201);
      accessToken = loginRes.body.access_token;
      mockPublish.mockClear();

      const setup = await request(server())
        .post("/account/methods/2fa/setup")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ method: "email" })
        .expect(201);
      expect(setup.body.sent).toBe(true);

      const code = await latestCode();
      expect(code).toMatch(/^\d{6}$/);
      expect(mockPublish).toHaveBeenCalledWith(
        "user.two_factor_code",
        expect.objectContaining({ code, userId: 1, email: "alice@test" }),
      );
    });

    it("confirm activates 2FA and returns 10 recovery codes", async () => {
      const res = await request(server())
        .post("/account/methods/2fa/setup/confirm")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ code: await latestCode() })
        .expect(201);

      recoveryCodes = res.body.recoveryCodes;
      expect(recoveryCodes).toHaveLength(10);
      expect(recoveryCodes[0]).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    });

    it("status reports enabled", async () => {
      const res = await request(server())
        .get("/account/methods/2fa/status")
        .set("Authorization", `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body).toEqual({ enabled: true, method: "email" });
    });

    it("login returns a challenge instead of tokens, wrong code rejected", async () => {
      mockPublish.mockClear();
      const challenge = await login("alice@test", "password123").expect(201);
      expect(challenge.body.twoFactorRequired).toBe(true);
      expect(challenge.body.mfa_token).toBeDefined();
      expect(challenge.body.access_token).toBeUndefined();
      // email method re-sends the code at challenge time
      expect(mockPublish).toHaveBeenCalledWith(
        "user.two_factor_code",
        expect.anything(),
      );

      const wrong = await request(server())
        .post("/account/methods/2fa/verify")
        .send({ mfa_token: challenge.body.mfa_token, code: "000000" })
        .expect(401);
      expect(wrong.body.message).toBe("Invalid verification code");

      const ok = await request(server())
        .post("/account/methods/2fa/verify")
        .send({ mfa_token: challenge.body.mfa_token, code: await latestCode() })
        .expect(201);
      expect(ok.body.access_token).toBeDefined();
      expect(ok.body.refresh_token).toBeDefined();
      expect(ok.headers["set-cookie"]).toBeDefined();
    });

    it("a recovery code works exactly once", async () => {
      const challenge = await login("alice@test", "password123").expect(201);

      const first = await request(server())
        .post("/account/methods/2fa/verify")
        .send({ mfa_token: challenge.body.mfa_token, code: recoveryCodes[0] })
        .expect(201);
      expect(first.body.access_token).toBeDefined();

      const second = await request(server())
        .post("/account/methods/2fa/verify")
        .send({ mfa_token: challenge.body.mfa_token, code: recoveryCodes[0] })
        .expect(401);
      expect(second.body.message).toBe("Invalid verification code");
    });

    it("mfa_token is not accepted as an access token", async () => {
      const challenge = await login("alice@test", "password123").expect(201);
      await request(server())
        .get("/account/self")
        .set("Authorization", `Bearer ${challenge.body.mfa_token}`)
        .expect(401);
    });

    it("locks verification after 5 failed attempts", async () => {
      const challenge = await login("alice@test", "password123").expect(201);
      for (let i = 0; i < 5; i++) {
        await request(server())
          .post("/account/methods/2fa/verify")
          .send({ mfa_token: challenge.body.mfa_token, code: "000000" })
          .expect(401);
      }
      // even a fresh valid code is rejected while locked
      await request(server())
        .post("/account/methods/2fa/verify")
        .send({ mfa_token: challenge.body.mfa_token, code: await latestCode() })
        .expect(401);
    });

    it("disable requires the account password", async () => {
      // enable email 2FA for bob (alice is locked from the previous test)
      const bobToken = (await login("bob@test", "password123")).body
        .access_token;

      await request(server())
        .post("/account/methods/2fa/setup")
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ method: "email" })
        .expect(201);
      await request(server())
        .post("/account/methods/2fa/setup/confirm")
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ code: await latestCode() })
        .expect(201);

      const bad = await request(server())
        .post("/account/methods/2fa/disable")
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ password: "wrong-password" })
        .expect(401);
      expect(bad.body.message).toBe("Invalid credentials");

      const off = await request(server())
        .post("/account/methods/2fa/disable")
        .set("Authorization", `Bearer ${bobToken}`)
        .send({ password: "password123" })
        .expect(201);
      expect(off.body.success).toBe(true);

      const status = await request(server())
        .get("/account/methods/2fa/status")
        .set("Authorization", `Bearer ${bobToken}`)
        .expect(200);
      expect(status.body.enabled).toBe(false);
    });
  });

  describe("totp method", () => {
    let accessToken: string;
    let secret: string;

    it("setup returns an otpauth URI with the secret", async () => {
      accessToken = (await login("bob@test", "password123")).body.access_token;

      const setup = await request(server())
        .post("/account/methods/2fa/setup")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ method: "totp" })
        .expect(201);

      expect(setup.body.otpauth).toMatch(/^otpauth:\/\/totp\//);
      const uri = new URL(setup.body.otpauth);
      secret = uri.searchParams.get("secret");
      expect(secret).toBeTruthy();
    });

    it("confirm accepts the current TOTP code and login completes with it", async () => {
      const confirm = await request(server())
        .post("/account/methods/2fa/setup/confirm")
        .set("Authorization", `Bearer ${accessToken}`)
        .send({ code: authenticator.generate(secret) })
        .expect(201);
      expect(confirm.body.recoveryCodes).toHaveLength(10);

      const challenge = await login("bob@test", "password123").expect(201);
      expect(challenge.body.twoFactorRequired).toBe(true);

      const ok = await request(server())
        .post("/account/methods/2fa/verify")
        .send({
          mfa_token: challenge.body.mfa_token,
          code: authenticator.generate(secret),
        })
        .expect(201);
      expect(ok.body.access_token).toBeDefined();
    });

    it("rejects a stale/garbage TOTP code", async () => {
      const challenge = await login("bob@test", "password123").expect(201);
      await request(server())
        .post("/account/methods/2fa/verify")
        .send({ mfa_token: challenge.body.mfa_token, code: "123456" })
        .expect(401);
    });

    it("mfa_token is single-use: replaying a successful exchange fails", async () => {
      const challenge = await login("bob@test", "password123").expect(201);
      const code = authenticator.generate(secret);

      const first = await request(server())
        .post("/account/methods/2fa/verify")
        .send({ mfa_token: challenge.body.mfa_token, code })
        .expect(201);
      expect(first.body.access_token).toBeDefined();

      // Same challenge token + same (still valid within the TOTP window)
      // code — only the recorded jti makes this a detected replay.
      const replay = await request(server())
        .post("/account/methods/2fa/verify")
        .send({ mfa_token: challenge.body.mfa_token, code })
        .expect(401);
      expect(replay.body.message).toBe("Invalid verification code");
    });
  });
});
