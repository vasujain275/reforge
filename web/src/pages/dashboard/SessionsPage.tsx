import ApiError from "@/components/ApiError";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import type { RevisionSession } from "@/types";
import { Calendar, Check, Clock, Play, Terminal, Zap, BookOpen, Target, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function SessionsPage() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<RevisionSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [repeatingSessionId, setRepeatingSessionId] = useState<number | null>(null);

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

  const handleRepeatSession = async (sessionId: number) => {
    setRepeatingSessionId(sessionId);
    try {
      // Fetch the session details to get problem IDs and template
      const sessionResponse = await api.get<{ data: RevisionSession }>(
        `/sessions/${sessionId}`
      );
      const sessionData = sessionResponse.data.data;

      // Extract problem IDs from the session
      const problemIds = sessionData.problems?.map((p) => p.id) || [];

      if (problemIds.length === 0) {
        alert("Cannot repeat session: No problems found in the original session.");
        return;
      }

      // Create a new session with the same problems and template
      const createResponse = await api.post<{ data: { id: number } }>(
        "/sessions",
        {
          template_key: sessionData.template_key,
          session_name: sessionData.session_name,
          planned_duration_min: sessionData.planned_duration_min,
          problem_ids: problemIds,
        }
      );

      // Navigate to the newly created session
      const newSessionId = createResponse.data.data.id;
      navigate(`/dashboard/sessions/${newSessionId}`);
    } catch (err: unknown) {
      console.error("Failed to repeat session:", err);
      alert("Failed to repeat session. Please try again.");
    } finally {
      setRepeatingSessionId(null);
    }
  };

  const getTemplateDisplay = (key: string | undefined) => {
    const templates: Record<string, { icon: typeof Zap; name: string }> = {
      morning_momentum: { icon: Zap, name: "Morning Momentum Builder" },
      weakness_crusher: { icon: Target, name: "Weakness Crusher" },
      daily_mixed: { icon: BookOpen, name: "Daily Mixed Grind" },
      pattern_deep_dive: { icon: Terminal, name: "Pattern Deep Dive" },
      pattern_rotation: { icon: Calendar, name: "Pattern Rotation" },
      pattern_combo: { icon: Target, name: "Pattern Combo Chains" },
      pattern_graduation: { icon: Check, name: "Pattern Graduation" },
      weekend_comprehensive: { icon: Target, name: "Weekend Comprehensive" },
      weak_pattern_marathon: { icon: Play, name: "Weak Pattern Marathon" },
      challenge_gauntlet: { icon: Zap, name: "Challenge Gauntlet" },
    };
    if (!key) {
      return { icon: Terminal, name: "Custom Session" };
    }
    return templates[key] || { icon: Terminal, name: key.replace(/_/g, " ").toUpperCase() };
  };

  const formatDate = (dateString: string) => {
    // Handle both ISO8601 and SQLite timestamp formats
    let date: Date;
    
    if (dateString.includes('T') || dateString.includes('Z')) {
      date = new Date(dateString);
    } else {
      // SQLite format - treat as UTC
      date = new Date(dateString + ' UTC');
    }
    
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getRelativeTime = (dateString: string) => {
    const now = new Date();
    // SQLite returns timestamps in format "YYYY-MM-DD HH:MM:SS" (UTC)
    // We need to ensure it's parsed as UTC
    let date: Date;
    
    // Check if the date string has timezone info
    if (dateString.includes('T') || dateString.includes('Z')) {
      // ISO8601 format (e.g., "2024-01-22T10:30:00Z")
      date = new Date(dateString);
    } else {
      // SQLite format (e.g., "2024-01-22 10:30:00") - treat as UTC
      date = new Date(dateString + ' UTC');
    }
    
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
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
            Loading session registry...
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
      {/* Header - HUD Style */}
      <div className="flex items-start justify-between border-b border-border pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Terminal className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold tracking-tight font-mono uppercase">
              Session Registry
            </h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span className="font-mono">{sessions.length} total sessions</span>
          </div>
        </div>
        <Link to="/dashboard/sessions/new">
          <Button className="font-mono">
            <Play className="h-4 w-4 mr-2" />
            + Initialize Session
          </Button>
        </Link>
      </div>

      {/* Filter Tabs - Technical Style */}
      <div className="flex gap-2">
        {[
          { key: "all", label: "ALL", count: sessions.length },
          { key: "active", label: "ACTIVE", count: sessions.filter(s => !s.completed).length },
          { key: "completed", label: "COMPLETED", count: sessions.filter(s => s.completed).length },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as typeof filter)}
            className={`px-4 py-2 text-xs font-mono uppercase tracking-wider transition-all border rounded-md ${
              filter === tab.key
                ? "border-primary/50 bg-primary/10 text-primary shadow-[0_0_10px_-3px_var(--primary)]"
                : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
            }`}
          >
            {tab.label}
            <span className="ml-2 px-1.5 py-0.5 rounded bg-background/50 text-[10px]">
              {String(tab.count).padStart(2, '0')}
            </span>
          </button>
        ))}
      </div>

      {/* Sessions List - HUD Cards */}
      <div className="space-y-3">
        {filteredSessions.length === 0 ? (
          <Card className="border border-dashed">
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <div className="mx-auto h-12 w-12 rounded-md border border-border flex items-center justify-center">
                  <Terminal className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                    No Sessions Found
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">
                    Initialize first session to begin tracking
                  </p>
                </div>
                <Link to="/dashboard/sessions/new" className="inline-block">
                  <Button className="font-mono">+ Initialize Session</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredSessions.map((session, index) => {
            const template = getTemplateDisplay(session.template_key);
            const Icon = template.icon;
            return (
              <Card
                key={session.id}
                className="border border-border hover:border-primary/50 hover:shadow-[0_0_15px_-3px_var(--primary)] transition-all"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Left: Index & Icon */}
                    <div className="flex flex-col items-center gap-2 pt-1">
                      <div className="text-xs font-mono text-muted-foreground">
                        #{String(sessions.length - index).padStart(3, '0')}
                      </div>
                      <div className="h-10 w-10 rounded-md border border-primary/20 bg-primary/5 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                    </div>

                    {/* Center: Details */}
                    <div className="flex-1 space-y-3">
                      {/* Top Row - Title & Status */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <h3 className="font-mono font-semibold uppercase tracking-wider text-sm">
                            {template.name}
                          </h3>
                          <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground">
                            <span>SESSION_{String(session.id).padStart(4, '0')}</span>
                            <span className="text-muted-foreground/50">|</span>
                            <span>{session.template_key}</span>
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded-md border font-mono text-xs uppercase tracking-wider ${
                          session.completed
                            ? "bg-green-500/10 border-green-500/20 text-green-500"
                            : "bg-orange-400/10 border-orange-400/20 text-orange-400"
                        }`}>
                          {session.completed ? (
                            <span className="flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              COMPLETE
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <Play className="h-3 w-3" />
                              ACTIVE
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Metadata Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2 text-xs">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          <div className="space-y-0">
                            <div className="font-mono text-muted-foreground">
                              {formatDate(session.created_at)}
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground">
                              {getRelativeTime(session.created_at)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <div className="space-y-0">
                            <div className="font-mono">
                              {String(session.planned_duration_min).padStart(3, '0')} min
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground">
                              planned duration
                            </div>
                          </div>
                        </div>

                        {session.problems && session.problems.length > 0 && (
                          <div className="flex items-center gap-2">
                            <Target className="h-3 w-3 text-muted-foreground" />
                            <div className="space-y-0">
                              <div className="font-mono">
                                {String(session.problems.length).padStart(2, '0')} problems
                              </div>
                              <div className="font-mono text-[10px] text-muted-foreground">
                                in queue
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2 border-t border-border">
                        <Link to={`/dashboard/sessions/${session.id}`}>
                          <Button variant="outline" size="sm" className="font-mono text-xs">
                            <Terminal className="h-3 w-3 mr-1.5" />
                            View Details
                          </Button>
                        </Link>
                        {session.completed && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="font-mono text-xs"
                            onClick={() => handleRepeatSession(session.id)}
                            disabled={repeatingSessionId === session.id}
                          >
                            {repeatingSessionId === session.id ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                                Repeating...
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 mr-1.5" />
                                Repeat Session
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
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
