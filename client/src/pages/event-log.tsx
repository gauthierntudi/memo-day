import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { SUPER_ADMIN_EMAIL } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Search,
  LogIn,
  LogOut,
  Plus,
  Pencil,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  Key,
  Shield,
  FileText,
  User,
  Clock,
  Activity,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const PAGE_SIZE = 50;

const ACTION_ICONS: Record<string, any> = {
  "Login": LogIn,
  "Logout": LogOut,
  "Create Project": Plus,
  "Update Project": Pencil,
  "Delete Project": Trash2,
  "Create Daily Report": Plus,
  "Update Daily Report": Pencil,
  "Submit Daily Report": Send,
  "Approve Daily Report": CheckCircle,
  "Reject Daily Report": XCircle,
  "Create Weekly Plan": Plus,
  "Update Weekly Plan": Pencil,
  "Submit Weekly Plan": Send,
  "Approve Weekly Plan": CheckCircle,
  "Reject Weekly Plan": XCircle,
  "Create User": Plus,
  "Update User": Pencil,
  "Delete User": Trash2,
  "Set User Password": Key,
  "Password Changed": Key,
  "Update Role Privileges": Shield,
};

const ACTION_COLORS: Record<string, string> = {
  "Login": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Logout": "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
  "Create Project": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Update Project": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Delete Project": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "Create Daily Report": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Update Daily Report": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Submit Daily Report": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Approve Daily Report": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  "Reject Daily Report": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "Create Weekly Plan": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Update Weekly Plan": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Submit Weekly Plan": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Approve Weekly Plan": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  "Reject Weekly Plan": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "Create User": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  "Update User": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  "Delete User": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  "Set User Password": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "Password Changed": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  "Update Role Privileges": "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

const ALL_ACTIONS = [
  "Login", "Logout", "Password Changed",
  "Create Project", "Update Project", "Delete Project",
  "Create Daily Report", "Update Daily Report", "Submit Daily Report", "Approve Daily Report", "Reject Daily Report",
  "Create Weekly Plan", "Update Weekly Plan", "Submit Weekly Plan", "Approve Weekly Plan", "Reject Weekly Plan",
  "Create User", "Update User", "Delete User", "Set User Password",
  "Update Role Privileges",
  "Upload Photos",
];

export default function EventLogPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const isSuperAdmin = user?.email === SUPER_ADMIN_EMAIL;

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(0);
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  const { data: topUsers, isLoading: topUsersLoading } = useQuery<Array<{
    userName: string;
    userEmail: string | null;
    operationCount: number;
    totalConnectionMinutes: number;
  }>>({
    queryKey: ["/api/event-logs/top-users"],
    queryFn: async () => {
      const res = await fetch("/api/event-logs/top-users");
      if (!res.ok) throw new Error("Failed to fetch top users");
      return res.json();
    },
    enabled: isSuperAdmin,
  });

  const actionParam = actionFilter !== "all" ? actionFilter : "";
  const { data, isLoading, isError } = useQuery<{
    logs: Array<{
      id: number;
      userId: string | null;
      userName: string;
      userEmail: string | null;
      action: string;
      entityType: string | null;
      entityId: string | null;
      description: string;
      createdAt: string;
    }>;
    total: number;
  }>({
    queryKey: ["/api/event-logs", page, debouncedSearch, actionParam],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
      });
      if (actionParam) params.set("action", actionParam);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/event-logs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch event logs");
      return res.json();
    },
    enabled: isSuperAdmin,
  });

  if (!isSuperAdmin) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md w-full">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ScrollText className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h2 className="text-lg font-semibold mb-2">Access Denied</h2>
            <p className="text-sm text-muted-foreground text-center">
              Only the super admin can view the event log.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const logs = data?.logs || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatDuration = (minutes: number) => {
    if (minutes < 1) return "< 1 min";
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours < 24) return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const avatarColors = [
    "bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500"
  ];

  return (
    <div className="p-4 md:p-6 space-y-4" data-testid="page-event-log">
      <div className="flex items-center gap-3">
        <ScrollText className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Event Log</h1>
          <p className="text-sm text-muted-foreground">All system operations and user activities</p>
        </div>
      </div>

      <Card data-testid="card-top-users">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Top 5 Active Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topUsersLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : topUsers && topUsers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {topUsers.map((u, i) => (
                <div
                  key={u.userName}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                  data-testid={`card-top-user-${i}`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className={`${avatarColors[i % avatarColors.length]} text-white text-xs font-semibold`}>
                      {getInitials(u.userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate" title={u.userName}>{u.userName}</p>
                    {u.userEmail && (
                      <p className="text-xs text-muted-foreground truncate" title={u.userEmail}>{u.userEmail}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs flex items-center gap-1 text-muted-foreground" title="Operations">
                        <User className="h-3 w-3" />
                        {u.operationCount}
                      </span>
                      <span className="text-xs flex items-center gap-1 text-muted-foreground" title="Connection time">
                        <Clock className="h-3 w-3" />
                        {formatDuration(u.totalConnectionMinutes)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No user activity recorded yet</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {total} total events
            </CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by user or description..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 w-full sm:w-64"
                  data-testid="input-search-events"
                />
              </div>
              <Select value={actionFilter} onValueChange={(val) => { setActionFilter(val); setPage(0); }}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-action-filter">
                  <SelectValue placeholder="Filter by action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {ALL_ACTIONS.map(action => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="text-center py-12 text-destructive">
              <ScrollText className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Failed to load event logs</p>
              <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page.</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ScrollText className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p>No events found</p>
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">Date & Time</TableHead>
                      <TableHead className="w-[140px]">User</TableHead>
                      <TableHead className="w-[180px]">Action</TableHead>
                      <TableHead>Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => {
                      const IconComp = ACTION_ICONS[log.action] || FileText;
                      const colorClass = ACTION_COLORS[log.action] || "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
                      return (
                        <TableRow key={log.id} data-testid={`row-event-${log.id}`}>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}{" "}
                            {new Date(log.createdAt).toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{log.userName}</p>
                              {log.userEmail && (
                                <p className="text-xs text-muted-foreground truncate max-w-[120px]">{log.userEmail}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`gap-1 text-xs ${colorClass}`}>
                              <IconComp className="h-3 w-3" />
                              {log.action}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm max-w-[400px] truncate">
                            {log.description}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {page + 1} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                      disabled={page >= totalPages - 1}
                      data-testid="button-next-page"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}