import { IsBoolean, IsEmail, IsOptional, IsString } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import {
  DtoColumn,
  DtoCreatedColumn,
  DtoUpdatedColumn,
} from "api-server-toolkit";
import { CommonDto } from "api-server-toolkit";
import { AccountSessionsDto } from "./account_sessions/account_sessions.dto";
import { AccountStrategiesDto } from "./account_strategies/account_strategies.dto";
import { AccountConfirmDto } from "./account_confirm/account_confirm.dto";
import { ClientsDto } from "@src/clients/clients.dto";
import { UsersDto } from "@src/db/users/users.dto";

export class AccountDto extends CommonDto {
  @DtoCreatedColumn()
  createdAt?: Date;

  @DtoUpdatedColumn()
  updatedAt?: Date;

  @IsEmail()
  @DtoColumn("Имя пользователя, обычно здесь используется email", {
    required: true,
  })
  username?: string;

  // Optional at the DTO level: password reset is requested by username only
  // (the whole point is a forgotten password). Handlers that do need it
  // (register, change) enforce presence through PasswordPolicyService.
  // Enforced by PasswordPolicyService (PASSWORD_* env), not by a static
  // decorator — env is the single source of truth for the policy
  @IsOptional()
  @IsString()
  @DtoColumn("Пароль, заданный пользователем")
  password?: string;

  // Read by register/reset controllers via @Body("subject") for the mail
  // template; must be declared or the strict ValidationPipe rejects it
  @IsOptional()
  @IsString()
  @DtoColumn("Тема письма для кода подтверждения/сброса пароля")
  subject?: string;

  @IsOptional()
  @IsBoolean()
  @DtoColumn(
    "Флаг, который показывает, является ли учетная запись пользователя активированной. Например, подтвержденной по email.",
    { default: false },
  )
  isActivated?: boolean;

  @IsOptional()
  @IsBoolean()
  @DtoColumn(
    "Флаг, который показывает, назначены ли учетной записи пользователя права суперпользователя (администратора).",
    { required: false },
  )
  isSuperuser?: boolean;

  @ApiProperty({
    required: false,
    description: "Сессионные данные, связанные с аккаунтом",
    type: () => [AccountSessionsDto],
  })
  sessions?: AccountSessionsDto[];

  @ApiProperty({
    required: false,
    description: "Данные аккаунтов по стратегиям, связанные с аккаунтом",
    type: () => [AccountStrategiesDto],
  })
  strategies?: AccountStrategiesDto[];

  @ApiProperty({
    required: false,
    description: "Данные кодов подтверждения, связанные с аккаунтом",
    type: () => [AccountConfirmDto],
  })
  confirm?: AccountConfirmDto[];

  @ApiProperty({
    required: false,
    description: "Данные клиентских приложений, связанные с аккаунтом",
    type: () => [ClientsDto],
  })
  clients?: ClientsDto[];

  @ApiProperty({
    required: false,
    description: "Пользовательские данные, связанные с аккаунтом",
    type: () => UsersDto,
  })
  users?: UsersDto;
}
