import { ApiProperty } from "@nestjs/swagger";
import { DtoColumn, DtoCreatedColumn, DtoUpdatedColumn } from "@core/common";
import { CommonDto } from "@core/common";
import { ClientsDto } from "@src/clients/clients.dto";

export class ClientsRedirectsDto extends CommonDto {
  @DtoCreatedColumn()
  createdAt?: Date;

  @DtoUpdatedColumn()
  updatedAt?: Date;

  @DtoColumn("Зарегистрированная ссылка для клиента")
  uri: string;

  @ApiProperty({
    required: false,
    description: "Данные клиента, связанного с этой записью",
    type: () => ClientsDto,
  })
  client?: ClientsDto;
}
