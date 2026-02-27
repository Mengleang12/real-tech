import { useState, useEffect, lazy, Suspense } from "react";
import { Plus, Edit, Trash2, Loader2, X, Search, Settings2 } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AdminDialog, Dialog, DialogContent, DialogHeader, DialogTitle } from "./AdminDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { productAttributesApi, type ProductAttribute } from "@/lib/api";

// All available icon names from lucide
const allIconNames = Object.keys(dynamicIconImports) as (keyof typeof dynamicIconImports)[];

// Lazy icon component
const LazyIcon = ({ name, ...props }: { name: keyof typeof dynamicIconImports } & React.SVGProps<SVGSVGElement>) => {
  const LucideIcon = lazy(dynamicIconImports[name]);
  return (
    <Suspense fallback={<div className="w-4 h-4 bg-muted rounded" />}>
      <LucideIcon {...(props as any)} />
    </Suspense>
  );
};

// Icon picker component (single select, many icons)
const IconPicker = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = allIconNames.filter(name => name.includes(search.toLowerCase())).slice(0, 200);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full mt-1.5 justify-start gap-2 h-10">
          {value ? (
            <>
              <LazyIcon name={value as keyof typeof dynamicIconImports} className="w-4 h-4" />
              <span className="text-sm truncate">{value}</span>
            </>
          ) : (
            <span className="text-muted-foreground text-sm">Select icon...</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="relative mb-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search icons..."
            className="pl-8 h-8 text-sm"
          />
        </div>
        <ScrollArea className="h-64">
          <div className="grid grid-cols-8 gap-1">
            {value && (
              <button
                onClick={() => { onChange(""); setOpen(false); }}
                className="p-2 rounded hover:bg-destructive/10 flex items-center justify-center"
                title="Remove icon"
              >
                <X className="w-4 h-4 text-destructive" />
              </button>
            )}
            {filtered.map(name => (
              <button
                key={name}
                onClick={() => { onChange(name); setOpen(false); }}
                className={`p-2 rounded hover:bg-accent flex items-center justify-center ${value === name ? 'bg-primary/10 ring-1 ring-primary' : ''}`}
                title={name}
              >
                <LazyIcon name={name} className="w-4 h-4" />
              </button>
            ))}
          </div>
        </ScrollArea>
        <p className="text-[10px] text-muted-foreground text-center mt-1.5">{filtered.length} icons shown · type to search more</p>
      </PopoverContent>
    </Popover>
  );
};

