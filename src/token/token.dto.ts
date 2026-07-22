import { CommonDto } from "api-server-toolkit";
import { DtoColumn } from "api-server-toolkit";

export class TokenDto extends CommonDto {
  @DtoColumn("Токен доступа")
  access_token?: string;

  @DtoColumn("Срок действия токена доступа")
  expires_in?: number;

  @DtoColumn("Токен обновления")
  refresh_token?: string;
}
