import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Search, Package, Plus, Trash2, ChevronLeft, ChevronRight,
  Mail, DollarSign, CheckCircle, Clock, XCircle, ShoppingBag, Check, ChevronsUpDown, Loader2, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { adminUsersApi, appsApi, type AdminUser, type AdminOrder, type App } from "@/lib/api";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "warning"; label: string }> = {
  paid:      { variant: "default",     label: "Paid" },
  pending:   { variant: "warning",     label: "Pending" },
  failed:    { variant: "destructive", label: "Failed" },
  expired:   { variant: "outline",     label: "Expired" },
  cancelled: { variant: "secondary",   label: "Cancelled" },
};

export const UserManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 20;

  // User detail dialog
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [userOrders, setUserOrders] = useState<AdminOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Grant dialog
  const [showGrantDialog, setShowGrantDialog] = useState(false);
  const [apps, setApps] = useState<App[]>([]);
  const [selectedAppId, setSelectedAppId] = useState("");
  const [grantAmount, setGrantAmount] = useState("0");
  const [appSearchOpen, setAppSearchOpen] = useState(false);
  const [appSearchQuery, setAppSearchQuery] = useState("");
  const [granting, setGranting] = useState(false);

  // Action loading
  const [revokingOrderId, setRevokingOrderId] = useState<string | null>(null);
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", searchQuery, currentPage],
    queryFn: () => adminUsersApi.getAll({
      search: searchQuery || undefined,
      page: currentPage,
      limit: perPage,
    }),
  });

  const users = data?.users || [];
  const pagination = data?.pagination;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (showGrantDialog) loadApps();
  }, [showGrantDialog, appSearchQuery]);

  const loadApps = async () => {
    try {
      const response = await appsApi.getAll({ search: appSearchQuery || undefined, limit: 30 });
      setApps(response.data);
    } catch (error) {
      console.error("Failed to load apps:", error);
    }
  };

  const handleSelectUser = async (user: AdminUser) => {
    setSelectedUser(user);
    setLoadingOrders(true);
    try {
      const response = await adminUsersApi.getOrders(user.id);
      setUserOrders(response.orders);
    } catch (error) {
      toast.error("Failed to load user orders");
      setUserOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleGrantApp = async () => {
    if (!selectedUser || !selectedAppId) return;
    const app = apps.find(a => a.id.toString() === selectedAppId);
    if (!app) return;
    setGranting(true);
    try {
      await adminUsersApi.grantProduct(selectedUser.id, {
        product_id: app.id,
        product_name: app.name,
        amount: parseFloat(grantAmount) || 0,
      });
      toast.success(`Granted "${app.name}" to ${selectedUser.email}`);
      setShowGrantDialog(false);
      setSelectedAppId("");
      setGrantAmount("0");
      handleSelectUser(selectedUser);
    } catch (error: any) {
      toast.error(error.message || "Failed to grant app");
    } finally {
      setGranting(false);
    }
  };

  const handleRevokeApp = async (order: AdminOrder) => {
    if (!selectedUser) return;
    setRevokingOrderId(order.id);
    try {
      await adminUsersApi.revokeProduct(selectedUser.id, order.product_id);
      toast.success(`Revoked "${order.product_name}"`);
      handleSelectUser(selectedUser);
    } catch (error: any) {
      toast.error(error.message || "Failed to revoke app");
    } finally {
      setRevokingOrderId(null);
    }
  };

  const handleApproveOrder = async (order: AdminOrder) => {
    setApprovingOrderId(order.id);
    try {
      await adminUsersApi.approveOrder(order.id);
      toast.success(`Order approved`);
      if (selectedUser) handleSelectUser(selectedUser);
    } catch (error: any) {
      toast.error(error.message || "Failed to approve order");
    } finally {
      setApprovingOrderId(null);
    }
  };

  const handleDeleteOrder = async (order: AdminOrder) => {
    setDeletingOrderId(order.id);
    try {
      await adminUsersApi.deleteOrder(order.id);
      toast.success(`Order deleted`);
      if (selectedUser) handleSelectUser(selectedUser);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete order");
    } finally {
      setDeletingOrderId(null);
    }
  };

  const paidOrders = userOrders.filter(o => o.status === 'paid');
  const otherOrders = userOrders.filter(o => o.status !== 'paid');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">User Management</h2>
          <p className="text-sm text-muted-foreground mt-1">View and manage all registered users</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Summary */}
      {pagination && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Total Users</p>
                  <p className="text-2xl font-bold text-foreground">{pagination.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">All accounts</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Users className="w-4.5 h-4.5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">This Page</p>
                  <p className="text-2xl font-bold text-foreground">{users.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Showing now</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">With Purchases</p>
                  <p className="text-2xl font-bold text-foreground">{users.filter(u => (u.paid_orders_count || 0) > 0).length}</p>
                  <p className="text-xs text-muted-foreground mt-1">On this page</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <ShoppingBag className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Users Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="border border-border rounded-md bg-card p-4 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-md bg-card">
          <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No users found</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Purchases</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">
                            {(user.full_name || user.email).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs font-medium">{user.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs">{user.full_name || "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{user.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant={user.paid_orders_count ? "default" : "outline"} className="text-xs">
                        {user.paid_orders_count || 0}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleSelectUser(user)}
                        title="View details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {pagination.current_page} of {pagination.total_pages} ({pagination.total} users)
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={currentPage >= pagination.total_pages} onClick={() => setCurrentPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => { if (!open) setSelectedUser(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {(selectedUser.full_name || selectedUser.email).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div>{selectedUser.email}</div>
                    {selectedUser.full_name && <p className="text-sm font-normal text-muted-foreground">{selectedUser.full_name}</p>}
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 mt-2">
                {/* Grant button */}
                <div className="flex justify-end">
                  <Button onClick={() => setShowGrantDialog(true)} size="sm" className="gap-1">
                    <Plus className="w-4 h-4" /> Grant App
                  </Button>
                </div>

                {/* Purchased Apps */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4" /> Purchased Apps ({paidOrders.length})
                  </h3>
                  {loadingOrders ? (
                    <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
                  ) : paidOrders.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4 text-center bg-muted/50 rounded-lg">No purchased apps</p>
                  ) : (
                    <div className="border border-border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Product</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Amount</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Source</th>
                            <th className="text-right px-4 py-2 font-medium text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {paidOrders.map((order) => (
                            <tr key={order.id} className="hover:bg-muted/30">
                              <td className="px-4 py-2 font-medium">{order.product_name}</td>
                              <td className="px-4 py-2 tabular-nums">${(typeof order.amount === 'string' ? parseFloat(order.amount) : order.amount).toFixed(2)}</td>
                              <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(order.paid_at || order.created_at).toLocaleDateString()}</td>
                              <td className="px-4 py-2">
                                {order.bakong_transaction_id?.startsWith('ADMIN_GRANTED') ? (
                                  <Badge variant="outline" className="text-[10px]">Admin</Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-[10px]">Payment</Badge>
                                )}
                              </td>
                              <td className="px-4 py-2 text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-destructive hover:text-destructive"
                                  onClick={() => handleRevokeApp(order)}
                                  disabled={revokingOrderId === order.id}
                                >
                                  {revokingOrderId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Other Orders */}
                {otherOrders.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm">
                      <DollarSign className="w-4 h-4" /> Payment History ({otherOrders.length})
                    </h3>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Product</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Amount</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Status</th>
                            <th className="text-left px-4 py-2 font-medium text-muted-foreground">Date</th>
                            <th className="text-right px-4 py-2 font-medium text-muted-foreground">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {otherOrders.map((order) => {
                            const status = statusConfig[order.status] || statusConfig.pending;
                            const canApprove = order.status === 'pending' || order.status === 'expired';
                            return (
                              <tr key={order.id} className="hover:bg-muted/30">
                                <td className="px-4 py-2 font-medium">{order.product_name}</td>
                                <td className="px-4 py-2 tabular-nums">${(typeof order.amount === 'string' ? parseFloat(order.amount) : order.amount).toFixed(2)}</td>
                                <td className="px-4 py-2">
                                  <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                                </td>
                                <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</td>
                                <td className="px-4 py-2 text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    {canApprove && (
                                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleApproveOrder(order)} disabled={approvingOrderId === order.id} title="Approve">
                                        {approvingOrderId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5 text-primary" />}
                                      </Button>
                                    )}
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteOrder(order)} disabled={deletingOrderId === order.id} title="Delete">
                                      {deletingOrderId === order.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-destructive" />}
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Grant App Dialog */}
      <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" /> Grant App Access
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select App</Label>
              <Popover open={appSearchOpen} onOpenChange={setAppSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={appSearchOpen} className="w-full justify-between mt-1.5">
                    {selectedAppId ? apps.find(a => a.id.toString() === selectedAppId)?.name || "Select app..." : "Select app..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Search apps..." value={appSearchQuery} onValueChange={setAppSearchQuery} />
                    <CommandList>
                      <CommandEmpty>No apps found.</CommandEmpty>
                      <CommandGroup>
                        {apps.map((app) => (
                          <CommandItem key={app.id} value={app.id.toString()} onSelect={() => { setSelectedAppId(app.id.toString()); setAppSearchOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", selectedAppId === app.id.toString() ? "opacity-100" : "opacity-0")} />
                            <span>{app.name}</span>
                            <span className="ml-auto text-xs text-muted-foreground">${typeof app.price === 'string' ? parseFloat(app.price).toFixed(2) : (app.price || 0).toFixed(2)}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Amount Paid ($)</Label>
              <Input type="number" min="0" step="0.01" value={grantAmount} onChange={(e) => setGrantAmount(e.target.value)} className="mt-1.5" />
              <p className="text-xs text-muted-foreground mt-1">Set to 0 if granted for free</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGrantDialog(false)} disabled={granting}>Cancel</Button>
            <Button onClick={handleGrantApp} disabled={!selectedAppId || granting}>
              {granting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              {granting ? "Granting..." : "Grant Access"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
