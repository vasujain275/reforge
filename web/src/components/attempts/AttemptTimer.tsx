import { useEffect, useRef, useState } from "react";
import { Play, Pause, Timer, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import {
  formatTime,
  getDifficultyTextColor,
  getTimeSinceLastSave,
} from "@/lib/timer";

interface AttemptTimerProps {
  attemptId: number;
  problemTitle: string;
  problemDifficulty?: string;
  initialElapsedSeconds: number;
  initialTimerState: "idle" | "running" | "paused";
  onComplete: (elapsedSeconds: number) => void;
  onAbandon: () => void;
}

export function AttemptTimer({
  attemptId,
  problemTitle,
  problemDifficulty,
  initialElapsedSeconds,
  initialTimerState,
  onComplete,
  onAbandon,
}: AttemptTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialElapsedSeconds);
  const [timerState, setTimerState] = useState<"idle" | "running" | "paused">(
    initialTimerState
  );
  const [lastSavedSeconds, setLastSavedSeconds] = useState(
    initialElapsedSeconds
  );
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [isAbandoning, setIsAbandoning] = useState(false);

  const tickIntervalRef = useRef<number | null>(null);
  const saveIntervalRef = useRef<number | null>(null);
  const pendingSaveRef = useRef(false);

  // Save timer state to backend
  const saveTimerState = async (
    elapsed: number,
    state: "idle" | "running" | "paused"
  ) => {
    // Prevent duplicate saves
    if (pendingSaveRef.current) {
      return;
    }

    try {
      pendingSaveRef.current = true;
      setIsSaving(true);
      await api.put(`/attempts/${attemptId}/timer`, {
        elapsed_time_seconds: elapsed,
        timer_state: state,
      });
      setLastSavedSeconds(elapsed);
      setLastSaveTime(new Date());
    } catch (error) {
      console.error("Failed to save timer state:", error);
    } finally {
      setIsSaving(false);
      pendingSaveRef.current = false;
    }
  };

  // Handle start/pause toggle
  const toggleTimer = async () => {
    const newState = timerState === "running" ? "paused" : "running";
    setTimerState(newState);
    await saveTimerState(elapsedSeconds, newState);
  };

  // Tick effect - increment elapsed time every second when running
  useEffect(() => {
    if (timerState === "running") {
      tickIntervalRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else if (tickIntervalRef.current !== null) {
      window.clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }

    return () => {
      if (tickIntervalRef.current !== null) {
        window.clearInterval(tickIntervalRef.current);
      }
    };
  }, [timerState]);

  // Auto-save effect - save every 10 seconds when running
  useEffect(() => {
    if (timerState === "running") {
      saveIntervalRef.current = window.setInterval(() => {
        saveTimerState(elapsedSeconds, "running");
      }, 10000); // 10 seconds
    } else if (saveIntervalRef.current !== null) {
      window.clearInterval(saveIntervalRef.current);
      saveIntervalRef.current = null;
    }

    return () => {
      if (saveIntervalRef.current !== null) {
        window.clearInterval(saveIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerState, elapsedSeconds]);

  // Sync on unmount - save current state before component unmounts
  useEffect(() => {
    return () => {
      // Only save if there are unsaved changes and not already saving
      if (elapsedSeconds !== lastSavedSeconds && !pendingSaveRef.current) {
        saveTimerState(elapsedSeconds, timerState);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds, lastSavedSeconds, timerState]);

  // Sync on visibility change - save when user switches tabs/windows
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Save when tab becomes hidden OR visible (covers both directions)
      if (elapsedSeconds !== lastSavedSeconds && !pendingSaveRef.current) {
        saveTimerState(elapsedSeconds, timerState);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds, lastSavedSeconds, timerState]);

  // Sync on beforeunload - save when user navigates away or closes page
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (elapsedSeconds !== lastSavedSeconds && !pendingSaveRef.current) {
        // Best-effort save before page unload
        saveTimerState(elapsedSeconds, timerState);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds, lastSavedSeconds, timerState]);

  // Handle abandon with save
  const handleAbandon = async () => {
    setIsAbandoning(true);
    try {
      // Save current state first
      await saveTimerState(elapsedSeconds, "paused");
      onAbandon();
    } catch {
      setIsAbandoning(false);
    }
  };

  // Handle complete with save
  const handleComplete = async () => {
    // Pause timer and save before completing
    setTimerState("paused");
    await saveTimerState(elapsedSeconds, "paused");
    onComplete(elapsedSeconds);
  };

  return (
    <div className="border border-border rounded-md bg-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-primary" />
          <span className="text-sm font-mono uppercase tracking-wide text-muted-foreground">
            {timerState === "running"
              ? "Timer Active"
              : timerState === "paused"
                ? "Timer Paused"
                : "Timer Ready"}
          </span>
        </div>
        {problemDifficulty && (
          <span
            className={`text-xs font-mono uppercase tracking-wider ${getDifficultyTextColor(problemDifficulty)}`}
          >
            {problemDifficulty}
          </span>
        )}
      </div>

      {/* Problem Title */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium text-foreground mb-2 truncate">
          {problemTitle}
        </h3>
      </div>

      {/* Timer Display */}
      <div className="text-center mb-8">
        <div className="text-6xl font-mono font-bold text-foreground mb-2 tabular-nums">
          {formatTime(elapsedSeconds)}
        </div>
        <div className="text-sm text-muted-foreground font-mono uppercase tracking-wide">
          Elapsed
        </div>
      </div>

      {/* Primary Controls */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <Button
          onClick={toggleTimer}
          variant={timerState === "running" ? "outline" : "default"}
          size="lg"
          className="font-mono min-w-[140px]"
        >
          {timerState === "running" ? (
            <>
              <Pause className="h-5 w-5 mr-2" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-5 w-5 mr-2" />
              {timerState === "idle" ? "Start" : "Resume"}
            </>
          )}
        </Button>
      </div>

      {/* Save Status */}
      <div className="text-center mb-6">
        <div className="text-xs font-mono text-muted-foreground">
          {isSaving ? (
            <span className="text-orange-400">Syncing...</span>
          ) : (
            <span>Last saved: {getTimeSinceLastSave(lastSaveTime)}</span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border my-6" />

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-4">
        <Button
          onClick={handleComplete}
          variant="default"
          className="flex-1 font-mono"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Complete Attempt
        </Button>
        <Button
          onClick={handleAbandon}
          variant="outline"
          className="font-mono text-red-500 hover:text-red-400 hover:bg-red-500/10"
          disabled={isAbandoning}
        >
          <XCircle className="h-4 w-4 mr-2" />
          Abandon
        </Button>
      </div>

      {/* System Info */}
      <div className="mt-6 p-3 bg-muted/50 rounded-md">
        <p className="text-xs font-mono text-muted-foreground text-center">
          Timer syncs every 10 seconds. You can close this page and resume
          later.
        </p>
      </div>
    </div>
  );
}
