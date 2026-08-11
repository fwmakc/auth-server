import { AccessLevel, EntityController } from "api-server-toolkit";
import { RoleDto } from "./role.dto";
import { RoleEntity } from "./role.entity";
import { RoleService } from "./role.service";

@EntityController({
  name: "roles",
  dto: RoleDto,
  entity: RoleEntity,
  operations: {
    read: AccessLevel.PUBLIC,
    create: AccessLevel.SUPERUSER,
    update: AccessLevel.SUPERUSER,
    delete: AccessLevel.SUPERUSER,
  },
})
export class RolesController {
  readonly service: RoleService;
}
