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
    activeEventIds?: string[],
    strictEventFilter?: boolean
  ): Promise<PaginatedResponse<T>> {
    let collection = this.table.toCollection();

    // 1. Global Event Filter
    collection = collection.filter((item: any) => {
      const itemEvents = item.event;
      const hasEvent = itemEvents && (Array.isArray(itemEvents) ? itemEvents.length > 0 : true);
      
      // If it doesn't have an event, it's a "base" resource.
      // We only show it in general lists (!strictEventFilter).
      if (!hasEvent) {
        return !strictEventFilter;
      }

      // If it has an event, we only show it if a matching filter is active
      if (activeEventIds && activeEventIds.length > 0) {
        const activeLower = activeEventIds.map(id => id.toLowerCase());
        const eventsArray = Array.isArray(itemEvents) ? itemEvents : [itemEvents];
        const match = eventsArray.some((id: string) => id && activeLower.includes(id.toLowerCase()));
        return match;
      }

      // Has event but no filter is active -> hide it
      return false;
    });

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
