import ApiError from "@/components/ApiError";
import SystemStatusBar from "@/components/SystemStatusBar";
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
  Repeat,
  Cpu,
  Link2,
  GraduationCap,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

interface SessionTemplateWithIcon {
  key: string;
  display_name: string;
  icon: typeof Zap;
  duration_min: number;
  category: "daily" | "pattern" | "weekend";
  description: string;
}

// 10 Enhanced Smart Templates
const SESSION_TEMPLATES: SessionTemplateWithIcon[] = [
  // Daily Templates
  {
    key: "morning_momentum",
    display_name: "Morning Momentum",
    icon: Zap,
    duration_min: 35,
    category: "daily",
    description: "Confidence wins to start your day",
  },
  {
    key: "weakness_crusher",
    display_name: "Weakness Crusher",
    icon: Target,
    duration_min: 45,
    category: "daily",
    description: "Target low-confidence patterns",
  },
  {
    key: "daily_mixed_grind",
    display_name: "Daily Mixed Grind",
    icon: BookOpen,
    duration_min: 55,
    category: "daily",
    description: "Adaptive difficulty practice",
  },
  // Pattern Templates
  {
    key: "pattern_deep_dive",
    display_name: "Pattern Deep Dive",
    icon: Search,
    duration_min: 90,
    category: "pattern",
    description: "Master one pattern intensively",
  },
  {
    key: "pattern_rotation",
    display_name: "Pattern Rotation",
    icon: Repeat,
    duration_min: 60,
    category: "pattern",
    description: "Systematic 3-pattern exposure",
  },
  {
    key: "pattern_combo_chains",
    display_name: "Pattern Combos",
    icon: Link2,
    duration_min: 75,
    category: "pattern",
    description: "Multi-pattern hybrid problems",
  },
  {
    key: "pattern_graduation",
    display_name: "Pattern Graduation",
    icon: GraduationCap,
    duration_min: 50,
    category: "pattern",
    description: "Test mastery with 3 hard problems",
  },
  // Weekend Templates
  {
    key: "weekend_comprehensive",
    display_name: "Weekend Session",
    icon: Cpu,
    duration_min: 150,
    category: "weekend",
    description: "6-8 problems across all levels",
  },
  {
    key: "weak_pattern_marathon",
    display_name: "Weak Pattern Marathon",
    icon: Target,
    duration_min: 120,
    category: "weekend",
    description: "Intensive focus on 2 weakest",
  },
  {
    key: "challenge_gauntlet",
    display_name: "Challenge Gauntlet",
    icon: Flame,
    duration_min: 100,
    category: "weekend",
    description: "Interview pressure simulation",
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
    <div className="flex-1 flex flex-col h-full">
      {/* System Status Bar */}
      <SystemStatusBar />

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-6 p-6">
          {/* Quick Session Launcher */}
          <Card className="border border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <CardTitle className="text-base font-mono uppercase tracking-wider">
                Quick Start
              </CardTitle>
            </div>
            <Link to="/dashboard/sessions/new">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-mono hover:text-primary"
              >
                View All Templates →
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            {SESSION_TEMPLATES.filter((t) => t.category === "daily").map(
              (template) => {
                const Icon = template.icon;
                return (
                  <button
                    key={template.key}
                    onClick={() => handleStartSession(template.key)}
                    className="p-3 border rounded-md hover:border-primary hover:bg-accent/50 hover:shadow-[0_0_15px_-3px_var(--primary)] transition-all text-left"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-primary" />
                      <div className="text-xs font-mono text-muted-foreground">
                        {template.duration_min}m
                      </div>
                    </div>
                    <div className="font-semibold text-sm">
                      {template.display_name}
                    </div>
                  </button>
                );
              }
            )}
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
              {Math.round(stats?.avg_confidence ?? 0)}%
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
      </div>
    </div>
  );
}
