import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { GenericFilter } from '../types/filterTypes';

export interface PaginationController<T> {
  info: GenericFilter<T>;
  setPage: (page: number) => void;
  setSearch: (search: string) => void;
  setCriteria: (criteria: Partial<T>) => void;
  setPageSize: (size: number) => void;
  setTotalItems: (total: number) => void;
  totalItems: number;
  lastPage: number;
}

export function usePagination<T>(initialCriteria: T): PaginationController<T> {
  const [searchParams, setSearchParams] = useSearchParams();

  // Helper to parse criteria from URL
  const parseCriteria = useCallback(() => {
    const criteriaRaw = searchParams.get("criteria");
    if (!criteriaRaw) return initialCriteria;
    try {
      return { ...initialCriteria, ...JSON.parse(criteriaRaw) };
    } catch (e) {
      return initialCriteria;
    }
  }, [searchParams, initialCriteria]);

  const [filter, setFilter] = useState<GenericFilter<T>>(() => {
    const page = parseInt(searchParams.get("page") || "1", 10);
    const search = searchParams.get("search") || "";
    const pageSize = parseInt(searchParams.get("pageSize") || "30", 10);
    const criteria = parseCriteria();

    return {
      pagination: { page, pageSize },
      sorting: { column: 'id', direction: 'asc' },
      search,
      criteria,
    };
  });

  // Sync Filter -> URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (filter.pagination.page > 1) params.set("page", filter.pagination.page.toString());
    if (filter.search) params.set("search", filter.search);
    if (filter.pagination.pageSize !== 30) params.set("pageSize", filter.pagination.pageSize.toString());
    
    // We sync criteria as a JSON string
    // Optimization: only sync if it's not empty or different from initial
    const criteriaStr = JSON.stringify(filter.criteria);
    if (criteriaStr !== JSON.stringify(initialCriteria)) {
      params.set("criteria", criteriaStr);
    }
    
    setSearchParams(params, { replace: true });
  }, [filter, setSearchParams, initialCriteria]);

  const [totalItems, setTotalItemsState] = useState(0);

  const lastPage = useMemo(() => {
    return Math.max(1, Math.ceil(totalItems / filter.pagination.pageSize));
  }, [totalItems, filter.pagination.pageSize]);

  const setPage = useCallback((page: number) => {
    setFilter(prev => ({ ...prev, pagination: { ...prev.pagination, page } }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setFilter(prev => ({ 
      ...prev, 
      search, 
      pagination: { ...prev.pagination, page: 1 } 
    }));
  }, []);

  const setCriteria = useCallback((criteria: Partial<T>) => {
    setFilter(prev => ({
      ...prev,
      criteria: { ...prev.criteria, ...criteria },
      pagination: { ...prev.pagination, page: 1 }
    }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setFilter(prev => ({
      ...prev,
      pagination: { ...prev.pagination, pageSize, page: 1 }
    }));
  }, []);

  const setTotalItems = useCallback((total: number) => {
    setTotalItemsState(total);
  }, []);

  return useMemo(() => ({
    info: filter,
    totalItems,
    lastPage,
    setPage,
    setSearch,
    setCriteria,
    setPageSize,
    setTotalItems
  }), [filter, totalItems, lastPage, setPage, setSearch, setCriteria, setPageSize, setTotalItems]);
}
