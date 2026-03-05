import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, GripVertical, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminDialog } from "@/components/admin/AdminDialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { slidersApi, uploadApi, type Slider } from "@/lib/api";
import { FileUpload } from "@/components/FileUpload";

export const SliderManagement = () => {
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Slider | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Slider | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "", title_km: "", subtitle: "", subtitle_km: "",
    badge: "", badge_km: "", image_url: "", link_url: "",
    accent_color: "#007AFF", gradient: "from-slate-950/90 via-slate-900/60 to-transparent",
    is_active: true,
  });

  useEffect(() => { loadSliders(); }, []);

  const loadSliders = async () => {
    setLoading(true);
    try {
      const res = await slidersApi.getAll();
      setSliders(res.sliders || []);
    } catch { toast.error("Failed to load sliders"); }
    finally { setLoading(false); }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: "", title_km: "", subtitle: "", subtitle_km: "",
      badge: "", badge_km: "", image_url: "", link_url: "",
      accent_color: "#007AFF", gradient: "from-slate-950/90 via-slate-900/60 to-transparent",
      is_active: true,
    });
    setDialogOpen(true);
  };

  const openEdit = (s: Slider) => {
    setEditing(s);
    setForm({
      title: s.title || "", title_km: s.title_km || "",
      subtitle: s.subtitle || "", subtitle_km: s.subtitle_km || "",
      badge: s.badge || "", badge_km: s.badge_km || "",
      image_url: s.image_url, link_url: s.link_url || "",
      accent_color: s.accent_color || "#007AFF",
      gradient: s.gradient || "from-slate-950/90 via-slate-900/60 to-transparent",
      is_active: s.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.image_url) { toast.error("Image is required"); return; }
    setSaving(true);
    try {
      if (editing) {
        await slidersApi.update(editing.id, form);
        toast.success("Slider updated");
      } else {
        await slidersApi.create({ ...form, sort_order: sliders.length });
        toast.success("Slider created");
      }
      setDialogOpen(false);
      loadSliders();
    } catch { toast.error("Failed to save slider"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await slidersApi.delete(deleteTarget.id);
      toast.success("Slider deleted");
      setDeleteTarget(null);
      loadSliders();
    } catch { toast.error("Failed to delete"); }
  };

  const toggleActive = async (s: Slider) => {
    try {
      await slidersApi.update(s.id, { is_active: !s.is_active });
      setSliders(prev => prev.map(sl => sl.id === s.id ? { ...sl, is_active: !sl.is_active } : sl));
    } catch { toast.error("Failed to update"); }
  };

  const gradientOptions = [
    { label: "Dark Slate", value: "from-slate-950/90 via-slate-900/60 to-transparent" },
    { label: "Deep Blue", value: "from-blue-950/90 via-indigo-900/60 to-transparent" },
    { label: "Dark Gray", value: "from-gray-950/90 via-gray-800/60 to-transparent" },
    { label: "Indigo", value: "from-indigo-950/90 via-blue-900/60 to-transparent" },
    { label: "Purple", value: "from-purple-950/90 via-purple-900/60 to-transparent" },
    { label: "Emerald", value: "from-emerald-950/90 via-emerald-900/60 to-transparent" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Slider Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage homepage hero slider banners</p>
        </div>
        <Button size="sm" onClick={openCreate} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New Slide
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
        </div>
      ) : sliders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No sliders yet. Create your first slide!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {sliders.map((s) => (
            <Card key={s.id} className={`overflow-hidden ${!s.is_active ? 'opacity-50' : ''}`}>
              <CardContent className="p-0">
                <div className="flex items-center gap-4">
                  {/* Image preview */}
                  <div className="w-40 h-24 shrink-0 bg-muted overflow-hidden">
                    <img src={s.image_url} alt={s.title || 'Slide'} className="w-full h-full object-cover" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 py-3">
                    <div className="flex items-center gap-2">
                      {s.badge && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: s.accent_color }}>
                          {s.badge}
                        </span>
                      )}
                      <h3 className="font-semibold text-sm truncate">{s.title || 'Untitled'}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{s.subtitle || 'No subtitle'}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pr-4">
                    <button onClick={() => toggleActive(s)} className="p-1.5 rounded-md hover:bg-muted transition-colors" title={s.is_active ? 'Deactivate' : 'Activate'}>
                      {s.is_active ? <Eye className="w-4 h-4 text-primary" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                    </button>
                    <button onClick={() => openEdit(s)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                      <Edit className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => setDeleteTarget(s)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <AdminDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title={editing ? "Edit Slide" : "New Slide"}
        size="2xl"
        footer={
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              {editing ? "Update" : "Create"}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Image upload */}
          <div>
            <Label>Slide Image *</Label>
            <div className="mt-1.5">
              {form.image_url ? (
                <div className="relative rounded-lg overflow-hidden border border-border">
                  <img src={form.image_url} alt="Preview" className="w-full h-40 object-cover" />
                  <button
                    onClick={() => setForm(f => ({ ...f, image_url: "" }))}
                    className="absolute top-2 right-2 bg-background/80 rounded-full p-1 hover:bg-background"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              ) : (
                <FileUpload
                  onUpload={(url) => setForm(f => ({ ...f, image_url: url }))}
                  type="general"
                  accept="image/*"
                  label="Upload slide image (recommended: 1400×500)"
                />
              )}
            </div>
          </div>

          {/* Title */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Title (English)</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>ចំណងជើង (ខ្មែរ)</Label>
              <Input value={form.title_km} onChange={e => setForm(f => ({ ...f, title_km: e.target.value }))} className="mt-1" />
            </div>
          </div>

          {/* Subtitle */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Subtitle (English)</Label>
              <Input value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} className="mt-1" />
            </div>
            <div>
              <Label>ការពិពណ៌នា (ខ្មែរ)</Label>
              <Input value={form.subtitle_km} onChange={e => setForm(f => ({ ...f, subtitle_km: e.target.value }))} className="mt-1" />
            </div>
          </div>

          {/* Badge */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Badge (English)</Label>
              <Input value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} placeholder="e.g. NEW ARRIVAL" className="mt-1" />
            </div>
            <div>
              <Label>ស្លាក (ខ្មែរ)</Label>
              <Input value={form.badge_km} onChange={e => setForm(f => ({ ...f, badge_km: e.target.value }))} className="mt-1" />
            </div>
          </div>

          {/* Link URL */}
          <div>
            <Label>Link URL (optional)</Label>
            <Input value={form.link_url} onChange={e => setForm(f => ({ ...f, link_url: e.target.value }))} placeholder="e.g. /products/123 or https://..." className="mt-1" />
          </div>

          {/* Accent color & Gradient */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Accent Color</Label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="w-9 h-9 rounded border border-border cursor-pointer" />
                <Input value={form.accent_color} onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))} className="flex-1" />
              </div>
            </div>
            <div>
              <Label>Gradient Overlay</Label>
              <select
                value={form.gradient}
                onChange={e => setForm(f => ({ ...f, gradient: e.target.value }))}
                className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {gradientOptions.map(g => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Active */}
          <div className="flex items-center gap-3">
            <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
            <Label>Active</Label>
          </div>
        </div>
      </AdminDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Slide</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title || 'this slide'}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
