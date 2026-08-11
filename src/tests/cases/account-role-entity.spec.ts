import { AccountEntity } from '@src/account/account.entity';

describe('AccountEntity role getters', () => {
  function makeAccount(overrides: Partial<AccountEntity> = {}): AccountEntity {
    return Object.assign(new AccountEntity(), overrides);
  }

  describe('roles getter', () => {
    it('returns role names from accountRoles', () => {
      const account = makeAccount({
        accountRoles: [
          { role: { id: 1, name: 'admin' } },
          { role: { id: 2, name: 'editor' } },
        ] as any,
      });
      expect(account.roles).toEqual(['admin', 'editor']);
    });

    it('filters out entries with undefined role name', () => {
      const account = makeAccount({
        accountRoles: [
          { role: { id: 1, name: 'admin' } },
          { role: { id: 2, name: undefined } },
          { role: undefined },
        ] as any,
      });
      expect(account.roles).toEqual(['admin']);
    });

    it('returns empty array when accountRoles is empty', () => {
      const account = makeAccount({ accountRoles: [] as any });
      expect(account.roles).toEqual([]);
    });

    it('returns empty array when accountRoles is undefined', () => {
      const account = makeAccount({ accountRoles: undefined as any });
      expect(account.roles).toEqual([]);
    });
  });

  describe('roleEntries getter', () => {
    it('returns entries with tenant scope', () => {
      const account = makeAccount({
        accountRoles: [
          {
            role: { id: 1, name: 'admin' },
            tenantScope: 'all',
          },
        ] as any,
      });
      expect(account.roleEntries).toEqual([{ role: 'admin', tenant: 'all' }]);
    });

    it('returns entries without tenant key when no tenantScope', () => {
      const account = makeAccount({
        accountRoles: [
          {
            role: { id: 1, name: 'admin' },
            tenantScope: null,
          },
        ] as any,
      });
      expect(account.roleEntries).toEqual([{ role: 'admin' }]);
      expect(account.roleEntries[0]).not.toHaveProperty('tenant');
    });

    it('filters out entries with undefined role name', () => {
      const account = makeAccount({
        accountRoles: [
          {
            role: { id: 1, name: 'admin' },
            tenantScope: 'all',
          },
          {
            role: undefined,
            tenantScope: 'own',
          },
        ] as any,
      });
      expect(account.roleEntries).toEqual([{ role: 'admin', tenant: 'all' }]);
    });

    it('returns empty array when accountRoles is undefined', () => {
      const account = makeAccount({ accountRoles: undefined as any });
      expect(account.roleEntries).toEqual([]);
    });

    it('handles mixed entries with and without tenantScope', () => {
      const account = makeAccount({
        accountRoles: [
          { role: { id: 1, name: 'admin' }, tenantScope: 'all' },
          { role: { id: 2, name: 'editor' }, tenantScope: null },
          { role: { id: 3, name: 'viewer' }, tenantScope: 'own' },
        ] as any,
      });
      expect(account.roleEntries).toEqual([
        { role: 'admin', tenant: 'all' },
        { role: 'editor' },
        { role: 'viewer', tenant: 'own' },
      ]);
    });

    it('returns empty array when accountRoles is empty', () => {
      const account = makeAccount({ accountRoles: [] as any });
      expect(account.roleEntries).toEqual([]);
    });
  });
});
