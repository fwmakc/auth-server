import { Controller } from "@nestjs/common";
import { EntityController } from "api-server-toolkit";
import { RoleDto } from "./role.dto";
import { RoleEntity } from "./role.entity";
import { RoleService } from "./role.service";

@Controller("roles")
export class RolesController extends EntityController({
  name: "roles",
  dto: RoleDto,
  entity: RoleEntity,
  operations: {
    read: [{ who: ["public"] }],
    create: [{ who: ["superuser"] }],
    update: [{ who: ["superuser"] }],
    delete: [{ who: ["superuser"] }],
  },
})<RoleDto, RoleEntity, RoleService> {
  constructor(readonly service: RoleService) {
    super();
  }
}
