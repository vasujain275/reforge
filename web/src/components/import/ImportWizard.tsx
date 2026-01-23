import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Check, ArrowLeft, FileSpreadsheet, Search, Play, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { DatasetSelector } from "./DatasetSelector";
import { ImportProgress } from "./ImportProgress";
import { ImportResults } from "./ImportResults";
import type {
  BundledDataset,
  ParseResult,
  ImportProgress as ImportProgressType,
  ImportResult,
} from "@/api/import";
import { connectToImportStream } from "@/api/import";
import { getApiErrorMessage } from "@/types/api";

type WizardStep = "select" | "review" | "import" | "complete";

interface ImportWizardProps {
  datasets: BundledDataset[];
  isLoadingDatasets?: boolean;
  onParseBundled: (datasetId: string) => Promise<ParseResult>;
  getExecuteUrl: (datasetId: string) => string;
  onComplete?: () => void;
  onViewProblems?: () => void;
  showCustomUpload?: boolean;
}

export function ImportWizard({
  datasets,
  isLoadingDatasets,
  onParseBundled,
  getExecuteUrl,
  onComplete,
  onViewProblems,
  showCustomUpload = false,
}: ImportWizardProps) {
  // Wizard state
  const [step, setStep] = useState<WizardStep>("select");
  const [selectedDataset, setSelectedDataset] = useState<BundledDataset | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Import state
  const [isConnecting, setIsConnecting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgressType | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Handle dataset selection
  const handleSelectDataset = useCallback(async (dataset: BundledDataset) => {
    setSelectedDataset(dataset);
    setParseError(null);
    setIsParsing(true);

    try {
      const result = await onParseBundled(dataset.id);
      setParseResult(result);
      setStep("review");
    } catch (err: unknown) {
      setParseError(getApiErrorMessage(err, "Failed to parse dataset"));
    } finally {
      setIsParsing(false);
    }
  }, [onParseBundled]);

  // Start import
  const startImport = useCallback(() => {
    if (!selectedDataset) return;

    setStep("import");
    setIsConnecting(true);
    setImportError(null);
    setImportProgress(null);

    const url = getExecuteUrl(selectedDataset.id);
    
    eventSourceRef.current = connectToImportStream(url, {
      onConnected: () => {
        setIsConnecting(false);
      },
      onProgress: (progress) => {
        setImportProgress(progress);
      },
      onComplete: (result) => {
        setImportResult(result);
        setStep("complete");
      },
      onError: (error) => {
        setImportError(error);
        setIsConnecting(false);
      },
    });
  }, [selectedDataset, getExecuteUrl]);

  // Go back to select step
  const goBack = useCallback(() => {
    setStep("select");
    setSelectedDataset(null);
    setParseResult(null);
    setParseError(null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Step Indicator - HUD Style */}
      <StepIndicator currentStep={step} />

      {/* Step Content */}
      <AnimatePresence mode="wait">
        {step === "select" && (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="font-mono text-sm font-semibold uppercase tracking-wider">
                  Select Dataset
                </h2>
                <p className="text-xs text-muted-foreground">
                  Choose a bundled dataset to import problems and patterns
                </p>
              </div>

              {parseError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs font-mono text-red-500">
                  {parseError}
                </div>
              )}

              <DatasetSelector
                datasets={datasets}
                selectedDataset={null}
                onSelectDataset={handleSelectDataset}
                showCustomUpload={showCustomUpload}
                isLoading={isLoadingDatasets || isParsing}
              />
            </div>
          </motion.div>
        )}

        {step === "review" && parseResult && selectedDataset && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ReviewStep
              dataset={selectedDataset}
              parseResult={parseResult}
              onBack={goBack}
              onConfirm={startImport}
            />
          </motion.div>
        )}

        {step === "import" && (
          <motion.div
            key="import"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="font-mono text-sm font-semibold uppercase tracking-wider">
                  Importing Data
                </h2>
                <p className="text-xs text-muted-foreground">
                  Please wait while your data is being imported...
                </p>
              </div>

              {importError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-xs font-mono text-red-500">
                  {importError}
                </div>
              )}

              <ImportProgress
                progress={importProgress}
                isConnecting={isConnecting}
              />
            </div>
          </motion.div>
        )}

        {step === "complete" && importResult && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <ImportResults
              result={importResult}
              onDone={onComplete}
              onViewProblems={onViewProblems}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Step Indicator Component - HUD Style
function StepIndicator({ currentStep }: { currentStep: WizardStep }) {
  const steps: { key: WizardStep; label: string; icon: React.ReactNode }[] = [
    { key: "select", label: "Select", icon: <FileSpreadsheet className="h-3 w-3" /> },
    { key: "review", label: "Review", icon: <Search className="h-3 w-3" /> },
    { key: "import", label: "Import", icon: <Play className="h-3 w-3" /> },
    { key: "complete", label: "Done", icon: <Terminal className="h-3 w-3" /> },
  ];

  const currentIndex = steps.findIndex((s) => s.key === currentStep);

  return (
    <div className="flex items-center justify-center gap-1">
      {steps.map((s, index) => {
        const isActive = s.key === currentStep;
        const isComplete = index < currentIndex;

        return (
          <div key={s.key} className="flex items-center">
            <div
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono transition-all",
                isActive && "bg-primary/10 text-primary border border-primary/20",
                isComplete && "bg-green-500/10 text-green-500 border border-green-500/20",
                !isActive && !isComplete && "bg-muted text-muted-foreground border border-border"
              )}
            >
              {isComplete ? <Check className="h-3 w-3" /> : s.icon}
              <span className="uppercase tracking-wider hidden sm:inline">{s.label}</span>
            </div>
            {index < steps.length - 1 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/50 mx-1" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Review Step Component
interface ReviewStepProps {
  dataset: BundledDataset;
  parseResult: ParseResult;
  onBack: () => void;
  onConfirm: () => void;
}

function ReviewStep({ dataset, parseResult, onBack, onConfirm }: ReviewStepProps) {
  const totalProblems = parseResult.valid_rows;
  // Handle potential null arrays from API (Go serializes nil slices as null)
  const patternsToCreate = parseResult.patterns_to_create ?? [];
  const existingPatternsArr = parseResult.existing_patterns ?? [];
  const invalidRows = parseResult.invalid_rows ?? [];
  const difficulties = parseResult.difficulties ?? { easy: 0, medium: 0, hard: 0 };
  const newPatterns = patternsToCreate.length;
  const existingPatterns = existingPatternsArr.length;

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-mono text-sm font-semibold uppercase tracking-wider">
          Review Import
        </h2>
        <p className="text-xs text-muted-foreground">
          Confirm the data that will be imported from{" "}
          <span className="font-mono text-foreground">{dataset.name}</span>
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="bg-muted/30 border-b border-border px-4 py-2.5">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-wider">
            Import Summary
          </h3>
        </div>

        <div className="p-4 space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <SummaryCard label="Total" value={totalProblems} />
            <SummaryCard
              label="Duplicates"
              value={parseResult.duplicate_count}
              muted
            />
            <SummaryCard
              label="New Patterns"
              value={newPatterns}
              highlight={newPatterns > 0}
            />
            <SummaryCard label="Existing" value={existingPatterns} muted />
          </div>

          {/* Difficulty Breakdown */}
          <div className="bg-muted/30 rounded-lg p-3">
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
              Difficulty Breakdown
            </div>
            <div className="flex items-center gap-4 font-mono text-sm">
              <DifficultyPill label="Easy" count={difficulties.easy} color="green" />
              <DifficultyPill label="Medium" count={difficulties.medium} color="orange" />
              <DifficultyPill label="Hard" count={difficulties.hard} color="red" />
            </div>
          </div>

          {/* New Patterns Preview */}
          {newPatterns > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                Patterns to Create ({newPatterns})
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                {patternsToCreate.slice(0, 15).map((pattern) => (
                  <span
                    key={pattern}
                    className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-xs font-mono"
                  >
                    {pattern}
                  </span>
                ))}
                {newPatterns > 15 && (
                  <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded text-xs font-mono">
                    +{newPatterns - 15} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Invalid Rows Warning */}
          {invalidRows.length > 0 && (
            <div className="bg-orange-400/10 border border-orange-400/20 rounded-lg p-3">
              <div className="text-xs font-mono text-orange-400 uppercase tracking-wider mb-2">
                Invalid Rows ({invalidRows.length}) - Will be skipped
              </div>
              <div className="space-y-1 max-h-20 overflow-y-auto font-mono text-xs">
                {invalidRows.slice(0, 3).map((row) => (
                  <div key={row.row_number} className="text-muted-foreground">
                    Row {row.row_number}: {row.error}
                  </div>
                ))}
                {invalidRows.length > 3 && (
                  <div className="text-muted-foreground">
                    +{invalidRows.length - 3} more errors
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} size="sm" className="font-mono text-xs">
          <ArrowLeft className="h-3 w-3 mr-1.5" />
          Back
        </Button>
        <Button onClick={onConfirm} size="sm" className="font-mono text-xs">
          Start Import
          <Play className="h-3 w-3 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

// Summary Card Component
function SummaryCard({
  label,
  value,
  muted,
  highlight,
}: {
  label: string;
  value: number;
  muted?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-2.5",
        highlight ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-border"
      )}
    >
      <div className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
        {label}
      </div>
      <div
        className={cn(
          "text-lg font-bold font-mono mt-0.5",
          muted && "text-muted-foreground",
          highlight && "text-primary"
        )}
      >
        {value.toLocaleString()}
      </div>
    </div>
  );
}

// Difficulty Pill Component
function DifficultyPill({
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
    <div className="flex items-center gap-1.5">
      <span className={cn("font-bold", colorStyles[color])}>
        {count.toLocaleString()}
      </span>
      <span className="text-xs text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  );
}
