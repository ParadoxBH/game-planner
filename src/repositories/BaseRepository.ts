import { type Table } from 'dexie';
import type { SearchOptions, PaginatedResponse } from '../types/apiModels';

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

  async search(options?: SearchOptions): Promise<T[] | PaginatedResponse<T>> {
    let collection = this.table.toCollection();

    // Apply Global Event Filter if present
    if (options?.activeEventIds && options.activeEventIds.length > 0) {
      const activeIds = options.activeEventIds;
      collection = collection.filter((item: any) => {
        // If item has no event requirements, it's always visible
        if (!item.event || !Array.isArray(item.event) || item.event.length === 0) {
          return true;
        }
        // If item has events, at least one must be active
        return item.event.some((id: string) => activeIds.includes(id));
      });
    }

    // Apply Custom Filters if present
    if (options?.filters) {
      const filters = options.filters;
      collection = collection.filter((item: any) => {
        return Object.entries(filters).every(([key, value]) => {
          if (value === undefined) return true;
          
          const itemValue = item[key];
          const values = Array.isArray(value) ? value : [value];
          const isArray = Array.isArray(itemValue);

          return values.every(v => {
            const str = String(v);
            const negate = str.startsWith("!");
            const target = negate ? str.substring(1) : str;

            if (isArray) {
              const matches = itemValue.some((iv: any) => String(iv) === target);
              return negate ? !matches : matches;
            }
            const matches = String(itemValue) === target;
            return negate ? !matches : matches;
          });
        });
      });
    }

    const allData = await collection.toArray();

    if (!options?.pagination) {
      return allData;
    }

    const { page = 1, perPage = 20 } = options.pagination;
    const total = allData.length;
    const lastPage = Math.ceil(total / perPage);
    const offset = (page - 1) * perPage;
    const paginatedData = allData.slice(offset, offset + perPage);

    return {
      data: paginatedData,
      total,
      page,
      perPage,
      lastPage,
    };
  }

  async bulkAdd(items: T[]): Promise<any> {
    return this.table.bulkAdd(items);
  }

  async clear(): Promise<void> {
    return this.table.clear();
  }
}
