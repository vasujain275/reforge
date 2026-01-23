import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { PaginatedSessions, RevisionSession } from "@/types";

export interface UseSessionsParams {
  page: number;
  pageSize: number;
  searchQuery?: string;
  status?: string;
}

export function useSessions({
  page,
  pageSize,
  searchQuery,
  status,
}: UseSessionsParams) {
  return useQuery({
    queryKey: ["sessions", { page, pageSize, searchQuery, status }],
    queryFn: async (): Promise<PaginatedSessions> => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (searchQuery) params.append("q", searchQuery);
      if (status && status !== "all") params.append("status", status);

      const response = await api.get(`/sessions?${params.toString()}`);
      return response.data.data;
    },
  });
}

export function useSession(sessionId: number | null) {
  return useQuery({
    queryKey: ["session", sessionId],
    queryFn: async (): Promise<RevisionSession> => {
      const response = await api.get(`/sessions/${sessionId}`);
      return response.data.data;
    },
    enabled: sessionId !== null,
  });
}
