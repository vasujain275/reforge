import { motion } from "framer-motion";
import { Clock, Zap } from "lucide-react";
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={() => onSelect(template.key)}
      className={cn(
        "group relative w-full text-left",
        "rounded-md border border-border bg-card",
        "p-4 transition-all duration-200 min-h-[140px]",
        "hover:border-primary hover:shadow-[0_0_15px_-3px_var(--primary)]",
        selected && "border-primary bg-primary/5 shadow-[0_0_15px_-3px_var(--primary)]"
      )}
    >
      {/* Header with Icon and Title */}
      <div className="flex items-start gap-3 mb-3">
        {/* Icon with subtle glow */}
        <div className={cn(
          "flex-shrink-0 flex items-center justify-center",
          "w-9 h-9 rounded-md",
          "bg-muted/50 border border-border",
          "transition-colors group-hover:bg-primary/10 group-hover:border-primary/50",
          selected && "bg-primary/10 border-primary/50"
        )}>
          <span className="text-xl" role="img" aria-label={template.display_name}>
            {template.icon}
          </span>
        </div>
        
        {/* Title and Duration */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground leading-tight mb-1.5 break-words">
            {template.display_name}
          </h3>
          {/* Duration pill - monospace for data */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3 flex-shrink-0" />
            <span className="font-mono whitespace-nowrap">{template.duration_min} min</span>
          </div>
        </div>
        
        {/* Selected indicator */}
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
          >
            <Zap className="h-3 w-3 text-primary-foreground" />
          </motion.div>
        )}
      </div>
      
      {/* Description */}
      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
        {template.description}
      </p>
      
      {/* Category badge */}
      <div className="inline-flex">
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded-md",
          "text-[10px] font-mono uppercase tracking-wider",
          "bg-muted/50 text-muted-foreground border border-border",
          "group-hover:border-primary/30",
          selected && "border-primary/50 text-primary"
        )}>
          {template.category}
        </span>
      </div>
      
      {/* Hover state border glow effect */}
      <div className={cn(
        "absolute inset-0 rounded-md pointer-events-none",
        "transition-opacity duration-200",
        "opacity-0 group-hover:opacity-100",
        selected && "opacity-100",
        "bg-gradient-to-br from-primary/5 to-transparent"
      )} />
    </motion.button>
  );
}
