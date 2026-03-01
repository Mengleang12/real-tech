import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Search, Package, Plus, Trash2, ChevronLeft, ChevronRight,
  Mail, DollarSign, CheckCircle, ShoppingBag, Check, ChevronsUpDown, Loader2, Eye, Phone, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./AdminDialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { adminUsersApi, appsApi, type AdminUser, type AdminOrder, type App } from "@/lib/api";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "warning"; label: string }> = {
  paid:      { variant: "default",     label: "Paid" },
  pending:   { variant: "warning",     label: "Pending" },
  failed:    { variant: "destructive", label: "Failed" },
  expired:   { variant: "outline",     label: "Expired" },
  cancelled: { variant: "secondary",   label: "Cancelled" },
};

export const UserManagement = () => {
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

  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  useEffect(() => {
    if (showGrantDialog) loadProducts();
  }, [showGrantDialog, appSearchQuery]);

  const loadProducts = async () => {
    try {
      const response = await appsApi.getAll({ search: appSearchQuery || undefined, limit: 30 });
      setApps(response.data);
    } catch (error) {
      console.error("Failed to load products:", error);
    }
  };

  const handleSelectUser = async (user: AdminUser) => {
    setSelectedUser(user);
    setLoadingOrders(true);
    try {
      const response = await adminUsersApi.getOrders(user.id);
      setUserOrders(response.orders);
    } catch (error) {
      toast.error("Failed to load purchase history");
      setUserOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleGrantProduct = async () => {
    if (!selectedUser || !selectedAppId) return;
    const product = apps.find(a => a.id.toString() === selectedAppId);
    if (!product) return;
    setGranting(true);
    try {
      await adminUsersApi.grantProduct(selectedUser.id, {
        product_id: product.id,
        product_name: product.name,
        amount: parseFloat(grantAmount) || 0,
      });
      toast.success(`Granted "${product.name}" to ${selectedUser.full_name || selectedUser.email}`);
      setShowGrantDialog(false);
      setSelectedAppId("");
      setGrantAmount("0");
      handleSelectUser(selectedUser);
    } catch (error: any) {
      toast.error(error.message || "Failed to grant product");
    } finally {
      setGranting(false);
    }
  };

  const handleRevokeProduct = async (order: AdminOrder) => {
    if (!selectedUser) return;
    setRevokingOrderId(order.id);
    try {
      await adminUsersApi.revokeProduct(selectedUser.id, order.product_id);
      toast.success(`Revoked "${order.product_name}"`);
      handleSelectUser(selectedUser);
    } catch (error: any) {
      toast.error(error.message || "Failed to revoke product");
    } finally {
      setRevokingOrderId(null);
    }
  };

  const handleApproveOrder = async (order: AdminOrder) => {
    setApprovingOrderId(order.id);
    try {
      await adminUsersApi.approveOrder(order.id);
      toast.success("Order approved");
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
      toast.success("Order deleted");
      if (selectedUser) handleSelectUser(selectedUser);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete order");
    } finally {
      setDeletingOrderId(null);
    }
  };

  const paidOrders = userOrders.filter(o => o.status === 'paid');
  const otherOrders = userOrders.filter(o => o.status !== 'paid');
  const totalSpent = paidOrders.reduce((sum, o) => sum + (typeof o.amount === 'string' ? parseFloat(o.amount) : o.amount), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Customers</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage registered customers and their purchases</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by email, name, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Summary Cards */}
      {pagination && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Customers</p>
                  <p className="text-2xl font-bold">{pagination.total}</p>
                  <p className="text-xs text-muted-foreground mt-1">All accounts</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="w-4.5 h-4.5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">This Page</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">Showing now</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
                  <Mail className="w-4.5 h-4.5 text-accent-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">With Purchases</p>
                  <p className="text-2xl font-bold">{users.filter(u => (u.paid_orders_count || 0) > 0).length}</p>
                  <p className="text-xs text-muted-foreground mt-1">On this page</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <ShoppingBag className="w-4.5 h-4.5 text-primary" />
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
          <p className="text-sm text-muted-foreground">No customers found</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Purchases</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => handleSelectUser(user)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-border" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">
                            {(user.full_name || user.email).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-xs font-medium truncate max-w-[180px]">{user.email}</span>
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
                        onClick={(e) => { e.stopPropagation(); handleSelectUser(user); }}
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
            Page {pagination.current_page} of {pagination.total_pages} ({pagination.total} customers)
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

      {/* Customer Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => { if (!open) setSelectedUser(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {(selectedUser.full_name || selectedUser.email).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="truncate">{selectedUser.full_name || selectedUser.email}</div>
                    {selectedUser.full_name && <p className="text-sm font-normal text-muted-foreground truncate">{selectedUser.email}</p>}
                  </div>
                </DialogTitle>
              </DialogHeader>

              {/* Customer Info Cards */}
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
                  <p className="text-lg font-bold">${totalSpent.toFixed(2)}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Purchases</p>
                  <p className="text-lg font-bold">{paidOrders.length}</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Joined</p>
                  <p className="text-sm font-semibold mt-1">{selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString() : "—"}</p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{selectedUser.email}</span>
                {selectedUser.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{selectedUser.phone}</span>}
              </div>

              {/* Tabbed Content */}
              <Tabs defaultValue="purchases" className="mt-2">
                <div className="flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="purchases" className="text-xs gap-1.5"><Package className="w-3.5 h-3.5" />Purchases ({paidOrders.length})</TabsTrigger>
                    {otherOrders.length > 0 && (
                      <TabsTrigger value="history" className="text-xs gap-1.5"><DollarSign className="w-3.5 h-3.5" />History ({otherOrders.length})</TabsTrigger>
                    )}
                  </TabsList>
                  <Button onClick={() => setShowGrantDialog(true)} size="sm" className="gap-1.5 h-8 text-xs">
                    <Plus className="w-3.5 h-3.5" /> Grant Product
                  </Button>
                </div>

                <TabsContent value="purchases" className="mt-3">
                  {loadingOrders ? (
                    <div className="space-y-2">{[1, 2].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
                  ) : paidOrders.length === 0 ? (
                    <div className="text-center py-8 bg-muted/30 rounded-lg border border-dashed border-border">
                      <ShoppingBag className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No purchases yet</p>
                    </div>
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
                                  onClick={() => handleRevokeProduct(order)}
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
                </TabsContent>

                {otherOrders.length > 0 && (
                  <TabsContent value="history" className="mt-3">
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
                  </TabsContent>
                )}
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Grant Product Dialog */}
      <Dialog open={showGrantDialog} onOpenChange={setShowGrantDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" /> Grant Product
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select Product</Label>
              <Popover open={appSearchOpen} onOpenChange={setAppSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={appSearchOpen} className="w-full justify-between mt-1.5">
                    {selectedAppId ? apps.find(a => a.id.toString() === selectedAppId)?.name || "Select product..." : "Select product..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Search products..." value={appSearchQuery} onValueChange={setAppSearchQuery} />
                    <CommandList>
                      <CommandEmpty>No products found.</CommandEmpty>
                      <CommandGroup>
                        {apps.map((app) => (
                          <CommandItem key={app.id} value={app.id.toString()} onSelect={() => { setSelectedAppId(app.id.toString()); setAppSearchOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", selectedAppId === app.id.toString() ? "opacity-100" : "opacity-0")} />
                            <span>{app.name}</span>
                            <span className="ml-auto text-xs text-muted-foreground">${app.variants?.length ? Number(app.variants[0].price_adjustment || 0).toFixed(2) : '0.00'}</span>
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
            <Button onClick={handleGrantProduct} disabled={!selectedAppId || granting}>
              {granting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              {granting ? "Granting..." : "Grant Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
