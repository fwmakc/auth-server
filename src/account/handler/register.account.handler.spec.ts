import { RegisterAccountHandler } from "./register.account.handler";
import { PasswordPolicyService } from "../service/password.policy.service";

/**
 * Regression for the storm-ledger finding: the public register payload was
 * not stripped of isActivated — a register request could self-activate the
 * account and skip the emailed confirmation entirely (the register flow
 * then publishes user.registered without a confirmUrl).
 */
describe("RegisterAccountHandler", () => {
  const build = () => {
    const created: Array<Record<string, unknown>> = [];
    const handler = new RegisterAccountHandler(
      {
        findByUsername: jest.fn().mockResolvedValue(null),
        create: jest.fn(async (dto) => {
          created.push({ ...(dto as Record<string, unknown>) });
          return { id: 1, username: dto.username };
        }),
      } as any,
      {} as any, // accountConfirmService — not reached by authCreate
      { get: jest.fn() } as any, // configService
      { generate: jest.fn(async (pw) => `hashed(${pw})`) } as any,
      { assertValid: jest.fn() } as unknown as PasswordPolicyService,
    );
    return { handler, accountService: handler["accountService"], created };
  };

  it("strips client-controlled isActivated from the register payload", async () => {
    const { handler, created } = build();
    await handler.authCreate({
      username: "a@b.c",
      password: "Secret123!",
      isActivated: true,
    } as any);
    expect(created[0].isActivated).toBeUndefined();
  });

  it("does not let a self-activated payload skip the confirmation mail", async () => {
    // the register() flow branches on account.isActivated after authCreate:
    // with the strip in place a fresh account is always unactivated, so the
    // confirmUrl branch is the only reachable one for new registrations
    const { handler, created } = build();
    const account = await handler.authCreate({
      username: "a@b.c",
      password: "Secret123!",
      isActivated: true,
    } as any);
    expect(account.isActivated).toBeFalsy();
    expect(created[0].isActivated).toBeUndefined();
  });

  it("keeps an existing unactivated account on the resend path untouched", async () => {
    const existing = { id: 7, username: "a@b.c", isActivated: false };
    const { handler, accountService } = build();
    (accountService.findByUsername as jest.Mock).mockResolvedValue(existing);
    const result = await handler.authCreate({
      username: "a@b.c",
      password: "Secret123!",
    } as any);
    expect(result).toBe(existing);
    expect(accountService.create).not.toHaveBeenCalled();
  });
});
