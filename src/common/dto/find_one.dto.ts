import { ApiProperty } from '@nestjs/swagger';
import { FindDto } from './find.dto';

export class FindOneDto extends FindDto {
  @ApiProperty({
    required: true,
    description: 'Идентификатор записи',
  })
  id: number = undefined;
}
