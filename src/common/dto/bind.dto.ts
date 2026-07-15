import { ApiProperty } from '@nestjs/swagger';

export class BindDto {
  @ApiProperty({
    required: false,
    description: 'ID связанной записи',
  })
  id?: number | string;

  @ApiProperty({
    required: false,
    description: 'название связанной таблицы',
  })
  name?: string;

  @ApiProperty({
    required: false,
    description: 'ключ поля ID связанной таблицы',
  })
  key?: string;

  @ApiProperty({
    required: false,
    description:
      'поле управляет отображением защищенных полей: true - разрешить все, false - разрешает отображение защищенных полей только для указанного ID связанной записи',
  })
  allow?: boolean;
}
