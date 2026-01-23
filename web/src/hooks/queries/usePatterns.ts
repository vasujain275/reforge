import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PaginatedPatterns } from "@/types";

export interface UsePatternsParams {
  page: number;
  pageSize: number;
  searchQuery?: string;
  sortBy?: string;
}

export function usePatterns({
  page,
  pageSize,
  searchQuery,
  sortBy = "confidence_asc",
}: UsePatternsParams) {
  return useQuery({
    queryKey: ["patterns", { page, pageSize, searchQuery, sortBy }],
    queryFn: async (): Promise<PaginatedPatterns> => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        sort_by: sortBy,
      });
      if (searchQuery) params.append("q", searchQuery);

      const response = await api.get(`/patterns?${params.toString()}`);
      return response.data.data;
    },
  });
}
