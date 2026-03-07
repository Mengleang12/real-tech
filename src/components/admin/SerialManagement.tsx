import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { serialsApi, salesApi, type ProductSerial, type SaleProduct } from "@/lib/api";
import { AdminDialog } from "./AdminDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Search, Plus, Trash2, Loader2, Package, ChevronLeft, ChevronRight,
  ScanBarcode, Pencil, AlertTriangle, CheckCircle2, XCircle, Ban, Camera, Printer,
} from "lucide-react";
import { CameraOCRDialog } from "./CameraOCRDialog";
import JsBarcode from "jsbarcode";

// ─── Print Serial Label Utility ─────────────────────────────────────────────
function printSerialLabel(serial: {
  serial_number: string;
  barcode?: string;
  product?: { name: string; icon_url?: string };
  variant?: { combination: Record<string, string>; price_adjustment?: number; sku?: string };
}) {
  const productName = serial.product?.name || "Product";
  const variantLabel = serial.variant ? Object.values(serial.variant.combination).join(" / ") : "";
  const price = serial.variant?.price_adjustment ?? 0;
  const barcodeValue = serial.barcode || serial.serial_number;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.top = "-10000px";
  iframe.style.left = "-10000px";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(`<!DOCTYPE html><html><head><style>
    @page { size: 40mm 30mm; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; }
    .label {
      width: 40mm; height: 30mm;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 1.5mm 2mm; overflow: hidden;
    }
    .product-name { font-size: 7pt; font-weight: 700; text-align: center; line-height: 1.2; max-height: 2.4em; overflow: hidden; margin-bottom: 0.5mm; width: 100%; }
    .variant-text { font-size: 6pt; color: #666; text-align: center; margin-bottom: 0.5mm; }
    .label svg { max-width: 36mm; height: 8mm; }
    .serial-text { font-size: 6pt; font-family: monospace; text-align: center; margin-top: 0.3mm; letter-spacing: 0.5pt; }
    .price-text { font-size: 9pt; font-weight: 900; margin-top: 0.5mm; }
  </style></head><body><div class="label" id="label"></div></body></html>`);
  doc.close();

  const labelDiv = doc.getElementById("label")!;

  // Product name
  const nameDiv = doc.createElement("div");
  nameDiv.className = "product-name";
  nameDiv.textContent = productName;
  labelDiv.appendChild(nameDiv);

  // Variant
  if (variantLabel) {
    const varDiv = doc.createElement("div");
    varDiv.className = "variant-text";
    varDiv.textContent = variantLabel;
    labelDiv.appendChild(varDiv);
  }

  // Barcode
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  labelDiv.appendChild(svg);
  try {
    JsBarcode(svg, barcodeValue, { format: "CODE128", width: 1, height: 20, displayValue: false, margin: 0 });
  } catch { svg.remove(); }

  // Serial number text
  const snDiv = doc.createElement("div");
  snDiv.className = "serial-text";
  snDiv.textContent = serial.serial_number;
  labelDiv.appendChild(snDiv);

  // Price (always show)
  const priceDiv = doc.createElement("div");
  priceDiv.className = "price-text";
  priceDiv.textContent = `$${Number(price).toFixed(2)}`;
  labelDiv.appendChild(priceDiv);

  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 2000);
  }, 300);
}

