import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Search, Plus, Edit, Trash2, Loader2, Eye, EyeOff, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AdminDialog } from "./AdminDialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { staffUsersApi, permissionsApi } from "@/lib/api";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel,
} from "@/components/ui/alert-dialog";

interface StaffUser {
  id: number;
  username: string;
  roles: string[];
  created_at: string;
}

const roleColors: Record<string, string> = {
  super_admin: "bg-amber-500/20 text-amber-600",
  admin: "bg-red-500/20 text-red-600",
  moderator: "bg-blue-500/20 text-blue-600",
  user: "bg-muted text-muted-foreground",
};

export const StaffUserManagement = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<StaffUser | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", roles: [] as string[] });
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-staff-users", searchQuery],
    queryFn: () => staffUsersApi.getAll(searchQuery || undefined),
  });

  const { data: permData } = useQuery({
    queryKey: ["admin-permissions"],
    queryFn: () => permissionsApi.getAll(),
  });

  const users = data?.users || [];
  const availableRoles = permData?.role_names || ["admin", "moderator", "user"];

  const openForm = (user?: StaffUser) => {
    if (user) {
      setEditingUser(user);
      setForm({ username: user.username, password: "", roles: [...user.roles] });
    } else {
      setEditingUser(null);
      setForm({ username: "", password: "", roles: [] });
    }
    setShowPassword(false);
    setShowForm(true);
  };

  const toggleRole = (role: string) => {
    setForm(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role],
    }));
  };

  const handleSave = async () => {
    if (!form.username.trim()) { toast.error("Username is required"); return; }
    if (!editingUser && !form.password.trim()) { toast.error("Password is required for new users"); return; }
    setSaving(true);
    try {
      if (editingUser) {
        const updateData: any = { username: form.username, roles: form.roles };
        if (form.password.trim()) updateData.password = form.password;
        await staffUsersApi.update(editingUser.id, updateData);
        toast.success("User updated");
      } else {
        await staffUsersApi.create({ username: form.username, password: form.password, roles: form.roles });
        toast.success("User created");
      }
      setShowForm(false);
      queryClient.invalidateQueries({ queryKey: ["admin-staff-users"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to save user");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingUser) return;
    try {
      await staffUsersApi.delete(deletingUser.id);
      toast.success("User deleted");
      setDeletingUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin-staff-users"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete user");
    }
  };

  const getRoleColor = (role: string) => roleColors[role] || "bg-purple-500/20 text-purple-600";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Staff Users</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage admin and staff accounts</p>
        </div>
        <Button size="sm" onClick={() => openForm()} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New User
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="border border-border rounded-md bg-card p-4 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 border border-border rounded-md bg-card">
          <Users className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No staff users found</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Username</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Roles</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{user.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {user.roles.length === 0 ? (
                          <span className="text-xs text-muted-foreground">No roles</span>
                        ) : (
                          user.roles.map(role => (
                            <Badge key={role} className={`text-xs ${getRoleColor(role)}`}>
                              <Shield className="w-3 h-3 mr-1" />
                              {role}
                            </Badge>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openForm(user)} title="Edit">
                          <Edit className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeletingUser(user)} title="Delete">
                          <Trash2 className="w-3.5 h-3.5 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <AdminDialog
        open={showForm}
        onOpenChange={setShowForm}
        title={editingUser ? "Edit Staff User" : "New Staff User"}
        description={editingUser ? "Update user details and roles" : "Create a new staff account"}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {saving ? "Saving..." : editingUser ? "Update" : "Create"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <Label>Username</Label>
            <Input
              value={form.username}
              onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
              placeholder="Enter username"
              className="mt-1"
            />
          </div>
          <div>
            <Label>{editingUser ? "New Password (leave blank to keep)" : "Password"}</Label>
            <div className="relative mt-1">
              <Input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder={editingUser ? "Leave blank to keep current" : "Enter password"}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="mb-2 block">Roles</Label>
            <div className="space-y-2">
              {["super_admin", ...availableRoles].filter((v, i, a) => a.indexOf(v) === i).map(role => (
                <div key={role} className="flex items-center gap-2">
                  <Switch
                    checked={form.roles.includes(role)}
                    onCheckedChange={() => toggleRole(role)}
                    id={`role-${role}`}
                  />
                  <Label htmlFor={`role-${role}`} className="text-sm cursor-pointer capitalize">
                    {role.replace(/_/g, ' ')}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AdminDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingUser} onOpenChange={(open) => { if (!open) setDeletingUser(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingUser?.username}</strong>? This action cannot be undone.
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
