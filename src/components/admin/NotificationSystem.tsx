import { useState } from "react";
import { 
  Bell, Plus, Send, Trash2, Edit, Calendar, Users, 
  Megaphone, Gift, AlertCircle, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AdminDialog, Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "./AdminDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi, type AdminNotification } from "@/lib/api";
import { toast } from "sonner";

type NotificationType = "announcement" | "update" | "promotion" | "system";
type TargetUsers = "all" | "admins" | "specific";

const typeConfig: Record<NotificationType, { label: string; icon: React.ElementType; color: string }> = {
  announcement: { label: "Announcement", icon: Megaphone, color: "bg-blue-500/20 text-blue-600" },
  update: { label: "App Update", icon: Bell, color: "bg-green-500/20 text-green-600" },
  promotion: { label: "Promotion", icon: Gift, color: "bg-purple-500/20 text-purple-600" },
  system: { label: "System", icon: AlertCircle, color: "bg-orange-500/20 text-orange-600" }
};

interface NotificationFormData {
  title: string;
  title_km: string;
  message: string;
  message_km: string;
  type: NotificationType;
  target_users: TargetUsers;
  publish_immediately: boolean;
  published_at: string;
  expires_at: string;
}

const defaultFormData: NotificationFormData = {
  title: "",
  title_km: "",
  message: "",
  message_km: "",
  type: "announcement",
  target_users: "all",
  publish_immediately: true,
  published_at: "",
  expires_at: ""
};

export const NotificationSystem = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingNotification, setEditingNotification] = useState<AdminNotification | null>(null);
  const [formData, setFormData] = useState<NotificationFormData>(defaultFormData);

  // Fetch notifications from Laravel API
  const { data, isLoading } = useQuery({
    queryKey: ["admin-notifications"],
    queryFn: () => notificationsApi.getAll(),
  });

  const notifications = data?.notifications || [];

  // Create/Update notification
  const saveNotification = useMutation({
    mutationFn: async (formData: NotificationFormData) => {
      const payload = {
        title: formData.title,
        title_km: formData.title_km || null,
        message: formData.message,
        message_km: formData.message_km || null,
        type: formData.type,
        target_users: formData.target_users,
        published_at: formData.publish_immediately ? new Date().toISOString() : (formData.published_at || null),
        expires_at: formData.expires_at || null,
        specific_user_ids: null,
      };

      if (editingNotification) {
        return notificationsApi.update(editingNotification.id, payload);
      } else {
        return notificationsApi.create(payload as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      toast.success(editingNotification ? "Notification updated" : "Notification created");
      handleCloseForm();
    },
    onError: () => {
      toast.error("Failed to save notification");
    }
  });

  // Delete notification
  const deleteNotification = useMutation({
    mutationFn: (id: number) => notificationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-notifications"] });
      toast.success("Notification deleted");
    },
    onError: () => {
      toast.error("Failed to delete notification");
    }
  });

  const handleOpenForm = (notification?: AdminNotification) => {
    if (notification) {
      setEditingNotification(notification);
      setFormData({
        title: notification.title,
        title_km: notification.title_km || "",
        message: notification.message,
        message_km: notification.message_km || "",
        type: notification.type,
        target_users: notification.target_users,
        publish_immediately: false,
        published_at: notification.published_at || "",
        expires_at: notification.expires_at || ""
      });
    } else {
      setEditingNotification(null);
      setFormData(defaultFormData);
    }
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingNotification(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      toast.error("Title and message are required");
      return;
    }
    saveNotification.mutate(formData);
  };

  const isPublished = (notification: AdminNotification) => {
    if (!notification.published_at) return false;
    return new Date(notification.published_at) <= new Date();
  };

  const isExpired = (notification: AdminNotification) => {
    if (!notification.expires_at) return false;
    return new Date(notification.expires_at) < new Date();
  };

  // Calculate stats
  const stats = {
    total: notifications.length,
    active: notifications.filter(n => isPublished(n) && !isExpired(n)).length,
    scheduled: notifications.filter(n => !isPublished(n)).length,
    expired: notifications.filter(n => isExpired(n)).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Notifications</h2>
          <p className="text-muted-foreground">Send announcements and updates to users</p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="w-4 h-4 mr-2" />
          Create Notification
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.scheduled}</div>
            <p className="text-sm text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-gray-500">{stats.expired}</div>
            <p className="text-sm text-muted-foreground">Expired</p>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {isLoading ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Loading notifications...
            </CardContent>
          </Card>
        ) : notifications.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No notifications yet. Create your first one!
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => {
            const typeInfo = typeConfig[notification.type];
            const TypeIcon = typeInfo.icon;
            const published = isPublished(notification);
            const expired = isExpired(notification);
            
            return (
              <Card key={notification.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeInfo.color}`}>
                        <TypeIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium">{notification.title}</h3>
                          <Badge className={typeInfo.color}>{typeInfo.label}</Badge>
                          {published && !expired && (
                            <Badge className="bg-green-500/20 text-green-600">Active</Badge>
                          )}
                          {!published && (
                            <Badge variant="outline">Scheduled</Badge>
                          )}
                          {expired && (
                            <Badge variant="secondary">Expired</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {notification.target_users === "all" ? "All users" : 
                             notification.target_users === "admins" ? "Admins only" : "Specific users"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(notification.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleOpenForm(notification)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this notification?")) {
                            deleteNotification.mutate(notification.id);
                          }
                        }}
                        disabled={deleteNotification.isPending}
                      >
                        {deleteNotification.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-destructive" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Create/Edit Form Dialog */}
      <AdminDialog 
        open={showForm} 
        onOpenChange={setShowForm} 
        title={editingNotification ? "Edit Notification" : "Create Notification"} 
        size="2xl"
        footer={
          <>
            <Button type="button" variant="outline" onClick={handleCloseForm}>Cancel</Button>
            <Button type="submit" form="notification-form" disabled={saveNotification.isPending}>
              {saveNotification.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              {saveNotification.isPending ? "Saving..." : editingNotification ? "Update" : "Publish"}
            </Button>
          </>
        }
      >
          <form id="notification-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Title (English) *</Label>
                <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Notification title" className="mt-1.5" required />
              </div>
              <div>
                <Label>Title (Khmer)</Label>
                <Input value={formData.title_km} onChange={(e) => setFormData({ ...formData, title_km: e.target.value })} placeholder="ចំណងជើង" className="mt-1.5" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Message (English) *</Label>
                <Textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} placeholder="Notification message" className="mt-1.5" rows={4} required />
              </div>
              <div>
                <Label>Message (Khmer)</Label>
                <Textarea value={formData.message_km} onChange={(e) => setFormData({ ...formData, message_km: e.target.value })} placeholder="សារ" className="mt-1.5" rows={4} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v as NotificationType })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="update">App Update</SelectItem>
                    <SelectItem value="promotion">Promotion</SelectItem>
                    <SelectItem value="system">System</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Target Audience</Label>
                <Select value={formData.target_users} onValueChange={(v) => setFormData({ ...formData, target_users: v as TargetUsers })}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Users</SelectItem>
                    <SelectItem value="admins">Admins Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="publish_immediately" checked={formData.publish_immediately} onCheckedChange={(checked) => setFormData({ ...formData, publish_immediately: checked })} />
              <Label htmlFor="publish_immediately">Publish Immediately</Label>
            </div>
            {!formData.publish_immediately && (
              <div>
                <Label>Scheduled Date</Label>
                <Input type="datetime-local" value={formData.published_at} onChange={(e) => setFormData({ ...formData, published_at: e.target.value })} className="mt-1.5" />
              </div>
            )}
            <div>
              <Label>Expiration Date (optional)</Label>
              <Input type="datetime-local" value={formData.expires_at} onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })} className="mt-1.5" />
            </div>
          </form>
      </AdminDialog>
    </div>
  );
};