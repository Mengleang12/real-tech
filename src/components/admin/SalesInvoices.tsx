import { useState, useEffect } from "react";
import { AddSaleDialog } from "./AddSaleDialog";
import { InvoiceEditDialog } from "./InvoiceEditDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminUsersApi, salesApi, type AdminOrder, type StockProduct } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminDialog, Dialog, DialogContent, DialogHeader, DialogTitle } from "./AdminDialog";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Search, ChevronLeft, ChevronRight, DollarSign, ShoppingCart,
  FileText, Eye, Package, CheckCircle, Clock, Printer, Pencil,
  AlertTriangle, PackageCheck, BarChart3, Boxes, Save, Loader2, TrendingUp, Plus, Trash2, MoreHorizontal
} from "lucide-react";

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "warning"; label: string }> = {
  paid:      { variant: "default",     label: "Paid" },
  pending:   { variant: "warning",     label: "Pending" },
  failed:    { variant: "destructive", label: "Failed" },
  expired:   { variant: "outline",     label: "Expired" },
  cancelled: { variant: "secondary",   label: "Cancelled" },
};

type ProductLineItem = { name: string; quantity: number };

const aggregateProductLines = (rawProductName: string): ProductLineItem[] => {
  const counts = new Map<string, number>();
  const ordered: string[] = [];

  rawProductName
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((entry) => {
      // Parse "Product ×3" format or plain name
      const match = entry.match(/^(.+?)\s*[×x]\s*(\d+)$/i);
      const name = match ? match[1].trim() : entry;
      const qty = match ? parseInt(match[2], 10) : 1;

      if (!counts.has(name)) ordered.push(name);
      counts.set(name, (counts.get(name) || 0) + qty);
    });

  return ordered.map((name) => ({ name, quantity: counts.get(name) || 0 }));
};

