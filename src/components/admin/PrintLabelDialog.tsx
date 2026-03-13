import { useState, useRef, useEffect, useCallback } from "react";
import { AdminDialog } from "./AdminDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Printer, Plus, Minus, Trash2, Loader2, Package, Ruler, Columns3, StickyNote, Wifi, WifiOff, RefreshCw } from "lucide-react";
import { salesApi, serialsApi, type SaleProduct, type ProductSerial } from "@/lib/api";
import JsBarcode from "jsbarcode";
import { initPrinterService, printLabels, isPrinterServiceAvailable, type PrinterStatus } from "@/lib/printer-service";

interface LabelItem {
  product: SaleProduct;
  variant_id?: number;
  serial_number: string;
  barcode: string;
  price: number;
  quantity: number;
  label: string;
}

interface PrintLabelDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export const PrintLabelDialog = ({ open, onOpenChange }: PrintLabelDialogProps) => {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<SaleProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [serialsLoading, setSerialsLoading] = useState(false);
  const [items, setItems] = useState<LabelItem[]>([]);
  const [labelCols, setLabelCols] = useState(3);
  const [labelWidth, setLabelWidth] = useState(30);
  const [labelHeight, setLabelHeight] = useState(20);
  const printRef = useRef<HTMLDivElement>(null);

