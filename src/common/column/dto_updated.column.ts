import { ApiProperty } from '@nestjs/swagger';

export function DtoUpdatedColumn(): PropertyDecorator {
  return function (object: object, propertyName: string) {
    ApiProperty({
      description:
        'Дата и время последнего обновления записи, назначается автоматически',
      required: false,
    })(object, propertyName);
  };
}
