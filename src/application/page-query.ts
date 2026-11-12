export const DEFAULT_PAGE_LIMIT = 50;
export const DEFAULT_PAGE_OFFSET = 0;

export type PageQuery = {
  limit?: number;
  offset?: number;
};

export function resolvePage(query: PageQuery): { limit: number; offset: number } {
  return {
    limit: query.limit ?? DEFAULT_PAGE_LIMIT,
    offset: query.offset ?? DEFAULT_PAGE_OFFSET,
  };
}
