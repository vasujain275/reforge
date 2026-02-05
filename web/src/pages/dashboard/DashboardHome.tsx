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
import { COPY } from "@/lib/copy";
import { useAuthStore } from "@/store/authStore";
import type { DashboardStats, UrgentProblem } from "@/types";
import {
  BarChart3,
  BookOpen,
  Clock,
  Flame,
  TrendingUp,
  Zap,
  Target,
  Repeat,
  ArrowRight,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

interface SessionTemplate {
  key: string;
  name: string;
  icon: typeof Zap;
  duration: number;
  description: string;
}

const QUICK_TEMPLATES: SessionTemplate[] = [
  {
    key: "morning_momentum",
    name: "Quick Review",
    icon: Zap,
    duration: 35,
    description: "Quick confidence wins",
  },
  {
    key: "weakness_crusher",
    name: "Focus Session",
    icon: Target,
    duration: 45,
    description: "Target weak areas",
  },
  {
    key: "daily_mixed_grind",
    name: "Standard Practice",
    icon: Repeat,
    duration: 55,
    description: "Balanced difficulty mix",
  },
];

export default function DashboardHome() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
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
        "Failed to load dashboard data. Please check your connection and try again."
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
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm text-muted-foreground">
            {COPY.status.loading}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return <ApiError message={error} onRetry={fetchDashboardData} />;
  }

  const confidenceTrend = stats ? ((stats.avg_confidence - 62) / 62) * 100 : 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Welcome Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">
            {COPY.dashboard.welcome}, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          {(stats?.problems_due ?? 0) > 0 && (
            <p className="text-muted-foreground">
              You have <span className="text-foreground font-medium">{stats?.problems_due}</span> {COPY.dashboard.problemsDue}
            </p>
          )}
        </div>

        {/* Quick Start Card */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  {COPY.dashboard.readyToPractice}
                </CardTitle>
                <CardDescription className="mt-1">
                  Choose a session type to get started
                </CardDescription>
              </div>
              <Link to="/dashboard/sessions/new">
                <Button variant="ghost" size="sm" className="gap-1">
                  All templates
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {QUICK_TEMPLATES.map((template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.key}
                    onClick={() => handleStartSession(template.key)}
                    className="p-4 border rounded-lg hover:border-primary hover:bg-accent/50 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <span className="text-sm text-muted-foreground font-medium">
                        {template.duration} min
                      </span>
                    </div>
                    <div className="font-medium mb-1">{template.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {template.description}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div>
          <h2 className="text-lg font-medium mb-4">{COPY.dashboard.yourProgress}</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {COPY.dashboard.stats.totalProblems}
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.total_problems ?? 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-success font-medium">
                    {stats?.mastered_problems ?? 0} mastered
                  </span>{" "}
                  ({Math.round(((stats?.mastered_problems || 0) / (stats?.total_problems || 1)) * 100)}%)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {COPY.dashboard.stats.avgConfidence}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(stats?.avg_confidence ?? 0)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className={confidenceTrend > 0 ? "text-success" : "text-destructive"}>
                    {confidenceTrend > 0 ? "↑" : "↓"} {Math.abs(confidenceTrend).toFixed(1)}%
                  </span>{" "}
                  from last week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {COPY.dashboard.stats.currentStreak}
                </CardTitle>
                <Flame className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.current_streak ?? 0} <span className="text-base font-normal text-muted-foreground">{COPY.dashboard.stats.days}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Keep it going!
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Weakest Pattern
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold truncate">
                  {stats?.weakest_pattern?.name || "N/A"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.weakest_pattern?.confidence ?? 0}% confidence
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Problems Needing Review */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{COPY.dashboard.problemsNeedingReview}</CardTitle>
                <CardDescription>
                  Problems ranked by priority score
                </CardDescription>
              </div>
              <Link to="/dashboard/problems">
                <Button variant="ghost" size="sm" className="gap-1">
                  {COPY.actions.viewAll}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {urgentProblems.length === 0 ? (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="font-medium mb-1">{COPY.empty.problems.title}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {COPY.empty.problems.description}
                </p>
                <Link to="/dashboard/problems/new">
                  <Button>{COPY.empty.problems.action}</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {urgentProblems.slice(0, 5).map((problem, index) => (
                  <div
                    key={problem.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground font-medium text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h4 className="font-medium truncate">{problem.title}</h4>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            problem.difficulty === "hard"
                              ? "bg-difficulty-hard text-difficulty-hard"
                              : problem.difficulty === "medium"
                              ? "bg-difficulty-medium text-difficulty-medium"
                              : "bg-difficulty-easy text-difficulty-easy"
                          }`}
                        >
                          {problem.difficulty}
                        </span>
                        {problem.url && (
                          <a
                            href={problem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {problem.reason}
                      </p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-right">
                        <div className="text-muted-foreground">{problem.confidence}%</div>
                        <Progress value={problem.confidence} className="w-16 h-1.5 mt-1" />
                      </div>
                      <div className="text-right text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {problem.days_since_last}d
                      </div>
                      <div className="text-right min-w-[3rem]">
                        <div className="font-mono font-bold text-primary">
                          {problem.score.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
