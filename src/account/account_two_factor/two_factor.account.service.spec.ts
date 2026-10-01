import "reflect-metadata";
import { TwoFactorAccountService } from "./two_factor.account.service";

const buildQueryBuilder = (raw: unknown[]) => {
  const qb: any = {};
  for (const method of ["update", "set", "where", "returning"]) {
    qb[method] = jest.fn().mockReturnValue(qb);
  }
  qb.execute = jest.fn().mockResolvedValue({ raw });
  return qb;
};

const buildService = (qb: any) => {
  const service = Object.create(
    TwoFactorAccountService.prototype,
  ) as TwoFactorAccountService;
  (service as any).repository = {
    createQueryBuilder: jest.fn().mockReturnValue(qb),
  };
  return service;
};

// emulate the pg driver: a naive UTC wallclock arrives as a Date parsed in
// the host's local frame, offset minutes away from the true instant
const asPgNaive = (t: Date) =>
  new Date(t.getTime() + new Date().getTimezoneOffset() * 60_000);

describe("TwoFactorAccountService.registerFailure", () => {
  it("increments atomically and reports the new counter", async () => {
    const qb = buildQueryBuilder([{ failed_attempts: 3, locked_until: null }]);
    const service = buildService(qb);
    const row = { id: 42 } as any;

    await expect(
      (service as any).registerFailure(row),
    ).resolves.toEqual({ failedAttempts: 3, locked: false });

    expect(qb.update).toHaveBeenCalledWith(expect.anything());
    expect(qb.where).toHaveBeenCalledWith("id = :id", { id: 42 });
    const set = qb.set.mock.calls[0][0];
    // both fields must switch on the SAME atomic counter expression
    expect(set.failedAttempts()).toContain(
      "COALESCE(failed_attempts, 0) + 1 >= 5",
    );
    expect(set.lockedUntil()).toContain(
      "COALESCE(failed_attempts, 0) + 1 >= 5",
    );
    // property paths — raw rows still come back with database names
    expect(qb.returning).toHaveBeenCalledWith([
      "failedAttempts",
      "lockedUntil",
    ]);
  });

  it("reports a lock when the update stamped a future locked_until", async () => {
    const future = new Date(Date.now() + 5 * 60 * 1000);
    const qb = buildQueryBuilder([
      { failed_attempts: 0, locked_until: asPgNaive(future) },
    ]);
    const service = buildService(qb);

    await expect(
      (service as any).registerFailure({ id: 7 } as any),
    ).resolves.toEqual({ failedAttempts: 0, locked: true });
  });

  it("treats a past locked_until as unlocked (stale lock row)", async () => {
    const past = new Date(Date.now() - 1000);
    const qb = buildQueryBuilder([
      { failed_attempts: 1, locked_until: asPgNaive(past) },
    ]);
    const service = buildService(qb);

    await expect(
      (service as any).registerFailure({ id: 7 } as any),
    ).resolves.toEqual({ failedAttempts: 1, locked: false });
  });
});
