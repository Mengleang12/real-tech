import { useState, useEffect } from 'react';
import { Settings2, Globe, Shield, Bell, Database, Server, Loader2, HardDrive, Save, RefreshCw, CheckCircle2, XCircle, ServerCog } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { bunnyApi, type BunnyConfig, type BunnyTestResult } from '@/lib/api';

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

      {/* Bunny Storage & CDN */}
      <BunnyStorageSection />
    </div>
  );
}

// ─── Bunny Storage Connection Section ─────────────────────────────────────────

function BunnyStorageSection() {
  const [config, setConfig] = useState<BunnyConfig & { token_auth_configured?: boolean; token_expiry?: number; api_key_masked?: string | null; token_auth_key_masked?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<BunnyTestResult | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [storageHost, setStorageHost] = useState('');
  const [cdnHost, setCdnHost] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [tokenAuthKey, setTokenAuthKey] = useState('');
  const [tokenExpiry, setTokenExpiry] = useState('3600');

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const c = await bunnyApi.getConfig();
      setConfig(c as any);
      setZoneName(c.zone_name || '');
      setStorageHost(c.storage_host || '');
      setCdnHost(c.cdn_host || '');
      setTokenExpiry(String((c as any).token_expiry || '3600'));
    } catch { setConfig(null); }
    finally { setLoading(false); }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const data: Record<string, string> = { zone_name: zoneName, storage_host: storageHost, cdn_host: cdnHost };
      if (apiKey) data.api_key = apiKey;
      if (tokenAuthKey) data.token_auth_key = tokenAuthKey;
      data.token_expiry = tokenExpiry;
      await bunnyApi.updateConfig(data);
      toast.success('Bunny Storage settings saved!');
      setApiKey('');
      setTokenAuthKey('');
      await loadConfig();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save settings');
    } finally { setSaving(false); }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await bunnyApi.testConnection();
      setTestResult(result);
      toast[result.success ? 'success' : 'error'](result.success ? 'Connection successful!' : (result.error || 'Connection failed'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection test failed';
      setTestResult({ success: false, error: msg });
      toast.error(msg);
    } finally { setTesting(false); }
  };

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Bunny Storage & CDN</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium">Bunny Storage & CDN</h3>
        </div>
        <Badge variant={config?.configured ? "default" : "destructive"} className="gap-1 text-[10px]">
          {config?.configured ? <><CheckCircle2 className="w-3 h-3" /> Connected</> : <><XCircle className="w-3 h-3" /> Not Connected</>}
        </Badge>
      </div>
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Storage Zone Name</Label>
            <Input value={zoneName} onChange={e => setZoneName(e.target.value)} placeholder="my-storage-zone" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Storage Hostname</Label>
            <Input value={storageHost} onChange={e => setStorageHost(e.target.value)} placeholder="storage.bunnycdn.com" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">CDN Hostname</Label>
            <Input value={cdnHost} onChange={e => setCdnHost(e.target.value)} placeholder="my-zone.b-cdn.net" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">API Key</Label>
            <Input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder={config?.api_key_masked ? `Saved: ${config.api_key_masked}` : 'Enter API key'} className="mt-1" />
          </div>
        </div>

        {/* Token Authentication */}
        <div className="border-t border-border/50 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <h4 className="text-sm font-medium">Token Authentication</h4>
            {config?.token_auth_configured && (
              <Badge variant="default" className="text-[10px] gap-1">
                <CheckCircle2 className="w-3 h-3" /> Enabled
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Enable token authentication to generate time-limited signed download URLs. This prevents direct URL sharing.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Security Key</Label>
              <Input type="password" value={tokenAuthKey} onChange={e => setTokenAuthKey(e.target.value)} placeholder={config?.token_auth_key_masked ? `Saved: ${config.token_auth_key_masked}` : 'From Pull Zone → Security'} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Link Expiry (seconds)</Label>
              <Input type="number" value={tokenExpiry} onChange={e => setTokenExpiry(e.target.value)} placeholder="3600" className="mt-1" />
              <p className="text-[10px] text-muted-foreground mt-1">{Math.round(parseInt(tokenExpiry || '3600') / 60)} minutes</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between pt-1">
          <Button variant="outline" size="sm" onClick={testConnection} disabled={testing || !config?.configured} className="gap-1.5">
            {testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            {testing ? 'Testing...' : 'Test Connection'}
          </Button>
          <Button size="sm" onClick={saveSettings} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
        {testResult && (
          <div className={`rounded-lg p-3 border text-sm ${testResult.success ? 'bg-green-500/5 border-green-500/20' : 'bg-destructive/5 border-destructive/20'}`}>
            <div className="flex items-center gap-2">
              {testResult.success ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <XCircle className="w-4 h-4 text-destructive shrink-0" />}
              <span className={testResult.success ? 'text-green-600 dark:text-green-400' : 'text-destructive'}>
                {testResult.success ? `Connected — ${testResult.file_count} files in root` : testResult.error}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
