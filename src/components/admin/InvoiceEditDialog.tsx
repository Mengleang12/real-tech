import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { adminUsersApi, salesApi, type AdminOrder, type OrderAttachment, type OrderPayment, type SaleProduct } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Pencil, Image, CreditCard, Loader2, Trash2, Upload, Plus,
  DollarSign, FileText, X, Package, CheckCircle,
  Clock, Ban, Printer, Search, Percent, Minus, ChevronLeft, ChevronRight
} from "lucide-react";

interface InvoiceEditDialogProps {
  order: AdminOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface EditCartItem {
  product_id: number;
  product_name: string;
  icon_url?: string;
  variant_id?: number;
  variant_label?: string;
  quantity: number;
  unit_price: number;
  stock_quantity: number;
  discount: number;
  discount_type: "amount" | "percent";
  serial_numbers: string[];
}

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "warning"; label: string; icon: typeof CheckCircle; color: string }> = {
  paid:      { variant: "default",     label: "Paid",      icon: CheckCircle,  color: "text-emerald-600 dark:text-emerald-400" },
  pending:   { variant: "warning",     label: "Pending",   icon: Clock,        color: "text-yellow-600 dark:text-yellow-400" },
  failed:    { variant: "destructive", label: "Failed",    icon: Ban,          color: "text-destructive" },
  expired:   { variant: "outline",     label: "Expired",   icon: Ban,          color: "text-muted-foreground" },
  cancelled: { variant: "secondary",   label: "Cancelled", icon: Ban,          color: "text-muted-foreground" },
};

