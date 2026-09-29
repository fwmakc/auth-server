import { IsEnum, IsOptional, IsString } from "class-validator";
import { DtoColumn } from "api-server-toolkit";

export class TwoFactorSetupDto {
  @IsEnum(["totp", "email"])
  @DtoColumn("Метод двухфакторной аутентификации")
  method: "totp" | "email";
}

export class TwoFactorCodeDto {
  @IsString()
  @DtoColumn("Одноразовый код (TOTP, email-код или recovery-код)")
  code: string;
}

export class TwoFactorDisableDto {
  @IsString()
  @DtoColumn("Пароль аккаунта для подтверждения отключения")
  password: string;
}

export class TwoFactorVerifyDto {
  @IsString()
  @DtoColumn("Токен вызова из ответа login (twoFactorRequired)")
  mfa_token: string;

  @IsString()
  @DtoColumn("Одноразовый код (TOTP, email-код или recovery-код)")
  code: string;

  @IsOptional()
  @IsString()
  state?: string;
}
