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
import type { DashboardStats, UrgentProblem } from "@/types";
import {
  Activity,
  BarChart3,
  BookOpen,
  Calendar,
  Flame,
  Terminal,
  TrendingUp,
  Zap,
  Target,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

interface SessionTemplateWithIcon {
  key: string;
  display_name: string;
  icon: typeof Zap;
  duration_min: number;
  estimated_problems: string;
  description: string;
}

const SESSION_TEMPLATES: SessionTemplateWithIcon[] = [
  {
    key: "daily_revision",
    display_name: "Daily Revision",
    icon: Zap,
    duration_min: 35,
    estimated_problems: "3-4 problems",
    description: "Quick daily practice for consistent progress",
  },
  {
    key: "daily_mixed",
    display_name: "Daily Mixed",
    icon: BookOpen,
    duration_min: 55,
    estimated_problems: "4-6 problems",
    description: "Balanced mix of revision and new challenges",
  },
  {
    key: "weekend_comprehensive",
    display_name: "Weekend Comprehensive",
    icon: Target,
    duration_min: 150,
    estimated_problems: "10-12 problems",
    description: "Comprehensive weekend practice session",
  },
];

export default function DashboardHome() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [urgentProblems, setUrgentProblems] = useState<UrgentProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, urgentRes] = await Promise.all([
        api.get("/dashboard/stats"),
        api.get("/problems/urgent"),
      ]);
      setStats(statsRes.data.data);
      setUrgentProblems(urgentRes.data.data);
    } catch (err: unknown) {
      console.error("Failed to fetch dashboard data:", err);
      setError(
        "Failed to load dashboard data. Please ensure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = (templateKey: string) => {
    navigate(`/dashboard/sessions/new?template=${templateKey}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full animate-in fade-in duration-300">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <Terminal className="relative h-10 w-10 text-primary animate-pulse" />
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-sm font-mono text-foreground">
              Initializing system...
            </p>
            <div className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
              <span className="animate-pulse">$</span>
              <span className="animate-[pulse_1s_ease-in-out_0.2s_infinite]">
                r
              </span>
              <span className="animate-[pulse_1s_ease-in-out_0.3s_infinite]">
                e
              </span>
              <span className="animate-[pulse_1s_ease-in-out_0.4s_infinite]">
                f
              </span>
              <span className="animate-[pulse_1s_ease-in-out_0.5s_infinite]">
                o
              </span>
              <span className="animate-[pulse_1s_ease-in-out_0.6s_infinite]">
                r
              </span>
              <span className="animate-[pulse_1s_ease-in-out_0.7s_infinite]">
                g
              </span>
              <span className="animate-[pulse_1s_ease-in-out_0.8s_infinite]">
                e
              </span>
              <span className="ml-1 animate-pulse">--load</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return <ApiError message={error} onRetry={fetchDashboardData} />;
  }

  const confidenceTrend = stats ? ((stats.avg_confidence - 62) / 62) * 100 : 0;

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* System Status Bar */}
      <div className="flex items-center justify-between border-b pb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-mono text-sm">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-muted-foreground uppercase tracking-wider">
              System Active
            </span>
            <span className="text-muted-foreground/50">|</span>
            <span className="text-primary">DB: SQLite</span>
            <span className="text-muted-foreground/50">|</span>
            <span className="text-muted-foreground">v0.0.1-alpha</span>
          </div>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          <span>
            Total: {stats?.total_problems ?? 0} | Mastered:{" "}
            {stats?.mastered_problems ?? 0}
          </span>
        </div>
      </div>

      {/* Session Launcher */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-card to-card/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Start Revision Session
          </CardTitle>
          <CardDescription>
            Choose a template to generate an optimized practice session
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {SESSION_TEMPLATES.map((template) => {
              const Icon = template.icon;
              return (
                <button
                  key={template.key}
                  onClick={() => handleStartSession(template.key)}
                  className="p-4 border rounded-md hover:border-primary hover:bg-accent/50 hover:shadow-[0_0_15px_-3px_var(--primary)] transition-all text-left group"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-md border border-primary/20 bg-primary/5 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="font-semibold font-mono uppercase tracking-wider text-sm">
                        {template.display_name}
                      </div>
                      <div className="text-xs font-mono text-muted-foreground">
                        {template.duration_min} min · {template.estimated_problems}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {template.description}
                  </div>
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <Link to="/dashboard/sessions/new" className="flex-1">
              <Button variant="outline" className="w-full font-mono">
                <Terminal className="h-4 w-4 mr-2" />
                Custom Session Builder
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Problems</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {stats?.total_problems ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-500 font-semibold">
                {stats?.mastered_problems ?? 0} mastered
              </span>{" "}
              (
              {Math.round(
                ((stats?.mastered_problems || 0) /
                  (stats?.total_problems || 1)) *
                  100
              )}
              %)
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg Confidence
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {stats?.avg_confidence ?? 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <span
                className={
                  confidenceTrend > 0 ? "text-green-500" : "text-red-500"
                }
              >
                {confidenceTrend > 0 ? "↑" : "↓"}{" "}
                {Math.abs(confidenceTrend).toFixed(1)}%
              </span>{" "}
              from last week
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {stats?.current_streak ?? 0} days
            </div>
            <p className="text-xs text-muted-foreground mt-1">Keep it going!</p>
          </CardContent>
        </Card>

        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Weak Pattern</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {stats?.weakest_pattern?.name || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.weakest_pattern?.confidence ?? 0}% confidence
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Urgent Problems List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-red-500" />
            Top 5 Urgent Problems
          </CardTitle>
          <CardDescription>
            Problems requiring immediate attention based on scoring algorithm
          </CardDescription>
        </CardHeader>
        <CardContent>
          {urgentProblems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No urgent problems yet.</p>
              <p className="text-xs mt-1">Add some problems to get started!</p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {urgentProblems.map((problem, index) => (
                  <div
                    key={problem.id}
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold font-mono text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold truncate">
                          {problem.title}
                        </h4>
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
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {problem.reason}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm font-mono text-muted-foreground">
                          {problem.confidence}%
                        </div>
                        <Progress
                          value={problem.confidence}
                          className="w-16 h-1.5 mt-1"
                        />
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-mono text-muted-foreground">
                          {problem.days_since_last}d
                        </div>
                      </div>
                      <div className="text-right min-w-[3rem]">
                        <div className="text-lg font-bold font-mono text-primary">
                          {problem.score.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button className="w-full" variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Start Quick Session with Top 3
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
