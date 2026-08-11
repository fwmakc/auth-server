import { DtoColumn } from "api-server-toolkit";
import { CommonDto } from "api-server-toolkit";

export class RoleDto extends CommonDto {
  @DtoColumn("Название роли", { required: true })
  name?: string;

  @DtoColumn("Описание роли")
  description?: string;
}
