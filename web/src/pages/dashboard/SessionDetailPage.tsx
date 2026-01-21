import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
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
  ExternalLink,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ApiError from "@/components/ApiError";
import { AttemptRecordForm } from "@/components/sessions/AttemptRecordForm";
import { SessionTimer } from "@/components/sessions/SessionTimer";
import { api } from "@/lib/api";
import type { RevisionSession, SessionProblem } from "@/types";

export default function SessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState<RevisionSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [recordingAttemptFor, setRecordingAttemptFor] = useState<number | null>(
    null
  );
  const [isSubmittingAttempt, setIsSubmittingAttempt] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isCompletingSession, setIsCompletingSession] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);

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

  const handleRecordAttempt = async (data: {
    outcome: "passed" | "failed";
    confidence: number;
    duration_seconds?: number;
    notes?: string;
  }) => {
    if (!recordingAttemptFor || !id) return;

    setIsSubmittingAttempt(true);
    try {
      await api.post("/attempts", {
        problem_id: recordingAttemptFor,
        session_id: parseInt(id),
        outcome: data.outcome,
        confidence_score: data.confidence,
        duration_seconds: data.duration_seconds,
        notes: data.notes,
      });

      // Refresh session to see updated problem status
      await fetchSession();
      setRecordingAttemptFor(null);
    } catch (err) {
      console.error("Failed to record attempt:", err);
      alert("Failed to record attempt. Please try again.");
    } finally {
      setIsSubmittingAttempt(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!id) return;

    setIsCompletingSession(true);
    try {
      await api.put(`/sessions/${id}/complete`);
      await fetchSession();
      setShowCompleteDialog(false);
    } catch (err) {
      console.error("Failed to complete session:", err);
      alert("Failed to complete session. Please try again.");
    } finally {
      setIsCompletingSession(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!id) return;

    setIsDeletingSession(true);
    try {
      await api.delete(`/sessions/${id}`);
      navigate("/dashboard/sessions");
    } catch (err) {
      console.error("Failed to delete session:", err);
      alert("Failed to delete session. Please try again.");
      setIsDeletingSession(false);
    }
  };

  const getTemplateDisplay = (key: string | undefined) => {
    const templates: Record<
      string,
      { icon: React.ReactNode; name: string }
    > = {
      morning_momentum: {
        icon: <Zap className="h-6 w-6" />,
        name: "Morning Momentum Builder",
      },
      weakness_crusher: {
        icon: <Target className="h-6 w-6" />,
        name: "Weakness Crusher",
      },
      daily_mixed: {
        icon: <GitBranch className="h-6 w-6" />,
        name: "Daily Mixed Grind",
      },
      pattern_deep_dive: {
        icon: <Search className="h-6 w-6" />,
        name: "Pattern Deep Dive",
      },
      pattern_rotation: {
        icon: <Cpu className="h-6 w-6" />,
        name: "Pattern Rotation",
      },
      pattern_combo: {
        icon: <Target className="h-6 w-6" />,
        name: "Pattern Combo Chains",
      },
      pattern_graduation: {
        icon: <CheckCircle2 className="h-6 w-6" />,
        name: "Pattern Graduation",
      },
      weekend_comprehensive: {
        icon: <Cpu className="h-6 w-6" />,
        name: "Weekend Comprehensive",
      },
      weak_pattern_marathon: {
        icon: <Flame className="h-6 w-6" />,
        name: "Weak Pattern Marathon",
      },
      challenge_gauntlet: {
        icon: <Flame className="h-6 w-6" />,
        name: "Challenge Gauntlet",
      },
    };
    if (!key) {
      return { icon: <Terminal className="h-6 w-6" />, name: "Custom Session" };
    }
    return (
      templates[key] || { icon: <Terminal className="h-6 w-6" />, name: key }
    );
  };

  const formatDate = (dateString: string) => {
    // Handle both ISO8601 and SQLite timestamp formats
    let date: Date;
    
    if (dateString.includes('T') || dateString.includes('Z')) {
      date = new Date(dateString);
    } else {
      // SQLite format - treat as UTC
      date = new Date(dateString + ' UTC');
    }
    
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
        <ApiError
          message={error || "Session not found"}
          onRetry={fetchSession}
        />
      </div>
    );
  }

  const template = getTemplateDisplay(session.template_key);
  const completedCount =
    session.problems?.filter((p) => p.completed).length || 0;
  const totalCount = session.problems?.length || 0;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="flex-1 p-6">
      {/* Header with Actions */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <Link
          to="/dashboard/sessions"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sessions
        </Link>

        <div className="flex items-start justify-between gap-4">
          {/* Title Section */}
          <div className="flex items-center gap-4">
            <div className="text-primary">{template.icon}</div>
            <div>
              <h2 className="text-3xl font-bold tracking-tight">
                {template.name}
              </h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground font-mono">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDate(session.created_at)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {session.planned_duration_min} min
                </span>
              </div>
            </div>
          </div>

          {/* Status Badge + Actions */}
          <div className="flex items-center gap-3">
            {session.completed ? (
              <span className="flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-green-500/10 text-green-500 border border-green-500/20 font-mono uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4" />
                Completed
              </span>
            ) : (
              <>
                <span className="flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-orange-500/10 text-orange-500 border border-orange-500/20 font-mono uppercase tracking-wider">
                  <PlayCircle className="h-4 w-4" />
                  Active
                </span>
                <Button
                  onClick={() => setShowCompleteDialog(true)}
                  className="font-mono uppercase tracking-wider"
                  size="sm"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Complete Session
                </Button>
              </>
            )}
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="destructive"
              size="sm"
              className="font-mono uppercase tracking-wider"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Session Timer (Active Sessions Only) */}
      {!session.completed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <SessionTimer
            sessionId={session.id}
            plannedDurationMin={session.planned_duration_min}
            initialElapsedSeconds={session.elapsed_time_seconds}
            initialTimerState={session.timer_state}
            isCompleted={session.completed || false}
          />
        </motion.div>
      )}

      {/* Progress Card (Active Sessions Only) */}
      {!session.completed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="mb-6 border border-primary/20 hover:shadow-[0_0_15px_-3px_var(--primary)] transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-lg font-mono uppercase tracking-wider">
                Session Progress
              </CardTitle>
              <CardDescription className="font-mono text-xs">
                {completedCount} / {totalCount} problems completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-secondary/50 rounded-md h-3 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="bg-gradient-to-r from-primary to-primary/80 h-3 rounded-md"
                />
              </div>
              <p className="text-right text-sm font-mono text-muted-foreground mt-2">
                {progressPercent}%
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Problems List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="font-mono uppercase tracking-wider">
              Session Problems
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              Execute in optimized sequence for maximum efficiency
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!session.problems || session.problems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-mono text-sm">No problems configured</p>
              </div>
            ) : (
              <div className="space-y-4">
                {session.problems.map((problem: SessionProblem, index: number) => (
                  <motion.div
                    key={problem.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className={`border rounded-md transition-all duration-300 ${
                      problem.completed
                        ? "bg-green-500/5 border-green-500/20"
                        : "border-border hover:border-primary/40 hover:shadow-[0_0_15px_-3px_var(--primary)]"
                    }`}
                  >
                    <div className="p-4 flex items-start gap-4">
                      {/* Problem Number/Status Icon */}
                      <div
                        className={`flex items-center justify-center w-10 h-10 rounded-md font-bold font-mono text-sm border shrink-0 ${
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
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <h4 className="font-semibold font-mono text-lg">
                            {problem.title}
                          </h4>
                          <span
                            className={`text-xs px-2 py-1 rounded-md font-mono uppercase tracking-wider border ${
                              problem.difficulty === "hard"
                                ? "bg-red-500/10 text-red-500 border-red-500/20"
                                : problem.difficulty === "medium"
                                  ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                                  : "bg-green-500/10 text-green-500 border-green-500/20"
                            }`}
                          >
                            {problem.difficulty}
                          </span>
                          {problem.url && (
                            <a
                              href={problem.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-mono uppercase tracking-wider"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open Problem
                            </a>
                          )}
                        </div>

                        {/* Metadata */}
                        <div className="flex items-center gap-6 text-xs text-muted-foreground font-mono mb-2">
                          <span>
                            Score: <span className="text-foreground">{problem.score.toFixed(1)}</span>
                          </span>
                          <span>
                            Confidence: <span className="text-foreground">{problem.confidence}%</span>
                          </span>
                          {problem.days_since_last !== null &&
                            problem.days_since_last !== undefined && (
                              <span>
                                Last: <span className="text-foreground">{problem.days_since_last}d ago</span>
                              </span>
                            )}
                          <span>
                            Time: <span className="text-foreground">{problem.planned_min}m</span>
                          </span>
                        </div>

                        {/* Reason */}
                        <p className="text-xs text-muted-foreground italic">
                          {problem.reason}
                        </p>

                        {/* Attempt Status (if completed) */}
                        {problem.completed && problem.outcome && (
                          <div className="mt-3 flex items-center gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md font-mono uppercase tracking-wider border ${
                                problem.outcome === "passed"
                                  ? "bg-green-500/10 text-green-500 border-green-500/20"
                                  : "bg-red-500/10 text-red-500 border-red-500/20"
                              }`}
                            >
                              {problem.outcome === "passed" ? (
                                <CheckCircle2 className="h-3 w-3" />
                              ) : (
                                <Target className="h-3 w-3" />
                              )}
                              {problem.outcome}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="shrink-0">
                        {recordingAttemptFor === problem.id ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRecordingAttemptFor(null)}
                            disabled={isSubmittingAttempt}
                            className="font-mono uppercase tracking-wider"
                          >
                            Cancel
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant={problem.completed ? "outline" : "default"}
                            onClick={() => setRecordingAttemptFor(problem.id)}
                            className="font-mono uppercase tracking-wider"
                          >
                            <PlayCircle className="h-4 w-4 mr-2" />
                            {problem.completed ? "Retry" : "Record"}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Attempt Record Form (inline expansion) */}
                    {recordingAttemptFor === problem.id && (
                      <div className="px-4 pb-4">
                        <AttemptRecordForm
                          problemId={problem.id}
                          sessionId={parseInt(id!)}
                          onSubmit={handleRecordAttempt}
                          onCancel={() => setRecordingAttemptFor(null)}
                          isSubmitting={isSubmittingAttempt}
                        />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Complete Session Confirmation Dialog */}
      <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono">
              Complete Session?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-sm">
              Mark this session as completed. You can still view it later in the
              completed sessions list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCompletingSession} className="font-mono">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCompleteSession}
              disabled={isCompletingSession}
              className="font-mono uppercase tracking-wider"
            >
              {isCompletingSession ? "Completing..." : "Complete Session"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Session Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-red-500">
              Delete Session?
            </AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-sm">
              This action cannot be undone. This will permanently delete the
              session and all its data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingSession} className="font-mono">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSession}
              disabled={isDeletingSession}
              className="bg-red-500 hover:bg-red-600 font-mono uppercase tracking-wider"
            >
              {isDeletingSession ? "Deleting..." : "Delete Session"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
