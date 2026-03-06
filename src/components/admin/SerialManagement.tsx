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
  ScanBarcode, Pencil, AlertTriangle, CheckCircle2, XCircle, Ban, Camera,
} from "lucide-react";
import { CameraOCRDialog } from "./CameraOCRDialog";

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

  return (
    <>
    <AdminDialog open={open} onOpenChange={onOpenChange} title="Serial Numbers" size="lg">
      <div className="space-y-4">
        {productSearchSlot}

        {selectedProduct && (
          <>
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg border border-border">
              {selectedProduct.icon_url && <img src={selectedProduct.icon_url} className="w-10 h-10 rounded-lg object-cover" alt="" />}
              <div className="flex-1">
                <p className="font-medium text-sm">{selectedProduct.name}</p>
                {selectedVariantId && (
                  <p className="text-xs text-muted-foreground">
                    {Object.values(selectedProduct.variants.find(v => v.id === selectedVariantId)?.combination || {}).join(" / ")}
                  </p>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={onChangeProduct}>Change</Button>
            </div>

            {/* Variant selector if multiple */}
            {selectedProduct.variants.length > 1 && (
              <div className="space-y-1">
                <Label className="text-sm font-medium">Variant</Label>
                <Select value={String(selectedVariantId || "")} onValueChange={v => onSelectVariant(Number(v))}>
                  <SelectTrigger><SelectValue placeholder="Select variant" /></SelectTrigger>
                  <SelectContent>
                    {selectedProduct.variants.map(v => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {Object.values(v.combination).join(" / ")}{v.sku ? ` · ${v.sku}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Existing Serials */}
            {existingLoading ? (
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : existingSerials.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">
                    Existing Serials
                    <span className="ml-1.5 text-muted-foreground font-normal">({existingCount})</span>
                  </Label>
                  {stockLimit !== Infinity && (
                    <span className="text-xs text-muted-foreground">{existingCount} / {stockLimit} used</span>
                  )}
                </div>
                <div className="border border-border rounded-lg max-h-36 overflow-y-auto bg-muted/20">
                  {existingSerials.map((serial: ProductSerial) => {
                    const cfg = statusConfig[serial.status] || statusConfig.available;
                    const Icon = cfg.icon;
                    return (
                      <div key={serial.id} className="flex items-center justify-between px-3 py-1.5 border-b border-border/30 last:border-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm font-mono truncate">{serial.serial_number}</span>
                          <Badge className={`text-[9px] px-1.5 py-0 ${cfg.color} hover:${cfg.color}`}>
                            <Icon className="w-2.5 h-2.5 mr-0.5" />
                            {cfg.label}
                          </Badge>
                        </div>
                        {serial.status === 'available' && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive flex-shrink-0"
                            onClick={() => setDeleteSerialId(serial.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Add new serials */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Add New Serials</Label>
                {stockLimit !== Infinity && (
                  <span className={`text-xs font-medium ${isOverStock ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {remainingSlots - serialList.length} slot(s) remaining
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Type or scan serial number..."
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
                  className="flex-1"
                  disabled={serialList.length >= remainingSlots}
                />
                <Button onClick={addSerial} disabled={!serialInput.trim() || serialList.length >= remainingSlots}>
                  <Plus className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCameraOpen(true)}
                  disabled={serialList.length >= remainingSlots}
                  title="Scan serial with camera"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">Press Enter to add. Paste multiple (comma/newline separated). Or use camera to OCR.</p>
              {serialList.length >= remainingSlots && remainingSlots !== Infinity && (
                <p className="text-[11px] text-destructive font-medium">Stock limit reached. Cannot add more serial numbers.</p>
              )}
            </div>

            {serialList.length > 0 && (
              <div className="border border-border rounded-lg max-h-48 overflow-y-auto">
                {serialList.map((sn, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 last:border-0">
                    <span className="text-sm font-mono">{sn}</span>
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setSerialList(serialList.filter((_, i) => i !== idx))}>
                      <Trash2 className="w-3 h-3 text-muted-foreground" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <span className="text-sm text-muted-foreground">{serialList.length} new serial(s) to add</span>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={serialList.length === 0 || saveMutation.isPending}
                className="gap-2"
              >
                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Save {serialList.length} Serial{serialList.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </>
        )}
      </div>
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
