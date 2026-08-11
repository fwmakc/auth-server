import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AccountRolesService } from '@src/account/account_roles/account_role.service';
import { AccountRoleAssignmentDto } from '@src/account/account_roles/account_role.dto';

describe('AccountRolesService', () => {
  let service: AccountRolesService;
  let repo: jest.Mocked<Repository<any>>;
  let roleRepo: jest.Mocked<Repository<any>>;

  const makeRole = (id: number, name: string) => ({ id, name, description: '' });

  beforeEach(() => {
    repo = {
      delete: jest.fn().mockResolvedValue({}),
      save: jest.fn().mockResolvedValue([]),
      find: jest.fn().mockResolvedValue([]),
    } as any;
    roleRepo = {
      findByIds: jest.fn().mockResolvedValue([]),
    } as any;
    service = new AccountRolesService(repo as any, roleRepo as any);
  });

  describe('assign', () => {
    it('saves tenantScope="all" from DTO', async () => {
      const adminRole = makeRole(1, 'admin');
      roleRepo.findByIds.mockResolvedValue([adminRole]);
      repo.save.mockImplementation(async (entities: any[]) => entities);

      const dto: AccountRoleAssignmentDto = {
        roles: [{ roleId: 1, tenant: 'all' }],
      };
      await service.assign(10, dto);

      expect(repo.delete).toHaveBeenCalledWith({ accountId: 10 });
      expect(repo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            accountId: 10,
            roleId: 1,
            tenantScope: 'all',
            role: adminRole,
          }),
        ]),
      );
    });

    it('saves tenantScope=null when tenant not provided', async () => {
      const editorRole = makeRole(2, 'editor');
      roleRepo.findByIds.mockResolvedValue([editorRole]);
      repo.save.mockImplementation(async (entities: any[]) => entities);

      const dto: AccountRoleAssignmentDto = {
        roles: [{ roleId: 2 }],
      };
      await service.assign(10, dto);

      expect(repo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            tenantScope: null,
          }),
        ]),
      );
    });

    it('saves tenantScope="own"', async () => {
      const viewerRole = makeRole(3, 'viewer');
      roleRepo.findByIds.mockResolvedValue([viewerRole]);
      repo.save.mockImplementation(async (entities: any[]) => entities);

      const dto: AccountRoleAssignmentDto = {
        roles: [{ roleId: 3, tenant: 'own' }],
      };
      await service.assign(10, dto);

      expect(repo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            tenantScope: 'own',
          }),
        ]),
      );
    });

    it('deletes existing roles when empty array passed', async () => {
      const dto: AccountRoleAssignmentDto = { roles: [] };
      await service.assign(10, dto);

      expect(repo.delete).toHaveBeenCalledWith({ accountId: 10 });
      expect(roleRepo.findByIds).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for non-existent roleId', async () => {
      roleRepo.findByIds.mockResolvedValue([]);

      const dto: AccountRoleAssignmentDto = {
        roles: [{ roleId: 999 }],
      };

      await expect(service.assign(10, dto)).rejects.toThrow(NotFoundException);
      expect(repo.delete).toHaveBeenCalledWith({ accountId: 10 });
    });

    it('throws NotFoundException listing missing roleIds when partially not found', async () => {
      roleRepo.findByIds.mockResolvedValue([makeRole(1, 'admin')]);

      const dto: AccountRoleAssignmentDto = {
        roles: [{ roleId: 1 }, { roleId: 999 }],
      };

      await expect(service.assign(10, dto)).rejects.toThrow(NotFoundException);
    });

    it('deletes old roles before saving new ones', async () => {
      const role = makeRole(1, 'admin');
      roleRepo.findByIds.mockResolvedValue([role]);
      repo.save.mockImplementation(async (entities: any[]) => entities);

      const dto: AccountRoleAssignmentDto = {
        roles: [{ roleId: 1, tenant: 'all' }],
      };
      await service.assign(10, dto);

      const callOrder = [
        (repo.delete as jest.Mock).mock.calls.length > 0,
        (repo.save as jest.Mock).mock.calls.length > 0,
      ];
      expect(callOrder).toEqual([true, true]);
    });

    it('saves multiple roles with different tenant scopes', async () => {
      const adminRole = makeRole(1, 'admin');
      const viewerRole = makeRole(2, 'viewer');
      roleRepo.findByIds.mockResolvedValue([adminRole, viewerRole]);
      repo.save.mockImplementation(async (entities: any[]) => entities);

      const dto: AccountRoleAssignmentDto = {
        roles: [
          { roleId: 1, tenant: 'all' },
          { roleId: 2, tenant: 'own' },
        ],
      };
      await service.assign(10, dto);

      expect(repo.save).toHaveBeenCalledWith([
        expect.objectContaining({ roleId: 1, tenantScope: 'all' }),
        expect.objectContaining({ roleId: 2, tenantScope: 'own' }),
      ]);
    });

    it('sets accountId on each entity', async () => {
      const role = makeRole(1, 'admin');
      roleRepo.findByIds.mockResolvedValue([role]);
      repo.save.mockImplementation(async (entities: any[]) => entities);

      const dto: AccountRoleAssignmentDto = {
        roles: [{ roleId: 1 }],
      };
      await service.assign(42, dto);

      expect(repo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ accountId: 42 }),
        ]),
      );
    });

    it('sets roleId on each entity', async () => {
      const role = makeRole(1, 'admin');
      roleRepo.findByIds.mockResolvedValue([role]);
      repo.save.mockImplementation(async (entities: any[]) => entities);

      const dto: AccountRoleAssignmentDto = {
        roles: [{ roleId: 1 }],
      };
      await service.assign(10, dto);

      expect(repo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ roleId: 1 }),
        ]),
      );
    });

    it('sets role relation on each entity', async () => {
      const role = makeRole(1, 'admin');
      roleRepo.findByIds.mockResolvedValue([role]);
      repo.save.mockImplementation(async (entities: any[]) => entities);

      const dto: AccountRoleAssignmentDto = {
        roles: [{ roleId: 1 }],
      };
      await service.assign(10, dto);

      expect(repo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ role }),
        ]),
      );
    });

    it('throws when findByIds returns nothing for multiple roleIds', async () => {
      roleRepo.findByIds.mockResolvedValue([]);

      const dto: AccountRoleAssignmentDto = {
        roles: [{ roleId: 1 }, { roleId: 2 }],
      };

      await expect(service.assign(10, dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeByAccount', () => {
    it('calls delete with accountId', async () => {
      await service.removeByAccount(10);
      expect(repo.delete).toHaveBeenCalledWith({ accountId: 10 });
    });
  });

  describe('findByAccount', () => {
    it('returns entities with role relations', async () => {
      const entities = [{ id: 1, accountId: 10, roleId: 1, role: { id: 1, name: 'admin' } }];
      repo.find.mockResolvedValue(entities as any);

      const result = await service.findByAccount(10);
      expect(repo.find).toHaveBeenCalledWith({
        where: { accountId: 10 },
        relations: ['role'],
      });
      expect(result).toEqual(entities);
    });
  });
});
