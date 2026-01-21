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
  Check,
  ExternalLink,
  Filter,
  Plus,
  Search,
  Terminal,
  X,
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
    if (!date) return "Never";
    const days = Math.floor(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    );
    return `${days} days ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Terminal className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-sm font-mono text-muted-foreground">
            Loading problems...
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
          <h2 className="text-3xl font-bold tracking-tight">Problem Library</h2>
          <p className="text-muted-foreground mt-1">
            Manage your coding problems and track progress
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
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search problems..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="unsolved">Unsolved</SelectItem>
                <SelectItem value="solved">Solved</SelectItem>
                <SelectItem value="abandoned">Abandoned</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={difficultyFilter}
              onValueChange={setDifficultyFilter}
            >
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Difficulties</SelectItem>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Problems List */}
      <div className="space-y-3">
        {filteredProblems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No problems found.</p>
            <p className="text-sm mt-1">
              Add your first problem to get started!
            </p>
            <Link to="/dashboard/problems/new" className="inline-block mt-4">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Problem
              </Button>
            </Link>
          </div>
        ) : (
          filteredProblems.map((problem) => (
            <Card
              key={problem.id}
              className="hover:border-primary/50 transition-colors"
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{problem.title}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-mono ${
                          problem.difficulty === "hard"
                            ? "bg-red-500/10 text-red-500"
                            : problem.difficulty === "medium"
                            ? "bg-orange-500/10 text-orange-500"
                            : "bg-green-500/10 text-green-500"
                        }`}
                      >
                        {problem.difficulty}
                      </span>
                      {problem.stats?.status === "solved" && (
                        <span className="text-xs px-2 py-0.5 rounded bg-green-500/10 text-green-500 flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          Solved
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="font-mono">{problem.source}</span>
                      {problem.url && (
                        <a
                          href={problem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-primary transition-colors"
                        >
                          <ExternalLink className="h-3 w-3" />
                          View Problem
                        </a>
                      )}
                    </div>
                    {problem.stats && (
                      <div className="flex items-center gap-6 mt-3">
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            Confidence
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={problem.stats.confidence}
                              className="w-24 h-2"
                            />
                            <span className="text-sm font-mono">
                              {problem.stats.confidence}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            Last Attempt
                          </div>
                          <div className="text-sm font-mono">
                            {getDaysSinceLastAttempt(
                              problem.stats.last_attempt_at
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">
                            Attempts
                          </div>
                          <div className="text-sm font-mono">
                            {problem.stats.total_attempts}
                          </div>
                        </div>
                        {problem.stats.last_outcome && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">
                              Last Outcome
                            </div>
                            <div
                              className={`text-sm font-mono ${
                                problem.stats.last_outcome === "passed"
                                  ? "text-green-500"
                                  : "text-red-500"
                              }`}
                            >
                              {problem.stats.last_outcome === "passed" ? (
                                <Check className="h-4 w-4 inline" />
                              ) : (
                                <X className="h-4 w-4 inline" />
                              )}{" "}
                              {problem.stats.last_outcome}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/dashboard/attempts/new?problem_id=${problem.id}`)}
                    >
                      Practice
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/dashboard/attempts?problem_id=${problem.id}`)}
                    >
                      View Stats
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/dashboard/problems/${problem.id}/edit`)}
                    >
                      Edit
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
