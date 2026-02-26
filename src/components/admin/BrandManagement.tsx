import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { brandsApi, type Brand } from "@/lib/api";
import { FileUpload } from "@/components/FileUpload";

export const BrandManagement = () => {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Brand | null>(null);
  const [deleting, setDeleting] = useState<Brand | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({ name: "", logo_url: "", is_active: true });

  const loadBrands = async () => {
    setLoading(true);
    try {
      const res = await brandsApi.getAll();
      setBrands(res.brands);
    } catch { toast.error("Failed to load brands"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadBrands(); }, []);

  const openForm = (brand?: Brand) => {
    if (brand) {
      setEditing(brand);
      setFormData({ name: brand.name, logo_url: brand.logo_url || "", is_active: brand.is_active });
    } else {
      setEditing(null);
      setFormData({ name: "", logo_url: "", is_active: true });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      if (editing) {
        await brandsApi.update(editing.id, formData);
        toast.success("Brand updated");
      } else {
        await brandsApi.create(formData);
        toast.success("Brand created");
      }
      setShowForm(false);
      loadBrands();
    } catch { toast.error("Failed to save brand"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await brandsApi.delete(deleting.id);
      toast.success("Brand deleted");
      setDeleting(null);
      loadBrands();
    } catch { toast.error("Failed to delete brand"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Brand Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage product brands</p>
        </div>
        <Button size="sm" onClick={() => openForm()} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Brand
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Total Brands</p>
            <p className="text-2xl font-bold">{brands.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-muted-foreground mb-1">Active</p>
            <p className="text-2xl font-bold">{brands.filter(b => b.is_active).length}</p>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : brands.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-md bg-card">
          <p className="text-sm text-muted-foreground">No brands yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Brand</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Slug</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {brands.map(brand => (
                <tr key={brand.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {brand.logo_url ? (
                        <img src={brand.logo_url} alt={brand.name} className="w-8 h-8 rounded object-cover border border-border/50" />
                      ) : (
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center border border-border/50">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="font-medium">{brand.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{brand.slug}</td>
                  <td className="px-4 py-3">
                    <Badge variant={brand.is_active ? "default" : "secondary"}>{brand.is_active ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openForm(brand)}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleting(brand)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Brand" : "New Brand"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label>Logo (optional)</Label>
              <div className="mt-1.5">
                <FileUpload
                  type="icons"
                  currentUrl={formData.logo_url || undefined}
                  onUpload={(url) => setFormData({ ...formData, logo_url: url })}
                  label=""
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.is_active} onCheckedChange={c => setFormData({ ...formData, is_active: c })} />
              <Label>Active</Label>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={open => { if (!open) setDeleting(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleting?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Products using this brand will be unassigned.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
