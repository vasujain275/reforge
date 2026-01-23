import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  Timer,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import type { InProgressAttempt } from "@/types";

type TimerPhase = "loading" | "prompt" | "running" | "paused" | "completing";

interface ProblemTimerProps {
  problemId: number;
  problemTitle: string;
  problemDifficulty?: string;
  sessionId: number;
  onComplete: () => void;
  onCancel: () => void;
}

export function ProblemTimer({
  problemId,
  problemTitle,
  problemDifficulty,
  sessionId,
  onComplete,
  onCancel,
}: ProblemTimerProps) {
  const [phase, setPhase] = useState<TimerPhase>("loading");
  const [attempt, setAttempt] = useState<InProgressAttempt | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [lastSavedSeconds, setLastSavedSeconds] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Resume dialog state
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [existingAttempt, setExistingAttempt] =
    useState<InProgressAttempt | null>(null);

  // Completion form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    confidence_score: 50,
    outcome: "passed" as "passed" | "failed",
    notes: "",
    duration_minutes: 0,
    duration_seconds: 0,
  });

  const tickIntervalRef = useRef<number | null>(null);
  const saveIntervalRef = useRef<number | null>(null);
  const pendingSaveRef = useRef(false);

  // Format time as MM:SS or HH:MM:SS
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Get difficulty badge color
  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case "easy":
        return "text-green-500 border-green-500/20 bg-green-500/10";
      case "medium":
        return "text-orange-400 border-orange-400/20 bg-orange-400/10";
      case "hard":
        return "text-red-500 border-red-500/20 bg-red-500/10";
      default:
        return "text-muted-foreground border-border bg-muted/50";
    }
  };

  // Initialize: check for existing in-progress attempt
  useEffect(() => {
    const initialize = async () => {
      setPhase("loading");
      setError(null);

      try {
        // Check for existing in-progress attempt
        const response = await api.get(
          `/attempts/in-progress?problem_id=${problemId}`
        );
        const existing = response.data.data;

        if (existing) {
          setExistingAttempt(existing);
          setShowResumeDialog(true);
          setPhase("prompt");
        } else {
          await startNewAttempt();
        }
      } catch (err) {
        console.error("Failed to initialize:", err);
        setError("Failed to check for existing attempt");
        setPhase("loading");
      }
    };

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problemId]);

  // Start a new attempt
  const startNewAttempt = async () => {
    try {
      const response = await api.post("/attempts/start", {
        problem_id: problemId,
        session_id: sessionId,
      });
      const newAttempt = response.data.data;
      setAttempt(newAttempt);
      setElapsedSeconds(newAttempt.elapsed_time_seconds || 0);
      setLastSavedSeconds(newAttempt.elapsed_time_seconds || 0);
      setPhase("running");
    } catch (err) {
      console.error("Failed to start attempt:", err);
      setError("Failed to start attempt");
    }
  };

  // Resume existing attempt
  const resumeAttempt = () => {
    if (existingAttempt) {
      setAttempt(existingAttempt);
      setElapsedSeconds(existingAttempt.elapsed_time_seconds || 0);
      setLastSavedSeconds(existingAttempt.elapsed_time_seconds || 0);
      setShowResumeDialog(false);
      setPhase(
        existingAttempt.timer_state === "running" ? "running" : "paused"
      );
    }
  };

  // Start fresh (abandon existing and create new)
  const startFresh = async () => {
    if (existingAttempt) {
      try {
        await api.delete(`/attempts/${existingAttempt.id}`);
        setShowResumeDialog(false);
        await startNewAttempt();
      } catch (err) {
        console.error("Failed to abandon existing attempt:", err);
        setError("Failed to start fresh attempt");
      }
    }
  };

  // Save timer state to backend
  const saveTimerState = async (
    elapsed: number,
    state: "idle" | "running" | "paused"
  ) => {
    if (!attempt || pendingSaveRef.current) return;

    try {
      pendingSaveRef.current = true;
      setIsSaving(true);
      await api.put(`/attempts/${attempt.id}/timer`, {
        elapsed_time_seconds: elapsed,
        timer_state: state,
      });
      setLastSavedSeconds(elapsed);
      setLastSaveTime(new Date());
    } catch (err) {
      console.error("Failed to save timer state:", err);
    } finally {
      setIsSaving(false);
      pendingSaveRef.current = false;
    }
  };

  // Toggle timer (start/pause)
  const toggleTimer = async () => {
    const newPhase = phase === "running" ? "paused" : "running";
    setPhase(newPhase);
    await saveTimerState(
      elapsedSeconds,
      newPhase === "running" ? "running" : "paused"
    );
  };

  // Tick effect - increment elapsed time every second when running
  useEffect(() => {
    if (phase === "running") {
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
  }, [phase]);

  // Auto-save effect - save every 10 seconds when running
  useEffect(() => {
    if (phase === "running") {
      saveIntervalRef.current = window.setInterval(() => {
        saveTimerState(elapsedSeconds, "running");
      }, 10000);
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
  }, [phase, elapsedSeconds, attempt]);

  // Sync on visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        attempt &&
        elapsedSeconds !== lastSavedSeconds &&
        !pendingSaveRef.current
      ) {
        saveTimerState(
          elapsedSeconds,
          phase === "running" ? "running" : "paused"
        );
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds, lastSavedSeconds, phase, attempt]);

  // Sync on beforeunload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (
        attempt &&
        elapsedSeconds !== lastSavedSeconds &&
        !pendingSaveRef.current
      ) {
        saveTimerState(
          elapsedSeconds,
          phase === "running" ? "running" : "paused"
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds, lastSavedSeconds, phase, attempt]);

  // Handle complete click - transition to completing phase
  const handleCompleteClick = async () => {
    setPhase("paused");
    await saveTimerState(elapsedSeconds, "paused");

    // Initialize form with elapsed time
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    setFormData((prev) => ({
      ...prev,
      duration_minutes: minutes,
      duration_seconds: seconds,
    }));
    setPhase("completing");
  };

  // Handle back to timer from completing phase
  const handleBackToTimer = () => {
    setPhase("paused");
  };

  // Handle abandon
  const handleAbandon = async () => {
    if (!attempt) return;

    try {
      await api.delete(`/attempts/${attempt.id}`);
      onCancel();
    } catch (err) {
      console.error("Failed to abandon attempt:", err);
      setError("Failed to abandon attempt");
    }
  };

  // Submit completed attempt
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attempt) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const totalDurationSeconds =
        formData.duration_minutes * 60 + formData.duration_seconds;

      await api.put(`/attempts/${attempt.id}/complete`, {
        confidence_score: formData.confidence_score,
        outcome: formData.outcome,
        notes: formData.notes || undefined,
        duration_seconds: totalDurationSeconds,
      });

      onComplete();
    } catch (err) {
      console.error("Failed to complete attempt:", err);
      setError("Failed to complete attempt");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate time since last save
  const getTimeSinceLastSave = (): string => {
    if (!lastSaveTime) return "Never";
    const seconds = Math.floor((Date.now() - lastSaveTime.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  // Format elapsed time for display
  const formatElapsedTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Resume Dialog
  const ResumeDialog = () => (
    <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono">
            <Timer className="h-5 w-5 text-primary" />
            Existing Attempt Found
          </DialogTitle>
          <DialogDescription className="pt-2">
            You have an in-progress attempt for{" "}
            <span className="font-medium text-foreground">
              "{problemTitle}"
            </span>{" "}
            with{" "}
            <span className="font-mono text-primary">
              {formatElapsedTime(existingAttempt?.elapsed_time_seconds || 0)}
            </span>{" "}
            elapsed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button onClick={resumeAttempt} className="flex-1 font-mono">
            <Play className="h-4 w-4 mr-2" />
            Resume
          </Button>
          <Button
            onClick={startFresh}
            variant="outline"
            className="flex-1 font-mono"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Start Fresh
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // Loading state
  if (phase === "loading") {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="mt-4 border border-border rounded-md p-4 bg-card"
      >
        <div className="flex items-center justify-center py-4">
          <Timer className="h-5 w-5 text-primary animate-pulse mr-2" />
          <span className="text-sm font-mono text-muted-foreground">
            Initializing timer...
          </span>
        </div>
      </motion.div>
    );
  }

  // Prompt phase (resume dialog showing)
  if (phase === "prompt") {
    return (
      <>
        <ResumeDialog />
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 border border-border rounded-md p-4 bg-card"
        >
          <div className="flex items-center justify-center py-4">
            <Timer className="h-5 w-5 text-primary animate-pulse mr-2" />
            <span className="text-sm font-mono text-muted-foreground">
              Checking for existing attempt...
            </span>
          </div>
        </motion.div>
      </>
    );
  }

  // Completing phase - show form
  if (phase === "completing") {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        exit={{ opacity: 0, height: 0 }}
        className="mt-4 border border-primary/30 rounded-md p-4 bg-card"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handleBackToTimer}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Timer
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
              Complete Attempt
            </span>
            {problemDifficulty && (
              <span
                className={`text-xs px-2 py-0.5 rounded-md font-mono uppercase tracking-wider border ${getDifficultyColor(problemDifficulty)}`}
              >
                {problemDifficulty}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm font-mono">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Outcome Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Outcome</Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, outcome: "passed" })}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md
                  border transition-all duration-300
                  ${
                    formData.outcome === "passed"
                      ? "border-green-500 bg-green-500/10 text-green-500"
                      : "border-border bg-background hover:bg-secondary/50"
                  }
                `}
              >
                <CheckCircle2 className="h-4 w-4" />
                <span className="font-mono text-sm uppercase tracking-wider">
                  Passed
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, outcome: "failed" })}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md
                  border transition-all duration-300
                  ${
                    formData.outcome === "failed"
                      ? "border-red-500 bg-red-500/10 text-red-500"
                      : "border-border bg-background hover:bg-secondary/50"
                  }
                `}
              >
                <XCircle className="h-4 w-4" />
                <span className="font-mono text-sm uppercase tracking-wider">
                  Failed
                </span>
              </button>
            </div>
          </div>

          {/* Duration (Editable) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Duration</Label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={999}
                  value={formData.duration_minutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration_minutes: Math.max(
                        0,
                        parseInt(e.target.value) || 0
                      ),
                    })
                  }
                  className="w-16 font-mono text-center"
                />
                <span className="text-xs text-muted-foreground font-mono">
                  min
                </span>
              </div>
              <span className="text-muted-foreground">:</span>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={formData.duration_seconds}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration_seconds: Math.min(
                        59,
                        Math.max(0, parseInt(e.target.value) || 0)
                      ),
                    })
                  }
                  className="w-16 font-mono text-center"
                />
                <span className="text-xs text-muted-foreground font-mono">
                  sec
                </span>
              </div>
            </div>
          </div>

          {/* Confidence Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="text-sm font-medium">Confidence</Label>
              <span className="font-mono text-sm text-primary">
                {formData.confidence_score}%
              </span>
            </div>
            <Slider
              value={[formData.confidence_score]}
              onValueChange={(value) =>
                setFormData({ ...formData, confidence_score: value[0] })
              }
              min={0}
              max={100}
              step={5}
              className="w-full"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Notes{" "}
              <span className="text-muted-foreground font-normal">
                (optional)
              </span>
            </Label>
            <Textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              placeholder="Key insights, mistakes made, patterns observed..."
              className="resize-none h-16 font-mono text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 font-mono uppercase tracking-wider"
            >
              {isSubmitting ? "Submitting..." : "Complete Attempt"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 font-mono uppercase tracking-wider"
            >
              Cancel
            </Button>
          </div>
        </form>
      </motion.div>
    );
  }

  // Running/Paused phase - show timer
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="mt-4 border border-primary/30 rounded-md p-4 bg-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-primary" />
          <span className="text-xs font-mono uppercase tracking-wide text-muted-foreground">
            {phase === "running" ? "Timer Active" : "Timer Paused"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {problemDifficulty && (
            <span
              className={`text-xs px-2 py-0.5 rounded-md font-mono uppercase tracking-wider border ${getDifficultyColor(problemDifficulty)}`}
            >
              {problemDifficulty}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 rounded-md text-red-500 text-sm font-mono">
          {error}
        </div>
      )}

      {/* Timer Display */}
      <div className="text-center mb-4">
        <div className="text-4xl font-mono font-bold text-foreground tabular-nums">
          {formatTime(elapsedSeconds)}
        </div>
        <div className="text-xs text-muted-foreground font-mono uppercase tracking-wide mt-1">
          {isSaving ? (
            <span className="text-orange-400">Syncing...</span>
          ) : (
            <span>Last saved: {getTimeSinceLastSave()}</span>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <Button
          onClick={toggleTimer}
          variant={phase === "running" ? "outline" : "default"}
          size="sm"
          className="flex-1 font-mono"
        >
          {phase === "running" ? (
            <>
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Resume
            </>
          )}
        </Button>
        <Button
          onClick={handleCompleteClick}
          size="sm"
          className="flex-1 font-mono"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Complete
        </Button>
        <Button
          onClick={handleAbandon}
          variant="ghost"
          size="sm"
          className="text-red-500 hover:text-red-400 hover:bg-red-500/10 font-mono"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      </div>

      {/* Info */}
      <div className="mt-3 text-center">
        <p className="text-xs font-mono text-muted-foreground">
          Timer syncs every 10s. You can close this and resume later.
        </p>
      </div>
    </motion.div>
  );
}
