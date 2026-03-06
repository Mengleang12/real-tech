import { useState, useEffect } from "react";
import { getInvoiceBranding } from "@/lib/invoice-branding";
import { getWarrantyStatus, getWarrantyBadgeVariant, getWarrantyHtml } from "@/lib/warranty-utils";
import { AddSaleDialog } from "./AddSaleDialog";
import { InvoiceEditDialog } from "./InvoiceEditDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminUsersApi, salesApi, warrantyApi, type AdminOrder, type StockProduct } from "@/lib/api";
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
  AlertTriangle, PackageCheck, BarChart3, Boxes, Save, Loader2, TrendingUp, Plus, Trash2, MoreHorizontal, Shield, CreditCard, Tag, ScanBarcode
} from "lucide-react";
import { AddSerialsForProductDialog } from "./SerialManagement";

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "warning"; label: string }> = {
  paid:      { variant: "default",     label: "Paid" },
  pending:   { variant: "warning",     label: "Pending" },
  partial:   { variant: "warning",     label: "Partial" },
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
  const [serialProduct, setSerialProduct] = useState<{ id: number; name: string; icon_url?: string; variants: Array<{ id: number; combination: Record<string, string>; sku?: string }> } | null>(null);

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
    if (status === "out_of_stock") return <Badge variant="destructive" className="text-[10px] px-2 py-0.5">Out of Stock</Badge>;
    if (status === "low_stock") return <Badge className="text-[10px] px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/10">Low Stock</Badge>;
    return <Badge className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10">In Stock</Badge>;
  };

  const getStockStatus = (qty: number) => qty <= 0 ? 'out_of_stock' : qty <= 5 ? 'low_stock' : 'in_stock';

  const getStockColor = (status: string) => {
    if (status === 'out_of_stock') return 'bg-destructive';
    if (status === 'low_stock') return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  // Summary counts
  const totalProducts = stockProducts.length;
  const inStockCount = stockProducts.filter(p => p.variants.reduce((s, v) => s + v.stock_quantity, 0) > 5).length;
  const lowStockCount = stockProducts.filter(p => { const t = p.variants.reduce((s, v) => s + v.stock_quantity, 0); return t > 0 && t <= 5; }).length;
  const outOfStockCount = stockProducts.filter(p => p.variants.reduce((s, v) => s + v.stock_quantity, 0) <= 0).length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Products', count: totalProducts, color: 'text-foreground', bg: 'bg-muted/50' },
          { label: 'In Stock', count: inStockCount, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/5' },
          { label: 'Low Stock', count: lowStockCount, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/5' },
          { label: 'Out of Stock', count: outOfStockCount, color: 'text-destructive', bg: 'bg-destructive/5' },
        ].map((item) => (
          <div key={item.label} className={`${item.bg} border border-border/50 rounded-xl p-4`}>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">{item.label}</p>
            <p className={`text-2xl font-bold mt-1 ${item.color}`}>{item.count}</p>
          </div>
        ))}
      </div>

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

      {/* Stock Cards */}
      {stockLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="border border-border rounded-xl bg-card p-5 space-y-3"><Skeleton className="h-5 w-48" /><Skeleton className="h-3 w-64" /><Skeleton className="h-2 w-full" /></div>)}</div>
      ) : stockProducts.length === 0 ? (
        <div className="text-center py-16 border border-border rounded-xl bg-card">
          <Boxes className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No products found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your search or filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {stockProducts.map((product) => {
            const totalStock = product.variants.reduce((s, v) => s + v.stock_quantity, 0);
            const status = getStockStatus(totalStock);
            const maxStock = Math.max(totalStock, 20); // for progress bar scaling
            const price = product.variants.length > 0 ? Number(product.variants[0].price_adjustment || 0) : 0;

            return (
              <div key={product.id} className="border border-border/60 rounded-xl bg-card overflow-hidden hover:shadow-sm transition-shadow">
                {/* Top bar color indicator */}
                <div className={`h-0.5 ${getStockColor(status)}`} />

                <div className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start gap-3">
                    {product.icon_url ? (
                      <img src={product.icon_url} alt={product.name} className="w-11 h-11 rounded-lg object-cover border border-border/40 flex-shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center border border-border/40 flex-shrink-0">
                        <Package className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-foreground truncate">{product.name}</h4>
                        {getStockBadge(status)}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{product.category || "Uncategorized"}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs font-medium text-foreground">${price.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-lg font-bold tabular-nums ${status === 'out_of_stock' ? 'text-destructive' : status === 'low_stock' ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                        {totalStock}
                      </p>
                      <p className="text-[10px] text-muted-foreground">total units</p>
                    </div>
                  </div>

                  {/* Stock Progress Bar */}
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${getStockColor(status)}`}
                        style={{ width: `${Math.min((totalStock / maxStock) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Variants */}
                  {product.variants.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {product.variants.map((v) => {
                        const label = Object.values(v.combination).join(" / ");
                        const vStatus = getStockStatus(v.stock_quantity);
                        return (
                          <button
                            key={v.id}
                            onClick={() => setEditingStock({ productId: product.id, variantId: v.id, qty: v.stock_quantity })}
                            className={`inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border transition-colors hover:bg-muted/80 cursor-pointer ${
                              vStatus === 'out_of_stock' ? 'border-destructive/30 bg-destructive/5' :
                              vStatus === 'low_stock' ? 'border-amber-500/30 bg-amber-500/5' :
                              'border-border/60 bg-muted/30'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getStockColor(vStatus)}`} />
                            <span className="text-muted-foreground">{label}</span>
                            <span className={`font-semibold tabular-nums ${
                              vStatus === 'out_of_stock' ? 'text-destructive' :
                              vStatus === 'low_stock' ? 'text-amber-600 dark:text-amber-400' :
                              'text-foreground'
                            }`}>{v.stock_quantity}</span>
                            <Pencil className="w-2.5 h-2.5 text-muted-foreground/50" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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
  const [paymentOrder, setPaymentOrder] = useState<AdminOrder | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

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

  const addPaymentMutation = useMutation({
    mutationFn: ({ orderId, data }: { orderId: string; data: { amount: number; method: string; reference?: string; note?: string } }) =>
      adminUsersApi.addPayment(orderId, data),
    onSuccess: () => {
      toast.success("Payment recorded");
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sales-dashboard"] });
      setPaymentOrder(null);
      setPaymentAmount("");
      setPaymentMethod("cash");
      setPaymentReference("");
      setPaymentNote("");
    },
    onError: () => toast.error("Failed to record payment"),
  });

  const [labelOrder, setLabelOrder] = useState<AdminOrder | null>(null);
  const [labelAddress, setLabelAddress] = useState("Cambodia");

  const handlePrintCustomerLabel = () => {
    if (!labelOrder) return;
    const order = labelOrder;
    const w = window.open("", "_blank", "width=400,height=300");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Customer Label</title>
    <style>
      @page { size: 80mm 50mm; margin: 0; }
      body { font-family: -apple-system, sans-serif; padding: 8mm; margin: 0; }
      .name { font-size: 14px; font-weight: 700; margin-bottom: 4px; }
      .info { font-size: 11px; color: #555; line-height: 1.6; }
      .inv { font-size: 10px; color: #888; margin-top: 6px; border-top: 1px dashed #ccc; padding-top: 4px; }
    </style></head><body>
      <div class="name">${order.user?.full_name || "Walk-in Customer"}</div>
      <div class="info">
        ${order.user?.phone ? `<div>📞 ${order.user.phone}</div>` : ''}
        ${order.user?.email ? `<div>✉ ${order.user.email}</div>` : ''}
        ${labelAddress ? `<div>📍 ${labelAddress}</div>` : ''}
      </div>
      <div class="inv">INV #${order.id.slice(0, 8).toUpperCase()} — ${order.created_at ? new Date(order.created_at.replace(/-/g, '/')).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</div>
    </body></html>`);
    w.document.close();
    setTimeout(() => { w.print(); }, 300);
    setLabelOrder(null);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-invoices", statusFilter, currentPage, debouncedSearch],
    queryFn: () => adminUsersApi.getAllOrders({
      status: statusFilter !== "all" ? statusFilter : undefined,
      search: debouncedSearch || undefined,
      page: currentPage,
      limit: 20,
    }),
  });

  const { data: warrantiesData } = useQuery({
    queryKey: ["warranties"],
    queryFn: () => warrantyApi.getAll(),
  });
  const warrantiesList = warrantiesData?.warranties || [];

  const orders = data?.orders || [];
  const pagination = data?.pagination;

  const handlePrint = async (order: AdminOrder) => {
    const branding = await getInvoiceBranding();
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

    const totalPaid = (order.payments || []).reduce((s: number, p: any) => s + (typeof p.amount === "string" ? parseFloat(p.amount) : p.amount), 0);
    const remaining = amount - totalPaid;

    doc.write(`<!DOCTYPE html><html><head><title>Invoice #${order.id.slice(0, 8).toUpperCase()}</title>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        @page{size:A5;margin:8mm 10mm}
        body{font-family:'Inter',system-ui,sans-serif;width:100%;color:#1f2937;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact;font-size:13px;line-height:1.45}
        .page{max-width:128mm;margin:0 auto;padding:4mm 0}
        .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:10px;border-bottom:2px solid #111827}
        .brand{display:flex;align-items:center;gap:10px}
        .brand-icon{width:48px;height:48px;border-radius:6px;overflow:hidden;flex-shrink:0}
        .brand-icon img{width:100%;height:100%;object-fit:contain}
        .brand-name{font-size:16px;font-weight:700;color:#111827}
        .brand-sub{font-size:10px;color:#6b7280;line-height:1.3}
        .inv-meta{text-align:right}
        .inv-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#6b7280}
        .inv-number{font-size:14px;font-weight:700;color:#111827;font-variant-numeric:tabular-nums;margin-top:2px}
        .inv-barcode{margin-top:4px;text-align:right}
        .inv-barcode svg{height:28px;width:auto}
        .inv-date{font-size:10px;color:#6b7280;margin-top:2px}
        .info-row{display:flex;justify-content:space-between;gap:12px;margin:10px 0;padding:8px 12px;background:#f8fafc;border-radius:6px}
        .info-col{flex:1}
        .info-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#9ca3af;margin-bottom:2px}
        .info-name{font-size:12px;font-weight:600;color:#111827}
        .info-sub{font-size:10px;color:#6b7280}
        .status{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600}
        .s-paid{background:#dcfce7;color:#166534}
        .s-pending{background:#fef9c3;color:#854d0e}
        .s-failed{background:#fee2e2;color:#991b1b}
        table{width:100%;border-collapse:collapse;margin:8px 0 0}
        thead th{text-align:left;padding:6px 10px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#6b7280;border-bottom:1px solid #e5e7eb;background:#f9fafb}
        thead th:last-child,thead th.r{text-align:right}
        tbody td{padding:6px 10px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6}
        tbody td:last-child{text-align:right;font-variant-numeric:tabular-nums}
        tbody td.name{font-weight:600;color:#111827}
        .summary{display:flex;justify-content:flex-end;margin-top:6px}
        .summary-tbl{width:200px}
        .s-row{display:flex;justify-content:space-between;padding:4px 10px;font-size:12px;color:#6b7280}
        .s-row.disc{color:#dc2626}
        .s-row.total{background:#111827;color:#fff;border-radius:4px;padding:8px 10px;font-size:14px;font-weight:700;margin-top:3px}
        .warranty-box{margin-top:8px;padding:8px 12px;background:#f8fafc;border-radius:6px;font-size:10px}
        .warranty-box .wlabel{font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#9ca3af;font-size:9px;margin-bottom:2px}
        .note-box{margin-top:6px;padding:6px 10px;background:#f8fafc;border-left:2px solid ${branding.primary_color};border-radius:4px}
        .note-box .nlabel{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:1px}
        .note-box p{font-size:10px;color:#374151;line-height:1.4}
        .footer{text-align:center;margin-top:10px;padding-top:8px;border-top:1px solid #e5e7eb}
        .footer-thanks{font-size:11px;font-weight:600;color:#111827}
        .footer-brand{font-size:9px;color:#9ca3af;margin-top:2px}
        .qr-section{display:flex;justify-content:center;gap:12px;margin-top:8px}
        .qr-section img{width:72px;height:72px;object-fit:contain;border:1px solid #e5e7eb;border-radius:6px;padding:2px;background:#fff}
        @media print{body{padding:0}.page{max-width:100%}}
      </style></head><body>
      <div class="page">

      <div class="header">
        <div class="brand">
          ${branding.site_logo_url
            ? `<div class="brand-icon"><img src="${branding.site_logo_url}" alt="${branding.site_name}" /></div>`
            : `<div class="brand-icon" style="background:${branding.primary_color};color:#fff;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;border-radius:6px">${branding.site_name.charAt(0)}</div>`
          }
          <div>
            <div class="brand-name">${branding.site_name}</div>
            ${branding.site_tagline ? `<div class="brand-sub">${branding.site_tagline}</div>` : ''}
            ${branding.support_phone ? `<div class="brand-sub">${branding.support_phone}</div>` : ''}
            <div class="brand-sub">${order.created_at ? new Date(order.created_at.replace(/-/g, '/')).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</div>
          </div>
        </div>
        <div class="inv-meta">
          <div class="inv-title">Invoice</div>
          <div class="inv-number">#${order.id.slice(0, 8).toUpperCase()}</div>
          <div class="inv-barcode"><svg id="inv-barcode"></svg></div>
          
        </div>
      </div>

      <div class="info-row">
        <div class="info-col">
          <div class="info-label">Customer</div>
          <div class="info-name">${order.user?.full_name || "Walk-in Customer"}</div>
          ${order.user?.phone ? `<div class="info-sub">${order.user.phone}</div>` : ''}
          ${order.user?.email && order.user.email !== 'walkin@guest.local' ? `<div class="info-sub">${order.user.email}</div>` : ''}
        </div>
        <div class="info-col" style="text-align:right">
          <div class="info-label">Status</div>
          <div style="margin-top:2px">
            <span class="status s-${order.status}">${order.status === 'paid' ? '● Paid' : order.status === 'pending' ? (totalPaid > 0 ? '● Partial' : '● Pending') : '● ' + order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span>
          </div>
          ${order.bakong_transaction_id ? `<div class="info-sub" style="margin-top:2px">Txn: ${order.bakong_transaction_id}</div>` : ''}
        </div>
      </div>

      <table>
        <thead><tr><th>Item</th><th>Qty</th><th class="r">Price</th>${hasDiscount ? '<th class="r">Disc.</th>' : ''}<th class="r">Total</th></tr></thead>
        <tbody>
          ${aggregateProductLines(order.product_name).map((item, i, arr) => {
            const isLast = i === arr.length - 1;
            return `<tr>
            <td class="name">${item.name}</td>
            <td>${item.quantity}</td>
            <td style="text-align:right">${i === 0 ? '$' + originalPrice.toFixed(2) : '—'}</td>
            ${hasDiscount ? `<td style="text-align:right;color:#dc2626">${i === 0 && itemDiscountAmount > 0 ? '-$' + itemDiscountAmount.toFixed(2) : '—'}</td>` : ''}
            <td style="text-align:right;font-weight:600">${isLast ? '$' + amount.toFixed(2) : '—'}</td>
          </tr>`;
          }).join('')}
        </tbody>
      </table>

      <div class="summary">
        <div class="summary-tbl">
          <div class="s-row"><span>Subtotal</span><span>$${originalPrice.toFixed(2)}</span></div>
          ${itemDiscountAmount > 0 ? `<div class="s-row disc"><span>Item Discount</span><span>-$${itemDiscountAmount.toFixed(2)}</span></div>` : ''}
          ${saleDiscountAmount > 0 ? `<div class="s-row disc"><span>Sale Discount</span><span>-$${saleDiscountAmount.toFixed(2)}</span></div>` : ''}
          ${order.delivery_fee && parseFloat(order.delivery_fee) > 0 ? `<div class="s-row"><span>Delivery</span><span>+$${parseFloat(order.delivery_fee).toFixed(2)}</span></div>` : ''}
          ${totalPaid > 0 ? `<div class="s-row"><span>Paid</span><span>$${totalPaid.toFixed(2)}</span></div>` : ''}
          ${totalPaid > 0 && remaining > 0.005 ? `<div class="s-row"><span>Remaining</span><span>$${remaining.toFixed(2)}</span></div>` : ''}
          <div class="s-row total"><span>Grand Total</span><span>$${amount.toFixed(2)} ${order.currency}</span></div>
        </div>
      </div>

      ${order.warranty_period ? (() => {
        const matchedWarranty = warrantiesList.find((w: any) => w.name === order.warranty_period);
        const durationDays = matchedWarranty?.duration_days || 0;
        const durationLabel = durationDays >= 365 ? (durationDays / 365) + ' Year' + (durationDays >= 730 ? 's' : '') : durationDays + ' Day' + (durationDays !== 1 ? 's' : '');
        const policyText = matchedWarranty?.policy ? matchedWarranty.policy.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
        return `<div class="warranty-box"><div class="wlabel">Warranty — ${matchedWarranty ? durationLabel : order.warranty_period}</div>${policyText ? `<p style="margin-top:2px;line-height:1.4">${policyText}</p>` : ''}</div>`;
      })() : ''}

      ${order.notes ? `<div class="note-box"><div class="nlabel">Note</div><p>${order.notes}</p></div>` : ''}

      ${(branding.payment_qr_urls || []).length > 0 ? `<div class="qr-section">${branding.payment_qr_urls.map((url: string) => `<img src="${url}" alt="Payment QR" />`).join('')}</div>` : ''}

      <div class="footer">
        <div class="footer-thanks">${branding.invoice_footer_text}</div>
        <div class="footer-brand">${branding.site_name}${branding.support_email ? ` · ${branding.support_email}` : ''}</div>
      </div>

      </div>
      <script>try{JsBarcode("#inv-barcode","${order.id.slice(0, 8).toUpperCase()}",{format:"CODE128",height:28,width:1.2,displayValue:false,margin:0})}catch(e){}<\/script>
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
        <div className="text-center py-16 border border-border rounded-xl bg-card">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
            <FileText className="w-6 h-6 text-muted-foreground/50" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">No invoices found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Invoice</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Customer</th>
                  <th className="text-left px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Items</th>
                   <th className="text-right px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                   <th className="text-center px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Payment</th>
                   <th className="text-center px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                   <th className="text-center px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Warranty</th>
                   <th className="text-left px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                  <th className="text-right px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, idx) => {
                  const status = statusConfig[order.status] || statusConfig.pending;
                  const amount = typeof order.amount === "string" ? parseFloat(order.amount as string) : order.amount;
                  const productLines = aggregateProductLines(order.product_name);
                  return (
                    <tr key={order.id} className={`group transition-colors hover:bg-muted/40 ${idx !== orders.length - 1 ? 'border-b border-border/50' : ''}`}>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <span className="font-mono text-xs font-semibold text-foreground">#{order.id.slice(0, 8).toUpperCase()}</span>
                            {order.serial_number && (
                              <p className="text-[10px] text-muted-foreground/70 mt-0.5">SN: {order.serial_number}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-sm text-foreground">{order.user?.full_name || "Walk-in"}</p>
                        {order.user?.phone && <p className="text-xs text-muted-foreground mt-0.5">{order.user.phone}</p>}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5 max-w-[200px]">
                          {productLines.slice(0, 2).map((item, i) => (
                            <p key={i} className="text-sm text-foreground truncate">
                              {item.name}
                              {item.quantity > 1 && <span className="text-muted-foreground ml-1">×{item.quantity}</span>}
                            </p>
                          ))}
                          {productLines.length > 2 && (
                            <p className="text-xs text-muted-foreground">+{productLines.length - 2} more</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm font-bold tabular-nums text-foreground">${amount.toFixed(2)}</span>
                        {order.original_price && parseFloat(order.original_price) > amount && (
                          <p className="text-[10px] text-muted-foreground line-through mt-0.5">${parseFloat(order.original_price).toFixed(2)}</p>
                        )}
                      </td>
                       <td className="px-4 py-3.5 text-center">
                         {(() => {
                           const totalAmount = typeof order.amount === "string" ? parseFloat(order.amount as string) : order.amount;
                           const paidAmount = (order.payments || []).reduce((sum, p) => sum + (typeof p.amount === "string" ? parseFloat(p.amount as string) : p.amount), 0);
                           const isPaidStatus = order.status === 'paid';
                           
                           if (isPaidStatus && paidAmount <= 0) {
                             // Paid via other means (manual confirm, etc.)
                             return <Badge className="text-[10px] font-semibold px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10">Full</Badge>;
                           }
                           if (paidAmount <= 0) {
                             return <Badge variant="outline" className="text-[10px] font-semibold px-2.5 py-0.5">Unpaid</Badge>;
                           }
                           if (paidAmount >= totalAmount - 0.005) {
                             return (
                               <div className="flex flex-col items-center gap-0.5">
                                 <Badge className="text-[10px] font-semibold px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10">Full</Badge>
                                 <span className="text-[10px] text-muted-foreground tabular-nums">${paidAmount.toFixed(2)}</span>
                               </div>
                             );
                           }
                           return (
                             <div className="flex flex-col items-center gap-0.5">
                               <Badge className="text-[10px] font-semibold px-2.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/10">Partial</Badge>
                               <span className="text-[10px] text-muted-foreground tabular-nums">${paidAmount.toFixed(2)} / ${totalAmount.toFixed(2)}</span>
                             </div>
                           );
                         })()}
                       </td>
                       <td className="px-4 py-3.5 text-center">
                         <Badge variant={status.variant} className="text-[10px] font-semibold px-2.5 py-0.5">{status.label}</Badge>
                       </td>
                       <td className="px-4 py-3.5 text-center">
                         {order.warranty_period ? (() => {
                           const ws = getWarrantyStatus(order.warranty_period, order.created_at);
                           return ws ? (
                             <div className="flex flex-col items-center gap-0.5">
                               <span className="text-[10px] text-muted-foreground">{order.warranty_period}</span>
                               <Badge variant={getWarrantyBadgeVariant(ws)} className="text-[10px] px-1.5 py-0">{ws.label}</Badge>
                             </div>
                           ) : (
                             <span className="text-xs text-muted-foreground">{order.warranty_period}</span>
                           );
                         })() : <span className="text-xs text-muted-foreground">—</span>}
                       </td>
                      <td className="px-4 py-3.5">
                        {order.created_at ? (
                          <div>
                            <p className="text-xs text-foreground">{new Date(order.created_at.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(order.created_at.replace(/-/g, '/')).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
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
                              <DropdownMenuItem onClick={() => setSelectedOrder(order)} className="cursor-pointer"><Eye className="w-3.5 h-3.5 mr-2" /> View</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setEditOrder(order)} className="cursor-pointer"><Pencil className="w-3.5 h-3.5 mr-2" /> Edit</DropdownMenuItem>
                              {order.status !== 'paid' && order.status !== 'cancelled' && (
                                <DropdownMenuItem onClick={() => { const totalAmt = typeof order.amount === "string" ? parseFloat(order.amount as string) : order.amount; const paid = (order.payments || []).reduce((s: number, p: any) => s + (typeof p.amount === "string" ? parseFloat(p.amount) : p.amount), 0); setPaymentAmount(Math.max(0, totalAmt - paid).toFixed(2)); setPaymentOrder(order); }} className="cursor-pointer"><CreditCard className="w-3.5 h-3.5 mr-2" /> Add Payment</DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => { setLabelAddress("Cambodia"); setLabelOrder(order); }} className="cursor-pointer"><Tag className="w-3.5 h-3.5 mr-2" /> Print Label</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => setDeleteOrderId(order.id)}><Trash2 className="w-3.5 h-3.5 mr-2" /> Delete</DropdownMenuItem>
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
        </Card>
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
                <div className="rounded-xl border border-border overflow-hidden">
                  {(() => {
                    const origPrice = selectedOrder.original_price ? parseFloat(selectedOrder.original_price) : amount;
                    const itemDisc = selectedOrder.item_discount ? parseFloat(selectedOrder.item_discount) : 0;
                    const saleDisc = selectedOrder.sale_discount ? parseFloat(selectedOrder.sale_discount) : 0;
                    const hasDisc = itemDisc > 0 || saleDisc > 0;
                    return (
                      <div className="px-4 py-3 space-y-2 bg-muted/30">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="tabular-nums font-medium">${origPrice.toFixed(2)}</span>
                        </div>
                        {itemDisc > 0 && (
                          <div className="flex justify-between text-sm text-destructive">
                            <span>Item Discount ({selectedOrder.item_discount_type === 'percent' ? `${itemDisc}%` : `$${itemDisc.toFixed(2)}`})</span>
                            <span className="tabular-nums">-${(origPrice - amount + saleDisc).toFixed(2)}</span>
                          </div>
                        )}
                        {saleDisc > 0 && (
                          <div className="flex justify-between text-sm text-destructive">
                            <span>Sale Discount ({selectedOrder.sale_discount_type === 'percent' ? `${saleDisc}%` : `$${saleDisc.toFixed(2)}`})</span>
                            <span className="tabular-nums">-${saleDisc.toFixed(2)}</span>
                          </div>
                        )}
                        {(() => {
                          const delFee = selectedOrder.delivery_fee ? parseFloat(selectedOrder.delivery_fee) : 0;
                          return delFee > 0 ? (
                            <div className="flex justify-between text-sm text-muted-foreground">
                              <span>Delivery Fee</span>
                              <span className="tabular-nums">+${delFee.toFixed(2)}</span>
                            </div>
                          ) : null;
                        })()}
                        {!hasDisc && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Discount</span>
                            <span className="tabular-nums text-muted-foreground">$0.00</span>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {/* Paid / Remaining - above Grand Total */}
                  {(() => {
                    const totalPaid = (selectedOrder.payments || []).reduce((s: number, p: any) => s + (typeof p.amount === "string" ? parseFloat(p.amount) : p.amount), 0);
                    const remaining = amount - totalPaid;
                    if (totalPaid <= 0) return null;
                    return (
                      <>
                        <div className="flex justify-between text-sm px-4 py-0.5">
                          <span className="text-muted-foreground">Paid</span>
                          <span className="tabular-nums font-medium">${totalPaid.toFixed(2)}</span>
                        </div>
                        {remaining > 0.005 && (
                          <div className="flex justify-between text-sm px-4 py-0.5">
                            <span className="text-muted-foreground">Remaining</span>
                            <span className="tabular-nums font-medium">${remaining.toFixed(2)}</span>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  <div className="flex items-center justify-between px-4 py-4 bg-foreground dark:bg-card border-t border-border">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-background/60 dark:text-muted-foreground">Grand Total</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-extrabold tabular-nums text-background dark:text-foreground">${amount.toFixed(2)}</span>
                      <span className="text-xs font-medium text-background/50 dark:text-muted-foreground ml-1.5">{selectedOrder.currency}</span>
                    </div>
                  </div>
                </div>
                {selectedOrder.warranty_period && (() => {
                  const matchedWarranty = warrantiesList.find(w => w.name === selectedOrder.warranty_period);
                  const durationDays = matchedWarranty?.duration_days || 0;
                  const durationLabel = durationDays >= 365 ? (durationDays / 365) + ' Year' + (durationDays >= 730 ? 's' : '') : durationDays + ' Day' + (durationDays !== 1 ? 's' : '');
                  const policyText = matchedWarranty?.policy ? matchedWarranty.policy.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
                  return (
                    <div className="rounded-lg bg-muted/30 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1"><Shield className="w-3 h-3" /> Warranty — {matchedWarranty ? durationLabel : selectedOrder.warranty_period}</p>
                      {policyText && <p className="text-xs text-foreground leading-relaxed">{policyText}</p>}
                    </div>
                  );
                })()}
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

      {/* Add Payment Dialog */}
      <Dialog open={!!paymentOrder} onOpenChange={(open) => { if (!open) { setPaymentOrder(null); setPaymentAmount(""); setPaymentMethod("cash"); setPaymentReference(""); setPaymentNote(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Add Payment
            </DialogTitle>
          </DialogHeader>
          {paymentOrder && (() => {
            const totalAmount = typeof paymentOrder.amount === "string" ? parseFloat(paymentOrder.amount as string) : paymentOrder.amount;
            const totalPaid = (paymentOrder.payments || []).reduce((s: number, p: any) => s + (typeof p.amount === "string" ? parseFloat(p.amount) : p.amount), 0);
            const remaining = totalAmount - totalPaid;
            return (
              <div className="space-y-4">
                <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total</span><span className="font-semibold">${totalAmount.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Paid</span><span className="font-semibold">${totalPaid.toFixed(2)}</span></div>
                  <div className="flex justify-between text-sm font-bold"><span>Remaining</span><span className="text-destructive">${remaining.toFixed(2)}</span></div>
                </div>
                <div>
                  <label className="text-sm font-medium">Amount *</label>
                  <Input type="number" step="0.01" min="0.01" max={remaining} value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder={`Max: ${remaining.toFixed(2)}`} className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Method</label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="aba">ABA</SelectItem>
                      <SelectItem value="acleda">ACLEDA</SelectItem>
                      <SelectItem value="khqr">KHQR</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Reference (optional)</label>
                  <Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Transaction ID..." className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium">Note (optional)</label>
                  <Input value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="Note..." className="mt-1" />
                </div>
                <Button
                  className="w-full gap-2"
                  disabled={!paymentAmount || parseFloat(paymentAmount) <= 0 || addPaymentMutation.isPending}
                  onClick={() => {
                    if (!paymentOrder) return;
                    addPaymentMutation.mutate({
                      orderId: paymentOrder.id,
                      data: {
                        amount: parseFloat(paymentAmount),
                        method: paymentMethod,
                        ...(paymentReference && { reference: paymentReference }),
                        ...(paymentNote && { note: paymentNote }),
                      },
                    });
                  }}
                >
                  {addPaymentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  Record Payment
                </Button>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Print Customer Label Dialog */}
      <Dialog open={!!labelOrder} onOpenChange={(open) => { if (!open) setLabelOrder(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              Print Customer Label
            </DialogTitle>
          </DialogHeader>
          {labelOrder && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                <p className="font-semibold text-sm">{labelOrder.user?.full_name || "Walk-in Customer"}</p>
                {labelOrder.user?.phone && <p className="text-xs text-muted-foreground">📞 {labelOrder.user.phone}</p>}
                {labelOrder.user?.email && <p className="text-xs text-muted-foreground">✉ {labelOrder.user.email}</p>}
              </div>
              <div>
                <label className="text-sm font-medium">Address</label>
                <Input value={labelAddress} onChange={(e) => setLabelAddress(e.target.value)} placeholder="Enter address..." className="mt-1" />
              </div>
              <Button className="w-full gap-2" onClick={handlePrintCustomerLabel}>
                <Printer className="w-4 h-4" /> Print Label
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Export components for standalone use
export { InvoicesTab, StockManagement, SalesOverview };

// ─── Main Sales Component ──────────────────────────────────────────
export const SalesInvoices = () => {
  const [addSaleOpen, setAddSaleOpen] = useState(false);

  // Lazy import WarrantyManagement to avoid circular deps
  const [WarrantyMgmt, setWarrantyMgmt] = useState<React.ComponentType | null>(null);
  useEffect(() => {
    import('./WarrantyManagement').then(m => setWarrantyMgmt(() => m.WarrantyManagement));
  }, []);

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

      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList>
          <TabsTrigger value="invoices" className="gap-1.5"><FileText className="w-3.5 h-3.5" /> Invoices</TabsTrigger>
          <TabsTrigger value="overview" className="gap-1.5"><BarChart3 className="w-3.5 h-3.5" /> Overview</TabsTrigger>
          <TabsTrigger value="stock" className="gap-1.5"><Boxes className="w-3.5 h-3.5" /> Stock</TabsTrigger>
          <TabsTrigger value="warranty" className="gap-1.5"><Shield className="w-3.5 h-3.5" /> Warranty</TabsTrigger>
        </TabsList>

        <TabsContent value="invoices"><InvoicesTab /></TabsContent>
        <TabsContent value="overview"><SalesOverview /></TabsContent>
        <TabsContent value="stock"><StockManagement /></TabsContent>
        <TabsContent value="warranty">{WarrantyMgmt ? <WarrantyMgmt /> : null}</TabsContent>
      </Tabs>
    </div>
  );
};
