import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { adminUsersApi, type AdminOrder } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Search, ChevronLeft, ChevronRight, DollarSign, ShoppingCart,
  FileText, Eye, Download, TrendingUp, Package, Calendar, CreditCard,
  CheckCircle, Clock, XCircle, Printer
} from "lucide-react";

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; color: string }> = {
  paid:    { variant: "default",     label: "Paid",    color: "text-emerald-600 dark:text-emerald-400" },
  pending: { variant: "secondary",   label: "Pending", color: "text-amber-600 dark:text-amber-400" },
  failed:  { variant: "destructive", label: "Failed",  color: "text-destructive" },
  expired: { variant: "outline",     label: "Expired", color: "text-muted-foreground" },
};

export const SalesInvoices = () => {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const perPage = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-sales", statusFilter, currentPage],
    queryFn: () => adminUsersApi.getAllOrders({
      status: statusFilter !== "all" ? statusFilter : undefined,
      page: currentPage,
      limit: perPage,
    }),
  });

  const orders = data?.orders || [];
  const pagination = data?.pagination;

  const filtered = searchQuery
    ? orders.filter(o =>
        o.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.bakong_transaction_id?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : orders;

  const totalRevenue = filtered.filter(o => o.status === "paid").reduce((s, o) => {
    const amt = typeof o.amount === "string" ? parseFloat(o.amount as string) : o.amount;
    return s + amt;
  }, 0);

  const paidCount = filtered.filter(o => o.status === "paid").length;
  const pendingCount = filtered.filter(o => o.status === "pending").length;

  const handlePrint = (order: AdminOrder) => {
    const amount = typeof order.amount === "string" ? parseFloat(order.amount as string) : order.amount;
    const invoiceWindow = window.open("", "_blank");
    if (!invoiceWindow) return;
    invoiceWindow.document.write(`
      <!DOCTYPE html>
      <html><head><title>Invoice #${order.id.slice(0, 8).toUpperCase()}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; color: #1a1a1a; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
        .logo { font-size: 24px; font-weight: 700; }
        .invoice-title { font-size: 14px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
        .invoice-number { font-size: 18px; font-weight: 600; margin-top: 4px; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { text-align: left; padding: 10px 12px; border-bottom: 2px solid #e5e5e5; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: #666; }
        td { padding: 12px; border-bottom: 1px solid #f0f0f0; }
        .total-row td { border-top: 2px solid #1a1a1a; border-bottom: none; font-weight: 700; font-size: 16px; }
        .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
        .status-paid { background: #d1fae5; color: #065f46; }
        .status-pending { background: #fef3c7; color: #92400e; }
        .status-failed { background: #fee2e2; color: #991b1b; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999; text-align: center; }
        @media print { body { margin: 0; } .no-print { display: none; } }
      </style></head><body>
      <div class="header">
        <div>
          <div class="logo">Macsofy</div>
          <div style="color: #666; font-size: 13px; margin-top: 4px;">Software & Digital Products</div>
        </div>
        <div style="text-align: right;">
          <div class="invoice-title">Invoice</div>
          <div class="invoice-number">#${order.id.slice(0, 8).toUpperCase()}</div>
          <div style="color: #666; font-size: 13px; margin-top: 4px;">${new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>
      <div style="display: flex; gap: 40px; margin-bottom: 30px;">
        <div class="section" style="flex: 1;">
          <div class="section-title">Bill To</div>
          <div style="font-weight: 600;">${order.user?.full_name || "Customer"}</div>
          <div style="color: #666; font-size: 13px;">${order.user?.email || "—"}</div>
        </div>
        <div class="section" style="flex: 1;">
          <div class="section-title">Payment Info</div>
          <div style="font-size: 13px; color: #666;">
            Status: <span class="status status-${order.status}">${order.status.toUpperCase()}</span><br/>
            ${order.bakong_transaction_id ? `Transaction: ${order.bakong_transaction_id}` : ""}
            ${order.paid_at ? `<br/>Paid: ${new Date(order.paid_at).toLocaleDateString()}` : ""}
          </div>
        </div>
      </div>
      <table>
        <thead><tr><th>Product</th><th>Qty</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody>
          <tr><td>${order.product_name}</td><td>1</td><td style="text-align:right">$${amount.toFixed(2)}</td></tr>
          <tr class="total-row"><td colspan="2">Total</td><td style="text-align:right">$${amount.toFixed(2)} ${order.currency}</td></tr>
        </tbody>
      </table>
      <div class="footer">Thank you for your purchase! — Macsofy</div>
      <div class="no-print" style="text-align: center; margin-top: 20px;">
        <button onclick="window.print()" style="padding: 10px 24px; background: #1a1a1a; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 14px;">Print Invoice</button>
      </div>
      </body></html>
    `);
    invoiceWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold">Sales & Invoices</h2>
        <p className="text-sm text-muted-foreground mt-1">Track all sales, view invoices, and manage revenue</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Total Sales</p>
                <p className="text-2xl font-bold text-foreground">{pagination?.total || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">All orders</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <ShoppingCart className="w-4.5 h-4.5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Revenue (page)</p>
                <p className="text-2xl font-bold text-foreground">${totalRevenue.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground mt-1">From paid orders</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Completed</p>
                <p className="text-2xl font-bold text-foreground">{paidCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Paid orders</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1">Pending</p>
                <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
                <p className="text-xs text-muted-foreground mt-1">Awaiting payment</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Clock className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by product, user, order ID, transaction..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sales Table */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="border border-border rounded-md bg-card p-4 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-md bg-card">
          <FileText className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No sales found</p>
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
                {filtered.map((order) => {
                  const status = statusConfig[order.status] || statusConfig.pending;
                  const amount = typeof order.amount === "string" ? parseFloat(order.amount as string) : order.amount;
                  return (
                    <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center">
                            <FileText className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <span className="font-mono text-xs font-medium">#{order.id.slice(0, 8).toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-xs">{order.user?.full_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{order.user?.email}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-sm">{order.product_name}</td>
                      <td className="px-4 py-3 font-semibold tabular-nums">${amount.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(order.created_at).toLocaleDateString()}{" "}
                        {new Date(order.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setSelectedOrder(order)}
                            title="View Invoice"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handlePrint(order)}
                            title="Print Invoice"
                          >
                            <Printer className="w-3.5 h-3.5" />
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

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Page {pagination.current_page} of {pagination.total_pages} ({pagination.total} sales)
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
                {/* Status & Date */}
                <div className="flex items-center justify-between">
                  <Badge variant={status.variant} className="text-sm px-3 py-1">{status.label}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {new Date(selectedOrder.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>

                <Separator />

                {/* Customer Info */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Customer</p>
                  <p className="font-medium">{selectedOrder.user?.full_name || "—"}</p>
                  <p className="text-sm text-muted-foreground">{selectedOrder.user?.email || "—"}</p>
                </div>

                <Separator />

                {/* Product Details */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Product</p>
                  <div className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{selectedOrder.product_name}</p>
                        <p className="text-xs text-muted-foreground">Qty: 1</p>
                      </div>
                    </div>
                    <p className="font-bold text-lg">${amount.toFixed(2)}</p>
                  </div>
                </div>

                <Separator />

                {/* Payment Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Payment Method</p>
                    <p className="font-medium">ABA PayWay / KHQR</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Currency</p>
                    <p className="font-medium">{selectedOrder.currency}</p>
                  </div>
                  {selectedOrder.bakong_transaction_id && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground mb-1">Transaction ID</p>
                      <p className="font-mono text-xs break-all">{selectedOrder.bakong_transaction_id}</p>
                    </div>
                  )}
                  {selectedOrder.paid_at && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Paid At</p>
                      <p className="font-medium">{new Date(selectedOrder.paid_at).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Total */}
                <div className="flex items-center justify-between bg-primary/5 rounded-lg p-4">
                  <span className="text-sm font-semibold">Total Amount</span>
                  <span className="text-2xl font-bold">${amount.toFixed(2)} <span className="text-sm font-normal text-muted-foreground">{selectedOrder.currency}</span></span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => handlePrint(selectedOrder)}>
                    <Printer className="w-4 h-4" /> Print Invoice
                  </Button>
                </div>
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};
