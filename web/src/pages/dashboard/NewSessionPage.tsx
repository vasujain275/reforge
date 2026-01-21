import ApiError from "@/components/ApiError";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import type {
  TemplateInfo,
  GenerateSessionResponse,
  Pattern,
} from "@/types";
import { ArrowLeft, Loader2, Play, Terminal, Activity } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TemplateGallery } from "@/components/sessions/TemplateGallery";
import { motion, AnimatePresence } from "framer-motion";

export default function NewSessionPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("");
  const [selectedPatternId, setSelectedPatternId] = useState<number | null>(
    null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSession, setGeneratedSession] =
    useState<GenerateSessionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Pattern-specific templates that need pattern selection
  const PATTERN_TEMPLATES = [
    "pattern_deep_dive",
    "pattern_graduation",
  ];

  const selectedTemplate = templates.find(
    (t) => t.key === selectedTemplateKey
  );
  const needsPatternSelection =
    selectedTemplate && PATTERN_TEMPLATES.includes(selectedTemplate.key);

  // Fetch templates on mount
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await api.get<{ data: { presets: TemplateInfo[] } }>(
          "/sessions/templates"
        );
        setTemplates(response.data.data.presets);
      } catch (err: any) {
        console.error("Failed to fetch templates:", err);
        setError("Failed to load templates. Please refresh the page.");
      } finally {
        setIsLoadingTemplates(false);
      }
    };

    fetchTemplates();
  }, []);

  // Fetch patterns when needed
  useEffect(() => {
    if (needsPatternSelection && patterns.length === 0) {
      const fetchPatterns = async () => {
        try {
          const response = await api.get<{ data: Pattern[] }>("/patterns");
          setPatterns(response.data.data);
        } catch (err: any) {
          console.error("Failed to fetch patterns:", err);
        }
      };
      fetchPatterns();
    }
  }, [needsPatternSelection, patterns.length]);

  const handleTemplateSelect = (templateKey: string) => {
    setSelectedTemplateKey(templateKey);
    setSelectedPatternId(null);
    setGeneratedSession(null);
    setError(null);
  };

  const handleGenerateSession = async () => {
    if (!selectedTemplateKey) return;
    if (needsPatternSelection && !selectedPatternId) {
      setError("Please select a pattern for this template.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    try {
      const params: any = { template_key: selectedTemplateKey };
      if (selectedPatternId) {
        params.pattern_id = selectedPatternId;
      }

      const response = await api.post<{ data: GenerateSessionResponse }>(
        "/sessions/generate",
        params
      );
      setGeneratedSession(response.data.data);
    } catch (err: any) {
      console.error("Failed to generate session:", err);

      if (err.response?.data?.error?.message) {
        setError(err.response.data.error.message);
      } else if (err.response?.status === 400) {
        setError(
          "Unable to generate session with current problems. Try adding more problems or selecting a different template."
        );
      } else {
        setError("Failed to generate session. Please ensure the backend is running.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartSession = async () => {
    if (!generatedSession) return;

    setError(null);
    try {
      await api.post("/sessions", {
        template_key: selectedTemplateKey,
        session_name: generatedSession.template_name,
        planned_duration_min: generatedSession.planned_duration_min,
        problem_ids: generatedSession.problems.map((p) => p.id),
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
        <div className="flex items-center gap-3 mb-2">
          <Activity className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold tracking-tight">
            Session Generator Online
          </h2>
        </div>
        <p className="text-muted-foreground font-mono text-sm">
          $ reforge session --generate --smart
        </p>
      </div>

      {error && (
        <ApiError
          variant="inline"
          message={error}
          onRetry={generatedSession ? undefined : handleGenerateSession}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
        {/* Left: Template Selection */}
        <div className="space-y-6">
          {isLoadingTemplates ? (
            <Card className="border">
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground font-mono">
                    Loading templates...
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <TemplateGallery
                templates={templates}
                selectedKey={selectedTemplateKey}
                onSelect={handleTemplateSelect}
              />

              {/* Pattern Selection for pattern-specific templates */}
              <AnimatePresence>
                {needsPatternSelection && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="border-2 border-primary/50">
                      <CardHeader>
                        <CardTitle className="text-sm font-mono uppercase tracking-wider">
                          Pattern Selection Required
                        </CardTitle>
                        <CardDescription>
                          This template focuses on a specific pattern
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Label>Select Pattern</Label>
                        <Select
                          value={selectedPatternId?.toString() || ""}
                          onValueChange={(val) =>
                            setSelectedPatternId(parseInt(val))
                          }
                        >
                          <SelectTrigger className="font-mono mt-2">
                            <SelectValue placeholder="Choose a pattern..." />
                          </SelectTrigger>
                          <SelectContent>
                            {patterns.map((pattern) => (
                              <SelectItem
                                key={pattern.id}
                                value={pattern.id.toString()}
                              >
                                {pattern.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Generate Button */}
              {selectedTemplate && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                  <Button
                    onClick={handleGenerateSession}
                    disabled={
                      isGenerating ||
                      (needsPatternSelection && !selectedPatternId)
                    }
                    className="w-full h-12"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span className="font-mono">Generating...</span>
                      </>
                    ) : (
                      <>
                        <Terminal className="h-4 w-4 mr-2" />
                        <span className="font-mono">Generate Session</span>
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* Right: Generated Session Preview */}
        <div>
          <Card className="border h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider">
                <Terminal className="h-5 w-5" />
                Session Preview
              </CardTitle>
              <CardDescription>
                {generatedSession
                  ? `${generatedSession.problems.length} problems selected`
                  : "Problems will appear here after generation"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!generatedSession ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Terminal className="h-16 w-16 mx-auto mb-4 opacity-30" />
                  <p className="font-mono text-sm">
                    $ reforge session --preview
                  </p>
                  <p className="text-xs mt-2">
                    Generate a session to see problem selection
                  </p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-4"
                >
                  {/* Session Info */}
                  <div className="p-4 bg-muted/30 border rounded-lg space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Template
                      </span>
                      <span className="font-mono text-sm font-semibold">
                        {generatedSession.template_name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Duration
                      </span>
                      <span className="font-mono text-sm font-semibold">
                        {generatedSession.planned_duration_min} min
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">
                        Problems
                      </span>
                      <span className="font-mono text-sm font-semibold">
                        {generatedSession.problems.length}
                      </span>
                    </div>
                  </div>

                  {/* Problem List */}
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {generatedSession.problems.map((problem, index) => (
                      <motion.div
                        key={problem.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold font-mono text-xs flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium truncate">
                              {problem.title}
                            </span>
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-md font-mono uppercase tracking-wider ${
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
                          <p className="text-xs text-muted-foreground mt-1">
                            {problem.reason}
                          </p>
                          <div className="flex gap-3 mt-2 text-xs font-mono text-muted-foreground">
                            <span>Score: {problem.score.toFixed(2)}</span>
                            <span>Confidence: {problem.confidence}%</span>
                            {problem.days_since_last !== undefined && (
                              <span>
                                Last: {problem.days_since_last}d ago
                              </span>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Start Session Button */}
                  <Button
                    onClick={handleStartSession}
                    className="w-full h-12"
                    size="lg"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    <span className="font-mono">Start Session</span>
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
