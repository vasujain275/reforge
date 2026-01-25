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
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import type { ScoringWeights } from "@/types";
import { Cpu, Loader2, Save, Sliders, Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import { getAppVersion } from "@/lib/version";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weights, setWeights] = useState<ScoringWeights>({
    w_conf: 0.25,
    w_days: 0.25,
    w_attempts: 0.15,
    w_time: 0.1,
    w_difficulty: 0.1,
    w_failed: 0.1,
    w_pattern: 0.05,
  });
  const [defaultWeights, setDefaultWeights] = useState<ScoringWeights | null>(
    null
  );

  useEffect(() => {
    fetchWeights();
    fetchDefaultWeights();
  }, []);

  const fetchWeights = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/settings/weights");
      if (response.data.data) {
        setWeights(response.data.data);
      }
    } catch (err: unknown) {
      console.error("Failed to fetch settings:", err);
      setError(
        "Failed to load settings. Please ensure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchDefaultWeights = async () => {
    try {
      const response = await api.get("/settings/weights/defaults");
      if (response.data.data) {
        setDefaultWeights(response.data.data);
      }
    } catch (err: unknown) {
      console.error("Failed to fetch default weights:", err);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      await api.put("/settings/weights", weights);
      // Refetch weights to ensure we have the latest from the server
      await fetchWeights();
    } catch (err: unknown) {
      console.error("Failed to save settings:", err);
      setError("Failed to save settings. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!defaultWeights) return;
    
    if (!confirm("Reset all scoring weights to default values?")) return;

    setIsResetting(true);
    setError(null);
    try {
      await api.put("/settings/weights", defaultWeights);
      setWeights(defaultWeights);
    } catch (err: unknown) {
      console.error("Failed to reset settings:", err);
      setError("Failed to reset settings. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  const updateWeight = (key: keyof ScoringWeights, value: number) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Terminal className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
            Loading Configuration...
          </p>
        </div>
      </div>
    );
  }

  if (error && !weights) {
    return <ApiError message={error} onRetry={fetchWeights} />;
  }

  return (
    <div className="flex-1 p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight font-mono uppercase">
          SYSTEM CONFIGURATION
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Manage scoring algorithm weights and preferences
        </p>
      </div>

      {error && (
        <ApiError variant="inline" message={error} onRetry={handleSave} />
      )}

      <div className="space-y-6 mt-6">
        {/* Scoring Weights */}
        <Card className="border-2 rounded-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-primary" />
              <CardTitle className="font-mono uppercase tracking-wider">
                Scoring Weights
              </CardTitle>
            </div>
            <CardDescription>
              Adjust the 7-feature deterministic scoring algorithm
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Confidence Weight */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-mono uppercase tracking-wider text-xs">
                  W_CONF (Confidence)
                </Label>
                <span className="font-mono text-sm text-primary">
                  {weights.w_conf.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[weights.w_conf]}
                onValueChange={(val) => updateWeight("w_conf", val[0])}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
            </div>

            {/* Days Since Last */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-mono uppercase tracking-wider text-xs">
                  W_DAYS (Days Since Last)
                </Label>
                <span className="font-mono text-sm text-primary">
                  {weights.w_days.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[weights.w_days]}
                onValueChange={(val) => updateWeight("w_days", val[0])}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
            </div>

            {/* Attempts */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-mono uppercase tracking-wider text-xs">
                  W_ATTEMPTS (Total Attempts)
                </Label>
                <span className="font-mono text-sm text-primary">
                  {weights.w_attempts.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[weights.w_attempts]}
                onValueChange={(val) => updateWeight("w_attempts", val[0])}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
            </div>

            {/* Time */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-mono uppercase tracking-wider text-xs">
                  W_TIME (Average Time)
                </Label>
                <span className="font-mono text-sm text-primary">
                  {weights.w_time.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[weights.w_time]}
                onValueChange={(val) => updateWeight("w_time", val[0])}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
            </div>

            {/* Difficulty */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-mono uppercase tracking-wider text-xs">
                  W_DIFFICULTY (Problem Difficulty)
                </Label>
                <span className="font-mono text-sm text-primary">
                  {weights.w_difficulty.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[weights.w_difficulty]}
                onValueChange={(val) => updateWeight("w_difficulty", val[0])}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
            </div>

            {/* Failed Streak */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-mono uppercase tracking-wider text-xs">
                  W_FAILED (Failed Streak)
                </Label>
                <span className="font-mono text-sm text-primary">
                  {weights.w_failed.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[weights.w_failed]}
                onValueChange={(val) => updateWeight("w_failed", val[0])}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
            </div>

            {/* Pattern Weakness */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-mono uppercase tracking-wider text-xs">
                  W_PATTERN (Pattern Weakness)
                </Label>
                <span className="font-mono text-sm text-primary">
                  {weights.w_pattern.toFixed(2)}
                </span>
              </div>
              <Slider
                value={[weights.w_pattern]}
                onValueChange={(val) => updateWeight("w_pattern", val[0])}
                min={0}
                max={1}
                step={0.01}
                className="w-full"
              />
            </div>

            {/* Total Weight Indicator */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="font-mono uppercase tracking-wider text-xs text-muted-foreground">
                  Total Weight Sum
                </span>
                <span
                  className={`font-mono text-lg font-bold ${
                    Math.abs(
                      Object.values(weights).reduce((a, b) => a + b, 0) - 1
                    ) < 0.01
                      ? "text-green-500"
                      : "text-orange-400"
                  }`}
                >
                  {Object.values(weights)
                    .reduce((a, b) => a + b, 0)
                    .toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Weights should ideally sum to 1.00 for optimal scoring
              </p>
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card className="border-dashed bg-muted/30 rounded-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-muted-foreground font-mono uppercase tracking-wider">
                System Info
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="font-mono text-xs text-muted-foreground space-y-1">
              <p>$ reforge --version</p>
              <p className="text-foreground">reforge {getAppVersion()}</p>
              <p className="mt-2">$ echo $USER</p>
              <p className="text-foreground">{user?.email || "anonymous"}</p>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Action Buttons */}
        <div className="flex justify-between items-center gap-4">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isResetting || !defaultWeights}
            className="rounded-md border-orange-400/50 text-orange-400 hover:bg-orange-400/10"
          >
            {isResetting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <Terminal className="h-4 w-4 mr-2" />
                Reset to Defaults
              </>
            )}
          </Button>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className="rounded-md"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-md"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
