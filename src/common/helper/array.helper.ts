export const arrayWrap = <T>(value: T | T[]): T[] => {
  return Array.isArray(value) ? value : [value];
};

export const arrayUnwrap = <T>(value: T | T[]): T => {
  return Array.isArray(value) && value.length ? value[0] : (value as T);
};
