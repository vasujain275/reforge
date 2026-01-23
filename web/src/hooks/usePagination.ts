import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";

export interface PaginationState {
  page: number;
  pageSize: number;
  searchQuery: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export function usePagination(initialPageSize: number = 20) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("page_size") || String(initialPageSize));
  const searchQuery = searchParams.get("q") || "";

  const setPage = useCallback(
    (newPage: number) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set("page", String(newPage));
        return params;
      });
    },
    [setSearchParams]
  );

  const setPageSize = useCallback(
    (newPageSize: number) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        params.set("page_size", String(newPageSize));
        params.set("page", "1"); // Reset to first page
        return params;
      });
    },
    [setSearchParams]
  );

  const setSearchQuery = useCallback(
    (query: string) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        if (query) {
          params.set("q", query);
        } else {
          params.delete("q");
        }
        params.set("page", "1"); // Reset to first page
        return params;
      });
    },
    [setSearchParams]
  );

  const setFilter = useCallback(
    (key: string, value: string) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        if (value && value !== "all") {
          params.set(key, value);
        } else {
          params.delete(key);
        }
        params.set("page", "1"); // Reset to first page
        return params;
      });
    },
    [setSearchParams]
  );

  const getFilter = useCallback(
    (key: string, defaultValue: string = "all") => {
      return searchParams.get(key) || defaultValue;
    },
    [searchParams]
  );

  const goToFirstPage = useCallback(() => setPage(1), [setPage]);
  const goToLastPage = useCallback((totalPages: number) => setPage(totalPages), [setPage]);
  const goToNextPage = useCallback((currentPage: number) => setPage(currentPage + 1), [setPage]);
  const goToPreviousPage = useCallback((currentPage: number) => setPage(currentPage - 1), [setPage]);

  return {
    page,
    pageSize,
    searchQuery,
    setPage,
    setPageSize,
    setSearchQuery,
    setFilter,
    getFilter,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,
    isLoading,
    setIsLoading,
  };
}
