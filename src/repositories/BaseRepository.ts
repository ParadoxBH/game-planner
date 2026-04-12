import { type Table } from 'dexie';
import type { PaginatedResponse } from '../types/apiModels';
import type { GenericFilter } from '../types/filterTypes';

export abstract class BaseRepository<T, ID extends string | number> {
  protected table: Table<T, ID>;

  constructor(table: Table<T, ID>) {
    this.table = table;
  }

  async getAll(): Promise<T[]> {
    return this.table.toArray();
  }

  async getById(id: ID): Promise<T | undefined> {
    return this.table.get(id);
  }

  async search<C>(
    filter: GenericFilter<C>,
    criteriaMatcher?: (item: T, criteria: C) => boolean,
    activeEventIds?: string[]
  ): Promise<PaginatedResponse<T>> {
    let collection = this.table.toCollection();

    // 1. Global Event Filter
    if (activeEventIds && activeEventIds.length > 0) {
      collection = collection.filter((item: any) => {
        if (!item.event || !Array.isArray(item.event) || item.event.length === 0) {
          return true;
        }
        return item.event.some((id: string) => activeEventIds.includes(id));
      });
    }

    // 2. Generic Search (Name/ID)
    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      collection = collection.filter((item: any) => {
        const nameMatch = item.name?.toLowerCase().includes(searchLower);
        const idMatch = item.id?.toLowerCase().includes(searchLower);
        return nameMatch || idMatch;
      });
    }

    // 3. Contextual Criteria
    if (criteriaMatcher) {
      collection = collection.filter((item) => criteriaMatcher(item, filter.criteria));
    }

    let allData = await collection.toArray();

    // 4. Sorting
    if (filter.sorting && filter.sorting.column) {
      const { column, direction } = filter.sorting;
      allData.sort((a: any, b: any) => {
        const valA = a[column];
        const valB = b[column];
        
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;

        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // 5. Pagination
    const { page, pageSize } = filter.pagination;
    const total = allData.length;
    const lastPage = Math.ceil(total / pageSize);
    const offset = (page - 1) * pageSize;
    const paginatedData = allData.slice(offset, offset + pageSize);

    return {
      data: paginatedData,
      total,
      page,
      perPage: pageSize,
      lastPage,
    };
  }

  async getUniqueValues(field: string): Promise<string[]> {
    // If it's a multi-entry index (like *category), uniqueKeys() works great
    return this.table.orderBy(field).uniqueKeys() as Promise<string[]>;
  }

  async bulkAdd(items: T[]): Promise<any> {
    return this.table.bulkAdd(items);
  }

  async clear(): Promise<void> {
    return this.table.clear();
  }
}
