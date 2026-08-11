import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable } from "@nestjs/common";
import { CommonService } from "api-server-toolkit";
import { RelationsDto } from "api-server-toolkit";
import { RoleDto } from "./role.dto";
import { RoleEntity } from "./role.entity";

@Injectable()
export class RoleService extends CommonService<RoleDto, RoleEntity> {
  constructor(
    @InjectRepository(RoleEntity)
    protected readonly repository: Repository<RoleEntity>
  ) {
    super();
  }
}
