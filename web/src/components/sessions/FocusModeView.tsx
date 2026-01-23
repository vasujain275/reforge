import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ChevronRight,
  ExternalLink,
  SkipForward,
  Target,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProblemTimer } from "./ProblemTimer";
import { SessionStats } from "./SessionStats";
import type { RevisionSession, SessionProblem } from "@/types";

interface FocusModeViewProps {
  session: RevisionSession;
  problems: SessionProblem[];
  onExit: () => void;
  onProblemComplete: () => void;
  onSkip: (problemId: number) => void;
}

export function FocusModeView({
  session,
  problems,
  onExit,
  onProblemComplete,
  onSkip,
}: FocusModeViewProps) {
  // Find first incomplete problem as starting point
  const getFirstIncompleteIndex = () => {
    const idx = problems.findIndex((p) => !p.completed);
    return idx >= 0 ? idx : 0;
  };

  const [currentIndex, setCurrentIndex] = useState(getFirstIncompleteIndex);
  const [activeTimerProblemId, setActiveTimerProblemId] = useState<
    number | null
  >(null);

  const currentProblem = problems[currentIndex];
  const completedCount = problems.filter((p) => p.completed).length;
  const totalCount = problems.length;

  // Get next incomplete problem index
  const getNextIncompleteIndex = (fromIndex: number): number => {
    for (let i = fromIndex + 1; i < problems.length; i++) {
      if (!problems[i].completed) return i;
    }
    // Wrap around
    for (let i = 0; i < fromIndex; i++) {
      if (!problems[i].completed) return i;
    }
    return -1; // All completed
  };

  // Handle timer complete
  const handleTimerComplete = () => {
    setActiveTimerProblemId(null);
    onProblemComplete();

    // Auto-advance to next incomplete problem
    const nextIndex = getNextIncompleteIndex(currentIndex);
    if (nextIndex >= 0) {
      setCurrentIndex(nextIndex);
    }
  };

  // Handle timer cancel
  const handleTimerCancel = () => {
    setActiveTimerProblemId(null);
  };

  // Handle skip
  const handleSkip = () => {
    if (currentProblem) {
      onSkip(currentProblem.id);
      // Move to next problem
      const nextIndex = (currentIndex + 1) % problems.length;
      setCurrentIndex(nextIndex);
    }
  };

  // Start timer for current problem
  const startTimer = () => {
    if (currentProblem) {
      setActiveTimerProblemId(currentProblem.id);
    }
  };

  // Navigate to specific problem
  const goToProblem = (index: number) => {
    setCurrentIndex(index);
    setActiveTimerProblemId(null);
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

  // All problems completed
  const allCompleted = completedCount === totalCount;

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onExit}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Exit Focus Mode
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono text-muted-foreground">
            Problem
          </span>
          <span className="text-sm font-mono font-bold text-primary">
            {currentIndex + 1} / {totalCount}
          </span>
        </div>
      </div>

      {/* Session Stats - uses Zustand store for live timer */}
      <SessionStats problems={problems} />

      {/* Main Content */}
      <div className="max-w-3xl mx-auto">
        {allCompleted ? (
          // All Completed State
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold font-mono mb-2">
              Session Complete!
            </h2>
            <p className="text-muted-foreground font-mono mb-6">
              You've completed all {totalCount} problems.
            </p>
            <Button onClick={onExit} className="font-mono uppercase">
              View Summary
            </Button>
          </motion.div>
        ) : currentProblem ? (
          // Current Problem Card
          <AnimatePresence mode="wait">
            <motion.div
              key={currentProblem.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className={`border-2 rounded-lg p-6 ${
                currentProblem.completed
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-primary/30 bg-card"
              }`}
            >
              {/* Problem Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-md font-bold font-mono text-sm border ${
                      currentProblem.completed
                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                        : "bg-primary/10 text-primary border-primary/20"
                    }`}
                  >
                    {currentProblem.completed ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      currentIndex + 1
                    )}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold font-mono">
                      {currentProblem.title}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span
                        className={`text-xs px-2 py-1 rounded-md font-mono uppercase tracking-wider border ${getDifficultyColor(currentProblem.difficulty)}`}
                      >
                        {currentProblem.difficulty}
                      </span>
                      {currentProblem.url && (
                        <a
                          href={currentProblem.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-mono uppercase tracking-wider"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open Problem
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Problem Metadata */}
              <div className="flex items-center gap-6 text-sm text-muted-foreground font-mono mb-4 pb-4 border-b border-border">
                <span>
                  Score:{" "}
                  <span className="text-foreground">
                    {currentProblem.score.toFixed(1)}
                  </span>
                </span>
                <span>
                  Confidence:{" "}
                  <span className="text-foreground">
                    {currentProblem.confidence}%
                  </span>
                </span>
                {currentProblem.days_since_last !== null &&
                  currentProblem.days_since_last !== undefined && (
                    <span>
                      Last:{" "}
                      <span className="text-foreground">
                        {currentProblem.days_since_last}d ago
                      </span>
                    </span>
                  )}
                <span>
                  Est:{" "}
                  <span className="text-foreground">
                    {currentProblem.planned_min}m
                  </span>
                </span>
              </div>

              {/* Reason */}
              <p className="text-sm text-muted-foreground italic mb-6">
                "{currentProblem.reason}"
              </p>

              {/* Completed Status */}
              {currentProblem.completed && currentProblem.outcome && (
                <div className="mb-6">
                  <span
                    className={`inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md font-mono uppercase tracking-wider border ${
                      currentProblem.outcome === "passed"
                        ? "bg-green-500/10 text-green-500 border-green-500/20"
                        : "bg-red-500/10 text-red-500 border-red-500/20"
                    }`}
                  >
                    {currentProblem.outcome === "passed" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Target className="h-4 w-4" />
                    )}
                    {currentProblem.outcome}
                  </span>
                </div>
              )}

              {/* Timer or Action Buttons */}
              {activeTimerProblemId === currentProblem.id ? (
                <ProblemTimer
                  problemId={currentProblem.id}
                  problemTitle={currentProblem.title}
                  problemDifficulty={currentProblem.difficulty}
                  sessionId={session.id}
                  onComplete={handleTimerComplete}
                  onCancel={handleTimerCancel}
                />
              ) : (
                <div className="flex items-center gap-3">
                  <Button
                    onClick={startTimer}
                    size="lg"
                    className="flex-1 font-mono uppercase tracking-wider"
                  >
                    <Target className="h-5 w-5 mr-2" />
                    {currentProblem.completed ? "Retry Problem" : "Start Timer"}
                  </Button>
                  {!currentProblem.completed && (
                    <Button
                      onClick={handleSkip}
                      variant="outline"
                      size="lg"
                      className="font-mono uppercase tracking-wider"
                    >
                      <SkipForward className="h-5 w-5 mr-2" />
                      Skip
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        ) : null}

        {/* Problem Navigation Dots */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {problems.map((problem, index) => (
            <button
              key={problem.id}
              onClick={() => goToProblem(index)}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                index === currentIndex
                  ? "bg-primary scale-125"
                  : problem.completed
                    ? "bg-green-500"
                    : "bg-secondary hover:bg-secondary/80"
              }`}
              title={`${problem.title} ${problem.completed ? "(Completed)" : ""}`}
            />
          ))}
        </div>

        {/* Up Next Preview */}
        {!allCompleted && (
          <div className="mt-6 text-center">
            {(() => {
              const nextIndex = getNextIncompleteIndex(currentIndex);
              if (nextIndex >= 0 && nextIndex !== currentIndex) {
                const nextProblem = problems[nextIndex];
                return (
                  <button
                    onClick={() => goToProblem(nextIndex)}
                    className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-mono"
                  >
                    <span>Up Next:</span>
                    <span className="text-foreground">{nextProblem.title}</span>
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded uppercase ${getDifficultyColor(nextProblem.difficulty)}`}
                    >
                      {nextProblem.difficulty}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                );
              }
              return null;
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
