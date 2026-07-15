import { EntityMetadata } from 'typeorm';
import { PermissionRegistry } from '@src/common/permission.registry';
import {
  AccessLevel,
  OperationConfig,
  normalizeAccess,
} from '@src/common/access.type';

function canCreate(level: AccessLevel, bind: any): boolean {
  if (!bind) return level === 'public';
  switch (level) {
    case 'public':
      return true;
    case 'account':
      return bind?.id !== undefined || bind?.allow === true;
    case 'owner':
      return true;
    case 'admin':
      return !!bind?.allow;
    case 'closed':
      return false;
    default:
      return true;
  }
}

export function sanitizeForSave(
  entity: any,
  metadata: EntityMetadata,
  bind: any,
): void {
  const seen = new WeakSet();
  sanitizeEntity(entity, metadata, bind, seen);
}

function sanitizeEntity(
  entity: any,
  metadata: EntityMetadata,
  bind: any,
  seen: WeakSet<object>,
): void {
  if (!entity || typeof entity !== 'object' || seen.has(entity)) return;
  seen.add(entity);

  for (const relation of metadata.relations) {
    const key = relation.propertyName;
    const value = entity[key];
    if (value === undefined || value === null) continue;

    const relatedMeta = relation.inverseEntityMetadata;
    const relatedTarget = relatedMeta.target;
    const config = PermissionRegistry.get(relatedTarget);

    if (Array.isArray(value)) {
      const sanitized: any[] = [];
      for (const item of value) {
        const result = sanitizeRelationItem(
          item,
          relatedMeta,
          config,
          bind,
          seen,
        );
        if (result !== null) sanitized.push(result);
      }
      entity[key] = sanitized;
    } else if (typeof value === 'object' && value.constructor !== Date) {
      const result = sanitizeRelationItem(
        value,
        relatedMeta,
        config,
        bind,
        seen,
      );
      if (result === null) {
        delete entity[key];
      } else {
        entity[key] = result;
      }
    }
  }
}

function sanitizeRelationItem(
  item: any,
  metadata: EntityMetadata,
  config: OperationConfig | undefined,
  bind: any,
  seen: WeakSet<object>,
): any | null {
  if (!item || typeof item !== 'object') return item;

  const hasId = item.id !== undefined && item.id !== null;

  if (hasId) {
    return { id: item.id };
  }

  if (config) {
    const createLevel = normalizeAccess(config.create, 'public');
    if (canCreate(createLevel, bind)) {
      sanitizeEntity(item, metadata, bind, seen);
      return item;
    }
  }

  return null;
}
