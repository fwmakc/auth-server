import { isFilled } from './scalar.helper';

export const except = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[] | K,
): Omit<T, K> => {
  const toFiltrate = Array.isArray(keys) ? keys : [keys];

  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => !toFiltrate.includes(key as K)),
  ) as Omit<T, K>;
};

export const only = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[] | K,
): Pick<T, K> => {
  const toFiltrate = Array.isArray(keys) ? keys : [keys];

  return Object.fromEntries(
    Object.entries(obj).filter(([key]) => toFiltrate.includes(key as K)),
  ) as Pick<T, K>;
};

type MappingValue<S, T> =
  | {
      sourceKey: keyof S;
      transform?: (value: any) => any;
    }
  | keyof S;

export const setIfFilled = <T extends object, S extends object = T>(
  target: T,
  source: S,
  mapping?: Record<keyof T, MappingValue<S, T>> | (keyof T)[] | keyof T,
): void => {
  if (!mapping) {
    const keysToSet = Object.keys(source) as (keyof S)[];
    keysToSet.forEach((key) => {
      const value = source[key];
      if (isFilled(value)) {
        const targetKey = key as unknown as keyof T;
        if (targetKey in target) {
          target[targetKey] = value as any;
        }
      }
    });
  } else if (typeof mapping === 'object' && !Array.isArray(mapping)) {
    Object.entries(mapping).forEach(([targetKey, mappingValue]) => {
      let sourceKey: keyof S;
      let transform: ((value: any) => any) | undefined;

      if (
        typeof mappingValue === 'object' &&
        mappingValue !== null &&
        'sourceKey' in mappingValue
      ) {
        const mappingObj = mappingValue as {
          sourceKey: keyof S;
          transform?: (value: any) => any;
        };
        sourceKey = mappingObj.sourceKey;
        transform = mappingObj.transform;
      } else {
        sourceKey = mappingValue as keyof S;
      }

      let value = source[sourceKey];

      if (transform) {
        value = transform(value);
      }

      if (isFilled(value)) {
        target[targetKey as keyof T] = value as any;
      }
    });
  } else {
    const keysToSet = Array.isArray(mapping) ? mapping : [mapping];
    keysToSet.forEach((key) => {
      const sourceKey = key as unknown as keyof S;
      const value = source[sourceKey];
      if (isFilled(value)) {
        target[key] = value as any;
      }
    });
  }
};
