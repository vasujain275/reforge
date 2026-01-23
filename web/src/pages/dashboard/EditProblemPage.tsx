import ApiError from "@/components/ApiError";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import type { Pattern, Problem } from "@/types";
import {
  ArrowLeft,
  Check,
  ChevronsUpDown,
  Link as LinkIcon,
  Loader2,
  Plus,
  Save,
  Terminal,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

export default function EditProblemPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [selectedPatterns, setSelectedPatterns] = useState<number[]>([]);
  const [open, setOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    source: "",
    url: "",
    difficulty: "medium" as "easy" | "medium" | "hard",
  });

  useEffect(() => {
    fetchProblem();
    fetchPatterns();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetchProblem/fetchPatterns are stable callbacks, only re-run when id changes
  }, [id]);

  const fetchProblem = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get(`/problems/${id}`);
      const problem: Problem = response.data.data;
      
      setFormData({
        title: problem.title,
        source: problem.source || "",
        url: problem.url || "",
        difficulty: problem.difficulty,
      });

      // Set selected patterns if they exist
      if (problem.patterns && problem.patterns.length > 0) {
        setSelectedPatterns(problem.patterns.map((p) => p.id));
      }
    } catch (err: unknown) {
      console.error("Failed to fetch problem:", err);
      setError("Failed to load problem. Please ensure the backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPatterns = async () => {
    try {
      const response = await api.get("/patterns");
      setPatterns(response.data.data || []);
    } catch (err: unknown) {
      console.error("Failed to fetch patterns:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        ...formData,
        pattern_ids: selectedPatterns.length > 0 ? selectedPatterns : undefined,
      };
      await api.put(`/problems/${id}`, payload);
      navigate("/dashboard/problems");
    } catch (err: unknown) {
      console.error("Failed to update problem:", err);
      setError(
        "Failed to update problem. Please ensure the backend is running."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePattern = (patternId: number) => {
    setSelectedPatterns((prev) =>
      prev.includes(patternId)
        ? prev.filter((id) => id !== patternId)
        : [...prev, patternId]
    );
  };

  const removePattern = (patternId: number) => {
    setSelectedPatterns((prev) => prev.filter((id) => id !== patternId));
  };

  if (isLoading) {
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

  if (error && !formData.title) {
    return <ApiError message={error} onRetry={fetchProblem} />;
  }

  return (
    <div className="flex-1 p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/dashboard/problems"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Problems
        </Link>
        <h2 className="text-3xl font-bold tracking-tight">Edit Problem</h2>
        <p className="text-muted-foreground mt-1 font-mono text-sm">
          Update problem configuration
        </p>
      </div>

      {error && <ApiError variant="inline" message={error} />}

      {/* Form */}
      <div className="max-w-2xl mt-6">
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <CardTitle>Problem Details</CardTitle>
            </div>
            <CardDescription>
              Modify problem metadata and configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Problem Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., Two Sum, LRU Cache"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                  className="font-mono"
                />
              </div>

              {/* Source */}
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  placeholder="e.g., LeetCode, NeetCode 150, Blind 75"
                  value={formData.source}
                  onChange={(e) =>
                    setFormData({ ...formData, source: e.target.value })
                  }
                  className="font-mono"
                />
              </div>

              {/* URL */}
              <div className="space-y-2">
                <Label htmlFor="url">Problem URL</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://leetcode.com/problems/..."
                    value={formData.url}
                    onChange={(e) =>
                      setFormData({ ...formData, url: e.target.value })
                    }
                    className="pl-9 font-mono"
                  />
                </div>
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <Label>
                  Difficulty <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value: "easy" | "medium" | "hard") =>
                    setFormData({ ...formData, difficulty: value })
                  }
                >
                  <SelectTrigger className="font-mono">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-green-500" />
                        Easy
                      </span>
                    </SelectItem>
                    <SelectItem value="medium">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-500" />
                        Medium
                      </span>
                    </SelectItem>
                    <SelectItem value="hard">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        Hard
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Patterns Section */}
              <div className="space-y-2">
                <Label className="font-mono text-xs uppercase tracking-wider">
                  Patterns (Optional)
                </Label>
                <p className="text-xs text-muted-foreground mb-2 font-mono">
                  Link patterns for statistics aggregation
                </p>

                {/* Selected Patterns */}
                {selectedPatterns.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {selectedPatterns.map((patternId) => {
                      const pattern = patterns.find((p) => p.id === patternId);
                      return (
                        <div
                          key={patternId}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-mono border border-primary/20"
                        >
                          <span>{pattern?.title}</span>
                          <button
                            type="button"
                            onClick={() => removePattern(patternId)}
                            className="hover:bg-primary/20 rounded-md p-0.5"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pattern Selector */}
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={open}
                      className="w-full justify-between font-mono"
                    >
                      <span className="flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Link Pattern
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search patterns..."
                        className="font-mono"
                      />
                      <CommandList>
                        <CommandEmpty className="font-mono text-xs">
                          No patterns found
                        </CommandEmpty>
                        <CommandGroup>
                          {patterns.map((pattern) => (
                            <CommandItem
                              key={pattern.id}
                              value={pattern.title}
                              onSelect={() => {
                                togglePattern(pattern.id);
                              }}
                              className="font-mono"
                            >
                              <Checkbox
                                checked={selectedPatterns.includes(pattern.id)}
                                className="mr-2"
                              />
                              <div className="flex-1">
                                <div className="font-medium font-mono text-xs">
                                  {pattern.title}
                                </div>
                                {pattern.description && (
                                  <div className="text-xs text-muted-foreground font-mono">
                                    {pattern.description}
                                  </div>
                                )}
                              </div>
                              {selectedPatterns.includes(pattern.id) && (
                                <Check className="h-4 w-4 text-primary" />
                              )}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4 border-t">
                <Button
                  type="submit"
                  disabled={isSubmitting || !formData.title}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
                <Link to="/dashboard/problems" className="flex-1">
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
                  Update Guidelines
                </p>
                <div className="space-y-1 text-muted-foreground font-mono text-xs">
                  <div>Maintain consistent naming conventions</div>
                  <div>Pattern changes affect metric aggregation</div>
                  <div>Existing attempts remain unchanged</div>
                  <div className="text-primary">Ctrl+Enter: Submit form</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
