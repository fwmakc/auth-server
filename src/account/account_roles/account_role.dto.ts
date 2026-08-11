import { IsArray } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AccountRoleAssignmentDto {
  @IsArray()
  @ApiProperty({ description: "Массив ID ролей для назначения", type: [Number] })
  roleIds: number[];
}
