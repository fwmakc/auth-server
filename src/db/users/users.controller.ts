import { Controller } from "@nestjs/common";
import { AccessRule, EntityController } from "api-server-toolkit";
import { UsersDto } from "./users.dto";
import { UsersEntity } from "./users.entity";
import { UsersService } from "./users.service";

const OWNER: AccessRule[] = [
  { who: ["authenticated"], scope: { owner: "account.id" } },
];

@Controller("users")
export class UsersController extends EntityController({
  name: "Пользователи",
  dto: UsersDto,
  entity: UsersEntity,
  operations: {
    read: OWNER,
    create: OWNER,
    update: OWNER,
    delete: OWNER,
  },
  relations: ["account"],
})<UsersDto, UsersEntity, UsersService> {
  constructor(readonly service: UsersService) {
    super();
  }
}
