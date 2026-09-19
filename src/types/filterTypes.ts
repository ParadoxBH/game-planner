export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface SortingParams {
  column: string;
  direction: 'asc' | 'desc';
}

export interface GenericFilter<T> {
  pagination: PaginationParams;
  sorting: SortingParams;
  search: string;
  criteria: T;
}
