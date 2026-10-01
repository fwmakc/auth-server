import * as crypto from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as jwt from "jsonwebtoken";
import {
  getKeyRing,
  getKeySet,
  findVerificationKey,
  kidOfToken,
  resetKeyRingCache,
} from "./keys";

describe("jwks key ring (rotation overlap)", () => {
  let dir: string;
  let currentPrivate: string;
  let currentPublic: string;
  let previousPrivate: string;
  let previousPublic: string;

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "jwt-keys-"));
    const current = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const previous = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    currentPrivate = path.join(dir, "jwt-private.pem");
    currentPublic = path.join(dir, "jwt-public.pem");
    previousPrivate = path.join(dir, "jwt-private-old.pem");
    previousPublic = path.join(dir, "jwt-public-retired.pem");
    fs.writeFileSync(currentPrivate, current.privateKey.export({ type: "pkcs8", format: "pem" }));
    fs.writeFileSync(currentPublic, current.publicKey.export({ type: "spki", format: "pem" }));
    fs.writeFileSync(previousPrivate, previous.privateKey.export({ type: "pkcs8", format: "pem" }));
    fs.writeFileSync(previousPublic, previous.publicKey.export({ type: "spki", format: "pem" }));
  });

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  beforeEach(() => {
    resetKeyRingCache();
    process.env.JWT_PRIVATE_KEY_PATH = currentPrivate;
    process.env.JWT_PUBLIC_KEY_PATH = currentPublic;
    process.env.JWT_PREVIOUS_PUBLIC_KEY_PATHS = previousPublic;
  });

  afterEach(() => {
    delete process.env.JWT_PRIVATE_KEY_PATH;
    delete process.env.JWT_PUBLIC_KEY_PATH;
    delete process.env.JWT_PREVIOUS_PUBLIC_KEY_PATHS;
  });

  it("exposes signing + previous keys in the ring, signing first", () => {
    const ring = getKeyRing();
    expect(ring.verification).toHaveLength(2);
    expect(ring.verification[0].kid).toBe(ring.signing.kid);
    expect(ring.verification[1].kid).not.toBe(ring.signing.kid);
  });

  it("getKeySet stays the signing key (backward compat)", () => {
    expect(getKeySet().kid).toBe(getKeyRing().signing.kid);
  });

  it("selects the previous key by the retired token's kid", () => {
    const ring = getKeyRing();
    const oldPriv = fs.readFileSync(previousPrivate, "utf8");
    const oldToken = jwt.sign({ id: 1, type: "access" }, oldPriv, {
      algorithm: "RS256",
      keyid: ring.verification[1].kid,
      expiresIn: "5m",
    });
    expect(kidOfToken(oldToken)).toBe(ring.verification[1].kid);
    const selected = findVerificationKey(kidOfToken(oldToken));
    expect(selected.kid).toBe(ring.verification[1].kid);
    // the old token verifies against the selected (retired) public key…
    expect(() => jwt.verify(oldToken, selected.publicKey, { algorithms: ["RS256"] })).not.toThrow();
    // …and fails against the current one (proof the selection matters).
    expect(() =>
      jwt.verify(oldToken, ring.signing.publicKey, { algorithms: ["RS256"] }),
    ).toThrow();
  });

  it("falls back to the signing key without/with unknown kid", () => {
    expect(findVerificationKey(undefined).kid).toBe(getKeySet().kid);
    expect(findVerificationKey("unknown-kid").kid).toBe(getKeySet().kid);
  });

  it("a current-key token keeps verifying through the same path", () => {
    const ring = getKeyRing();
    const token = jwt.sign(
      { id: 1, type: "access" },
      fs.readFileSync(currentPrivate, "utf8"),
      {
        algorithm: "RS256",
        keyid: ring.signing.kid,
        expiresIn: "5m",
      },
    );
    expect(() =>
      jwt.verify(token, findVerificationKey(kidOfToken(token)).publicKey, {
        algorithms: ["RS256"],
      }),
    ).not.toThrow();
  });

  it("fails fast on a missing previous key file", () => {
    process.env.JWT_PREVIOUS_PUBLIC_KEY_PATHS = path.join(dir, "no-such.pem");
    resetKeyRingCache();
    expect(() => getKeyRing()).toThrow(/not found/);
  });

  it("handles an empty previous list (no rotation in progress)", () => {
    delete process.env.JWT_PREVIOUS_PUBLIC_KEY_PATHS;
    resetKeyRingCache();
    expect(getKeyRing().verification).toHaveLength(1);
  });
});
