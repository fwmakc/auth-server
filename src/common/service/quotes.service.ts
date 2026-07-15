export const prepareQuotes = () => {
  const dbQuotes = process.env.DB_QUOTES;

  if (dbQuotes) {
    return dbQuotes;
  }

  const dbType = process.env.DB_TYPE;

  if (dbType === 'mysql') {
    return '`';
  }

  if (dbType === 'postgres') {
    return '"';
  }
};
