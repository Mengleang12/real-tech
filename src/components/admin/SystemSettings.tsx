import { useState, useEffect } from 'react';
import { Settings2, Globe, Shield, Database, Server, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';


const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';

interface SystemSettings {
  maintenance_mode: boolean;
  maintenance_message: string;
  allow_new_registrations: boolean;
  max_upload_size: number;
  auto_approve_apps: boolean;
  site_name: string;
  support_email: string;
  enable_analytics: boolean;
}

const defaultSettings: SystemSettings = {
  maintenance_mode: false,
  maintenance_message: 'We are currently performing scheduled maintenance. Please try again later.',
  allow_new_registrations: true,
  max_upload_size: 500,
  auto_approve_apps: false,
  site_name: 'Macsofy',
  support_email: 'support@macsofy.com',
  enable_analytics: true,
};

function getAuthHeaders(): Record<string, string> {
  const adminKey = localStorage.getItem('admin_api_key') || '';
  const userToken = localStorage.getItem('auth_token') || '';
  const token = adminKey || userToken;
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export function SystemSettingsPanel() {
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/settings`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load settings');
      const data = await res.json();
      setSettings({ ...defaultSettings, ...data });
    } catch (err: any) {
      toast.error(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const update = (key: keyof SystemSettings, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleAndSave = async (key: keyof SystemSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(newSettings),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }
      toast.success(`${key.replace(/_/g, ' ')} updated`);
    } catch (err: any) {
      setSettings(prev => ({ ...prev, [key]: !value }));
      toast.error(err.message || 'Failed to save setting');
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`${API_BASE_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(settings),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save settings');
      }
      toast.success('Settings saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-muted-foreground" />
            System Settings
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Configure global application settings</p>
        </div>
        <Button onClick={handleSave} size="sm" disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Saving...</> : 'Save Changes'}
        </Button>
      </div>

      {/* General */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">General</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Site Name</Label>
              <Input value={settings.site_name} onChange={e => update('site_name', e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Support Email</Label>
              <Input type="email" value={settings.support_email} onChange={e => update('support_email', e.target.value)} className="mt-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Access Control */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Access Control</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Allow New Registrations</p>
              <p className="text-xs text-muted-foreground">Enable user sign-up for new accounts</p>
            </div>
            <Switch checked={settings.allow_new_registrations} onCheckedChange={v => toggleAndSave('allow_new_registrations', v)} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-Approve App Submissions</p>
              <p className="text-xs text-muted-foreground">Skip manual review for new submissions</p>
            </div>
            <Switch checked={settings.auto_approve_apps} onCheckedChange={v => toggleAndSave('auto_approve_apps', v)} />
          </div>
        </div>
      </div>

      {/* Maintenance */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <Server className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Maintenance</h3>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-destructive">Maintenance Mode</p>
              <p className="text-xs text-muted-foreground">Users will see a maintenance page</p>
            </div>
            <Switch checked={settings.maintenance_mode} onCheckedChange={v => toggleAndSave('maintenance_mode', v)} />
          </div>
          {settings.maintenance_mode && (
            <div>
              <Label className="text-xs">Maintenance Message</Label>
              <Input value={settings.maintenance_message} onChange={e => update('maintenance_message', e.target.value)} className="mt-1" />
            </div>
          )}
        </div>
      </div>

      {/* Storage & Limits */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <Database className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Storage & Limits</h3>
        </div>
        <div className="p-4 space-y-4">
          <div>
            <Label className="text-xs">Max Upload Size (MB)</Label>
            <Input type="number" value={settings.max_upload_size} onChange={e => update('max_upload_size', parseInt(e.target.value) || 0)} className="mt-1 w-32" />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Enable Analytics Tracking</p>
              <p className="text-xs text-muted-foreground">Collect usage and performance data</p>
            </div>
            <Switch checked={settings.enable_analytics} onCheckedChange={v => toggleAndSave('enable_analytics', v)} />
          </div>
        </div>
      </div>

    </div>
  );
}

