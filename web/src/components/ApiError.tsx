import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Terminal, WifiOff } from "lucide-react";

interface ApiErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  variant?: "default" | "inline" | "card";
}

export default function ApiError({
  title = "Connection Error",
  message = "Unable to connect to the server. The backend API may not be running.",
  onRetry,
  variant = "default",
}: ApiErrorProps) {
  if (variant === "inline") {
    return (
      <div className="flex items-center gap-3 p-4 border border-destructive/50 bg-destructive/10 rounded-lg">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-destructive">{title}</p>
          <p className="text-xs text-muted-foreground mt-1">{message}</p>
        </div>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (variant === "card") {
    return (
      <Card className="border-destructive/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-full bg-destructive/10">
              <WifiOff className="h-5 w-5 text-destructive" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-destructive">{title}</h4>
              <p className="text-sm text-muted-foreground mt-1">{message}</p>
              {onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  className="mt-3"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex items-center justify-center h-full animate-in fade-in duration-300">
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-destructive/20 animate-pulse" />
          <Terminal className="relative h-12 w-12 text-destructive" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-destructive">{title}</h3>
          <p className="text-sm text-muted-foreground">{message}</p>
          <div className="font-mono text-xs text-muted-foreground/70 mt-4 p-3 bg-muted/50 rounded-lg">
            <p>$ curl http://localhost:8080/api/v1/health</p>
            <p className="text-destructive">curl: (7) Failed to connect</p>
          </div>
        </div>
        {onRetry && (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Connection
          </Button>
        )}
      </div>
    </div>
  );
}
