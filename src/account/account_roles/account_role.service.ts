import { Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable, NotFoundException } from "@nestjs/common";
import { AccountRoleEntity } from "./account_role.entity";
import { RoleEntity } from "../roles/role.entity";

@Injectable()
export class AccountRolesService {
  constructor(
    @InjectRepository(AccountRoleEntity)
    private readonly repository: Repository<AccountRoleEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
  ) {}

  async assign(accountId: number, roleIds: number[]): Promise<void> {
    await this.repository.delete({ accountId });

    if (!roleIds.length) return;

    const roles = await this.roleRepository.findByIds(roleIds);
    if (roles.length !== roleIds.length) {
      const found = new Set(roles.map((r) => r.id));
      const missing = roleIds.filter((id) => !found.has(id));
      throw new NotFoundException(`Roles not found: ${missing.join(", ")}`);
    }

    const entities = roles.map((role) => {
      const ar = new AccountRoleEntity();
      ar.accountId = accountId;
      ar.roleId = role.id;
      ar.role = role;
      return ar;
    });

    await this.repository.save(entities);
  }

  async removeByAccount(accountId: number): Promise<void> {
    await this.repository.delete({ accountId });
  }

  async findByAccount(accountId: number): Promise<AccountRoleEntity[]> {
    return this.repository.find({
      where: { accountId },
      relations: ["role"],
    });
  }
}
