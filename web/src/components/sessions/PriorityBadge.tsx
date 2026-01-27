import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Clock, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";

type PriorityStatus = "overdue" | "due_soon" | "on_track" | "new";

interface PriorityBadgeProps {
  priority?: PriorityStatus;
  daysUntilDue?: number;
  showDays?: boolean;
  className?: string;
}

const priorityConfig: Record<
  PriorityStatus,
  {
    label: string;
    icon: typeof Clock;
    className: string;
    textClass: string;
  }
> = {
  overdue: {
    label: "Overdue",
    icon: AlertTriangle,
    className: "border-red-500/50 bg-red-500/10",
    textClass: "text-red-500",
  },
  due_soon: {
    label: "Due Soon",
    icon: Clock,
    className: "border-orange-400/50 bg-orange-400/10",
    textClass: "text-orange-400",
  },
  on_track: {
    label: "On Track",
    icon: CheckCircle2,
    className: "border-green-500/50 bg-green-500/10",
    textClass: "text-green-500",
  },
  new: {
    label: "New",
    icon: Sparkles,
    className: "border-primary/50 bg-primary/10",
    textClass: "text-primary",
  },
};

export function PriorityBadge({
  priority,
  daysUntilDue,
  showDays = true,
  className,
}: PriorityBadgeProps) {
  // Default to "new" if no priority is set
  const status = priority || "new";
  const config = priorityConfig[status];
  const Icon = config.icon;

  // Build display text
  let displayText = config.label;
  if (showDays && daysUntilDue !== undefined && status !== "new") {
    if (daysUntilDue < 0) {
      displayText = `${Math.abs(daysUntilDue)}d overdue`;
    } else if (daysUntilDue === 0) {
      displayText = "Due today";
    } else if (daysUntilDue === 1) {
      displayText = "Due tomorrow";
    } else {
      displayText = `${daysUntilDue}d`;
    }
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono text-[10px] uppercase tracking-wider",
        config.className,
        config.textClass,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{displayText}</span>
    </Badge>
  );
}

// Compact version for tight spaces
export function PriorityIndicator({
  priority,
  className,
}: {
  priority?: PriorityStatus;
  className?: string;
}) {
  const status = priority || "new";
  const config = priorityConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={cn("inline-flex items-center", config.textClass, className)}
      title={config.label}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}