  const handleSearch = useCallback(async (q: string) => {
    setSearch(q);
    if (q.length < 1) { setProducts([]); return; }
    setLoading(true);
    try {
      const res = await salesApi.searchProducts(q);
      setProducts(res.products);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  const addItem = async (product: SaleProduct, variantId?: number) => {
    const variant = variantId ? product.variants.find(v => v.id === variantId) : null;
    const price = variant ? Number(variant.price_adjustment || 0) : (product.variants.length > 0 ? Number(product.variants[0].price_adjustment || 0) : 0);
    const variantLabel = variant
      ? `${product.name} (${Object.values(variant.combination).join("/")})`
      : product.name;

    setSearch("");
    setProducts([]);
    setSerialsLoading(true);

    try {
      // Fetch available serials for this product
      const res = await serialsApi.getAll({
        product_id: product.id,
        status: 'available',
        limit: 500,
      });

      const serials = res.serials.filter(s =>
        !variantId || s.variant_id === variantId
      );

      if (serials.length === 0) {
        toast.error("No available serial numbers found for this product");
        setSerialsLoading(false);
        return;
      }

      const newItems: LabelItem[] = serials
        .filter(s => !items.some(existing => existing.serial_number === s.serial_number))
        .map(s => {
          const sVariant = s.variant_id ? product.variants.find(v => v.id === s.variant_id) : variant;
          const sPrice = sVariant ? Number(sVariant.price_adjustment || 0) : price;
          const sLabel = sVariant
            ? `${product.name} (${Object.values(sVariant.combination).join("/")})`
            : product.name;

          return {
            product,
            variant_id: s.variant_id || variantId,
            serial_number: s.serial_number,
            barcode: s.barcode || s.serial_number,
            price: sPrice,
            quantity: 1,
            label: sLabel,
          };
        });

      if (newItems.length === 0) {
        toast.info("All serials already added");
      } else {
        setItems(prev => [...prev, ...newItems]);
        toast.success(`Added ${newItems.length} serial label${newItems.length > 1 ? 's' : ''}`);
      }
    } catch {
      toast.error("Failed to fetch serial numbers");
    }
    setSerialsLoading(false);
  };

  const updateQty = (idx: number, delta: number) => {
    setItems(items.map((item, i) => i === idx ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
  };

  const removeItem = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const totalLabels = items.reduce((sum, i) => sum + i.quantity, 0);

  const handlePrint = () => {
    if (items.length === 0) {
      toast.error("Add products to print labels");
      return;
    }

    const allLabels: { barcode: string; serial: string; price: number; name: string; variant: string }[] = [];
    items.forEach(item => {
      const variant = item.variant_id ? item.product.variants.find(v => v.id === item.variant_id) : null;
      const variantLabel = variant ? Object.values(variant.combination).join(" / ") : "";
      for (let i = 0; i < item.quantity; i++) {
        allLabels.push({ barcode: item.barcode, serial: item.serial_number, price: item.price, name: item.product.name, variant: variantLabel });
      }
    });

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.top = "-10000px";
    iframe.style.left = "-10000px";
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          @page {
            size: ${labelWidth}mm ${labelHeight}mm;
            margin: 0;
          }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; }
          .label {
            width: ${labelWidth}mm;
            height: ${labelHeight}mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 1.5mm 2mm;
            overflow: hidden;
            page-break-after: always;
          }
          .label:last-child { page-break-after: auto; }
          .label svg { max-width: ${labelWidth - 4}mm; height: auto; }
          .product-name { font-size: ${labelHeight >= 30 ? '8pt' : '7pt'}; font-weight: 700; text-align: center; line-height: 1.2; max-height: 2.4em; overflow: hidden; margin-bottom: 0.5mm; width: 100%; }
           .variant-text { font-size: ${labelHeight >= 30 ? '7pt' : '6pt'}; color: #333; font-weight: 700; text-align: center; margin-bottom: 0.5mm; }
           .price-text { font-size: ${labelHeight >= 30 ? '13pt' : '11pt'}; font-weight: 900; margin-top: 0.5mm; }
           .serial-text { font-size: ${labelHeight >= 30 ? '6.5pt' : '5.5pt'}; color: #333; font-weight: 700; margin-top: 0.3mm; }
        </style>
      </head>
      <body id="grid">
      </body>
      </html>
    `);
    doc.close();

    const grid = doc.getElementById("grid")!;

    allLabels.forEach(({ barcode, serial, price, name, variant }) => {
      const labelDiv = doc.createElement("div");
      labelDiv.className = "label";

      const nameDiv = doc.createElement("div");
      nameDiv.className = "product-name";
      nameDiv.textContent = name;
      labelDiv.appendChild(nameDiv);

      if (variant) {
        const varDiv = doc.createElement("div");
        varDiv.className = "variant-text";
        varDiv.textContent = variant;
        labelDiv.appendChild(varDiv);
      }

      // Barcode using serial number
      const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
      labelDiv.appendChild(svg);
      try {
        const barcodeHeight = labelHeight >= 30 ? 35 : 28;
        JsBarcode(svg, barcode, {
          format: "CODE128",
          width: 2,
          height: barcodeHeight,
          displayValue: true,
          fontSize: labelHeight >= 30 ? 10 : 8,
          textMargin: 1,
          margin: 2,
          font: "Arial",
        });
      } catch {
        svg.remove();
      }

      const priceDiv = doc.createElement("div");
      priceDiv.className = "price-text";
      priceDiv.textContent = `$${price.toFixed(2)}`;
      labelDiv.appendChild(priceDiv);

      const serialDiv = doc.createElement("div");
      serialDiv.className = "serial-text";
      serialDiv.textContent = serial;
      labelDiv.appendChild(serialDiv);

      grid.appendChild(labelDiv);
    });

    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(iframe), 2000);
    }, 300);
  };

  const content = (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          placeholder="Search product by name, SKU, or ID..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
          disabled={serialsLoading}
        />
        {(loading || serialsLoading) && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />}
        {loading && search.length >= 1 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Searching...
          </div>
        )}
        {serialsLoading && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading serial numbers...
          </div>
        )}
        {!loading && !serialsLoading && products.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {products.map(p => (
              <div key={p.id}>
                {p.variants.length > 0 ? (
                  p.variants.map(v => (
                    <button key={`${p.id}-${v.id}`} className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-3 transition-colors cursor-pointer" onClick={() => addItem(p, v.id)}>
                      {p.icon_url && <img src={p.icon_url} className="w-7 h-7 rounded object-cover shrink-0" alt="" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">{p.name} <span className="text-muted-foreground font-normal">#{p.id}</span></p>
                        <p className="text-xs text-muted-foreground">{Object.values(v.combination).join(" / ")}{v.sku ? ` · SKU: ${v.sku}` : ''}</p>
                      </div>
                      <span className="text-xs font-semibold">${Number(v.price_adjustment || 0).toFixed(2)}</span>
                    </button>
                  ))
                ) : (
                  <button className="w-full text-left px-3 py-2 hover:bg-muted text-sm flex items-center gap-3 transition-colors cursor-pointer" onClick={() => addItem(p, p.variants.length > 0 ? p.variants[0].id : undefined)}>
                    {p.icon_url && <img src={p.icon_url} className="w-7 h-7 rounded object-cover shrink-0" alt="" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{p.name} <span className="text-muted-foreground font-normal">#{p.id}</span></p>
                      <p className="text-xs text-muted-foreground">{p.variants[0]?.sku ? `SKU: ${p.variants[0].sku}` : `ID: ${p.id}`}</p>
                    </div>
                    <span className="text-xs font-semibold">${p.variants.length > 0 ? Number(p.variants[0].price_adjustment).toFixed(2) : '0.00'}</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
        {!loading && !serialsLoading && products.length === 0 && search.length >= 1 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg p-4 text-center text-sm text-muted-foreground">
            No products found
          </div>
        )}
      </div>

      {/* Label settings */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Ruler className="w-3.5 h-3.5 text-muted-foreground" />
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Paper Size</Label>
          <div className="flex gap-1.5">
            {[
              { value: "30x20", label: "30×20", sub: "mm" },
              { value: "40x30", label: "40×30", sub: "mm" },
            ].map(opt => {
              const active = `${labelWidth}x${labelHeight}` === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { const [w, h] = opt.value.split('x').map(Number); setLabelWidth(w); setLabelHeight(h); }}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <StickyNote className="w-3 h-3" />
                  {opt.label} <span className="text-[10px] opacity-60">{opt.sub}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Columns3 className="w-3.5 h-3.5 text-muted-foreground" />
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Columns</Label>
          <Select value={labelCols.toString()} onValueChange={v => setLabelCols(Number(v))}>
            <SelectTrigger className="h-8 w-20 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3</SelectItem>
              <SelectItem value="4">4</SelectItem>
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="6">6</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {totalLabels > 0 && (
          <Badge variant="secondary" className="text-xs">{totalLabels} label{totalLabels > 1 ? "s" : ""}</Badge>
        )}
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_100px_80px_32px] gap-1 px-3 py-2 bg-muted/50 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            <span>Product / Serial</span>
            <span className="text-center">Labels</span>
            <span className="text-right">Price</span>
            <span />
          </div>
          {items.map((item, idx) => (
            <div key={idx} className="grid grid-cols-[1fr_100px_80px_32px] gap-1 px-3 py-2 items-center border-t border-border/50">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.label}</p>
                <p className="text-[10px] text-muted-foreground font-mono">{item.serial_number}</p>
              </div>
              <div className="flex items-center gap-0.5 justify-center">
                <Button size="icon" variant="outline" className="h-5 w-5" onClick={() => updateQty(idx, -1)}><Minus className="w-2.5 h-2.5" /></Button>
                <span className="text-xs font-medium w-6 text-center">{item.quantity}</span>
                <Button size="icon" variant="outline" className="h-5 w-5" onClick={() => updateQty(idx, 1)}><Plus className="w-2.5 h-2.5" /></Button>
              </div>
              <span className="text-sm font-medium text-right">${item.price.toFixed(2)}</span>
              <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeItem(idx)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          ))}
        </div>
      )}

      {/* Preview */}
      {items.length > 0 && (
        <div className="border border-border rounded-lg p-3 bg-muted/20">
          <p className="text-xs text-muted-foreground mb-2">Preview ({labelWidth}×{labelHeight}mm each)</p>
          <div className="flex flex-wrap gap-2">
            {items.slice(0, 6).map((item, idx) => {
              const variant = item.variant_id ? item.product.variants.find(v => v.id === item.variant_id) : null;
              const variantLabel = variant ? Object.values(variant.combination).join(" / ") : "";
              return (
                <LabelPreview key={idx} barcode={item.barcode} serial={item.serial_number} price={item.price} name={item.product.name} variant={variantLabel} width={labelWidth} height={labelHeight} />
              );
            })}
            {totalLabels > 6 && (
              <div className="w-[90px] h-[60px] border border-dashed border-border rounded flex items-center justify-center text-xs text-muted-foreground">
                +{totalLabels - 6} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        {onOpenChange && <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>}
        <Button onClick={handlePrint} disabled={items.length === 0} className="gap-2">
          <Printer className="w-4 h-4" />
          Print {totalLabels} Label{totalLabels !== 1 ? "s" : ""}
        </Button>
      </div>
    </div>
  );

  if (!onOpenChange) return content;

  return (
    <AdminDialog
      open={open}
      onOpenChange={onOpenChange}
      title={<span className="flex items-center gap-2"><Printer className="w-5 h-5" /> Print Product Labels</span>}
      size="xl"
    >
      {content}
    </AdminDialog>
  );
};

// Single label preview component
const LabelPreview = ({ barcode, serial, price, name, variant, width = 30, height = 20 }: { barcode: string; serial: string; price: number; name?: string; variant?: string; width?: number; height?: number }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const pxW = Math.round(width * 3);
  const pxH = Math.round(height * 3);

  useEffect(() => {
    if (svgRef.current) {
      try {
        JsBarcode(svgRef.current, barcode, {
          format: "CODE128",
          width: 1.2,
          height: 20,
          displayValue: true,
          fontSize: 7,
          textMargin: 1,
          margin: 1,
          font: "Arial",
        });
      } catch { /* fallback */ }
    }
  }, [barcode]);

  return (
    <div style={{ width: pxW, height: pxH }} className="border border-border rounded flex flex-col items-center justify-center bg-background px-1.5 py-0.5 overflow-hidden gap-0">
      {name && <span className="text-[7px] font-bold text-center leading-tight line-clamp-1 w-full">{name}</span>}
      {variant && <span className="text-[6px] text-muted-foreground text-center leading-tight">{variant}</span>}
      <svg ref={svgRef} style={{ maxWidth: pxW - 10 }} className="h-[16px]" />
      <span className="text-[9px] font-black leading-none">${price.toFixed(2)}</span>
      <span className="text-[5px] text-muted-foreground font-mono leading-none">{serial}</span>
    </div>
  );
};

// Standalone page version for admin tab
export const PrintLabelsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Print Labels</h2>
        <p className="text-sm text-muted-foreground mt-1">Generate and print barcode labels for products</p>
      </div>
      <PrintLabelDialog />
    </div>
  );
};
