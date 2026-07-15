import { Controller, Get, NotFoundException, Query } from "@nestjs/common";
import { ClientsService } from "@src/clients/clients.service";
import { ClientsDto } from "@src/clients/clients.dto";
import { Client, SelfClient } from "@src/clients/clients.decorator";
import { EntityController } from "@lms/common";
import { ClientsEntity } from "@src/clients/clients.entity";
import { ApiExcludeEndpoint } from "@nestjs/swagger";

@Controller("clients")
export class ClientsController extends EntityController({
  name: "Клиентские приложения",
  dto: ClientsDto,
  entity: ClientsEntity,
  operations: {
    read: "owner",
    create: "owner",
    update: "owner",
    delete: "owner",
  },
})<ClientsDto, ClientsEntity, ClientsService> {
  constructor(readonly service: ClientsService) {
    super();
  }

  @Get("token")
  @ApiExcludeEndpoint()
  async clientsTokenGet(@Query() query) {
    return {
      title: "redirect verify",
      query,
    };
  }

  @Client()
  @Get("self")
  @ApiExcludeEndpoint()
  async clientsSelf(@SelfClient() client: ClientsDto) {
    const { id } = client;
    const result = await this.service.findOne({ id });
    if (!result) {
      throw new NotFoundException("Entrie not found");
    }
    return result;
  }
}
