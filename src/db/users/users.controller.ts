import { Controller } from "@nestjs/common";
import { AccessLevel, EntityController } from "api-server-toolkit";
import { UsersDto } from "./users.dto";
import { UsersEntity } from "./users.entity";
import { UsersService } from "./users.service";

@Controller("users")
export class UsersController extends EntityController({
  name: "Пользователи",
  dto: UsersDto,
  entity: UsersEntity,
  operations: {
    read: AccessLevel.OWNER,
    create: AccessLevel.OWNER,
    update: AccessLevel.OWNER,
    delete: AccessLevel.OWNER,
  },
  relations: ["account"],
})<UsersDto, UsersEntity, UsersService> {
  constructor(readonly service: UsersService) {
    super();
  }
}
