import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AccountDto } from "./account.dto";

describe("AccountDto", () => {
  it("accepts a password-reset request without a password field", async () => {
    const dto = plainToInstance(AccountDto, {
      username: "user@test.local",
      subject: "Reset",
    });
    const errors = await validate(dto, { whitelist: true });
    expect(errors).toEqual([]);
  });

  it("still rejects a non-string password", async () => {
    const dto = plainToInstance(AccountDto, {
      username: "user@test.local",
      password: 12345,
    });
    const errors = await validate(dto, { whitelist: true });
    expect(errors.some((e) => e.property === "password")).toBe(true);
  });
});
