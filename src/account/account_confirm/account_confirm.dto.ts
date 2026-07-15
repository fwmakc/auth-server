import {
  DtoColumn,
  DtoCreatedColumn,
  DtoUpdatedColumn,
} from "@src/common/common.column";
import { CommonDto } from "@src/common/common.dto";

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
