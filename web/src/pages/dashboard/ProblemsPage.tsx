import ApiError from "@/components/ApiError";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { Problem } from "@/types";
import {
  CheckCircle2,
  ExternalLink,
  Filter,
  Plus,
  Search,
  Terminal,
  XCircle,
  Edit,
  Play,
  BarChart3,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function ProblemsPage() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState<Problem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");

  useEffect(() => {
    fetchProblems();
  }, []);

  const fetchProblems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/problems");
      setProblems(response.data.data || []);
    } catch (err: unknown) {
      console.error("Failed to fetch problems:", err);
      setError(
        "Failed to load problems. Please ensure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredProblems = problems.filter((problem) => {
    const matchesSearch = problem.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || problem.stats?.status === statusFilter;
    const matchesDifficulty =
      difficultyFilter === "all" || problem.difficulty === difficultyFilter;
    return matchesSearch && matchesStatus && matchesDifficulty;
  });

  const getDaysSinceLastAttempt = (date?: string) => {
    if (!date) return "NEVER";
    const days = Math.floor(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days === 0) return "TODAY";
    if (days === 1) return "1d AGO";
    return `${days}d AGO`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Terminal className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
            Loading Problem Set...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return <ApiError message={error} onRetry={fetchProblems} />;
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-mono uppercase">
            PROBLEM REGISTRY
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Manage problem set and track execution metrics
          </p>
        </div>
        <Link to="/dashboard/problems/new">
          <Button className="rounded-md shadow-[0_0_15px_-3px_var(--primary)]">
            <Plus className="h-4 w-4 mr-2" />
            <span className="font-mono uppercase tracking-wider text-xs">
              Register Problem
            </span>
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="rounded-md border border-border">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search problem registry..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 rounded-md font-mono"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="rounded-md">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-md">
                <SelectItem value="all" className="font-mono">ALL STATUS</SelectItem>
                <SelectItem value="unsolved" className="font-mono">UNSOLVED</SelectItem>
                <SelectItem value="solved" className="font-mono">SOLVED</SelectItem>
                <SelectItem value="abandoned" className="font-mono">ABANDONED</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={difficultyFilter}
              onValueChange={setDifficultyFilter}
            >
              <SelectTrigger className="rounded-md">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent className="rounded-md">
                <SelectItem value="all" className="font-mono">ALL LEVELS</SelectItem>
                <SelectItem value="easy" className="font-mono">EASY</SelectItem>
                <SelectItem value="medium" className="font-mono">MEDIUM</SelectItem>
                <SelectItem value="hard" className="font-mono">HARD</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Problems List */}
      <div className="space-y-3">
        {filteredProblems.length === 0 ? (
          <Card className="rounded-md border border-border">
            <CardContent className="py-12 text-center">
              <Terminal className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground font-mono uppercase tracking-wider text-sm">
                No Problems Registered
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Initialize your first problem to begin tracking
              </p>
              <Link to="/dashboard/problems/new" className="inline-block mt-4">
                <Button className="rounded-md">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="font-mono uppercase tracking-wider text-xs">
                    Register Problem
                  </span>
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          filteredProblems.map((problem, index) => (
            <Card
              key={problem.id}
              className="rounded-md border border-border hover:border-primary/50 hover:shadow-[0_0_15px_-3px_var(--primary)] transition-all"
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  {/* Index Number */}
                  <div className="flex items-center justify-center w-12 h-12 rounded-md border border-border bg-muted/20">
                    <span className="text-lg font-bold font-mono text-primary">
                      #{String(index + 1).padStart(3, "0")}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg font-mono">
                        {problem.title}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-mono uppercase tracking-wider border ${
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
                        <span className="text-xs px-2 py-0.5 rounded-md bg-green-500/10 text-green-500 border border-green-500/20 flex items-center gap-1 font-mono uppercase tracking-wider">
                          <CheckCircle2 className="h-3 w-3" />
                          SOLVED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <span className="font-mono text-xs uppercase tracking-wider">
                        {problem.source || "CUSTOM"}
                      </span>
                      {problem.url && (
                        <a
                          href={problem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-primary transition-colors font-mono text-xs uppercase tracking-wider"
                        >
                          <ExternalLink className="h-3 w-3" />
                          External Link
                        </a>
                      )}
                    </div>
                    {problem.stats && (
                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1 font-mono uppercase tracking-wider">
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
                          <div className="text-xs text-muted-foreground mb-1 font-mono uppercase tracking-wider">
                            Last Exec
                          </div>
                          <div className="text-sm font-mono font-bold">
                            {getDaysSinceLastAttempt(
                              problem.stats.last_attempt_at
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1 font-mono uppercase tracking-wider">
                            Executions
                          </div>
                          <div className="text-sm font-mono font-bold">
                            {String(problem.stats.total_attempts).padStart(2, "0")}
                          </div>
                        </div>
                        {problem.stats.last_outcome && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1 font-mono uppercase tracking-wider">
                              Last Result
                            </div>
                            <div
                              className={`text-sm font-mono font-bold flex items-center gap-1 ${
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
                              {problem.stats.last_outcome.toUpperCase()}
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
                        navigate(`/dashboard/attempts/new?problem_id=${problem.id}`)
                      }
                      className="rounded-md shadow-[0_0_10px_-3px_var(--primary)]"
                    >
                      <Play className="h-3 w-3 mr-1" />
                      <span className="font-mono uppercase tracking-wider text-xs">
                        Execute
                      </span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate(`/dashboard/attempts?problem_id=${problem.id}`)
                      }
                      className="rounded-md"
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      <span className="font-mono uppercase tracking-wider text-xs">
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
    </div>
  );
}
