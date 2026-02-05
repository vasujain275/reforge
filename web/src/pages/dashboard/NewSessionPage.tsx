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
import { Slider } from "@/components/ui/slider";
import { api } from "@/lib/api";
import type {
  TemplateInfo,
  GenerateSessionResponse,
  Pattern,
} from "@/types";
import { ArrowLeft, Loader2, Play, Sparkles, Activity, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TemplateGallery } from "@/components/sessions/TemplateGallery";
import { PriorityBadge } from "@/components/sessions/PriorityBadge";
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
  const [customDuration, setCustomDuration] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSession, setGeneratedSession] =
    useState<GenerateSessionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Duration presets (in minutes)
  const DURATION_PRESETS = [30, 45, 60, 90, 120];

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
      } catch (err: unknown) {
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
        } catch (err: unknown) {
          console.error("Failed to fetch patterns:", err);
        }
      };
      fetchPatterns();
    }
  }, [needsPatternSelection, patterns.length]);

  const handleTemplateSelect = (templateKey: string) => {
    setSelectedTemplateKey(templateKey);
    setSelectedPatternId(null);
    setCustomDuration(null); // Reset to template default
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
      const params: { template_key: string; pattern_id?: number; duration_min?: number } = { 
        template_key: selectedTemplateKey 
      };
      if (selectedPatternId) {
        params.pattern_id = selectedPatternId;
      }
      if (customDuration !== null) {
        params.duration_min = customDuration;
      }

      const response = await api.post<{ data: GenerateSessionResponse }>(
        "/sessions/generate",
        params
      );
      setGeneratedSession(response.data.data);
    } catch (err: unknown) {
      console.error("Failed to generate session:", err);

      const apiErr = err as { response?: { data?: { error?: { message?: string } }; status?: number } };
      if (apiErr.response?.data?.error?.message) {
        setError(apiErr.response.data.error.message);
      } else if (apiErr.response?.status === 400) {
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
      const response = await api.post<{ data: { id: number } }>("/sessions", {
        template_key: selectedTemplateKey,
        session_name: generatedSession.template_name,
        planned_duration_min: generatedSession.planned_duration_min,
        problem_ids: generatedSession.problems.map((p) => p.id),
      });
      
      // Redirect to the newly created session detail page
      const sessionId = response.data.data.id;
      navigate(`/dashboard/sessions/${sessionId}`);
    } catch (err: unknown) {
      console.error("Failed to start session:", err);

      const apiErr = err as { response?: { data?: { error?: { message?: string } } } };
      if (apiErr.response?.data?.error?.message) {
        setError(apiErr.response.data.error.message);
      } else {
        setError("Failed to start session. Please try again.");
      }
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/dashboard/sessions"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sessions
        </Link>
        <div className="flex items-center gap-3">
          <Sparkles className="h-7 w-7 md:h-8 md:w-8 text-primary flex-shrink-0" />
          <h2 className="text-2xl md:text-3xl font-bold">
            Generate Session
          </h2>
        </div>
        <p className="text-muted-foreground text-sm md:text-base mt-2">
          Create a custom practice session based on your goals
        </p>
      </div>

      {error && (
        <ApiError
          variant="inline"
          message={error}
          onRetry={generatedSession ? undefined : handleGenerateSession}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mt-6">
        {/* Left: Template Selection */}
        <div className="space-y-4">
          {isLoadingTemplates ? (
            <Card className="border">
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
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
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">
                          Pattern Selection Required
                        </CardTitle>
                        <CardDescription className="text-xs">
                          This template focuses on a specific pattern
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <Label className="text-xs">Select Pattern</Label>
                        <Select
                          value={selectedPatternId?.toString() || ""}
                          onValueChange={(val) =>
                            setSelectedPatternId(parseInt(val))
                          }
                        >
                          <SelectTrigger className="mt-2 text-sm">
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

              {/* Duration Customization */}
              <AnimatePresence>
                {selectedTemplate && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="border">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4" />
                          Session Duration
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Adjust the time budget for your session
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Quick Presets */}
                        <div className="flex flex-wrap gap-2">
                          {DURATION_PRESETS.map((mins) => (
                            <Button
                              key={mins}
                              variant={
                                customDuration === mins ||
                                (!customDuration && selectedTemplate.duration_min === mins)
                                  ? "default"
                                  : "outline"
                              }
                              size="sm"
                              className="font-mono text-xs"
                              onClick={() => setCustomDuration(mins)}
                            >
                              {mins}m
                            </Button>
                          ))}
                        </div>

                        {/* Slider */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>15 min</span>
                            <span className="font-mono font-semibold text-foreground">
                              {customDuration ?? selectedTemplate.duration_min} min
                            </span>
                            <span>180 min</span>
                          </div>
                          <Slider
                            value={[customDuration ?? selectedTemplate.duration_min]}
                            min={15}
                            max={180}
                            step={5}
                            onValueChange={([value]) => setCustomDuration(value)}
                            className="w-full"
                          />
                        </div>

                        {customDuration !== null && customDuration !== selectedTemplate.duration_min && (
                          <p className="text-[10px] text-muted-foreground">
                            Template default: {selectedTemplate.duration_min} min
                          </p>
                        )}
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
                    className="w-full h-11"
                    size="lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        <span className="text-sm">Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        <span className="text-sm">Generate Session</span>
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </div>

        {/* Right: Generated Session Preview */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card className="border h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Play className="h-4 w-4 md:h-5 md:w-5" />
                Session Preview
              </CardTitle>
              <CardDescription className="text-xs">
                {generatedSession
                  ? `${generatedSession.problems.length} problems selected`
                  : "Problems will appear here after generation"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!generatedSession ? (
                <div className="text-center py-12 md:py-16 text-muted-foreground">
                  <Play className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 opacity-30" />
                  <p className="text-sm">
                    Generate a session to see problem selection
                  </p>
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="space-y-3 md:space-y-4"
                >
                  {/* Session Info */}
                  <div className="p-3 md:p-4 bg-muted/30 border rounded-lg space-y-2">
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Template
                      </span>
                      <span className="text-xs md:text-sm font-semibold text-right">
                        {generatedSession.template_name}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        Duration
                      </span>
                      <span className="font-mono text-xs md:text-sm font-semibold">
                        {generatedSession.planned_duration_min} min
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        Problems
                      </span>
                      <span className="font-mono text-xs md:text-sm font-semibold">
                        {generatedSession.problems.length}
                      </span>
                    </div>
                  </div>

                  {/* Problem List */}
                  <div className="space-y-2 max-h-[400px] md:max-h-[500px] overflow-y-auto">
                    {generatedSession.problems.map((problem, index) => (
                      <motion.div
                        key={problem.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="flex items-start gap-2 md:gap-3 p-2 md:p-3 border rounded-lg hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-center w-5 h-5 md:w-6 md:h-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] md:text-xs flex-shrink-0">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                            <span className="font-medium text-xs md:text-sm break-words">
                              {problem.title}
                            </span>
                            <span
                              className={`text-[10px] md:text-xs px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                                problem.difficulty === "hard"
                                  ? "bg-red-500/10 text-red-500"
                                  : problem.difficulty === "medium"
                                  ? "bg-orange-500/10 text-orange-500"
                                  : "bg-green-500/10 text-green-500"
                              }`}
                            >
                              {problem.difficulty}
                            </span>
                            <PriorityBadge
                              priority={problem.priority}
                              daysUntilDue={problem.days_until_due}
                            />
                          </div>
                          <p className="text-[10px] md:text-xs text-muted-foreground mt-1 line-clamp-2">
                            {problem.reason}
                          </p>
                          <div className="flex gap-2 md:gap-3 mt-1.5 md:mt-2 text-[10px] md:text-xs font-mono text-muted-foreground flex-wrap">
                            <span className="whitespace-nowrap">Score: {problem.score.toFixed(2)}</span>
                            <span className="whitespace-nowrap">Confidence: {problem.confidence}%</span>
                            {problem.days_since_last !== undefined && (
                              <span className="whitespace-nowrap">
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
                    className="w-full h-11"
                    size="lg"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    <span className="text-sm">Start Session</span>
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
