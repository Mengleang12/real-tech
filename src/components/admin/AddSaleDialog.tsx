import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { salesApi, type SaleCustomer, type SaleProduct, type CreateSalePayload } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Search, Plus, Trash2, UserPlus, Package, Loader2, X, Minus } from "lucide-react";

interface CartItem {
  product: SaleProduct;
  variant_id?: number;
  quantity: number;
  unit_price: number;
}

interface AddSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddSaleDialog = ({ open, onOpenChange }: AddSaleDialogProps) => {
  const queryClient = useQueryClient();

  // Customer state
  const [customerType, setCustomerType] = useState<"existing" | "new">("existing");
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<SaleCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<SaleCustomer | null>(null);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [customerLoading, setCustomerLoading] = useState(false);

  // Product state
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState<SaleProduct[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  // Payment
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending" | "partial" | "unpaid">("paid");
  const [notes, setNotes] = useState("");

  // Search customers
  const handleSearchCustomers = useCallback(async (q: string) => {
    setCustomerSearch(q);
    if (q.length < 2) { setCustomers([]); return; }
    setCustomerLoading(true);
    try {
      const res = await salesApi.searchCustomers(q);
      setCustomers(res.customers);
    } catch { /* ignore */ }
    setCustomerLoading(false);
  }, []);

  // Search products
  const handleSearchProducts = useCallback(async (q: string) => {
    setProductSearch(q);
    if (q.length < 1) { setProducts([]); return; }
    setProductLoading(true);
    try {
      const res = await salesApi.searchProducts(q);
      setProducts(res.products);
    } catch { /* ignore */ }
    setProductLoading(false);
  }, []);

  // Add product to cart
  const addToCart = (product: SaleProduct, variantId?: number) => {
    const exists = cart.find(c => c.product.id === product.id && c.variant_id === variantId);
    if (exists) {
      setCart(cart.map(c =>
        c.product.id === product.id && c.variant_id === variantId
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ));
    } else {
      const variant = variantId ? product.variants.find(v => v.id === variantId) : null;
      const price = Number(product.price) + Number(variant?.price_adjustment || 0);
      setCart([...cart, { product, variant_id: variantId, quantity: 1, unit_price: price }]);
    }
    setProductSearch("");
    setProducts([]);
  };

  const updateQty = (idx: number, delta: number) => {
    setCart(cart.map((c, i) => i === idx ? { ...c, quantity: Math.max(1, c.quantity + delta) } : c));
  };

  const removeFromCart = (idx: number) => {
    setCart(cart.filter((_, i) => i !== idx));
  };

  const total = cart.reduce((s, c) => s + c.unit_price * c.quantity, 0);

  // Submit
  const createMutation = useMutation({
    mutationFn: (data: CreateSalePayload) => salesApi.createSale(data),
    onSuccess: (res) => {
      toast.success(res.message || "Sale created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-sales-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create sale");
    },
  });

  const resetForm = () => {
    setCustomerType("existing");
    setCustomerSearch("");
    setSelectedCustomer(null);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerEmail("");
    setCart([]);
    setPaymentStatus("paid");
    setNotes("");
    setCustomers([]);
    setProducts([]);
    setProductSearch("");
  };

  const handleSubmit = () => {
    if (customerType === "existing" && !selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }
    if (customerType === "new" && !newCustomerName.trim()) {
      toast.error("Please enter customer name");
      return;
    }
    if (cart.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

    const payload: CreateSalePayload = {
      customer_type: customerType,
      ...(customerType === "existing" && { customer_id: selectedCustomer!.id }),
      ...(customerType === "new" && {
        customer_name: newCustomerName,
        customer_phone: newCustomerPhone || undefined,
        customer_email: newCustomerEmail || undefined,
      }),
      items: cart.map(c => ({
        product_id: c.product.id,
        variant_id: c.variant_id,
        quantity: c.quantity,
        price: c.unit_price,
      })),
      payment_status: paymentStatus,
      notes: notes || undefined,
    };

    createMutation.mutate(payload);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plus className="w-5 h-5" /> New Sale</DialogTitle>
          <DialogDescription>Create a sale for walk-in or existing customer</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* ─── Customer Section ─── */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Customer</Label>
            <div className="flex gap-2">
              <Button size="sm" variant={customerType === "existing" ? "default" : "outline"} onClick={() => setCustomerType("existing")} className="text-xs gap-1">
                <Search className="w-3 h-3" /> Existing
              </Button>
              <Button size="sm" variant={customerType === "new" ? "default" : "outline"} onClick={() => setCustomerType("new")} className="text-xs gap-1">
                <UserPlus className="w-3 h-3" /> New Customer
              </Button>
            </div>

            {customerType === "existing" ? (
              <div className="space-y-2">
                {selectedCustomer ? (
                  <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">{selectedCustomer.full_name}</p>
                      <p className="text-xs text-muted-foreground">{selectedCustomer.email}{selectedCustomer.phone ? ` · ${selectedCustomer.phone}` : ""}</p>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedCustomer(null)}><X className="w-3.5 h-3.5" /></Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, email or phone..."
                      value={customerSearch}
                      onChange={(e) => handleSearchCustomers(e.target.value)}
                      className="pl-9 h-9 text-sm"
                    />
                    {customerLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                    {customers.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {customers.map(c => (
                          <button key={c.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm transition-colors" onClick={() => { setSelectedCustomer(c); setCustomers([]); setCustomerSearch(""); }}>
                            <p className="font-medium text-foreground">{c.full_name}</p>
                            <p className="text-xs text-muted-foreground">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input placeholder="Name *" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} className="h-9 text-sm" />
                <Input placeholder="Phone" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} className="h-9 text-sm" />
                <Input placeholder="Email" value={newCustomerEmail} onChange={e => setNewCustomerEmail(e.target.value)} className="h-9 text-sm" />
              </div>
            )}
          </div>

          <Separator />

          {/* ─── Products Section ─── */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Products</Label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={productSearch}
                onChange={(e) => handleSearchProducts(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
              {productLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
              {products.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {products.map(p => (
                    <div key={p.id}>
                      {p.variants.length > 0 ? (
                        p.variants.map(v => {
                          const label = Object.values(v.combination).join(" / ");
                          const price = Number(p.price) + Number(v.price_adjustment || 0);
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

            {/* Cart items */}
            {cart.length > 0 && (
              <div className="space-y-1.5 border border-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 bg-muted/50 text-xs font-medium text-muted-foreground">
                  <span>Product</span>
                  <span className="text-center w-24">Qty</span>
                  <span className="text-right w-20">Price</span>
                  <span className="w-8" />
                </div>
                {cart.map((item, idx) => {
                  const variant = item.variant_id ? item.product.variants.find(v => v.id === item.variant_id) : null;
                  const variantLabel = variant ? Object.values(variant.combination).join(" / ") : null;
                  return (
                    <div key={idx} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2 items-center border-t border-border/50">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                        {variantLabel && <p className="text-[10px] text-muted-foreground">{variantLabel}</p>}
                      </div>
                      <div className="flex items-center gap-1 w-24 justify-center">
                        <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQty(idx, -1)}><Minus className="w-3 h-3" /></Button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQty(idx, 1)}><Plus className="w-3 h-3" /></Button>
                      </div>
                      <span className="text-sm font-semibold text-right w-20">${(item.unit_price * item.quantity).toFixed(2)}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeFromCart(idx)}><Trash2 className="w-3 h-3" /></Button>
                    </div>
                  );
                })}
                <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 px-3 py-2.5 bg-muted/30 border-t border-border font-semibold">
                  <span className="text-sm">Total</span>
                  <span className="w-24" />
                  <span className="text-sm text-right w-20">${total.toFixed(2)}</span>
                  <span className="w-8" />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* ─── Payment & Notes ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Payment Status</Label>
              <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as typeof paymentStatus)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="partial">Partial</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Notes (optional)</Label>
              <Input placeholder="Sale notes..." value={notes} onChange={e => setNotes(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          {/* ─── Actions ─── */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="gap-2">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Sale — ${total.toFixed(2)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
