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
import { api } from "@/lib/api";
import {
  ArrowLeft,
  Link as LinkIcon,
  Loader2,
  Plus,
  Terminal,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function NewProblemPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    source: "",
    url: "",
    difficulty: "medium" as "easy" | "medium" | "hard",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // TODO: Replace with actual API call
      await api.post("/problems", formData);
      navigate("/dashboard/problems");
    } catch (error) {
      console.error("Failed to create problem:", error);
      // TODO: Show error toast
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <h2 className="text-3xl font-bold tracking-tight">Add New Problem</h2>
        <p className="text-muted-foreground mt-1">
          Add a coding problem to your library
        </p>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Terminal className="h-5 w-5 text-primary" />
              <CardTitle>Problem Details</CardTitle>
            </div>
            <CardDescription>
              Enter the problem information below
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

              {/* Patterns Section - Placeholder */}
              <div className="space-y-2">
                <Label>Patterns (Optional)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Associate this problem with patterns for better tracking
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Pattern
                </Button>
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
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Problem
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

        {/* Tips Card */}
        <Card className="mt-6 bg-muted/30 border-dashed">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Terminal className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Quick Tips</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Use consistent naming (e.g., "Two Sum" not "2 Sum")</li>
                  <li>Add the problem URL for quick access during practice</li>
                  <li>Associate patterns to track your progress by topic</li>
                  <li>
                    <span className="font-mono text-xs bg-muted px-1 rounded">
                      Ctrl+Enter
                    </span>{" "}
                    to quickly submit
                  </li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
