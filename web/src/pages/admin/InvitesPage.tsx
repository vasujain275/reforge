import { adminApi, type InviteCode } from "@/api/admin";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  CheckCircle,
  Copy,
  Key,
  Loader2,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/types/api";

export default function InvitesPage() {
  const [invites, setInvites] = useState<InviteCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState("24");
  const [maxUses, setMaxUses] = useState("1");
  const [isCreating, setIsCreating] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  const loadInvites = async () => {
    setIsLoading(true);
    setError("");
    try {
      const codes = await adminApi.listInviteCodes();
      setInvites(codes);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to load invite codes"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvites();
  }, []);

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const params: { expires_in?: number; max_uses?: number } = {};
      
      if (expiresInHours && parseInt(expiresInHours) > 0) {
        params.expires_in = parseInt(expiresInHours);
      }
      
      if (maxUses && parseInt(maxUses) > 0) {
        params.max_uses = parseInt(maxUses);
      }

      const newInvite = await adminApi.createInviteCode(params);
      
      // Copy code to clipboard
      await navigator.clipboard.writeText(newInvite.code);
      
      toast.success("Invite code created and copied to clipboard!", {
        duration: 5000,
      });
      
      setIsCreateDialogOpen(false);
      setExpiresInHours("24");
      setMaxUses("1");
      await loadInvites();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to create invite code"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (inviteId: string, code: string) => {
    if (!confirm(`Are you sure you want to delete invite code "${code}"?`)) {
      return;
    }
    setDeleteLoading(inviteId);
    try {
      await adminApi.deleteInviteCode(inviteId);
      toast.success("Invite code deleted");
      await loadInvites();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to delete invite code"));
    } finally {
      setDeleteLoading(null);
    }
  };

  const copyToClipboard = async (code: string) => {
    await navigator.clipboard.writeText(code);
    toast.success("Code copied to clipboard!");
  };

  const getStatusBadge = (invite: InviteCode) => {
    const now = new Date();
    const expired = invite.expires_at && new Date(invite.expires_at) < now;
    const maxedOut = invite.current_uses >= invite.max_uses;

    if (expired || maxedOut) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
          <XCircle className="h-3 w-3" />
          {expired ? "EXPIRED" : "MAXED"}
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
        <CheckCircle className="h-3 w-3" />
        ACTIVE
      </span>
    );
  };

  const formatExpiry = (expiresAt: string | null) => {
    if (!expiresAt) return "Never";
    const date = new Date(expiresAt);
    const now = new Date();
    if (date < now) return "Expired";
    return date.toLocaleString();
  };

  const formatUsage = (invite: InviteCode) => {
    return `${invite.current_uses} / ${invite.max_uses}`;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-mono uppercase flex items-center gap-2">
            <Key className="h-6 w-6 text-primary" />
            Invite Codes
          </h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            Generate and manage invite codes for user registration
          </p>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="font-mono gap-2">
              <Plus className="h-4 w-4" />
              Create Code
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-mono uppercase">Create Invite Code</DialogTitle>
              <DialogDescription className="font-mono text-xs">
                Generate a new invite code with optional expiry and usage limits
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="expires" className="font-mono text-xs">
                  Expires in (hours)
                </Label>
                <Input
                  id="expires"
                  type="number"
                  placeholder="24"
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground font-mono">
                  Leave empty for no expiration
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUses" className="font-mono text-xs">
                  Max uses
                </Label>
                <Input
                  id="maxUses"
                  type="number"
                  placeholder="1"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground font-mono">
                  Leave empty for unlimited uses
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={isCreating}
                className="font-mono gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content */}
      <Card className="border-2">
        <CardHeader className="border-b border-border bg-muted/20">
          <CardTitle className="text-lg font-mono uppercase flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            All Invite Codes
          </CardTitle>
          <CardDescription className="font-mono">
            Total: {invites.length} codes
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center py-12 px-4">
              <div className="bg-destructive/15 text-destructive text-sm p-4 rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            </div>
          ) : invites.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Key className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground font-mono">
                No invite codes yet. Create one to get started.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">
                      Code
                    </TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">
                      Usage
                    </TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">
                      Expires
                    </TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">
                      Created
                    </TableHead>
                    <TableHead className="text-right font-mono text-xs uppercase text-muted-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invites.map((invite) => (
                    <TableRow
                      key={invite.id}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="font-mono text-sm bg-muted px-2 py-1 rounded border border-border">
                            {invite.code}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(invite.code)}
                            className="h-7 w-7 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(invite)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatUsage(invite)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {formatExpiry(invite.expires_at)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {new Date(invite.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(invite.id, invite.code)}
                          disabled={deleteLoading === invite.id}
                          className="h-8 px-2 text-red-500 hover:text-red-500 hover:bg-red-500/10"
                        >
                          {deleteLoading === invite.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