export const AttributeManagement = () => {
  const [attributes, setAttributes] = useState<ProductAttribute[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ProductAttribute | null>(null);
  const [deleting, setDeleting] = useState<ProductAttribute | null>(null);
  const [saving, setSaving] = useState(false);
  const [optionsAttr, setOptionsAttr] = useState<ProductAttribute | null>(null);
  const [optionsEdit, setOptionsEdit] = useState<string[]>([]);
  const [optionInput, setOptionInput] = useState("");
  const [savingOptions, setSavingOptions] = useState(false);

  const [formData, setFormData] = useState<{
    name: string; name_km: string; icon: string; type: 'text' | 'number' | 'select' | 'boolean';
    options: string[]; is_required: boolean; sort_order: number; is_active: boolean;
  }>({ name: "", name_km: "", icon: "", type: "text", options: [], is_required: false, sort_order: 0, is_active: true });

  const [newOption, setNewOption] = useState("");

  const presetGroups: { label: string; options: string[] }[] = [
    { label: "Colors", options: ["Red", "Blue", "Green", "Black", "White", "Yellow", "Orange", "Purple", "Pink", "Gray", "Brown"] },
    { label: "Sizes", options: ["XS", "S", "M", "L", "XL", "XXL"] },
    { label: "Storage", options: ["64GB", "128GB", "256GB", "512GB", "1TB"] },
    { label: "RAM", options: ["4GB", "8GB", "16GB", "32GB", "64GB"] },
    { label: "Material", options: ["Plastic", "Metal", "Wood", "Glass", "Leather", "Fabric"] },
    { label: "Condition", options: ["New", "Like New", "Good", "Fair", "Refurbished"] },
    { label: "Yes/No", options: ["Yes", "No"] },
  ];

  const loadAttributes = async () => {
    setLoading(true);
    try {
      const res = await productAttributesApi.getAll();
      setAttributes(res.attributes);
    } catch { toast.error("Failed to load attributes"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAttributes(); }, []);

  const openForm = (attr?: ProductAttribute) => {
    if (attr) {
      setEditing(attr);
      setFormData({
        name: attr.name, name_km: attr.name_km || "", icon: attr.icon || "", type: attr.type,
        options: attr.options || [], is_required: attr.is_required,
        sort_order: attr.sort_order, is_active: attr.is_active,
      });
    } else {
      setEditing(null);
      setFormData({ name: "", name_km: "", icon: "", type: "text", options: [], is_required: false, sort_order: attributes.length, is_active: true });
    }
    setNewOption("");
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error("Name is required"); return; }
    if (formData.type === "select" && formData.options.length === 0) { toast.error("Select type needs at least one option"); return; }
    setSaving(true);
    try {
      const payload = { ...formData, options: formData.type === "select" ? formData.options : undefined };
      if (editing) {
        await productAttributesApi.update(editing.id, payload);
        toast.success("Attribute updated");
      } else {
        await productAttributesApi.create(payload);
        toast.success("Attribute created");
      }
      setShowForm(false);
      loadAttributes();
    } catch { toast.error("Failed to save attribute"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await productAttributesApi.delete(deleting.id);
      toast.success("Attribute deleted");
      setDeleting(null);
      loadAttributes();
    } catch { toast.error("Failed to delete attribute"); }
  };

  const openOptionsEditor = (attr: ProductAttribute) => {
    setOptionsAttr(attr);
    setOptionsEdit(attr.options || []);
    setOptionInput("");
  };

  const addOptionInline = () => {
    if (optionInput.trim() && !optionsEdit.includes(optionInput.trim())) {
      setOptionsEdit([...optionsEdit, optionInput.trim()]);
      setOptionInput("");
    }
  };

  const saveOptionsInline = async () => {
    if (!optionsAttr) return;
    setSavingOptions(true);
    try {
      await productAttributesApi.update(optionsAttr.id, { options: optionsEdit });
      toast.success("Options updated");
      setOptionsAttr(null);
      loadAttributes();
    } catch { toast.error("Failed to save options"); }
    finally { setSavingOptions(false); }
  };

  const addOption = () => {
    if (newOption.trim() && !formData.options.includes(newOption.trim())) {
      setFormData({ ...formData, options: [...formData.options, newOption.trim()] });
      setNewOption("");
    }
  };

  const typeLabels: Record<string, string> = { text: "Text", number: "Number", select: "Dropdown", boolean: "Yes/No" };

  return (
    <div className="space-y-6">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-semibold">Product Attributes</h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Define attribute templates for products</p>
        </div>
        <Button size="sm" onClick={() => openForm()} className="gap-1.5 shrink-0">
          <Plus className="w-3.5 h-3.5" /> <span className="hidden xs:inline">New</span> <span className="hidden sm:inline">Attribute</span>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <Card><CardContent className="p-3 sm:p-5"><p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Total</p><p className="text-xl sm:text-2xl font-bold">{attributes.length}</p></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-5"><p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Required</p><p className="text-xl sm:text-2xl font-bold">{attributes.filter(a => a.is_required).length}</p></CardContent></Card>
        <Card><CardContent className="p-3 sm:p-5"><p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Active</p><p className="text-xl sm:text-2xl font-bold">{attributes.filter(a => a.is_active).length}</p></CardContent></Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : attributes.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-md bg-card">
          <p className="text-sm text-muted-foreground">No attributes yet. Create templates like Color, Size, Material, etc.</p>
        </div>
      ) : (
        <>
          {/* Mobile card layout */}
          <div className="space-y-3 sm:hidden">
            {attributes.map(attr => (
              <Card key={attr.id}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      {attr.icon && (
                        <div className="p-1.5 rounded-md bg-primary/10 shrink-0">
                          <LazyIcon name={attr.icon as keyof typeof dynamicIconImports} className="w-4 h-4 text-primary" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{attr.name}</p>
                        {attr.name_km && <p className="text-xs text-muted-foreground truncate">{attr.name_km}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openOptionsEditor(attr)} title="Manage values">
                        <Settings2 className="w-3.5 h-3.5 text-primary" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openForm(attr)}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleting(attr)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="outline" className="text-xs">{typeLabels[attr.type]}</Badge>
                    {attr.is_required && <Badge variant="destructive" className="text-xs">Required</Badge>}
                    <Badge variant={attr.is_active ? "default" : "secondary"} className="text-xs">{attr.is_active ? "Active" : "Inactive"}</Badge>
                  </div>
                  {attr.type === "select" && attr.options && (
                    <p className="text-xs text-muted-foreground truncate">{attr.options.join(", ")}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Desktop table layout */}
          <div className="border border-border rounded-lg overflow-hidden hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Attribute</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Options</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Required</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {attributes.map(attr => (
                  <tr key={attr.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {attr.icon && (
                          <div className="p-1.5 rounded-md bg-primary/10">
                            <LazyIcon name={attr.icon as keyof typeof dynamicIconImports} className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium">{attr.name}</p>
                          {attr.name_km && <p className="text-xs text-muted-foreground">{attr.name_km}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline">{typeLabels[attr.type]}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {attr.type === "select" && attr.options ? attr.options.join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {attr.is_required ? <Badge variant="destructive" className="text-xs">Required</Badge> : <span className="text-muted-foreground text-xs">Optional</span>}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={attr.is_active ? "default" : "secondary"}>{attr.is_active ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openOptionsEditor(attr)} title="Manage values">
                          <Settings2 className="w-3.5 h-3.5 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openForm(attr)}><Edit className="w-3.5 h-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleting(attr)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <AdminDialog open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Attribute" : "New Attribute"} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Name (English) *</Label>
                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="mt-1.5" placeholder="e.g. Color" />
              </div>
              <div>
                <Label>ឈ្មោះ (ខ្មែរ)</Label>
                <Input value={formData.name_km} onChange={e => setFormData({ ...formData, name_km: e.target.value })} className="mt-1.5" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Type *</Label>
                <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v as typeof formData.type })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="select">Dropdown (Select)</SelectItem>
                    <SelectItem value="boolean">Yes/No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Icon</Label>
                <IconPicker value={formData.icon} onChange={v => setFormData({ ...formData, icon: v })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Sort Order</Label>
                <Input type="number" value={formData.sort_order} onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })} className="mt-1.5" />
              </div>
            </div>

            {formData.type === "select" && (
              <div>
                <Label>Options</Label>
                <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2">
                  {presetGroups.map(g => (
                    <Button key={g.label} type="button" variant="outline" size="sm" className="h-7 text-xs"
                      onClick={() => {
                        const merged = [...new Set([...formData.options, ...g.options])];
                        setFormData({ ...formData, options: merged });
                      }}>
                      + {g.label}
                    </Button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input value={newOption} onChange={e => setNewOption(e.target.value)} placeholder="Add option..." onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }} />
                  <Button type="button" variant="outline" size="sm" onClick={addOption}>Add</Button>
                </div>
                {formData.options.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {formData.options.map((opt, i) => (
                      <Badge key={i} variant="secondary" className="gap-1 pr-1">
                        {opt}
                        <button onClick={() => setFormData({ ...formData, options: formData.options.filter((_, j) => j !== i) })} className="ml-0.5 hover:text-destructive">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch checked={formData.is_required} onCheckedChange={c => setFormData({ ...formData, is_required: c })} />
                <Label>Required</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={formData.is_active} onCheckedChange={c => setFormData({ ...formData, is_active: c })} />
                <Label>Active</Label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
      </AdminDialog>

      <AlertDialog open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>All product values for this attribute will be removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdminDialog open={!!optionsAttr} onOpenChange={open => { if (!open) setOptionsAttr(null); }} title={`Options for "${optionsAttr?.name}"`} size="md">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {presetGroups.map(g => (
                <Button key={g.label} type="button" variant="outline" size="sm" className="h-7 text-xs"
                  onClick={() => setOptionsEdit([...new Set([...optionsEdit, ...g.options])])}>
                  + {g.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Input value={optionInput} onChange={e => setOptionInput(e.target.value)} placeholder="Add option..."
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOptionInline(); } }} />
              <Button type="button" variant="outline" size="sm" onClick={addOptionInline}>Add</Button>
            </div>
            {optionsEdit.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {optionsEdit.map((opt, i) => (
                  <Badge key={i} variant="secondary" className="gap-1 pr-1">
                    {opt}
                    <button onClick={() => setOptionsEdit(optionsEdit.filter((_, j) => j !== i))} className="ml-0.5 hover:text-destructive">
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setOptionsAttr(null)}>Cancel</Button>
              <Button onClick={saveOptionsInline} disabled={savingOptions}>
                {savingOptions ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {savingOptions ? "Saving..." : "Save Options"}
              </Button>
            </div>
          </div>
      </AdminDialog>
    </div>
  );
};
