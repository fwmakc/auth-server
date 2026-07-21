import { Controller, Get, NotFoundException } from "@nestjs/common";
import { RelationsDto } from "@core/common";
import { Data } from "@core/common";
import { EntityController } from "@core/common";
import { AccountSessionsDto } from "./account_sessions.dto";
import { AccountSessionsEntity } from "./account_sessions.entity";
import { AccountSessionsService } from "./account_sessions.service";

@Controller("account/sessions")
export class AccountSessionsController extends EntityController({
  name: "Сессии",
  dto: AccountSessionsDto,
  entity: AccountSessionsEntity,
})<AccountSessionsDto, AccountSessionsEntity, AccountSessionsService> {
  constructor(readonly service: AccountSessionsService) {
    super();
  }

  @Get("get_by_auth_id")
  async getByAuthId(
    @Data("id") id: number,
    @Data("relations") relations: Array<RelationsDto>
  ) {
    const result = await this.service.getByAuthId(id, relations);
    if (!result) {
      throw new NotFoundException("Any results not found");
    }
    return result;
  }
}
