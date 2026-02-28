import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Loader2, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AdminDialog } from "./AdminDialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { suppliersApi, type Supplier } from "@/lib/api";

export const SupplierManagement = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({ name: "", phone: "", address: "" });

  const loadSuppliers = async () => {
    setLoading(true);
    try {
      const res = await suppliersApi.getAll();
      setSuppliers(res.suppliers);
    } catch { toast.error("Failed to load suppliers"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadSuppliers(); }, []);

  const openForm = (supplier?: Supplier) => {
    if (supplier) {
      setEditing(supplier);
      setFormData({ name: supplier.name, phone: supplier.phone || "", address: supplier.address || "" });
    } else {
      setEditing(null);
      setFormData({ name: "", phone: "", address: "" });
    }
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      if (editing) {
        await suppliersApi.update(editing.id, formData);
        toast.success("Supplier updated");
      } else {
        await suppliersApi.create(formData);
        toast.success("Supplier created");
      }
      setShowForm(false);
      loadSuppliers();
    } catch { toast.error("Failed to save supplier"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await suppliersApi.delete(deleting.id);
      toast.success("Supplier deleted");
      setDeleting(null);
      loadSuppliers();
    } catch { toast.error("Failed to delete supplier"); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Supplier Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your suppliers</p>
        </div>
        <Button size="sm" onClick={() => openForm()} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Supplier
        </Button>
      </div>

      <Card>
        <CardContent className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Total Suppliers</p>
          <p className="text-2xl font-bold">{suppliers.length}</p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-md bg-card">
          <p className="text-sm text-muted-foreground">No suppliers yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Address</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {suppliers.map(supplier => (
                <tr key={supplier.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center border border-border/50">
                        <Truck className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="font-medium">{supplier.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{supplier.phone || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground max-w-[200px] truncate">{supplier.address || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openForm(supplier)}><Edit className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleting(supplier)}><Trash2 className="w-3.5 h-3.5 text-destructive" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminDialog open={showForm} onOpenChange={setShowForm} title={editing ? "Edit Supplier" : "New Supplier"} size="md">
        <div className="space-y-4">
          <div>
            <Label>Name *</Label>
            <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="mt-1.5" placeholder="Supplier name" />
          </div>
          <div>
            <Label>Phone</Label>
            <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="mt-1.5" placeholder="Phone number" />
          </div>
          <div>
            <Label>Address</Label>
            <Textarea value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="mt-1.5" placeholder="Address" rows={3} />
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
            <AlertDialogDescription>This will remove the supplier. Purchase orders linked to this supplier will keep the supplier name.</AlertDialogDescription>
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
