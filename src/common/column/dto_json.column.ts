import { ApiProperty } from '@nestjs/swagger';
import { IsJSON, IsOptional } from 'class-validator';
import { DeepPartial } from 'typeorm';

export function DtoJsonColumn(
  description,
  options = undefined,
): PropertyDecorator {
  const { required = false } = options || {};

  return function (object: object, propertyName: string) {
    const properties: DeepPartial<any> = {
      description,
      required,
    };

    const params: DeepPartial<any> = {
      nullable: true,
    };

    ApiProperty(properties)(object, propertyName);
    IsJSON();
    IsOptional();
  };
}
