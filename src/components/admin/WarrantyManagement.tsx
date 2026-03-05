import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { warrantyApi, type WarrantyOption } from "@/lib/api";
import { AdminDialog } from "./AdminDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { RichTextEditor } from "@/components/RichTextEditor";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Shield, Loader2, Calendar, Star } from "lucide-react";

export const WarrantyManagement = () => {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WarrantyOption | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [durationDays, setDurationDays] = useState<number>(30);
  const [policy, setPolicy] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["warranties"],
    queryFn: () => warrantyApi.getAll(),
  });

  const warranties = data?.warranties || [];

  const resetForm = () => {
    setName("");
    setDurationDays(30);
    setPolicy("");
    setIsDefault(false);
    setEditing(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (w: WarrantyOption) => {
    setEditing(w);
    setName(w.name);
    setDurationDays(w.duration_days);
    setPolicy(w.policy || "");
    setIsDefault(w.is_default || false);
    setDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: (data: { name: string; duration_days: number; policy?: string }) =>
      warrantyApi.create(data),
    onSuccess: () => {
      toast.success("Warranty option created");
      queryClient.invalidateQueries({ queryKey: ["warranties"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name: string; duration_days: number; policy?: string } }) =>
      warrantyApi.update(id, data),
    onSuccess: () => {
      toast.success("Warranty option updated");
      queryClient.invalidateQueries({ queryKey: ["warranties"] });
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => warrantyApi.delete(id),
    onSuccess: () => {
      toast.success("Warranty option deleted");
      queryClient.invalidateQueries({ queryKey: ["warranties"] });
      setDeleteId(null);
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete"),
  });

  const handleSave = () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (durationDays < 1) { toast.error("Duration must be at least 1 day"); return; }

    const payload = { name: name.trim(), duration_days: durationDays, policy: policy || undefined, is_default: isDefault };

    if (editing) {
      updateMutation.mutate({ id: editing.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const formatDuration = (days: number) => {
    if (days >= 365 && days % 365 === 0) return `${days / 365} year${days / 365 > 1 ? 's' : ''}`;
    if (days >= 30 && days % 30 === 0) return `${days / 30} month${days / 30 > 1 ? 's' : ''}`;
    if (days >= 7 && days % 7 === 0) return `${days / 7} week${days / 7 > 1 ? 's' : ''}`;
    return `${days} day${days > 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Warranty Options</p>
          <p className="text-xs text-muted-foreground mt-0.5">Manage warranty periods and policies for sales</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Add Warranty
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}
        </div>
      ) : warranties.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl">
          <Shield className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No warranty options yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Create warranty periods to use in sales</p>
        </div>
      ) : (
        <div className="space-y-2">
          {warranties.map((w) => (
            <Card key={w.id} className="flex items-center justify-between px-4 py-3 group hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{w.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {formatDuration(w.duration_days)}
                    </span>
                    <span className="text-xs text-muted-foreground">({w.duration_days} days)</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(w)}>
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(w.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <AdminDialog
        open={dialogOpen}
        onOpenChange={(open) => { if (!open) { setDialogOpen(false); resetForm(); } }}
        title={editing ? "Edit Warranty" : "New Warranty"}
        size="xl"
      >
        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Name</Label>
              <Input
                placeholder="e.g. 6 Months, 1 Year"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">Duration (days)</Label>
              <Input
                type="number"
                min={1}
                max={36500}
                value={durationDays}
                onChange={(e) => setDurationDays(parseInt(e.target.value) || 0)}
                className="h-9 text-sm"
              />
              {durationDays > 0 && (
                <p className="text-[10px] text-muted-foreground">≈ {formatDuration(durationDays)}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Warranty Policy</Label>
            <RichTextEditor value={policy} onChange={setPolicy} />
          </div>

          <Button className="w-full gap-2" onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            {editing ? "Save Changes" : "Create Warranty"}
          </Button>
        </div>
      </AdminDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete warranty option?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this warranty option. Existing sales with this warranty will keep their warranty period text.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
