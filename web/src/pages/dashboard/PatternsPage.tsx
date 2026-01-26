import ApiError from "@/components/ApiError";
import { SearchInput } from "@/components/SearchInput";
import {
  PatternsContentSkeleton,
  StatsOverviewSkeleton,
} from "@/components/ContentSkeleton";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  ArrowUpDown,
} from "lucide-react";
import { useState } from "react";
import { usePagination } from "@/hooks/usePagination";
import { usePatterns } from "@/hooks/queries";
import { DataPagination } from "@/components/DataPagination";
import { useQueryClient } from "@tanstack/react-query";

export default function PatternsPage() {
  const queryClient = useQueryClient();
  const {
    page,
    pageSize,
    localSearchQuery,
    setLocalSearchQuery,
    debouncedSearchQuery,
    setPage,
  } = usePagination();

  const [sortBy, setSortBy] = useState("confidence_asc");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPattern, setEditingPattern] =
    useState<PatternWithStats | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });

  // Use TanStack Query for data fetching
  const { data, isLoading, isFetching, error, refetch } = usePatterns({
    page,
    pageSize,
    searchQuery: debouncedSearchQuery,
    sortBy,
  });

  const openCreateDialog = () => {
    setEditingPattern(null);
    setFormData({ title: "", description: "" });
    setSaveError(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (pattern: PatternWithStats) => {
    setEditingPattern(pattern);
    setFormData({
      title: pattern.title,
      description: pattern.description || "",
    });
    setSaveError(null);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      setSaveError("Pattern title is required");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
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
      // Invalidate and refetch patterns
      queryClient.invalidateQueries({ queryKey: ["patterns"] });
    } catch (err: unknown) {
      console.error("Failed to save pattern:", err);
      setSaveError("Failed to save pattern. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (patternId: number) => {
    if (!confirm("Are you sure you want to delete this pattern?")) return;

    try {
      await api.delete(`/patterns/${patternId}`);
      // Invalidate and refetch patterns
      queryClient.invalidateQueries({ queryKey: ["patterns"] });
    } catch (err: unknown) {
      console.error("Failed to delete pattern:", err);
      setSaveError("Failed to delete pattern. Please try again.");
    }
  };

  const patterns = data?.data || [];

  const getDaysSinceLastRevised = (date?: string) => {
    if (!date) return "Never";
    const days = Math.floor(
      (Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24)
    );
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

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

      {/* Search and Sort Bar */}
      <Card className="rounded-md border border-border">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <SearchInput
                value={localSearchQuery}
                onChange={setLocalSearchQuery}
                placeholder="Search patterns by title..."
                isFetching={isFetching}
              />
            </div>
            <div className="w-64">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="rounded-md font-mono">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="confidence_asc" className="font-mono">
                    Confidence: Low to High
                  </SelectItem>
                  <SelectItem value="confidence_desc" className="font-mono">
                    Confidence: High to Low
                  </SelectItem>
                  <SelectItem value="times_revised_asc" className="font-mono">
                    Revisions: Low to High
                  </SelectItem>
                  <SelectItem value="times_revised_desc" className="font-mono">
                    Revisions: High to Low
                  </SelectItem>
                  <SelectItem value="problem_count_asc" className="font-mono">
                    Problems: Low to High
                  </SelectItem>
                  <SelectItem value="problem_count_desc" className="font-mono">
                    Problems: High to Low
                  </SelectItem>
                  <SelectItem value="last_revised_asc" className="font-mono">
                    Last Revised: Oldest First
                  </SelectItem>
                  <SelectItem value="last_revised_desc" className="font-mono">
                    Last Revised: Newest First
                  </SelectItem>
                  <SelectItem value="title_asc" className="font-mono">
                    Title: A to Z
                  </SelectItem>
                  <SelectItem value="title_desc" className="font-mono">
                    Title: Z to A
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {data && data.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground font-mono">
            Showing {data.page_size * (data.page - 1) + 1}-
            {Math.min(data.page_size * data.page, data.total)} of {data.total}{" "}
            patterns
          </p>
        </div>
      )}

      {/* Content: Skeleton on initial load, error state, or data */}
      {isLoading ? (
        <>
          <StatsOverviewSkeleton />
          <PatternsContentSkeleton count={5} />
        </>
      ) : error && !data ? (
        <ApiError
          message="Failed to load patterns. Please ensure the backend is running."
          onRetry={() => refetch()}
        />
      ) : (
        <>
          {/* Pattern Stats Overview */}
          {patterns.length > 0 && (
            <div
              className={`grid gap-4 md:grid-cols-3 transition-opacity duration-200 ${
                isFetching ? "opacity-50" : "opacity-100"
              }`}
            >
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
                    Covering {data?.unique_problem_count ?? 0} unique problems
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
                    {patterns.length > 0
                      ? patterns.reduce((max, p) =>
                          (p.stats?.avg_confidence || 0) >
                          (max.stats?.avg_confidence || 0)
                            ? p
                            : max
                        ).title
                      : "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {patterns.length > 0
                      ? patterns.reduce((max, p) =>
                          (p.stats?.avg_confidence || 0) >
                          (max.stats?.avg_confidence || 0)
                            ? p
                            : max
                        ).stats?.avg_confidence || 0
                      : 0}
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
                    {patterns.length > 0
                      ? patterns.reduce((min, p) =>
                          (p.stats?.avg_confidence || 0) <
                          (min.stats?.avg_confidence || 0)
                            ? p
                            : min
                        ).title
                      : "N/A"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-mono">
                    {patterns.length > 0
                      ? patterns.reduce((min, p) =>
                          (p.stats?.avg_confidence || 0) <
                          (min.stats?.avg_confidence || 0)
                            ? p
                            : min
                        ).stats?.avg_confidence || 0
                      : 0}
                    % confidence
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Patterns List */}
          <div
            className={`space-y-3 transition-opacity duration-200 ${
              isFetching ? "opacity-50" : "opacity-100"
            }`}
          >
            {!patterns || patterns.length === 0 ? (
              <Card className="rounded-md border border-border">
                <CardContent className="py-12 text-center">
                  <Terminal className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground font-mono uppercase tracking-wider text-sm">
                    {localSearchQuery
                      ? "No Patterns Match Your Search"
                      : "No Patterns Registered"}
                  </p>
                  {!localSearchQuery && (
                    <Button
                      className="mt-4 rounded-md"
                      onClick={openCreateDialog}
                    >
                      Initialize First Pattern
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              patterns.map((pattern) => (
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
                            {String(
                              pattern.stats?.times_revised || 0
                            ).padStart(2, "0")}{" "}
                            revisions
                          </span>
                        </div>
                        <span className="font-mono text-xs">
                          Last:{" "}
                          {getDaysSinceLastRevised(
                            pattern.stats?.last_revised_at
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Pagination */}
          {data && data.total > 0 && (
            <DataPagination
              currentPage={data.page}
              totalPages={data.total_pages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

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
              <Label
                htmlFor="title"
                className="font-mono uppercase tracking-wider text-xs"
              >
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
              <Label
                htmlFor="description"
                className="font-mono uppercase tracking-wider text-xs"
              >
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
            {saveError && (
              <p className="text-sm text-red-500 font-mono">{saveError}</p>
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
