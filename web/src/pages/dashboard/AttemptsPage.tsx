import ApiError from "@/components/ApiError";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useProblemAttempts } from "@/hooks/queries";
import { Check, Terminal, X, Clock, Calendar, Activity, Gauge, Loader2 } from "lucide-react";
import { useSearchParams, Link } from "react-router-dom";

export default function AttemptsPage() {
  const [searchParams] = useSearchParams();
  const problemId = searchParams.get("problem_id");

  // Use TanStack Query for data fetching
  const { data, isLoading, error, refetch } = useProblemAttempts({ problemId });

  const problem = data?.problem;
  const attempts = data?.attempts || [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "---";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  // Handle missing problem ID
  if (!problemId) {
    return <ApiError message="No problem ID provided" onRetry={() => window.location.reload()} />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm font-mono text-muted-foreground">
            Loading attempts...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return <ApiError message="Failed to load attempts. Please ensure the backend is running." onRetry={() => refetch()} />;
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header - HUD Style */}
      <div className="flex items-start justify-between border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Activity className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight font-mono uppercase">
              Attempt History
            </h2>
          </div>
          {problem && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Terminal className="h-3 w-3" />
              <span className="font-mono">Target:</span>
              <span className="font-mono text-foreground">{problem.title}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Link to={`/dashboard/attempts/new?problem_id=${problemId}`}>
            <Button className="font-mono">+ Record Attempt</Button>
          </Link>
          <Link to="/dashboard/problems">
            <Button variant="outline" className="font-mono">← Back</Button>
          </Link>
        </div>
      </div>

      {/* System Metrics - HUD Style Grid */}
      {problem?.stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border border-border hover:shadow-[0_0_15px_-3px_var(--primary)] transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                    System Status
                  </div>
                  <div className="text-2xl font-bold font-mono uppercase tracking-wider">
                    {problem.stats.status}
                  </div>
                </div>
                <div className={`h-2 w-2 rounded-full ${
                  problem.stats.status === "solved" 
                    ? "bg-green-500 shadow-[0_0_8px_var(--tw-shadow-color)] shadow-green-500" 
                    : problem.stats.status === "abandoned"
                    ? "bg-red-500 shadow-[0_0_8px_var(--tw-shadow-color)] shadow-red-500"
                    : "bg-orange-400 shadow-[0_0_8px_var(--tw-shadow-color)] shadow-orange-400"
                }`} />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border hover:shadow-[0_0_15px_-3px_var(--primary)] transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                    Confidence Level
                  </div>
                  <div className="text-2xl font-bold font-mono">
                    {problem.stats.confidence}
                    <span className="text-base text-muted-foreground">%</span>
                  </div>
                </div>
                <Gauge className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border hover:shadow-[0_0_15px_-3px_var(--primary)] transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                    Total Attempts
                  </div>
                  <div className="text-2xl font-bold font-mono">
                    {String(problem.stats.total_attempts).padStart(3, '0')}
                  </div>
                </div>
                <Activity className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border hover:shadow-[0_0_15px_-3px_var(--primary)] transition-shadow">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-mono">
                    Avg Duration
                  </div>
                  <div className="text-2xl font-bold font-mono">
                    {problem.stats.avg_time_seconds
                      ? formatDuration(problem.stats.avg_time_seconds)
                      : "---"}
                  </div>
                </div>
                <Clock className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Attempts Timeline */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Terminal className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
            Execution History
          </h3>
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs font-mono text-muted-foreground">
            {attempts.length} {attempts.length === 1 ? 'record' : 'records'}
          </span>
        </div>

        {attempts.length === 0 ? (
          <Card className="border border-dashed">
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <div className="mx-auto h-12 w-12 rounded-md border border-border flex items-center justify-center">
                  <Terminal className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                    No Execution Records
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    Initialize first attempt to begin tracking
                  </p>
                </div>
                <Link
                  to={`/dashboard/attempts/new?problem_id=${problemId}`}
                  className="inline-block"
                >
                  <Button className="font-mono">+ Initialize Attempt</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {attempts.map((attempt, index) => (
              <Card
                key={attempt.id}
                className="border border-border hover:border-primary/50 hover:shadow-[0_0_15px_-3px_var(--primary)] transition-all"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Left: Index & Status Indicator */}
                    <div className="flex flex-col items-center gap-2 pt-1">
                      <div className="text-xs font-mono text-muted-foreground">
                        #{String(attempts.length - index).padStart(3, '0')}
                      </div>
                      <div className={`h-8 w-8 rounded-md border flex items-center justify-center ${
                        attempt.outcome === "passed"
                          ? "bg-green-500/10 border-green-500/20 text-green-500"
                          : "bg-red-500/10 border-red-500/20 text-red-500"
                      }`}>
                        {attempt.outcome === "passed" ? (
                          <Check className="h-5 w-5" />
                        ) : (
                          <X className="h-5 w-5" />
                        )}
                      </div>
                    </div>

                    {/* Center: Details */}
                    <div className="flex-1 space-y-3">
                      {/* Top Row - Outcome & Confidence */}
                      <div className="flex items-center gap-3">
                        <div className={`px-2 py-0.5 rounded-md border font-mono text-xs uppercase tracking-wider ${
                          attempt.outcome === "passed"
                            ? "bg-green-500/10 border-green-500/20 text-green-500"
                            : "bg-red-500/10 border-red-500/20 text-red-500"
                        }`}>
                          {attempt.outcome}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                          <Gauge className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono text-muted-foreground">Confidence:</span>
                          <span className="font-mono font-semibold">{attempt.confidence_score}%</span>
                        </div>
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <div className="space-y-0">
                            <div className="font-mono text-muted-foreground">
                              {formatDate(attempt.performed_at)}
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground">
                              {getRelativeTime(attempt.performed_at)}
                            </div>
                          </div>
                        </div>

                        {attempt.duration_seconds && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <div className="space-y-0">
                              <div className="font-mono">
                                {formatDuration(attempt.duration_seconds)}
                              </div>
                              <div className="font-mono text-[10px] text-muted-foreground">
                                execution time
                              </div>
                            </div>
                          </div>
                        )}

                        {attempt.session_id && (
                          <div className="flex items-center gap-2">
                            <Terminal className="h-3 w-3 text-muted-foreground" />
                            <Link
                              to={`/dashboard/sessions/${attempt.session_id}`}
                              className="font-mono text-primary hover:text-primary/80 transition-colors text-xs"
                            >
                              SESSION_{String(attempt.session_id).padStart(4, '0')}
                            </Link>
                          </div>
                        )}
                      </div>

                      {/* Notes Section */}
                      {attempt.notes && (
                        <div className="pt-2 border-t border-border">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-mono">
                            Execution Notes
                          </div>
                          <p className="text-xs text-foreground font-mono leading-relaxed">
                            {attempt.notes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
