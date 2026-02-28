import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { salesApi, type SaleCustomer, type SaleProduct, type CreateSalePayload } from "@/lib/api";
import { AdminDialog, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./AdminDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Search, Plus, Trash2, UserPlus, Package, Loader2, X, Minus, Users, Percent, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CartItem {
  product: SaleProduct;
  variant_id?: number;
  quantity: number;
  unit_price: number;
  discount: number; // per-item discount amount
  discount_type: "amount" | "percent";
  serial_numbers: string[]; // one per unit
}

interface AddSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddSaleDialog = ({ open, onOpenChange }: AddSaleDialogProps) => {
  const queryClient = useQueryClient();

  // Customer state
  const [customerType, setCustomerType] = useState<"walkin" | "existing" | "new">("walkin");
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

  // Sale-level discount
  const [saleDiscount, setSaleDiscount] = useState<number>(0);
  const [saleDiscountType, setSaleDiscountType] = useState<"amount" | "percent">("amount");

  // Payment
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending" | "partial" | "unpaid">("pending");
  const [saleDate, setSaleDate] = useState<Date>(new Date());
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

  // Get available stock for a product/variant
  const getAvailableStock = (product: SaleProduct, variantId?: number) => {
    const variant = variantId ? product.variants.find(v => v.id === variantId) : null;
    return variant ? (variant.stock_quantity ?? 0) : (product.stock_quantity ?? 0);
  };

  // Add product to cart
  const addToCart = (product: SaleProduct, variantId?: number) => {
    const stock = getAvailableStock(product, variantId);
    const exists = cart.find(c => c.product.id === product.id && c.variant_id === variantId);
    const currentQty = exists ? exists.quantity : 0;

    if (stock <= 0) {
      toast.error(`${product.name} is out of stock`);
      return;
    }
    if (currentQty >= stock) {
      toast.error(`Only ${stock} in stock for ${product.name}`);
      return;
    }

    if (exists) {
      setCart(cart.map(c =>
        c.product.id === product.id && c.variant_id === variantId
          ? { ...c, quantity: c.quantity + 1 }
          : c
      ));
    } else {
      const variant = variantId ? product.variants.find(v => v.id === variantId) : null;
      const price = variant ? Number(variant.price_adjustment || 0) : Number(product.price);
      setCart([...cart, { product, variant_id: variantId, quantity: 1, unit_price: price, discount: 0, discount_type: "amount", serial_numbers: [] }]);
    }
    setProductSearch("");
    setProducts([]);
  };

  const updateQty = (idx: number, delta: number) => {
    setCart(cart.map((c, i) => {
      if (i !== idx) return c;
      const stock = getAvailableStock(c.product, c.variant_id);
      const newQty = Math.max(1, c.quantity + delta);
      if (delta > 0 && newQty > stock) {
        toast.error(`Only ${stock} in stock for ${c.product.name}`);
        return c;
      }
      const newSerials = c.serial_numbers.filter(s => s.trim()).slice(0, newQty);
      return { ...c, quantity: newQty, serial_numbers: newSerials };
    }));
  };

  const addSerialNumber = (cartIdx: number, value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    // Check duplicate across ALL cart items
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

  const removeSerialNumber = (cartIdx: number, serialIdx: number) => {
    setCart(cart.map((c, i) => {
      if (i !== cartIdx) return c;
      return { ...c, serial_numbers: c.serial_numbers.filter((_, si) => si !== serialIdx) };
    }));
  };

  const updateItemDiscount = (idx: number, value: number, type: "amount" | "percent") => {
    setCart(cart.map((c, i) => i === idx ? { ...c, discount: value, discount_type: type } : c));
  };

  const removeFromCart = (idx: number) => {
    setCart(cart.filter((_, i) => i !== idx));
  };

  // Calculate line total after per-item discount
  const getLineTotal = (item: CartItem) => {
    const gross = item.unit_price * item.quantity;
    if (item.discount_type === "percent") {
      return gross * (1 - Math.min(item.discount, 100) / 100);
    }
    return Math.max(0, gross - item.discount);
  };

  const subtotal = cart.reduce((s, c) => s + getLineTotal(c), 0);

  // Sale-level discount
  const saleDiscountAmount = saleDiscountType === "percent"
    ? subtotal * Math.min(saleDiscount, 100) / 100
    : Math.min(saleDiscount, subtotal);

  const grandTotal = Math.max(0, subtotal - saleDiscountAmount);

  // Submit
  const createMutation = useMutation({
    mutationFn: (data: CreateSalePayload) => salesApi.createSale(data),
    onSuccess: (res) => {
      toast.success(res.message || "Sale created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-sales-dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-invoices"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to create sale");
    },
  });

  const resetForm = () => {
    setCustomerType("walkin");
    setCustomerSearch("");
    setSelectedCustomer(null);
    setNewCustomerName("");
    setNewCustomerPhone("");
    setNewCustomerEmail("");
    setCart([]);
    setSaleDiscount(0);
    setSaleDiscountType("amount");
    setPaymentStatus("pending");
    setSaleDate(new Date());
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

    // For walk-in, use "new" type with generic name
    const effectiveType = customerType === "walkin" ? "new" as const : customerType;

    const payload: CreateSalePayload = {
      customer_type: effectiveType,
      ...(customerType === "existing" && { customer_id: selectedCustomer!.id }),
      ...(customerType === "walkin" && { customer_name: "Walk-in Customer" }),
      ...(customerType === "new" && {
        customer_name: newCustomerName,
        customer_phone: newCustomerPhone || undefined,
        customer_email: newCustomerEmail || undefined,
      }),
      items: cart.map(c => ({
        product_id: c.product.id,
        variant_id: c.variant_id,
        quantity: c.quantity,
        price: +(getLineTotal(c) / c.quantity).toFixed(2),
        discount: c.discount > 0 ? c.discount : undefined,
        discount_type: c.discount > 0 ? c.discount_type : undefined,
        serial_numbers: c.serial_numbers.some(s => s.trim()) ? c.serial_numbers : undefined,
      })),
      payment_status: paymentStatus,
      sale_discount: saleDiscount > 0 ? saleDiscount : undefined,
      sale_discount_type: saleDiscount > 0 ? saleDiscountType : undefined,
      notes: notes || undefined,
      sale_date: format(saleDate, "yyyy-MM-dd"),
    };

    createMutation.mutate(payload);
  };

  return (
    <AdminDialog 
      open={open} 
      onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }} 
      title={<span className="flex items-center gap-2"><Plus className="w-5 h-5" /> New Sale</span>}
      size="2xl"
    >

        <div className="space-y-4">
          {/* ─── Top Row: Date + Customer + Payment ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Sale Date */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Sale Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("h-9 w-full justify-start text-left text-sm font-normal", !saleDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                    {saleDate ? format(saleDate, "MMM dd, yyyy") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={saleDate}
                    onSelect={(d) => d && setSaleDate(d)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Payment Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Payment Status</Label>
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

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
              <Input placeholder="Optional notes..." value={notes} onChange={e => setNotes(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          {/* ─── Customer Section ─── */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Customer</Label>
              <div className="flex gap-1.5">
                <Button size="sm" variant={customerType === "walkin" ? "default" : "outline"} onClick={() => setCustomerType("walkin")} className="h-7 text-xs gap-1 px-2.5">
                  <Users className="w-3 h-3" /> Walk-in
                </Button>
                <Button size="sm" variant={customerType === "existing" ? "default" : "outline"} onClick={() => setCustomerType("existing")} className="h-7 text-xs gap-1 px-2.5">
                  <Search className="w-3 h-3" /> Existing
                </Button>
                <Button size="sm" variant={customerType === "new" ? "default" : "outline"} onClick={() => setCustomerType("new")} className="h-7 text-xs gap-1 px-2.5">
                  <UserPlus className="w-3 h-3" /> New
                </Button>
              </div>
            </div>

            {customerType === "walkin" && (
              <p className="text-xs text-muted-foreground">Walk-in customer — no account created</p>
            )}

            {customerType === "existing" && (
              <>
                {selectedCustomer ? (
                  <div className="flex items-center justify-between p-2.5 rounded-md border border-border bg-muted/30">
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
                    {customerLoading && customerSearch.length >= 2 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" /> Searching customers...
                      </div>
                    )}
                    {!customerLoading && customers.length > 0 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                        {customers.map(c => (
                          <button key={c.id} className="w-full text-left px-3 py-2 hover:bg-muted text-sm transition-colors cursor-pointer" onClick={() => { setSelectedCustomer(c); setCustomers([]); setCustomerSearch(""); }}>
                            <p className="font-medium text-foreground">{c.full_name}</p>
                            <p className="text-xs text-muted-foreground">{c.email}{c.phone ? ` · ${c.phone}` : ""}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    {!customerLoading && customers.length === 0 && customerSearch.length >= 2 && (
                      <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg p-4 text-center text-sm text-muted-foreground">
                        No customers found
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            {customerType === "new" && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input placeholder="Name *" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} className="h-9 text-sm" />
                <Input placeholder="Phone" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} className="h-9 text-sm" />
                <Input placeholder="Email" value={newCustomerEmail} onChange={e => setNewCustomerEmail(e.target.value)} className="h-9 text-sm" />
              </div>
            )}
          </div>

          {/* ─── Products Section ─── */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <Label className="text-sm font-semibold">Products</Label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search by name, SKU, or ID..."
                value={productSearch}
                onChange={(e) => handleSearchProducts(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
              {productLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
              {productLoading && productSearch.length >= 1 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Searching products...
                </div>
              )}
              {!productLoading && products.length > 0 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {products.map(p => (
                    <div key={p.id}>
                      {p.variants.length > 0 ? (
                        p.variants.map(v => {
                          const label = Object.values(v.combination).join(" / ");
                          const price = Number(v.price_adjustment || 0);
                          return (
                            <button key={`${p.id}-${v.id}`} className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-3 transition-colors cursor-pointer" onClick={() => addToCart(p, v.id)}>
                              {p.icon_url && <img src={p.icon_url} className="w-8 h-8 rounded object-cover shrink-0" alt="" />}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-foreground truncate">{p.name} <span className="text-muted-foreground font-normal">#{p.id}</span></p>
                                <p className="text-xs text-muted-foreground">{label}{v.sku ? ` · SKU: ${v.sku}` : ''} · Stock: {v.stock_quantity}</p>
                              </div>
                              <span className="text-xs font-semibold text-foreground">${price.toFixed(2)}</span>
                            </button>
                          );
                        })
                      ) : (
                        <button className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-3 transition-colors cursor-pointer" onClick={() => addToCart(p)}>
                          {p.icon_url && <img src={p.icon_url} className="w-8 h-8 rounded object-cover shrink-0" alt="" />}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{p.name} <span className="text-muted-foreground font-normal">#{p.id}</span></p>
                            <p className="text-xs text-muted-foreground">{p.sku ? `SKU: ${p.sku} · ` : ''}Stock: {p.stock_quantity}</p>
                          </div>
                          <span className="text-xs font-semibold text-foreground">${Number(p.price).toFixed(2)}</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!productLoading && products.length === 0 && productSearch.length >= 1 && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg p-4 text-center text-sm text-muted-foreground">
                  No products found
                </div>
              )}
            </div>

            {/* Cart items */}
            {cart.length > 0 && (
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_80px_100px_80px_32px] gap-1 px-3 py-2 bg-muted/50 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                  <span>Product</span>
                  <span className="text-center">Qty</span>
                  <span className="text-center">Discount</span>
                  <span className="text-right">Total</span>
                  <span />
                </div>
                {cart.map((item, idx) => {
                  const variant = item.variant_id ? item.product.variants.find(v => v.id === item.variant_id) : null;
                  const variantLabel = variant ? Object.values(variant.combination).join(" / ") : null;
                  const lineTotal = getLineTotal(item);
                  return (
                    <div key={idx} className="border-t border-border/50">
                      <div className="grid grid-cols-[1fr_80px_100px_80px_32px] gap-1 px-3 py-2 items-center">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{item.product.name}</p>
                          {variantLabel && <p className="text-[10px] text-muted-foreground">{variantLabel}</p>}
                          <p className="text-[10px] text-muted-foreground">${item.unit_price.toFixed(2)} each</p>
                        </div>
                        <div className="flex items-center gap-0.5 justify-center">
                          <Button size="icon" variant="outline" className="h-5 w-5" onClick={() => updateQty(idx, -1)}><Minus className="w-2.5 h-2.5" /></Button>
                          <span className="text-xs font-medium w-5 text-center">{item.quantity}</span>
                          <Button size="icon" variant="outline" className="h-5 w-5" onClick={() => updateQty(idx, 1)}><Plus className="w-2.5 h-2.5" /></Button>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.discount || ""}
                            onChange={e => updateItemDiscount(idx, parseFloat(e.target.value) || 0, item.discount_type)}
                            className="h-6 text-[11px] px-1.5 w-14"
                            placeholder="0"
                          />
                          <button
                            onClick={() => updateItemDiscount(idx, item.discount, item.discount_type === "amount" ? "percent" : "amount")}
                            className="h-6 w-6 shrink-0 rounded border border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
                            title={item.discount_type === "amount" ? "Switch to %" : "Switch to $"}
                          >
                            {item.discount_type === "percent" ? "%" : "$"}
                          </button>
                        </div>
                        <span className="text-sm font-semibold text-right">${lineTotal.toFixed(2)}</span>
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeFromCart(idx)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                      {/* Serial number tag input */}
                      <div className="px-3 pb-2">
                        <div className="flex flex-wrap gap-1 items-center p-1.5 rounded border border-border bg-background min-h-[28px]">
                          {item.serial_numbers.map((sn, snIdx) => (
                            <span key={snIdx} className="inline-flex items-center gap-0.5 bg-muted text-foreground text-[11px] px-1.5 py-0.5 rounded font-mono">
                              {sn}
                              <button type="button" onClick={() => removeSerialNumber(idx, snIdx)} className="hover:text-destructive transition-colors cursor-pointer"><X className="w-3 h-3" /></button>
                            </span>
                          ))}
                          {item.serial_numbers.length < item.quantity && (
                            <input
                              className="flex-1 min-w-[80px] bg-transparent text-[11px] outline-none placeholder:text-muted-foreground font-mono"
                              placeholder={`Add S/N (${item.serial_numbers.length}/${item.quantity})`}
                              onKeyDown={e => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addSerialNumber(idx, e.currentTarget.value);
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

                {/* Subtotal */}
                <div className="grid grid-cols-[1fr_80px_100px_80px_32px] gap-1 px-3 py-2 bg-muted/20 border-t border-border text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span /><span />
                  <span className="text-right font-medium">${subtotal.toFixed(2)}</span>
                  <span />
                </div>
              </div>
            )}
          </div>

          {/* ─── Sale Discount + Grand Total ─── */}
          {cart.length > 0 && (
            <div className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1.5"><Percent className="w-3.5 h-3.5" /> Sale Discount</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={saleDiscount || ""}
                    onChange={e => setSaleDiscount(parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm w-24"
                    placeholder="0"
                  />
                  <Select value={saleDiscountType} onValueChange={(v) => setSaleDiscountType(v as "amount" | "percent")}>
                    <SelectTrigger className="h-8 text-sm w-24"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="amount">$ Fixed</SelectItem>
                      <SelectItem value="percent">% Percent</SelectItem>
                    </SelectContent>
                  </Select>
                  {saleDiscountAmount > 0 && (
                    <span className="text-sm text-destructive font-semibold">-${saleDiscountAmount.toFixed(2)}</span>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="text-base font-semibold">Grand Total</span>
                <span className="text-2xl font-bold text-foreground">${grandTotal.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* ─── Actions ─── */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending} className="gap-2">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Sale{cart.length > 0 ? ` — $${grandTotal.toFixed(2)}` : ""}
            </Button>
          </div>
        </div>
    </AdminDialog>
  );
};
