import { useEffect, useRef, useState } from "react";
import { Play, Pause, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

interface SessionTimerProps {
  sessionId: number;
  plannedDurationMin: number;
  initialElapsedSeconds: number;
  initialTimerState: "idle" | "running" | "paused";
  isCompleted: boolean;
}

export function SessionTimer({
  sessionId,
  plannedDurationMin,
  initialElapsedSeconds,
  initialTimerState,
  isCompleted,
}: SessionTimerProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialElapsedSeconds);
  const [timerState, setTimerState] = useState<"idle" | "running" | "paused">(
    initialTimerState
  );
  const [lastSavedSeconds, setLastSavedSeconds] = useState(
    initialElapsedSeconds
  );
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);

  const tickIntervalRef = useRef<number | null>(null);
  const saveIntervalRef = useRef<number | null>(null);
  const pendingSaveRef = useRef(false);

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
      await api.put(`/sessions/${sessionId}/timer`, {
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
    if (timerState === "running" && remainingSeconds > 0) {
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
  }, [timerState, remainingSeconds]);

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
  }, [timerState, elapsedSeconds]);

  // Sync on unmount - save current state before component unmounts
  useEffect(() => {
    return () => {
      // Only save if there are unsaved changes and not already saving
      if (elapsedSeconds !== lastSavedSeconds && !pendingSaveRef.current) {
        saveTimerState(elapsedSeconds, timerState);
      }
    };
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
  }, [elapsedSeconds, lastSavedSeconds, timerState]);

  // Auto-pause when time expires
  useEffect(() => {
    if (remainingSeconds === 0 && timerState === "running") {
      setTimerState("paused");
      saveTimerState(elapsedSeconds, "paused");
    }
  }, [remainingSeconds, timerState]);

  // Don't render if session is completed
  if (isCompleted) {
    return null;
  }

  // Calculate time since last save (for display)
  const getTimeSinceLastSave = (): string => {
    if (!lastSaveTime) return "Never";
    const seconds = Math.floor((Date.now() - lastSaveTime.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

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
          onClick={toggleTimer}
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
            <span>Last saved: {getTimeSinceLastSave()}</span>
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
