import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time: 30 seconds before data is considered stale
      staleTime: 30 * 1000,
      // Cache time: 5 minutes before unused data is garbage collected
      gcTime: 5 * 60 * 1000,
      // Retry failed requests up to 2 times
      retry: 2,
      // Disable refetch on window focus to prevent unexpected refetches during typing
      refetchOnWindowFocus: false,
      // Don't refetch on mount if data is fresh
      refetchOnMount: true,
    },
    mutations: {
      // Retry failed mutations once
      retry: 1,
    },
  },
});
