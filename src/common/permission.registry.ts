import { OperationConfig, OperationAccess } from './access.type';

const registry = new Map<any, OperationConfig>();

export const PermissionRegistry = {
  set(entity: any, config: OperationConfig): void {
    registry.set(entity, config);
  },

  get(entity: any): OperationConfig | undefined {
    return registry.get(entity);
  },

  getCreate(entity: any): OperationAccess {
    return registry.get(entity)?.create ?? 'public';
  },

  getRead(entity: any): OperationAccess {
    return registry.get(entity)?.read ?? 'public';
  },

  getUpdate(entity: any): OperationAccess {
    return registry.get(entity)?.update ?? 'public';
  },

  getDelete(entity: any): OperationAccess {
    return registry.get(entity)?.delete ?? 'public';
  },

  has(entity: any): boolean {
    return registry.has(entity);
  },

  delete(entity: any): boolean {
    return registry.delete(entity);
  },

  clear(): void {
    registry.clear();
  },
};
