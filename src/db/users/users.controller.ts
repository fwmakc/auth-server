import { Controller } from "@nestjs/common";
import { EntityController } from "@core/common";
import { UsersDto } from "./users.dto";
import { UsersEntity } from "./users.entity";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController extends EntityController({
  name: "Пользователи",
  dto: UsersDto,
  entity: UsersEntity,
  operations: {
    read: "owner",
    create: "owner",
    update: "owner",
    delete: "owner",
  },
  relations: ["account"],
})<UsersDto, UsersEntity, UsersService> {
  constructor(readonly service: UsersService) {
    super();
  }
}
