import ApiError from "@/components/ApiError";
import { AttemptTimer } from "@/components/attempts/AttemptTimer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { InProgressAttempt, Problem } from "@/types";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  RefreshCw,
  Terminal,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

type PagePhase = "loading" | "prompt" | "timer" | "complete";

export default function RecordAttemptPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const problemId = searchParams.get("problem_id");
  const sessionId = searchParams.get("session_id");

  // Page state machine
  const [phase, setPhase] = useState<PagePhase>("loading");
  const [problem, setProblem] = useState<Problem | null>(null);
  const [attempt, setAttempt] = useState<InProgressAttempt | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Completion form state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    confidence_score: 50,
    outcome: "passed" as "passed" | "failed",
    notes: "",
    duration_minutes: 0,
    duration_seconds: 0,
  });

  // Resume dialog state
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [existingAttempt, setExistingAttempt] =
    useState<InProgressAttempt | null>(null);

  // Format elapsed time for display
  const formatElapsedTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${mins}m ${secs}s`;
    }
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  };

  // Initial load: fetch problem and check for existing in-progress attempt
  useEffect(() => {
    if (!problemId) {
      setError("Problem ID is required");
      setPhase("loading");
      return;
    }

    const initialize = async () => {
      setPhase("loading");
      setError(null);

      try {
        // Fetch problem details
        const problemResponse = await api.get(`/problems/${problemId}`);
        setProblem(problemResponse.data.data);

        // Check for existing in-progress attempt
        const attemptResponse = await api.get(
          `/attempts/in-progress?problem_id=${problemId}`
        );
        const existingAttemptData = attemptResponse.data.data;

        if (existingAttemptData) {
          // Show resume dialog
          setExistingAttempt(existingAttemptData);
          setShowResumeDialog(true);
          setPhase("prompt");
        } else {
          // No existing attempt, start timer phase
          await startNewAttempt();
        }
      } catch (err: unknown) {
        console.error("Failed to initialize:", err);
        setError("Failed to load problem details");
        setPhase("loading");
      }
    };

    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- startNewAttempt is a stable callback, only re-run when problemId changes
  }, [problemId]);

  // Start a new attempt
  const startNewAttempt = async () => {
    try {
      const response = await api.post("/attempts/start", {
        problem_id: parseInt(problemId!),
        session_id: sessionId ? parseInt(sessionId) : undefined,
      });
      setAttempt(response.data.data);
      setPhase("timer");
    } catch (err: unknown) {
      console.error("Failed to start attempt:", err);
      setError("Failed to start attempt");
    }
  };

  // Resume existing attempt
  const resumeAttempt = () => {
    if (existingAttempt) {
      setAttempt(existingAttempt);
      setShowResumeDialog(false);
      setPhase("timer");
    }
  };

  // Start fresh (abandon existing and create new)
  const startFresh = async () => {
    if (existingAttempt) {
      try {
        // Abandon the existing attempt
        await api.delete(`/attempts/${existingAttempt.id}`);
        setShowResumeDialog(false);
        // Start new attempt
        await startNewAttempt();
      } catch (err: unknown) {
        console.error("Failed to abandon existing attempt:", err);
        setError("Failed to start fresh attempt");
      }
    }
  };

  // Handle timer complete (transition to completion form)
  const handleTimerComplete = (finalElapsedSeconds: number) => {
    // Initialize duration form fields from elapsed time
    const totalSeconds = finalElapsedSeconds;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    setFormData((prev) => ({
      ...prev,
      duration_minutes: minutes,
      duration_seconds: seconds,
    }));
    setPhase("complete");
  };

  // Handle timer abandon
  const handleTimerAbandon = async () => {
    if (!attempt) return;

    try {
      await api.delete(`/attempts/${attempt.id}`);
      navigateBack();
    } catch (err: unknown) {
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
      // Calculate total duration in seconds from user-editable fields
      const totalDurationSeconds =
        formData.duration_minutes * 60 + formData.duration_seconds;

      await api.put(`/attempts/${attempt.id}/complete`, {
        confidence_score: formData.confidence_score,
        outcome: formData.outcome,
        notes: formData.notes || undefined,
        duration_seconds: totalDurationSeconds,
      });

      navigateBack();
    } catch (err: unknown) {
      console.error("Failed to complete attempt:", err);
      setError("Failed to complete attempt. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Navigate back based on context
  const navigateBack = () => {
    if (sessionId) {
      navigate(`/dashboard/sessions/${sessionId}`);
    } else {
      navigate("/dashboard/problems");
    }
  };

  // Loading state
  if (phase === "loading" && !error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Terminal className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-sm font-mono text-muted-foreground">
            Initializing attempt...
          </p>
        </div>
      </div>
    );
  }

  // Error state (no problem loaded)
  if (error && !problem) {
    return (
      <div className="flex-1 p-6">
        <ApiError
          message={error}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  // Resume dialog (shown as modal over timer phase content)
  const ResumeDialog = () => (
    <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono">
            <Clock className="h-5 w-5 text-primary" />
            Existing Attempt Found
          </DialogTitle>
          <DialogDescription className="pt-2">
            You have an in-progress attempt for{" "}
            <span className="font-medium text-foreground">
              "{problem?.title}"
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
            Resume Attempt
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

  // Timer phase
  if (phase === "timer" || phase === "prompt") {
    return (
      <div className="flex-1 p-6">
        <ResumeDialog />

        {/* Header */}
        <div className="mb-6">
          <Link
            to={
              sessionId
                ? `/dashboard/sessions/${sessionId}`
                : "/dashboard/problems"
            }
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            {sessionId ? "Back to Session" : "Back to Problems"}
          </Link>
          <h2 className="text-3xl font-bold tracking-tight">Attempt Timer</h2>
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            Target: <span className="text-foreground">{problem?.title}</span>
          </p>
        </div>

        {error && <ApiError variant="inline" message={error} />}

        {/* Timer Component */}
        <div className="max-w-2xl mt-6">
          {attempt && (
            <AttemptTimer
              attemptId={attempt.id}
              problemTitle={problem?.title || ""}
              problemDifficulty={problem?.difficulty}
              initialElapsedSeconds={attempt.elapsed_time_seconds}
              initialTimerState={attempt.timer_state}
              onComplete={handleTimerComplete}
              onAbandon={handleTimerAbandon}
            />
          )}
        </div>
      </div>
    );
  }

  // Completion phase
  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => setPhase("timer")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Timer
        </button>
        <h2 className="text-3xl font-bold tracking-tight">Complete Attempt</h2>
        <p className="text-muted-foreground mt-1 font-mono text-sm">
          Target: <span className="text-foreground">{problem?.title}</span>
        </p>
        {attempt && (
          <p className="text-muted-foreground mt-1 font-mono text-sm">
            Timer recorded:{" "}
            <span className="text-primary">
              {formatElapsedTime(attempt.elapsed_time_seconds)}
            </span>
            <span className="text-muted-foreground/60 ml-2">
              (editable below)
            </span>
          </p>
        )}
      </div>

      {error && <ApiError variant="inline" message={error} />}

      {/* Completion Form */}
      <div className="max-w-2xl mt-6">
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <CardTitle>Attempt Details</CardTitle>
            </div>
            <CardDescription>
              Record your performance and notes for future reference
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Outcome */}
              <div className="space-y-2">
                <Label>
                  Outcome <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.outcome}
                  onValueChange={(value: "passed" | "failed") =>
                    setFormData({ ...formData, outcome: value })
                  }
                >
                  <SelectTrigger className="font-mono">
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passed">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Passed
                      </span>
                    </SelectItem>
                    <SelectItem value="failed">
                      <span className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Failed
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Duration (Editable) */}
              <div className="space-y-2">
                <Label>
                  Duration <span className="text-red-500">*</span>
                </Label>
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
                      className="w-20 font-mono text-center"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
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
                      className="w-20 font-mono text-center"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      sec
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  Adjust if you took breaks or want to record actual solve time
                </p>
              </div>

              {/* Confidence Score */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>
                    Confidence Score <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-lg font-bold font-mono text-primary">
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
                <p className="text-xs text-muted-foreground font-mono">
                  Current confidence level assessment
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="What did you learn? What was challenging? Any observations?"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={5}
                  className="font-mono text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground font-mono">
                  Optional: Technical notes, edge cases, optimization
                  observations
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Complete Attempt
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPhase("timer")}
                  className="flex-1"
                >
                  Back to Timer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* System Reference */}
        <Card className="mt-6 border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Terminal className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-foreground font-mono uppercase tracking-wider text-xs">
                  Confidence Metric Scale
                </p>
                <div className="space-y-1 text-muted-foreground font-mono text-xs">
                  <div>
                    <span className="text-foreground">0-25:</span> Requires
                    solution review
                  </div>
                  <div>
                    <span className="text-foreground">25-50:</span> Partial
                    understanding, practice required
                  </div>
                  <div>
                    <span className="text-foreground">50-75:</span> Functional
                    implementation capability
                  </div>
                  <div>
                    <span className="text-foreground">75-100:</span> Full
                    mastery, optimization ready
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
