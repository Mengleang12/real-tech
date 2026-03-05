import { useState, useEffect, useRef } from "react";
import { SEOHead } from "@/components/SEOHead";
import { useNavigate } from "react-router-dom";
import { 
  Plus, Minus, Edit, Trash2, LogOut, Package, Search, X, Save, ArrowLeft, 
  ChevronLeft, ChevronRight, Users, BarChart3, Bell, Shield, Activity, 
  UserX, Tag, Play, Home, Menu, Download, Star, TrendingUp, Settings2, Loader2, ClipboardPaste, ShieldAlert, DollarSign,
  FolderTree, Bookmark, SlidersHorizontal, Boxes, AlertTriangle, PackageCheck, RefreshCw, FileText, Pencil,
  ShoppingBag, Truck, Wand2, Image
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AdminDialog } from "@/components/admin/AdminDialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";

import { toast } from "sonner";
import { appsApi, authApi, categoriesApi, brandsApi, productAttributesApi, type App, type Category, type Brand, type ProductAttribute } from "@/lib/api";
import { FileUpload, ScreenshotUpload } from "@/components/FileUpload";
import { RichTextEditor } from "@/components/RichTextEditor";
import { UserManagement } from "@/components/admin/UserManagement";
import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { ProductReviewSystem } from "@/components/admin/ProductReviewSystem";
import { NotificationSystem } from "@/components/admin/NotificationSystem";
import { RoleManagement } from "@/components/admin/RoleManagement";
import { ActivityLogs } from "@/components/admin/ActivityLogs";
import { UserStatusManagement } from "@/components/admin/UserStatusManagement";
import { CouponManagement } from "@/components/admin/CouponManagement";
import { PaymentHistoryAdmin } from "@/components/admin/PaymentHistoryAdmin";
import { CategoryManagement } from "@/components/admin/CategoryManagement";
import { BrandManagement } from "@/components/admin/BrandManagement";
import { AttributeManagement } from "@/components/admin/AttributeManagement";
import { cn } from "@/lib/utils";
import { SystemSettingsPanel } from "@/components/admin/SystemSettings";
import { SalesInvoices, InvoicesTab, StockManagement, SalesOverview } from "@/components/admin/SalesInvoices";
import { PurchaseManagement } from "@/components/admin/PurchaseManagement";
import { SupplierManagement } from "@/components/admin/SupplierManagement";
import { SliderManagement } from "@/components/admin/SliderManagement";
import { AddSaleDialog } from "@/components/admin/AddSaleDialog";
import { PrintLabelDialog, PrintLabelsPage } from "@/components/admin/PrintLabelDialog";
import { SalesReport } from "@/components/admin/SalesReport";
import { useAuth } from "@/contexts/AuthContext";


// ─── Types ────────────────────────────────────────────────────────────────────
type ProductFormData = Omit<Partial<App>, 'screenshots' | 'videos' | 'attribute_values' | 'variants'> & {
  screenshots?: string[];
  videos?: { title: string; youtube_url: string }[];
  attribute_values?: { attribute_id: number; value: string }[];
  variants?: { combination: Record<string, string>; sku?: string; stock_quantity: number; price_adjustment: number; is_active: boolean }[];
};

interface ProductFormProps {
  app?: App;
  onSave: (data: ProductFormData) => Promise<void>;
  onCancel: () => void;
}

