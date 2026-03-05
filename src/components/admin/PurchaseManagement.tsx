import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Minus, Search, Trash2, X, Save, Loader2, Package, DollarSign,
  ChevronLeft, ChevronRight, MoreHorizontal, Truck, CheckCircle2,
  ClipboardList, Ban, FileText, CreditCard, Calendar, ScanBarcode,
  PackageCheck, PackageX, RotateCcw, ArrowDownToLine
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
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
import { purchasesApi, suppliersApi, salesApi, type Purchase, type PurchaseItem, type PurchaseReceiveLog, type PurchaseExpense, type PurchaseDashboardStats, type SaleProduct, type Supplier } from "@/lib/api";
import { format } from "date-fns";

const playScanBeep = (success: boolean) => {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (success) {
      osc.frequency.value = 1200;
      osc.type = 'sine';
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } else {
      osc.frequency.value = 400;
      osc.type = 'square';
      gain.gain.value = 0.2;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch { /* audio not available */ }
};

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
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [quickSupplierName, setQuickSupplierName] = useState("");
  const [addingSupplier, setAddingSupplier] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [notes, setNotes] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [items, setItems] = useState<PurchaseFormItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [otherExpense, setOtherExpense] = useState(0);
  const [otherExpenseNote, setOtherExpenseNote] = useState("");
  // Product search
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<SaleProduct[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  // Load suppliers on open
  useEffect(() => {
    if (open) {
      suppliersApi.getAll().then((r) => setSuppliers(r.suppliers)).catch(() => {});
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      if (editPurchase) {
        setSupplierId((editPurchase as any).supplier_id || null);
        setNotes(editPurchase.notes || "");
        setTrackingNumber(editPurchase.tracking_number || "");
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
        setSupplierId(null);
        setNotes("");
        setTrackingNumber("");
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
      unit_cost: Number(variantId ? p.variants.find(v => v.id === variantId)?.purchase_price ?? p.variants.find(v => v.id === variantId)?.price_adjustment : (p.variants.length > 0 ? p.variants[0].purchase_price ?? p.variants[0].price_adjustment : 0)) || 0,
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

  const handleQuickAddSupplier = async () => {
    if (!quickSupplierName.trim()) return;
    setAddingSupplier(true);
    try {
      const res = await suppliersApi.create({ name: quickSupplierName.trim() });
      setSuppliers((prev) => [...prev, res.supplier]);
      setSupplierId(res.supplier.id);
      setQuickSupplierName("");
      setShowQuickAdd(false);
      toast.success("Supplier added");
    } catch (e: any) {
      toast.error(e.message || "Failed to add supplier");
    }
    setAddingSupplier(false);
  };

  const handleSave = async () => {
    if (!supplierId) { toast.error("Please select a supplier"); return; }
    if (items.length === 0) { toast.error("Add at least one item"); return; }

    setSaving(true);
    try {
      const payload = {
        supplier_id: supplierId,
        notes,
        tracking_number: trackingNumber || undefined,
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <Label>Supplier *</Label>
            <div className="flex gap-2">
              <Select value={supplierId ? String(supplierId) : ""} onValueChange={(v) => setSupplierId(Number(v))}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)}>
                      {s.name}{s.phone ? ` (${s.phone})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" size="icon" variant="outline" onClick={() => setShowQuickAdd(true)} title="Add new supplier">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {showQuickAdd && (
              <div className="flex gap-2 mt-2">
                <Input
                  value={quickSupplierName}
                  onChange={(e) => setQuickSupplierName(e.target.value)}
                  placeholder="New supplier name"
                  className="flex-1"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleQuickAddSupplier();
                    }
                    if (e.key === 'Escape') { setShowQuickAdd(false); setQuickSupplierName(""); }
                  }}
                />
                <Button type="button" size="sm" disabled={addingSupplier || !quickSupplierName.trim()} onClick={handleQuickAddSupplier}>
                  {addingSupplier ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setShowQuickAdd(false); setQuickSupplierName(""); }}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
          <div>
            <Label>Tracking Number</Label>
            <Input value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="e.g. YT2312345678" />
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
                          <span className="text-muted-foreground">${Number(v.price_adjustment || 0).toFixed(2)}</span>
                        </button>
                      );
                    })
                  ) : (
                    <button
                      onClick={() => addProduct(p, p.variants.length > 0 ? p.variants[0].id : undefined)}
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm flex justify-between"
                    >
                      <span>{p.name}</span>
                      <span className="text-muted-foreground">${p.variants.length > 0 ? Number(p.variants[0].price_adjustment).toFixed(2) : '0.00'}</span>
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
                    <div className="flex items-center gap-0.5 justify-center">
                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateItem(idx, 'quantity', Math.max(1, item.quantity - 1))}><Minus className="w-3 h-3" /></Button>
                      <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                      <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateItem(idx, 'quantity', item.quantity + 1)}><Plus className="w-3 h-3" /></Button>
                    </div>
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
  // Expense form
  const [expenseCategory, setExpenseCategory] = useState("delivery");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [addingExpense, setAddingExpense] = useState(false);
  const [orderConfirmOpen, setOrderConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  // Partial receive
  const [receiveMode, setReceiveMode] = useState(false);
  const [receivedQtys, setReceivedQtys] = useState<Record<number, number>>({});
  const [receivingItems, setReceivingItems] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [stockReversalConfirmOpen, setStockReversalConfirmOpen] = useState(false);
  const [reversalDetails, setReversalDetails] = useState<{ product_name: string; delta: number }[]>([]);

  // Auto-fetch full purchase details on open (list data is incomplete)
  useEffect(() => {
    if (open && purchase && !initialLoaded) {
      setInitialLoaded(true);
      onRefresh();
    }
    if (!open) {
      setInitialLoaded(false);
      setReceiveMode(false);
    }
  }, [open, purchase?.id]);

  if (!purchase) return null;

  const initReceiveMode = () => {
    const qtys: Record<number, number> = {};
    purchase.items.forEach((item) => {
      qtys[item.id] = item.received_quantity || 0;
    });
    setReceivedQtys(qtys);
    setReceiveMode(true);
  };

  const executeReceiveItems = async () => {
    setReceivingItems(true);
    try {
      const items = purchase.items.map((item) => ({
        item_id: item.id,
        received_quantity: receivedQtys[item.id] ?? (item.received_quantity || 0),
      }));
      await purchasesApi.receiveItems(purchase.id, items);
      toast.success("Items received successfully");
      setReceiveMode(false);
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to receive items");
    }
    setReceivingItems(false);
  };

  const handleReceiveItems = () => {
    // Check if any items have reduced quantities (stock reversal)
    const reductions: { product_name: string; delta: number }[] = [];
    purchase.items.forEach((item) => {
      const oldQty = item.received_quantity || 0;
      const newQty = receivedQtys[item.id] ?? oldQty;
      if (newQty < oldQty) {
        reductions.push({
          product_name: item.product_name + (item.variant_label ? ` (${item.variant_label})` : ''),
          delta: oldQty - newQty,
        });
      }
    });

    if (reductions.length > 0) {
      setReversalDetails(reductions);
      setStockReversalConfirmOpen(true);
    } else {
      executeReceiveItems();
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    // Intercept draft → ordered with confirmation
    if (purchase.status === 'draft' && newStatus === 'ordered') {
      setOrderConfirmOpen(true);
      return;
    }
    // Intercept cancel with confirmation
    if (newStatus === 'cancelled') {
      setCancelConfirmOpen(true);
      return;
    }
    await executeStatusChange(newStatus);
  };

  const executeStatusChange = async (newStatus: string) => {
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

  const handleAddExpense = async () => {
    const amt = parseFloat(expenseAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    if (!expenseCategory) { toast.error("Select a category"); return; }
    setAddingExpense(true);
    try {
      await purchasesApi.addExpense(purchase.id, {
        category: expenseCategory,
        description: expenseDesc || undefined,
        amount: amt,
      });
      toast.success("Expense recorded");
      setExpenseAmount("");
      setExpenseDesc("");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    }
    setAddingExpense(false);
  };

  const handleDeleteExpense = async (expenseId: number) => {
    try {
      await purchasesApi.deleteExpense(purchase.id, expenseId);
      toast.success("Expense removed");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const grandTotal = Number(purchase.grand_total) > 0 
    ? Number(purchase.grand_total) 
    : (Number(purchase.total_amount) + Number(purchase.delivery_fee || 0) + Number(purchase.other_expense || 0));
  const remaining = grandTotal - Number(purchase.paid_amount);

  return (
    <>
    <AdminDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`PO: ${purchase.reference_number}`}
      description={`Supplier: ${purchase.supplier_name}`}
      size="4xl"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start">
          <TabsTrigger value="details">
            <Package className="w-3.5 h-3.5 mr-1.5" /> Items & Receive
          </TabsTrigger>
          <TabsTrigger value="payments">
            <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Payments ({purchase.payments?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="expenses">
            <DollarSign className="w-3.5 h-3.5 mr-1.5" /> Expenses ({purchase.expenses?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-5 mt-4">
          {/* ── Summary Bar ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Items Total</p>
                <p className="text-lg font-bold">${Number(purchase.total_amount).toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Grand Total</p>
                <p className="text-lg font-bold">${grandTotal.toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Paid</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">${Number(purchase.paid_amount).toFixed(2)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Outstanding</p>
                <p className={`text-lg font-bold ${remaining > 0 ? 'text-destructive' : 'text-green-600 dark:text-green-400'}`}>
                  ${remaining.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* ── Overall Receive Progress ── */}
          {(() => {
            const totalOrdered = purchase.items.reduce((s, i) => s + i.quantity, 0);
            const totalRecvd = purchase.items.reduce((s, i) => s + (i.received_quantity || 0), 0);
            const pct = totalOrdered > 0 ? Math.round((totalRecvd / totalOrdered) * 100) : 0;
            return (
              <Card className={`border-2 ${pct === 100 ? 'border-green-500/30 bg-green-500/5' : pct > 0 ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-border'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {pct === 100 ? (
                        <PackageCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                      ) : (
                        <ArrowDownToLine className="w-5 h-5 text-muted-foreground" />
                      )}
                      <span className="font-semibold text-sm">
                        {pct === 100 ? 'All Items Received' : pct > 0 ? 'Partially Received' : 'Not Yet Received'}
                      </span>
                    </div>
                    <span className="text-sm font-mono font-bold">{totalRecvd} / {totalOrdered} items ({pct}%)</span>
                  </div>
                  <Progress value={pct} className="h-2.5" />
                </CardContent>
              </Card>
            );
          })()}

          {/* ── Status Actions ── */}
          {purchase.status !== 'cancelled' && purchase.status !== 'completed' && (
            <div className="flex flex-wrap gap-2">
              {purchase.status === 'draft' && (
                <Button size="sm" onClick={() => handleStatusChange('ordered')} disabled={statusUpdating}>
                  <Truck className="w-3.5 h-3.5 mr-1.5" /> Mark as Ordered
                </Button>
              )}
              {(purchase.status === 'ordered' || purchase.status === 'partial') && !receiveMode && (
                <Button size="sm" onClick={initReceiveMode} disabled={statusUpdating}>
                  <ArrowDownToLine className="w-3.5 h-3.5 mr-1.5" /> Receive Items
                </Button>
              )}
              {(purchase.status === 'ordered' || purchase.status === 'partial') && !receiveMode && (
                <Button size="sm" variant="outline" onClick={() => handleStatusChange('received')} disabled={statusUpdating}>
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Mark All Received
                </Button>
              )}
              {purchase.status === 'received' && !receiveMode && (
                <>
                  <Button size="sm" variant="outline" onClick={initReceiveMode} disabled={statusUpdating}>
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Adjust Quantities
                  </Button>
                  <Button size="sm" onClick={() => handleStatusChange('completed')} disabled={statusUpdating}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Complete Order
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleStatusChange('cancelled')} disabled={statusUpdating}>
                <Ban className="w-3.5 h-3.5 mr-1.5" /> Cancel
              </Button>
            </div>
          )}

          {/* ── Receive Mode Banner ── */}
          {receiveMode && (
            <Card className="border-2 border-primary/30 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowDownToLine className="w-5 h-5 text-primary" />
                  <span className="font-semibold text-primary">Receive Mode Active</span>
                  <span className="text-xs text-muted-foreground ml-auto">Enter quantities received for each item</span>
                </div>
                <div className="flex gap-2 justify-end flex-wrap">
                  <Button size="sm" variant="ghost" onClick={() => setReceiveMode(false)} disabled={receivingItems}>
                    <X className="w-3.5 h-3.5 mr-1.5" /> Cancel
                  </Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => {
                    const qtys: Record<number, number> = {};
                    purchase.items.forEach((item) => { qtys[item.id] = 0; });
                    setReceivedQtys(qtys);
                  }}>
                    <PackageX className="w-3.5 h-3.5 mr-1.5" /> Reset All
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => {
                    const qtys: Record<number, number> = {};
                    purchase.items.forEach((item) => { qtys[item.id] = item.quantity; });
                    setReceivedQtys(qtys);
                  }}>
                    <PackageCheck className="w-3.5 h-3.5 mr-1.5" /> Receive All
                  </Button>
                  <Button size="sm" onClick={handleReceiveItems} disabled={receivingItems}>
                    {receivingItems && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Confirm
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Items List ── */}
          <div className="space-y-2">
            {purchase.items.map((item) => {
              const rcv = receiveMode ? (receivedQtys[item.id] ?? 0) : (item.received_quantity || 0);
              const pct = item.quantity > 0 ? Math.round((rcv / item.quantity) * 100) : 0;
              const isComplete = rcv >= item.quantity;

              return (
                <Card key={item.id} className={`transition-all ${receiveMode ? 'border-primary/20' : ''} ${isComplete && !receiveMode ? 'bg-green-500/5 border-green-500/20' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isComplete ? 'bg-green-500/10 text-green-600 dark:text-green-400' : 'bg-muted text-muted-foreground'
                      }`}>
                        {isComplete ? <PackageCheck className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{item.product_name}</p>
                            {item.variant_label && (
                              <p className="text-xs text-muted-foreground">Variant: {item.variant_label}</p>
                            )}
                          </div>
                          <span className="text-sm font-medium whitespace-nowrap">${Number(item.total_cost).toFixed(2)}</span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
                          <span>Ordered: <strong className="text-foreground">{item.quantity}</strong></span>
                          <span>×</span>
                          <span>${Number(item.unit_cost).toFixed(2)}</span>
                        </div>

                        {/* Progress bar */}
                        {!receiveMode && (
                          <div className="flex items-center gap-3">
                            <Progress value={pct} className="h-2 flex-1" />
                            <Badge
                              variant={isComplete ? "default" : "secondary"}
                              className={`text-[11px] px-2 py-0.5 ${isComplete ? 'bg-green-600 hover:bg-green-600' : ''}`}
                            >
                              {rcv} / {item.quantity}
                            </Badge>
                          </div>
                        )}

                        {/* Receive mode input */}
                        {receiveMode && (
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">Received:</span>
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => setReceivedQtys((prev) => ({
                                  ...prev,
                                  [item.id]: Math.max(0, (prev[item.id] ?? 0) - 1),
                                }))}
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </Button>
                              <Input
                                type="number"
                                min={0}
                                max={item.quantity}
                                className="w-16 h-8 text-center text-sm font-semibold"
                                value={receivedQtys[item.id] ?? 0}
                                onChange={(e) => setReceivedQtys((prev) => ({
                                  ...prev,
                                  [item.id]: Math.min(Math.max(0, parseInt(e.target.value) || 0), item.quantity),
                                }))}
                              />
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                                onClick={() => setReceivedQtys((prev) => ({
                                  ...prev,
                                  [item.id]: Math.min((prev[item.id] ?? 0) + 1, item.quantity),
                                }))}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                            <span className="text-xs text-muted-foreground">/ {item.quantity}</span>
                            <Progress value={Math.round(((receivedQtys[item.id] ?? 0) / item.quantity) * 100)} className="h-1.5 flex-1 max-w-[100px]" />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* ── Notes & Tracking ── */}
          {(purchase.notes || purchase.tracking_number) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {purchase.notes && (
                <Card>
                  <CardContent className="p-3">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-sm">{purchase.notes}</p>
                  </CardContent>
                </Card>
              )}
              {purchase.tracking_number && (
                <Card>
                  <CardContent className="p-3">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Tracking</p>
                    <p className="text-sm font-mono">{purchase.tracking_number} {purchase.carrier && `(${purchase.carrier})`}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ── Timeline ── */}
          <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 pt-2 border-t border-border">
            <span>Created: {format(new Date(purchase.created_at), 'MMM d, yyyy h:mm a')}</span>
            {purchase.ordered_at && <span>Ordered: {format(new Date(purchase.ordered_at), 'MMM d, yyyy h:mm a')}</span>}
            {purchase.received_at && <span>Received: {format(new Date(purchase.received_at), 'MMM d, yyyy h:mm a')}</span>}
            {purchase.completed_at && <span>Completed: {format(new Date(purchase.completed_at), 'MMM d, yyyy h:mm a')}</span>}
          </div>
        </TabsContent>
      </Tabs>
    </AdminDialog>

      {/* Confirm Order Dialog */}
      <AlertDialog open={orderConfirmOpen} onOpenChange={setOrderConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Order Placement</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Have you already paid the supplier for this order?</p>
              <p className="text-xs text-muted-foreground">
                If yes, a payment of <span className="font-semibold">${grandTotal.toFixed(2)}</span> will be recorded automatically. You can add extra fees later in the Expenses tab.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 sm:gap-0">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setOrderConfirmOpen(false);
                await executeStatusChange('ordered');
              }}
            >
              No, Not Yet Paid
            </AlertDialogAction>
            <AlertDialogAction
              className="bg-green-600 text-white hover:bg-green-700"
              onClick={async () => {
                setOrderConfirmOpen(false);
                await executeStatusChange('ordered');
                try {
                  await purchasesApi.addPayment(purchase.id, {
                    amount: grandTotal,
                    method: 'bank',
                    note: 'Auto-recorded on order placement',
                  });
                  toast.success('Payment recorded automatically');
                  onRefresh();
                } catch {
                  toast.error('Order placed but failed to record payment');
                }
              }}
            >
              Yes, Already Paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this purchase order? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Go Back</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                setCancelConfirmOpen(false);
                await executeStatusChange('cancelled');
              }}
            >
              Yes, Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stock Reversal Confirmation Dialog */}
      <AlertDialog open={stockReversalConfirmOpen} onOpenChange={setStockReversalConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Stock Reversal Warning</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>You are reducing the received quantity for the following items. This will <strong>deduct stock</strong> from inventory:</p>
                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="w-32 text-right">Stock Removed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reversalDetails.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-sm">{item.product_name}</TableCell>
                          <TableCell className="text-right text-sm font-medium text-destructive">-{item.delta}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="text-xs text-muted-foreground">
                  This action cannot be automatically undone. Make sure the quantities are correct before confirming.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setStockReversalConfirmOpen(false);
                executeReceiveItems();
              }}
            >
              Confirm Stock Reversal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // Dialogs
  const [addOpen, setAddOpen] = useState(false);
  const [editPurchase, setEditPurchase] = useState<Purchase | null>(null);
  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Barcode scan tab
  const [mainTab, setMainTab] = useState("orders");
  const [scanValue, setScanValue] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scannedPurchase, setScannedPurchase] = useState<Purchase | null>(null); // kept for clearScan
  const [scannedResults, setScannedResults] = useState<Purchase[]>([]);
  const [autoReceive, setAutoReceive] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (mainTab === 'scan') {
      setScanValue("");
      setScannedPurchase(null);
      setScannedResults([]);
      setTimeout(() => scanInputRef.current?.focus(), 100);
    }
  }, [mainTab]);

  const handleScan = async () => {
    const val = scanValue.trim();
    if (!val) return;
    setScanning(true);
    try {
      const res = await purchasesApi.getAll(1, 20, 'all', val);
      if (res.purchases.length >= 1) {
        const newPurchases = res.purchases;
        // Add found purchases to the list, avoiding duplicates
        setScannedResults((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const newItems = newPurchases.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newItems];
        });
        if (newPurchases.length === 1) {
          toast.success(`Found: ${newPurchases[0].reference_number}`);
        } else {
          toast.success(`Found ${newPurchases.length} orders`);
        }
        // Auto-receive: update status to 'received' for eligible POs
        if (autoReceive) {
          for (const po of newPurchases) {
            if (po.status === 'received' || po.status === 'completed') {
              toast.warning(`${po.reference_number} is already ${statusLabels[po.status]}`);
              playScanBeep(false);
            } else if (['draft', 'ordered', 'partial'].includes(po.status)) {
              try {
                await purchasesApi.updateStatus(po.id, 'received');
                const now = new Date().toISOString();
                toast.success(`${po.reference_number} marked as received`);
                playScanBeep(true);
                setScannedResults((prev) => prev.map((p) => p.id === po.id ? { ...p, status: 'received', received_at: now } : p));
              } catch {
                toast.error(`Failed to receive ${po.reference_number}`);
                playScanBeep(false);
              }
            }
          }
          loadData(); // refresh stats
        }
      } else {
        toast.error("No purchase order found for this tracking number");
        playScanBeep(false);
      }
    } catch {
      toast.error("Failed to search");
    }
    setScanValue("");
    setScanning(false);
    setTimeout(() => scanInputRef.current?.focus(), 50);
  };

  const handleClearScan = () => {
    setScanValue("");
    setScannedPurchase(null);
    setScannedResults([]);
    setTimeout(() => scanInputRef.current?.focus(), 50);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, dashRes] = await Promise.all([
        purchasesApi.getAll(page, 20, statusFilter, debouncedSearch),
        purchasesApi.dashboard(),
      ]);
      setPurchases(listRes.purchases);
      setTotalPages(listRes.pagination.total_pages);
      setStats(dashRes.stats);
    } catch (e: any) {
      toast.error(e.message || "Failed to load purchases");
    }
    setLoading(false);
  }, [page, statusFilter, debouncedSearch]);

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

      {/* Main Tabs */}
      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList>
          <TabsTrigger value="orders" className="gap-2">
            <ClipboardList className="w-4 h-4" /> Orders
          </TabsTrigger>
          <TabsTrigger value="scan" className="gap-2">
            <ScanBarcode className="w-4 h-4" /> Scan
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by PO#, supplier, or tracking#..."
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
                    <TableHead>Tracking</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="w-10">Action</TableHead>
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
                      <TableCell className="text-sm font-mono text-muted-foreground">{po.tracking_number || '—'}</TableCell>
                      <TableCell>
                        <Badge className={statusColors[po.status]}>{statusLabels[po.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(po.created_at), 'MMM d, yyyy h:mm a')}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Actions</div>
                            <DropdownMenuItem onClick={() => setViewPurchase(po)}>
                              <FileText className="w-4 h-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            {['draft', 'ordered'].includes(po.status) && (
                              <DropdownMenuItem onClick={() => { setEditPurchase(po); setAddOpen(true); }}>
                                <ClipboardList className="w-4 h-4 mr-2" /> Edit Order
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(po.id)}>
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
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
        </TabsContent>

        {/* Scan Tab */}
        <TabsContent value="scan" className="mt-4 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center gap-4 max-w-lg mx-auto">
                <ScanBarcode className="w-10 h-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground text-center">
                  Scan a barcode or type a tracking number to quickly find a purchase order
                </p>
                <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-2.5 w-full">
                  <Switch id="auto-receive" checked={autoReceive} onCheckedChange={setAutoReceive} />
                  <Label htmlFor="auto-receive" className="text-sm cursor-pointer flex-1">
                    Auto-receive stock on scan
                  </Label>
                  {autoReceive && (
                    <Badge variant="default" className="text-xs">Active</Badge>
                  )}
                </div>
                <div className="relative w-full">
                  <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    ref={scanInputRef}
                    value={scanValue}
                    onChange={(e) => setScanValue(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleScan(); }}
                    placeholder="Scan barcode or type tracking number..."
                    className="pl-11 text-lg h-12"
                    autoFocus
                    disabled={scanning}
                  />
                  {scanning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-md">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <div className="flex gap-3">
                  {scannedResults.length > 0 && (
                    <Button variant="outline" onClick={handleClearScan}>
                      <X className="w-4 h-4 mr-2" /> Clear
                    </Button>
                  )}
                  <Button onClick={handleScan} disabled={scanning || !scanValue.trim()}>
                    {scanning ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                    Search
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scanned Results List - Card View */}
          {scannedResults.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Scanned results: {scannedResults.length} order(s)</p>
              {scannedResults.map((po) => (
                <Card key={po.id}>
                  <CardContent className="p-6 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        <Package className="w-5 h-5 text-primary" />
                        <div>
                          <h3 className="font-semibold text-lg">{po.reference_number}</h3>
                          <p className="text-sm text-muted-foreground">{po.supplier_name}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={statusColors[po.status]}>{statusLabels[po.status]}</Badge>
                        <Button variant="outline" size="sm" onClick={() => setViewPurchase(po)}>
                          <FileText className="w-4 h-4 mr-2" /> Full Details
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setScannedResults((prev) => prev.filter((p) => p.id !== po.id))}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Quick Info Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Grand Total</p>
                        <p className="font-semibold">${(Number(po.grand_total) || Number(po.total_amount)).toFixed(2)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Paid</p>
                        <p className="font-semibold">${Number(po.paid_amount).toFixed(2)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Tracking</p>
                        <p className="font-mono text-sm">{po.tracking_number || '—'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Carrier</p>
                        <p className="text-sm">{po.carrier || '—'}</p>
                      </div>
                    </div>

                    {/* Date Info */}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span>Created: {format(new Date(po.created_at), 'MMM d, yyyy h:mm a')}</span>
                      {po.ordered_at && <span>Ordered: {format(new Date(po.ordered_at), 'MMM d, yyyy h:mm a')}</span>}
                      {po.received_at && <span>Received: {format(new Date(po.received_at), 'MMM d, yyyy h:mm a')}</span>}
                      {po.completed_at && <span>Completed: {format(new Date(po.completed_at), 'MMM d, yyyy h:mm a')}</span>}
                    </div>

                    {po.notes && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Notes: </span>{po.notes}
                      </div>
                    )}

                    {/* Items Table */}
                    {po.items && po.items.length > 0 && (
                      <div className="border border-border rounded-lg overflow-hidden">
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
                            {po.items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell className="text-sm">{item.product_name}</TableCell>
                                <TableCell className="text-sm">{item.quantity}</TableCell>
                                <TableCell className="text-sm">
                                  <Badge variant={item.received_quantity >= item.quantity ? "default" : "secondary"} className="text-xs">
                                    {item.received_quantity || 0} / {item.quantity}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm">${Number(item.unit_cost).toFixed(2)}</TableCell>
                                <TableCell className="text-sm text-right font-medium">${Number(item.total_cost).toFixed(2)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Expenses Summary */}
                    {po.expenses && po.expenses.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Expenses</p>
                        <div className="flex flex-wrap gap-3">
                          {po.expenses.map((exp) => (
                            <Badge key={exp.id} variant="outline" className="text-xs capitalize">
                              {exp.category}: ${Number(exp.amount).toFixed(2)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Payments Summary */}
                    {po.payments && po.payments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Payments</p>
                        <div className="flex flex-wrap gap-3">
                          {po.payments.map((pay) => (
                            <Badge key={pay.id} variant="outline" className="text-xs">
                              ${Number(pay.amount).toFixed(2)} via {pay.method} — {format(new Date(pay.paid_at), 'MMM d, h:mm a')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

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
