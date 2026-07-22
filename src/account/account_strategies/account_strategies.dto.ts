import { ApiProperty } from "@nestjs/swagger";
import { DtoColumn, DtoCreatedColumn, DtoUpdatedColumn } from "api-server-toolkit";
import { CommonDto } from "api-server-toolkit";
import { AccountDto } from "../account.dto";

export class AccountStrategiesDto extends CommonDto {
  @DtoCreatedColumn()
  createdAt?: Date;

  @DtoUpdatedColumn()
  updatedAt?: Date;

  @DtoColumn(
    "Название стратегии OAuth 2.0, реализованной через библиотеку passport.js"
  )
  name?: string;

  @DtoColumn("ID пользователя на сервере OAuth 2.0")
  uid?: string;

  @DtoColumn("Данные пользователя с сервера OAuth 2.0")
  json?: string;

  @DtoColumn("Токен доступа для аккаунта сервера OAuth 2.0")
  accessToken?: string;

  @DtoColumn("Токен обновления для аккаунта сервера OAuth 2.0")
  refreshToken?: string;

  @ApiProperty({
    required: false,
    description: "Данные авторизации, связанной с этой записью",
    type: () => AccountDto,
  })
  account?: AccountDto;
}
