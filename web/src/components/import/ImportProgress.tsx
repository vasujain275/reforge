import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, AlertCircle, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImportProgress as ImportProgressType, RecentItem } from "@/api/import";

interface ImportProgressProps {
  progress: ImportProgressType | null;
  isConnecting?: boolean;
}

export function ImportProgress({ progress, isConnecting }: ImportProgressProps) {
  if (isConnecting) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="font-mono text-sm text-muted-foreground">
            Establishing connection...
          </span>
        </div>
      </div>
    );
  }

  if (!progress) {
    return null;
  }

  const isComplete = progress.phase === "complete";
  const isError = progress.phase === "error";
  const isPatternPhase = progress.phase === "patterns";

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      {/* Header - HUD Style */}
      <div className="bg-muted/30 border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "h-2 w-2 rounded-full",
              isComplete && "bg-green-500",
              isError && "bg-red-500",
              !isComplete && !isError && "bg-primary animate-pulse"
            )}
          />
          <span className="font-mono text-xs font-semibold uppercase tracking-wider">
            {isComplete
              ? "Import Complete"
              : isError
              ? "Import Failed"
              : isPatternPhase
              ? "Creating Patterns"
              : "Importing Problems"}
          </span>
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {progress.percentage.toFixed(1)}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="h-1 bg-muted/50">
        <motion.div
          className={cn(
            "h-full",
            isComplete && "bg-green-500",
            isError && "bg-red-500",
            !isComplete && !isError && "bg-primary"
          )}
          initial={{ width: 0 }}
          animate={{ width: `${progress.percentage}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">
        {/* Stats Row */}
        <div className="flex items-center justify-between gap-4 text-sm">
          <div className="font-mono text-xs">
            <span className="text-muted-foreground">Progress: </span>
            <span className="text-foreground font-semibold">
              {progress.current_index.toLocaleString()}
            </span>
            <span className="text-muted-foreground"> / </span>
            <span className="text-foreground">
              {progress.total_items.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Recent Items List - Terminal Style */}
        {progress.recent_items && progress.recent_items.length > 0 && (
          <div className="bg-background/50 border border-border rounded-md overflow-hidden font-mono text-xs">
            <AnimatePresence mode="popLayout">
              {progress.recent_items.map((item, index) => (
                <RecentItemRow
                  key={`${item.title}-${index}`}
                  item={item}
                  isLast={index === progress.recent_items!.length - 1}
                  isCurrent={index === progress.recent_items!.length - 1 && !isComplete}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Stats Pills */}
        <div className="flex flex-wrap gap-2">
          <StatPill
            label="Created"
            value={progress.problems_created}
            variant="success"
          />
          <StatPill
            label="Patterns"
            value={progress.patterns_created}
            variant="primary"
          />
          <StatPill
            label="Skipped"
            value={progress.duplicates_skipped}
            variant="muted"
          />
        </div>

        {/* Error Message */}
        {isError && progress.error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <span className="text-xs font-mono text-red-500">
              {progress.error}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// Recent Item Row Component
interface RecentItemRowProps {
  item: RecentItem;
  isLast: boolean;
  isCurrent: boolean;
}

function RecentItemRow({ item, isLast, isCurrent }: RecentItemRowProps) {
  const getStatusIcon = () => {
    switch (item.status) {
      case "created":
        return <Check className="h-3 w-3 text-green-500" />;
      case "skipped":
        return <SkipForward className="h-3 w-3 text-muted-foreground" />;
      case "error":
        return <AlertCircle className="h-3 w-3 text-red-500" />;
      default:
        return null;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "easy":
        return "text-green-500";
      case "medium":
        return "text-orange-400";
      case "hard":
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex items-center gap-3 px-3 py-2",
        !isLast && "border-b border-border/50",
        isCurrent && "bg-primary/5"
      )}
    >
      {/* Status Icon */}
      <div className="w-4 flex justify-center">
        {isCurrent ? (
          <motion.span
            className="text-primary"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            $
          </motion.span>
        ) : (
          getStatusIcon()
        )}
      </div>

      {/* Title */}
      <span
        className={cn(
          "flex-1 truncate",
          item.status === "skipped" && "text-muted-foreground",
          isCurrent && "text-primary"
        )}
      >
        {item.title}
      </span>

      {/* Difficulty Badge */}
      <span
        className={cn(
          "uppercase px-1.5 py-0.5 rounded bg-muted/50",
          getDifficultyColor(item.difficulty)
        )}
      >
        {item.difficulty}
      </span>
    </motion.div>
  );
}

// Stat Pill Component
interface StatPillProps {
  label: string;
  value: number;
  variant: "success" | "primary" | "muted";
}

function StatPill({ label, value, variant }: StatPillProps) {
  const variantStyles = {
    success: "bg-green-500/10 text-green-500 border-green-500/20",
    primary: "bg-primary/10 text-primary border-primary/20",
    muted: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2.5 py-1 rounded-md border font-mono text-xs",
        variantStyles[variant]
      )}
    >
      <span className="uppercase tracking-wider">{label}:</span>
      <span className="font-bold">{value.toLocaleString()}</span>
    </div>
  );
}
