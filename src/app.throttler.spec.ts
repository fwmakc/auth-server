import "reflect-metadata";
import { ExecutionContext } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";
import { AppThrottlerGuard } from "./app.throttler";

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
