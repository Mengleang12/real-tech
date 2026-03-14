import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { quotationsApi, salesApi, type Quotation, type SaleProduct, type SaleCustomer } from "@/lib/api";
import { getInvoiceBranding } from "@/lib/invoice-branding";
import { AdminDialog } from "./AdminDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Search, Plus, Trash2, Loader2, Package, ChevronLeft, ChevronRight,
  FileText, Eye, Printer, Send, CheckCircle, XCircle, ArrowRight, CalendarIcon,
  Copy, Share2, MoreHorizontal, Clock, Users, UserPlus, X, ClipboardPaste
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import JsBarcode from "jsbarcode";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';

const statusConfig: Record<string, { variant: "default" | "secondary" | "destructive" | "outline" | "warning"; label: string; icon: React.ElementType }> = {
  draft: { variant: "secondary", label: "Draft", icon: FileText },
  sent: { variant: "default", label: "Sent", icon: Send },
  accepted: { variant: "default", label: "Accepted", icon: CheckCircle },
  rejected: { variant: "destructive", label: "Rejected", icon: XCircle },
  expired: { variant: "outline", label: "Expired", icon: Clock },
  converted: { variant: "default", label: "Converted", icon: ArrowRight },
};

// ─── Create/Edit Quotation Dialog ─────────────────────────────────────────────
interface QuotationFormItem {
  product_id: number;
  variant_id?: number | null;
  product_name: string;
  variant_label?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  discount_type?: string | null;
}

interface QuotationFormProps {
  quotation?: Quotation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const QuotationFormDialog = ({ quotation, open, onOpenChange, onSaved }: QuotationFormProps) => {
  const [items, setItems] = useState<QuotationFormItem[]>(
    quotation?.items?.map(i => ({
      product_id: i.product_id,
      variant_id: i.variant_id,
      product_name: i.product_name,
      variant_label: i.variant_label || '',
      quantity: i.quantity,
      unit_price: Number(i.unit_price),
      discount: Number(i.discount),
      discount_type: i.discount_type,
    })) || []
  );
  const [customerType, setCustomerType] = useState<"walkin" | "existing" | "new">(
    quotation?.customer_id ? "existing" : (quotation?.customer_name ? "new" : "walkin")
  );
  const [customerSearch, setCustomerSearch] = useState("");
  const [customers, setCustomers] = useState<SaleCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<SaleCustomer | null>(
    quotation?.customer_id ? { id: quotation.customer_id, full_name: quotation.customer_name || '', email: quotation.customer_email || '', phone: quotation.customer_phone || '' } : null
  );
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerName, setCustomerName] = useState(quotation?.customer_name || '');
  const [customerPhone, setCustomerPhone] = useState(quotation?.customer_phone || '');
  const [customerEmail, setCustomerEmail] = useState(quotation?.customer_email || '');

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
  const [validUntil, setValidUntil] = useState<Date | undefined>(quotation?.valid_until ? new Date(quotation.valid_until) : undefined);
  const [notes, setNotes] = useState(quotation?.notes || '');
  const [terms, setTerms] = useState(quotation?.terms || '');
  const [discountAmount, setDiscountAmount] = useState(Number(quotation?.discount_amount || 0));
  const [discountType, setDiscountType] = useState(quotation?.discount_type || 'amount');
  const [deliveryFee, setDeliveryFee] = useState<number>(Number(quotation?.delivery_fee || 0));
  const [saving, setSaving] = useState(false);

