import { ApiProperty } from '@nestjs/swagger';

export function DtoCreatedColumn(): PropertyDecorator {
  return function (object: object, propertyName: string) {
    ApiProperty({
      description: 'Дата и время создания записи, назначается автоматически',
      required: false,
    })(object, propertyName);
  };
}
