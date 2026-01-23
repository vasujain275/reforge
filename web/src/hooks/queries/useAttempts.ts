import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Attempt, Problem } from "@/types";

export interface UseProblemAttemptsParams {
  problemId: string | null;
}

export interface ProblemWithAttempts {
  problem: Problem;
  attempts: Attempt[];
}

export function useProblemAttempts({ problemId }: UseProblemAttemptsParams) {
  return useQuery({
    queryKey: ["problemAttempts", problemId],
    queryFn: async (): Promise<ProblemWithAttempts> => {
      // Fetch both problem details and attempts in parallel
      const [problemResponse, attemptsResponse] = await Promise.all([
        api.get(`/problems/${problemId}`),
        api.get(`/problems/${problemId}/attempts`),
      ]);

      return {
        problem: problemResponse.data.data,
        attempts: attemptsResponse.data.data || [],
      };
    },
    enabled: problemId !== null,
  });
}
