import "reflect-metadata";
import { ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import {
  AppThrottlerGuard,
  buildThrottleStorage,
  throttleEnvInt,
} from "./app.throttler";

// Real ioredis would dial redis://localhost from the spec (and retry
// forever where no Redis runs) — a class mock keeps the library's
// `client instanceof Redis` check happy while recording the options.
jest.mock("ioredis", () => {
  class RedisMock {
    url: string;
    options: Record<string, unknown>;
    status = "connecting";
    constructor(url: string, options: Record<string, unknown> = {}) {
      this.url = url;
      this.options = options;
    }
  }
  return { __esModule: true, default: RedisMock };
});

describe("throttleEnvInt", () => {
  const NAME = "THROTTLE_SPEC_VAR";

  afterEach(() => {
    delete process.env[NAME];
  });

  it("returns the default when the variable is unset", () => {
    expect(throttleEnvInt(NAME, 5)).toBe(5);
  });

  it("parses a positive integer", () => {
    process.env[NAME] = "42";
    expect(throttleEnvInt(NAME, 5)).toBe(42);
  });

  it("falls back on zero, negative, and garbage values", () => {
    for (const bad of ["0", "-3", "abc", "3.7"]) {
      process.env[NAME] = bad;
      expect(throttleEnvInt(NAME, 5)).toBe(5);
    }
  });
});

describe("buildThrottleStorage", () => {
  const ENV = { THROTTLE_STORAGE: "", REDIS_URL: "" } as NodeJS.ProcessEnv;

  it("defaults to in-memory storage (undefined)", () => {
    ENV.THROTTLE_STORAGE = "memory";
    expect(buildThrottleStorage(ENV)).toBeUndefined();
    const unset = { ...ENV } as NodeJS.ProcessEnv;
    delete unset.THROTTLE_STORAGE;
    expect(buildThrottleStorage(unset)).toBeUndefined();
  });

  it("throws when redis storage is requested without REDIS_URL", () => {
    ENV.THROTTLE_STORAGE = "redis";
    ENV.REDIS_URL = "";
    expect(() => buildThrottleStorage(ENV)).toThrow("REDIS_URL");
  });

  it("builds a redis-backed storage when both variables are set", () => {
    ENV.THROTTLE_STORAGE = "redis";
    ENV.REDIS_URL = "redis://redis:6379";
    const storage: any = buildThrottleStorage(ENV);
    expect(storage).toBeDefined();
    expect(storage.constructor.name).toBe("ThrottlerStorageRedisService");
    expect(storage.redis.url).toBe("redis://redis:6379");
    // fail-closed while disconnected; bounded retries, no endless queue
    expect(storage.redis.options.enableOfflineQueue).toBe(false);
    expect(storage.redis.options.maxRetriesPerRequest).toBe(2);
    expect(storage.redis.options.connectTimeout).toBe(3000);
  });
});

describe("AppThrottlerGuard", () => {
  const buildGuard = () => {
    const guard = new AppThrottlerGuard(
      { throttlers: [] },
      { increment: jest.fn() } as any,
      { getAllAndOverride: jest.fn() } as any,
    );
    jest
      .spyOn(ThrottlerGuard.prototype as any, "shouldSkip")
      .mockResolvedValue(false);
    return guard;
  };

  const buildContext = (path: string) =>
    ({
      switchToHttp: () => ({ getRequest: () => ({ path }) }),
      getHandler: () => jest.fn(),
      getClass: () => class {},
      getType: () => "http",
    }) as unknown as ExecutionContext;

  it("skips rate limiting for /health", async () => {
    const guard = buildGuard();
    await expect(
      (guard as any).shouldSkip(buildContext("/health")),
    ).resolves.toBe(true);
  });

  it("does not skip any other route", async () => {
    const guard = buildGuard();
    await expect(
      (guard as any).shouldSkip(buildContext("/account/login")),
    ).resolves.toBe(false);
  });
});
