import ApiError from "@/components/ApiError";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/lib/api";
import type { RevisionSession } from "@/types";
import { Calendar, Check, Clock, Play, Terminal } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<RevisionSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/sessions");
      setSessions(response.data.data || []);
    } catch (err: unknown) {
      console.error("Failed to fetch sessions:", err);
      setError(
        "Failed to load sessions. Please ensure the backend is running."
      );
    } finally {
      setLoading(false);
    }
  };

  const getTemplateDisplay = (key: string) => {
    const templates: Record<string, { icon: string; name: string }> = {
      daily_revision: { icon: "⚡", name: "Daily Revision" },
      daily_mixed: { icon: "📚", name: "Daily Mixed" },
      weekend_comprehensive: { icon: "🏖️", name: "Weekend Deep Dive" },
    };
    return templates[key] || { icon: "📝", name: key };
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredSessions = sessions.filter((session) => {
    if (filter === "all") return true;
    if (filter === "active") return !session.completed;
    if (filter === "completed") return session.completed;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Terminal className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-sm font-mono text-muted-foreground">
            Loading sessions...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return <ApiError message={error} onRetry={fetchSessions} />;
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Revision History
          </h2>
          <p className="text-muted-foreground mt-1">
            Track your practice sessions and progress
          </p>
        </div>
        <Link to="/dashboard/sessions/new">
          <Button>
            <Play className="h-4 w-4 mr-2" />
            Start New Session
          </Button>
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b">
        {[
          { key: "all", label: "All Sessions" },
          { key: "active", label: "Active" },
          { key: "completed", label: "Completed" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
              filter === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        {filteredSessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No sessions found</p>
              <Link to="/dashboard/sessions/new" className="inline-block mt-4">
                <Button>Start Your First Session</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          filteredSessions.map((session) => {
            const template = getTemplateDisplay(session.template_key);
            return (
              <Card
                key={session.id}
                className="hover:border-primary/50 transition-colors"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{template.icon}</div>
                      <div>
                        <CardTitle className="text-lg">
                          {template.name}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(session.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {session.planned_duration_min} min
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.completed ? (
                        <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-500/10 text-green-500">
                          <Check className="h-3 w-3" />
                          Completed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-orange-500/10 text-orange-500">
                          <Play className="h-3 w-3" />
                          In Progress
                        </span>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2">
                    <Link to={`/dashboard/sessions/${session.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                    {session.completed && (
                      <Button variant="ghost" size="sm">
                        Repeat Session
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
