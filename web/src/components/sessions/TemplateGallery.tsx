import { motion } from "framer-motion";
import { Calendar, Flame, Target } from "lucide-react";
import { TemplateCard } from "./TemplateCard";
import type { TemplateInfo } from "@/types";

interface TemplateGalleryProps {
  templates: TemplateInfo[];
  selectedKey?: string;
  onSelect: (key: string) => void;
}

const categoryConfig = {
  daily: {
    icon: Calendar,
    label: "Daily Practice",
    description: "Short focused sessions for consistent progress",
  },
  pattern: {
    icon: Target,
    label: "Pattern Mastery",
    description: "Deep-dive sessions to master specific patterns",
  },
  weekend: {
    icon: Flame,
    label: "Weekend Sessions",
    description: "Extended practice for comprehensive coverage",
  },
};

export function TemplateGallery({ templates, selectedKey, onSelect }: TemplateGalleryProps) {
  // Group templates by category
  const templatesByCategory = templates.reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, TemplateInfo[]>);

  const categories = ["daily", "pattern", "weekend"] as const;

  return (
    <div className="space-y-4">
      {categories.map((category) => {
        const templates = templatesByCategory[category] || [];
        if (templates.length === 0) return null;

        const config = categoryConfig[category];
        const Icon = config.icon;

        return (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="space-y-2"
          >
            {/* Category Header - HUD Style */}
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 border border-primary/30">
                <Icon className="h-3.5 w-3.5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold text-foreground font-mono uppercase tracking-wider">
                  {config.label}
                </h2>
              </div>
              {/* Category badge - monospace */}
              <div className="px-2 py-0.5 rounded-md bg-muted/30 border border-border flex-shrink-0">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                  {templates.length}
                </span>
              </div>
            </div>

            {/* Template List - Vertical */}
            <div className="space-y-2">
              {templates.map((template, index) => (
                <motion.div
                  key={template.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.05 + index * 0.03 }}
                >
                  <TemplateCard
                    template={template}
                    selected={selectedKey === template.key}
                    onSelect={onSelect}
                  />
                </motion.div>
              ))}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
