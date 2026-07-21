import {
  DtoColumn,
  DtoCreatedColumn,
  DtoEnumColumn,
  DtoUpdatedColumn,
} from "@core/common";
import { CommonDto } from "@core/common";
import { TypeGenders } from "@core/common";

export class UsersDto extends CommonDto {
  @DtoCreatedColumn()
  createdAt?: Date;

  @DtoUpdatedColumn()
  updatedAt?: Date;

  @DtoColumn("Контактный email, не обязательно совпадает с логином")
  email?: string;

  @DtoColumn("Контактный телефон")
  phone?: string;

  @DtoColumn("Имя")
  name?: string;

  @DtoColumn("Фамилия")
  lastName?: string;

  @DtoColumn("Отчество")
  parentName?: string;

  @DtoColumn("Ссылка на аватарку")
  avatar?: string;

  @DtoColumn("Дата рождения")
  birthday?: Date;

  @DtoColumn("Предпочитаемый язык")
  locale?: string;

  @DtoColumn("Адрес")
  address?: string;

  @DtoColumn("Временна зона в формате +/-00:00")
  timezone?: string;

  @DtoEnumColumn("Пол", TypeGenders, TypeGenders.DEFAULT)
  gender?: TypeGenders;
}
