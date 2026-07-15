import { AccessLevel } from "@src/common/access.type";

export interface FieldAccessOptions {
  read?: AccessLevel;
  write?: AccessLevel;
}

export const FIELD_ACCESS_METADATA = "fieldAccess";

export function FieldAccess(options: FieldAccessOptions) {
  return function (target: any, propertyKey: string) {
    Reflect.defineMetadata(FIELD_ACCESS_METADATA, options, target, propertyKey);
  };
}
