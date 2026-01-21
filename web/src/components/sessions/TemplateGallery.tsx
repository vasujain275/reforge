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
    <div className="space-y-8">
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
            className="space-y-4"
          >
            {/* Category Header - HUD Style */}
            <div className="flex items-center gap-3 pb-3 border-b border-border/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 border border-primary/30">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground tracking-tight">
                  {config.label}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {config.description}
                </p>
              </div>
              {/* Category badge - monospace */}
              <div className="px-2.5 py-1 rounded-md bg-muted/30 border border-border">
                <span className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                  {templates.length} Templates
                </span>
              </div>
            </div>

            {/* Template Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template, index) => (
                <motion.div
                  key={template.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 + index * 0.05 }}
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
