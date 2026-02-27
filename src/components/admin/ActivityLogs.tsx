import { useState, useMemo } from "react";
import {
  Activity, Search, Filter, Calendar, User, Clock, RefreshCw,
  LogIn, ShoppingCart, Download, Shield, Trash2, Edit, Plus,
  Bell, Settings, Eye, MoreHorizontal, ChevronsUpDown, Check, X,
  ChevronLeft, ChevronRight
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { activityLogsApi, adminUsersApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const actionConfig: Record<string, { icon: typeof Activity; label: string; color: string; bg: string }> = {
  login: { icon: LogIn, label: "Login", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10 dark:bg-emerald-500/15" },
  logout: { icon: LogIn, label: "Logout", color: "text-muted-foreground", bg: "bg-muted" },
  purchase: { icon: ShoppingCart, label: "Purchase", color: "text-primary", bg: "bg-primary/10" },
  download: { icon: Download, label: "Download", color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-500/10 dark:bg-violet-500/15" },
  app_create: { icon: Plus, label: "App Created", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
  app_update: { icon: Edit, label: "App Updated", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  app_delete: { icon: Trash2, label: "App Deleted", color: "text-destructive", bg: "bg-destructive/10" },
  role_assign: { icon: Shield, label: "Role Assigned", color: "text-primary", bg: "bg-primary/10" },
  role_remove: { icon: Shield, label: "Role Removed", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  notification_create: { icon: Bell, label: "Notification", color: "text-primary", bg: "bg-primary/10" },
  settings_update: { icon: Settings, label: "Settings", color: "text-muted-foreground", bg: "bg-muted" },
  stock_update: { icon: Edit, label: "Stock Update", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-500/10" },
  admin_sale_created: { icon: ShoppingCart, label: "Sale Created", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-500/10" },
};

const getActionConfig = (action: string) => actionConfig[action] || {
  icon: Activity,
  label: action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
  color: "text-muted-foreground",
  bg: "bg-muted",
};

const StatCard = ({ value, label, icon: Icon, color }: { value: number; label: string; icon: typeof Activity; color: string }) => (
  <Card className="overflow-hidden border-border/60" style={{ boxShadow: "var(--shadow-card)" }}>
    <CardContent className="p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-[18px] h-[18px]" />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-semibold tracking-tight">{value.toLocaleString()}</div>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </CardContent>
  </Card>
);

const LogSkeleton = () => (
  <div className="flex items-center gap-3 p-3.5">
    <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-3 w-48" />
    </div>
    <Skeleton className="h-3 w-16" />
  </div>
);

const formatTimeAgo = (dateString: string) => {
  const diffMins = Math.floor((Date.now() - new Date(dateString).getTime()) / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
  const days = Math.floor(diffMins / 1440);
  if (days < 7) return `${days}d ago`;
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const formatDetails = (details: Record<string, unknown> | null) => {
  if (!details || Object.keys(details).length === 0) return null;
  const entries = Object.entries(details)
    .filter(([key]) => !["user_id", "id"].includes(key))
    .slice(0, 3);
  if (entries.length === 0) return null;
  return entries.map(([key, val]) => (
    <span key={key} className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
      <span className="font-medium capitalize">{key.replace(/_/g, " ")}:</span>
      <span className="truncate max-w-[120px]">{String(val)}</span>
    </span>
  ));
};

export const ActivityLogs = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("7");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const [page, setPage] = useState(1);
  const perPage = 50;

  const { data: usersData } = useQuery({
    queryKey: ["admin-users-list"],
    queryFn: () => adminUsersApi.getAll({ limit: 500 }),
  });

  const selectedUserLabel = useMemo(() => {
    if (userFilter === "all") return "All Users";
    const u = usersData?.users?.find((u) => String(u.id) === userFilter);
    return u ? (u.full_name || u.email) : "All Users";
  }, [userFilter, usersData]);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-activity-logs", actionFilter, dateFilter, userFilter, page],
    queryFn: () => activityLogsApi.getAll({
      days: parseInt(dateFilter),
      action: actionFilter === "all" ? undefined : actionFilter,
      user_id: userFilter !== "all" ? parseInt(userFilter) : undefined,
      page,
      per_page: perPage,
    }),
  });

  // Reset page when filters change
  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  const logs = data?.logs || [];
  const uniqueActions = data?.actions || [];
  const stats = data?.stats || { total: 0, logins: 0, purchases: 0, downloads: 0 };
  const pagination = data?.pagination || { current_page: 1, last_page: 1, per_page: perPage, total: 0 };

  const filteredLogs = logs.filter((log) =>
    log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Activity className="w-[18px] h-[18px] text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Activity Logs</h2>
            <p className="text-xs text-muted-foreground">Monitor all user and admin actions</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
          className="gap-1.5 text-xs h-8"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard value={stats.total} label="Total Events" icon={Activity} color="bg-muted text-muted-foreground" />
        <StatCard value={stats.logins} label="Logins" icon={LogIn} color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" />
        <StatCard value={stats.purchases} label="Purchases" icon={ShoppingCart} color="bg-primary/10 text-primary" />
        <StatCard value={stats.downloads} label="Downloads" icon={Download} color="bg-violet-500/10 text-violet-600 dark:text-violet-400" />
      </div>

      {/* Filters */}
      <Card className="border-border/60" style={{ boxShadow: "var(--shadow-subtle)" }}>
        <CardContent className="p-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by action or email..."
                className="pl-8 h-8 text-xs bg-muted/40 border-border/50 focus-visible:bg-card"
              />
            </div>
            <Popover open={userPopoverOpen} onOpenChange={setUserPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={userPopoverOpen}
                  className="w-full sm:w-[200px] h-8 text-xs justify-between font-normal"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate">{selectedUserLabel}</span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {userFilter !== "all" && (
                      <X
                        className="w-3 h-3 text-muted-foreground hover:text-foreground"
                        onClick={(e) => { e.stopPropagation(); setUserFilter("all"); setPage(1); }}
                      />
                    )}
                    <ChevronsUpDown className="w-3 h-3 text-muted-foreground" />
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[240px] p-0 z-50 bg-popover border border-border shadow-lg" align="start">
                <Command>
                  <CommandInput placeholder="Search user..." className="h-8 text-xs" />
                  <CommandList className="max-h-[200px]">
                    <CommandEmpty className="py-3 text-xs text-center text-muted-foreground">No user found</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="all"
                        onSelect={() => { setUserFilter("all"); setUserPopoverOpen(false); setPage(1); }}
                        className="text-xs"
                      >
                        <Check className={cn("w-3 h-3 mr-2", userFilter === "all" ? "opacity-100" : "opacity-0")} />
                        All Users
                      </CommandItem>
                      {usersData?.users?.map((u) => (
                        <CommandItem
                          key={u.id}
                          value={`${u.full_name || ""} ${u.email}`}
                          onSelect={() => { setUserFilter(String(u.id)); setUserPopoverOpen(false); setPage(1); }}
                          className="text-xs"
                        >
                          <Check className={cn("w-3 h-3 mr-2 shrink-0", userFilter === String(u.id) ? "opacity-100" : "opacity-0")} />
                          <div className="min-w-0">
                            <div className="truncate">{u.full_name || u.email}</div>
                            {u.full_name && (
                              <div className="text-[10px] text-muted-foreground truncate">{u.email}</div>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <Select value={actionFilter} onValueChange={handleFilterChange(setActionFilter)}>
              <SelectTrigger className="w-full sm:w-[150px] h-8 text-xs">
                <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map((a: string) => (
                  <SelectItem key={a} value={a}>
                    {a.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={handleFilterChange(setDateFilter)}>
              <SelectTrigger className="w-full sm:w-[130px] h-8 text-xs">
                <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Log List */}
      <Card className="border-border/60 overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
        <div className="divide-y divide-border/60">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => <LogSkeleton key={i} />)
          ) : filteredLogs.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                <Eye className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">No activity found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or date range</p>
            </div>
          ) : (
            filteredLogs.map((log, index) => {
              const config = getActionConfig(log.action);
              const ActionIcon = config.icon;
              return (
                <div
                  key={`${log.id}-${index}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors duration-100 group"
                  style={{ animationDelay: `${index * 20}ms` }}
                >
                  {/* Icon */}
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${config.bg}`}>
                    <ActionIcon className={`w-4 h-4 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-foreground">{config.label}</span>
                      {log.user?.email && (
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                          — {log.user.email}
                        </span>
                      )}
                    </div>
                    {log.details && (
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {formatDetails(log.details as Record<string, unknown>)}
                      </div>
                    )}
                  </div>

                  {/* Timestamp & IP */}
                  <div className="text-right shrink-0 hidden sm:block">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(log.created_at)}
                    </div>
                    {log.ip_address && (
                      <span className="text-[10px] text-muted-foreground/60 font-mono">{log.ip_address}</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination Footer */}
        {!isLoading && (
          <div className="px-4 py-2.5 bg-muted/30 border-t border-border/60 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              {pagination.total > 0
                ? `Showing ${(pagination.current_page - 1) * pagination.per_page + 1}–${Math.min(pagination.current_page * pagination.per_page, pagination.total)} of ${pagination.total.toLocaleString()}`
                : "No events"}
            </p>
            {pagination.last_page > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={page <= 1 || isFetching}
                  onClick={() => setPage(p => p - 1)}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="text-xs text-muted-foreground px-2">
                  {pagination.current_page} / {pagination.last_page}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  disabled={page >= pagination.last_page || isFetching}
                  onClick={() => setPage(p => p + 1)}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
