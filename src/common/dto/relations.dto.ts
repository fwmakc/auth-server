import { ApiProperty } from '@nestjs/swagger';

export class RelationsDto {
  @ApiProperty({
    required: false,
    description: 'Имя таблицы отношений',
  })
  name?: string;

  @ApiProperty({
    required: false,
    description: 'Поле для сортировки',
  })
  order?: string;

  @ApiProperty({
    required: false,
    description: 'Флаг включения сортировки в обратном порядке',
  })
  desc?: boolean;
}
