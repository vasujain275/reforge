import { motion } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CheckCircle2,
  ExternalLink,
  GripVertical,
  PlayCircle,
  SkipForward,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProblemTimer } from "@/components/sessions/ProblemTimer";
import { PriorityBadge } from "@/components/sessions/PriorityBadge";
import type { SessionProblem } from "@/types";

interface SortableProblemCardProps {
  problem: SessionProblem;
  index: number;
  isActive: boolean;
  onStartTimer: () => void;
  onCancelTimer: () => void;
  onSkip: () => void;
  onTimerComplete: () => void;
  sessionId: string;
  isSessionCompleted: boolean;
}

export function SortableProblemCard({
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
          : "border-border hover:border-primary/40"
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
          className={`flex items-center justify-center w-10 h-10 rounded-md font-bold text-sm border shrink-0 ${
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
            <h4 className="font-semibold text-lg">
              {problem.title}
            </h4>
            <span
              className={`text-xs px-2 py-1 rounded-md border ${
                problem.difficulty === "hard"
                  ? "bg-red-500/10 text-red-500 border-red-500/20"
                  : problem.difficulty === "medium"
                    ? "bg-orange-500/10 text-orange-500 border-orange-500/20"
                    : "bg-green-500/10 text-green-500 border-green-500/20"
              }`}
            >
              {problem.difficulty}
            </span>
            <PriorityBadge
              priority={problem.priority}
              daysUntilDue={problem.days_until_due}
            />
            {problem.url && (
              <a
                href={problem.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
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
                className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border ${
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
              >
                Cancel
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant={problem.completed ? "outline" : "default"}
                  onClick={onStartTimer}
                >
                  <PlayCircle className="h-4 w-4 mr-2" />
                  {problem.completed ? "Retry" : "Start"}
                </Button>
                {!problem.completed && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={onSkip}
                    className="text-muted-foreground hover:text-foreground"
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
