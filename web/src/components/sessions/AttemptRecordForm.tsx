import { useState } from "react";
import { CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";

interface AttemptRecordFormProps {
  problemId: number;
  sessionId: number;
  onSubmit: (data: {
    outcome: "passed" | "failed";
    confidence: number;
    duration_seconds?: number;
    notes?: string;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function AttemptRecordForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
}: AttemptRecordFormProps) {
  const [outcome, setOutcome] = useState<"passed" | "failed">("passed");
  const [confidence, setConfidence] = useState<number>(50);
  const [durationMinutes, setDurationMinutes] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const durationSeconds = durationMinutes
      ? parseInt(durationMinutes) * 60
      : undefined;

    onSubmit({
      outcome,
      confidence,
      duration_seconds: durationSeconds,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mt-4 border border-border rounded-md p-4 bg-secondary/20"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Outcome Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Outcome</Label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setOutcome("passed")}
              className={`
                flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md
                border transition-all duration-300
                ${
                  outcome === "passed"
                    ? "border-green-500 bg-green-500/10 text-green-500"
                    : "border-border bg-background hover:bg-secondary/50"
                }
              `}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-mono text-sm uppercase tracking-wider">
                Passed
              </span>
            </button>
            <button
              type="button"
              onClick={() => setOutcome("failed")}
              className={`
                flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md
                border transition-all duration-300
                ${
                  outcome === "failed"
                    ? "border-red-500 bg-red-500/10 text-red-500"
                    : "border-border bg-background hover:bg-secondary/50"
                }
              `}
            >
              <XCircle className="h-4 w-4" />
              <span className="font-mono text-sm uppercase tracking-wider">
                Failed
              </span>
            </button>
          </div>
        </div>

        {/* Confidence Slider */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <Label className="text-sm font-medium">Confidence</Label>
            <span className="font-mono text-sm text-muted-foreground">
              {confidence}%
            </span>
          </div>
          <Slider
            value={[confidence]}
            onValueChange={(value) => setConfidence(value[0])}
            min={0}
            max={100}
            step={5}
            className="w-full"
          />
        </div>

        {/* Duration Input */}
        <div className="space-y-2">
          <Label htmlFor="duration" className="text-sm font-medium">
            Duration (minutes) <span className="text-muted-foreground">(optional)</span>
          </Label>
          <div className="relative">
            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              id="duration"
              type="number"
              min="1"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="e.g., 25"
              className="
                w-full pl-10 pr-4 py-2 rounded-md
                bg-background border border-border
                focus:outline-none focus:ring-2 focus:ring-ring
                font-mono text-sm
              "
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="notes" className="text-sm font-medium">
            Notes <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Key insights, mistakes made, patterns observed..."
            className="resize-none h-20 font-mono text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 font-mono uppercase tracking-wider"
          >
            {isSubmitting ? "Recording..." : "Record Attempt"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-6 font-mono uppercase tracking-wider"
          >
            Cancel
          </Button>
        </div>
      </form>
    </motion.div>
  );
}
