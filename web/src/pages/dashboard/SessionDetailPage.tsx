import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  Flame,
  Focus,
  GitBranch,
  List,
  PlayCircle,
  Search,
  Target,
  Terminal,
  Zap,
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
import { SessionTimerDisplay } from "@/components/sessions/SessionTimerDisplay";
import { SessionStats } from "@/components/sessions/SessionStats";
import { FocusModeView } from "@/components/sessions/FocusModeView";
import { SortableProblemCard } from "@/components/sessions/SortableProblemCard";
import { useSessionTimerStore } from "@/store/sessionTimerStore";
import { useSessionPageStore } from "@/store/sessionPageStore";
import { api } from "@/lib/api";
import type { RevisionSession, SessionProblem } from "@/types";

export default function SessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Data state (kept local - will move to React Query in Phase 5)
  const [session, setSession] = useState<RevisionSession | null>(null);
  const [problems, setProblems] = useState<SessionProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Session timer from Zustand store
  const { initialize: initializeTimer, start: startTimer, cleanup: cleanupTimer } = useSessionTimerStore();

  // UI state from Zustand store
  const {
    viewMode,
    activeTimerProblemId,
    showCompleteDialog,
    showDeleteDialog,
    isCompletingSession,
    isDeletingSession,
    isReordering,
    setViewMode,
    setActiveTimerProblemId,
    setShowCompleteDialog,
    setShowDeleteDialog,
    setIsCompletingSession,
    setIsDeletingSession,
    setIsReordering,
    cancelTimer,
    reset: resetPageStore,
  } = useSessionPageStore();

  // Handle entering focus mode - start the session timer
  const enterFocusMode = async () => {
    await startTimer();
    setViewMode("focus");
  };

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (id) {
      fetchSession();
    }

    // Cleanup on unmount
    return () => {
      cleanupTimer();
      resetPageStore();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchSession = async () => {
    if (!id) return;

    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/sessions/${id}`);
      const sessionData = response.data.data;
      setSession(sessionData);
      setProblems(sessionData.problems || []);
      
      // Initialize the session timer store
      if (!sessionData.completed) {
        initializeTimer(
          sessionData.id,
          sessionData.elapsed_time_seconds,
          sessionData.timer_state,
          sessionData.planned_duration_min
        );
      }
    } catch (err: unknown) {
      console.error("Failed to fetch session:", err);
      setError("Failed to load session details");
    } finally {
      setLoading(false);
    }
  };

  // Handle problem completion from timer
  const handleProblemComplete = () => {
    cancelTimer();
    fetchSession(); // Refresh to get updated problem status
  };

  // Handle timer cancel
  const handleTimerCancel = () => {
    cancelTimer();
  };

  // Handle skip - move problem to end of list
  const handleSkip = async (problemId: number) => {
    if (!id) return;

    const currentIndex = problems.findIndex((p) => p.id === problemId);
    if (currentIndex === -1 || currentIndex === problems.length - 1) return;

    // Move to end
    const newProblems = [...problems];
    const [removed] = newProblems.splice(currentIndex, 1);
    newProblems.push(removed);
    
    // Optimistic update
    setProblems(newProblems);

    // API call
    try {
      await api.put(`/sessions/${id}/reorder`, {
        problem_ids: newProblems.map((p) => p.id),
      });
    } catch (err) {
      console.error("Failed to reorder:", err);
      // Revert on error
      fetchSession();
    }
  };

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !id) return;

    const oldIndex = problems.findIndex((p) => p.id === active.id);
    const newIndex = problems.findIndex((p) => p.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newProblems = arrayMove(problems, oldIndex, newIndex);
    
    // Optimistic update
    setProblems(newProblems);
    setIsReordering(true);

    // API call
    try {
      await api.put(`/sessions/${id}/reorder`, {
        problem_ids: newProblems.map((p) => p.id),
      });
    } catch (err) {
      console.error("Failed to reorder:", err);
      // Revert on error
      fetchSession();
    } finally {
      setIsReordering(false);
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
  const isSessionCompleted = session.completed || false;

  // Render Focus Mode
  if (viewMode === "focus" && !isSessionCompleted) {
    return (
      <FocusModeView
        session={session}
        problems={problems}
        onExit={() => setViewMode("list")}
        onProblemComplete={fetchSession}
        onSkip={handleSkip}
      />
    );
  }

  // Render List View
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
            {isSessionCompleted ? (
              <span className="flex items-center gap-2 text-sm px-4 py-2 rounded-md bg-green-500/10 text-green-500 border border-green-500/20 font-mono uppercase tracking-wider">
                <CheckCircle2 className="h-4 w-4" />
                Completed
              </span>
            ) : (
              <>
                {/* View Mode Toggle */}
                <div className="flex items-center border border-border rounded-md overflow-hidden">
                  <button
                    onClick={() => setViewMode("list")}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-mono uppercase tracking-wider transition-colors ${
                      viewMode === "list"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background hover:bg-secondary/50"
                    }`}
                  >
                    <List className="h-4 w-4" />
                    List
                  </button>
                  <button
                    onClick={enterFocusMode}
                    className={`flex items-center gap-2 px-3 py-2 text-sm font-mono uppercase tracking-wider transition-colors ${
                      viewMode === "focus"
                        ? "bg-primary text-primary-foreground"
                        : "bg-background hover:bg-secondary/50"
                    }`}
                  >
                    <Focus className="h-4 w-4" />
                    Focus
                  </button>
                </div>

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
      {!isSessionCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <SessionTimerDisplay
            sessionId={session.id}
            plannedDurationMin={session.planned_duration_min}
            initialElapsedSeconds={session.elapsed_time_seconds}
            initialTimerState={session.timer_state}
            isCompleted={isSessionCompleted}
          />
        </motion.div>
      )}

      {/* Session Stats */}
      {!isSessionCompleted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          <SessionStats problems={problems} />
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-mono uppercase tracking-wider">
                  Session Problems
                </CardTitle>
                <CardDescription className="font-mono text-xs">
                  {isSessionCompleted
                    ? "Session completed"
                    : "Drag to reorder. Execute in optimized sequence for maximum efficiency."}
                </CardDescription>
              </div>
              {isReordering && (
                <span className="text-xs font-mono text-muted-foreground">
                  Saving order...
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!problems || problems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-mono text-sm">No problems configured</p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={problems.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {problems.map((problem: SessionProblem, index: number) => (
                      <SortableProblemCard
                        key={problem.id}
                        problem={problem}
                        index={index}
                        isActive={activeTimerProblemId === problem.id}
                        onStartTimer={() => setActiveTimerProblemId(problem.id)}
                        onCancelTimer={handleTimerCancel}
                        onSkip={() => handleSkip(problem.id)}
                        onTimerComplete={handleProblemComplete}
                        sessionId={session.id}
                        isSessionCompleted={isSessionCompleted}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
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
