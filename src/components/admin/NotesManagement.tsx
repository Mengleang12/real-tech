import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Plus, Pin, PinOff, Trash2, Edit, Search, X, Save, Loader2,
  Truck, PackageCheck, Users, ListTodo, StickyNote, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AdminNote {
  id: string;
  user_id: string;
  title: string;
  content: string | null;
  category: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = [
  { value: "general", label: "General", icon: StickyNote, color: "bg-muted text-muted-foreground" },
  { value: "delivery", label: "Delivery", icon: Truck, color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  { value: "restock", label: "Restock", icon: PackageCheck, color: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  { value: "customer", label: "Customer", icon: Users, color: "bg-green-500/15 text-green-600 dark:text-green-400" },
  { value: "todo", label: "Todo", icon: ListTodo, color: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
];

const getCategoryMeta = (cat: string) => CATEGORIES.find(c => c.value === cat) || CATEGORIES[0];

export const NotesManagement = () => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [editingNote, setEditingNote] = useState<AdminNote | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("general");

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_notes" as any)
        .select("*")
        .order("is_pinned", { ascending: false })
        .order("updated_at", { ascending: false });
      if (error) throw error;
      setNotes((data as any[]) || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotes(); }, []);

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormCategory("general");
    setEditingNote(null);
    setIsCreating(false);
  };

  const openCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  const openEdit = (note: AdminNote) => {
    setFormTitle(note.title);
    setFormContent(note.content || "");
    setFormCategory(note.category);
    setEditingNote(note);
    setIsCreating(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      if (editingNote) {
        const { error } = await supabase
          .from("admin_notes" as any)
          .update({ title: formTitle.trim(), content: formContent.trim() || null, category: formCategory } as any)
          .eq("id", editingNote.id);
        if (error) throw error;
        toast.success("Note updated");
      } else {
        const { error } = await supabase
          .from("admin_notes" as any)
          .insert({ title: formTitle.trim(), content: formContent.trim() || null, category: formCategory, user_id: user?.id } as any);
        if (error) throw error;
        toast.success("Note created");
      }
      resetForm();
      fetchNotes();
    } catch (err: any) {
      toast.error(err.message || "Failed to save note");
    } finally {
      setSaving(false);
    }
  };

  const togglePin = async (note: AdminNote) => {
    try {
      const { error } = await supabase
        .from("admin_notes" as any)
        .update({ is_pinned: !note.is_pinned } as any)
        .eq("id", note.id);
      if (error) throw error;
      fetchNotes();
    } catch (err: any) {
      toast.error(err.message || "Failed to update pin");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from("admin_notes" as any)
        .delete()
        .eq("id", deleteId);
      if (error) throw error;
      toast.success("Note deleted");
      fetchNotes();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete note");
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = notes.filter(n => {
    if (filterCategory !== "all" && n.category !== filterCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return n.title.toLowerCase().includes(q) || (n.content || "").toLowerCase().includes(q);
    }
    return true;
  });

  const pinnedNotes = filtered.filter(n => n.is_pinned);
  const unpinnedNotes = filtered.filter(n => !n.is_pinned);

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
    return date.toLocaleDateString();
  };

  const NoteCard = ({ note }: { note: AdminNote }) => {
    const cat = getCategoryMeta(note.category);
    const CatIcon = cat.icon;
    return (
      <Card className={cn(
        "group transition-all hover:shadow-md border-border/60",
        note.is_pinned && "border-primary/30 bg-primary/[0.02]"
      )}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", cat.color)}>
              <CatIcon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm truncate">{note.title}</h3>
                {note.is_pinned && <Pin className="w-3 h-3 text-primary shrink-0" />}
              </div>
              {note.content && (
                <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">{note.content}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className={cn("text-[10px] px-1.5 py-0", cat.color)}>
                  {cat.label}
                </Badge>
                <span className="text-[11px] text-muted-foreground">{formatDate(note.updated_at)}</span>
              </div>
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button onClick={() => togglePin(note)} className="p-1.5 rounded-md hover:bg-muted transition-colors" title={note.is_pinned ? "Unpin" : "Pin"}>
                {note.is_pinned ? <PinOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Pin className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>
              <button onClick={() => openEdit(note)} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                <Edit className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button onClick={() => setDeleteId(note.id)} className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5 text-destructive" />
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search notes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="h-9 w-[130px]">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={openCreate} className="h-9 gap-1.5">
            <Plus className="w-4 h-4" /> New Note
          </Button>
        </div>
      </div>

      {/* Create / Edit Form */}
      {isCreating && (
        <Card className="border-primary/30">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Input
                placeholder="Note title..."
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                className="h-9 font-medium"
                autoFocus
              />
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Textarea
              placeholder="Write your note here..."
              value={formContent}
              onChange={e => setFormContent(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={resetForm} disabled={saving}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                {editingNote ? "Update" : "Save"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Quick Filters */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilterCategory("all")}
          className={cn(
            "px-3 py-1 rounded-full text-xs font-medium transition-all",
            filterCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
          )}
        >
          All ({notes.length})
        </button>
        {CATEGORIES.map(c => {
          const count = notes.filter(n => n.category === c.value).length;
          if (count === 0) return null;
          return (
            <button
              key={c.value}
              onClick={() => setFilterCategory(c.value)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all",
                filterCategory === c.value ? "bg-primary text-primary-foreground" : cn(c.color, "hover:opacity-80")
              )}
            >
              {c.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Pinned Notes */}
      {pinnedNotes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Pin className="w-3 h-3" /> Pinned
          </p>
          <div className="grid gap-2">
            {pinnedNotes.map(n => <NoteCard key={n.id} note={n} />)}
          </div>
        </div>
      )}

      {/* Unpinned Notes */}
      {unpinnedNotes.length > 0 && (
        <div className="space-y-2">
          {pinnedNotes.length > 0 && (
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</p>
          )}
          <div className="grid gap-2">
            {unpinnedNotes.map(n => <NoteCard key={n.id} note={n} />)}
          </div>
        </div>
      )}

      {/* Empty State */}
      {filtered.length === 0 && !isCreating && (
        <div className="text-center py-16">
          <StickyNote className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {search || filterCategory !== "all" ? "No notes match your filter" : "No notes yet. Create your first note!"}
          </p>
        </div>
      )}

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
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
