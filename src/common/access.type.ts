import { Type } from '@nestjs/common';

export type AccessLevel = 'public' | 'account' | 'owner' | 'admin' | 'closed';

export type OperationAccess =
  | AccessLevel
  | { level: 'owner'; bindPath?: string };

export interface OperationConfig {
  create: OperationAccess;
  read: OperationAccess;
  update: OperationAccess;
  delete: OperationAccess;
}

export interface EntityControllerOptions {
  name: string;
  dto: any;
  entity: Type<unknown>;
  accountTable?: string;
  accountField?: string;
  operations?: Partial<OperationConfig>;
}

export function normalizeAccess(
  access: OperationAccess | undefined,
  fallback: AccessLevel = 'public',
): AccessLevel {
  if (access === undefined) return fallback;
  if (typeof access === 'string') return access;
  return access.level;
}

export function getBindPath(
  access: OperationAccess | undefined,
  fallback: string,
): string | undefined {
  if (access && typeof access === 'object' && access.bindPath) {
    return access.bindPath;
  }
  if (
    access === 'owner' ||
    (typeof access === 'object' && access?.level === 'owner')
  ) {
    return fallback;
  }
  return undefined;
}
