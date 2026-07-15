import { ILike, Like } from 'typeorm';

export const prepareLike = () => {
  if (process.env.DB_TYPE === 'postgres') {
    return 'ILIKE';
  }

  return 'LIKE';
};

export const prepareLikeOrm = (value) => {
  if (process.env.DB_TYPE === 'postgres') {
    return ILike(value);
  }

  return Like(value);
};
