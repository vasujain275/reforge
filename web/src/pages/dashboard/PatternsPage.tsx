import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Pattern, UserPatternStats } from "@/types";
import { BarChart3, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

interface PatternWithStats extends Pattern {
  stats?: UserPatternStats;
  problemCount: number;
}

export default function PatternsPage() {
  const [patterns, setPatterns] = useState<PatternWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPatterns();
  }, []);

  const fetchPatterns = async () => {
    try {
      // TODO: Replace with actual API call
      // const response = await api.get("/patterns");
      // setPatterns(response.data.data);

      // Mock data
      setPatterns([
        {
          id: 1,
          title: "Two Pointers",
          description: "Use two pointers to traverse arrays or strings",
          problemCount: 12,
          stats: {
            id: 1,
            user_id: 1,
            pattern_id: 1,
            times_revised: 15,
            avg_confidence: 78,
            last_revised_at: "2025-12-25",
          },
        },
        {
          id: 2,
          title: "Sliding Window",
          description: "Maintain a window of elements in an array",
          problemCount: 10,
          stats: {
            id: 2,
            user_id: 1,
            pattern_id: 2,
            times_revised: 12,
            avg_confidence: 65,
            last_revised_at: "2025-12-23",
          },
        },
        {
          id: 3,
          title: "Backtracking",
          description: "Explore all possible solutions recursively",
          problemCount: 8,
          stats: {
            id: 3,
            user_id: 1,
            pattern_id: 3,
            times_revised: 8,
            avg_confidence: 42,
            last_revised_at: "2025-12-20",
          },
        },
        {
          id: 4,
          title: "Dynamic Programming",
          description: "Break down problems into overlapping subproblems",
          problemCount: 15,
          stats: {
            id: 4,
            user_id: 1,
            pattern_id: 4,
            times_revised: 20,
            avg_confidence: 55,
            last_revised_at: "2025-12-22",
          },
        },
      ]);
    } catch (error) {
      console.error("Failed to fetch patterns:", error);
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
              Covering {patterns.reduce((acc, p) => acc + p.problemCount, 0)}{" "}
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
              {sortedPatterns[sortedPatterns.length - 1]?.title}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {sortedPatterns[sortedPatterns.length - 1]?.stats?.avg_confidence}
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
            <div className="text-lg font-bold">{sortedPatterns[0]?.title}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {sortedPatterns[0]?.stats?.avg_confidence}% confidence
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Patterns List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">
            Loading patterns...
          </div>
        ) : patterns.length === 0 ? (
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
                    <CardTitle className="text-lg mb-1">
                      {pattern.title}
                    </CardTitle>
                    <CardDescription>{pattern.description}</CardDescription>
                  </div>
                  {pattern.stats && (
                    <div className="text-right">
                      <div className="text-2xl font-bold font-mono text-primary">
                        {pattern.stats.avg_confidence}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        confidence
                      </div>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pattern.stats && (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">
                          Mastery Progress
                        </span>
                        <span className="font-mono">
                          {pattern.stats.avg_confidence}%
                        </span>
                      </div>
                      <Progress
                        value={pattern.stats.avg_confidence}
                        className="h-2"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <div className="text-muted-foreground mb-1">Problems</div>
                      <div className="font-mono font-semibold">
                        {pattern.problemCount}
                      </div>
                    </div>
                    {pattern.stats && (
                      <>
                        <div>
                          <div className="text-muted-foreground mb-1">
                            Times Revised
                          </div>
                          <div className="font-mono font-semibold">
                            {pattern.stats.times_revised}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground mb-1">
                            Last Revised
                          </div>
                          <div className="font-mono font-semibold">
                            {getDaysSinceLastRevised(
                              pattern.stats.last_revised_at
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm">
                      View Problems
                    </Button>
                    <Button variant="ghost" size="sm">
                      Practice This Pattern
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
