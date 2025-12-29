import ApiError from "@/components/ApiError";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import type { Pattern, UserPatternStats } from "@/types";
import {
  BarChart3,
  Plus,
  Terminal,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";

interface PatternWithStats extends Pattern {
  stats?: UserPatternStats;
  problemCount: number;
}

export default function PatternsPage() {
  const [patterns, setPatterns] = useState<PatternWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPatterns();
  }, []);

  const fetchPatterns = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/patterns");
      setPatterns(response.data.data || []);
    } catch (err: unknown) {
      console.error("Failed to fetch patterns:", err);
      setError(
        "Failed to load patterns. Please ensure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const sortedPatterns = [...patterns].sort(
    (a, b) => (a.stats?.avg_confidence || 0) - (b.stats?.avg_confidence || 0)
  );

  const getDaysSinceLastRevised = (date?: string) => {
    if (!date) return "Never";
    const days = Math.floor(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Terminal className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-sm font-mono text-muted-foreground">
            Loading patterns...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return <ApiError message={error} onRetry={fetchPatterns} />;
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pattern Mastery</h2>
          <p className="text-muted-foreground mt-1">
            Track your progress across different problem-solving patterns
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Pattern
        </Button>
      </div>

      {/* Pattern Stats Overview */}
      {patterns.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Patterns
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {patterns.length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Covering{" "}
                {patterns.reduce((acc, p) => acc + (p.problemCount || 0), 0)}{" "}
                problems
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Strongest</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {sortedPatterns[sortedPatterns.length - 1]?.title || "N/A"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {sortedPatterns[sortedPatterns.length - 1]?.stats
                  ?.avg_confidence || 0}
                % confidence
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Needs Work</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {sortedPatterns[0]?.title || "N/A"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {sortedPatterns[0]?.stats?.avg_confidence || 0}% confidence
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Patterns List */}
      <div className="space-y-3">
        {patterns.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No patterns yet</p>
              <Button className="mt-4">Add Your First Pattern</Button>
            </CardContent>
          </Card>
        ) : (
          sortedPatterns.map((pattern) => (
            <Card
              key={pattern.id}
              className="hover:border-primary/50 transition-colors"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{pattern.title}</CardTitle>
                    {pattern.description && (
                      <CardDescription className="mt-1">
                        {pattern.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold font-mono text-primary">
                        {pattern.stats?.avg_confidence || 0}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        confidence
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Progress
                    value={pattern.stats?.avg_confidence || 0}
                    className="h-2"
                  />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="font-mono">
                        {pattern.problemCount || 0} problems
                      </span>
                      <span className="font-mono">
                        {pattern.stats?.times_revised || 0} revisions
                      </span>
                    </div>
                    <span>
                      Last revised:{" "}
                      {getDaysSinceLastRevised(pattern.stats?.last_revised_at)}
                    </span>
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
