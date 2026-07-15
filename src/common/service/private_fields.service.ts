import { AccessLevel } from "@src/common/access.type";
import {
  FIELD_ACCESS_METADATA,
  FieldAccessOptions,
} from "@src/common/decorator/field_access.decorator";

function canRead(level: AccessLevel, bind: any, dto: any): boolean {
  if (!bind) return level === "public";
  switch (level) {
    case "public":
      return true;
    case "account":
      return bind.id !== undefined || bind.allow === true;
    case "owner":
      if (bind.allow) return true;
      if (bind.id === undefined) return false;
      {
        const { id, key = "id", name = "account" } = bind;
        let ownerEntity;
        if (name.includes(".")) {
          ownerEntity = name
            .split(".")
            .reduce((acc: any, segment: string) => acc?.[segment], dto);
          if (!ownerEntity) return true;
        } else {
          ownerEntity = dto?.[name];
        }
        const ownerId = ownerEntity?.[key];
        const ownerIdFallback = dto?.[name + "Id"];
        return (
          String(ownerId) === String(id) ||
          String(ownerIdFallback) === String(id)
        );
      }
    case "admin":
      return !!bind.allow;
    case "closed":
      return false;
    default:
      return true;
  }
}

function canWrite(level: AccessLevel, bind: any): boolean {
  if (!bind) return level === "public";
  switch (level) {
    case "public":
      return true;
    case "account":
      return bind?.id !== undefined || bind?.allow === true;
    case "owner":
      return true;
    case "admin":
      return !!bind?.allow;
    case "closed":
      return false;
    default:
      return true;
  }
}

export const removePrivateFields = (
  result: any | any[],
  bind: any
): any | any[] => {
  const seen = new WeakSet();
  if (Array.isArray(result)) {
    result.forEach((entry) => entry && processDto(entry, bind, seen));
  } else if (result && typeof result === "object") {
    processDto(result, bind, seen);
  }
  return result;
};

const processDto = (dto: any, bind: any, seen: WeakSet<object>): void => {
  if (!dto || typeof dto !== "object" || seen.has(dto)) return;
  seen.add(dto);

  const proto = dto.constructor?.prototype;

  for (const key of Object.keys(dto)) {
    const fieldAccess: FieldAccessOptions | undefined = proto
      ? Reflect.getMetadata(FIELD_ACCESS_METADATA, proto, key)
      : undefined;

    if (fieldAccess?.read && fieldAccess.read !== "public") {
      if (!canRead(fieldAccess.read, bind, dto)) {
        delete dto[key];
        continue;
      }
    }

    const value = dto[key];
    if (value && typeof value === "object") {
      if (Array.isArray(value)) {
        value.forEach((item) => item && processDto(item, bind, seen));
      } else if (
        value.constructor &&
        value.constructor !== Object &&
        value.constructor !== Date
      ) {
        processDto(value, bind, seen);
      }
    }
  }
};

export const stripWriteFields = (
  dto: any,
  entityTarget: any,
  bind: any
): void => {
  const proto = entityTarget?.prototype;
  if (!proto) return;

  for (const key of Object.keys(dto)) {
    const fieldAccess: FieldAccessOptions | undefined = Reflect.getMetadata(
      FIELD_ACCESS_METADATA,
      proto,
      key
    );
    if (!fieldAccess?.write || fieldAccess.write === "public") continue;

    if (!canWrite(fieldAccess.write, bind)) {
      delete dto[key];
    }
  }
};
