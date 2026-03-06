import { useState } from "react";
import { Shield, Crown, User, Plus, Search, X, Check, Loader2, Settings2, Trash2, ChevronDown, ChevronRight, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AdminDialog, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "./AdminDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { rolesApi, permissionsApi, type UserWithRoles, type PermissionDef } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
const roleIcons: Record<string, React.ElementType> = {
  super_admin: ShieldAlert,
  admin: Crown,
  moderator: Shield,
  user: User,
};

const roleColors: Record<string, string> = {
  super_admin: "bg-amber-500/20 text-amber-600",
  admin: "bg-red-500/20 text-red-600",
  moderator: "bg-blue-500/20 text-blue-600",
  user: "bg-muted text-muted-foreground",
};

export const RoleManagement = () => {
  const queryClient = useQueryClient();
  const { isSuperAdmin: isAuthSuperAdmin } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<"assign" | "permissions">("assign");

  // Check admin roles from localStorage for legacy admin
  const adminRoles: string[] = (() => {
    try { return JSON.parse(localStorage.getItem('admin_roles') || '[]'); } catch { return []; }
  })();
  const isSuperAdmin = isAuthSuperAdmin || adminRoles.includes('super_admin') || adminRoles.includes('admin');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Role Management</h2>
        <p className="text-muted-foreground">Manage user roles and configure permissions</p>
      </div>

      <Tabs value={activeSubTab} onValueChange={(v) => setActiveSubTab(v as any)}>
        <TabsList>
          <TabsTrigger value="assign">Assign Roles</TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="permissions">Role Permissions</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="assign" className="mt-4">
          <AssignRolesTab />
        </TabsContent>
        {isSuperAdmin && (
          <TabsContent value="permissions" className="mt-4">
            <PermissionsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

// ─── Assign Roles Tab ────────────────────────────────────────────────────────
const AssignRolesTab = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newRoleUserId, setNewRoleUserId] = useState("");
  const [newRole, setNewRole] = useState("moderator");

  const { data: rolesData, isLoading } = useQuery({
    queryKey: ["admin-user-roles"],
    queryFn: () => rolesApi.getAll(),
  });

  const { data: usersData } = useQuery({
    queryKey: ["admin-staff-users"],
    queryFn: () => rolesApi.listUsers(),
  });

  const { data: permData } = useQuery({
    queryKey: ["admin-permissions"],
    queryFn: () => permissionsApi.getAll(),
  });

  const userRoles = rolesData?.users || [];
  const allUsers = usersData?.users || [];
  const availableRoles = permData?.role_names || ["admin", "moderator", "user"];

  const addRole = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) => rolesApi.add(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("Role added successfully");
      setShowAddDialog(false);
    },
    onError: (error: any) => toast.error(error.message || "Failed to add role"),
  });

  const removeRole = useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: string }) => rolesApi.remove(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-user-roles"] });
      toast.success("Role removed");
    },
    onError: () => toast.error("Failed to remove role"),
  });

  const filteredUsers = userRoles.filter(user =>
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getRoleColor = (role: string) => roleColors[role] || "bg-purple-500/20 text-purple-600";
  const getRoleIcon = (role: string) => roleIcons[role] || Shield;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search users..." className="pl-9" />
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />Assign Role
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />Loading...</CardContent></Card>
        ) : filteredUsers.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No users with roles</CardContent></Card>
        ) : (
          filteredUsers.map((user) => (
            <Card key={user.user_id}>
              <CardContent className="py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium truncate">{user.full_name || user.email}</h3>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {user.roles.map((role) => {
                    const Icon = getRoleIcon(role);
                    return (
                      <div key={role} className="flex items-center gap-1">
                        <Badge className={getRoleColor(role)}>
                          <Icon className="w-3 h-3 mr-1" />
                          {role}
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeRole.mutate({ userId: user.user_id, role })} disabled={removeRole.isPending}>
                          {removeRole.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3 text-destructive" />}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <AdminDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog} 
        title="Assign Role" 
        description="Select a user and role to assign"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={() => addRole.mutate({ userId: parseInt(newRoleUserId), role: newRole })} disabled={!newRoleUserId || addRole.isPending}>
              {addRole.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              {addRole.isPending ? "Assigning..." : "Assign"}
            </Button>
          </>
        }
      >
          <div className="space-y-4">
            <Select value={newRoleUserId} onValueChange={setNewRoleUserId}>
              <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
              <SelectContent>
                {allUsers.map((u) => <SelectItem key={u.id} value={String(u.id)}>{u.username || u.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={newRole} onValueChange={setNewRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {availableRoles.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
      </AdminDialog>
    </div>
  );
};

// ─── Permissions Tab ─────────────────────────────────────────────────────────
const PermissionsTab = () => {
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["admin-permissions"],
    queryFn: () => permissionsApi.getAll(),
  });

  const createRole = useMutation({
    mutationFn: () => permissionsApi.createRole(newRoleName, selectedPerms),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-permissions"] });
      toast.success(`Role "${newRoleName}" created`);
      setShowCreateDialog(false);
      setNewRoleName("");
      setSelectedPerms([]);
    },
    onError: (error: any) => toast.error(error.message || "Failed to create role"),
  });

  const updateRole = useMutation({
    mutationFn: (role: string) => permissionsApi.updateRole(role, editPerms),
    onSuccess: (_, role) => {
      queryClient.invalidateQueries({ queryKey: ["admin-permissions"] });
      toast.success(`Permissions updated for "${role}"`);
      setEditingRole(null);
    },
    onError: (error: any) => toast.error(error.message || "Failed to update"),
  });

  const deleteRole = useMutation({
    mutationFn: (role: string) => permissionsApi.deleteRole(role),
    onSuccess: (_, role) => {
      queryClient.invalidateQueries({ queryKey: ["admin-permissions"] });
      toast.success(`Role "${role}" deleted`);
    },
    onError: (error: any) => toast.error(error.message || "Failed to delete role"),
  });

  const allPermissions = data?.permissions || [];
  const roles = data?.roles || {};
  const roleNames = data?.role_names || [];

  // Group permissions by group
  const permissionGroups = allPermissions.reduce<Record<string, PermissionDef[]>>((acc, perm) => {
    if (!acc[perm.group]) acc[perm.group] = [];
    acc[perm.group].push(perm);
    return acc;
  }, {});

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const handleEditRole = (role: string) => {
    setEditingRole(role);
    setEditPerms(roles[role] || []);
  };

  const toggleEditPerm = (perm: string) => {
    setEditPerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  const toggleSelectedPerm = (perm: string) => {
    setSelectedPerms(prev => prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />Create Role
        </Button>
      </div>

      {/* Role cards */}
      <div className="grid gap-4">
        {roleNames.map(roleName => {
          const perms = roles[roleName] || [];
          const isEditing = editingRole === roleName;
          const isBuiltIn = roleName === 'admin' || roleName === 'user';

          return (
            <Card key={roleName}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${roleColors[roleName] || 'bg-purple-500/20 text-purple-600'}`}>
                      {(() => { const Icon = roleIcons[roleName] || Shield; return <Icon className="w-4 h-4" />; })()}
                    </div>
                    <div>
                      <CardTitle className="text-base capitalize">{roleName}</CardTitle>
                      <p className="text-xs text-muted-foreground">{perms.length} permissions</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isEditing ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setEditingRole(null)}>Cancel</Button>
                        <Button size="sm" onClick={() => updateRole.mutate(roleName)} disabled={updateRole.isPending}>
                          {updateRole.isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Check className="w-3 h-3 mr-1" />}
                          Save
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleEditRole(roleName)}>
                          <Settings2 className="w-3 h-3 mr-1" />Edit
                        </Button>
                        {!isBuiltIn && (
                          <Button size="sm" variant="destructive" onClick={() => deleteRole.mutate(roleName)} disabled={deleteRole.isPending}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-3">
                    {Object.entries(permissionGroups).map(([group, groupPerms]) => (
                      <div key={group}>
                        <button
                          onClick={() => toggleGroup(group)}
                          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground mb-2"
                        >
                          {expandedGroups[group] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                          {group}
                        </button>
                        {(expandedGroups[group] !== false) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-5">
                            {groupPerms.map(perm => (
                              <div key={perm.key} className="flex items-center gap-2">
                                <Switch
                                  checked={editPerms.includes(perm.key)}
                                  onCheckedChange={() => toggleEditPerm(perm.key)}
                                  id={`edit-${roleName}-${perm.key}`}
                                />
                                <Label htmlFor={`edit-${roleName}-${perm.key}`} className="text-sm cursor-pointer">
                                  {perm.label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {perms.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No permissions assigned</p>
                    ) : (
                      perms.map(p => (
                        <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AdminDialog 
        open={showCreateDialog} 
        onOpenChange={setShowCreateDialog} 
        title="Create New Role" 
        description="Define a custom role with specific permissions" 
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
            <Button onClick={() => createRole.mutate()} disabled={!newRoleName || selectedPerms.length === 0 || createRole.isPending}>
              {createRole.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Create Role
            </Button>
          </>
        }
      >
          <div className="space-y-4">
            <div>
              <Label>Role Name</Label>
              <Input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value.toLowerCase().replace(/[^a-z_]/g, ''))}
                placeholder="e.g. editor, support"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Lowercase letters and underscores only</p>
            </div>
            <div>
              <Label className="mb-2 block">Permissions</Label>
              <div className="space-y-3">
                {Object.entries(permissionGroups).map(([group, groupPerms]) => (
                  <div key={group} className="border border-border rounded-lg p-3">
                    <p className="text-sm font-medium mb-2">{group}</p>
                    <div className="grid grid-cols-1 gap-2">
                      {groupPerms.map(perm => (
                        <div key={perm.key} className="flex items-center gap-2">
                          <Switch
                            checked={selectedPerms.includes(perm.key)}
                            onCheckedChange={() => toggleSelectedPerm(perm.key)}
                            id={`new-${perm.key}`}
                          />
                          <Label htmlFor={`new-${perm.key}`} className="text-sm cursor-pointer">{perm.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
      </AdminDialog>
    </div>
  );
};
