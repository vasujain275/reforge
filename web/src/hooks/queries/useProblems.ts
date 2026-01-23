import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PaginatedProblems } from "@/types";

export interface UseProblemsParams {
  page: number;
  pageSize: number;
  searchQuery?: string;
  difficulty?: string;
  status?: string;
}

export function useProblems({
  page,
  pageSize,
  searchQuery,
  difficulty,
  status,
}: UseProblemsParams) {
  return useQuery({
    queryKey: ["problems", { page, pageSize, searchQuery, difficulty, status }],
    queryFn: async (): Promise<PaginatedProblems> => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (searchQuery) params.append("q", searchQuery);
      if (difficulty && difficulty !== "all") params.append("difficulty", difficulty);
      if (status && status !== "all") params.append("status", status);

      const response = await api.get(`/problems?${params.toString()}`);
      return response.data.data;
    },
  });
}
