import { DtoColumn, DtoEnumColumn } from "api-server-toolkit";
import { CommonDto } from "api-server-toolkit";
import { TypeGrants } from "api-server-toolkit";
import { IsOptional, IsString } from "class-validator";

// Every optional field needs a class-validator decorator: the global
// ValidationPipe runs with whitelist + forbidNonWhitelisted, and properties
// without decorators are rejected as "should not exist".
export class GrantsTokenDto extends CommonDto {
  @DtoEnumColumn(
    "Тип гранта. Один из password, refresh_token, authorization_code, client_credentials",
    TypeGrants,
    { required: true },
  )
  grant_type: TypeGrants;

  @IsOptional()
  @IsString()
  @DtoColumn("ID клиентского приложения")
  client_id?: string;

  @IsOptional()
  @IsString()
  @DtoColumn("Секретный ключ клиентского приложения")
  client_secret?: string;

  @IsOptional()
  @IsString()
  @DtoColumn("Пароль приложения")
  client_password?: string;

  @IsOptional()
  @IsString()
  @DtoColumn("Имя пользователя")
  username?: string;

  @IsOptional()
  @IsString()
  @DtoColumn("Пароль пользователя")
  password?: string;

  @IsOptional()
  @IsString()
  @DtoColumn("Токен обновления")
  refresh_token?: string;

  @IsOptional()
  @IsString()
  @DtoColumn("Код авторизации")
  code?: string;

  @IsOptional()
  @IsString()
  @DtoColumn(
    "Ключ для беспарольного доступа, сгенерированный как хэш от chatId",
  )
  key?: string;

  @IsOptional()
  @IsString()
  @DtoColumn("Url перенаправления после авторизации")
  redirect_uri?: string;

  @IsOptional()
  @IsString()
  @DtoColumn("Состояние, используется для защиты от CSRF")
  state?: string;
}
