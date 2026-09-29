import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

// bcryptjs operates on at most 72 bytes — longer secrets are silently truncated
const DEFAULT_MIN_LENGTH = 6;
const DEFAULT_MAX_LENGTH = 72;

/**
 * Password policy driven entirely by env: a variable set to a truthy value
 * ("true"/"1"/"yes"/"on") turns the requirement on, otherwise it is off.
 * Defaults reproduce the historical behavior (min 6, no complexity rules).
 */
@Injectable()
export class PasswordPolicyService {
  constructor(private readonly configService: ConfigService) {}

  private enabled(name: string): boolean {
    const value = this.configService.get(name);
    return ["true", "1", "yes", "on"].includes(String(value).toLowerCase());
  }

  private number(name: string, fallback: number): number {
    const parsed = Number(this.configService.get(name));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  /** Returns the list of violations; empty list means the password is valid. */
  validate(password: string): string[] {
    if (!password || typeof password !== "string") {
      return ["Password is required"];
    }

    const errors: string[] = [];
    const min = this.number("PASSWORD_MIN_LENGTH", DEFAULT_MIN_LENGTH);
    const max = this.number("PASSWORD_MAX_LENGTH", DEFAULT_MAX_LENGTH);

    if (password.length < min) {
      errors.push(`Password must be at least ${min} characters long`);
    }
    if (password.length > max) {
      errors.push(`Password must not exceed ${max} characters`);
    }
    if (this.enabled("PASSWORD_REQUIRE_LOWER") && !/[a-z]/.test(password)) {
      errors.push("Password must contain a lowercase letter (a-z)");
    }
    if (this.enabled("PASSWORD_REQUIRE_UPPER") && !/[A-Z]/.test(password)) {
      errors.push("Password must contain an uppercase letter (A-Z)");
    }
    if (this.enabled("PASSWORD_REQUIRE_DIGITS") && !/[0-9]/.test(password)) {
      errors.push("Password must contain a digit (0-9)");
    }
    if (
      this.enabled("PASSWORD_REQUIRE_SYMBOLS") &&
      !/[^A-Za-z0-9]/.test(password)
    ) {
      errors.push(
        "Password must contain a symbol (any character other than latin letters and digits)",
      );
    }

    return errors;
  }

  /** Throws BadRequestException with all violations joined if invalid. */
  assertValid(password: string): void {
    const errors = this.validate(password);
    if (errors.length) {
      throw new BadRequestException(errors.join("; "));
    }
  }
}
