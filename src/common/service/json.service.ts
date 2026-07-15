import { JsonContains, Raw } from 'typeorm';

export const prepareJsonOrm = (value) => {
  if (typeof value !== 'object') {
    return;
  }

  if (process.env.DB_TYPE === 'postgres') {
    return JsonContains(value);
  }

  return Raw((alias) => `JSON_CONTAINS(${alias}, '${JSON.stringify(value)}')`);
};
