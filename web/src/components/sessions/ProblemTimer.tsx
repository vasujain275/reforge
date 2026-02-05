import { useEffect } from "react";
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
import { useAttemptTimerStore } from "@/store/attemptTimerStore";
import {
  formatTime,
  formatElapsedTime,
  getDifficultyColor,
  getTimeSinceLastSave,
} from "@/lib/timer";

// Resume Dialog Component - extracted outside to avoid re-creating during render
interface ResumeDialogProps {
  showResumeDialog: boolean;
  problemTitle: string;
  existingAttemptElapsedTime: number;
  onResume: () => void;
  onStartFresh: () => void;
}

function ResumeDialog({
  showResumeDialog,
  problemTitle,
  existingAttemptElapsedTime,
  onResume,
  onStartFresh,
}: ResumeDialogProps) {
  return (
    <Dialog open={showResumeDialog} onOpenChange={() => {}}>
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
              {formatElapsedTime(existingAttemptElapsedTime)}
            </span>{" "}
            elapsed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button onClick={onResume} className="flex-1 font-mono">
            <Play className="h-4 w-4 mr-2" />
            Resume
          </Button>
          <Button
            onClick={onStartFresh}
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
}

interface ProblemTimerProps {
  problemId: string;
  problemTitle: string;
  problemDifficulty?: string;
  sessionId: string;
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
  // Get state and actions from Zustand store
  const {
    phase,
    elapsedSeconds,
    isSaving,
    lastSaveTime,
    error,
    showResumeDialog,
    existingAttempt,
    isSubmitting,
    formData,
    initialize,
    resumeAttempt,
    startFresh,
    toggleTimer,
    handleCompleteClick,
    handleBackToTimer,
    handleAbandon,
    submitCompletion,
    setFormData,
    cleanup,
  } = useAttemptTimerStore();

  // Initialize on mount
  useEffect(() => {
    initialize(problemId, sessionId);

    return () => {
      cleanup();
    };
  }, [problemId, sessionId, initialize, cleanup]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await submitCompletion();
    if (success) {
      onComplete();
    }
  };

  // Handle abandon with callback
  const handleAbandonClick = async () => {
    await handleAbandon();
    onCancel();
  };

  // Handle start fresh
  const handleStartFresh = async () => {
    await startFresh(problemId, sessionId);
  };

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
        <ResumeDialog
          showResumeDialog={showResumeDialog}
          problemTitle={problemTitle}
          existingAttemptElapsedTime={existingAttempt?.elapsed_time_seconds || 0}
          onResume={resumeAttempt}
          onStartFresh={handleStartFresh}
        />
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
                onClick={() => setFormData({ outcome: "passed" })}
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
                onClick={() => setFormData({ outcome: "failed" })}
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
                setFormData({ confidence_score: value[0] })
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
              onChange={(e) => setFormData({ notes: e.target.value })}
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
            <span>Last saved: {getTimeSinceLastSave(lastSaveTime)}</span>
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
          onClick={handleAbandonClick}
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