// ─── Sales Overview Tab ───────────────────────────────────────────────────────
const SalesOverview = () => {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-sales-dashboard"],
    queryFn: () => salesApi.getDashboard(30),
  });

  const stats = data?.stats;
  const topProducts = data?.top_products || [];
  const recentSales = data?.recent_sales || [];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div><p className="text-xs text-muted-foreground mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-foreground">${isLoading ? "—" : (stats?.total_revenue?.toFixed(2) || "0.00")}</p>
              <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center"><DollarSign className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" /></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div><p className="text-xs text-muted-foreground mb-1">Paid Orders</p>
              <p className="text-2xl font-bold text-foreground">{isLoading ? "—" : stats?.paid_orders}</p>
              <p className="text-xs text-muted-foreground mt-1">Completed sales</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center"><ShoppingCart className="w-4.5 h-4.5 text-primary" /></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div><p className="text-xs text-muted-foreground mb-1">Low Stock</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{isLoading ? "—" : stats?.low_stock_count}</p>
              <p className="text-xs text-muted-foreground mt-1">Needs restock</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center"><AlertTriangle className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" /></div>
          </div>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div><p className="text-xs text-muted-foreground mb-1">Out of Stock</p>
              <p className="text-2xl font-bold text-destructive">{isLoading ? "—" : stats?.out_of_stock_count}</p>
              <p className="text-xs text-muted-foreground mt-1">Unavailable</p>
            </div>
            <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center"><PackageCheck className="w-4.5 h-4.5 text-destructive" /></div>
          </div>
        </CardContent></Card>
      </div>

      {/* Additional stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Avg Order Value</p>
          <p className="text-xl font-bold text-foreground">${isLoading ? "—" : (stats?.avg_order_value?.toFixed(2) || "0.00")}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Pending Orders</p>
          <p className="text-xl font-bold text-foreground">{isLoading ? "—" : stats?.pending_orders}</p>
        </CardContent></Card>
        <Card><CardContent className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Stock Value</p>
          <p className="text-xl font-bold text-foreground">${isLoading ? "—" : (stats?.total_stock_value?.toFixed(2) || "0.00")}</p>
        </CardContent></Card>
      </div>

      {/* Top Products & Recent Sales side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Top Selling Products</h3>
            </div>
            {isLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : topProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales data yet</p>
            ) : (
              <div className="space-y-3">
                {topProducts.slice(0, 5).map((p, i) => (
                  <div key={p.product_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground w-5">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.product_name}</p>
                        <p className="text-xs text-muted-foreground">{p.sales} sales</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">${Number(p.revenue).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Recent Sales</h3>
            </div>
            {isLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full" />)}</div>
            ) : recentSales.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent sales</p>
            ) : (
              <div className="space-y-3">
                {recentSales.slice(0, 5).map((sale) => {
                  const amt = typeof sale.amount === "string" ? parseFloat(sale.amount as string) : sale.amount;
                  const saleProductSummary = aggregateProductLines(sale.product_name)
                    .map((item) => (item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name))
                    .join(", ");
                  return (
                    <div key={sale.id} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{saleProductSummary}</p>
                        <p className="text-xs text-muted-foreground">{(sale as any).user?.full_name || (sale as any).user?.email || "Customer"}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold tabular-nums">${amt.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{sale.paid_at ? new Date(sale.paid_at).toLocaleDateString() : "—"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ─── Stock Management Tab ─────────────────────────────────────────────────────
const StockManagement = () => {
  const queryClient = useQueryClient();
  const [stockFilter, setStockFilter] = useState("all");
  const [stockSearch, setStockSearch] = useState("");
  const [debouncedStockSearch, setDebouncedStockSearch] = useState("");
  const [stockPage, setStockPage] = useState(1);
  const [editingStock, setEditingStock] = useState<{ productId: number; variantId?: number; qty: number } | null>(null);
  const [stockReason, setStockReason] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedStockSearch(stockSearch);
      setStockPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [stockSearch]);

  const { data: stockData, isLoading: stockLoading } = useQuery({
    queryKey: ["admin-stock", stockFilter, debouncedStockSearch, stockPage],
    queryFn: () => salesApi.getStockOverview({
      stock_status: stockFilter !== "all" ? stockFilter : undefined,
      search: debouncedStockSearch || undefined,
      page: stockPage,
      limit: 20,
    }),
  });

  const stockMutation = useMutation({
    mutationFn: ({ productId, data }: { productId: number; data: { variant_id?: number; stock_quantity: number; reason?: string } }) =>
      salesApi.updateStock(productId, data),
    onSuccess: () => {
      toast.success("Stock updated");
      queryClient.invalidateQueries({ queryKey: ["admin-stock"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sales-dashboard"] });
      setEditingStock(null);
      setStockReason("");
    },
    onError: () => toast.error("Failed to update stock"),
  });

  const stockProducts = stockData?.products || [];
  const stockPagination = stockData?.pagination;

  const getStockBadge = (status: string) => {
    if (status === "out_of_stock") return <Badge variant="destructive" className="text-xs">Out of Stock</Badge>;
    if (status === "low_stock") return <Badge className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/10">Low Stock</Badge>;
    return <Badge className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10">In Stock</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search products..." value={stockSearch} onChange={(e) => setStockSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={stockFilter} onValueChange={(v) => { setStockFilter(v); setStockPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Stock Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="in_stock">In Stock</SelectItem>
            <SelectItem value="low_stock">Low Stock</SelectItem>
            <SelectItem value="out_of_stock">Out of Stock</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stock Table */}
      {stockLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="border border-border rounded-md bg-card p-4 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-64" /></div>)}</div>
      ) : stockProducts.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-md bg-card">
          <Boxes className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No products found</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Price</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stock</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Variants</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stockProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {product.icon_url ? (
                          <img src={product.icon_url} alt={product.name} className="w-10 h-10 rounded-lg object-cover border border-border/50" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center border border-border/50">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <span className="font-medium text-sm">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant="secondary" className="text-xs">{product.category || "—"}</Badge></td>
                    <td className="px-4 py-3 font-semibold tabular-nums">${Number(product.price || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 font-semibold tabular-nums">{product.total_variant_stock}</td>
                    <td className="px-4 py-3">{getStockBadge(product.stock_status)}</td>
                    <td className="px-4 py-3">
                      {product.variants.length > 0 ? (
                        <div className="space-y-1">
                          {product.variants.map((v) => {
                            const label = Object.values(v.combination).join(" / ");
                            return (
                              <div key={v.id} className="flex items-center gap-2 text-xs">
                                <span className="text-muted-foreground">{label}:</span>
                                <span className="font-semibold tabular-nums">{v.stock_quantity}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5"
                                  onClick={() => setEditingStock({ productId: product.id, variantId: v.id, qty: v.stock_quantity })}
                                >
                                  <Pencil className="w-3 h-3" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">No variants</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {product.variants.length === 0 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs gap-1"
                          onClick={() => setEditingStock({ productId: product.id, qty: product.stock_quantity ?? 0 })}
                        >
                          <Save className="w-3 h-3" /> Update
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {stockPagination && stockPagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {stockPagination.current_page} of {stockPagination.total_pages} ({stockPagination.total} products)</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={stockPage <= 1} onClick={() => setStockPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" disabled={stockPage >= stockPagination.total_pages} onClick={() => setStockPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* Stock Update Dialog */}
      <AdminDialog open={!!editingStock} onOpenChange={(open) => { if (!open) { setEditingStock(null); setStockReason(""); } }} title="Update Stock" size="sm">
          {editingStock && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">New Quantity</label>
                <Input type="number" min="0" value={editingStock.qty} onChange={(e) => setEditingStock({ ...editingStock, qty: parseInt(e.target.value) || 0 })} className="mt-1.5" />
              </div>
              <div>
                <label className="text-sm font-medium">Reason (optional)</label>
                <Input value={stockReason} onChange={(e) => setStockReason(e.target.value)} placeholder="e.g. Restock, adjustment..." className="mt-1.5" />
              </div>
              <Button
                className="w-full gap-2"
                disabled={stockMutation.isPending}
                onClick={() => stockMutation.mutate({
                  productId: editingStock.productId,
                  data: {
                    variant_id: editingStock.variantId,
                    stock_quantity: editingStock.qty,
                    reason: stockReason || undefined,
                  },
                })}
              >
                {stockMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Stock
              </Button>
            </div>
          )}
      </AdminDialog>
    </div>
  );
};

// ─── Invoices Tab ─────────────────────────────────────────────────────────────
const InvoicesTab = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [editOrder, setEditOrder] = useState<AdminOrder | null>(null);
  const [deleteOrderId, setDeleteOrderId] = useState<string | null>(null);
  const [markPaidOrderId, setMarkPaidOrderId] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const deleteMutation = useMutation({
    mutationFn: (orderId: string) => adminUsersApi.deleteOrder(orderId),
    onSuccess: () => {
      toast.success("Invoice deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sales-dashboard"] });
      setDeleteOrderId(null);
    },
    onError: () => toast.error("Failed to delete invoice"),
  });

  const markPaidMutation = useMutation({
    mutationFn: (orderId: string) =>
      adminUsersApi.updateOrder(orderId, { status: 'paid', paid_at: new Date().toISOString() } as any),
    onSuccess: () => {
      toast.success("Marked as paid");
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sales-dashboard"] });
    },
    onError: () => toast.error("Failed to update status"),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-invoices", statusFilter, currentPage, debouncedSearch],
    queryFn: () => adminUsersApi.getAllOrders({
      status: statusFilter !== "all" ? statusFilter : undefined,
      search: debouncedSearch || undefined,
      page: currentPage,
      limit: 20,
    }),
  });

  const orders = data?.orders || [];
  const pagination = data?.pagination;

  const handlePrint = (order: AdminOrder) => {
    const amount = typeof order.amount === "string" ? parseFloat(order.amount as string) : order.amount;
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.style.left = "-9999px";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open();
    const originalPrice = order.original_price ? parseFloat(order.original_price) : amount;
    const totalDiscount = originalPrice - amount;
    const hasDiscount = totalDiscount > 0.005;

    // Item & sale discount stored values (for display labels only)
    const itemDiscountRaw = order.item_discount ? parseFloat(order.item_discount) : 0;
    const saleDiscountRaw = order.sale_discount ? parseFloat(order.sale_discount) : 0;

    // If both discounts exist, item discount = totalDiscount - saleDiscount; otherwise one takes all
    const saleDiscountAmount = Math.min(saleDiscountRaw, totalDiscount);
    const itemDiscountAmount = totalDiscount - saleDiscountAmount;

    doc.write(`<!DOCTYPE html><html><head><title>Invoice #${order.id.slice(0, 8).toUpperCase()}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Inter',system-ui,-apple-system,sans-serif;max-width:760px;margin:0 auto;padding:48px 40px;color:#111827;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        .accent{color:#2563eb}
        .invoice-badge{display:inline-flex;align-items:center;gap:6px;background:#eff6ff;color:#2563eb;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;padding:6px 14px;border-radius:6px}
        .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:32px;border-bottom:1px solid #e5e7eb}
        .brand{display:flex;align-items:center;gap:14px}
        .brand-icon{width:44px;height:44px;border-radius:10px;overflow:hidden}
        .brand-icon img{width:100%;height:100%;object-fit:contain}
        .brand-name{font-size:20px;font-weight:700;color:#111827}
        .brand-sub{font-size:12px;color:#6b7280;margin-top:2px;font-weight:400}
        .meta{text-align:right}
        .invoice-number{font-size:22px;font-weight:700;color:#111827;margin-top:8px;font-variant-numeric:tabular-nums}
        .invoice-date{font-size:13px;color:#6b7280;margin-top:4px}
        .details-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin:32px 0}
        .detail-block{}
        .detail-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#9ca3af;margin-bottom:10px}
        .detail-name{font-size:15px;font-weight:600;color:#111827}
        .detail-sub{font-size:13px;color:#6b7280;margin-top:3px;line-height:1.5}
        .status-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:0.3px}
        .status-paid{background:#dcfce7;color:#166534}
        .status-pending{background:#fef9c3;color:#854d0e}
        .status-failed{background:#fee2e2;color:#991b1b}
        .status-expired{background:#f3f4f6;color:#6b7280}
        table{width:100%;border-collapse:collapse;margin:8px 0 0}
        .table-wrap{background:#f9fafb;border-radius:12px;padding:4px;margin:32px 0}
        thead th{text-align:left;padding:14px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:1px solid #e5e7eb}
        thead th:last-child{text-align:right}
        tbody td{padding:16px;font-size:14px;color:#374151;border-bottom:1px solid #f3f4f6}
        tbody td:last-child{text-align:right;font-variant-numeric:tabular-nums}
        .summary-section{display:flex;justify-content:flex-end;margin-top:0}
        .summary-table{width:280px}
        .summary-row{display:flex;justify-content:space-between;padding:8px 16px;font-size:13px;color:#6b7280}
        .summary-row.discount{color:#dc2626}
        .summary-row.total{background:#111827;color:#fff;border-radius:8px;padding:14px 16px;font-size:16px;font-weight:700;margin-top:4px}
        .divider{height:1px;background:#e5e7eb;margin:40px 0 24px}
        .footer{text-align:center;padding:24px 0}
        .footer-thanks{font-size:15px;font-weight:600;color:#111827;margin-bottom:4px}
        .footer-brand{font-size:12px;color:#9ca3af;margin-top:8px}
        .footer-brand a{color:#2563eb;text-decoration:none}
        body{transform:scale(0.85);transform-origin:top left;width:117.6%}
        @media print{body{padding:24px 20px}
        .table-wrap{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
      </style></head><body>

      <div class="header">
        <div class="brand">
          <div class="brand-icon"><img src="${window.location.origin}/realtech-logo.png" alt="Realtech Computer" /></div>
          <div>
            <div class="brand-name">Realtech Computer</div>
            <div class="brand-sub">Software & Digital Products</div>
          </div>
        </div>
        <div class="meta">
          <div class="invoice-badge">Invoice</div>
          <div class="invoice-number">#${order.id.slice(0, 8).toUpperCase()}</div>
          <div class="invoice-date">${order.created_at ? new Date(order.created_at.replace(/-/g, '/')).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</div>
        </div>
      </div>

      <div class="details-grid">
        <div class="detail-block">
          <div class="detail-label">Bill To</div>
          <div class="detail-name">${order.user?.full_name || "Walk-in Customer"}</div>
          <div class="detail-sub">${order.user?.email || "—"}</div>
          ${order.user?.phone ? `<div class="detail-sub">${order.user.phone}</div>` : ""}
        </div>
        <div class="detail-block">
          <div class="detail-label">Payment Info</div>
          <div style="margin-bottom:6px"><span class="status-badge status-${order.status}">${order.status === 'paid' ? '● Paid' : order.status === 'pending' ? '● Pending' : order.status === 'failed' ? '● Failed' : '● ' + order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></div>
          ${order.bakong_transaction_id ? `<div class="detail-sub">Txn: ${order.bakong_transaction_id}</div>` : ""}
          ${order.paid_at ? `<div class="detail-sub">Paid: ${new Date(order.paid_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>` : ""}
        </div>
      </div>

      <div class="table-wrap">
        <table>
          <thead><tr><th>Description</th><th>Qty</th><th style="text-align:right">Unit Price</th>${hasDiscount ? '<th style="text-align:right">Discount</th>' : ''}<th style="text-align:right">Amount</th></tr></thead>
           <tbody>
            ${aggregateProductLines(order.product_name).map((item, i, arr) => {
              const isLast = i === arr.length - 1;
              return `<tr>
              <td style="font-weight:500;color:#111827">${item.name}</td>
              <td>${item.quantity}</td>
              <td style="text-align:right">${i === 0 ? '$' + originalPrice.toFixed(2) : '—'}</td>
              ${hasDiscount ? `<td style="text-align:right;color:#dc2626">${i === 0 && itemDiscountAmount > 0 ? '-$' + itemDiscountAmount.toFixed(2) : '—'}</td>` : ''}
              <td style="text-align:right;font-weight:600;color:#111827">${isLast ? '$' + amount.toFixed(2) : '—'}</td>
            </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="summary-section">
        <div class="summary-table">
          <div class="summary-row"><span>Subtotal</span><span>$${originalPrice.toFixed(2)}</span></div>
          ${itemDiscountAmount > 0 ? `<div class="summary-row discount"><span>Item Discount</span><span>-$${itemDiscountAmount.toFixed(2)}</span></div>` : ''}
          ${saleDiscountAmount > 0 ? `<div class="summary-row discount"><span>Sale Discount</span><span>-$${saleDiscountAmount.toFixed(2)}</span></div>` : ''}
          <div class="summary-row total"><span>Grand Total</span><span>$${amount.toFixed(2)} ${order.currency}</span></div>
        </div>
      </div>

      ${order.notes ? `<div style="margin-top:24px;padding:16px 20px;background:#f9fafb;border-radius:10px;border-left:3px solid #2563eb">
        <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#9ca3af;margin-bottom:6px">Note</div>
        <div style="font-size:13px;color:#374151;line-height:1.6">${order.notes}</div>
      </div>` : ''}

      <div class="divider"></div>

      <div class="footer">
        <div class="footer-thanks">Thank you for your purchase!</div>
        <div class="footer-brand">Realtech Computer — <a href="https://realtechcomputer.com">realtechcomputer.com</a></div>
      </div>

      </body></html>`);
    doc.close();
    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    };
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search invoices..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices Table */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4,5].map(i => <div key={i} className="border border-border rounded-md bg-card p-4 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-64" /></div>)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-md bg-card">
          <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No invoices found</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Invoice</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Customer</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orders.map((order) => {
                  const status = statusConfig[order.status] || statusConfig.pending;
                  const amount = typeof order.amount === "string" ? parseFloat(order.amount as string) : order.amount;
                  return (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><FileText className="w-3.5 h-3.5 text-primary" /></div>
                          <span className="font-mono text-xs font-medium">#{order.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-xs">{order.user?.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{order.user?.email}</div>
                        {order.user?.phone && <div className="text-xs text-muted-foreground">{order.user.phone}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-0.5">
                          {aggregateProductLines(order.product_name).map((item, i) => (
                            <div key={i} className="font-medium text-sm">
                              {item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ""}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold tabular-nums">${amount.toFixed(2)}</td>
                      <td className="px-4 py-3"><Badge variant={status.variant} className="text-xs">{status.label}</Badge></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {order.created_at ? (
                          <>
                            {new Date(order.created_at.replace(/-/g, '/')).toLocaleDateString()}{" "}
                            {new Date(order.created_at.replace(/-/g, '/')).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {order.status !== 'paid' && order.status !== 'cancelled' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                              onClick={() => setMarkPaidOrderId(order.id)}
                              disabled={markPaidMutation.isPending}
                              title="Set to Paid"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handlePrint(order)} title="Print"><Printer className="w-3.5 h-3.5" /></Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-3.5 h-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedOrder(order)}><Eye className="w-3.5 h-3.5 mr-2" /> View</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditOrder(order)}><Pencil className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteOrderId(order.id)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {pagination.current_page} of {pagination.total_pages} ({pagination.total} invoices)</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setCurrentPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" disabled={currentPage >= pagination.total_pages} onClick={() => setCurrentPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => { if (!open) setSelectedOrder(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Invoice #{selectedOrder?.id.slice(0, 8).toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (() => {
            const amount = typeof selectedOrder.amount === "string" ? parseFloat(selectedOrder.amount as string) : selectedOrder.amount;
            const status = statusConfig[selectedOrder.status] || statusConfig.pending;
            return (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <Badge variant={status.variant} className="text-sm px-3 py-1">{status.label}</Badge>
                  <span className="text-sm text-muted-foreground">{selectedOrder.created_at ? new Date(selectedOrder.created_at.replace(/-/g, '/')).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : "—"}</span>
                </div>
                <Separator />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Customer</p>
                  <p className="font-medium">{selectedOrder.user?.full_name || "—"}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.user?.email || "—"}</p>
                  {selectedOrder.user?.phone && <p className="text-sm text-muted-foreground">{selectedOrder.user.phone}</p>}
                </div>
                <Separator />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Product</p>
                  <div className="space-y-2">
                    {aggregateProductLines(selectedOrder.product_name).map((item, i) => (
                      <div key={i} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center"><Package className="w-5 h-5 text-primary" /></div>
                          <div><p className="font-medium text-sm">{item.name}</p><p className="text-xs text-muted-foreground">Qty: {item.quantity}</p></div>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end"><p className="font-bold text-lg">${amount.toFixed(2)}</p></div>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><p className="text-xs text-muted-foreground mb-1">Payment Method</p><p className="font-medium">ABA PayWay / KHQR</p></div>
                  <div><p className="text-xs text-muted-foreground mb-1">Currency</p><p className="font-medium">{selectedOrder.currency}</p></div>
                  {selectedOrder.bakong_transaction_id && <div className="col-span-2"><p className="text-xs text-muted-foreground mb-1">Transaction ID</p><p className="font-mono text-xs break-all">{selectedOrder.bakong_transaction_id}</p></div>}
                  {selectedOrder.paid_at && <div><p className="text-xs text-muted-foreground mb-1">Paid At</p><p className="font-medium">{new Date(selectedOrder.paid_at).toLocaleString()}</p></div>}
                </div>
                <Separator />
                {/* Discount & Grand Total breakdown */}
                {(() => {
                  const origPrice = selectedOrder.original_price ? parseFloat(selectedOrder.original_price) : amount;
                  const itemDisc = selectedOrder.item_discount ? parseFloat(selectedOrder.item_discount) : 0;
                  const saleDisc = selectedOrder.sale_discount ? parseFloat(selectedOrder.sale_discount) : 0;
                  const hasDisc = itemDisc > 0 || saleDisc > 0;
                  return hasDisc ? (
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>${origPrice.toFixed(2)}</span></div>
                      {itemDisc > 0 && (
                        <div className="flex justify-between text-destructive">
                          <span>Item Discount ({selectedOrder.item_discount_type === 'percent' ? `${itemDisc}%` : `$${itemDisc.toFixed(2)}`})</span>
                          <span>-${(origPrice - amount + saleDisc).toFixed(2)}</span>
                        </div>
                      )}
                      {saleDisc > 0 && (
                        <div className="flex justify-between text-destructive">
                          <span>Sale Discount ({selectedOrder.sale_discount_type === 'percent' ? `${saleDisc}%` : `$${saleDisc.toFixed(2)}`})</span>
                          <span>-${saleDisc.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  ) : null;
                })()}
                <div className="flex items-center justify-between bg-primary/5 rounded-lg p-4">
                  <span className="text-sm font-semibold">Grand Total</span>
                  <span className="text-2xl font-bold">${amount.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">{selectedOrder.currency}</span></span>
                </div>
                {selectedOrder.notes && (
                  <div className="rounded-lg border-l-2 border-primary bg-muted/40 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Note</p>
                    <p className="text-sm text-foreground">{selectedOrder.notes}</p>
                  </div>
                )}
                <Button variant="outline" className="w-full gap-2" onClick={() => handlePrint(selectedOrder)}>
                  <Printer className="w-4 h-4" /> Print Invoice
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <InvoiceEditDialog
        order={editOrder}
        open={!!editOrder}
        onOpenChange={(open) => { if (!open) setEditOrder(null); }}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteOrderId} onOpenChange={(open) => { if (!open) setDeleteOrderId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this invoice and restore stock if it was paid. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteOrderId && deleteMutation.mutate(deleteOrderId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark Paid Confirmation Dialog */}
      <AlertDialog open={!!markPaidOrderId} onOpenChange={(open) => { if (!open) setMarkPaidOrderId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark as paid?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set the invoice status to paid. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (markPaidOrderId) { markPaidMutation.mutate(markPaidOrderId); setMarkPaidOrderId(null); } }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Export components for standalone use
export { InvoicesTab, StockManagement, SalesOverview };

// ─── Main Sales Component ──────────────────────────────────────────
export const SalesInvoices = () => {
  const [addSaleOpen, setAddSaleOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Sales</h2>
          <p className="text-sm text-muted-foreground mt-1">Track sales and manage stock</p>
        </div>
        <Button onClick={() => setAddSaleOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Sale
        </Button>
      </div>

      <AddSaleDialog open={addSaleOpen} onOpenChange={setAddSaleOpen} />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="stock" className="gap-1.5"><Boxes className="w-3.5 h-3.5" /> Stock</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><SalesOverview /></TabsContent>
        <TabsContent value="stock"><StockManagement /></TabsContent>
      </Tabs>
    </div>
  );
};
