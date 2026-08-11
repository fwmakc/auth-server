import { IsArray, ValidateNested, IsOptional, IsString, IsNumber } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";

class RoleAssignmentItem {
  @IsNumber()
  @ApiProperty({ description: "ID роли" })
  roleId: number;

  @IsOptional()
  @IsString()
  @ApiProperty({ description: "Tenant scope: 'own' или 'all'", required: false })
  tenant?: string;
}

export class AccountRoleAssignmentDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleAssignmentItem)
  @ApiProperty({ description: "Массив назначений ролей", type: [RoleAssignmentItem] })
  roles: RoleAssignmentItem[];
}
