import { DtoColumn, DtoCreatedColumn, DtoUpdatedColumn } from "api-server-toolkit";
import { CommonDto } from "api-server-toolkit";

export class AccountConfirmDto extends CommonDto {
  @DtoCreatedColumn()
  createdAt?: Date;

  @DtoUpdatedColumn()
  updatedAt?: Date;

  @DtoColumn("Код подтверждения регистрации пользователя")
  code: string;

  @DtoColumn(
    "Тип кода: confirm - подтверждение регистрации, reset - сброс пароля"
  )
  type: string;
}