const statusConfig = {
  available: { label: "Available", icon: CheckCircle2, color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  sold: { label: "Sold", icon: XCircle, color: "bg-muted text-muted-foreground border-border" },
  reserved: { label: "Reserved", icon: AlertTriangle, color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  defective: { label: "Defective", icon: Ban, color: "bg-destructive/10 text-destructive border-destructive/20" },
};

export const SerialManagement = () => {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteSerialId, setDeleteSerialId] = useState<number | null>(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-serials", statusFilter, debouncedSearch, page],
    queryFn: () => serialsApi.getAll({
      status: statusFilter !== "all" ? statusFilter : undefined,
      search: debouncedSearch || undefined,
      page,
      limit: 30,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => serialsApi.delete(id),
    onSuccess: () => { toast.success("Serial deleted"); queryClient.invalidateQueries({ queryKey: ["admin-serials"] }); },
    onError: () => toast.error("Failed to delete"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ProductSerial> }) => serialsApi.update(id, data),
    onSuccess: () => { toast.success("Updated"); queryClient.invalidateQueries({ queryKey: ["admin-serials"] }); },
    onError: () => toast.error("Failed to update"),
  });

  const serials = data?.serials || [];
  const pagination = data?.pagination;

  // Summary
  const totalCount = pagination?.total || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Serial Numbers</h3>
          <p className="text-sm text-muted-foreground">Pre-enter serial numbers for products. Scan during sale for quick checkout.</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Add Serials
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search serial number or barcode..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
            <SelectItem value="defective">Defective</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : serials.length === 0 ? (
        <div className="text-center py-16 border border-border rounded-xl bg-card">
          <ScanBarcode className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No serial numbers found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Add serial numbers to products for quick scanning during sales</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                   <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
                   <th className="text-left px-4 py-3 font-medium text-muted-foreground">Serial Number</th>
                   <th className="text-left px-4 py-3 font-medium text-muted-foreground">Barcode</th>
                   <th className="text-right px-4 py-3 font-medium text-muted-foreground">Price</th>
                   <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                   <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {serials.map(serial => {
                  const cfg = statusConfig[serial.status] || statusConfig.available;
                  const Icon = cfg.icon;
                  const variantLabel = serial.variant ? Object.values(serial.variant.combination).join(" / ") : null;
                  return (
                    <tr key={serial.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {serial.product?.icon_url ? (
                            <img src={serial.product.icon_url} alt="" className="w-8 h-8 rounded-lg object-cover border border-border/40" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                              <Package className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-sm">{serial.product?.name || `Product #${serial.product_id}`}</p>
                            {variantLabel && <p className="text-[10px] text-muted-foreground">{variantLabel}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm">{serial.serial_number}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{serial.barcode}</td>
                      <td className="px-4 py-3 text-right text-sm font-medium">
                        {serial.variant?.price_adjustment != null ? `$${Number(serial.variant.price_adjustment).toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`text-[10px] ${cfg.color} hover:${cfg.color}`}>
                          <Icon className="w-3 h-3 mr-1" />
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-1 justify-end">
                          {serial.status === 'available' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => printSerialLabel(serial)}
                              title="Print label"
                            >
                              <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          )}
                          {serial.status === 'available' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => updateMutation.mutate({ id: serial.id, data: { status: 'defective' } })}
                              title="Mark defective"
                            >
                              <Ban className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          )}
                          {serial.status === 'defective' && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => updateMutation.mutate({ id: serial.id, data: { status: 'available' } })}
                              title="Mark available"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => setDeleteSerialId(serial.id)}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
          <p className="text-xs text-muted-foreground">Page {pagination.current_page} of {pagination.total_pages} ({pagination.total} serials)</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="sm" disabled={page >= pagination.total_pages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* Add Serials Dialog */}
      <AddSerialsDialog open={addOpen} onOpenChange={setAddOpen} />

      <AlertDialog open={deleteSerialId !== null} onOpenChange={(open) => { if (!open) setDeleteSerialId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Serial Number</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this serial number? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteSerialId) { deleteMutation.mutate(deleteSerialId); setDeleteSerialId(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// ─── Add Serials Dialog (generic - search for product) ──────────────────────
const AddSerialsDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) => {
  const queryClient = useQueryClient();
  const [productSearch, setProductSearch] = useState("");
  const [products, setProducts] = useState<SaleProduct[]>([]);
  const [productLoading, setProductLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<SaleProduct | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | undefined>();
  const [serialInput, setSerialInput] = useState("");
  const [serialList, setSerialList] = useState<string[]>([]);

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

  const selectProduct = (p: SaleProduct, variantId?: number) => {
    setSelectedProduct(p);
    setSelectedVariantId(variantId || (p.variants.length > 0 ? p.variants[0].id : undefined));
    setProductSearch("");
    setProducts([]);
  };

  return (
    <SerialInputDialog
      open={open}
      onOpenChange={onOpenChange}
      selectedProduct={selectedProduct}
      selectedVariantId={selectedVariantId}
      onChangeProduct={() => setSelectedProduct(null)}
      onSelectVariant={setSelectedVariantId}
      serialInput={serialInput}
      setSerialInput={setSerialInput}
      serialList={serialList}
      setSerialList={setSerialList}
      productSearchSlot={
        !selectedProduct ? (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Product</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search product..."
                value={productSearch}
                onChange={e => handleSearchProducts(e.target.value)}
                className="pl-9"
              />
              {productLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />}
            </div>
            {products.length > 0 && (
              <div className="border border-border rounded-lg max-h-48 overflow-y-auto">
                {products.map(p => (
                  <div key={p.id}>
                    {p.variants.length > 0 ? (
                      p.variants.map(v => (
                        <button key={`${p.id}-${v.id}`} className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-3 transition-colors cursor-pointer" onClick={() => selectProduct(p, v.id)}>
                          {p.icon_url && <img src={p.icon_url} className="w-7 h-7 rounded object-cover" alt="" />}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{Object.values(v.combination).join(" / ")}{v.sku ? ` · ${v.sku}` : ''}</p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <button className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-3 transition-colors cursor-pointer" onClick={() => selectProduct(p)}>
                        {p.icon_url && <img src={p.icon_url} className="w-7 h-7 rounded object-cover" alt="" />}
                        <p className="font-medium truncate">{p.name}</p>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : undefined
      }
    />
  );
};

// ─── Add Serials For Product Dialog (pre-filled product from stock card) ─────
export const AddSerialsForProductDialog = ({ open, onOpenChange, product }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: { id: number; name: string; icon_url?: string; variants: Array<{ id: number; combination: Record<string, string>; sku?: string; stock_quantity?: number }> };
}) => {
  const [selectedVariantId, setSelectedVariantId] = useState<number | undefined>(
    product.variants.length > 0 ? product.variants[0].id : undefined
  );
  const [serialInput, setSerialInput] = useState("");
  const [serialList, setSerialList] = useState<string[]>([]);

  // Reset when product changes
  useEffect(() => {
    if (open) {
      setSelectedVariantId(product.variants.length > 0 ? product.variants[0].id : undefined);
      setSerialInput("");
      setSerialList([]);
    }
  }, [open, product]);

  const fakeProduct: SaleProduct = {
    id: product.id,
    name: product.name,
    icon_url: product.icon_url || null,
    variants: product.variants.map(v => ({
      id: v.id,
      combination: v.combination,
      sku: v.sku || "",
      stock_quantity: v.stock_quantity ?? 0,
      price_adjustment: 0,
      is_active: true,
    })),
  };

  return (
    <SerialInputDialog
      open={open}
      onOpenChange={onOpenChange}
      selectedProduct={fakeProduct}
      selectedVariantId={selectedVariantId}
      onChangeProduct={() => onOpenChange(false)}
      onSelectVariant={setSelectedVariantId}
      serialInput={serialInput}
      setSerialInput={setSerialInput}
      serialList={serialList}
      setSerialList={setSerialList}
    />
  );
};

// ─── Shared Serial Input Dialog ─────────────────────────────────────────────
const SerialInputDialog = ({ open, onOpenChange, selectedProduct, selectedVariantId, onChangeProduct, onSelectVariant, serialInput, setSerialInput, serialList, setSerialList, productSearchSlot }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedProduct: SaleProduct | null;
  selectedVariantId?: number;
  onChangeProduct: () => void;
  onSelectVariant: (id: number | undefined) => void;
  serialInput: string;
  setSerialInput: (v: string) => void;
  serialList: string[];
  setSerialList: (v: string[]) => void;
  productSearchSlot?: React.ReactNode;
}) => {
  const queryClient = useQueryClient();
  const [deleteSerialId, setDeleteSerialId] = useState<number | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  // Fetch existing serials for this product
  const { data: existingData, isLoading: existingLoading } = useQuery({
    queryKey: ["product-serials", selectedProduct?.id, selectedVariantId],
    queryFn: () => serialsApi.getAll({
      product_id: selectedProduct?.id,
      status: undefined,
      search: undefined,
      page: 1,
      limit: 200,
    }),
    enabled: !!selectedProduct && open,
  });

  // Filter existing serials by variant
  const existingSerials = (existingData?.serials || []).filter(
    (s: ProductSerial) => !selectedVariantId || s.variant_id === selectedVariantId
  );
  const existingCount = existingSerials.length;

  // Get stock limit for selected variant
  const selectedVariant = selectedProduct?.variants.find(v => v.id === selectedVariantId);
  const stockLimit = selectedVariant?.stock_quantity ?? Infinity;
  const totalAfterAdd = existingCount + serialList.length;
  const isOverStock = totalAfterAdd >= stockLimit;
  const remainingSlots = stockLimit === Infinity ? Infinity : Math.max(0, stockLimit - existingCount);

  const addSerial = () => {
    const trimmed = serialInput.trim();
    if (!trimmed) return;
    // Check against both existing and pending list
    if (serialList.includes(trimmed)) {
      toast.error("Duplicate serial number - already in list");
      return;
    }
    if (existingSerials.some((s: ProductSerial) => s.serial_number === trimmed)) {
      toast.error("This serial number already exists for this product");
      return;
    }
    if (serialList.length >= remainingSlots) {
      toast.error(`Cannot exceed stock quantity (${stockLimit}). Already ${existingCount} serial(s) registered.`);
      return;
    }
    setSerialList([...serialList, trimmed]);
    setSerialInput("");
  };

  const handlePaste = (text: string) => {
    const lines = text.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    const existingSNs = new Set(existingSerials.map((s: ProductSerial) => s.serial_number));
    const unique = [...new Set(lines)].filter(s => !serialList.includes(s) && !existingSNs.has(s));
    const slotsLeft = remainingSlots - serialList.length;
    if (slotsLeft <= 0) {
      toast.error(`Cannot exceed stock quantity (${stockLimit})`);
      return;
    }
    const toAdd = unique.slice(0, slotsLeft);
    const skipped = unique.length - toAdd.length;
    if (toAdd.length > 0) {
      setSerialList([...serialList, ...toAdd]);
    }
    if (skipped > 0) {
      toast.warning(`${skipped} serial(s) skipped - would exceed stock limit or duplicates`);
    }
  };

  const saveMutation = useMutation({
    mutationFn: () => serialsApi.add({
      product_id: selectedProduct!.id,
      variant_id: selectedVariantId,
      serials: serialList.map(sn => ({ serial_number: sn })),
    }),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ["admin-serials"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stock"] });
      queryClient.invalidateQueries({ queryKey: ["product-serials", selectedProduct?.id, selectedVariantId] });
      setSerialList([]);
      // Don't close dialog - let user add more
    },
    onError: () => toast.error("Failed to add serials"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => serialsApi.delete(id),
    onSuccess: () => {
      toast.success("Serial deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-serials"] });
      queryClient.invalidateQueries({ queryKey: ["product-serials", selectedProduct?.id, selectedVariantId] });
    },
    onError: () => toast.error("Failed to delete"),
  });

    const progressPercent = stockLimit !== Infinity ? Math.min(100, (existingCount / stockLimit) * 100) : 0;
    const progressColor = existingCount >= stockLimit ? 'bg-destructive' : existingCount > stockLimit * 0.7 ? 'bg-amber-500' : 'bg-emerald-500';

    return (
    <>
    <AdminDialog open={open} onOpenChange={onOpenChange} title="" size="lg" className="p-0 gap-0 overflow-hidden">
      {/* ── Beautiful header ── */}
      <div className="relative px-5 pt-5 pb-4 bg-gradient-to-br from-primary/[0.06] via-transparent to-accent/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="relative">
          {productSearchSlot && !selectedProduct && (
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ScanBarcode className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-semibold">Add Serial Numbers</h3>
                  <p className="text-xs text-muted-foreground">Search and select a product to begin</p>
                </div>
              </div>
              <div className="mt-3">{productSearchSlot}</div>
            </div>
          )}

          {selectedProduct && (
            <div className="flex items-start gap-3.5">
              {selectedProduct.icon_url ? (
                <img src={selectedProduct.icon_url} className="w-12 h-12 rounded-xl object-cover border border-border/40 shadow-sm ring-2 ring-background" alt="" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center ring-2 ring-background shadow-sm">
                  <Package className="w-5.5 h-5.5 text-primary" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-base font-semibold truncate">{selectedProduct.name}</h3>
                  <Button size="sm" variant="ghost" onClick={onChangeProduct} className="rounded-lg h-7 text-[11px] text-muted-foreground hover:text-foreground shrink-0">
                    <Pencil className="w-3 h-3 mr-1" />Change
                  </Button>
                </div>
                {selectedVariantId && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {Object.values(selectedProduct.variants.find(v => v.id === selectedVariantId)?.combination || {}).join(" · ")}
                  </p>
                )}
                {stockLimit !== Infinity && (
                  <div className="flex items-center gap-2.5 mt-2">
                    <div className="flex-1 h-1.5 rounded-full bg-border/40 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-500 ${progressColor}`} style={{ width: `${progressPercent}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono tabular-nums">{existingCount}/{stockLimit}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedProduct && (
        <div className="px-5 pb-5 space-y-4">
          {/* ── Variant chips ── */}
          {selectedProduct.variants.length > 1 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedProduct.variants.map(v => {
                const isActive = v.id === selectedVariantId;
                return (
                  <button
                    key={v.id}
                    onClick={() => onSelectVariant(v.id)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all duration-200 cursor-pointer ${
                      isActive
                        ? 'border-primary/40 bg-primary/10 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.15)]'
                        : 'border-border/60 bg-card text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border'
                    }`}
                  >
                    {Object.values(v.combination).join(" / ")}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Scan / Input area ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">Scan or Type</span>
              {stockLimit !== Infinity && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  (remainingSlots - serialList.length) <= 0
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                }`}>
                  {Math.max(0, remainingSlots - serialList.length)} remaining
                </span>
              )}
            </div>
            <div className="flex gap-1.5">
              <div className="relative flex-1">
                <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40" />
                <Input
                  placeholder="Serial number..."
                  value={serialInput}
                  onChange={e => setSerialInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSerial(); } }}
                  onPaste={e => {
                    const text = e.clipboardData.getData("text");
                    if (text.includes("\n") || text.includes(",")) {
                      e.preventDefault();
                      handlePaste(text);
                    }
                  }}
                  className="pl-9 h-9 rounded-lg bg-muted/40 border-border/50 focus:bg-card"
                  disabled={serialList.length >= remainingSlots}
                />
              </div>
              <Button size="icon" onClick={addSerial} disabled={!serialInput.trim() || serialList.length >= remainingSlots} className="h-9 w-9 rounded-lg">
                <Plus className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={() => setCameraOpen(true)}
                disabled={serialList.length >= remainingSlots}
                className="h-9 w-9 rounded-lg"
              >
                <Camera className="w-4 h-4" />
              </Button>
            </div>
            {serialList.length >= remainingSlots && remainingSlots !== Infinity && (
              <p className="text-[10px] text-destructive font-medium flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Stock limit reached
              </p>
            )}
          </div>

          {/* ── Pending serials ── */}
          {serialList.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  Pending <span className="text-primary font-bold">{serialList.length}</span>
                </span>
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={serialList.length === 0 || saveMutation.isPending}
                  className="h-7 rounded-lg text-[11px] gap-1.5 px-3"
                >
                  {saveMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Save All
                </Button>
              </div>
              <div className="rounded-xl border border-primary/15 bg-primary/[0.02] overflow-hidden divide-y divide-primary/10">
                {serialList.map((sn, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-1.5 group hover:bg-primary/[0.04] transition-colors">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[9px] font-bold text-primary/60 w-4 text-center tabular-nums">{idx + 1}</span>
                      <span className="text-[13px] font-mono tracking-wide truncate">{sn}</span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => setSerialList(serialList.filter((_, i) => i !== idx))}
                    >
                      <XCircle className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Registered serials ── */}
          {existingLoading ? (
            <div className="space-y-2 pt-1">
              {[1,2,3].map(i => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
            </div>
          ) : existingSerials.length > 0 && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                Registered <span className="text-foreground/80 font-bold">{existingCount}</span>
              </span>
              <div className="rounded-xl border border-border/60 overflow-hidden max-h-52 overflow-y-auto scrollbar-macos divide-y divide-border/40">
                {existingSerials.map((serial: ProductSerial) => {
                  const cfg = statusConfig[serial.status] || statusConfig.available;
                  return (
                    <div key={serial.id} className="flex items-center justify-between px-3 py-1.5 group hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          serial.status === 'available' ? 'bg-emerald-500' :
                          serial.status === 'sold' ? 'bg-muted-foreground/30' :
                          serial.status === 'reserved' ? 'bg-amber-500' : 'bg-destructive'
                        }`} />
                        <span className="text-[13px] font-mono tracking-wide truncate">{serial.serial_number}</span>
                        <span className={`text-[9px] px-1.5 py-0 rounded-full font-medium ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        {serial.status === 'available' && (
                          <>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                              onClick={() => setDeleteSerialId(serial.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => printSerialLabel({
                                ...serial,
                                product: selectedProduct ? { name: selectedProduct.name, icon_url: selectedProduct.icon_url || undefined } : serial.product,
                                variant: selectedVariantId ? {
                                  ...selectedProduct?.variants.find(v => v.id === selectedVariantId),
                                  combination: selectedProduct?.variants.find(v => v.id === selectedVariantId)?.combination || {},
                                } as any : serial.variant,
                              })}
                              title="Print label"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </AdminDialog>

    <AlertDialog open={deleteSerialId !== null} onOpenChange={(open) => { if (!open) setDeleteSerialId(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Serial Number</AlertDialogTitle>
          <AlertDialogDescription>Are you sure you want to delete this serial number? This action cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteSerialId) { deleteMutation.mutate(deleteSerialId); setDeleteSerialId(null); } }}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <CameraOCRDialog
      open={cameraOpen}
      onOpenChange={setCameraOpen}
      onSerialDetected={(serial) => {
        if (existingSerials.some((s: ProductSerial) => s.serial_number === serial) || serialList.includes(serial)) {
          toast.error("This serial number already exists");
          return;
        }
        if (serialList.length >= remainingSlots) {
          toast.error("Stock limit reached");
          return;
        }
        setSerialList([...serialList, serial]);
        toast.success(`Serial "${serial}" added`);
      }}
    />
    </>
  );
};
