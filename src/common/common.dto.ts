import { ApiProperty } from '@nestjs/swagger';

export class CommonDto {
  @ApiProperty({
    required: false,
    description: 'Id номер записи, автоматическое приращение',
  })
  id?: number;
}
