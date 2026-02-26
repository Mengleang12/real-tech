import { useState, useEffect } from 'react';
import { Plus, Trash2, Users, Search, Tag, Percent, DollarSign, Calendar, X, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { couponsApi, adminUsersApi, type Coupon, type UserCoupon } from '@/lib/api';

export const CouponManagement = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [users, setUsers] = useState<{ id: number; full_name?: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [assignedUsers, setAssignedUsers] = useState<UserCoupon[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [userSearch, setUserSearch] = useState('');
  
  // Loading states
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    discount_type: 'fixed' as 'fixed' | 'percentage',
    discount_value: '',
    min_price: '',
    max_discount: '',
    expires_at: '',
    is_active: true,
  });

  useEffect(() => {
    loadCoupons();
    loadUsers();
  }, []);

  const loadCoupons = async () => {
    try {
      const data = await couponsApi.getAll();
      setCoupons(data.coupons);
    } catch (error) {
      toast.error('Failed to load coupons');
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await adminUsersApi.getAll();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to load users');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        discount_value: parseFloat(formData.discount_value),
        min_price: formData.min_price ? parseFloat(formData.min_price) : 0,
        max_discount: formData.max_discount ? parseFloat(formData.max_discount) : null,
        expires_at: formData.expires_at || null,
      };

      if (selectedCoupon) {
        await couponsApi.update(selectedCoupon.id, payload);
        toast.success('Coupon updated');
      } else {
        await couponsApi.create(payload);
        toast.success('Coupon created');
      }
      
      setShowForm(false);
      resetForm();
      loadCoupons();
    } catch (error) {
      toast.error('Failed to save coupon');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    setDeletingId(id);
    try {
      await couponsApi.delete(id);
      toast.success('Coupon deleted');
      loadCoupons();
    } catch (error) {
      toast.error('Failed to delete coupon');
    } finally {
      setDeletingId(null);
    }
  };

  const handleEdit = (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setFormData({
      code: coupon.code,
      name: coupon.name,
      description: coupon.description || '',
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value),
      min_price: coupon.min_price ? String(coupon.min_price) : '',
      max_discount: coupon.max_discount ? String(coupon.max_discount) : '',
      expires_at: coupon.expires_at ? coupon.expires_at.split('T')[0] : '',
      is_active: coupon.is_active,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setSelectedCoupon(null);
    setFormData({ code: '', name: '', description: '', discount_type: 'fixed', discount_value: '', min_price: '', max_discount: '', expires_at: '', is_active: true });
  };

  const openAssignDialog = async (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setSelectedUserIds([]);
    try {
      const data = await couponsApi.getCouponUsers(coupon.id);
      setAssignedUsers(data.user_coupons || []);
    } catch (error) {
      console.error('Failed to load assigned users');
    }
    setShowAssignDialog(true);
  };

  const handleAssignUsers = async () => {
    if (!selectedCoupon || selectedUserIds.length === 0) return;
    setAssigning(true);
    try {
      await couponsApi.assignToUsers(selectedCoupon.id, selectedUserIds);
      toast.success('Coupon assigned to users');
      const data = await couponsApi.getCouponUsers(selectedCoupon.id);
      setAssignedUsers(data.user_coupons || []);
      setSelectedUserIds([]);
      loadCoupons();
    } catch (error) {
      toast.error('Failed to assign coupon');
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveUserCoupon = async (userId: number) => {
    if (!selectedCoupon) return;
    setRemovingUserId(userId);
    try {
      await couponsApi.removeFromUser(selectedCoupon.id, userId);
      toast.success('Coupon removed from user');
      const data = await couponsApi.getCouponUsers(selectedCoupon.id);
      setAssignedUsers(data.user_coupons || []);
      loadCoupons();
    } catch (error) {
      toast.error('Failed to remove coupon');
    } finally {
      setRemovingUserId(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const assignedUserIds = assignedUsers.map(uc => uc.user_id);

  if (loading) {
    return <div className="p-6 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Tag className="w-5 h-5" /> Coupon Management
        </h2>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Create Coupon
        </Button>
      </div>

      {/* Coupons List */}
      <div className="grid gap-4">
        {coupons.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">No coupons yet. Create your first coupon!</div>
        ) : (
          coupons.map((coupon) => (
            <div key={coupon.id} className="bg-card border rounded-xl p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={coupon.is_active ? 'default' : 'secondary'}>{coupon.code}</Badge>
                    {coupon.discount_type === 'fixed' ? (
                      <Badge variant="outline" className="gap-1"><DollarSign className="w-3 h-3" />{parseFloat(String(coupon.discount_value)).toFixed(2)} off</Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1"><Percent className="w-3 h-3" />{coupon.discount_value}% off</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold">{coupon.name}</h3>
                  {coupon.description && <p className="text-sm text-muted-foreground mt-1">{coupon.description}</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {coupon.min_price > 0 && <span>Min: ${parseFloat(String(coupon.min_price)).toFixed(2)}</span>}
                    {coupon.expires_at && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Expires: {new Date(coupon.expires_at).toLocaleDateString()}</span>}
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{coupon.user_coupons_count || 0} assigned / {coupon.used_count || 0} used</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openAssignDialog(coupon)} className="gap-1">
                    <Users className="w-4 h-4" /> Assign
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleEdit(coupon)}>Edit</Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(coupon.id)} disabled={deletingId === coupon.id}>
                    {deletingId === coupon.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedCoupon ? 'Edit Coupon' : 'Create Coupon'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Code (auto-generated if empty)</Label>
                <Input value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })} placeholder="SAVE20" className="mt-1" />
              </div>
              <div>
                <Label>Discount Type</Label>
                <Select value={formData.discount_type} onValueChange={(v: 'fixed' | 'percentage') => setFormData({ ...formData, discount_type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Name *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="New User Discount" required className="mt-1" />
            </div>
            <div>
              <Label>Description</Label>
              <Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Get discount on your first purchase" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Discount Value *</Label>
                <Input type="number" step="0.01" value={formData.discount_value} onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })} placeholder={formData.discount_type === 'fixed' ? '5.00' : '10'} required className="mt-1" />
              </div>
              <div>
                <Label>Min Price ($)</Label>
                <Input type="number" step="0.01" value={formData.min_price} onChange={(e) => setFormData({ ...formData, min_price: e.target.value })} placeholder="0.00" className="mt-1" />
              </div>
            </div>
            {formData.discount_type === 'percentage' && (
              <div>
                <Label>Max Discount ($)</Label>
                <Input type="number" step="0.01" value={formData.max_discount} onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })} placeholder="No limit" className="mt-1" />
              </div>
            )}
            <div>
              <Label>Expires At</Label>
              <Input type="date" value={formData.expires_at} onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })} className="mt-1" />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={formData.is_active} onCheckedChange={(v) => setFormData({ ...formData, is_active: v })} />
              <Label>Active</Label>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)} disabled={saving}>Cancel</Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                {saving ? 'Saving...' : selectedCoupon ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Users Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Coupon: {selectedCoupon?.code}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Search users..." className="pl-9" />
            </div>
            <div className="border rounded-lg">
              <div className="p-2 border-b bg-muted/50 text-sm font-medium">Select Users to Assign</div>
              <ScrollArea className="h-48">
                <div className="p-2 space-y-1">
                  {filteredUsers.filter(u => !assignedUserIds.includes(u.id)).map((user) => (
                    <label key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted cursor-pointer">
                      <Checkbox
                        checked={selectedUserIds.includes(user.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedUserIds([...selectedUserIds, user.id]);
                          else setSelectedUserIds(selectedUserIds.filter(id => id !== user.id));
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{user.full_name || user.email}</div>
                        <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
            {selectedUserIds.length > 0 && (
              <Button onClick={handleAssignUsers} className="w-full gap-2" disabled={assigning}>
                {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {assigning ? 'Assigning...' : `Assign to ${selectedUserIds.length} User(s)`}
              </Button>
            )}
            {assignedUsers.length > 0 && (
              <div className="border rounded-lg">
                <div className="p-2 border-b bg-muted/50 text-sm font-medium">Assigned Users ({assignedUsers.length})</div>
                <ScrollArea className="h-32">
                  <div className="p-2 space-y-1">
                    {assignedUsers.map((uc) => (
                      <div key={uc.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-sm">{uc.user?.name || uc.user?.email}</div>
                          <div className="text-xs text-muted-foreground truncate">{uc.user?.email}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {uc.is_used && <Badge variant="secondary" className="text-xs">Used</Badge>}
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => handleRemoveUserCoupon(uc.user_id)} disabled={removingUserId === uc.user_id}>
                            {removingUserId === uc.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};