import { getJwtConfig } from "@src/config/jwt.config";

jest.mock("@src/jwks/keys", () => ({
  getKeySet: () => ({
    privateKey: "private",
    publicKey: "public",
    kid: "test-kid",
  }),
}));

const makeConfig = (env: Record<string, string>) =>
  ({
    get: (key: string) => env[key],
  }) as any;

describe("jwt.config — iss/aud binding", () => {
  it("adds issuer/audience to sign and verify options when set", async () => {
    const cfg = await getJwtConfig(
      makeConfig({ JWT_ISSUER: "fwmakc-auth", JWT_AUDIENCE: "fwmakc-stack" }),
    );

    expect(cfg.signOptions).toMatchObject({
      algorithm: "RS256",
      keyid: "test-kid",
      issuer: "fwmakc-auth",
      audience: "fwmakc-stack",
    });
    expect(cfg.verifyOptions).toMatchObject({
      algorithms: ["RS256"],
      issuer: "fwmakc-auth",
      audience: "fwmakc-stack",
    });
  });

  it("omits the claims when env is unset (legacy behavior)", async () => {
    const cfg = await getJwtConfig(makeConfig({}));

    expect(cfg.signOptions).toEqual({ algorithm: "RS256", keyid: "test-kid" });
    expect(cfg.verifyOptions).toEqual({ algorithms: ["RS256"] });
    expect("issuer" in (cfg.signOptions as object)).toBe(false);
    expect("audience" in (cfg.verifyOptions as object)).toBe(false);
  });
});
