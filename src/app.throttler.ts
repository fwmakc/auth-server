import { ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard, ThrottlerStorage } from "@nestjs/throttler";
import { ThrottlerStorageRedisService } from "@nest-lab/throttler-storage-redis";
import Redis from "ioredis";

/**
 * Positive-integer env reader for throttle settings; anything but a plain
 * positive integer falls back to the default — a bad value must not
 * disable (or silently reinterpret) the rate limit.
 */
export const throttleEnvInt = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (!raw || !/^\d+$/.test(raw)) return fallback;
  const parsed = parseInt(raw, 10);
  return parsed > 0 ? parsed : fallback;
};

/**
 * Named throttle sets, shared by app.module.ts (ThrottlerModule.forRoot
 * defaults) and the per-route @Throttle decorators (which override the
 * defaults, so both must read the same env). Env-tunable so a deployment
 * can trade brute-force protection for throughput (load testing, trusted
 * internal networks) without a rebuild. Defaults keep the historical
 * limits: 10/s default, 5/min login/confirm/2FA, 3/min register/reset,
 * 10/min token endpoints.
 */
const AUTH_TTL = throttleEnvInt("THROTTLE_AUTH_TTL", 60000);

/** Login / confirm / 2FA verification tier. */
export const AUTH_THROTTLE = {
  auth: { ttl: AUTH_TTL, limit: throttleEnvInt("THROTTLE_AUTH_LIMIT", 5) },
};
/** Register / reset / password-change tier (mail-bombing surface). */
export const AUTH_THROTTLE_STRICT = {
  auth: {
    ttl: AUTH_TTL,
    limit: throttleEnvInt("THROTTLE_AUTH_STRICT_LIMIT", 3),
  },
};
/** Refresh / session token endpoints. */
export const TOKEN_THROTTLE = {
  auth: { ttl: AUTH_TTL, limit: throttleEnvInt("THROTTLE_TOKEN_LIMIT", 10) },
};

/** ThrottlerModule defaults; routes with @Throttle override these. */
export const throttlerDefaults = () => [
  {
    name: "default",
    ttl: throttleEnvInt("THROTTLE_DEFAULT_TTL", 1000),
    limit: throttleEnvInt("THROTTLE_DEFAULT_LIMIT", 10),
  },
  { name: "auth", ttl: AUTH_TTL, limit: AUTH_THROTTLE.auth.limit },
];

/**
 * Rate-limit counter storage. In-memory by default — correct for a single
 * replica, but N replicas would each enforce their own limit, multiplying
 * the effective cap. THROTTLE_STORAGE=redis moves counters into Redis
 * (REDIS_URL) so all replicas share one counter set. Fail-closed: when
 * Redis is unreachable, storage calls reject and guarded requests fail —
 * a rate limiter must not silently fail open.
 */
export const buildThrottleStorage = (
  env: NodeJS.ProcessEnv = process.env,
): ThrottlerStorage | undefined => {
  if (env.THROTTLE_STORAGE !== "redis") return undefined;
  if (!env.REDIS_URL) {
    throw new Error("THROTTLE_STORAGE=redis requires REDIS_URL");
  }
  return new ThrottlerStorageRedisService(
    new Redis(env.REDIS_URL, {
      // Connect at boot (not lazily): with lazyConnect the first requests
      // would 500 on the not-yet-open stream (fail-closed, but needless).
      enableOfflineQueue: false, // fail fast while disconnected
      maxRetriesPerRequest: 2,
      connectTimeout: 3000,
    }),
  );
};

/**
 * Skips rate limiting for the health endpoint: docker/k8s probes and nginx
 * upstream checks hit it far more often than a human would, and a 429 on
 * /health marks the container unhealthy and cascades into restarts.
 */
export class AppThrottlerGuard extends ThrottlerGuard {
  protected override async shouldSkip(
    context: ExecutionContext,
  ): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    if (request?.path === "/health") {
      return true;
    }
    return super.shouldSkip(context);
  }
}
