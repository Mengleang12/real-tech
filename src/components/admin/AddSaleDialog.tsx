import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { salesApi, warrantyApi, type SaleCustomer, type SaleProduct, type CreateSalePayload } from "@/lib/api";
import { AdminDialog, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./AdminDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { Search, Plus, Trash2, UserPlus, Loader2, X, Minus, Users, Percent, CalendarIcon, ScanBarcode, Truck } from "lucide-react";
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
  const [newCustomerAddress, setNewCustomerAddress] = useState("Cambodia");
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
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paidMethod, setPaidMethod] = useState<string>("cash");
  const [saleDate, setSaleDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [warrantyPeriod, setWarrantyPeriod] = useState("");
  const [deliveryFee, setDeliveryFee] = useState<number>(0);

  // Scan loading state
  const [scanLoading, setScanLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

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

  // Handle Enter key on search input: auto-add first matching product (scan behavior)
  const handleQuickAdd = useCallback(async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setScanLoading(true);
    try {
      const res = await salesApi.searchProducts(trimmed);
      const found = res.products;
      if (found.length === 0) {
        // Silently do nothing - no alert
        setScanLoading(false);
        return;
      }
      // Exact SKU match first
      const exactProduct = found.find(p => p.variants.some(v => v.sku === trimmed));
      const exactVariant = found.flatMap(p => p.variants.map(v => ({ product: p, variant: v }))).find(pv => pv.variant.sku === trimmed);

      if (exactVariant) {
        addToCart(exactVariant.product, exactVariant.variant.id);
        toast.success(`Added: ${exactVariant.product.name}`);
      } else if (exactProduct) {
        if (exactProduct.variants.length > 0) {
          addToCart(exactProduct, exactProduct.variants[0].id);
        } else {
          addToCart(exactProduct);
        }
        toast.success(`Added: ${exactProduct.name}`);
      } else {
        // Auto-select first result
        const first = found[0];
        if (first.variants.length > 0) {
          addToCart(first, first.variants[0].id);
        } else {
          addToCart(first);
        }
        toast.success(`Added: ${first.name}`);
      }
    } catch {
      toast.error("Search failed");
    }
    setScanLoading(false);
    setProductSearch("");
    setProducts([]);
    setTimeout(() => searchInputRef.current?.focus(), 100);
  }, [cart]); // eslint-disable-line react-hooks/exhaustive-deps


  // Get available stock for a product/variant
  const getAvailableStock = (product: SaleProduct, variantId?: number) => {
    const variant = variantId ? product.variants.find(v => v.id === variantId) : null;
    return variant ? (variant.stock_quantity ?? 0) : (product.variants.reduce((s, v) => s + v.stock_quantity, 0));
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
      const price = variant ? Number(variant.price_adjustment || 0) : (product.variants.length > 0 ? Number(product.variants[0].price_adjustment || 0) : 0);
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

  const grandTotal = Math.max(0, subtotal - saleDiscountAmount) + deliveryFee;

  // Auto-switch partial → paid when paid amount covers grand total
  useEffect(() => {
    if (paymentStatus === "partial" && paidAmount >= grandTotal && grandTotal > 0) {
      setPaymentStatus("paid");
      setPaidAmount(0);
    }
  }, [paidAmount, grandTotal, paymentStatus]);

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
    setNewCustomerAddress("Cambodia");
    setCart([]);
    setSaleDiscount(0);
    setSaleDiscountType("amount");
    setPaymentStatus("pending");
    setPaidAmount(0);
    setSaleDate(new Date());
    setNotes("");
    setWarrantyPeriod("");
    setDeliveryFee(0);
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
      ...(customerType === "walkin" && { customer_name: "Walk-in Customer", customer_address: newCustomerAddress || undefined }),
      ...(customerType === "new" && {
        customer_name: newCustomerName,
        customer_phone: newCustomerPhone || undefined,
        customer_email: newCustomerEmail || undefined,
        customer_address: newCustomerAddress || undefined,
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
      paid_amount: paymentStatus === "partial" && paidAmount > 0 ? paidAmount : undefined,
      paid_method: paymentStatus === "partial" && paidAmount > 0 ? paidMethod : undefined,
      sale_discount: saleDiscount > 0 ? saleDiscount : undefined,
      sale_discount_type: saleDiscount > 0 ? saleDiscountType : undefined,
      notes: notes || undefined,
      warranty_period: warrantyPeriod || undefined,
      delivery_fee: deliveryFee > 0 ? deliveryFee : undefined,
      sale_date: format(saleDate, "yyyy-MM-dd"),
    };

    createMutation.mutate(payload);
  };

  return (
    <AdminDialog 
      open={open} 
      onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }} 
      title={<span className="flex items-center gap-2"><Plus className="w-5 h-5" /> New Sale</span>}
      size="3xl"
      className="h-[85vh]"
      footer={
        <div className="flex justify-end gap-2 w-full">
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createMutation.isPending} className="gap-2">
            {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Sale{cart.length > 0 ? ` — $${grandTotal.toFixed(2)}` : ""}
          </Button>
        </div>
      }
    >

        <div className="space-y-4">
          {/* ─── Top Row: Date + Customer + Payment ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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

            {/* Warranty Period */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Warranty</Label>
              <WarrantySelect value={warrantyPeriod} onChange={setWarrantyPeriod} />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Notes</Label>
              <Input placeholder="Optional notes..." value={notes} onChange={e => setNotes(e.target.value)} className="h-9 text-sm" />
            </div>
          </div>

          {/* Partial Payment - Full Row */}
          {paymentStatus === "partial" && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-2.5 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Paid Amount</span>
                {grandTotal > 0 && (
                  <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
                    Remaining: ${Math.max(0, grandTotal - paidAmount).toFixed(2)}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={paidAmount || ""}
                    onChange={e => setPaidAmount(parseFloat(e.target.value) || 0)}
                    className="h-9 text-sm pl-7 font-medium"
                    placeholder="0.00"
                  />
                </div>
                <Select value={paidMethod} onValueChange={setPaidMethod}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="aba">ABA</SelectItem>
                    <SelectItem value="acleda">ACLEDA</SelectItem>
                    <SelectItem value="wing">Wing</SelectItem>
                    <SelectItem value="bakong">Bakong</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {grandTotal > 0 && (
                <div className="space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-amber-500 transition-all duration-300"
                      style={{ width: `${Math.min(100, (paidAmount / grandTotal) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground text-right">
                    {((Math.min(paidAmount, grandTotal) / grandTotal) * 100).toFixed(0)}% paid
                  </p>
                </div>
              )}
            </div>
          )}

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
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Walk-in customer — no account created</p>
                <Input placeholder="Address" value={newCustomerAddress} onChange={e => setNewCustomerAddress(e.target.value)} className="h-9 text-sm" />
              </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input placeholder="Name *" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} className="h-9 text-sm" />
                <Input placeholder="Phone" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} className="h-9 text-sm" />
                <Input placeholder="Email" value={newCustomerEmail} onChange={e => setNewCustomerEmail(e.target.value)} className="h-9 text-sm" />
                <Input placeholder="Address" value={newCustomerAddress} onChange={e => setNewCustomerAddress(e.target.value)} className="h-9 text-sm" />
              </div>
            )}
          </div>

          {/* ─── Products Section ─── */}
          <div className="rounded-lg border border-border p-4 space-y-3 overflow-visible">
            <Label className="text-sm font-semibold">Products</Label>

            <div className="relative">
              <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search or scan barcode... (Enter to quick-add)"
                value={productSearch}
                onChange={(e) => handleSearchProducts(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleQuickAdd(productSearch);
                  }
                }}
                className="pl-9 h-9 text-sm"
              />
              {(productLoading || scanLoading) && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
            </div>
              {productLoading && productSearch.length >= 1 && (
                <div className="mt-1 bg-popover border border-border rounded-lg shadow-lg p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" /> Searching products...
                </div>
              )}
              {!productLoading && products.length > 0 && (
                <div className="mt-1 bg-popover border border-border rounded-lg shadow-lg">
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
                        <button className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-3 transition-colors cursor-pointer" onClick={() => addToCart(p, p.variants.length > 0 ? p.variants[0].id : undefined)}>
                          {p.icon_url && <img src={p.icon_url} className="w-8 h-8 rounded object-cover shrink-0" alt="" />}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground truncate">{p.name} <span className="text-muted-foreground font-normal">#{p.id}</span></p>
                            <p className="text-xs text-muted-foreground">Stock: {p.variants.reduce((s, v) => s + v.stock_quantity, 0)}</p>
                          </div>
                          <span className="text-xs font-semibold text-foreground">${p.variants.length > 0 ? Number(p.variants[0].price_adjustment).toFixed(2) : '0.00'}</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

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

              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1.5"><Truck className="w-3.5 h-3.5" /> Delivery Fee</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={deliveryFee || ""}
                    onChange={e => setDeliveryFee(parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm w-24"
                    placeholder="0"
                  />
                  {deliveryFee > 0 && (
                    <span className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">+${deliveryFee.toFixed(2)}</span>
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

        </div>
    </AdminDialog>
  );
};

// ─── Warranty Select Component ────────────────────────────────────────────────
const WarrantySelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const { data } = useQuery({
    queryKey: ["warranties"],
    queryFn: () => warrantyApi.getAll(),
  });

  const warranties = data?.warranties || [];

  // Auto-select default warranty when data loads and no value is set
  useEffect(() => {
    if (!value && warranties.length > 0) {
      const defaultWarranty = warranties.find((w) => w.is_default);
      if (defaultWarranty) {
        onChange(defaultWarranty.name);
      }
    }
  }, [warranties, value, onChange]);

  return (
    <Select value={value || "__none__"} onValueChange={(v) => onChange(v === "__none__" ? "" : v)}>
      <SelectTrigger className="h-9 text-sm">
        <SelectValue placeholder="No warranty" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__">No warranty</SelectItem>
        {warranties.map((w) => (
          <SelectItem key={w.id} value={w.name}>{w.name} ({w.duration_days} days)</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
