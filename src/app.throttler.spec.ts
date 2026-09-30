import "reflect-metadata";
import { ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { AppThrottlerGuard, throttleEnvInt } from "./app.throttler";

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
