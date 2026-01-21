import ApiError from "@/components/ApiError";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { SessionTemplate, UrgentProblem } from "@/types";
import { ArrowLeft, Clock, Loader2, Play, Terminal, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

const SESSION_TEMPLATES: SessionTemplate[] = [
  {
    key: "daily_revision",
    display_name: "Daily Revision",
    icon: "⚡",
    duration_min: 35,
    estimated_problems: "3-4 problems",
    description: "Quick daily practice for consistent progress",
    max_difficulty: "medium",
  },
  {
    key: "daily_mixed",
    display_name: "Daily Mixed",
    icon: "📚",
    duration_min: 55,
    estimated_problems: "4-6 problems",
    description: "Balanced mix of revision and new challenges",
    max_difficulty: "hard",
  },
  {
    key: "weekend_comprehensive",
    display_name: "Weekend Deep Dive",
    icon: "🏖️",
    duration_min: 150,
    estimated_problems: "10-12 problems",
    description: "Comprehensive weekend practice session",
    max_difficulty: "hard",
  },
];

export default function NewSessionPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProblems, setGeneratedProblems] = useState<UrgentProblem[]>(
    []
  );
  const [customDuration, setCustomDuration] = useState("35");
  const [error, setError] = useState<string | null>(null);

  // Pre-select template from URL params
  useEffect(() => {
    const templateFromUrl = searchParams.get("template");
    if (templateFromUrl) {
      const template = SESSION_TEMPLATES.find((t) => t.key === templateFromUrl);
      if (template) {
        setSelectedTemplate(templateFromUrl);
        setCustomDuration(template.duration_min.toString());
      }
    }
  }, [searchParams]);

  const handleGenerateSession = async () => {
    if (!selectedTemplate) return;

    setIsGenerating(true);
    setError(null);
    try {
      const response = await api.post("/sessions/generate", {
        template_key: selectedTemplate,
        duration_min: parseInt(customDuration),
      });
      setGeneratedProblems(response.data.data?.problems || []);
    } catch (err: any) {
      console.error("Failed to generate session:", err);
      
      // Check if it's a validation error from backend with user-friendly message
      if (err.response?.data?.error?.message) {
        setError(err.response.data.error.message);
      } else if (err.response?.status === 400) {
        setError("Unable to generate session with current problems. Try adding more problems or selecting a different template.");
      } else {
        setError("Failed to generate session. Please ensure the backend is running.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartSession = async () => {
    setError(null);
    try {
      await api.post("/sessions", {
        template_key: selectedTemplate,
        planned_duration_min: parseInt(customDuration),
        problem_ids: generatedProblems.map((p) => p.id),
      });
      navigate("/dashboard/sessions");
    } catch (err: any) {
      console.error("Failed to start session:", err);
      
      if (err.response?.data?.error?.message) {
        setError(err.response.data.error.message);
      } else {
        setError("Failed to start session. Please try again.");
      }
    }
  };

  const selectedTemplateData = SESSION_TEMPLATES.find(
    (t) => t.key === selectedTemplate
  );

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/dashboard/sessions"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sessions
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Session Builder</h2>
        <p className="text-muted-foreground mt-1">
          Generate an optimized practice session based on your progress
        </p>
      </div>

      {error && (
        <ApiError
          variant="inline"
          message={error}
          onRetry={handleGenerateSession}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Left: Configuration */}
        <div className="space-y-6">
          {/* Template Selection */}
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <CardTitle>Choose Template</CardTitle>
              </div>
              <CardDescription>
                Select a session template or customize your own
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-3">
                {SESSION_TEMPLATES.map((template) => (
                  <button
                    key={template.key}
                    onClick={() => {
                      setSelectedTemplate(template.key);
                      setCustomDuration(template.duration_min.toString());
                      setGeneratedProblems([]);
                      setError(null);
                    }}
                    className={`p-4 border-2 rounded-lg text-left transition-all ${
                      selectedTemplate === template.key
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{template.icon}</div>
                      <div className="flex-1">
                        <div className="font-semibold">
                          {template.display_name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {template.duration_min} min ·{" "}
                          {template.estimated_problems}
                        </div>
                      </div>
                      {selectedTemplate === template.key && (
                        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Duration */}
              {selectedTemplate && (
                <div className="space-y-2 pt-4 border-t">
                  <Label>Duration (minutes)</Label>
                  <Select
                    value={customDuration}
                    onValueChange={setCustomDuration}
                  >
                    <SelectTrigger className="font-mono">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="20">20 min</SelectItem>
                      <SelectItem value="35">35 min</SelectItem>
                      <SelectItem value="55">55 min</SelectItem>
                      <SelectItem value="90">90 min</SelectItem>
                      <SelectItem value="120">120 min</SelectItem>
                      <SelectItem value="150">150 min</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Generate Button */}
              <Button
                onClick={handleGenerateSession}
                disabled={!selectedTemplate || isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating optimal session...
                  </>
                ) : (
                  <>
                    <Terminal className="h-4 w-4 mr-2" />
                    Generate Session
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Template Info */}
          {selectedTemplateData && (
            <Card className="bg-muted/30 border-dashed">
              <CardContent className="pt-6">
                <div className="flex gap-4">
                  <div className="text-3xl">{selectedTemplateData.icon}</div>
                  <div>
                    <h4 className="font-semibold">
                      {selectedTemplateData.display_name}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {selectedTemplateData.description}
                    </p>
                    <div className="flex gap-4 mt-3 text-xs font-mono text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {selectedTemplateData.duration_min} min
                      </span>
                      <span>Max: {selectedTemplateData.max_difficulty}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Generated Problems */}
        <div>
          <Card className="border-2 h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Generated Problems
              </CardTitle>
              <CardDescription>
                {generatedProblems.length > 0
                  ? `${generatedProblems.length} problems selected for revision`
                  : "Problems will appear here after generation"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {generatedProblems.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-mono text-sm">
                    $ reforge session --generate
                  </p>
                  <p className="text-xs mt-2">
                    Select a template and generate to see problems
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {generatedProblems.map((problem, index) => (
                    <div
                      key={problem.id}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold font-mono text-xs">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {problem.title}
                          </span>
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                              problem.difficulty === "hard"
                                ? "bg-red-500/10 text-red-500"
                                : problem.difficulty === "medium"
                                ? "bg-orange-500/10 text-orange-500"
                                : "bg-green-500/10 text-green-500"
                            }`}
                          >
                            {problem.difficulty}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {problem.reason}
                        </p>
                      </div>
                      <div className="text-right font-mono text-sm text-primary">
                        {problem.score.toFixed(2)}
                      </div>
                    </div>
                  ))}

                  {/* Total Estimate */}
                  <div className="pt-4 border-t mt-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Estimated Duration
                      </span>
                      <span className="font-mono font-semibold">
                        {customDuration} min
                      </span>
                    </div>
                  </div>

                  {/* Start Session Button */}
                  <Button
                    onClick={handleStartSession}
                    className="w-full mt-4"
                    size="lg"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Session
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
