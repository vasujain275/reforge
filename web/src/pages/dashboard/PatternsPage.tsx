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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api";
import type { PatternWithStats } from "@/types";
import {
  Network,
  Plus,
  Terminal,
  TrendingDown,
  TrendingUp,
  Edit,
  Trash2,
  Save,
} from "lucide-react";
import { useEffect, useState } from "react";

export default function PatternsPage() {
  const [patterns, setPatterns] = useState<PatternWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPattern, setEditingPattern] = useState<PatternWithStats | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });

  useEffect(() => {
    fetchPatterns();
  }, []);

  const fetchPatterns = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/patterns");
      setPatterns(response.data.data || []);
    } catch (err: unknown) {
      console.error("Failed to fetch patterns:", err);
      setError(
        "Failed to load patterns. Please ensure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingPattern(null);
    setFormData({ title: "", description: "" });
    setIsDialogOpen(true);
  };

  const openEditDialog = (pattern: PatternWithStats) => {
    setEditingPattern(pattern);
    setFormData({
      title: pattern.title,
      description: pattern.description || "",
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      setError("Pattern title is required");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      if (editingPattern) {
        // Update existing pattern
        await api.put(`/patterns/${editingPattern.id}`, {
          title: formData.title,
          description: formData.description || undefined,
        });
      } else {
        // Create new pattern
        await api.post("/patterns", {
          title: formData.title,
          description: formData.description || undefined,
        });
      }
      setIsDialogOpen(false);
      fetchPatterns();
    } catch (err: unknown) {
      console.error("Failed to save pattern:", err);
      setError("Failed to save pattern. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (patternId: number) => {
    if (!confirm("Are you sure you want to delete this pattern?")) return;

    try {
      await api.delete(`/patterns/${patternId}`);
      fetchPatterns();
    } catch (err: unknown) {
      console.error("Failed to delete pattern:", err);
      setError("Failed to delete pattern. Please try again.");
    }
  };

  const sortedPatterns = [...patterns].sort(
    (a, b) => (a.stats?.avg_confidence || 0) - (b.stats?.avg_confidence || 0)
  );

  const getDaysSinceLastRevised = (date?: string) => {
    if (!date) return "Never";
    const days = Math.floor(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Terminal className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-sm font-mono text-muted-foreground">
            Loading patterns...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return <ApiError message={error} onRetry={fetchPatterns} />;
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight font-mono uppercase">
            PATTERN REGISTRY
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Track mastery across problem-solving patterns
          </p>
        </div>
        <Button className="rounded-md" onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Initialize Pattern
        </Button>
      </div>

      {/* Pattern Stats Overview */}
      {patterns.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-md border border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Total Patterns
              </CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {String(patterns.length).padStart(3, "0")}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                Covering{" "}
                {patterns.reduce((acc, p) => acc + (p.problemCount || 0), 0)}{" "}
                problems
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-md border border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Strongest
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold font-mono">
                {sortedPatterns[sortedPatterns.length - 1]?.title || "N/A"}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {sortedPatterns[sortedPatterns.length - 1]?.stats
                  ?.avg_confidence || 0}
                % confidence
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-md border border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Needs Work
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold font-mono">
                {sortedPatterns[0]?.title || "N/A"}
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                {sortedPatterns[0]?.stats?.avg_confidence || 0}% confidence
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Patterns List */}
      <div className="space-y-3">
        {patterns.length === 0 ? (
          <Card className="rounded-md border border-border">
            <CardContent className="py-12 text-center">
              <Network className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground font-mono uppercase tracking-wider text-sm">
                No Patterns Registered
              </p>
              <Button className="mt-4 rounded-md" onClick={openCreateDialog}>
                Initialize First Pattern
              </Button>
            </CardContent>
          </Card>
        ) : (
          sortedPatterns.map((pattern) => (
            <Card
              key={pattern.id}
              className="rounded-md border border-border hover:border-primary/50 transition-colors"
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg font-mono">
                      {pattern.title}
                    </CardTitle>
                    {pattern.description && (
                      <CardDescription className="mt-1">
                        {pattern.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold font-mono text-primary">
                        {pattern.stats?.avg_confidence || 0}%
                      </div>
                      <div className="text-xs text-muted-foreground font-mono uppercase tracking-wider">
                        Confidence
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-md"
                        onClick={() => openEditDialog(pattern)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-md text-red-500 hover:text-red-600 hover:bg-red-500/10"
                        onClick={() => handleDelete(pattern.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Progress
                    value={pattern.stats?.avg_confidence || 0}
                    className="h-2"
                  />
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="font-mono">
                        {String(pattern.problemCount || 0).padStart(2, "0")}{" "}
                        problems
                      </span>
                      <span className="font-mono">
                        {String(pattern.stats?.times_revised || 0).padStart(
                          2,
                          "0"
                        )}{" "}
                        revisions
                      </span>
                    </div>
                    <span className="font-mono text-xs">
                      Last:{" "}
                      {getDaysSinceLastRevised(pattern.stats?.last_revised_at)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create/Edit Pattern Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-md">
          <DialogHeader>
            <DialogTitle className="font-mono uppercase tracking-wider">
              {editingPattern ? "Edit Pattern" : "Initialize Pattern"}
            </DialogTitle>
            <DialogDescription>
              {editingPattern
                ? "Update pattern information"
                : "Create a new problem-solving pattern"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="font-mono uppercase tracking-wider text-xs">
                Pattern Title
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Two Pointers, Sliding Window"
                className="rounded-md font-mono"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="font-mono uppercase tracking-wider text-xs">
                Description (Optional)
              </Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe this pattern..."
                className="rounded-md"
                rows={3}
              />
            </div>
            {error && (
              <p className="text-sm text-red-500 font-mono">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="rounded-md"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-md"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Saving..." : editingPattern ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