  // Product search
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<SaleProduct[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
    setSearch(q);
    if (q.length < 1) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await salesApi.searchProducts(q);
      setSearchResults(res.products);
    } catch { /* ignore */ }
    setSearching(false);
  }, []);

  const addProduct = (product: SaleProduct, variantId?: number) => {
    const variant = variantId ? product.variants.find(v => v.id === variantId) : product.variants[0];
    const price = variant ? Number(variant.price_adjustment || 0) : 0;
    const variantLabel = variant ? Object.values(variant.combination).join(' / ') : '';

    setItems(prev => [...prev, {
      product_id: product.id,
      variant_id: variant?.id || null,
      product_name: product.name,
      variant_label: variantLabel,
      quantity: 1,
      unit_price: price,
      discount: 0,
      discount_type: null,
    }]);
    setSearch('');
    setSearchResults([]);
  };

  const updateItem = (idx: number, updates: Partial<QuotationFormItem>) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, ...updates } : item));
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const subtotal = items.reduce((sum, item) => {
    const itemTotal = item.unit_price * item.quantity;
    const disc = item.discount_type === 'percent' ? itemTotal * (item.discount / 100) : (item.discount || 0);
    return sum + itemTotal - disc;
  }, 0);

  const overallDisc = discountType === 'percent' ? subtotal * (discountAmount / 100) : discountAmount;
  const total = Math.max(0, subtotal - overallDisc) + deliveryFee;

  const handleSave = async () => {
    if (items.length === 0) { toast.error('Add at least one product'); return; }
    setSaving(true);
    try {
      const resolvedName = customerType === "existing" && selectedCustomer ? selectedCustomer.full_name : customerName;
      const resolvedPhone = customerType === "existing" && selectedCustomer ? (selectedCustomer.phone || '') : customerPhone;
      const resolvedEmail = customerType === "existing" && selectedCustomer ? selectedCustomer.email : customerEmail;
      const resolvedCustomerId = customerType === "existing" && selectedCustomer ? selectedCustomer.id : null;

      const data = {
        customer_id: resolvedCustomerId,
        customer_name: resolvedName || null,
        customer_phone: resolvedPhone || null,
        customer_email: resolvedEmail || null,
        valid_until: validUntil ? format(validUntil, 'yyyy-MM-dd') : null,
        notes: notes || null,
        terms: terms || null,
        discount_amount: discountAmount,
        discount_type: discountType,
        delivery_fee: deliveryFee > 0 ? deliveryFee : 0,
        items: items.map(i => ({
          product_id: i.product_id,
          variant_id: i.variant_id,
          product_name: i.product_name,
          variant_label: i.variant_label || null,
          quantity: i.quantity,
          unit_price: i.unit_price,
          discount: i.discount,
          discount_type: i.discount_type,
        })),
      };

      if (quotation) {
        await quotationsApi.update(quotation.id, data);
        toast.success('Quotation updated');
      } else {
        await quotationsApi.create(data);
        toast.success('Quotation created');
      }
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Failed to save quotation');
    }
    setSaving(false);
  };

  return (
    <AdminDialog open={open} onOpenChange={onOpenChange} title={quotation ? 'Edit Quotation' : 'New Quotation'} size="4xl">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        {/* Customer Section */}
        <div className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-semibold">Customer</Label>
            <div className="flex gap-1.5">
              <Button size="sm" variant={customerType === "walkin" ? "default" : "outline"} onClick={() => { setCustomerType("walkin"); setSelectedCustomer(null); }} className="h-7 text-xs gap-1 px-2.5">
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
            <p className="text-xs text-muted-foreground">Walk-in customer — no customer info attached</p>
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
              <div className="relative">
                <Input placeholder="Name *" value={customerName} onChange={e => setCustomerName(e.target.value)} className="h-9 text-sm pr-8" />
                <button type="button" className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Paste" onClick={async () => { try { const t = await navigator.clipboard.readText(); if (t.trim()) setCustomerName(t.trim()); } catch { toast.error("Cannot access clipboard"); } }}><ClipboardPaste className="w-3 h-3" /></button>
              </div>
              <div className="relative">
                <Input placeholder="Phone" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="h-9 text-sm pr-8" />
                <button type="button" className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Paste" onClick={async () => { try { const t = await navigator.clipboard.readText(); if (t.trim()) setCustomerPhone(t.trim()); } catch { toast.error("Cannot access clipboard"); } }}><ClipboardPaste className="w-3 h-3" /></button>
              </div>
              <div className="relative">
                <Input placeholder="Email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="h-9 text-sm pr-8" />
                <button type="button" className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Paste" onClick={async () => { try { const t = await navigator.clipboard.readText(); if (t.trim()) setCustomerEmail(t.trim()); } catch { toast.error("Cannot access clipboard"); } }}><ClipboardPaste className="w-3 h-3" /></button>
              </div>
            </div>
          )}
        </div>

        {/* Product Search */}
        <div className="relative">
          <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search product..." value={search} onChange={e => handleSearch(e.target.value)} className="pl-9 h-9 text-sm" />
          {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
          {!searching && searchResults.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {searchResults.map(p => (
                <div key={p.id}>
                  {p.variants.length > 0 ? p.variants.map(v => (
                    <button key={`${p.id}-${v.id}`} className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-3 cursor-pointer" onClick={() => addProduct(p, v.id)}>
                      {p.icon_url && <img src={p.icon_url} className="w-7 h-7 rounded object-cover shrink-0" alt="" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{Object.values(v.combination).join(' / ')}</p>
                      </div>
                      <span className="text-xs font-semibold">${Number(v.price_adjustment || 0).toFixed(2)}</span>
                    </button>
                  )) : (
                    <button className="w-full text-left px-3 py-2 hover:bg-muted text-sm cursor-pointer" onClick={() => addProduct(p)}>
                      <p className="font-medium">{p.name}</p>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Items Table */}
        {items.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_70px_90px_90px_90px_32px] gap-1 px-3 py-2 bg-muted/50 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              <span>Product</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Price</span>
              <span className="text-right">Discount</span>
              <span className="text-right">Total</span>
              <span />
            </div>
            {items.map((item, idx) => {
              const itemTotal = item.unit_price * item.quantity;
              const disc = item.discount_type === 'percent' ? itemTotal * (item.discount / 100) : (item.discount || 0);
              const lineTotal = itemTotal - disc;
              return (
                <div key={idx} className="grid grid-cols-[1fr_70px_90px_90px_90px_32px] gap-1 px-3 py-2 items-center border-t border-border/50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.product_name}</p>
                    {item.variant_label && <p className="text-[10px] text-muted-foreground">{item.variant_label}</p>}
                  </div>
                  <Input type="number" min={1} value={item.quantity} onChange={e => updateItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })} className="h-7 text-xs text-center p-1" />
                  <Input type="number" step="0.01" value={item.unit_price} onChange={e => updateItem(idx, { unit_price: parseFloat(e.target.value) || 0 })} className="h-7 text-xs text-right p-1" />
                  <Input type="number" step="0.01" value={item.discount} onChange={e => updateItem(idx, { discount: parseFloat(e.target.value) || 0 })} className="h-7 text-xs text-right p-1" />
                  <span className="text-sm font-medium text-right">${lineTotal.toFixed(2)}</span>
                  <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeItem(idx)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Discount, Delivery & Validity */}
        <div className="grid grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Overall Discount</Label>
            <div className="flex gap-1 mt-1">
              <Input type="number" step="0.01" value={discountAmount} onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)} className="h-9 flex-1" />
              <Select value={discountType} onValueChange={setDiscountType}>
                <SelectTrigger className="w-20 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">$</SelectItem>
                  <SelectItem value="percent">%</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Delivery Fee</Label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">$</span>
              <Input type="number" step="0.01" min={0} value={deliveryFee || ''} onChange={e => setDeliveryFee(parseFloat(e.target.value) || 0)} className="h-9 pl-7" placeholder="0.00" />
            </div>
          </div>
          <div>
            <Label className="text-xs">Valid Until</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1 h-9", !validUntil && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                  {validUntil ? format(validUntil, 'PPP') : 'Pick date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={validUntil} onSelect={setValidUntil} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex flex-col justify-end">
            <div className="text-right space-y-0.5">
              <p className="text-xs text-muted-foreground">Subtotal: ${subtotal.toFixed(2)}</p>
              {overallDisc > 0 && <p className="text-xs text-destructive">Discount: -${overallDisc.toFixed(2)}</p>}
              {deliveryFee > 0 && <p className="text-xs text-muted-foreground">Delivery: +${deliveryFee.toFixed(2)}</p>}
              <p className="text-lg font-bold">${total.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 min-h-[60px]" placeholder="Additional notes..." />
          </div>
          <div>
            <Label className="text-xs">Terms & Conditions</Label>
            <Textarea value={terms} onChange={e => setTerms(e.target.value)} className="mt-1 min-h-[60px]" placeholder="Payment terms, validity..." />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || items.length === 0} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
            {saving ? 'Saving...' : quotation ? 'Update Quotation' : 'Create Quotation'}
          </Button>
        </div>
      </div>
    </AdminDialog>
  );
};

// ─── Quotation Print/Preview ────────────────────────────────────────────────
const printQuotation = async (quotation: Quotation) => {
  const branding = await getInvoiceBranding();
  const items = quotation.items || [];
  const primaryColor = branding.primary_color || '#2563eb';

  const hasItemDiscount = items.some(i => Number(i.discount) > 0);

  const itemRows = items.map(item => {
    const disc = item.discount_type === 'percent'
      ? Number(item.unit_price) * item.quantity * (Number(item.discount) / 100)
      : Number(item.discount || 0);
    return `<tr>
      <td class="name">${item.product_name}${item.variant_label ? `<div style="font-size:10px;color:#888;margin-top:2px;line-height:1">${item.variant_label}</div>` : ''}</td>
      <td>${item.quantity}</td>
      <td style="text-align:right">$${Number(item.unit_price).toFixed(2)}</td>
      ${hasItemDiscount ? `<td style="text-align:right;color:#dc2626">${disc > 0 ? '-$' + disc.toFixed(2) : '—'}</td>` : ''}
      <td style="text-align:right;font-weight:600">$${Number(item.line_total).toFixed(2)}</td>
    </tr>`;
  }).join('');

  const overallDisc = Number(quotation.discount_amount || 0);
  const overallDiscDisplay = quotation.discount_type === 'percent'
    ? Number(quotation.subtotal) * (overallDisc / 100)
    : overallDisc;
  const deliveryFee = Number(quotation.delivery_fee || 0);

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

  doc.write(`<!DOCTYPE html><html><head><title>Quotation ${quotation.quotation_number}</title>
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
      .info-row{display:flex;justify-content:space-between;gap:12px;margin:10px 0;padding:8px 12px;background:#f8fafc;border-radius:6px}
      .info-col{flex:1}
      .info-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.2px;color:#9ca3af;margin-bottom:2px}
      .info-name{font-size:12px;font-weight:600;color:#111827}
      .info-sub{font-size:10px;color:#6b7280}
      .qt-badge{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;background:${primaryColor};color:#fff}
      table{width:100%;border-collapse:collapse;margin:8px 0 0}
      thead th{text-align:left;padding:6px 10px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#fff;border-bottom:1px solid #e5e7eb;background:#111827}
      thead th:last-child,thead th.r{text-align:right}
      tbody td{padding:6px 10px;font-size:12px;color:#374151;border-bottom:1px solid #f3f4f6}
      tbody td:last-child{text-align:right;font-variant-numeric:tabular-nums}
      tbody td.name{font-weight:600;color:#111827}
      .summary{display:flex;justify-content:flex-end;margin-top:6px}
      .summary-tbl{width:200px}
      .s-row{display:flex;justify-content:space-between;padding:4px 10px;font-size:12px;color:#6b7280}
      .s-row.disc{color:#dc2626}
      .s-row.total{background:#111827;color:#fff;border-radius:4px;padding:8px 10px;font-size:14px;font-weight:700;margin-top:3px}
      .note-box{margin-top:6px;padding:6px 10px;background:#f8fafc;border-left:2px solid ${primaryColor};border-radius:4px}
      .note-box .nlabel{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;margin-bottom:1px}
      .note-box p{font-size:10px;color:#374151;line-height:1.4}
      .footer{text-align:center;margin-top:10px;padding-top:8px;border-top:1px solid #e5e7eb}
      .footer-thanks{font-size:11px;font-weight:600;color:#111827}
      .footer-brand{font-size:9px;color:#9ca3af;margin-top:2px}
      @media print{body{padding:0}.page{max-width:100%}}
    </style></head><body>
    <div class="page">

    <div class="header">
      <div class="brand">
        ${branding.site_logo_url
          ? `<div class="brand-icon"><img src="${branding.site_logo_url}" alt="${branding.site_name}" /></div>`
          : `<div class="brand-icon" style="background:${primaryColor};color:#fff;font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center;border-radius:6px">${branding.site_name.charAt(0)}</div>`
        }
        <div>
          <div class="brand-name">${branding.site_name}</div>
          ${branding.site_tagline ? `<div class="brand-sub">${branding.site_tagline}</div>` : ''}
          ${branding.support_phone ? `<div class="brand-sub">${branding.support_phone}</div>` : ''}
          <div class="brand-sub">${format(new Date(quotation.created_at), 'dd MMM yyyy')}</div>
        </div>
      </div>
      <div class="inv-meta">
        <div class="inv-title">Quotation</div>
        <div class="inv-number">${quotation.quotation_number}</div>
        <div class="inv-barcode"><svg id="qt-barcode"></svg></div>
        ${quotation.valid_until ? `<div style="font-size:10px;color:#e65100;margin-top:2px">Valid until: ${format(new Date(quotation.valid_until), 'dd MMM yyyy')}</div>` : ''}
      </div>
    </div>

    <div class="info-row">
      <div class="info-col">
        <div class="info-label">Quotation For</div>
        <div class="info-name">${quotation.customer_name || 'Walk-in Customer'}</div>
        ${quotation.customer_phone ? `<div class="info-sub">${quotation.customer_phone}</div>` : ''}
        ${quotation.customer_email ? `<div class="info-sub">${quotation.customer_email}</div>` : ''}
      </div>
      <div class="info-col" style="text-align:right">
        <div class="info-label">Status</div>
        <div style="margin-top:2px"><span class="qt-badge">${quotation.status.toUpperCase()}</span></div>
      </div>
    </div>

    <table>
      <thead><tr><th>Item</th><th>Qty</th><th class="r">Price</th>${hasItemDiscount ? '<th class="r">Disc.</th>' : ''}<th class="r">Total</th></tr></thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div class="summary">
      <div class="summary-tbl">
        <div class="s-row"><span>Subtotal</span><span>$${Number(quotation.subtotal).toFixed(2)}</span></div>
        ${overallDiscDisplay > 0 ? `<div class="s-row disc"><span>Discount</span><span>-$${overallDiscDisplay.toFixed(2)}</span></div>` : ''}
        ${deliveryFee > 0 ? `<div class="s-row"><span>Delivery</span><span>+$${deliveryFee.toFixed(2)}</span></div>` : ''}
        <div class="s-row total"><span>Grand Total</span><span>$${Number(quotation.total).toFixed(2)} ${quotation.currency}</span></div>
      </div>
    </div>

    ${quotation.notes ? `<div class="note-box"><div class="nlabel">Notes</div><p>${quotation.notes}</p></div>` : ''}
    ${quotation.terms ? `<div class="note-box"><div class="nlabel">Terms & Conditions</div><p>${quotation.terms}</p></div>` : ''}

    <div class="footer">
      <div class="footer-thanks">Thank you for your interest!</div>
      <div class="footer-brand">${branding.site_name}${branding.support_email ? ` · ${branding.support_email}` : ''}${branding.site_address ? ` · ${branding.site_address}` : ''}</div>
    </div>

    </div>
    <script>try{JsBarcode("#qt-barcode","${quotation.quotation_number}",{format:"CODE128",height:28,width:1.2,displayValue:false,margin:0})}catch(e){}<\/script>
    </body></html>`);
  doc.close();
  iframe.onload = () => {
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };
};

// ─── Main QuotationManagement Component ─────────────────────────────────────
export const QuotationManagement = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editQuotation, setEditQuotation] = useState<Quotation | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<Quotation | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['quotations', search, statusFilter, page],
    queryFn: () => quotationsApi.getAll({ search: search || undefined, status: statusFilter !== 'all' ? statusFilter : undefined, page, limit: 20 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => quotationsApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotations'] }); toast.success('Quotation deleted'); },
    onError: () => toast.error('Failed to delete quotation'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => quotationsApi.updateStatus(id, status),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['quotations'] }); toast.success('Status updated'); },
    onError: () => toast.error('Failed to update status'),
  });

  const handleConvert = async (quotation: Quotation) => {
    toast.info('Converting quotation to sale... Use the Sale creation dialog with pre-filled data.');
    // Open the quotation data in a way that can be used by AddSaleDialog
    // For now, just mark as converted
    try {
      await quotationsApi.updateStatus(quotation.id, 'converted');
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Quotation marked as converted');
    } catch {
      toast.error('Failed to convert');
    }
  };

  const copyShareLink = (quotation: Quotation) => {
    const url = `${window.location.origin}/quotation/${quotation.quotation_number}`;
    navigator.clipboard.writeText(url);
    toast.success('Share link copied to clipboard!');
  };

  const quotations = data?.quotations || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Quotations</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Create and manage price quotations for customers</p>
        </div>
        <Button onClick={() => { setEditQuotation(undefined); setCreateOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> New Quotation
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search quotations..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9 h-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="accepted">Accepted</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      ) : quotations.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No quotations found</p>
          <p className="text-sm mt-1">Create your first quotation to get started</p>
        </div>
      ) : (
        <div className="space-y-2">
          {quotations.map(q => {
            const sc = statusConfig[q.status] || statusConfig.draft;
            const isExpired = q.valid_until && new Date(q.valid_until) < new Date() && q.status !== 'converted' && q.status !== 'accepted';
            return (
              <div key={q.id} className="flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:shadow-sm transition-shadow">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">{q.quotation_number}</span>
                    <Badge variant={isExpired ? 'destructive' : sc.variant} className="text-[10px]">
                      {isExpired ? 'Expired' : sc.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{q.customer_name || 'No customer'}</span>
                    <span>·</span>
                    <span>{q.items?.length || 0} item{(q.items?.length || 0) !== 1 ? 's' : ''}</span>
                    <span>·</span>
                    <span>{format(new Date(q.created_at), 'dd MMM yyyy')}</span>
                    {q.valid_until && (
                      <>
                        <span>·</span>
                        <span className={isExpired ? 'text-destructive' : ''}>
                          Valid: {format(new Date(q.valid_until), 'dd MMM yyyy')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold">${Number(q.total).toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">{q.currency}</p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditQuotation(q); setCreateOpen(true); }}>
                      <Eye className="w-3.5 h-3.5 mr-2" /> View / Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => printQuotation(q)}>
                      <Printer className="w-3.5 h-3.5 mr-2" /> Print
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => copyShareLink(q)}>
                      <Share2 className="w-3.5 h-3.5 mr-2" /> Copy Share Link
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {q.status === 'draft' && (
                      <DropdownMenuItem onClick={() => statusMutation.mutate({ id: q.id, status: 'sent' })}>
                        <Send className="w-3.5 h-3.5 mr-2" /> Mark as Sent
                      </DropdownMenuItem>
                    )}
                    {(q.status === 'sent' || q.status === 'draft') && (
                      <DropdownMenuItem onClick={() => statusMutation.mutate({ id: q.id, status: 'accepted' })}>
                        <CheckCircle className="w-3.5 h-3.5 mr-2" /> Mark Accepted
                      </DropdownMenuItem>
                    )}
                    {q.status === 'sent' && (
                      <DropdownMenuItem onClick={() => statusMutation.mutate({ id: q.id, status: 'rejected' })}>
                        <XCircle className="w-3.5 h-3.5 mr-2" /> Mark Rejected
                      </DropdownMenuItem>
                    )}
                    {q.status !== 'converted' && (
                      <DropdownMenuItem onClick={() => handleConvert(q)}>
                        <ArrowRight className="w-3.5 h-3.5 mr-2" /> Convert to Sale
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirm(q)}>
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {pagination.current_page} of {pagination.total_pages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <QuotationFormDialog
        key={editQuotation?.id || 'new'}
        quotation={editQuotation}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ['quotations'] })}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={open => { if (!open) setDeleteConfirm(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteConfirm?.quotation_number}?</AlertDialogTitle>
            <AlertDialogDescription>This quotation will be permanently deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteConfirm) deleteMutation.mutate(deleteConfirm.id); setDeleteConfirm(null); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
