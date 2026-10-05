import { In, Repository } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { Injectable, NotFoundException } from "@nestjs/common";
import { AccountRoleEntity } from "./account_role.entity";
import { RoleEntity } from "../roles/role.entity";
import { AccountRoleAssignmentDto } from "./account_role.dto";
import { AuditService } from "api-server-toolkit";

@Injectable()
export class AccountRolesService {
  constructor(
    @InjectRepository(AccountRoleEntity)
    private readonly repository: Repository<AccountRoleEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    private readonly audit?: AuditService,
  ) {}

  async assign(
    accountId: number,
    dto: AccountRoleAssignmentDto,
    actor?: { id?: number | string; username?: string },
  ): Promise<void> {
    await this.repository.delete({ accountId });

    if (!dto.roles.length) return;

    const roleIds = dto.roles.map((r) => r.roleId);
    const roles = await this.roleRepository.findBy({ id: In(roleIds) });
    if (roles.length !== roleIds.length) {
      const found = new Set(roles.map((r) => r.id));
      const missing = roleIds.filter((id) => !found.has(id));
      throw new NotFoundException(`Roles not found: ${missing.join(", ")}`);
    }

    const entities = dto.roles.map((item) => {
      const role = roles.find((r) => r.id === item.roleId);
      const ar = new AccountRoleEntity();
      ar.accountId = accountId;
      ar.roleId = item.roleId;
      ar.role = role;
      ar.tenantScope = item.tenant || null;
      return ar;
    });

    await this.repository.save(entities);

    // Смена полномочий — одно из ключевых аудит-событий: фиксируем и актора,
    // и итоговый набор ролей с tenant scope.
    this.audit?.log({
      action: "auth.roles.changed",
      accountId: Number(actor?.id),
      accountUsername: actor?.username,
      targetType: "account",
      targetId: accountId,
      details: {
        roles: dto.roles.map((item) => ({
          roleId: item.roleId,
          tenant: item.tenant,
        })),
      },
    });
  }

  async removeByAccount(accountId: number): Promise<void> {
    await this.repository.delete({ accountId });
  }

  async findByAccount(accountId: number): Promise<AccountRoleEntity[]> {
    return this.repository.find({
      where: { accountId },
      relations: { role: true },
    });
  }
}
