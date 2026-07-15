import { ApiProperty } from '@nestjs/swagger';
import { FindDto } from './find.dto';

export class FindManyDto extends FindDto {
  @ApiProperty({
    required: true,
    description: 'Идентификаторы записей',
  })
  ids: Array<number | string> = undefined;
}
