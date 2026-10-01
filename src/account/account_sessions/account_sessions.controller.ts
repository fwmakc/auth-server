import { Controller, Get, NotFoundException } from "@nestjs/common";
import { AccessRule, EntityController, Account, Self } from "api-server-toolkit";
import { AccountDto } from "../account.dto";
import { AccountSessionsDto } from "./account_sessions.dto";
import { AccountSessionsEntity } from "./account_sessions.entity";
import { AccountSessionsService } from "./account_sessions.service";

const OWNER: AccessRule[] = [
  { who: ["authenticated"], scope: { owner: "account.id" } },
];

@Controller("account/sessions")
export class AccountSessionsController extends EntityController({
  name: "Сессии",
  dto: AccountSessionsDto,
  entity: AccountSessionsEntity,
  operations: {
    read: OWNER,
    create: OWNER,
    update: OWNER,
    delete: OWNER,
  },
  relations: ["account"],
})<AccountSessionsDto, AccountSessionsEntity, AccountSessionsService> {
  constructor(readonly service: AccountSessionsService) {
    super();
  }

  // Owner-scoped: the account id comes from the JWT, never from the caller;
  // relations are hard-coded — the client-controlled @Data("relations") here
  // allowed relation injection on the account relation.
  @Account()
  @Get("get_by_auth_id")
  async getByAuthId(@Self() account: AccountDto) {
    const result = await this.service.getByAuthId(account.id, [
      { name: "account" },
    ]);
    if (!result) {
      throw new NotFoundException("Any results not found");
    }
    return result;
  }
}