export const InvoiceEditDialog = ({ order, open, onOpenChange }: InvoiceEditDialogProps) => {
  const queryClient = useQueryClient();

  const { data: detailData } = useQuery({
    queryKey: ["order-detail", order?.id],
    queryFn: () => adminUsersApi.getOrderDetail(order!.id),
    enabled: !!order && open,
  });

  const fullOrder = detailData?.order || order;

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              Edit Invoice #{order.id.slice(0, 8).toUpperCase()}
            </DialogTitle>
            <Badge variant={statusConfig[order.status]?.variant || "secondary"} className="text-xs">
              {statusConfig[order.status]?.label || order.status}
            </Badge>
          </div>
        </DialogHeader>

        <Tabs defaultValue="edit" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 mt-4">
            <TabsTrigger value="edit" className="gap-1.5 text-xs"><Pencil className="w-3.5 h-3.5" /> Edit</TabsTrigger>
            <TabsTrigger value="attachments" className="gap-1.5 text-xs"><Image className="w-3.5 h-3.5" /> Files</TabsTrigger>
            <TabsTrigger value="payments" className="gap-1.5 text-xs"><CreditCard className="w-3.5 h-3.5" /> Payments</TabsTrigger>
          </TabsList>
          <TabsContent value="edit"><EditTab order={fullOrder || order} onClose={() => onOpenChange(false)} /></TabsContent>
          <TabsContent value="attachments"><AttachmentsTab order={fullOrder || order} /></TabsContent>
          <TabsContent value="payments"><PaymentsTab order={fullOrder || order} /></TabsContent>
        </Tabs>

        <Separator />
        <BottomActions order={order} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getLineTotal = (item: EditCartItem) => {
  const gross = item.unit_price * item.quantity;
  if (item.discount_type === "percent") {
    return gross * (1 - Math.min(item.discount, 100) / 100);
  }
  return Math.max(0, gross - item.discount);
};

// ─── Edit Tab ─────────────────────────────────────────────────────────────────
const EditTab = ({ order, onClose }: { order: AdminOrder; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState(order.notes || "");
  const [status, setStatus] = useState(order.status);
  const [txnId, setTxnId] = useState(order.bakong_transaction_id || "");

  // Cart items - initialize from order
  const [cart, setCart] = useState<EditCartItem[]>(() => [{
    product_id: order.product_id,
    product_name: order.product_name,
    quantity: 1,
    unit_price: order.original_price ? parseFloat(order.original_price) : (typeof order.amount === "string" ? parseFloat(order.amount as string) : order.amount),
    stock_quantity: 999,
    discount: order.item_discount ? parseFloat(order.item_discount) : 0,
    discount_type: (order.item_discount_type as "amount" | "percent") || "amount",
    serial_numbers: order.serial_number ? order.serial_number.split(",").map(s => s.trim()).filter(Boolean) : [],
  }]);

  // Sale-level discount
  const [saleDiscount, setSaleDiscount] = useState(order.sale_discount ? parseFloat(order.sale_discount) : 0);
  const [saleDiscountType, setSaleDiscountType] = useState<"amount" | "percent">((order.sale_discount_type as "amount" | "percent") || "amount");

  // Product search
  const [productSearch, setProductSearch] = useState("");
  const [searchResults, setSearchResults] = useState<SaleProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    setNotes(order.notes || "");
    setStatus(order.status);
    setTxnId(order.bakong_transaction_id || "");
    setCart([{
      product_id: order.product_id,
      product_name: order.product_name,
      quantity: 1,
      unit_price: order.original_price ? parseFloat(order.original_price) : (typeof order.amount === "string" ? parseFloat(order.amount as string) : order.amount),
      stock_quantity: 999,
      discount: order.item_discount ? parseFloat(order.item_discount) : 0,
      discount_type: (order.item_discount_type as "amount" | "percent") || "amount",
      serial_numbers: order.serial_number ? order.serial_number.split(",").map(s => s.trim()).filter(Boolean) : [],
    }]);
    setSaleDiscount(order.sale_discount ? parseFloat(order.sale_discount) : 0);
    setSaleDiscountType((order.sale_discount_type as "amount" | "percent") || "amount");
  }, [order]);

  // Calculations
  const subtotal = cart.reduce((s, c) => s + getLineTotal(c), 0);
  const saleDiscountAmount = saleDiscountType === "percent"
    ? subtotal * Math.min(saleDiscount, 100) / 100
    : Math.min(saleDiscount, subtotal);
  const grandTotal = Math.max(0, subtotal - saleDiscountAmount);

  // Search products
  const handleSearchProducts = useCallback(async (q: string) => {
    setProductSearch(q);
    if (q.length < 1) { setSearchResults([]); return; }
    setSearchLoading(true);
    try {
      const res = await salesApi.searchProducts(q);
      setSearchResults(res.products);
    } catch { /* ignore */ }
    setSearchLoading(false);
  }, []);

  // Add product to cart
  const addToCart = (product: SaleProduct, variantId?: number) => {
    const variant = variantId ? product.variants.find(v => v.id === variantId) : null;
    const stock = variant ? (variant.stock_quantity ?? 0) : (product.stock_quantity ?? 0);
    const existing = cart.find(c => c.product_id === product.id && c.variant_id === variantId);
    const currentQty = existing ? existing.quantity : 0;

    if (stock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    if (currentQty >= stock) {
      toast.error(`Only ${stock} in stock for ${product.name}`);
      return;
    }

    if (existing) {
      setCart(cart.map(c =>
        c.product_id === product.id && c.variant_id === variantId
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ));
    } else {
      const price = variant ? Number(variant.price_adjustment || 0) : Number(product.price);
      const variantLabel = variant ? Object.values(variant.combination).join(" / ") : undefined;
      setCart([...cart, {
        product_id: product.id,
        product_name: product.name,
        icon_url: product.icon_url,
        variant_id: variantId,
        variant_label: variantLabel,
        quantity: 1,
        unit_price: price,
        stock_quantity: stock,
        discount: 0,
        discount_type: "amount",
        serial_numbers: [],
      }]);
    }
    setProductSearch("");
    setSearchResults([]);
  };

  const updateQty = (idx: number, delta: number) => {
    setCart(cart.map((c, i) => {
      if (i !== idx) return c;
      const newQty = Math.max(1, c.quantity + delta);
      if (delta > 0 && newQty > c.stock_quantity) {
        toast.error(`Only ${c.stock_quantity} in stock for ${c.product_name}`);
        return c;
      }
      const trimmedSerials = c.serial_numbers.slice(0, newQty);
      return { ...c, quantity: newQty, serial_numbers: trimmedSerials };
    }));
  };

  const addSerialToItem = (cartIdx: number, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    const allSerials = cart.flatMap(c => c.serial_numbers);
    if (allSerials.includes(trimmed)) {
      toast.error(`Serial number "${trimmed}" is already added`);
      return;
    }
    setCart(cart.map((c, i) => {
      if (i !== cartIdx) return c;
      if (c.serial_numbers.length >= c.quantity) return c;
      return { ...c, serial_numbers: [...c.serial_numbers, trimmed] };
    }));
  };

  const removeSerialFromItem = (cartIdx: number, serialIdx: number) => {
    setCart(cart.map((c, i) => {
      if (i !== cartIdx) return c;
      return { ...c, serial_numbers: c.serial_numbers.filter((_, si) => si !== serialIdx) };
    }));
  };

  const updateItemDiscount = (idx: number, value: number, type: "amount" | "percent") => {
    setCart(cart.map((c, i) => i === idx ? { ...c, discount: value, discount_type: type } : c));
  };

  const updateItemPrice = (idx: number, price: number) => {
    setCart(cart.map((c, i) => i === idx ? { ...c, unit_price: price } : c));
  };

  const removeFromCart = (idx: number) => {
    if (cart.length <= 1) { toast.error("Must have at least one item"); return; }
    setCart(cart.filter((_, i) => i !== idx));
  };

  const updateMutation = useMutation({
    mutationFn: (data: Partial<AdminOrder>) => adminUsersApi.updateOrder(order.id, data),
    onSuccess: () => {
      toast.success("Invoice updated");
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sales-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["order-detail", order.id] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update"),
  });

  const handleSave = () => {
    if (cart.length === 0) { toast.error("Add at least one item"); return; }

    // For single item, map directly. For multi-item, combine names & totals.
    const firstItem = cart[0];
    const combinedName = cart.map(c => c.product_name).join(", ");
    const totalOriginal = cart.reduce((s, c) => s + c.unit_price * c.quantity, 0);
    const totalItemDiscount = totalOriginal - subtotal;

    updateMutation.mutate({
      product_name: combinedName,
      product_id: firstItem.product_id as any,
      serial_number: firstItem.serial_numbers.join(", ") || undefined,
      notes: notes || undefined,
      status,
      amount: grandTotal as any,
      original_price: totalOriginal.toFixed(2) as any,
      item_discount: totalItemDiscount.toFixed(2) as any,
      item_discount_type: "amount" as any,
      sale_discount: saleDiscount > 0 ? saleDiscount.toString() as any : "0" as any,
      sale_discount_type: saleDiscountType as any,
      bakong_transaction_id: txnId || undefined,
    });
  };

  const quickStatusUpdate = (newStatus: AdminOrder["status"]) => {
    updateMutation.mutate({ status: newStatus });
  };

  return (
    <div className="space-y-4">
      {/* Quick Status Actions */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          {order.status !== 'paid' && (
            <Button variant="outline" size="sm" className="gap-1.5 text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-500/10" onClick={() => quickStatusUpdate('paid')} disabled={updateMutation.isPending}>
              <CheckCircle className="w-3.5 h-3.5" /> Mark as Paid
            </Button>
          )}
          {order.status !== 'pending' && (
            <Button variant="outline" size="sm" className="gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-500/10" onClick={() => quickStatusUpdate('pending')} disabled={updateMutation.isPending}>
              <Clock className="w-3.5 h-3.5" /> Set Pending
            </Button>
          )}
          {order.status !== 'failed' && (
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={() => quickStatusUpdate('failed')} disabled={updateMutation.isPending}>
              <Ban className="w-3.5 h-3.5" /> Mark Failed
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Status */}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Status</label>
        <Select value={status} onValueChange={(v) => setStatus(v as AdminOrder["status"])}>
          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* ─── Sale Items ─── */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sale Items ({cart.length})</p>
        </div>

        {/* Product Search to Add */}
        <div className="relative mb-3">
          <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search & add products..."
            value={productSearch}
            onChange={(e) => handleSearchProducts(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
          {searchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          {searchResults.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {searchResults.map(p => (
                <div key={p.id}>
                  {p.variants.length > 0 ? (
                    p.variants.map(v => {
                      const label = Object.values(v.combination).join(" / ");
                      const price = Number(v.price_adjustment || 0);
                      return (
                        <button key={`${p.id}-${v.id}`} className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-3 transition-colors" onClick={() => addToCart(p, v.id)}>
                          {p.icon_url && <img src={p.icon_url} className="w-8 h-8 rounded object-cover shrink-0" alt="" />}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{label} · Stock: {v.stock_quantity}</p>
                          </div>
                          <span className="text-xs font-semibold text-foreground">${price.toFixed(2)}</span>
                        </button>
                      );
                    })
                  ) : (
                    <button className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-3 transition-colors" onClick={() => addToCart(p)}>
                      {p.icon_url && <img src={p.icon_url} className="w-8 h-8 rounded object-cover shrink-0" alt="" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">Stock: {p.stock_quantity}</p>
                      </div>
                      <span className="text-xs font-semibold text-foreground">${Number(p.price).toFixed(2)}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Items */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_70px_90px_70px_28px] gap-1 px-3 py-2 bg-muted/50 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            <span>Product</span>
            <span className="text-center">Qty</span>
            <span className="text-center">Discount</span>
            <span className="text-right">Total</span>
            <span />
          </div>
          {cart.map((item, idx) => {
            const lineTotal = getLineTotal(item);
            const overStock = item.quantity > item.stock_quantity && item.stock_quantity < 999;
            return (
              <div key={idx} className="border-t border-border/50">
                <div className="grid grid-cols-[1fr_70px_90px_70px_28px] gap-1 px-3 py-2.5 items-center">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {item.icon_url && <img src={item.icon_url} className="w-7 h-7 rounded object-cover shrink-0" alt="" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.product_name}</p>
                        {item.variant_label && <p className="text-[10px] text-muted-foreground">{item.variant_label}</p>}
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground">${item.unit_price.toFixed(2)} each</span>
                          {item.stock_quantity < 999 && (
                            <span className={`text-[10px] ${overStock ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                              Stock: {item.stock_quantity}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5 justify-center">
                    <Button size="icon" variant="outline" className="h-5 w-5" onClick={() => updateQty(idx, -1)}><Minus className="w-2.5 h-2.5" /></Button>
                    <span className={`text-xs font-medium w-5 text-center ${overStock ? "text-destructive" : ""}`}>{item.quantity}</span>
                    <Button size="icon" variant="outline" className="h-5 w-5" onClick={() => updateQty(idx, 1)}><Plus className="w-2.5 h-2.5" /></Button>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={item.discount || ""}
                      onChange={e => updateItemDiscount(idx, parseInt(e.target.value) || 0, item.discount_type)}
                      className="h-6 text-[11px] px-1.5 w-12"
                      placeholder="0"
                    />
                    <button
                      onClick={() => updateItemDiscount(idx, item.discount, item.discount_type === "amount" ? "percent" : "amount")}
                      className="h-6 w-6 shrink-0 rounded border border-input flex items-center justify-center text-[10px] font-bold text-muted-foreground hover:bg-muted transition-colors"
                      title={item.discount_type === "amount" ? "Switch to %" : "Switch to $"}
                    >
                      {item.discount_type === "percent" ? "%" : "$"}
                    </button>
                  </div>
                  <p className="text-sm font-semibold text-right tabular-nums">${lineTotal.toFixed(2)}</p>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => removeFromCart(idx)}
                    disabled={cart.length <= 1}
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </Button>
                </div>
                {/* Serial number tag input */}
                <div className="px-3 pb-2">
                  <div className="flex flex-wrap gap-1 items-center p-1.5 rounded border border-border bg-background min-h-[28px]">
                    {item.serial_numbers.map((sn, snIdx) => (
                      <span key={snIdx} className="inline-flex items-center gap-0.5 bg-muted text-foreground text-[11px] px-1.5 py-0.5 rounded font-mono">
                        {sn}
                        <button type="button" onClick={() => removeSerialFromItem(idx, snIdx)} className="hover:text-destructive transition-colors"><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                    {item.serial_numbers.length < item.quantity && (
                      <input
                        className="flex-1 min-w-[80px] bg-transparent text-[11px] outline-none placeholder:text-muted-foreground font-mono"
                        placeholder={`Add S/N (${item.serial_numbers.length}/${item.quantity})`}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSerialToItem(idx, e.currentTarget.value);
                            e.currentTarget.value = "";
                          }
                        }}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sale Discount */}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Sale Discount</label>
        <div className="flex items-center gap-2 mt-1">
          <Input
            type="number"
            step="1"
            min="0"
            value={saleDiscount || ""}
            onChange={(e) => setSaleDiscount(parseInt(e.target.value) || 0)}
            className="h-9 text-sm flex-1"
            placeholder="0"
          />
          <button
            onClick={() => setSaleDiscountType(saleDiscountType === "amount" ? "percent" : "amount")}
            className="h-9 w-9 shrink-0 rounded-md border border-input flex items-center justify-center text-xs font-bold text-muted-foreground hover:bg-muted transition-colors"
            title={saleDiscountType === "amount" ? "Switch to %" : "Switch to $"}
          >
            {saleDiscountType === "percent" ? <Percent className="w-3.5 h-3.5" /> : <DollarSign className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Price Summary */}
      <Card>
        <CardContent className="p-4 space-y-1.5">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal ({cart.length} item{cart.length > 1 ? "s" : ""})</span>
            <span className="tabular-nums">${subtotal.toFixed(2)}</span>
          </div>
          {saleDiscount > 0 && (
            <div className="flex justify-between text-sm text-destructive">
              <span>Sale Discount ({saleDiscountType === "percent" ? `${saleDiscount}%` : `$${saleDiscount.toFixed(2)}`})</span>
              <span className="tabular-nums">-${saleDiscountAmount.toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-bold text-base">
            <span>Grand Total</span>
            <span className="tabular-nums">${grandTotal.toFixed(2)} {order.currency}</span>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Transaction ID */}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Transaction ID</label>
        <Input value={txnId} onChange={(e) => setTxnId(e.target.value)} className="mt-1.5" placeholder="Optional" />
      </div>

      {/* Notes */}
      <div>
        <label className="text-xs font-medium text-muted-foreground">Notes</label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="mt-1.5" placeholder="Add notes..." />
      </div>

      <Button className="w-full gap-2" onClick={handleSave} disabled={updateMutation.isPending}>
        {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
        Save Changes
      </Button>
    </div>
  );
};

// ─── Attachments Tab ──────────────────────────────────────────────────────────
const AttachmentsTab = ({ order }: { order: AdminOrder }) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [selectedGalleryIdx, setSelectedGalleryIdx] = useState(0);

  const { data } = useQuery({
    queryKey: ["order-detail", order.id],
    queryFn: () => adminUsersApi.getOrderDetail(order.id),
  });

  const attachments = data?.order?.attachments || order.attachments || [];
  const imageAttachments = attachments.filter((a) => a.file_type === 'image');

  const uploadMutation = useMutation({
    mutationFn: (file: File) => adminUsersApi.uploadAttachment(order.id, file),
    onSuccess: () => {
      toast.success("Image attached");
      queryClient.invalidateQueries({ queryKey: ["order-detail", order.id] });
    },
    onError: (e: Error) => toast.error(e.message || "Upload failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (attachmentId: number) => adminUsersApi.deleteAttachment(order.id, attachmentId),
    onSuccess: () => {
      toast.success("Attachment removed");
      queryClient.invalidateQueries({ queryKey: ["order-detail", order.id] });
    },
    onError: () => toast.error("Failed to remove"),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Fullscreen Lightbox */}
      {previewIndex !== null && imageAttachments[previewIndex] && (
        <div
          className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
          onClick={() => setPreviewIndex(null)}
        >
          {imageAttachments.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white hover:bg-white/10 z-10"
              onClick={(e) => { e.stopPropagation(); setPreviewIndex((previewIndex - 1 + imageAttachments.length) % imageAttachments.length); }}
            >
              <ChevronLeft className="w-8 h-8" />
            </Button>
          )}
          <img
            src={imageAttachments[previewIndex].file_url}
            alt="Preview"
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {imageAttachments.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white hover:bg-white/10 z-10"
              onClick={(e) => { e.stopPropagation(); setPreviewIndex((previewIndex + 1) % imageAttachments.length); }}
            >
              <ChevronRight className="w-8 h-8" />
            </Button>
          )}
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
            {previewIndex + 1} / {imageAttachments.length}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white/70 hover:text-white hover:bg-white/10"
            onClick={() => setPreviewIndex(null)}
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{attachments.length} attachment(s)</p>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}>
          {uploadMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          Upload
        </Button>
        <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileSelect} />
      </div>

      {attachments.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-border rounded-lg">
          <Image className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No attachments yet</p>
          <p className="text-xs text-muted-foreground mt-1">Upload receipt photos or documents</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Main Gallery Preview */}
          {imageAttachments.length > 0 && (
            <div className="space-y-2">
              {/* Main Image */}
              <div
                className="relative aspect-video bg-muted rounded-xl overflow-hidden cursor-pointer group"
                onClick={() => setPreviewIndex(selectedGalleryIdx)}
              >
                <img
                  src={imageAttachments[selectedGalleryIdx]?.file_url}
                  alt={imageAttachments[selectedGalleryIdx]?.file_name}
                  className="w-full h-full object-contain"
                />
                {/* Nav arrows */}
                {imageAttachments.length > 1 && (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedGalleryIdx((selectedGalleryIdx - 1 + imageAttachments.length) % imageAttachments.length); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedGalleryIdx((selectedGalleryIdx + 1) % imageAttachments.length); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
                {/* Counter */}
                {imageAttachments.length > 1 && (
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 rounded-md text-white text-xs">
                    {selectedGalleryIdx + 1} / {imageAttachments.length}
                  </div>
                )}
              </div>

              {/* Thumbnail Strip */}
              {imageAttachments.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {imageAttachments.map((att, idx) => (
                    <button
                      key={att.id}
                      onClick={() => setSelectedGalleryIdx(idx)}
                      className={`relative flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                        idx === selectedGalleryIdx
                          ? 'border-primary ring-2 ring-primary/30'
                          : 'border-transparent hover:border-muted-foreground/50'
                      }`}
                    >
                      <img src={att.file_url} alt={att.file_name} className="w-16 h-12 object-cover" />
                      {/* Delete button on thumbnail */}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(att.id); }}
                        className="absolute top-0.5 right-0.5 p-0.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity"
                        disabled={deleteMutation.isPending}
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Non-image files list */}
          {attachments.filter(a => a.file_type !== 'image').length > 0 && (
            <div className="space-y-2">
              {attachments.filter(a => a.file_type !== 'image').map((att) => (
                <div key={att.id} className="relative group flex items-center gap-3 p-2.5 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                  <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="p-2 bg-muted rounded-lg">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                  </a>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{att.file_name}</p>
                    <p className="text-[10px] text-muted-foreground">{att.file_size ? `${(att.file_size / 1024).toFixed(1)} KB` : ""}</p>
                  </div>
                  <Button variant="destructive" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteMutation.mutate(att.id)} disabled={deleteMutation.isPending}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Payments Tab ─────────────────────────────────────────────────────────────
const PaymentsTab = ({ order }: { order: AdminOrder }) => {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payRef, setPayRef] = useState("");
  const [payNote, setPayNote] = useState("");

  const { data } = useQuery({
    queryKey: ["order-detail", order.id],
    queryFn: () => adminUsersApi.getOrderDetail(order.id),
  });

  const payments = data?.order?.payments || order.payments || [];
  const totalPaid = payments.reduce((s, p) => s + (typeof p.amount === "string" ? parseFloat(p.amount) : p.amount), 0);
  const orderAmount = typeof order.amount === "string" ? parseFloat(order.amount as string) : order.amount;
  const remaining = orderAmount - totalPaid;

  const addMutation = useMutation({
    mutationFn: (data: { amount: number; method: string; reference?: string; note?: string }) =>
      adminUsersApi.addPayment(order.id, data),
    onSuccess: () => {
      toast.success("Payment recorded");
      queryClient.invalidateQueries({ queryKey: ["order-detail", order.id] });
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sales-dashboard"] });
      setShowAdd(false);
      setPayAmount("");
      setPayRef("");
      setPayNote("");
    },
    onError: (e: Error) => toast.error(e.message || "Failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: (paymentId: number) => adminUsersApi.deletePayment(order.id, paymentId),
    onSuccess: () => {
      toast.success("Payment removed");
      queryClient.invalidateQueries({ queryKey: ["order-detail", order.id] });
    },
    onError: () => toast.error("Failed to remove"),
  });

  const handleAdd = () => {
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    addMutation.mutate({ amount: amt, method: payMethod, reference: payRef || undefined, note: payNote || undefined });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Total</p>
          <p className="text-lg font-bold">${orderAmount.toFixed(2)}</p>
        </div>
        <div className="bg-emerald-500/10 rounded-lg p-3 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Paid</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">${totalPaid.toFixed(2)}</p>
        </div>
        <div className={`rounded-lg p-3 text-center ${remaining > 0 ? "bg-destructive/10" : "bg-emerald-500/10"}`}>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Remaining</p>
          <p className={`text-lg font-bold ${remaining > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>${remaining.toFixed(2)}</p>
        </div>
      </div>

      {payments.length > 0 && (
        <div className="space-y-2">
          {payments.map((p) => {
            const pAmt = typeof p.amount === "string" ? parseFloat(p.amount) : p.amount;
            return (
              <div key={p.id} className="flex items-center justify-between border border-border rounded-lg p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{p.method}</Badge>
                    <span className="font-semibold tabular-nums">${pAmt.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    {p.reference && <span className="text-xs text-muted-foreground font-mono">{p.reference}</span>}
                    <span className="text-xs text-muted-foreground">{new Date(p.paid_at).toLocaleDateString()}</span>
                  </div>
                  {p.note && <p className="text-xs text-muted-foreground mt-1">{p.note}</p>}
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={() => deleteMutation.mutate(p.id)} disabled={deleteMutation.isPending}>
                  <Trash2 className="w-3.5 h-3.5 text-destructive" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {!showAdd ? (
        <Button variant="outline" className="w-full gap-2" onClick={() => { setShowAdd(true); setPayAmount(remaining > 0 ? remaining.toFixed(2) : ""); }}>
          <Plus className="w-4 h-4" /> Add Payment
        </Button>
      ) : (
        <div className="border border-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Amount ($)</label>
              <Input type="number" step="0.01" min="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="mt-1" placeholder={remaining > 0 ? remaining.toFixed(2) : "0.00"} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Method</label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="khqr">KHQR</SelectItem>
                  <SelectItem value="aba">ABA</SelectItem>
                  <SelectItem value="wing">Wing</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Reference (optional)</label>
            <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} className="mt-1" placeholder="Transaction ID..." />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Note (optional)</label>
            <Input value={payNote} onChange={(e) => setPayNote(e.target.value)} className="mt-1" placeholder="Payment note..." />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1 gap-2" onClick={handleAdd} disabled={addMutation.isPending}>
              {addMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
              Record Payment
            </Button>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Bottom Actions ───────────────────────────────────────────────────────────
const BottomActions = ({ order, onClose }: { order: AdminOrder; onClose: () => void }) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: () => adminUsersApi.deleteOrder(order.id),
    onSuccess: () => {
      toast.success("Invoice deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-sales-dashboard"] });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete"),
  });

  const handlePrint = () => {
    const amount = typeof order.amount === "string" ? parseFloat(order.amount as string) : order.amount;
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;width:0;height:0;border:none;left:-9999px";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) { document.body.removeChild(iframe); return; }
    doc.open();
    const originalPrice = order.original_price ? parseFloat(order.original_price) : amount;
    const itemDiscount = order.item_discount ? parseFloat(order.item_discount) : 0;
    const saleDiscountVal = order.sale_discount ? parseFloat(order.sale_discount) : 0;
    const itemDiscountLabel = order.item_discount_type === 'percent' ? `${itemDiscount}%` : `$${itemDiscount.toFixed(2)}`;
    const saleDiscountLabel = order.sale_discount_type === 'percent' ? `${saleDiscountVal}%` : `$${saleDiscountVal.toFixed(2)}`;

    doc.write(`<!DOCTYPE html><html><head><title>Invoice #${order.id.slice(0, 8).toUpperCase()}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Inter',system-ui,sans-serif;max-width:760px;margin:0 auto;padding:48px 40px;color:#111827;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
        .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:32px;border-bottom:1px solid #e5e7eb}
        .brand{display:flex;align-items:center;gap:14px}
        .brand-icon{width:44px;height:44px;background:linear-gradient(135deg,#2563eb,#1d4ed8);border-radius:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:18px;font-weight:700}
        .brand-name{font-size:20px;font-weight:700;color:#111827}
        .brand-sub{font-size:12px;color:#6b7280;margin-top:2px}
        .meta{text-align:right}
        .invoice-badge{display:inline-flex;background:#eff6ff;color:#2563eb;font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;padding:6px 14px;border-radius:6px}
        .invoice-number{font-size:22px;font-weight:700;margin-top:8px;font-variant-numeric:tabular-nums}
        .invoice-date{font-size:13px;color:#6b7280;margin-top:4px}
        .details-grid{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin:32px 0}
        .detail-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#9ca3af;margin-bottom:10px}
        .detail-name{font-size:15px;font-weight:600}
        .detail-sub{font-size:13px;color:#6b7280;margin-top:3px}
        .status-badge{display:inline-flex;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600}
        .status-paid{background:#dcfce7;color:#166534}
        .status-pending{background:#fef9c3;color:#854d0e}
        .status-failed{background:#fee2e2;color:#991b1b}
        .status-expired{background:#f3f4f6;color:#6b7280}
        .table-wrap{background:#f9fafb;border-radius:12px;padding:4px;margin:32px 0}
        table{width:100%;border-collapse:collapse}
        thead th{text-align:left;padding:14px 16px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:#6b7280;border-bottom:1px solid #e5e7eb}
        thead th:last-child{text-align:right}
        tbody td{padding:16px;font-size:14px;color:#374151;border-bottom:1px solid #f3f4f6}
        tbody td:last-child{text-align:right;font-variant-numeric:tabular-nums}
        .summary-section{display:flex;justify-content:flex-end}
        .summary-table{width:280px}
        .summary-row{display:flex;justify-content:space-between;padding:8px 16px;font-size:13px;color:#6b7280}
        .summary-row.discount{color:#dc2626}
        .summary-row.total{background:#111827;color:#fff;border-radius:8px;padding:14px 16px;font-size:16px;font-weight:700;margin-top:4px}
        .divider{height:1px;background:#e5e7eb;margin:40px 0 24px}
        .footer{text-align:center;padding:24px 0}
        .footer-thanks{font-size:15px;font-weight:600;margin-bottom:4px}
        .footer-brand{font-size:12px;color:#9ca3af;margin-top:8px}
        .footer-brand a{color:#2563eb;text-decoration:none}
        body{transform:scale(0.85);transform-origin:top left;width:117.6%}
        @media print{body{padding:24px 20px}}
      </style></head><body>
      <div class="header">
        <div class="brand"><div class="brand-icon">RC</div><div><div class="brand-name">Realtech Computer</div><div class="brand-sub">Software & Digital Products</div></div></div>
        <div class="meta"><div class="invoice-badge">Invoice</div><div class="invoice-number">#${order.id.slice(0, 8).toUpperCase()}</div>
        <div class="invoice-date">${order.created_at ? new Date(order.created_at).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</div></div>
      </div>
      <div class="details-grid">
        <div><div class="detail-label">Bill To</div><div class="detail-name">${order.user?.full_name || "Walk-in Customer"}</div><div class="detail-sub">${order.user?.email || "—"}</div></div>
        <div><div class="detail-label">Payment Info</div><div style="margin-bottom:6px"><span class="status-badge status-${order.status}">● ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</span></div>
        ${order.bakong_transaction_id ? `<div class="detail-sub">Txn: ${order.bakong_transaction_id}</div>` : ""}
        ${order.paid_at ? `<div class="detail-sub">Paid: ${new Date(order.paid_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>` : ""}</div>
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Description</th><th>Qty</th><th style="text-align:right">Unit Price</th><th style="text-align:right">Amount</th></tr></thead>
        <tbody><tr><td style="font-weight:500">${order.product_name}${order.serial_number ? `<div style="font-size:12px;color:#6b7280;margin-top:2px">S/N: ${order.serial_number}</div>` : ''}</td><td>1</td><td style="text-align:right">$${originalPrice.toFixed(2)}</td><td style="text-align:right;font-weight:600">$${originalPrice.toFixed(2)}</td></tr></tbody>
      </table></div>
      <div class="summary-section"><div class="summary-table">
        <div class="summary-row"><span>Subtotal</span><span>$${originalPrice.toFixed(2)}</span></div>
        ${itemDiscount > 0 ? `<div class="summary-row discount"><span>Item Discount (${itemDiscountLabel})</span><span>-$${(originalPrice - amount + saleDiscountVal).toFixed(2)}</span></div>` : ''}
        ${saleDiscountVal > 0 ? `<div class="summary-row discount"><span>Sale Discount (${saleDiscountLabel})</span><span>-$${saleDiscountVal.toFixed(2)}</span></div>` : ''}
        <div class="summary-row total"><span>Grand Total</span><span>$${amount.toFixed(2)} ${order.currency}</span></div>
      </div></div>
      ${order.notes ? `<div style="margin-top:24px;padding:16px 20px;background:#f9fafb;border-radius:10px;border-left:3px solid #2563eb"><div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1.5px;color:#9ca3af;margin-bottom:6px">Note</div><div style="font-size:13px;color:#374151;line-height:1.6">${order.notes}</div></div>` : ''}
      <div class="divider"></div>
      <div class="footer"><div class="footer-thanks">Thank you for your purchase!</div><div class="footer-brand">Realtech Computer — <a href="https://realtechcomputer.com">realtechcomputer.com</a></div></div>
      </body></html>`);
    doc.close();
    iframe.onload = () => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 1000);
    };
  };

  return (
    <div className="flex items-center justify-between gap-2 mt-4">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove invoice #{order.id.slice(0, 8).toUpperCase()} and all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Delete Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
          <Printer className="w-3.5 h-3.5" /> Print
        </Button>
      </div>
    </div>
  );
};
