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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Cpu,
  Flame,
  Focus,
  GitBranch,
  GripVertical,
  List,
  PlayCircle,
  Search,
  SkipForward,
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
import { SessionTimerDisplay } from "@/components/sessions/SessionTimerDisplay";
import { SessionStats } from "@/components/sessions/SessionStats";
import { ProblemTimer } from "@/components/sessions/ProblemTimer";
import { FocusModeView } from "@/components/sessions/FocusModeView";
import { useSessionTimerStore } from "@/store/sessionTimerStore";
import { api } from "@/lib/api";
import type { RevisionSession, SessionProblem } from "@/types";

// Sortable Problem Card Component
interface SortableProblemCardProps {
  problem: SessionProblem;
  index: number;
  isActive: boolean;
  onStartTimer: () => void;
  onCancelTimer: () => void;
  onSkip: () => void;
  onTimerComplete: () => void;
  sessionId: number;
  isSessionCompleted: boolean;
}

function SortableProblemCard({
  problem,
  index,
  isActive,
  onStartTimer,
  onCancelTimer,
  onSkip,
  onTimerComplete,
  sessionId,
  isSessionCompleted,
}: SortableProblemCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: problem.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className={`border rounded-md transition-all duration-300 ${
        isDragging ? "opacity-50 z-50" : ""
      } ${
        problem.completed
          ? "bg-green-500/5 border-green-500/20"
          : "border-border hover:border-primary/40 hover:shadow-[0_0_15px_-3px_var(--primary)]"
      }`}
    >
      <div className="p-4 flex items-start gap-4">
        {/* Drag Handle */}
        {!isSessionCompleted && (
          <button
            {...attributes}
            {...listeners}
            className="flex items-center justify-center w-6 h-10 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing shrink-0"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}

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

        {/* Action Buttons */}
        {!isSessionCompleted && (
          <div className="shrink-0 flex items-center gap-2">
            {isActive ? (
              <Button
                variant="outline"
                size="sm"
                onClick={onCancelTimer}
                className="font-mono uppercase tracking-wider"
              >
                Cancel
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant={problem.completed ? "outline" : "default"}
                  onClick={onStartTimer}
                  className="font-mono uppercase tracking-wider"
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  {problem.completed ? "Retry" : "Start"}
                </Button>
                {!problem.completed && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onSkip}
                    className="font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground"
                    title="Move to end of list"
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Inline Timer (when active) */}
      {isActive && (
        <div className="px-4 pb-4">
          <ProblemTimer
            problemId={problem.id}
            problemTitle={problem.title}
            problemDifficulty={problem.difficulty}
            sessionId={sessionId}
            onComplete={onTimerComplete}
            onCancel={onCancelTimer}
          />
        </div>
      )}
    </motion.div>
  );
}

export default function SessionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState<RevisionSession | null>(null);
  const [problems, setProblems] = useState<SessionProblem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Session timer from Zustand store
  const { initialize: initializeTimer, start: startTimer, cleanup: cleanupTimer } = useSessionTimerStore();

  // UI State
  const [viewMode, setViewMode] = useState<"list" | "focus">("list");
  const [activeTimerProblemId, setActiveTimerProblemId] = useState<number | null>(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isCompletingSession, setIsCompletingSession] = useState(false);
  const [isDeletingSession, setIsDeletingSession] = useState(false);
  const [isReordering, setIsReordering] = useState(false);

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

    // Cleanup timer store on unmount
    return () => {
      cleanupTimer();
    };
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
    setActiveTimerProblemId(null);
    fetchSession(); // Refresh to get updated problem status
  };

  // Handle timer cancel
  const handleTimerCancel = () => {
    setActiveTimerProblemId(null);
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
