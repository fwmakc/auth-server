import { ApiProperty } from '@nestjs/swagger';
import {
  DtoColumn,
  DtoCreatedColumn,
  DtoEnumColumn,
  DtoUpdatedColumn,
} from '@src/common/common.column';
import { TypeClients } from '@src/common/common.enum';
import { CommonDto } from '@src/common/common.dto';
import { ClientsRedirectsDto } from './clients_redirects/clients_redirects.dto';

export class ClientsDto extends CommonDto {
  @DtoCreatedColumn()
  createdAt?: Date;

  @DtoUpdatedColumn()
  updatedAt?: Date;

  @DtoColumn(
    'Уникальное имя клиентского приложения, по-умолчанию в формате uuid',
  )
  client_id?: string;

  @DtoColumn('Секретный ключ, необходим для работы клиентского приложения')
  client_secret?: string;

  @DtoColumn('Пароль к клиентскому приложению')
  client_password?: string;

  @DtoEnumColumn('Тип клиентского приложения', TypeClients, TypeClients.DEFAULT)
  client_type?: TypeClients;

  @DtoColumn('Название клиентского приложения')
  title?: string;

  @DtoColumn(
    'Дополнительное поле с описанием или комментариями к клиентскому приложению',
  )
  description?: string;

  @DtoColumn('Дополнительное поле со ссылкой на сайт клиентского приложения')
  client_uri?: string;

  @DtoColumn('Временный одноразовый код авторизации, выданный этому приложению')
  code?: string;

  @DtoColumn(
    'Дата публикации, начиная с которой клиентское приложение будет активно',
  )
  publishedAt?: Date;

  @DtoColumn(
    'Флаг публикации, отключение может сделать запись клиентское приложение недоступным',
  )
  isPublished?: boolean;

  // virtual field
  @DtoColumn(
    'Поле с разрешенным редиректом, по которому сервер будет отправлять данные авторизации',
  )
  redirect_uri?: string;

  @ApiProperty({
    required: false,
    description: 'Данные редиректов, связанных с этим клиентским приложением',
    type: () => [ClientsRedirectsDto],
  })
  redirects?: ClientsRedirectsDto[];
}
