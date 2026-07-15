export const stripHtmlTags = (html: string): string => {
  return html
    ? `${html}`
        .trim()
        .replace(/<\/(p|li|ul|div)>/giu, '\n')
        .replace(/<br\s*\/?>/giu, '\n')
        .replace(/<li[^>]*>/giu, '* ')
        .replace(
          /<a[\w\W]+href=[\w\W]*['"]([\w\W]*)?["'][\w\W]*>([\w\W]*)?<\/a>/giu,
          '$2 ($1)',
        )
        .replace(/<[^>]*>/giu, '')
        .replace(/\n\s*\n/giu, '\n')
    : '';
};
