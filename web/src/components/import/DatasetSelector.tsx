import { motion } from "framer-motion";
import { Database, Upload, FileSpreadsheet, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BundledDataset } from "@/api/import";

interface DatasetSelectorProps {
  datasets: BundledDataset[];
  selectedDataset: BundledDataset | null;
  onSelectDataset: (dataset: BundledDataset) => void;
  onSelectCustom?: () => void;
  showCustomUpload?: boolean;
  isLoading?: boolean;
}

export function DatasetSelector({
  datasets,
  selectedDataset,
  onSelectDataset,
  onSelectCustom,
  showCustomUpload = true,
  isLoading,
}: DatasetSelectorProps) {
  return (
    <div className="space-y-4">
      {/* Bundled Datasets */}
      <div className="grid gap-3">
        {datasets.map((dataset, index) => (
          <DatasetCard
            key={dataset.id}
            dataset={dataset}
            isSelected={selectedDataset?.id === dataset.id}
            onSelect={() => onSelectDataset(dataset)}
            index={index}
          />
        ))}
      </div>

      {/* Custom Upload Option */}
      {showCustomUpload && onSelectCustom && (
        <>
          <div className="relative flex items-center justify-center py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <span className="relative bg-background px-3 text-xs font-mono text-muted-foreground uppercase tracking-wider">
              Or
            </span>
          </div>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.3 }}
            onClick={onSelectCustom}
            className={cn(
              "w-full p-4 rounded-lg border border-dashed border-border",
              "bg-card/50 hover:bg-card hover:border-primary/30",
              "hover:shadow-[0_0_15px_-3px_var(--primary)]",
              "transition-all duration-200 group"
            )}
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-muted border border-border group-hover:border-primary/30 transition-colors">
                <Upload className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div className="text-left">
                <h3 className="font-medium text-sm text-foreground">
                  Upload Custom CSV
                </h3>
                <p className="text-xs text-muted-foreground font-mono">
                  Import from custom dataset
                </p>
              </div>
            </div>
          </motion.button>
        </>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

// Dataset Card Component
interface DatasetCardProps {
  dataset: BundledDataset;
  isSelected: boolean;
  onSelect: () => void;
  index: number;
}

function DatasetCard({ dataset, isSelected, onSelect, index }: DatasetCardProps) {
  const totalProblems =
    dataset.difficulties.easy +
    dataset.difficulties.medium +
    dataset.difficulties.hard;

  return (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.3 }}
      onClick={onSelect}
      className={cn(
        "w-full p-4 rounded-lg border text-left transition-all duration-200",
        isSelected
          ? "border-primary bg-primary/5 shadow-[0_0_15px_-3px_var(--primary)]"
          : "border-border bg-card hover:border-primary/30"
      )}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={cn(
            "p-2.5 rounded-lg border transition-colors",
            isSelected
              ? "bg-primary/10 border-primary/30"
              : "bg-muted border-border"
          )}
        >
          <Database
            className={cn(
              "h-4 w-4 transition-colors",
              isSelected ? "text-primary" : "text-muted-foreground"
            )}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                "font-medium text-sm truncate",
                isSelected ? "text-primary" : "text-foreground"
              )}
            >
              {dataset.name}
            </h3>
            {isSelected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
                className="flex-shrink-0"
              >
                <Check className="h-4 w-4 text-primary" />
              </motion.div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {dataset.description}
          </p>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-2 mt-3 font-mono text-xs">
            <StatBadge
              icon={<FileSpreadsheet className="h-3 w-3" />}
              label={`${totalProblems.toLocaleString()} problems`}
            />
            <span className="text-muted-foreground/50">|</span>
            <StatBadge label={`${dataset.pattern_count} patterns`} />
          </div>

          {/* Difficulty Breakdown */}
          <div className="flex items-center gap-3 mt-2 font-mono text-xs">
            <DifficultyBadge
              label="E"
              count={dataset.difficulties.easy}
              color="green"
            />
            <DifficultyBadge
              label="M"
              count={dataset.difficulties.medium}
              color="orange"
            />
            <DifficultyBadge
              label="H"
              count={dataset.difficulties.hard}
              color="red"
            />
          </div>
        </div>
      </div>
    </motion.button>
  );
}

// Stat Badge Component
function StatBadge({
  icon,
  label,
}: {
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5 text-muted-foreground">
      {icon}
      {label}
    </span>
  );
}

// Difficulty Badge Component
function DifficultyBadge({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: "green" | "orange" | "red";
}) {
  const colorStyles = {
    green: "text-green-500",
    orange: "text-orange-400",
    red: "text-red-500",
  };

  return (
    <span>
      <span className={cn("font-semibold", colorStyles[color])}>
        {count.toLocaleString()}
      </span>
      <span className="text-muted-foreground ml-1">{label}</span>
    </span>
  );
}
