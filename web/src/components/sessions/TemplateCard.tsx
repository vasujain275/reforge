import { motion } from "framer-motion";
import { Clock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TemplateInfo } from "@/types";

interface TemplateCardProps {
  template: TemplateInfo;
  selected?: boolean;
  onSelect: (key: string) => void;
}

export function TemplateCard({ template, selected, onSelect }: TemplateCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      onClick={() => onSelect(template.key)}
      className={cn(
        "group relative w-full text-left",
        "rounded-md border border-border bg-card",
        "p-3 transition-all duration-200",
        "hover:border-primary hover:shadow-[0_0_15px_-3px_var(--primary)] hover:bg-primary/5",
        selected && "border-primary bg-primary/5 shadow-[0_0_15px_-3px_var(--primary)]"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={cn(
          "flex-shrink-0 flex items-center justify-center",
          "w-10 h-10 rounded-md",
          "bg-muted/50 border border-border",
          "transition-colors group-hover:bg-primary/10 group-hover:border-primary/50",
          selected && "bg-primary/10 border-primary/50"
        )}>
          <span className="text-xl" role="img" aria-label={template.display_name}>
            {template.icon}
          </span>
        </div>
        
        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-sm text-foreground">
              {template.display_name}
            </h3>
            {/* Category badge */}
            <span className={cn(
              "inline-flex items-center px-1.5 py-0.5 rounded-md",
              "text-[10px] font-mono uppercase tracking-wider",
              "bg-muted/50 text-muted-foreground border border-border",
              "group-hover:border-primary/30",
              selected && "border-primary/50 text-primary"
            )}>
              {template.category}
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1 mb-1.5">
            {template.description}
          </p>
          {/* Duration */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span className="font-mono">{template.duration_min} min</span>
          </div>
        </div>

        {/* Selected indicator */}
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex-shrink-0 w-6 h-6 rounded-md bg-primary flex items-center justify-center"
          >
            <Check className="h-4 w-4 text-primary-foreground" />
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}
