import { ApiProperty } from "@nestjs/swagger";
import { DtoColumn, DtoCreatedColumn, DtoUpdatedColumn } from "api-server-toolkit";
import { CommonDto } from "api-server-toolkit";
import { AccountDto } from "../account.dto";

export class AccountSessionsDto extends CommonDto {
  @DtoCreatedColumn()
  createdAt?: Date;

  @DtoUpdatedColumn()
  updatedAt?: Date;

  @DtoColumn("Поле с описанием или комментариями к этой записи")
  description?: string;

  @DtoColumn("IP-адрес пользователя")
  ip?: string;

  @DtoColumn("Агент (браузер) пользователя")
  userAgent?: string;

  @DtoColumn("Ссылка, по которой была открыта сессия")
  referrer?: string;

  @DtoColumn("Метод, по которому была открыта сессия")
  method?: string;

  @DtoColumn("Текущая языковая локаль пользователя")
  locale?: string;

  @DtoColumn("Временная зона, формат +/-00:00")
  timezone?: string;

  @ApiProperty({
    required: false,
    description: "Данные account записи, связанной с этой сессией",
    type: () => AccountDto,
  })
  account?: AccountDto;
}
