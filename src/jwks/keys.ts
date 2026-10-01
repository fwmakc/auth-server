import * as crypto from "crypto";
import * as fs from "fs";
import { Logger } from "@nestjs/common";

export interface RsaJwk {
  kty: string;
  kid: string;
  use: string;
  alg: string;
  n: string;
  e: string;
}

export interface KeySet {
  privateKey: string;
  publicKey: string;
  kid: string;
  jwk: RsaJwk;
}

export interface KeyRing {
  // Current pair — signs every new token, first in the JWKS.
  signing: KeySet;
  // signing + every previous public key (JWT_PREVIOUS_PUBLIC_KEY_PATHS).
  // Old-key tokens stay verifiable until they expire naturally.
  verification: KeySet[];
}

function computeKid(jwk: { e: string; kty: string; n: string }): string {
  const data = JSON.stringify({
    e: jwk.e,
    kty: jwk.kty,
    n: jwk.n,
  });
  return crypto.createHash("sha256").update(data).digest("base64url");
}

function toKeySet(privateKey: string, publicKey: string): KeySet {
  const pubKeyObject = crypto.createPublicKey(publicKey);
  const pubJwk = pubKeyObject.export({ format: "jwk" }) as {
    e: string;
    kty: string;
    n: string;
  };
  const kid = computeKid(pubJwk);
  return {
    privateKey,
    publicKey,
    kid,
    jwk: {
      kty: "RSA",
      kid,
      use: "sig",
      alg: "RS256",
      n: pubJwk.n,
      e: pubJwk.e,
    },
  };
}

function readPublicKeyPath(path: string): KeySet {
  return toKeySet("", fs.readFileSync(path, "utf8"));
}

let cachedKeyRing: KeyRing | null = null;

// Tests re-enter getKeyRing() with different env/files per case.
export function resetKeyRingCache(): void {
  cachedKeyRing = null;
}

export function getKeyRing(): KeyRing {
  if (cachedKeyRing) return cachedKeyRing;

  const logger = new Logger("JWKS");
  const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH;
  const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH;

  let signing: KeySet;

  if (
    privateKeyPath &&
    publicKeyPath &&
    fs.existsSync(privateKeyPath) &&
    fs.existsSync(publicKeyPath)
  ) {
    signing = toKeySet(
      fs.readFileSync(privateKeyPath, "utf8"),
      fs.readFileSync(publicKeyPath, "utf8"),
    );
  } else {
    logger.warn(
      "JWT_PRIVATE_KEY_PATH / JWT_PUBLIC_KEY_PATH not set or files missing. " +
        "Using ephemeral keys — all tokens invalidated on restart, multi-instance broken. " +
        "Set key paths in production.",
    );
    const { privateKey: priv, publicKey: pub } = crypto.generateKeyPairSync(
      "rsa",
      { modulusLength: 2048 },
    );
    signing = toKeySet(
      priv.export({ type: "pkcs8", format: "pem" }).toString(),
      pub.export({ type: "spki", format: "pem" }).toString(),
    );
  }

  // Rotation overlap: public keys of retired pairs stay verifiable (and
  // listed in the JWKS) until the env is cleaned up. A missing file is a
  // hard boot error — a silent drop would 401 every outstanding old token.
  const previousPaths = (process.env.JWT_PREVIOUS_PUBLIC_KEY_PATHS || "")
    .split(",")
    .map((path) => path.trim())
    .filter(Boolean);
  const previous = previousPaths.map((path) => {
    if (!fs.existsSync(path)) {
      throw new Error(
        `JWT_PREVIOUS_PUBLIC_KEY_PATHS: public key file not found: ${path}`,
      );
    }
    logger.log(`Rotation window: verifying previous key ${path}`);
    return readPublicKeyPath(path);
  });

  cachedKeyRing = { signing, verification: [signing, ...previous] };
  return cachedKeyRing;
}

export function getKeySet(): KeySet {
  return getKeyRing().signing;
}

// Pick the verification key whose kid matches the token header; unknown or
// missing kid falls back to the signing key (signature check fails there,
// which is exactly what a retired/foreign key deserves).
export function findVerificationKey(kid?: string): KeySet {
  const ring = getKeyRing();
  if (kid) {
    const match = ring.verification.find((key) => key.kid === kid);
    if (match) return match;
  }
  return ring.signing;
}

export function kidOfToken(token: string): string | undefined {
  try {
    const header = JSON.parse(
      Buffer.from(token.split(".")[0], "base64url").toString("utf8"),
    );
    return typeof header.kid === "string" ? header.kid : undefined;
  } catch {
    return undefined;
  }
}
