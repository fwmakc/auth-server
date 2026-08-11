import { EntityController } from "api-server-toolkit";
import { RoleDto } from "./role.dto";
import { RoleEntity } from "./role.entity";
import { RoleService } from "./role.service";

@EntityController({
  name: "roles",
  dto: RoleDto,
  entity: RoleEntity,
  operations: {
    read: "public",
    create: "superuser",
    update: "superuser",
    delete: "superuser",
  },
})
export class RolesController {
  readonly service: RoleService;
}
