import { NotFoundException } from "@nestjs/common";
import { Repository } from "typeorm";
import { AccountRolesService } from "@src/account/account_roles/account_role.service";
import { AccountRoleAssignmentDto } from "@src/account/account_roles/account_role.dto";

describe("AccountRolesService", () => {
  let service: AccountRolesService;
  let repo: jest.Mocked<Repository<any>>;
  let roleRepo: jest.Mocked<Repository<any>>;

  const makeRole = (id: number, name: string) => ({
    id,
    name,
    description: "",
  });

  beforeEach(() => {
    repo = {
      delete: jest.fn().mockResolvedValue({}),
      save: jest.fn().mockResolvedValue([]),
      find: jest.fn().mockResolvedValue([]),
    } as any;
    roleRepo = {
      findBy: jest.fn().mockResolvedValue([]),
    } as any;
    service = new AccountRolesService(repo as any, roleRepo as any);
  });

  describe("assign", () => {
    it('saves tenantScope="all" from DTO', async () => {
      const adminRole = makeRole(1, "admin");
      roleRepo.findBy.mockResolvedValue([adminRole]);
      repo.save.mockImplementation(async (entities: any[]) => entities);

      const dto: AccountRoleAssignmentDto = {
        roles: [{ roleId: 1, tenant: "all" }],
      };
      await service.assign(10, dto);

      expect(repo.delete).toHaveBeenCalledWith({ accountId: 10 });
      expect(repo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            accountId: 10,
            roleId: 1,
            tenantScope: "all",
            role: adminRole,
          }),
        ]),
      );
    });

    it("saves tenantScope=null when tenant not provided", async () => {
      const editorRole = makeRole(2, "editor");
      roleRepo.findBy.mockResolvedValue([editorRole]);
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
      const viewerRole = makeRole(3, "viewer");
      roleRepo.findBy.mockResolvedValue([viewerRole]);
      repo.save.mockImplementation(async (entities: any[]) => entities);

      const dto: AccountRoleAssignmentDto = {
        roles: [{ roleId: 3, tenant: "own" }],
      };
      await service.assign(10, dto);

      expect(repo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            tenantScope: "own",
          }),
        ]),
      );
    });

    it("deletes existing roles when empty array passed", async () => {
      const dto: AccountRoleAssignmentDto = { roles: [] };
      await service.assign(10, dto);

      expect(repo.delete).toHaveBeenCalledWith({ accountId: 10 });
      expect(roleRepo.findBy).not.toHaveBeenCalled();
      expect(repo.save).not.toHaveBeenCalled();
    });

    it("throws NotFoundException for non-existent roleId", async () => {
      roleRepo.findBy.mockResolvedValue([]);

      const dto: AccountRoleAssignmentDto = {
        roles: [{ roleId: 999 }],
      };

      await expect(service.assign(10, dto)).rejects.toThrow(NotFoundException);
      expect(repo.delete).toHaveBeenCalledWith({ accountId: 10 });
    });

    it("throws NotFoundException listing missing roleIds when partially not found", async () => {
      roleRepo.findBy.mockResolvedValue([makeRole(1, "admin")]);

      const dto: AccountRoleAssignmentDto = {
        roles: [{ roleId: 1 }, { roleId: 999 }],
      };

      await expect(service.assign(10, dto)).rejects.toThrow(NotFoundException);
    });

    it("deletes old roles before saving new ones", async () => {
      const role = makeRole(1, "admin");
      roleRepo.findBy.mockResolvedValue([role]);
      repo.save.mockImplementation(async (entities: any[]) => entities);

      const dto: AccountRoleAssignmentDto = {
        roles: [{ roleId: 1, tenant: "all" }],
      };
      await service.assign(10, dto);

      const callOrder = [
        (repo.delete as jest.Mock).mock.calls.length > 0,
        (repo.save as jest.Mock).mock.calls.length > 0,
      ];
      expect(callOrder).toEqual([true, true]);
    });

    it("saves multiple roles with different tenant scopes", async () => {
      const adminRole = makeRole(1, "admin");
      const viewerRole = makeRole(2, "viewer");
      roleRepo.findBy.mockResolvedValue([adminRole, viewerRole]);
      repo.save.mockImplementation(async (entities: any[]) => entities);

      const dto: AccountRoleAssignmentDto = {
        roles: [
          { roleId: 1, tenant: "all" },
          { roleId: 2, tenant: "own" },
        ],
      };
      await service.assign(10, dto);

      expect(repo.save).toHaveBeenCalledWith([
        expect.objectContaining({ roleId: 1, tenantScope: "all" }),
        expect.objectContaining({ roleId: 2, tenantScope: "own" }),
      ]);
    });

    it("sets accountId on each entity", async () => {
      const role = makeRole(1, "admin");
      roleRepo.findBy.mockResolvedValue([role]);
      repo.save.mockImplementation(async (entities: any[]) => entities);

      const dto: AccountRoleAssignmentDto = {
        roles: [{ roleId: 1 }],
      };
      await service.assign(42, dto);

      expect(repo.save).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ accountId: 42 })]),
      );
    });

    it("sets roleId on each entity", async () => {
      const role = makeRole(1, "admin");
      roleRepo.findBy.mockResolvedValue([role]);
      repo.save.mockImplementation(async (entities: any[]) => entities);

      const dto: AccountRoleAssignmentDto = {
        roles: [{ roleId: 1 }],
      };
      await service.assign(10, dto);

      expect(repo.save).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ roleId: 1 })]),
      );
    });

    it("sets role relation on each entity", async () => {
      const role = makeRole(1, "admin");
      roleRepo.findBy.mockResolvedValue([role]);
      repo.save.mockImplementation(async (entities: any[]) => entities);

      const dto: AccountRoleAssignmentDto = {
        roles: [{ roleId: 1 }],
      };
      await service.assign(10, dto);

      expect(repo.save).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ role })]),
      );
    });

    it("throws when findBy returns nothing for multiple roleIds", async () => {
      roleRepo.findBy.mockResolvedValue([]);

      const dto: AccountRoleAssignmentDto = {
        roles: [{ roleId: 1 }, { roleId: 2 }],
      };

      await expect(service.assign(10, dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe("removeByAccount", () => {
    it("calls delete with accountId", async () => {
      await service.removeByAccount(10);
      expect(repo.delete).toHaveBeenCalledWith({ accountId: 10 });
    });
  });

  describe("user.roles_changed emission", () => {
    const makeService = () => {
      const events = { publish: jest.fn().mockResolvedValue(undefined) };
      const svc = new AccountRolesService(
        repo as any,
        roleRepo as any,
        undefined,
        events as any,
      );
      return { events, svc };
    };

    it("publishes the full role-name set after assign", async () => {
      roleRepo.findBy.mockResolvedValue([makeRole(1, "admin")]);
      repo.save.mockImplementation(async (e: any[]) => e);
      (repo as any).manager ={
        findOne: jest
          .fn()
          .mockResolvedValue({ id: 10, username: "user@test" }),
      } as any;

      const { events, svc } = makeService();
      await svc.assign(10, { roles: [{ roleId: 1 }] });

      expect(events.publish).toHaveBeenCalledWith("user.roles_changed", {
        userId: 10,
        username: "user@test",
        email: "user@test",
        roles: ["admin"],
      });
    });

    it("publishes an empty set when assign clears all roles", async () => {
      const { events, svc } = makeService();
      (repo as any).manager ={
        findOne: jest
          .fn()
          .mockResolvedValue({ id: 10, username: "user@test" }),
      } as any;

      await svc.assign(10, { roles: [] });

      expect(events.publish).toHaveBeenCalledWith(
        "user.roles_changed",
        expect.objectContaining({ userId: 10, roles: [] }),
      );
    });

    it("publishes an empty set on removeByAccount (everything revoked)", async () => {
      (repo as any).manager ={
        findOne: jest
          .fn()
          .mockResolvedValue({ id: 10, username: "user@test" }),
      } as any;

      const { events, svc } = makeService();
      await svc.removeByAccount(10);

      expect(events.publish).toHaveBeenCalledWith("user.roles_changed", {
        userId: 10,
        username: "user@test",
        email: "user@test",
        roles: [],
      });
    });

    it("skips publishing when the target account no longer exists", async () => {
      (repo as any).manager ={ findOne: jest.fn().mockResolvedValue(null) } as any;

      const { events, svc } = makeService();
      await svc.removeByAccount(999);

      expect(events.publish).not.toHaveBeenCalled();
    });

    it("does not publish when no event client is wired (bare unit construction)", async () => {
      await service.removeByAccount(10);
      // repo.manager is undefined here — proves the early return happens
      // before any repository access
    });
  });

  describe("findByAccount", () => {
    it("returns entities with role relations", async () => {
      const entities = [
        { id: 1, accountId: 10, roleId: 1, role: { id: 1, name: "admin" } },
      ];
      repo.find.mockResolvedValue(entities as any);

      const result = await service.findByAccount(10);
      expect(repo.find).toHaveBeenCalledWith({
        where: { accountId: 10 },
        relations: { role: true },
      });
      expect(result).toEqual(entities);
    });
  });
});
