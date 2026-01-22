import { motion } from "framer-motion";
import { Check, AlertTriangle, Clock, Database, Layers, SkipForward } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ImportResult } from "@/api/import";
import { Button } from "@/components/ui/button";

interface ImportResultsProps {
  result: ImportResult;
  onDone?: () => void;
  onViewProblems?: () => void;
}

export function ImportResults({ result, onDone, onViewProblems }: ImportResultsProps) {
  const hasErrors = result.errors && result.errors.length > 0;
  const totalImported = result.problems_created + result.patterns_created;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-card border border-border rounded-lg overflow-hidden"
    >
      {/* Header - HUD Style */}
      <div
        className={cn(
          "px-4 py-4 border-b",
          result.success
            ? "bg-green-500/5 border-green-500/20"
            : "bg-orange-400/5 border-orange-400/20"
        )}
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-2 rounded-lg border",
              result.success
                ? "bg-green-500/10 border-green-500/20"
                : "bg-orange-400/10 border-orange-400/20"
            )}
          >
            {result.success ? (
              <Check className="h-5 w-5 text-green-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-orange-400" />
            )}
          </div>
          <div>
            <h2
              className={cn(
                "font-mono text-sm font-semibold uppercase tracking-wider",
                result.success ? "text-green-500" : "text-orange-400"
              )}
            >
              {result.success ? "Import Complete" : "Completed with Errors"}
            </h2>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {totalImported.toLocaleString()} items imported successfully
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <StatCard
            icon={<Database className="h-4 w-4" />}
            label="Problems"
            value={result.problems_created}
            variant="primary"
          />
          <StatCard
            icon={<Layers className="h-4 w-4" />}
            label="Patterns"
            value={result.patterns_created}
            variant="blue"
          />
          <StatCard
            icon={<SkipForward className="h-4 w-4" />}
            label="Skipped"
            value={result.duplicates_skipped}
            variant="muted"
          />
          <StatCard
            icon={<Clock className="h-4 w-4" />}
            label="Duration"
            value={result.duration}
            variant="muted"
            isText
          />
        </div>

        {/* Errors Section */}
        {hasErrors && (
          <div className="space-y-2">
            <h3 className="text-xs font-mono font-semibold text-muted-foreground uppercase tracking-wider">
              Errors ({result.errors!.length})
            </h3>
            <div className="bg-red-500/5 border border-red-500/20 rounded-lg overflow-hidden max-h-40 overflow-y-auto font-mono text-xs">
              {result.errors!.map((error, index) => (
                <div
                  key={index}
                  className={cn(
                    "px-3 py-2 flex items-start gap-3",
                    index !== result.errors!.length - 1 && "border-b border-red-500/10"
                  )}
                >
                  <span className="text-red-500/50 shrink-0">
                    #{error.row_number}
                  </span>
                  <span className="text-foreground truncate flex-1">
                    {error.title}
                  </span>
                  <span className="text-red-500 shrink-0">
                    {error.error}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="bg-muted/30 border border-border rounded-lg p-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <p className="text-xs font-mono text-muted-foreground">
              <span className="text-foreground font-semibold">
                {result.problems_created.toLocaleString()}
              </span>{" "}
              problems ready for practice
              {result.patterns_created > 0 && (
                <>
                  {" "}with{" "}
                  <span className="text-foreground font-semibold">
                    {result.patterns_created}
                  </span>{" "}
                  new patterns
                </>
              )}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {onDone && (
            <Button variant="outline" onClick={onDone} size="sm" className="font-mono text-xs">
              Done
            </Button>
          )}
          {onViewProblems && (
            <Button onClick={onViewProblems} size="sm" className="font-mono text-xs">
              View Problems
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Stat Card Component
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  variant: "primary" | "blue" | "muted";
  isText?: boolean;
}

function StatCard({ icon, label, value, variant, isText }: StatCardProps) {
  const variantStyles = {
    primary: {
      bg: "bg-primary/5",
      border: "border-primary/20",
      icon: "text-primary",
      value: "text-primary",
    },
    blue: {
      bg: "bg-blue-400/5",
      border: "border-blue-400/20",
      icon: "text-blue-400",
      value: "text-blue-400",
    },
    muted: {
      bg: "bg-muted/50",
      border: "border-border",
      icon: "text-muted-foreground",
      value: "text-foreground",
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        "rounded-lg border p-2.5",
        styles.bg,
        styles.border
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={styles.icon}>{icon}</span>
        <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p
        className={cn(
          "text-lg font-bold font-mono mt-1",
          styles.value
        )}
      >
        {isText ? value : (value as number).toLocaleString()}
      </p>
    </div>
  );
}
