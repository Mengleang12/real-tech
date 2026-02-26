import { useState } from "react";
import { Ban, UserCheck, Clock, Search, Filter, User, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userStatusApi, type UserWithStatus } from "@/lib/api";
import { toast } from "sonner";

type UserStatusType = "active" | "suspended" | "banned";

const statusConfig: Record<UserStatusType, { label: string; icon: React.ElementType; color: string }> = {
  active: { label: "Active", icon: UserCheck, color: "bg-green-500/20 text-green-600" },
  suspended: { label: "Suspended", icon: Clock, color: "bg-yellow-500/20 text-yellow-600" },
  banned: { label: "Banned", icon: Ban, color: "bg-red-500/20 text-red-600" }
};

export const UserStatusManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserWithStatus | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [actionType, setActionType] = useState<UserStatusType>("active");
  const [reason, setReason] = useState("");
  const [suspendUntil, setSuspendUntil] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users-status", statusFilter],
    queryFn: () => userStatusApi.getAll(statusFilter === "all" ? undefined : statusFilter),
  });

  const users = data?.users || [];
  const stats = data?.stats || { active: 0, suspended: 0, banned: 0 };

  const updateStatus = useMutation({
    mutationFn: ({ userId, status, reason, suspendUntil }: { userId: number; status: string; reason?: string; suspendUntil?: string }) =>
      userStatusApi.update(userId, { status, reason, suspended_until: suspendUntil }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users-status"] });
      toast.success("Status updated");
      setShowDialog(false);
      setReason("");
      setSuspendUntil("");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const getUserStatus = (user: UserWithStatus): UserStatusType => user.status?.status || "active";

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-bold">User Status Management</h2><p className="text-muted-foreground">Suspend or ban users</p></div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card><CardContent className="pt-4 flex items-center gap-4"><div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center"><UserCheck className="w-5 h-5 text-green-600" /></div><div><div className="text-2xl font-bold">{stats.active}</div><p className="text-sm text-muted-foreground">Active</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-4"><div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center"><Clock className="w-5 h-5 text-yellow-600" /></div><div><div className="text-2xl font-bold">{stats.suspended}</div><p className="text-sm text-muted-foreground">Suspended</p></div></CardContent></Card>
        <Card><CardContent className="pt-4 flex items-center gap-4"><div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center"><Ban className="w-5 h-5 text-red-600" /></div><div><div className="text-2xl font-bold">{stats.banned}</div><p className="text-sm text-muted-foreground">Banned</p></div></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="pl-9" /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-[160px]"><Filter className="w-4 h-4 mr-2" /><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="suspended">Suspended</SelectItem><SelectItem value="banned">Banned</SelectItem></SelectContent></Select>
      </div>

      <div className="space-y-3">
        {isLoading ? <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card> : filteredUsers.length === 0 ? <Card><CardContent className="py-8 text-center text-muted-foreground">No users</CardContent></Card> : filteredUsers.map((user) => {
          const userStatus = getUserStatus(user);
          const statusInfo = statusConfig[userStatus];
          return (
            <Card key={user.user_id}>
              <CardContent className="py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"><User className="w-5 h-5" /></div>
                  <div>
                    <div className="flex items-center gap-2"><h3 className="font-medium">{user.full_name || user.email}</h3><Badge className={statusInfo.color}>{statusInfo.label}</Badge></div>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    {user.status?.reason && <p className="text-xs text-muted-foreground">Reason: {user.status.reason}</p>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {userStatus !== "active" && <Button variant="outline" size="sm" onClick={() => { setSelectedUser(user); setActionType("active"); setShowDialog(true); }} disabled={updateStatus.isPending}><UserCheck className="w-4 h-4 mr-1" />Restore</Button>}
                  {userStatus !== "suspended" && <Button variant="outline" size="sm" onClick={() => { setSelectedUser(user); setActionType("suspended"); setShowDialog(true); }} disabled={updateStatus.isPending}><Clock className="w-4 h-4 mr-1" />Suspend</Button>}
                  {userStatus !== "banned" && <Button variant="destructive" size="sm" onClick={() => { setSelectedUser(user); setActionType("banned"); setShowDialog(true); }} disabled={updateStatus.isPending}><Ban className="w-4 h-4 mr-1" />Ban</Button>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{actionType === "active" ? "Restore" : actionType === "suspended" ? "Suspend" : "Ban"} User</DialogTitle></DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50"><p className="font-medium">{selectedUser.full_name || selectedUser.email}</p></div>
              {actionType !== "active" && <div><label className="text-sm font-medium">Reason *</label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Explain why..." className="mt-1.5" /></div>}
              {actionType === "suspended" && <div><label className="text-sm font-medium">Until</label><Input type="datetime-local" value={suspendUntil} onChange={(e) => setSuspendUntil(e.target.value)} className="mt-1.5" /></div>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button variant={actionType === "banned" ? "destructive" : "default"} onClick={() => updateStatus.mutate({ userId: selectedUser!.user_id, status: actionType, reason, suspendUntil })} disabled={updateStatus.isPending}>
              {updateStatus.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {updateStatus.isPending ? "Processing..." : actionType === "active" ? "Restore" : actionType === "suspended" ? "Suspend" : "Ban"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};