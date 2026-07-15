import { ApiProperty } from "@nestjs/swagger";
import {
  DeepPartial,
  FindOptionsOrder,
  FindOptionsSelect,
  FindOptionsWhere,
} from "typeorm";
import { RelationsDto } from "@src/common/dto/relations.dto";
import { SearchType } from "../type/search.type";

export class FindDto {
  @ApiProperty({
    required: false,
    description: "Выбор полей",
  })
  select?: FindOptionsSelect<any> = undefined;

  @ApiProperty({
    required: false,
    description: "Выбор",
  })
  where?: FindOptionsWhere<any> = undefined;

  @ApiProperty({
    required: false,
    description: "Поиск",
  })
  search?: DeepPartial<any> = undefined;

  @ApiProperty({
    required: false,
    description: "Сортировка",
  })
  order?: FindOptionsOrder<any> = { id: "ASC" };

  @ApiProperty({
    required: false,
    description: "Лимит",
  })
  limit?: number = undefined;

  @ApiProperty({
    required: false,
    description: "Число пропускаемых записей",
  })
  offset?: number = undefined;

  @ApiProperty({
    required: false,
    description: "Отношения",
  })
  relations?: Array<RelationsDto> = undefined;
}
