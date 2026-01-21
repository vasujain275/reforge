import ApiError from "@/components/ApiError";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import type { Problem } from "@/types";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
  Terminal,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

export default function RecordAttemptPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const problemId = searchParams.get("problem_id");
  const sessionId = searchParams.get("session_id");

  const [problem, setProblem] = useState<Problem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    confidence_score: 50,
    duration_minutes: 0,
    duration_seconds: 0,
    outcome: "passed" as "passed" | "failed",
    notes: "",
  });

  useEffect(() => {
    if (problemId) {
      fetchProblem();
    } else {
      setError("Problem ID is required");
      setLoading(false);
    }
  }, [problemId]);

  const fetchProblem = async () => {
    if (!problemId) return;

    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/problems/${problemId}`);
      setProblem(response.data.data);
    } catch (err: unknown) {
      console.error("Failed to fetch problem:", err);
      setError("Failed to load problem details");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const totalSeconds =
        formData.duration_minutes * 60 + formData.duration_seconds;

      const payload = {
        problem_id: parseInt(problemId!),
        session_id: sessionId ? parseInt(sessionId) : undefined,
        confidence_score: formData.confidence_score,
        duration_seconds: totalSeconds > 0 ? totalSeconds : undefined,
        outcome: formData.outcome,
        notes: formData.notes || undefined,
      };

      await api.post("/attempts", payload);

      // Navigate back based on where we came from
      if (sessionId) {
        navigate(`/dashboard/sessions/${sessionId}`);
      } else {
        navigate("/dashboard/problems");
      }
    } catch (err: unknown) {
      console.error("Failed to record attempt:", err);
      setError("Failed to record attempt. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Terminal className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-sm font-mono text-muted-foreground">
            Loading problem...
          </p>
        </div>
      </div>
    );
  }

  if (error && !problem) {
    return (
      <div className="flex-1 p-6">
        <ApiError message={error} onRetry={fetchProblem} />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to={sessionId ? `/dashboard/sessions/${sessionId}` : "/dashboard/problems"}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          {sessionId ? "Back to Session" : "Back to Problems"}
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Record Attempt</h2>
        <p className="text-muted-foreground mt-1 font-mono text-sm">
          Target: <span className="text-foreground">{problem?.title}</span>
        </p>
      </div>

      {error && <ApiError variant="inline" message={error} />}

      {/* Form */}
      <div className="max-w-2xl mt-6">
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <CardTitle>Attempt Details</CardTitle>
            </div>
            <CardDescription>
              Record your performance and notes for future reference
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Outcome */}
              <div className="space-y-2">
                <Label>
                  Outcome <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.outcome}
                  onValueChange={(value: "passed" | "failed") =>
                    setFormData({ ...formData, outcome: value })
                  }
                >
                  <SelectTrigger className="font-mono">
                    <SelectValue placeholder="Select outcome" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="passed">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Passed
                      </span>
                    </SelectItem>
                    <SelectItem value="failed">
                      <span className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Failed
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Confidence Score */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>
                    Confidence Score <span className="text-red-500">*</span>
                  </Label>
                  <span className="text-lg font-bold font-mono text-primary">
                    {formData.confidence_score}%
                  </span>
                </div>
                <Slider
                  value={[formData.confidence_score]}
                  onValueChange={(value) =>
                    setFormData({ ...formData, confidence_score: value[0] })
                  }
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground font-mono">
                  Current confidence level assessment
                </p>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (Optional)</Label>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="duration-minutes"
                        type="number"
                        min="0"
                        max="999"
                        placeholder="Minutes"
                        value={formData.duration_minutes || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            duration_minutes: parseInt(e.target.value) || 0,
                          })
                        }
                        className="pl-9 font-mono"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Minutes</p>
                  </div>
                  <div className="flex-1">
                    <Input
                      id="duration-seconds"
                      type="number"
                      min="0"
                      max="59"
                      placeholder="Seconds"
                      value={formData.duration_seconds || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          duration_seconds: parseInt(e.target.value) || 0,
                        })
                      }
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Seconds</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="What did you learn? What was challenging? Any observations?"
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  rows={5}
                  className="font-mono text-sm resize-none"
                />
                <p className="text-xs text-muted-foreground font-mono">
                  Optional: Technical notes, edge cases, optimization observations
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Save Attempt
                    </>
                  )}
                </Button>
                <Link
                  to={sessionId ? `/dashboard/sessions/${sessionId}` : "/dashboard/problems"}
                  className="flex-1"
                >
                  <Button type="button" variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* System Reference */}
        <Card className="mt-6 border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Terminal className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-foreground font-mono uppercase tracking-wider text-xs">
                  Confidence Metric Scale
                </p>
                <div className="space-y-1 text-muted-foreground font-mono text-xs">
                  <div><span className="text-foreground">0-25:</span> Requires solution review</div>
                  <div><span className="text-foreground">25-50:</span> Partial understanding, practice required</div>
                  <div><span className="text-foreground">50-75:</span> Functional implementation capability</div>
                  <div><span className="text-foreground">75-100:</span> Full mastery, optimization ready</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
