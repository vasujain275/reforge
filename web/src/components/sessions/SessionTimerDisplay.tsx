import { useEffect } from "react";
import { Play, Pause, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSessionTimerStore } from "@/store/sessionTimerStore";

interface SessionTimerDisplayProps {
  sessionId: number;
  plannedDurationMin: number;
  initialElapsedSeconds: number;
  initialTimerState: "idle" | "running" | "paused";
  isCompleted: boolean;
}

export function SessionTimerDisplay({
  sessionId,
  plannedDurationMin,
  initialElapsedSeconds,
  initialTimerState,
  isCompleted,
}: SessionTimerDisplayProps) {
  const {
    elapsedSeconds,
    timerState,
    isSaving,
    initialize,
    toggle,
    save,
  } = useSessionTimerStore();

  const totalSeconds = plannedDurationMin * 60;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Calculate progress percentage
  const progressPercent = Math.min(100, (elapsedSeconds / totalSeconds) * 100);

  // Initialize the store when component mounts
  useEffect(() => {
    initialize(sessionId, initialElapsedSeconds, initialTimerState, plannedDurationMin);

    // Cleanup on unmount
    return () => {
      // Save before cleanup
      save();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Sync on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        save();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [save]);

  // Sync on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      save();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [save]);

  // Don't render if session is completed
  if (isCompleted) {
    return null;
  }

  return (
    <div className="border border-border rounded-md bg-card p-6 mb-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Timer className="h-5 w-5 text-primary" />
        <span className="text-sm font-mono uppercase tracking-wide text-muted-foreground">
          {timerState === "running"
            ? "Session Timer Active"
            : timerState === "paused"
              ? "Timer Paused"
              : "Timer Idle"}
        </span>
      </div>

      {/* Timer Display */}
      <div className="text-center mb-6">
        <div className="text-5xl font-mono font-bold text-foreground mb-2">
          {formatTime(remainingSeconds)}
        </div>
        <div className="text-sm text-muted-foreground font-mono">
          {remainingSeconds === 0 ? "Time Expired" : "Remaining"}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs font-mono text-muted-foreground">
          <span>{formatTime(elapsedSeconds)} elapsed</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <Button
          onClick={toggle}
          disabled={remainingSeconds === 0}
          variant={timerState === "running" ? "outline" : "default"}
          className="font-mono"
        >
          {timerState === "running" ? (
            <>
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              {timerState === "idle" ? "Start" : "Resume"}
            </>
          )}
        </Button>

        <div className="text-xs font-mono text-muted-foreground">
          {isSaving ? (
            <span className="text-orange-400">Saving...</span>
          ) : (
            <span>Auto-saves every 10s</span>
          )}
        </div>
      </div>

      {/* Time Expired Warning */}
      {remainingSeconds === 0 && (
        <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-md text-center">
          <span className="text-sm font-mono text-orange-400 uppercase tracking-wide">
            Planned time exceeded
          </span>
        </div>
      )}
    </div>
  );
}
