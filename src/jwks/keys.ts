import * as crypto from "crypto";
import * as fs from "fs";

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

function computeKid(jwk: { e: string; kty: string; n: string }): string {
  const data = JSON.stringify({
    e: jwk.e,
    kty: jwk.kty,
    n: jwk.n,
  });
  return crypto.createHash("sha256").update(data).digest("base64url");
}

let cachedKeySet: KeySet | null = null;

export function getKeySet(): KeySet {
  if (cachedKeySet) return cachedKeySet;

  const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH;
  const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH;

  let privateKey: string;
  let publicKey: string;

  if (
    privateKeyPath &&
    publicKeyPath &&
    fs.existsSync(privateKeyPath) &&
    fs.existsSync(publicKeyPath)
  ) {
    privateKey = fs.readFileSync(privateKeyPath, "utf8");
    publicKey = fs.readFileSync(publicKeyPath, "utf8");
  } else {
    const { privateKey: priv, publicKey: pub } = crypto.generateKeyPairSync(
      "rsa",
      { modulusLength: 2048 }
    );
    privateKey = priv.export({ type: "pkcs8", format: "pem" }).toString();
    publicKey = pub.export({ type: "spki", format: "pem" }).toString();
  }

  const pubKeyObject = crypto.createPublicKey(publicKey);
  const pubJwk = pubKeyObject.export({ format: "jwk" }) as {
    e: string;
    kty: string;
    n: string;
  };
  const kid = computeKid(pubJwk);

  cachedKeySet = {
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

  return cachedKeySet;
}
