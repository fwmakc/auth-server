// Re-encrypt AES envelopes to the current key version (secret rotation).
//
// Envelopes written before toolkit 0.25.0 have no `v` field (key version 1);
// new writes carry the highest configured AES_SECRET_V<N>. This script
// decrypts every stored envelope with its own version and re-encrypts it
// with the current one, so the old key can be retired:
//
//   1. add the new key:  AES_SECRET_V2=<hex>   (AES_SECRET stays for now)
//   2. restart auth-server (envelope v:2 from now on)
//   3. node scripts/reencrypt-aes.mjs            (dry run — shows the plan)
//   4. node scripts/reencrypt-aes.mjs --apply
//   5. when it reports 0 remaining v:1 rows everywhere, drop AES_SECRET
//
// Runs inside the auth-server container (uses its node_modules and DB env).
// Idempotent: rows already at the current version are skipped, safe to re-run.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { encrypt, decrypt, currentAesVersion } = require("api-server-toolkit");
const { Client } = require("pg");

const apply = process.argv.includes("--apply");

async function main() {
  const targetVersion = currentAesVersion();
  console.log(
    `[reencrypt] current AES key version: v${targetVersion}; mode: ${apply ? "APPLY" : "dry run (--apply to write)"}`,
  );

  const client = new Client({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  await client.connect();

  let totalReencrypted = 0;
  let totalFailed = 0;

  // TEXT columns holding JSON.stringify(envelope)
  for (const [table, column] of [
    ["account_strategies", "access_token"],
    ["account_strategies", "refresh_token"],
  ]) {
    const stats = await reencryptTextColumn(client, table, column, targetVersion);
    totalReencrypted += stats.reencrypted;
    totalFailed += stats.failed;
  }

  // JSON column — the driver returns the envelope as an object
  {
    const stats = await reencryptJsonColumn(client, "account_two_factor", "secret", targetVersion);
    totalReencrypted += stats.reencrypted;
    totalFailed += stats.failed;
  }

  await client.end();

  console.log(
    `[reencrypt] done: ${totalReencrypted} re-encrypted, ${totalFailed} failed`,
  );
  if (totalFailed > 0) {
    console.log(
      "[reencrypt] failures mean the old key for that row's version is not configured — " +
        "set the missing AES_SECRET_V<N> and re-run. Do NOT retire the old key yet.",
    );
    process.exit(1);
  }
}

function parseEnvelope(raw) {
  if (raw === null || raw === undefined) return null;
  const envelope = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!envelope || typeof envelope !== "object" || !envelope.encrypted || !envelope.iv) {
    return null;
  }
  return envelope;
}

async function reencryptTextColumn(client, table, column, targetVersion) {
  const stats = { scanned: 0, current: 0, reencrypted: 0, failed: 0, empty: 0 };
  const { rows } = await client.query(
    `SELECT id, ${column} AS payload FROM ${table} WHERE ${column} IS NOT NULL`,
  );
  for (const row of rows) {
    stats.scanned++;
    let envelope;
    try {
      envelope = parseEnvelope(row.payload);
    } catch {
      stats.failed++;
      console.log(`[reencrypt] ${table}.${column} id=${row.id}: not a JSON envelope, skipping`);
      continue;
    }
    if (!envelope) {
      stats.empty++;
      continue;
    }
    if ((envelope.v || 1) === targetVersion) {
      stats.current++;
      continue;
    }
    try {
      const plain = await decrypt(envelope.encrypted, envelope.iv, envelope.v || 1);
      const next = await encrypt(plain);
      if (apply) {
        await client.query(`UPDATE ${table} SET ${column} = $1 WHERE id = $2`, [
          JSON.stringify(next),
          row.id,
        ]);
      }
      stats.reencrypted++;
    } catch (e) {
      stats.failed++;
      console.log(`[reencrypt] ${table}.${column} id=${row.id}: ${e.message}`);
    }
  }
  report(table, column, stats, targetVersion);
  return stats;
}

async function reencryptJsonColumn(client, table, column, targetVersion) {
  const stats = { scanned: 0, current: 0, reencrypted: 0, failed: 0, empty: 0 };
  const { rows } = await client.query(
    `SELECT id, ${column} AS payload FROM ${table} WHERE ${column} IS NOT NULL`,
  );
  for (const row of rows) {
    stats.scanned++;
    const envelope = parseEnvelope(row.payload);
    if (!envelope) {
      stats.empty++;
      continue;
    }
    if ((envelope.v || 1) === targetVersion) {
      stats.current++;
      continue;
    }
    try {
      const plain = await decrypt(envelope.encrypted, envelope.iv, envelope.v || 1);
      const next = await encrypt(plain);
      if (apply) {
        await client.query(`UPDATE ${table} SET ${column} = $1 WHERE id = $2`, [
          JSON.stringify(next),
          row.id,
        ]);
      }
      stats.reencrypted++;
    } catch (e) {
      stats.failed++;
      console.log(`[reencrypt] ${table}.${column} id=${row.id}: ${e.message}`);
    }
  }
  report(table, column, stats, targetVersion);
  return stats;
}

function report(table, column, stats, targetVersion) {
  console.log(
    `[reencrypt] ${table}.${column}: scanned=${stats.scanned}, ` +
      `already v${targetVersion}=${stats.current}, re-encrypted=${stats.reencrypted}` +
      `${apply ? "" : " (dry run)"}, not-an-envelope=${stats.empty}, failed=${stats.failed}`,
  );
}

main().catch((e) => {
  console.error(`[reencrypt] fatal: ${e.message}`);
  process.exit(1);
});