// ─── Product Form ─────────────────────────────────────────────────────────────────
const ProductForm = ({ app, onSave, onCancel }: ProductFormProps) => {
  const [formData, setFormData] = useState<Partial<App>>({
    name: app?.name || "", name_km: app?.name_km || "",
    description: app?.description || "", description_km: app?.description_km || "",
    category: app?.category || "programs", category_id: app?.category_id || undefined,
    icon_url: app?.icon_url || "",
    brand_id: app?.brand_id || undefined,
    is_featured: app?.is_featured || false, is_popular: app?.is_popular || false,
  });
  const [screenshots, setScreenshots] = useState<string[]>(app?.screenshots?.map(s => s.image_url) || []);
  const [videos, setVideos] = useState<{ title: string; youtube_url: string }[]>(
    app?.videos?.map(v => ({ title: v.title, youtube_url: v.youtube_url })) || []
  );
  const [saving, setSaving] = useState(false);
  const [fetchingTitle, setFetchingTitle] = useState<number | null>(null);

  // Dynamic data
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [attrValues, setAttrValues] = useState<Record<number, string[]>>({});
  const [selectedAttrs, setSelectedAttrs] = useState<Set<number>>(new Set());
  const [attrSearch, setAttrSearch] = useState("");
  const [attrDropdownOpen, setAttrDropdownOpen] = useState(false);
  const [variants, setVariants] = useState<{ combination: Record<string, string>; sku: string; stock_quantity: number; price_adjustment: number; purchase_price: number; is_active: boolean }[]>(
    app?.variants?.map(v => ({ combination: v.combination, sku: v.sku || '', stock_quantity: v.stock_quantity, price_adjustment: v.price_adjustment, purchase_price: v.purchase_price || 0, is_active: v.is_active })) || []
  );
  const isInitialVariantLoad = useRef(!!app?.variants?.length);

  useEffect(() => {
    categoriesApi.getAll().then(r => setCategories(r.categories)).catch(() => {});
    brandsApi.getAll().then(r => setBrands(r.brands)).catch(() => {});
    productAttributesApi.getAll().then(r => {
      setAttributes(r.attributes.filter(a => a.is_active));
      if (app?.attribute_values) {
        const vals: Record<number, string[]> = {};
        const selected = new Set<number>();
        app.attribute_values.forEach(av => {
          // Support comma-separated multi-values or single values
          vals[av.attribute_id] = av.value.includes(',') ? av.value.split(',').map(v => v.trim()) : [av.value];
          selected.add(av.attribute_id);
        });
        setAttrValues(vals);
        setSelectedAttrs(selected);
      }
    }).catch(() => {});
  }, []);

  // Auto-generate variants when attribute values change
  useEffect(() => {
    // Skip first run when editing to preserve existing variant data
    if (isInitialVariantLoad.current) {
      isInitialVariantLoad.current = false;
      return;
    }
    const attrEntries = Array.from(selectedAttrs)
      .map(id => ({ id, values: attrValues[id] || [] }))
      .filter(e => e.values.length > 0);
    if (attrEntries.length === 0) {
      setVariants([]);
      return;
    }
    let combos: Record<string, string>[] = [{}];
    for (const { id, values } of attrEntries) {
      const newCombos: Record<string, string>[] = [];
      for (const combo of combos) {
        for (const val of values) {
          newCombos.push({ ...combo, [id.toString()]: val });
        }
      }
      combos = newCombos;
    }
    const newVariants = combos.map(combo => {
      const existing = variants.find(v => JSON.stringify(v.combination) === JSON.stringify(combo));
      return {
        combination: combo,
        sku: existing?.sku || '',
        stock_quantity: existing?.stock_quantity ?? 0,
        price_adjustment: existing?.price_adjustment ?? 0,
        purchase_price: existing?.purchase_price ?? 0,
        is_active: existing?.is_active ?? true,
      };
    });
    setVariants(newVariants);
  }, [attrValues, selectedAttrs]);

  const fetchYouTubeTitle = async (url: string, index: number) => {
    try {
      setFetchingTitle(index);
      const res = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`);
      if (res.ok) {
        const data = await res.json();
        setVideos(prev => { const u = [...prev]; u[index] = { ...u[index], title: data.title }; return u; });
      } else {
        toast.error("Could not fetch video title");
      }
    } catch { toast.error("Could not fetch video title"); }
    finally { setFetchingTitle(null); }
  };

  const handlePasteYouTubeUrl = async (index: number) => {
    try {
      const text = await navigator.clipboard.readText();
      if (text && (text.includes("youtube.com") || text.includes("youtu.be"))) {
        setVideos(prev => { const u = [...prev]; u[index] = { ...u[index], youtube_url: text }; return u; });
        await fetchYouTubeTitle(text, index);
      } else {
        toast.error("Clipboard doesn't contain a YouTube URL");
      }
    } catch { toast.error("Cannot access clipboard"); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (variants.length === 0) {
        toast.error("At least one variant is required");
        setSaving(false);
        return;
      }
      const attribute_values = Object.entries(attrValues)
        .filter(([id, v]) => v.length > 0 && selectedAttrs.has(parseInt(id)))
        .map(([id, values]) => ({ attribute_id: parseInt(id), value: values.join(',') }));
      await onSave({ ...formData, screenshots, videos, attribute_values, variants });
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Product Name (English) *</Label>
          <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="mt-1.5" />
        </div>
        <div>
          <Label htmlFor="name_km">ឈ្មោះផលិតផល (ខ្មែរ)</Label>
          <Input id="name_km" value={formData.name_km} onChange={(e) => setFormData({ ...formData, name_km: e.target.value })} className="mt-1.5" />
        </div>
      </div>
      <div>
        <Label htmlFor="description">Description (English)</Label>
        <RichTextEditor value={formData.description || ''} onChange={(html) => setFormData({ ...formData, description: html })} minHeight="150px" className="mt-1.5" />
      </div>
      <div>
        <Label htmlFor="description_km">ការពិពណ៌នា (ខ្មែរ)</Label>
        <RichTextEditor value={formData.description_km || ''} onChange={(html) => setFormData({ ...formData, description_km: html })} minHeight="150px" className="mt-1.5" />
      </div>

      {/* Category, Brand, Price */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label>Category</Label>
          <Select value={formData.category_id?.toString() || ""} onValueChange={v => {
            const cat = categories.find(c => c.id === parseInt(v));
            setFormData({ ...formData, category_id: parseInt(v), category: cat ? "programs" : formData.category });
          }}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select category" /></SelectTrigger>
            <SelectContent>
              {categories.filter(c => c.is_active).map(c => (
                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Brand</Label>
          <Select value={formData.brand_id?.toString() || ""} onValueChange={v => setFormData({ ...formData, brand_id: parseInt(v) })}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select brand" /></SelectTrigger>
            <SelectContent>
              {brands.filter(b => b.is_active).map(b => (
                <SelectItem key={b.id} value={b.id.toString()}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>


      {/* Product Stock */}
      {attributes.length > 0 && (
        <div className="border border-border rounded-lg p-4 bg-muted/30 space-y-4">
          <Label className="text-base font-medium">Product Stock</Label>

          {/* Attributes row - selected as tags */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                    <div className="w-full sm:w-40 shrink-0 bg-muted/50 rounded-md px-3 py-2">
                      <span className="text-sm font-medium">Attributes</span>
                    </div>
                    <div className="flex-1 w-full border border-border rounded-md px-3 py-2 flex flex-wrap items-center gap-2 min-h-[40px]">
              {Array.from(selectedAttrs).map(id => {
                const attr = attributes.find(a => a.id === id);
                if (!attr) return null;
                return (
                  <span key={id} className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-medium px-2.5 py-1 rounded-md">
                    <button type="button" onClick={() => {
                      const next = new Set(selectedAttrs);
                      next.delete(id);
                      setSelectedAttrs(next);
                      setAttrValues(prev => { const n = { ...prev }; delete n[id]; return n; });
                    }} className="hover:opacity-80">
                      <X className="w-3 h-3" />
                    </button>
                    {attr.name}
                  </span>
                );
              })}
              {/* Add attribute dropdown */}
              <div className="relative">
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground px-1"
                  onClick={() => setAttrDropdownOpen(!attrDropdownOpen)}
                >
                  <Plus className="w-4 h-4" />
                </button>
                {attrDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setAttrDropdownOpen(false)} />
                    <div className="absolute z-50 mt-1 left-0 w-48 rounded-lg border border-border bg-popover shadow-lg max-h-48 overflow-y-auto">
                      <div className="p-1.5">
                        <Input
                          placeholder="Search..."
                          value={attrSearch}
                          onChange={e => setAttrSearch(e.target.value)}
                          className="h-7 text-xs"
                          autoFocus
                        />
                      </div>
                      {attributes
                        .filter(a => !selectedAttrs.has(a.id))
                        .filter(a => a.name.toLowerCase().includes(attrSearch.toLowerCase()))
                        .map(attr => (
                          <button
                            key={attr.id}
                            type="button"
                            className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent transition-colors"
                            onClick={() => {
                              const next = new Set(selectedAttrs);
                              next.add(attr.id);
                              setSelectedAttrs(next);
                              setAttrValues(prev => ({ ...prev, [attr.id]: [] }));
                              setAttrSearch("");
                              setAttrDropdownOpen(false);
                            }}
                          >
                            {attr.name}
                          </button>
                        ))}
                      {attributes.filter(a => !selectedAttrs.has(a.id)).filter(a => a.name.toLowerCase().includes(attrSearch.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">No attributes found</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Choose the attributes - multi-value per attribute */}
          {selectedAttrs.size > 0 && (
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">Choose the attributes</span>
              {Array.from(selectedAttrs).map(id => {
                const attr = attributes.find(a => a.id === id);
                if (!attr) return null;
                const selectedValues = attrValues[id] || [];
                const selectedLower = selectedValues.map(v => v.toLowerCase());
                const availableOptions = attr.options || [];
                return (
                  <div key={id} className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
                    <div className="w-full sm:w-40 shrink-0 bg-muted/50 rounded-md px-3 py-2">
                      <span className="text-sm font-medium text-primary">{attr.name}</span>
                    </div>
                    <div className="flex-1 w-full border border-border rounded-md px-3 py-2 flex flex-wrap items-center gap-2 min-h-[40px]">
                      {selectedValues.map(val => (
                        <span key={val} className="inline-flex items-center gap-1 bg-primary text-primary-foreground text-xs font-medium px-2.5 py-1 rounded-md">
                          <button type="button" onClick={() => {
                            setAttrValues(prev => ({ ...prev, [id]: prev[id].filter(v => v !== val) }));
                          }} className="hover:opacity-80">
                            <X className="w-3 h-3" />
                          </button>
                          {val}
                        </span>
                      ))}
                      {/* Add value: dropdown if options exist, or text input */}
                      {availableOptions.length > 0 ? (
                        <Select
                          value=""
                          onValueChange={v => {
                            if (!selectedLower.includes(v.toLowerCase())) {
                              setAttrValues(prev => ({ ...prev, [id]: [...(prev[id] || []), v] }));
                            }
                          }}
                        >
                          <SelectTrigger className="h-7 w-32 text-xs border-dashed">
                            <SelectValue placeholder="+ Add" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableOptions.filter(o => !selectedLower.includes(o.toLowerCase())).map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : attr.type === 'boolean' ? (
                        <Select
                          value=""
                          onValueChange={v => {
                            if (!selectedLower.includes(v.toLowerCase())) {
                              setAttrValues(prev => ({ ...prev, [id]: [...(prev[id] || []), v] }));
                            }
                          }}
                        >
                          <SelectTrigger className="h-7 w-32 text-xs border-dashed">
                            <SelectValue placeholder="+ Add" />
                          </SelectTrigger>
                          <SelectContent>
                            {['yes', 'no'].filter(o => !selectedLower.includes(o.toLowerCase())).map(opt => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <form className="inline-flex" onSubmit={e => {
                          e.preventDefault();
                          const input = (e.target as HTMLFormElement).elements.namedItem('newval') as HTMLInputElement;
                          const val = input.value.trim();
                          if (val && !selectedLower.includes(val.toLowerCase())) {
                            setAttrValues(prev => ({ ...prev, [id]: [...(prev[id] || []), val] }));
                            input.value = '';
                          }
                        }}>
                          <Input name="newval" placeholder="Type & Enter" className="h-7 w-32 text-xs border-dashed" />
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Variant table - auto-generated */}
          {variants.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{variants.length} variants</span>
                <Button type="button" variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => setVariants([])}>Clear All</Button>
              </div>
              <div className="border border-border rounded-lg overflow-x-auto">
               <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50">
                      <th className="text-left px-3 sm:px-4 py-2.5 font-medium text-muted-foreground text-xs">Variant</th>
                      <th className="text-left px-3 sm:px-4 py-2.5 font-medium text-muted-foreground text-xs">SKU</th>
                      <th className="text-left px-3 sm:px-4 py-2.5 font-medium text-muted-foreground text-xs">Variant Price</th>
                      <th className="text-left px-3 sm:px-4 py-2.5 font-medium text-muted-foreground text-xs">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {variants.map((variant, idx) => {
                      const variantName = Object.values(variant.combination).join('-');
                      return (
                        <tr key={idx} className="hover:bg-muted/20">
                          <td className="px-3 sm:px-4 py-2.5 text-sm font-medium">{variantName}</td>
                          <td className="px-3 sm:px-4 py-2.5">
                            <div className="flex items-center gap-1">
                              <Input
                                type="text"
                                value={variant.sku}
                                onChange={e => {
                                  const next = [...variants];
                                  next[idx] = { ...next[idx], sku: e.target.value };
                                  setVariants(next);
                                }}
                                placeholder="SKU"
                                className="h-8 w-24 sm:w-32 text-sm"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 shrink-0"
                                title="Auto-generate SKU"
                                onClick={() => {
                                   const suffix = Object.values(variant.combination)
                                    .map(v => v.toString().substring(0, 3).toUpperCase())
                                    .join('-');
                                   const generated = suffix;
                                  const next = [...variants];
                                  next[idx] = { ...next[idx], sku: generated };
                                  setVariants(next);
                                }}
                              >
                                <Wand2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </td>
                          <td className="px-3 sm:px-4 py-2.5">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={variant.price_adjustment}
                              onChange={e => {
                                const next = [...variants];
                                next[idx] = { ...next[idx], price_adjustment: parseFloat(e.target.value) || 0 };
                                setVariants(next);
                              }}
                              className="h-8 w-20 sm:w-32 text-sm"
                            />
                          </td>
                          <td className="px-3 sm:px-4 py-2.5">
                            <Input
                              type="number"
                              min="0"
                              value={variant.stock_quantity}
                              onChange={e => {
                                const next = [...variants];
                                next[idx] = { ...next[idx], stock_quantity: parseInt(e.target.value) || 0 };
                                setVariants(next);
                              }}
                              className="h-8 w-20 sm:w-32 text-sm"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}


      <div className="border border-border rounded-lg p-4 bg-muted/30 space-y-3">
        <Label className="text-base font-medium">Product Card Image</Label>
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="shrink-0">
            <input id="product-card-image-input" type="file" accept="image/*" className="hidden" onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const token = localStorage.getItem('admin_api_key') || localStorage.getItem('auth_token') || '';
              const formDataUpload = new FormData();
              formDataUpload.append('file', file);
              formDataUpload.append('type', 'icons');
              try {
                const res = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com'}/api/upload`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }, body: formDataUpload });
                if (!res.ok) throw new Error('Upload failed');
                const data = await res.json();
                setFormData({ ...formData, icon_url: data.url });
              } catch { toast.error('Upload failed'); }
              e.target.value = '';
            }} />
            {formData.icon_url ? (
              <div className="relative group w-20 h-20 rounded-xl border border-border overflow-hidden bg-background shadow-sm cursor-pointer" onClick={() => document.getElementById('product-card-image-input')?.click()}>
                <img src={formData.icon_url} alt="Product" className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                  <Pencil className="w-5 h-5 text-white drop-shadow-md" />
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border bg-background flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors" onClick={() => document.getElementById('product-card-image-input')?.click()}>
                <Plus className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="flex-1 w-full space-y-1.5">
            <Input
              type="text"
              value={formData.icon_url}
              onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
              placeholder="https://example.com/product-image.png"
              className="text-sm"
            />
            <p className="text-xs text-muted-foreground">Upload or paste a URL for the main product image</p>
          </div>
        </div>
      </div>
      <ScreenshotUpload screenshots={screenshots} onUpdate={setScreenshots} />
      <div className="space-y-3 border border-border rounded-lg p-4 bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Play className="w-4 h-4 text-destructive" />
            <Label className="text-base font-medium">YouTube Videos</Label>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setVideos([...videos, { title: '', youtube_url: '' }])} className="gap-1">
            <Plus className="w-3 h-3" /> Add Video
          </Button>
        </div>
        {videos.length === 0 && <p className="text-sm text-muted-foreground text-center py-3">No videos added.</p>}
        {videos.map((video, index) => {
          const getYouTubeId = (url: string) => {
            const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{11})/);
            return match ? match[1] : null;
          };
          const videoId = getYouTubeId(video.youtube_url);
          return (
            <div key={index} className="p-4 bg-background rounded-lg border border-border/50 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Video {index + 1}</span>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setVideos(videos.filter((_, i) => i !== index))}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              {videoId && (
                <div className="w-full aspect-video rounded-md overflow-hidden border border-border">
                  <iframe
                    src={`https://www.youtube.com/embed/${videoId}`}
                    title={video.title || "YouTube video"}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Input value={video.title} onChange={(e) => { const u=[...videos]; u[index]={...u[index],title:e.target.value}; setVideos(u); }} placeholder="Video title (auto-filled on paste)" className="text-sm" />
                  {fetchingTitle === index && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground shrink-0" />}
                </div>
                <div className="flex items-center gap-2">
                  <Input type="url" value={video.youtube_url} onChange={(e) => {
                    const u=[...videos]; u[index]={...u[index],youtube_url:e.target.value}; setVideos(u);
                  }} onPaste={(e) => {
                    const text = e.clipboardData.getData('text');
                    if (text && (text.includes("youtube.com") || text.includes("youtu.be"))) {
                      setTimeout(() => fetchYouTubeTitle(text, index), 100);
                    }
                  }} placeholder="https://youtube.com/watch?v=..." className="text-sm" />
                  <Button type="button" variant="outline" size="icon" className="shrink-0 h-9 w-9" onClick={() => handlePasteYouTubeUrl(index)} title="Paste from clipboard">
                    <ClipboardPaste className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <Switch id="is_featured" checked={formData.is_featured} onCheckedChange={(c) => setFormData({ ...formData, is_featured: c })} />
          <Label htmlFor="is_featured">Featured Product</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch id="is_popular" checked={formData.is_popular} onCheckedChange={(c) => setFormData({ ...formData, is_popular: c })} />
          <Label htmlFor="is_popular">Popular Product</Label>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? "Saving..." : "Save Product"}
        </Button>
      </div>
    </form>
  );
};

// ─── Sidebar Nav ──────────────────────────────────────────────────────────────
type AdminTab = "analytics" | "apps" | "categories" | "brands" | "attributes" | "print_labels" | "sliders" | "users" | "payments" | "sales" | "stock" | "invoices" | "purchases" | "suppliers" | "reports" | "roles" | "notifications" | "activity" | "status" | "coupons" | "reviews" | "settings" | "warranties";

interface NavItem {
  id: AdminTab;
  label: string;
  icon: React.ElementType;
  badge?: number;
  permission?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { id: "analytics", label: "Dashboard", icon: BarChart3, permission: "analytics.view" },
    ],
  },
  {
    label: "Sales",
    items: [
      { id: "invoices", label: "Sale", icon: FileText, permission: "orders.view" },
      { id: "purchases", label: "Purchase", icon: ShoppingBag, permission: "orders.view" },
      { id: "suppliers", label: "Suppliers", icon: Truck, permission: "orders.view" },
      
      { id: "stock", label: "Stock", icon: Boxes, permission: "orders.view" },
      { id: "warranties", label: "Warranty", icon: Shield, permission: "orders.view" },
      { id: "reports", label: "Reports", icon: TrendingUp, permission: "orders.view" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { id: "apps", label: "Products", icon: Package, permission: "apps.view" },
      { id: "categories", label: "Categories", icon: FolderTree, permission: "apps.view" },
      { id: "brands", label: "Brands", icon: Bookmark, permission: "apps.view" },
      { id: "attributes", label: "Attributes", icon: SlidersHorizontal, permission: "apps.view" },
      { id: "print_labels", label: "Print Labels", icon: Tag, permission: "apps.view" },
      { id: "sliders", label: "Sliders", icon: Image, permission: "settings.manage" },
    ],
  },
  {
    label: "Orders & Customers",
    items: [
      { id: "payments", label: "Payments", icon: TrendingUp, permission: "orders.view" },
      { id: "users", label: "Customers", icon: Users, permission: "users.view" },
      { id: "coupons", label: "Coupons", icon: Tag, permission: "coupons.manage" },
      { id: "reviews", label: "Reviews", icon: Star, permission: "reviews.manage" },
    ],
  },
  {
    label: "System",
    items: [
      { id: "roles", label: "Roles", icon: Shield, permission: "roles.manage" },
      { id: "notifications", label: "Notifications", icon: Bell, permission: "notifications.manage" },
      { id: "activity", label: "Activity", icon: Activity, permission: "activity.view" },
      { id: "status", label: "Ban / Suspend", icon: UserX, permission: "user_status.manage" },
      { id: "settings", label: "Settings", icon: Settings2, permission: "settings.manage" },
    ],
  },
];

