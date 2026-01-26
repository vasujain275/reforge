import { useCallback, useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useDebounce } from "./useDebounce";

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

  // Initialize local search query from URL (only on mount)
  const initialQuery = searchParams.get("q") || "";
  const [localSearchQuery, setLocalSearchQuery] = useState(initialQuery);

  // Track if this is the initial mount to prevent unnecessary URL updates
  const isInitialMount = useRef(true);

  // Debounce the local search query (300ms delay for smooth typing)
  const debouncedSearchQuery = useDebounce(localSearchQuery, 300);

  // Get current URL values
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(
    searchParams.get("page_size") || String(initialPageSize)
  );

  // Sync debounced search query to URL (only after initial mount)
  useEffect(() => {
    // Skip the initial mount to prevent URL update on page load
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      const currentUrlQuery = params.get("q") || "";

      // Only update if the debounced value is different from URL
      if (debouncedSearchQuery !== currentUrlQuery) {
        if (debouncedSearchQuery) {
          params.set("q", debouncedSearchQuery);
        } else {
          params.delete("q");
        }
        // Reset to first page when search changes
        params.set("page", "1");
      }
      return params;
    });
  }, [debouncedSearchQuery, setSearchParams]);

  // Listen for popstate (browser back/forward) to sync local state
  useEffect(() => {
    const handlePopState = () => {
      const urlQuery = new URLSearchParams(window.location.search).get("q") || "";
      setLocalSearchQuery(urlQuery);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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

  const clearSearch = useCallback(() => {
    setLocalSearchQuery("");
  }, []);

  const goToFirstPage = useCallback(() => setPage(1), [setPage]);
  const goToLastPage = useCallback(
    (totalPages: number) => setPage(totalPages),
    [setPage]
  );
  const goToNextPage = useCallback(
    (currentPage: number) => setPage(currentPage + 1),
    [setPage]
  );
  const goToPreviousPage = useCallback(
    (currentPage: number) => setPage(currentPage - 1),
    [setPage]
  );

  return {
    // Pagination
    page,
    pageSize,
    setPage,
    setPageSize,

    // Search - local value for input binding (immediate updates)
    localSearchQuery,
    setLocalSearchQuery,
    // Search - debounced value for API calls
    debouncedSearchQuery,
    // Clear helper
    clearSearch,

    // Filters
    setFilter,
    getFilter,

    // Navigation helpers
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPreviousPage,

    // Loading state
    isLoading,
    setIsLoading,
  };
}
