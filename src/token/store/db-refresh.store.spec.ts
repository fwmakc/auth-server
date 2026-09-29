import { UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { DbRefreshStore } from "./db-refresh.store";
import { RefreshTokenEntity } from "./refresh-token.entity";

describe("DbRefreshStore", () => {
  let store: DbRefreshStore;
  let repo: Record<string, jest.Mock>;
  let config: { get: jest.Mock };

  const makeRecord = (over: Partial<RefreshTokenEntity> = {}) => ({
    id: 1,
    accountId: 42,
    clientId: null,
    tokenHash: "hash",
    familyId: "family-1",
    expiresAt: new Date(Date.now() + 86400000),
    revoked: false,
    ...over,
  });

  beforeEach(async () => {
    repo = {
      findOne: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      update: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue({ affected: 0 }),
    };
    config = { get: jest.fn().mockReturnValue("30d") };

    const moduleRef = await Test.createTestingModule({
      providers: [
        DbRefreshStore,
        { provide: getRepositoryToken(RefreshTokenEntity), useValue: repo },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();

    store = moduleRef.get(DbRefreshStore);
  });

  describe("issue", () => {
    it("creates a new family when familyId is not provided", async () => {
      const issued = await store.issue({ accountId: 42 });

      expect(issued.token).toMatch(/^r_/);
      expect(issued.familyId).toEqual(expect.any(String));
      const saved = repo.save.mock.calls[0][0];
      expect(saved.familyId).toBe(issued.familyId);
      expect(saved.revoked).toBe(false);
    });

    it("inherits the family on rotation", async () => {
      const issued = await store.issue({ accountId: 42 }, "family-1");

      expect(issued.familyId).toBe("family-1");
      expect(repo.save.mock.calls[0][0].familyId).toBe("family-1");
    });

    it("honors JWT_REFRESH_EXPIRES from config", async () => {
      config.get.mockReturnValue("7d");

      const { expiresAt } = await store.issue({ accountId: 42 });

      const days = (expiresAt.getTime() - Date.now()) / 86400000;
      expect(days).toBeGreaterThan(6.9);
      expect(days).toBeLessThan(7.1);
    });

    it("falls back to 30 days on empty config", async () => {
      config.get.mockReturnValue(undefined);

      const { expiresAt } = await store.issue({ accountId: 42 });

      const days = (expiresAt.getTime() - Date.now()) / 86400000;
      expect(days).toBeGreaterThan(29.9);
      expect(days).toBeLessThan(30.1);
    });
  });

  describe("verify — reuse detection", () => {
    it("throws Invalid for unknown token", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(store.verify("nope")).rejects.toThrow(
        "Invalid refresh token",
      );
    });

    it("revokes the whole family when a revoked token is replayed", async () => {
      repo.findOne.mockResolvedValue(
        makeRecord({ revoked: true, familyId: "family-1" }),
      );

      await expect(store.verify("stolen")).rejects.toThrow(
        "Refresh token reuse detected",
      );

      expect(repo.update).toHaveBeenCalledWith(
        { familyId: "family-1", revoked: false },
        { revoked: true },
      );
    });

    it("removes and rejects an expired token", async () => {
      const record = makeRecord({ expiresAt: new Date(Date.now() - 1000) });
      repo.findOne.mockResolvedValue(record);

      await expect(store.verify("old")).rejects.toThrow(
        "Refresh token expired",
      );
      expect(repo.remove).toHaveBeenCalledWith(record);
      expect(repo.update).not.toHaveBeenCalled();
    });

    it("returns payload for a valid token", async () => {
      repo.findOne.mockResolvedValue(makeRecord({ clientId: "web" }));

      const payload = await store.verify("good");

      expect(payload).toEqual({
        accountId: 42,
        clientId: "web",
        familyId: "family-1",
      });
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String) },
      });
    });
  });

  describe("revoke", () => {
    it("marks the token revoked by hash", async () => {
      await store.revoke("some-token");

      expect(repo.update).toHaveBeenCalledWith(
        { tokenHash: expect.any(String) },
        { revoked: true },
      );
    });
  });

  describe("revokeAll", () => {
    it("revokes all live tokens of the account", async () => {
      await store.revokeAll(42);

      expect(repo.update).toHaveBeenCalledWith(
        { accountId: 42, revoked: false },
        { revoked: true },
      );
    });
  });
});
