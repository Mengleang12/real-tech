import { useState, useEffect, useCallback } from "react";
import {
  Plus, Search, Trash2, X, Save, Loader2, Package, DollarSign,
  ChevronLeft, ChevronRight, MoreHorizontal, Truck, CheckCircle2,
  ClipboardList, Ban, FileText, CreditCard, Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminDialog } from "@/components/admin/AdminDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { purchasesApi, salesApi, type Purchase, type PurchaseItem, type PurchaseDashboardStats, type SaleProduct } from "@/lib/api";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  ordered: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  partial: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
  received: "bg-green-500/10 text-green-600 dark:text-green-400",
  completed: "bg-primary/10 text-primary",
  cancelled: "bg-destructive/10 text-destructive",
};

const statusLabels: Record<string, string> = {
  draft: "Draft",
  ordered: "Ordered",
  partial: "Partial",
  received: "Received",
  completed: "Completed",
  cancelled: "Cancelled",
};

// ─── Dashboard Cards ──────────────────────────────────────────────────────────
const PurchaseDashboard = ({ stats }: { stats: PurchaseDashboardStats | null }) => {
  if (!stats) return null;
  const cards = [
    { label: "Total Purchases", value: stats.total_purchases, icon: ClipboardList },
    { label: "Pending", value: stats.pending_purchases, icon: Truck },
    { label: "Total Spent", value: `$${Number(stats.total_spent).toFixed(2)}`, icon: DollarSign },
    { label: "Total Paid", value: `$${Number(stats.total_paid).toFixed(2)}`, icon: CreditCard },
    { label: "Outstanding", value: `$${Number(stats.total_owed).toFixed(2)}`, icon: FileText },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">{c.label}</p>
              </div>
              <p className="text-lg font-bold">{c.value}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// ─── Add/Edit Purchase Dialog ─────────────────────────────────────────────────
interface PurchaseFormItem {
  product_id: number;
  product_name: string;
  variant_id?: number | null;
  variant_label?: string | null;
  quantity: number;
  unit_cost: number;
}

const AddPurchaseDialog = ({
  open,
  onOpenChange,
  editPurchase,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editPurchase?: Purchase | null;
  onSaved: () => void;
}) => {
  const [supplierName, setSupplierName] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<PurchaseFormItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [otherExpense, setOtherExpense] = useState(0);
  const [otherExpenseNote, setOtherExpenseNote] = useState("");
  // Product search
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<SaleProduct[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  useEffect(() => {
    if (open) {
      if (editPurchase) {
        setSupplierName(editPurchase.supplier_name);
        setNotes(editPurchase.notes || "");
        setDeliveryFee(Number(editPurchase.delivery_fee) || 0);
        setOtherExpense(Number(editPurchase.other_expense) || 0);
        setOtherExpenseNote(editPurchase.other_expense_note || "");
        setItems(editPurchase.items.map((i) => ({
          product_id: i.product_id,
          product_name: i.product_name,
          variant_id: i.variant_id,
          variant_label: i.variant_label,
          quantity: i.quantity,
          unit_cost: Number(i.unit_cost),
        })));
      } else {
        setSupplierName("");
        setNotes("");
        setDeliveryFee(0);
        setOtherExpense(0);
        setOtherExpenseNote("");
        setItems([]);
      }
      setProductSearch("");
      setProductResults([]);
    }
  }, [open, editPurchase]);

  const searchProducts = useCallback(async (q: string) => {
    if (q.length < 2) { setProductResults([]); return; }
    setSearchingProducts(true);
    try {
      const res = await salesApi.searchProducts(q);
      setProductResults(res.products);
    } catch { /* ignore */ }
    setSearchingProducts(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => searchProducts(productSearch), 300);
    return () => clearTimeout(t);
  }, [productSearch, searchProducts]);

  const addProduct = (p: SaleProduct, variantId?: number, variantLabel?: string) => {
    setItems((prev) => [...prev, {
      product_id: p.id,
      product_name: p.name + (variantLabel ? ` (${variantLabel})` : ''),
      variant_id: variantId || null,
      variant_label: variantLabel || null,
      quantity: 1,
      unit_cost: Number(p.price) || 0,
    }]);
    setProductSearch("");
    setProductResults([]);
  };

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof PurchaseFormItem, value: string | number) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0);
  const grandTotal = subtotal + deliveryFee + otherExpense;

  const handleSave = async () => {
    if (!supplierName.trim()) { toast.error("Supplier name is required"); return; }
    if (items.length === 0) { toast.error("Add at least one item"); return; }

    setSaving(true);
    try {
      const payload = {
        supplier_name: supplierName,
        notes,
        delivery_fee: deliveryFee,
        other_expense: otherExpense,
        other_expense_note: otherExpenseNote || undefined,
        items: items.map((i) => ({
          product_id: i.product_id,
          product_name: i.product_name,
          variant_id: i.variant_id,
          variant_label: i.variant_label,
          quantity: i.quantity,
          unit_cost: i.unit_cost,
        })),
      };

      if (editPurchase) {
        await purchasesApi.update(editPurchase.id, payload);
        toast.success("Purchase order updated");
      } else {
        await purchasesApi.create({ ...payload, status: 'draft' });
        toast.success("Purchase order created");
      }
      onSaved();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    }
    setSaving(false);
  };

  return (
    <AdminDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editPurchase ? "Edit Purchase Order" : "New Purchase Order"}
      description="Create a purchase order to restock inventory from a supplier"
      size="4xl"
    >
      <div className="space-y-4 max-h-[60vh] overflow-y-auto px-1">
        {/* Supplier */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Supplier Name *</Label>
            <Input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Enter supplier name" />
          </div>
          <div>
            <Label>Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional notes" />
          </div>
        </div>

        {/* Product Search */}
        <div className="space-y-2">
          <Label>Add Products</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search products to add..."
              className="pl-9"
            />
            {searchingProducts && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" />}
          </div>
          {productResults.length > 0 && (
            <div className="border border-border rounded-lg max-h-48 overflow-y-auto bg-popover">
              {productResults.map((p) => (
                <div key={p.id}>
                  {p.variants && p.variants.length > 0 ? (
                    p.variants.map((v: any) => {
                      const label = Object.values(v.combination || {}).join(', ');
                      return (
                        <button
                          key={v.id}
                          onClick={() => addProduct(p, v.id, label)}
                          className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between"
                        >
                          <span>{p.name} <span className="text-muted-foreground">({label})</span></span>
                          <span className="text-muted-foreground">${Number(v.price_adjustment || p.price).toFixed(2)}</span>
                        </button>
                      );
                    })
                  ) : (
                    <button
                      onClick={() => addProduct(p)}
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between"
                    >
                      <span>{p.name}</span>
                      <span className="text-muted-foreground">${Number(p.price).toFixed(2)}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Items Table */}
        {items.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="w-24">Qty</TableHead>
                <TableHead className="w-32">Unit Cost</TableHead>
                <TableHead className="w-28 text-right">Total</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="text-sm">{item.product_name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={item.unit_cost}
                      onChange={(e) => updateItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell className="text-right font-medium text-sm">
                    ${(item.quantity * item.unit_cost).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeItem(idx)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={3} className="text-right text-sm text-muted-foreground">Subtotal</TableCell>
                <TableCell className="text-right font-medium text-sm">${subtotal.toFixed(2)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        )}

        {/* Extra Costs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Delivery Fee</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label>Other Expense</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={otherExpense}
              onChange={(e) => setOtherExpense(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label>Expense Note</Label>
            <Input
              value={otherExpenseNote}
              onChange={(e) => setOtherExpenseNote(e.target.value)}
              placeholder="e.g. Packaging, tax..."
            />
          </div>
        </div>

        {/* Grand Total */}
        {items.length > 0 && (
          <div className="flex justify-end text-sm space-x-6 border-t border-border pt-3">
            <span>Items: <strong>${subtotal.toFixed(2)}</strong></span>
            {deliveryFee > 0 && <span>Delivery: <strong>${deliveryFee.toFixed(2)}</strong></span>}
            {otherExpense > 0 && <span>Other: <strong>${otherExpense.toFixed(2)}</strong></span>}
            <span className="text-base">Grand Total: <strong>${grandTotal.toFixed(2)}</strong></span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {editPurchase ? "Update" : "Create PO"}
        </Button>
      </div>
    </AdminDialog>
  );
};

// ─── Purchase Detail Dialog ───────────────────────────────────────────────────
const PurchaseDetailDialog = ({
  open,
  onOpenChange,
  purchase,
  onRefresh,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  purchase: Purchase | null;
  onRefresh: () => void;
}) => {
  const [activeTab, setActiveTab] = useState("details");
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [addingPayment, setAddingPayment] = useState(false);

  if (!purchase) return null;

  const handleStatusChange = async (newStatus: string) => {
    setStatusUpdating(true);
    try {
      await purchasesApi.updateStatus(purchase.id, newStatus);
      toast.success(`Status updated to ${statusLabels[newStatus]}`);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    }
    setStatusUpdating(false);
  };

  const handleAddPayment = async () => {
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    setAddingPayment(true);
    try {
      await purchasesApi.addPayment(purchase.id, {
        amount: amt,
        method: paymentMethod,
        reference: paymentRef || undefined,
        note: paymentNote || undefined,
      });
      toast.success("Payment recorded");
      setPaymentAmount("");
      setPaymentRef("");
      setPaymentNote("");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    }
    setAddingPayment(false);
  };

  const handleDeletePayment = async (paymentId: number) => {
    try {
      await purchasesApi.deletePayment(purchase.id, paymentId);
      toast.success("Payment removed");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const grandTotal = Number(purchase.grand_total) || (Number(purchase.total_amount) + Number(purchase.delivery_fee || 0) + Number(purchase.other_expense || 0));
  const remaining = grandTotal - Number(purchase.paid_amount);

  return (
    <AdminDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`PO: ${purchase.reference_number}`}
      description={`Supplier: ${purchase.supplier_name}`}
      size="4xl"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="payments">
            Payments ({purchase.payments?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4 mt-4">
          {/* Status + Summary */}
          <div className="flex flex-wrap gap-3 items-center">
            <Badge className={statusColors[purchase.status]}>{statusLabels[purchase.status]}</Badge>
            <span className="text-sm text-muted-foreground">
              Items: <strong>${Number(purchase.total_amount).toFixed(2)}</strong>
            </span>
            {Number(purchase.delivery_fee) > 0 && (
              <span className="text-sm text-muted-foreground">
                Delivery: <strong>${Number(purchase.delivery_fee).toFixed(2)}</strong>
              </span>
            )}
            {Number(purchase.other_expense) > 0 && (
              <span className="text-sm text-muted-foreground">
                Other: <strong>${Number(purchase.other_expense).toFixed(2)}</strong>
                {purchase.other_expense_note && <span className="text-xs ml-1">({purchase.other_expense_note})</span>}
              </span>
            )}
            <span className="text-sm font-medium">
              Grand Total: <strong>${grandTotal.toFixed(2)}</strong>
            </span>
            <span className="text-sm text-muted-foreground">
              Paid: <strong>${Number(purchase.paid_amount).toFixed(2)}</strong>
            </span>
            {remaining > 0 && (
              <span className="text-sm text-destructive">
                Owed: <strong>${remaining.toFixed(2)}</strong>
              </span>
            )}
          </div>

          {/* Status Actions */}
          {purchase.status !== 'cancelled' && purchase.status !== 'completed' && (
            <div className="flex flex-wrap gap-2">
              {purchase.status === 'draft' && (
                <Button size="sm" variant="outline" onClick={() => handleStatusChange('ordered')} disabled={statusUpdating}>
                  <Truck className="w-3.5 h-3.5 mr-1.5" /> Mark as Ordered
                </Button>
              )}
              {(purchase.status === 'ordered' || purchase.status === 'partial') && (
                <Button size="sm" variant="outline" onClick={() => handleStatusChange('received')} disabled={statusUpdating}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Mark as Received
                </Button>
              )}
              {purchase.status === 'received' && (
                <Button size="sm" onClick={() => handleStatusChange('completed')} disabled={statusUpdating}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Complete
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={() => handleStatusChange('cancelled')} disabled={statusUpdating}>
                <Ban className="w-3.5 h-3.5 mr-1.5" /> Cancel
              </Button>
            </div>
          )}

          {/* Items */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="w-20">Qty</TableHead>
                <TableHead className="w-24">Received</TableHead>
                <TableHead className="w-28">Unit Cost</TableHead>
                <TableHead className="w-28 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchase.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm">{item.product_name}</TableCell>
                  <TableCell className="text-sm">{item.quantity}</TableCell>
                  <TableCell className="text-sm">{item.received_quantity || 0}</TableCell>
                  <TableCell className="text-sm">${Number(item.unit_cost).toFixed(2)}</TableCell>
                  <TableCell className="text-right text-sm font-medium">${Number(item.total_cost).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {purchase.notes && (
            <div className="text-sm">
              <Label className="text-muted-foreground">Notes</Label>
              <p className="mt-1">{purchase.notes}</p>
            </div>
          )}

          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>Created: {format(new Date(purchase.created_at), 'MMM d, yyyy h:mm a')}</p>
            {purchase.ordered_at && <p>Ordered: {format(new Date(purchase.ordered_at), 'MMM d, yyyy h:mm a')}</p>}
            {purchase.received_at && <p>Received: {format(new Date(purchase.received_at), 'MMM d, yyyy h:mm a')}</p>}
            {purchase.completed_at && <p>Completed: {format(new Date(purchase.completed_at), 'MMM d, yyyy h:mm a')}</p>}
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4 mt-4">
          {/* Add Payment Form */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div>
              <Label>Amount *</Label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="aba">ABA</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference</Label>
              <Input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="Ref #" />
            </div>
            <Button onClick={handleAddPayment} disabled={addingPayment}>
              {addingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Add Payment
            </Button>
          </div>

          {/* Payment History */}
          {purchase.payments && purchase.payments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchase.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{format(new Date(p.paid_at), 'MMM d, yyyy')}</TableCell>
                    <TableCell className="text-sm font-medium">${Number(p.amount).toFixed(2)}</TableCell>
                    <TableCell className="text-sm capitalize">{p.method?.replace('_', ' ')}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.reference || '—'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeletePayment(p.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">No payments recorded yet</p>
          )}

          {/* Summary */}
          <div className="flex justify-end gap-6 text-sm border-t border-border pt-3">
            <span>Grand Total: <strong>${grandTotal.toFixed(2)}</strong></span>
            <span>Paid: <strong className="text-green-600">${Number(purchase.paid_amount).toFixed(2)}</strong></span>
            <span>Remaining: <strong className={remaining > 0 ? "text-destructive" : "text-green-600"}>${remaining.toFixed(2)}</strong></span>
          </div>
        </TabsContent>
      </Tabs>
    </AdminDialog>
  );
};

// ─── Main Purchase Management Component ───────────────────────────────────────
export const PurchaseManagement = () => {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [stats, setStats] = useState<PurchaseDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Dialogs
  const [addOpen, setAddOpen] = useState(false);
  const [editPurchase, setEditPurchase] = useState<Purchase | null>(null);
  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, dashRes] = await Promise.all([
        purchasesApi.getAll(page, 20, statusFilter, search),
        purchasesApi.dashboard(),
      ]);
      setPurchases(listRes.purchases);
      setTotalPages(listRes.pagination.total_pages);
      setStats(dashRes.stats);
    } catch (e: any) {
      toast.error(e.message || "Failed to load purchases");
    }
    setLoading(false);
  }, [page, statusFilter, search]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await purchasesApi.delete(deleteId);
      toast.success("Purchase order deleted");
      setDeleteId(null);
      loadData();
    } catch (e: any) {
      toast.error(e.message);
    }
    setDeleting(false);
  };

  const handleViewRefresh = async () => {
    if (!viewPurchase) return;
    try {
      const res = await purchasesApi.getById(viewPurchase.id);
      setViewPurchase(res.purchase);
      loadData(); // refresh list & stats too
    } catch { /* ignore */ }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Purchase Orders</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage supplier purchases and restocking</p>
        </div>
        <Button onClick={() => { setEditPurchase(null); setAddOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> New Purchase
        </Button>
      </div>

      {/* Dashboard Stats */}
      <PurchaseDashboard stats={stats} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by PO# or supplier..."
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="ordered">Ordered</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : purchases.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No purchase orders found</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reference</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Grand Total</TableHead>
                <TableHead>Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {purchases.map((po) => (
                <TableRow key={po.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setViewPurchase(po)}>
                  <TableCell className="font-mono text-sm">{po.reference_number}</TableCell>
                  <TableCell className="text-sm">{po.supplier_name}</TableCell>
                  <TableCell className="text-sm">{po.items?.length || 0}</TableCell>
                  <TableCell className="text-sm font-medium">${(Number(po.grand_total) || Number(po.total_amount)).toFixed(2)}</TableCell>
                  <TableCell className="text-sm">${Number(po.paid_amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[po.status]}>{statusLabels[po.status]}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(po.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewPurchase(po)}>View</DropdownMenuItem>
                        {po.status === 'draft' && (
                          <DropdownMenuItem onClick={() => { setEditPurchase(po); setAddOpen(true); }}>Edit</DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(po.id)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground flex items-center px-3">
            {page} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <AddPurchaseDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        editPurchase={editPurchase}
        onSaved={loadData}
      />

      <PurchaseDetailDialog
        open={!!viewPurchase}
        onOpenChange={(v) => { if (!v) setViewPurchase(null); }}
        purchase={viewPurchase}
        onRefresh={handleViewRefresh}
      />

      <AlertDialog open={!!deleteId} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Order?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this purchase order. If stock was added from this PO, it will be reversed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
