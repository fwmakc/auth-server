import { DtoColumn, DtoCreatedColumn, DtoUpdatedColumn } from "@core/common";
import { CommonDto } from "@core/common";

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
