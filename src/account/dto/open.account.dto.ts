import { DtoColumn, DtoEnumColumn } from "api-server-toolkit";
import { CommonDto } from "api-server-toolkit";
import { TypeResponses } from "api-server-toolkit";

export class OpenAccountDto extends CommonDto {
  @DtoEnumColumn("Тип запроса. Один из token или code", TypeResponses, {
    required: true,
  })
  response_type: TypeResponses;

  @DtoColumn("ID клиентского приложения")
  client_id: string;

  @DtoColumn("Url перенаправления после авторизации")
  redirect_uri: string;

  @DtoColumn("Состояние, используется для защиты от CSRF")
  state: string;
}
