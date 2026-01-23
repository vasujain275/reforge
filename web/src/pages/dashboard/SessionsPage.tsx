import ApiError from "@/components/ApiError";
import { DataPagination } from "@/components/DataPagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePagination } from "@/hooks/usePagination";
import { useDebounce } from "@/hooks/useDebounce";
import { api } from "@/lib/api";
import type { PaginatedSessions } from "@/types";
import { Calendar, Check, Clock, Play, Terminal, Zap, BookOpen, Target, Loader2, Search, Filter } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function SessionsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<PaginatedSessions | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repeatingSessionId, setRepeatingSessionId] = useState<number | null>(null);

  const {
    page,
    pageSize,
    searchQuery,
    setPage,
    setSearchQuery,
    setFilter,
    getFilter,
  } = usePagination(20);

  // Debounce search query to avoid triggering API calls on every keystroke
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const statusFilter = getFilter("status");

  useEffect(() => {
    fetchSessions();
  }, [page, pageSize, debouncedSearchQuery, statusFilter]);

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
      });
      if (debouncedSearchQuery) params.append("q", debouncedSearchQuery);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const response = await api.get(`/sessions?${params.toString()}`);
      setData(response.data.data);
    } catch (err: unknown) {
      console.error("Failed to fetch sessions:", err);
      setError(
        "Failed to load sessions. Please ensure the backend is running."
      );
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  };

  const handleRepeatSession = async (sessionId: number) => {
    setRepeatingSessionId(sessionId);
    try {
      const sessionResponse = await api.get(`/sessions/${sessionId}`);
      const sessionData = sessionResponse.data.data;

      const problemIds = sessionData.problems?.map((p: any) => p.id) || [];

      if (problemIds.length === 0) {
        alert("Cannot repeat session: No problems found in the original session.");
        return;
      }

      const createResponse = await api.post("/sessions", {
        template_key: sessionData.template_key,
        session_name: sessionData.session_name,
        planned_duration_min: sessionData.planned_duration_min,
        problem_ids: problemIds,
      });

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
    let date: Date;
    
    if (dateString.includes('T') || dateString.includes('Z')) {
      date = new Date(dateString);
    } else {
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
    let date: Date;
    
    if (dateString.includes('T') || dateString.includes('Z')) {
      date = new Date(dateString);
    } else {
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

  // Show full-page loading only on initial load
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-sm font-mono text-muted-foreground uppercase tracking-wider">
            Loading Session Registry...
          </p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return <ApiError message={error} onRetry={fetchSessions} />;
  }

  const sessions = data?.data || [];
  const totalPages = data?.total_pages || 0;

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
            <span className="font-mono">{data?.total || 0} total sessions</span>
          </div>
        </div>
        <Link to="/dashboard/sessions/new">
          <Button className="font-mono rounded-md shadow-[0_0_15px_-3px_var(--primary)]">
            <Play className="h-4 w-4 mr-2" />
            + Initialize Session
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="rounded-md border border-border">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sessions by template or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-10 rounded-md font-mono"
              />
              {loading && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
              )}
            </div>
            <Select value={statusFilter} onValueChange={(v) => setFilter("status", v)}>
              <SelectTrigger className="rounded-md">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="rounded-md">
                <SelectItem value="all" className="font-mono">ALL SESSIONS</SelectItem>
                <SelectItem value="active" className="font-mono">ACTIVE</SelectItem>
                <SelectItem value="completed" className="font-mono">COMPLETED</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      {data && (
        <div className="flex items-center justify-between text-sm font-mono text-muted-foreground">
          <span>
            Showing {sessions.length > 0 ? ((page - 1) * pageSize) + 1 : 0} - {Math.min(page * pageSize, data.total)} of {data.total} sessions
          </span>
        </div>
      )}

      {/* Sessions List - HUD Cards */}
      <div className={`space-y-3 transition-opacity duration-200 ${loading ? 'opacity-50' : 'opacity-100'}`}>
        {sessions.length === 0 ? (
          <Card className="border border-dashed rounded-md">
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
                    {searchQuery || statusFilter !== "all"
                      ? "Try adjusting your search filters"
                      : "Initialize first session to begin tracking"}
                  </p>
                </div>
                <Link to="/dashboard/sessions/new" className="inline-block">
                  <Button className="font-mono rounded-md">+ Initialize Session</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          sessions.map((session) => {
            const template = getTemplateDisplay(session.template_key);
            const Icon = template.icon;
            return (
              <Card
                key={session.id}
                className="border border-border hover:border-primary/50 hover:shadow-[0_0_15px_-3px_var(--primary)] transition-all rounded-md"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Left: Icon */}
                    <div className="flex flex-col items-center gap-2 pt-1">
                      <div className="text-xs font-mono text-muted-foreground">
                        #{String(session.id).padStart(3, '0')}
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
                          <Button variant="outline" size="sm" className="font-mono text-xs rounded-md">
                            <Terminal className="h-3 w-3 mr-1.5" />
                            View Details
                          </Button>
                        </Link>
                        {session.completed && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="font-mono text-xs rounded-md"
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

      {/* Pagination */}
      {data && totalPages > 0 && (
        <div className="flex items-center justify-center pt-4">
          <DataPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