// Flat list for permission checking
const allNavItems = navGroups.flatMap(g => g.items);

// ─── Apps Tab ─────────────────────────────────────────────────────────────────
const AppsTab = () => {
  const { isAdmin: isAuthAdmin, hasPermission } = useAuth();
  const isLegacyAdmin = authApi.isAuthenticated();
  const isAdmin = isAuthAdmin || isLegacyAdmin;
  const canDelete = isAdmin || hasPermission('apps.delete');
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState<App | null>(null);
  const [showAppForm, setShowAppForm] = useState(false);
  const [editingApp, setEditingApp] = useState<App | undefined>();
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalApps, setTotalApps] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => { loadApps(); }, [currentPage, searchQuery]);
  useEffect(() => { setCurrentPage(1); }, [searchQuery]);

  const loadApps = async () => {
    setLoading(true);
    try {
      const response = await appsApi.getAll({ page: currentPage, limit: itemsPerPage, search: searchQuery || undefined });
      setApps(response.data || []); setTotalPages(response.pagination?.total_pages || 1); setTotalApps(response.pagination?.total || 0);
    } catch { toast.error("Failed to load products"); setApps([]); } finally { setLoading(false); }
  };

  const handleSelectApp = async (app: App) => { setSelectedApp(app); };

  const [editLoading, setEditLoading] = useState(false);
  const handleEditApp = async (app: App) => {
    setEditLoading(true);
    try { const full = await appsApi.getById(app.id, true); setEditingApp(full); }
    catch { setEditingApp(app); }
    finally { setEditLoading(false); }
    setShowAppForm(true);
  };

  const handleSaveApp = async (data: ProductFormData) => {
    try {
      if (editingApp) { await appsApi.update(editingApp.id, data); toast.success("Product updated!"); }
      else { await appsApi.create(data); toast.success("Product created!"); }
      setShowAppForm(false); setEditingApp(undefined); loadApps();
    } catch { toast.error("Failed to save product"); }
  };

  const [deletingAppId, setDeletingAppId] = useState<number | null>(null);
  const [deleteConfirmApp, setDeleteConfirmApp] = useState<App | null>(null);
  const handleDeleteApp = (app: App) => {
    setDeleteConfirmApp(app);
  };
  const confirmDeleteApp = async () => {
    if (!deleteConfirmApp) return;
    setDeletingAppId(deleteConfirmApp.id);
    try { await appsApi.delete(deleteConfirmApp.id); toast.success("Product deleted!"); if (selectedApp?.id === deleteConfirmApp.id) setSelectedApp(null); loadApps(); }
    catch { toast.error("Failed to delete product"); }
    finally { setDeletingAppId(null); setDeleteConfirmApp(null); }
  };

  const getStockBadge = (app: App) => {
    const totalStock = app.variants && app.variants.length > 0
      ? app.variants.filter(v => v.is_active).reduce((sum, v) => sum + v.stock_quantity, 0)
      : 0;
    const threshold = 5;
    const maxDisplay = Math.max(totalStock, threshold * 3, 20);
    const percent = Math.min((totalStock / maxDisplay) * 100, 100);

    if (totalStock <= 0) {
      return (
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-1.5 rounded-full bg-destructive/15 overflow-hidden">
            <div className="h-full w-0 rounded-full bg-destructive" />
          </div>
          <span className="text-[11px] font-semibold text-destructive whitespace-nowrap">Out of stock</span>
        </div>
      );
    }
    if (totalStock <= threshold) {
      return (
        <div className="flex items-center gap-2 min-w-[120px]">
          <div className="flex-1 h-1.5 rounded-full bg-amber-500/15 overflow-hidden">
            <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${percent}%` }} />
          </div>
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 whitespace-nowrap tabular-nums">{totalStock} left</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 min-w-[120px]">
        <div className="flex-1 h-1.5 rounded-full bg-emerald-500/15 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
        </div>
        <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 whitespace-nowrap tabular-nums">{totalStock}</span>
      </div>
    );
  };

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Product Management</h2>
            <p className="text-sm text-muted-foreground mt-1">View and manage all products</p>
          </div>
          <Button size="sm" onClick={() => { setEditingApp(undefined); setShowAppForm(true); }} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> New Product
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search products..." className="pl-9" />
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Total Products</p>
                  <p className="text-2xl font-bold text-foreground">{totalApps}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4.5 h-4.5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Featured</p>
                  <p className="text-2xl font-bold text-foreground">{apps.filter(a => a.is_featured).length}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Star className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Low Stock</p>
                   <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{apps.filter(a => {
                    const total = a.variants?.length ? a.variants.filter(v => v.is_active).reduce((s, v) => s + v.stock_quantity, 0) : 0;
                    return total > 0 && total <= 5;
                  }).length}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-4.5 h-4.5 text-amber-600 dark:text-amber-400" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Out of Stock</p>
                  <p className="text-2xl font-bold text-destructive">{apps.filter(a => {
                    const total = a.variants?.length ? a.variants.filter(v => v.is_active).reduce((s, v) => s + v.stock_quantity, 0) : 0;
                    return total <= 0;
                  }).length}</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <PackageCheck className="w-4.5 h-4.5 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products table */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="border border-border rounded-md bg-card p-4 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
            ))}
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-12 border border-border rounded-md bg-card">
            <Package className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No products found</p>
          </div>
        ) : (
            <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="w-full text-sm min-w-[700px]">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Product</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Price</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stock</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Date</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {apps.map((app) => {
                    const price = app.variants?.length ? Number(app.variants[0].price_adjustment || 0) : 0;
                    return (
                      <tr key={app.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {app.icon_url ? (
                              <img src={app.icon_url} alt={app.name} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-border/50 shadow-sm" />
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0 border border-border/50">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{app.name}</p>
                              
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary" className="text-xs capitalize">
                            {app.category_relation?.name || app.category}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-semibold tabular-nums">
                          {price > 0 ? `$${price.toFixed(2)}` : <span className="text-muted-foreground">Free</span>}
                        </td>
                        <td className="px-4 py-3">
                          {getStockBadge(app)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {app.is_featured && <Badge className="text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">Featured</Badge>}
                            {app.is_popular && <Badge variant="secondary" className="text-xs">Popular</Badge>}
                            {!app.is_featured && !app.is_popular && <span className="text-xs text-muted-foreground">—</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                          {app.created_at ? new Date(app.created_at).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEditApp(app)}
                              disabled={editLoading}
                              title="Edit"
                            >
                              {editLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Edit className="w-3.5 h-3.5" />}
                            </Button>
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleDeleteApp(app)}
                                disabled={deletingAppId === app.id}
                                title="Delete"
                              >
                                {deletingAppId === app.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5 text-destructive" />}
                              </Button>
                            )}
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
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {currentPage} of {totalPages} ({totalApps} products)
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || loading}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AdminDialog open={showAppForm} onOpenChange={setShowAppForm} title={editingApp ? "Edit Product" : "Add New Product"} size="6xl">
          <ProductForm app={editingApp} onSave={handleSaveApp} onCancel={() => { setShowAppForm(false); setEditingApp(undefined); }} />
      </AdminDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmApp} onOpenChange={(open) => { if (!open) setDeleteConfirmApp(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteConfirmApp?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this product. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteApp}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

// ─── Sales Dashboard Page ─────────────────────────────────────────────────────
const SalesDashboardPage = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-semibold">Sales Dashboard</h2>
      <p className="text-sm text-muted-foreground mt-1">Overview of sales performance</p>
    </div>
    <SalesOverview />
  </div>
);

// ─── Stock Page ───────────────────────────────────────────────────────────────
const StockPage = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-xl font-semibold">Stock Management</h2>
      <p className="text-sm text-muted-foreground mt-1">Monitor and manage product inventory</p>
    </div>
    <StockManagement />
  </div>
);

// ─── Invoices Page (with New Sale button) ─────────────────────────────────────
const InvoicesPage = () => {
  const [addSaleOpen, setAddSaleOpen] = useState(false);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Sales</h2>
          <p className="text-sm text-muted-foreground mt-1">View and manage all sales</p>
        </div>
        <Button onClick={() => setAddSaleOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> New Sale
        </Button>
      </div>
      <InvoicesTab />
      <AddSaleDialog open={addSaleOpen} onOpenChange={setAddSaleOpen} />
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, signOut, isAdmin: isAuthAdmin, isSuperAdmin, hasPermission } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Legacy admin gets full admin access
  const isLegacyAdmin = authApi.isAuthenticated();
  const isAdmin = isAuthAdmin || isLegacyAdmin;

  // Filter nav groups based on permissions
  const visibleGroups = navGroups.map(group => ({
    ...group,
    items: group.items.filter(item => isAdmin || !item.permission || hasPermission(item.permission)),
  })).filter(group => group.items.length > 0);

  const visibleNavItems = visibleGroups.flatMap(g => g.items);
  const [activeTab, setActiveTab] = useState<AdminTab>(visibleNavItems[0]?.id || "apps");

  const handleLogout = async () => {
    authApi.logout();
    await signOut();
    navigate("/");
  };

  const activeItem = visibleNavItems.find(n => n.id === activeTab);

  return (
    <>
    <SEOHead title="Admin Dashboard" noindex />
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-60 bg-card border-r border-border flex flex-col transition-transform duration-200",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
        "lg:translate-x-0 lg:static lg:flex"
      )}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border flex items-center gap-3">
          {user?.avatar_url ? (
            <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover border-2 border-border rounded-full" />
            </div>
          ) : (
            <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-primary-foreground">
                {(user?.full_name || user?.email || "A").charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="font-semibold text-sm leading-none truncate">{user?.full_name || user?.email || "Admin"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isSuperAdmin ? "Super Admin" : isAdmin ? "Administrator" : "Moderator"}
            </p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden p-1 rounded hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav Groups */}
        <nav className="flex-1 p-3 overflow-y-auto space-y-4">
          {visibleGroups.map((group) => (
            <div key={group.label}>
              <p className="px-3 mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all text-left",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      )}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="flex-1">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <span className={cn(
                          "text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center",
                          isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-destructive text-destructive-foreground"
                        )}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Info & Sidebar Footer */}
        <div className="p-3 border-t border-border space-y-1">
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <Home className="w-4 h-4" />
            <span>Back to Store</span>
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Sidebar overlay on mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-card/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            {activeItem && <activeItem.icon className="w-4 h-4 text-muted-foreground shrink-0" />}
            <h1 className="font-semibold text-base truncate">{activeItem?.label}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/")} className="hidden sm:flex gap-1.5">
              <ArrowLeft className="w-3.5 h-3.5" /> Store
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {activeTab === "analytics" && (
            <AnalyticsDashboard />
          )}
          {activeTab === "apps" && <AppsTab />}
          {activeTab === "categories" && <CategoryManagement />}
          {activeTab === "brands" && <BrandManagement />}
          {activeTab === "attributes" && <AttributeManagement />}
          {activeTab === "print_labels" && <PrintLabelsPage />}
          {activeTab === "sliders" && <SliderManagement />}
          {activeTab === "users" && <UserManagement />}
          {activeTab === "stock" && <StockPage />}
          {activeTab === "invoices" && <InvoicesPage />}
          {activeTab === "purchases" && <PurchaseManagement />}
          {activeTab === "suppliers" && <SupplierManagement />}
          
          {activeTab === "reports" && <SalesReport />}
          {activeTab === "payments" && <PaymentHistoryAdmin />}
          {activeTab === "reviews" && <ProductReviewSystem />}
          {activeTab === "roles" && <RoleManagement />}
          {activeTab === "notifications" && <NotificationSystem />}
          {activeTab === "activity" && <ActivityLogs />}
          {activeTab === "status" && <UserStatusManagement />}
          {activeTab === "coupons" && <CouponManagement />}
          {activeTab === "warranties" && <WarrantyManagement />}
          {activeTab === "settings" && <SystemSettingsPanel />}
        </main>
      </div>
    </div>
    </>
  );
};

// ─── Access Denied Page ──────────────────────────────────────────────────────
const AccessDenied = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-8 h-8 text-destructive" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-6">
          You don't have permission to access the admin panel. Contact an administrator to get the required role.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" onClick={() => navigate("/")}>
            <Home className="w-4 h-4 mr-2" /> Back to Store
          </Button>
          <Button variant="outline" onClick={() => navigate("/auth")}>
            Sign in with another account
          </Button>
        </div>
      </div>
    </div>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────
const Admin = () => {
  const { user, loading, isAdminOrModerator } = useAuth();
  const navigate = useNavigate();

  // Also check legacy admin auth for backward compatibility
  const isLegacyAdmin = authApi.isAuthenticated();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If user is not logged in at all (no user auth and no legacy admin auth)
  if (!user && !isLegacyAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4 shadow-md">
            <Package className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Admin Panel</h1>
          <p className="text-muted-foreground mb-6">Please sign in to access the admin panel</p>
          <Button onClick={() => navigate("/auth")} className="w-full">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // Legacy admin auth (backward compatible)
  if (isLegacyAdmin) {
    return <AdminDashboard />;
  }

  // User is logged in but doesn't have admin/moderator role
  if (!isAdminOrModerator) {
    return <AccessDenied />;
  }

  return <AdminDashboard />;
};

export default Admin;
