import ApiError from "@/components/ApiError";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import type { RevisionSession } from "@/types";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  Flame,
  GitBranch,
  PlayCircle,
  Search,
  Target,
  Terminal,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

export default function SessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState<RevisionSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchSession();
    }
  }, [id]);

  const fetchSession = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/sessions/${id}`);
      setSession(response.data.data);
    } catch (err: unknown) {
      console.error("Failed to fetch session:", err);
      setError("Failed to load session details");
    } finally {
      setLoading(false);
    }
  };

  const getTemplateDisplay = (key: string | undefined) => {
    const templates: Record<string, { icon: React.ReactNode; name: string }> = {
      morning_momentum: { icon: <Zap className="h-6 w-6" />, name: "Morning Momentum Builder" },
      weakness_crusher: { icon: <Target className="h-6 w-6" />, name: "Weakness Crusher" },
      daily_mixed: { icon: <GitBranch className="h-6 w-6" />, name: "Daily Mixed Grind" },
      pattern_deep_dive: { icon: <Search className="h-6 w-6" />, name: "Pattern Deep Dive" },
      pattern_rotation: { icon: <Cpu className="h-6 w-6" />, name: "Pattern Rotation" },
      pattern_combo: { icon: <Target className="h-6 w-6" />, name: "Pattern Combo Chains" },
      pattern_graduation: { icon: <CheckCircle2 className="h-6 w-6" />, name: "Pattern Graduation" },
      weekend_comprehensive: { icon: <Cpu className="h-6 w-6" />, name: "Weekend Comprehensive" },
      weak_pattern_marathon: { icon: <Flame className="h-6 w-6" />, name: "Weak Pattern Marathon" },
      challenge_gauntlet: { icon: <Flame className="h-6 w-6" />, name: "Challenge Gauntlet" },
    };
    if (!key) {
      return { icon: <Terminal className="h-6 w-6" />, name: "Custom Session" };
    }
    return templates[key] || { icon: <Terminal className="h-6 w-6" />, name: key };
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleRecordAttempt = (problemId: number) => {
    navigate(`/dashboard/attempts/new?problem_id=${problemId}&session_id=${id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Terminal className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-sm font-mono text-muted-foreground">
            Loading session...
          </p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex-1 p-6">
        <ApiError message={error || "Session not found"} onRetry={fetchSession} />
      </div>
    );
  }

  const template = getTemplateDisplay(session.template_key);
  const completedCount = session.problems?.filter((p) => p.completed).length || 0;
  const totalCount = session.problems?.length || 0;

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/dashboard/sessions"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sessions
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="text-primary">{template.icon}</div>
              <div>
                <h2 className="text-3xl font-bold tracking-tight">
                  {template.name}
                </h2>
                <p className="text-muted-foreground mt-1 font-mono text-sm">
                  <span className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(session.created_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {session.planned_duration_min} min
                    </span>
                  </span>
                </p>
              </div>
            </div>
          </div>
          <div>
            {session.completed ? (
              <span className="flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-green-500/10 text-green-500 border border-green-500/20 font-mono">
                <CheckCircle2 className="h-4 w-4" />
                COMPLETE
              </span>
            ) : (
              <span className="flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-orange-500/10 text-orange-500 border border-orange-500/20 font-mono">
                <PlayCircle className="h-4 w-4" />
                ACTIVE
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress Card */}
      {!session.completed && (
        <Card className="mb-6 border-2 border-primary/20">
          <CardHeader>
            <CardTitle className="text-lg font-mono">Session Progress</CardTitle>
            <CardDescription className="font-mono text-xs">
              {completedCount}/{totalCount} tasks completed
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full bg-secondary rounded-md h-2">
              <div
                className="bg-primary h-2 rounded-md transition-all"
                style={{
                  width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Problems List */}
      <Card>
        <CardHeader>
          <CardTitle className="font-mono">Session Tasks</CardTitle>
          <CardDescription className="font-mono text-xs">
            Execute problems in optimized sequence
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!session.problems || session.problems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-mono text-sm">No tasks configured</p>
            </div>
          ) : (
            <div className="space-y-3">
              {session.problems.map((problem, index) => (
                <div
                  key={problem.id}
                  className={`flex items-center gap-4 p-4 border rounded-lg transition-colors ${
                    problem.completed
                      ? "bg-green-500/5 border-green-500/20"
                      : "hover:bg-accent/50"
                  }`}
                >
                  {/* Problem Number */}
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-md font-bold font-mono text-sm border ${
                      problem.completed
                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                        : "bg-primary/10 text-primary border-primary/20"
                    }`}
                  >
                    {problem.completed ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      index + 1
                    )}
                  </div>

                  {/* Problem Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold truncate font-mono">
                        {problem.title}
                      </h4>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-mono uppercase tracking-wider border ${
                          problem.difficulty === "hard"
                            ? "bg-red-500/10 text-red-500 border-red-500/20"
                            : problem.difficulty === "medium"
                            ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                            : "bg-green-500/10 text-green-500 border-green-500/20"
                        }`}
                      >
                        {problem.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{problem.reason}</p>
                  </div>

                  {/* Problem Metadata */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <div className="text-muted-foreground text-xs font-mono uppercase tracking-wider">
                        Time
                      </div>
                      <div className="font-mono font-semibold">
                        {problem.planned_min}m
                      </div>
                    </div>
                    {problem.days_since_last !== null &&
                      problem.days_since_last !== undefined && (
                        <div className="text-right">
                          <div className="text-muted-foreground text-xs font-mono uppercase tracking-wider">
                            Last
                          </div>
                          <div className="font-mono font-semibold">
                            {problem.days_since_last}d
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Action Button */}
                  <div>
                    {problem.completed ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRecordAttempt(problem.id)}
                        className="font-mono"
                      >
                        RETRY
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleRecordAttempt(problem.id)}
                        className="font-mono"
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        START
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
