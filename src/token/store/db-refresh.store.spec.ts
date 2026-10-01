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

  describe("verify — atomic consume + reuse detection", () => {
    let qb: Record<string, jest.Mock>;

    beforeEach(() => {
      // UpdateQueryBuilder chain: update().set().where().returning().execute()
      qb = {
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ raw: [] }),
      };
      repo.createQueryBuilder = jest.fn().mockReturnValue(qb);
    });

    it("consumes a live token atomically and returns its payload", async () => {
      qb.execute.mockResolvedValue({
        raw: [
          {
            account_id: "42",
            client_id: "web",
            family_id: "family-1",
            expires_at: new Date(Date.now() + 86400000),
          },
        ],
      });

      const payload = await store.verify("good");

      expect(payload).toEqual({
        accountId: 42,
        clientId: "web",
        familyId: "family-1",
      });
      // Only rows not yet revoked may flip — the WHERE carries both terms.
      expect(qb.where).toHaveBeenCalledWith(
        "token_hash = :hash AND revoked = false",
        { hash: expect.any(String) },
      );
      expect(qb.set).toHaveBeenCalledWith({ revoked: true });
    });

    it("throws Invalid for a token that never existed (no rows, no record)", async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(store.verify("nope")).rejects.toThrow(
        "Invalid refresh token",
      );
      expect(repo.update).not.toHaveBeenCalled();
    });

    it("revokes the whole family when a consumed token is replayed", async () => {
      // First use left revoked=true, so the atomic UPDATE matches nothing.
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

    it("a second concurrent-style use of the same token trips reuse detection", async () => {
      // Emulate a lost race: replay after the first consume flipped the row.
      qb.execute.mockResolvedValueOnce({
        raw: [
          {
            account_id: "42",
            client_id: null,
            family_id: "family-1",
            expires_at: new Date(Date.now() + 86400000),
          },
        ],
      });
      repo.findOne.mockResolvedValue(
        makeRecord({ revoked: true, familyId: "family-1" }),
      );

      await expect(store.verify("good")).resolves.toEqual({
        accountId: 42,
        familyId: "family-1",
      });
      await expect(store.verify("good")).rejects.toThrow(
        "Refresh token reuse detected",
      );
    });

    it("rejects an expired token after consume without reuse teardown", async () => {
      qb.execute.mockResolvedValue({
        raw: [
          {
            account_id: "42",
            client_id: null,
            family_id: "family-1",
            expires_at: new Date(Date.now() - 1000),
          },
        ],
      });

      await expect(store.verify("old")).rejects.toThrow(
        "Refresh token expired",
      );
      // Expiry is normal lifecycle — the family must stay untouched.
      expect(repo.update).not.toHaveBeenCalled();
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
