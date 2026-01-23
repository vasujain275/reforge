import { CheckCircle2, Clock, Target, TrendingUp, XCircle } from "lucide-react";
import { useSessionTimerStore } from "@/store/sessionTimerStore";
import type { SessionProblem } from "@/types";

interface SessionStatsProps {
  problems: SessionProblem[];
}

export function SessionStats({ problems }: SessionStatsProps) {
  // Get live timer state from store
  const { elapsedSeconds, timerState } = useSessionTimerStore();

  // Calculate stats
  const totalCount = problems.length;
  const completedProblems = problems.filter((p) => p.completed);
  const completedCount = completedProblems.length;
  const passedCount = completedProblems.filter(
    (p) => p.outcome === "passed"
  ).length;
  const failedCount = completedProblems.filter(
    (p) => p.outcome === "failed"
  ).length;

  // Calculate average confidence from completed problems
  const avgConfidence =
    completedCount > 0
      ? Math.round(
          completedProblems.reduce((sum, p) => sum + p.confidence, 0) /
            completedCount
        )
      : 0;

  // Calculate progress percentage
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Format elapsed time
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${mins.toString().padStart(2, "0")}m`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get timer state color
  const getTimerStateColor = () => {
    switch (timerState) {
      case "running":
        return "text-green-500";
      case "paused":
        return "text-orange-400";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="border border-border rounded-md bg-card p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
          Session Stats
        </span>
        <div className="flex items-center gap-1">
          <Clock className={`h-3.5 w-3.5 ${getTimerStateColor()}`} />
          <span className={`text-sm font-mono ${getTimerStateColor()}`}>
            {formatTime(elapsedSeconds)}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-secondary/50 rounded-md h-2 overflow-hidden mb-4">
        <div
          className="bg-gradient-to-r from-primary to-primary/80 h-2 rounded-md transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {/* Progress */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Target className="h-4 w-4 text-primary" />
          </div>
          <div className="text-lg font-bold font-mono text-foreground">
            {completedCount}/{totalCount}
          </div>
          <div className="text-xs text-muted-foreground font-mono uppercase tracking-wide">
            Progress
          </div>
        </div>

        {/* Passed */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </div>
          <div className="text-lg font-bold font-mono text-green-500">
            {passedCount}
          </div>
          <div className="text-xs text-muted-foreground font-mono uppercase tracking-wide">
            Passed
          </div>
        </div>

        {/* Failed */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <XCircle className="h-4 w-4 text-red-500" />
          </div>
          <div className="text-lg font-bold font-mono text-red-500">
            {failedCount}
          </div>
          <div className="text-xs text-muted-foreground font-mono uppercase tracking-wide">
            Failed
          </div>
        </div>

        {/* Avg Confidence */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <div className="text-lg font-bold font-mono text-foreground">
            {avgConfidence}%
          </div>
          <div className="text-xs text-muted-foreground font-mono uppercase tracking-wide">
            Confidence
          </div>
        </div>
      </div>
    </div>
  );
}
