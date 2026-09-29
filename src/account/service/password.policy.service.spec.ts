import { BadRequestException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { PasswordPolicyService } from "./password.policy.service";

describe("PasswordPolicyService", () => {
  let service: PasswordPolicyService;
  let env: Record<string, string>;

  beforeEach(async () => {
    env = {};
    const config = {
      get: jest.fn().mockImplementation((key: string) => env[key]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        PasswordPolicyService,
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    service = moduleRef.get(PasswordPolicyService);
  });

  describe("defaults (no env configured)", () => {
    it("accepts a password of 6+ characters without complexity rules", () => {
      expect(service.validate("abcdef")).toEqual([]);
      expect(service.validate("123456")).toEqual([]);
    });

    it("rejects a password shorter than 6 characters", () => {
      expect(service.validate("abc12")).toEqual([
        "Password must be at least 6 characters long",
      ]);
    });

    it("rejects an overly long password at the bcrypt 72-byte bound", () => {
      expect(service.validate("a".repeat(73))[0]).toContain("72");
      expect(service.validate("a".repeat(72))).toEqual([]);
    });

    it("rejects a missing password", () => {
      expect(service.validate(undefined)).toEqual(["Password is required"]);
      expect(service.validate("")).toEqual(["Password is required"]);
    });
  });

  describe("env overrides", () => {
    it("applies PASSWORD_MIN_LENGTH", () => {
      env.PASSWORD_MIN_LENGTH = "10";
      expect(service.validate("abcdef1234")).toEqual([]);
      expect(service.validate("abcdef123")[0]).toContain("at least 10");
    });

    it("applies PASSWORD_MAX_LENGTH", () => {
      env.PASSWORD_MAX_LENGTH = "8";
      expect(service.validate("a".repeat(8))).toEqual([]);
      expect(service.validate("a".repeat(9))[0]).toContain("8");
    });

    it("ignores non-positive or garbage numeric values", () => {
      env.PASSWORD_MIN_LENGTH = "abc";
      expect(service.validate("abcdef")).toEqual([]);
      env.PASSWORD_MIN_LENGTH = "-5";
      expect(service.validate("abcdef")).toEqual([]);
    });
  });

  describe("complexity requirements (enabled means enforced)", () => {
    it.each([
      ["PASSWORD_REQUIRE_LOWER", "ABCDEFGH1!", "lowercase"],
      ["PASSWORD_REQUIRE_UPPER", "abcdefgh1!", "uppercase"],
      ["PASSWORD_REQUIRE_DIGITS", "Abcdefgh!", "digit"],
      ["PASSWORD_REQUIRE_SYMBOLS", "Abcdefg1", "symbol"],
    ])(
      "enforces %s only when set to a truthy value",
      (key, badPassword, keyword) => {
        expect(service.validate(badPassword)).toEqual([]);

        env[key] = "true";
        const errors = service.validate(badPassword);
        expect(errors).toHaveLength(1);
        expect(errors[0].toLowerCase()).toContain(keyword);

        for (const truthy of ["1", "yes", "on", "TRUE"]) {
          env[key] = truthy;
          expect(service.validate(badPassword).length).toBe(1);
        }

        env[key] = "false";
        expect(service.validate(badPassword)).toEqual([]);
        env[key] = "0";
        expect(service.validate(badPassword)).toEqual([]);
      },
    );

    it("collects all violations in one pass", () => {
      env.PASSWORD_REQUIRE_UPPER = "true";
      env.PASSWORD_REQUIRE_DIGITS = "true";
      env.PASSWORD_REQUIRE_SYMBOLS = "true";
      expect(service.validate("abcdef")).toHaveLength(3);
    });
  });

  describe("assertValid", () => {
    it("passes silently for a valid password", () => {
      expect(() => service.assertValid("abcdef")).not.toThrow();
    });

    it("throws BadRequestException with joined messages", () => {
      env.PASSWORD_REQUIRE_DIGITS = "true";
      expect(() => service.assertValid("abc")).toThrow(BadRequestException);
      try {
        service.assertValid("abc");
      } catch (e) {
        expect(e.response?.message).toContain("at least 6");
        expect(e.response?.message).toContain("digit");
      }
    });
  });
});
