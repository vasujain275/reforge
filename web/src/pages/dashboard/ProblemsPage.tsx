/* eslint-disable react-hooks/purity */
import ApiError from "@/components/ApiError";
import { DataPagination } from "@/components/DataPagination";
import { SearchInput } from "@/components/SearchInput";
import { ProblemsContentSkeleton } from "@/components/ContentSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePagination } from "@/hooks/usePagination";
import { useProblems } from "@/hooks/queries";
import {
  CheckCircle2,
  ExternalLink,
  Filter,
  Plus,
  BookOpen,
  XCircle,
  Edit,
  Play,
  BarChart3,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function ProblemsPage() {
  const navigate = useNavigate();

  const {
    page,
    pageSize,
    localSearchQuery,
    setLocalSearchQuery,
    debouncedSearchQuery,
    setPage,
    setFilter,
    getFilter,
  } = usePagination(20);

  const difficultyFilter = getFilter("difficulty");
  const statusFilter = getFilter("status");

  // Use TanStack Query for data fetching
  const { data, isLoading, isFetching, error, refetch } = useProblems({
    page,
    pageSize,
    searchQuery: debouncedSearchQuery,
    difficulty: difficultyFilter,
    status: statusFilter,
  });

  // Helper to calculate days since last attempt
  const getDaysSinceLastAttempt = (date?: string) => {
    if (!date) return "Never";
    const days = Math.floor(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days === 0) return "Today";
    if (days === 1) return "1d ago";
    return `${days}d ago`;
  };

  const problems = data?.data || [];
  const totalPages = data?.total_pages || 0;

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">
            Problems
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage your problem set and track progress
          </p>
        </div>
        <Link to="/dashboard/problems/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Problem
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="rounded-md border border-border">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <SearchInput
                value={localSearchQuery}
                onChange={setLocalSearchQuery}
                placeholder="Search problem registry..."
                isFetching={isFetching}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setFilter("status", v)}
            >
              <SelectTrigger className="rounded-md">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-md">
                <SelectItem value="all">
                  All Status
                </SelectItem>
                <SelectItem value="unsolved">
                  Unsolved
                </SelectItem>
                <SelectItem value="solved">
                  Solved
                </SelectItem>
                <SelectItem value="abandoned">
                  Abandoned
                </SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={difficultyFilter}
              onValueChange={(v) => setFilter("difficulty", v)}
            >
              <SelectTrigger className="rounded-md">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent className="rounded-md">
                <SelectItem value="all">
                  All Levels
                </SelectItem>
                <SelectItem value="easy">
                  Easy
                </SelectItem>
                <SelectItem value="medium">
                  Medium
                </SelectItem>
                <SelectItem value="hard">
                  Hard
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {data && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing{" "}
            {problems.length > 0 ? (page - 1) * pageSize + 1 : 0} -{" "}
            {Math.min(page * pageSize, data.total)} of {data.total} problems
          </span>
        </div>
      )}

      {/* Content: Skeleton on initial load, error state, or data */}
      {isLoading ? (
        <ProblemsContentSkeleton count={5} />
      ) : error && !data ? (
        <ApiError
          message="Failed to load problems. Please ensure the backend is running."
          onRetry={() => refetch()}
        />
      ) : (
        <>
          {/* Problems List */}
          <div
            className={`space-y-3 transition-opacity duration-200 ${
              isFetching ? "opacity-50" : "opacity-100"
            }`}
          >
            {problems.length === 0 ? (
              <Card className="rounded-md border border-border">
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm">
                    No Problems Found
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {localSearchQuery ||
                    difficultyFilter !== "all" ||
                    statusFilter !== "all"
                      ? "Try adjusting your search filters"
                      : "Add your first problem to begin tracking"}
                  </p>
                  <Link to="/dashboard/problems/new" className="inline-block mt-4">
                    <Button className="rounded-md">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Problem
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              problems.map((problem, index) => (
                <Card
                  key={problem.id}
                  className="rounded-md border border-border hover:border-primary/50 transition-all"
                >
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      {/* Index Number */}
                      <div className="flex items-center justify-center w-12 h-12 rounded-md border border-border bg-muted/20">
                        <span className="text-lg font-bold font-mono text-primary">
                          #
                          {String(
                            (page - 1) * pageSize + index + 1
                          ).padStart(3, "0")}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">
                            {problem.title}
                          </h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-md border ${
                              problem.difficulty === "hard"
                                ? "bg-red-500/10 text-red-500 border-red-500/20"
                                : problem.difficulty === "medium"
                                ? "bg-orange-400/10 text-orange-400 border-orange-400/20"
                                : "bg-green-500/10 text-green-500 border-green-500/20"
                            }`}
                          >
                            {problem.difficulty}
                          </span>
                          {problem.stats?.status === "solved" && (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-green-500/10 text-green-500 border border-green-500/20 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Solved
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <span className="text-xs">
                            {problem.source || "Custom"}
                          </span>
                          {problem.url && (
                            <a
                              href={problem.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 hover:text-primary transition-colors text-xs"
                            >
                              <ExternalLink className="h-3 w-3" />
                              External Link
                            </a>
                          )}
                        </div>
                        {problem.stats && (
                          <div className="grid grid-cols-4 gap-4">
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">
                                Confidence
                              </div>
                              <div className="flex items-center gap-2">
                                <Progress
                                  value={problem.stats.confidence}
                                  className="w-20 h-1.5"
                                />
                                <span className="text-sm font-mono font-bold text-primary">
                                  {problem.stats.confidence}%
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">
                                Last Attempt
                              </div>
                              <div className="text-sm font-mono font-bold">
                                {getDaysSinceLastAttempt(
                                  problem.stats.last_attempt_at
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">
                                Attempts
                              </div>
                              <div className="text-sm font-mono font-bold">
                                {String(problem.stats.total_attempts).padStart(
                                  2,
                                  "0"
                                )}
                              </div>
                            </div>
                            {problem.stats.last_outcome && (
                              <div>
                                <div className="text-xs text-muted-foreground mb-1">
                                  Last Result
                                </div>
                                <div
                                  className={`text-sm font-bold flex items-center gap-1 ${
                                    problem.stats.last_outcome === "passed"
                                      ? "text-green-500"
                                      : "text-red-500"
                                  }`}
                                >
                                  {problem.stats.last_outcome === "passed" ? (
                                    <CheckCircle2 className="h-4 w-4" />
                                  ) : (
                                    <XCircle className="h-4 w-4" />
                                  )}
                                  {problem.stats.last_outcome === "passed" ? "Passed" : "Failed"}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() =>
                            navigate(
                              `/dashboard/attempts/new?problem_id=${problem.id}`
                            )
                          }
                          className="rounded-md"
                        >
                          <Play className="h-3 w-3 mr-1" />
                          <span className="text-xs">
                            Start
                          </span>
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(
                              `/dashboard/attempts?problem_id=${problem.id}`
                            )
                          }
                          className="rounded-md"
                        >
                          <BarChart3 className="h-3 w-3 mr-1" />
                          <span className="text-xs">
                            Stats
                          </span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/dashboard/problems/${problem.id}/edit`)
                          }
                          className="rounded-md"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {data && totalPages > 0 && (
            <div className="flex items-center justify-center pt-4">
              <DataPagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
