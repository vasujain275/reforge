import { adminApi, type AdminUser } from "@/api/admin";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/store/authStore";
import {
  AlertCircle,
  CheckCircle,
  Copy,
  Loader2,
  MoreVertical,
  Shield,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserX,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/types/api";

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await adminApi.listUsers(1, 100);
      setUsers(response.users);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, "Failed to load users"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId: number, newRole: 'user' | 'admin') => {
    setActionLoading(userId);
    try {
      await adminApi.updateUserRole(userId, newRole);
      toast.success(`User role updated to ${newRole}`);
      await loadUsers();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to update role"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (userId: number, isActive: boolean) => {
    setActionLoading(userId);
    try {
      if (isActive) {
        await adminApi.deactivateUser(userId);
        toast.success("User deactivated");
      } else {
        await adminApi.reactivateUser(userId);
        toast.success("User reactivated");
      }
      await loadUsers();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to update user status"));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId: number, userName: string) => {
    if (!confirm(`Are you sure you want to permanently delete user "${userName}"? This action cannot be undone.`)) {
      return;
    }
    setActionLoading(userId);
    try {
      await adminApi.deleteUser(userId);
      toast.success("User deleted permanently");
      await loadUsers();
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to delete user"));
    } finally {
      setActionLoading(null);
    }
  };

  const handlePasswordReset = async (userId: number, userName: string) => {
    setActionLoading(userId);
    try {
      const result = await adminApi.initiatePasswordReset(userId);
      
      // Build full URL with current domain
      const fullResetLink = `${window.location.origin}${result.reset_link}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(fullResetLink);
      
      toast.success(
        `Password reset link for ${userName} copied to clipboard!`,
        { duration: 5000 }
      );
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Failed to generate reset link"));
    } finally {
      setActionLoading(null);
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
          <ShieldAlert className="h-3 w-3" />
          ADMIN
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono text-muted-foreground bg-muted border border-border">
        <Shield className="h-3 w-3" />
        USER
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20">
          <CheckCircle className="h-3 w-3" />
          ACTIVE
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-mono font-medium bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
        <XCircle className="h-3 w-3" />
        INACTIVE
      </span>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight font-mono uppercase flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            User Management
          </h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            Manage user accounts, roles, and permissions
          </p>
        </div>
      </div>

      {/* Main Content */}
      <Card className="border-2">
        <CardHeader className="border-b border-border bg-muted/20">
          <CardTitle className="text-lg font-mono uppercase flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            All Users
          </CardTitle>
          <CardDescription className="font-mono">
            Total: {users.length} users registered
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
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border">
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">
                      User
                    </TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">
                      Role
                    </TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="font-mono text-xs uppercase text-muted-foreground">
                      Registered
                    </TableHead>
                    <TableHead className="text-right font-mono text-xs uppercase text-muted-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow
                      key={user.id}
                      className="border-b border-border/50 hover:bg-muted/30"
                    >
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <span className="font-medium font-mono text-sm">
                            {user.name}
                            {user.id === currentUser?.id && (
                              <span className="ml-2 text-xs text-primary">(You)</span>
                            )}
                          </span>
                          <span className="text-xs text-muted-foreground font-mono">
                            {user.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{getStatusBadge(user.is_active)}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={actionLoading === user.id}
                              className="h-8 w-8 p-0"
                            >
                              {actionLoading === user.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreVertical className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            {user.id !== currentUser?.id && (
                              <>
                                {user.role === 'user' ? (
                                  <DropdownMenuItem
                                    onClick={() => handleRoleChange(user.id, 'admin')}
                                    className="cursor-pointer font-mono text-xs"
                                  >
                                    <ShieldAlert className="mr-2 h-4 w-4" />
                                    Promote to Admin
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem
                                    onClick={() => handleRoleChange(user.id, 'user')}
                                    className="cursor-pointer font-mono text-xs"
                                  >
                                    <Shield className="mr-2 h-4 w-4" />
                                    Demote to User
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                              </>
                            )}
                            
                            <DropdownMenuItem
                              onClick={() => handlePasswordReset(user.id, user.name)}
                              className="cursor-pointer font-mono text-xs"
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              Copy Reset Link
                            </DropdownMenuItem>
                            
                            {user.id !== currentUser?.id && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleToggleActive(user.id, user.is_active)}
                                  className="cursor-pointer font-mono text-xs"
                                >
                                  {user.is_active ? (
                                    <>
                                      <UserX className="mr-2 h-4 w-4" />
                                      Deactivate
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="mr-2 h-4 w-4" />
                                      Reactivate
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(user.id, user.name)}
                                  className="cursor-pointer font-mono text-xs text-red-500 focus:text-red-500"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Permanently
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
