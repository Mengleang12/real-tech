import { useState, useEffect, useRef } from 'react';
import { clearBrandingCache } from '@/lib/invoice-branding';
import { clearLabelSizeCache } from '@/lib/label-settings';
import { Settings2, Globe, Shield, Database, Server, Loader2, Palette, ImageIcon, Phone, MapPin, Share2, FileText, Upload, X, Printer, Wifi, WifiOff, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { initPrinterService, isPrinterServiceAvailable, printLabels, type PrinterStatus } from '@/lib/printer-service';
import { Input } from '@/components/ui/input';
import { NumberInput } from '@/components/ui/number-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://api.realtechcomputer.com';

interface SystemSettings {
  maintenance_mode: boolean;
  maintenance_message: string;
  allow_new_registrations: boolean;
  max_upload_size: number;
  auto_approve_apps: boolean;
  site_name: string;
  site_tagline: string;
  support_email: string;
  support_phone: string;
  site_address: string;
  site_logo_url: string;
  primary_color: string;
  default_currency: string;
  facebook_url: string;
  telegram_url: string;
  instagram_url: string;
  tiktok_url: string;
  enable_analytics: boolean;
  invoice_footer_text: string;
  payment_qr_urls: string[];
  payment_qr_size: number;
  label_width: number;
  label_height: number;
  google_maps_api_key: string;
}

function hexToHsl(hex: string): string {
  let r = 0, g = 0, b = 0;
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  r = parseInt(hex.substring(0, 2), 16) / 255;
  g = parseInt(hex.substring(2, 4), 16) / 255;
  b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyPrimaryColor(hex: string) {
  if (!hex || !/^#[0-9a-fA-F]{3,6}$/.test(hex)) return;
  const hsl = hexToHsl(hex);
  document.documentElement.style.setProperty('--primary', hsl);
  document.documentElement.style.setProperty('--ring', hsl);
}

const defaultSettings: SystemSettings = {
  maintenance_mode: false,
  maintenance_message: 'We are currently performing scheduled maintenance. Please try again later.',
  allow_new_registrations: true,
  max_upload_size: 500,
  auto_approve_apps: false,
  site_name: 'Realtech Computer',
  site_tagline: 'Software & Digital Products',
  support_email: 'support@realtechcomputer.com',
  support_phone: '',
  site_address: '',
  site_logo_url: '',
  primary_color: '#2563eb',
  default_currency: 'USD',
  facebook_url: '',
  telegram_url: '',
  instagram_url: '',
  tiktok_url: '',
  enable_analytics: true,
  invoice_footer_text: 'Thank you for your business!',
  payment_qr_urls: [],
  payment_qr_size: 72,
  label_width: 40,
  label_height: 30,
  google_maps_api_key: '',
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
  const [uploading, setUploading] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  // Printer state
  const PREFERRED_PRINTER_KEY = 'label-printer-name';
  const [printerStatus, setPrinterStatus] = useState<PrinterStatus>({ available: false, printers: [] });
  const [checkingPrinter, setCheckingPrinter] = useState(false);
  const [testPrinting, setTestPrinting] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState(() => localStorage.getItem(PREFERRED_PRINTER_KEY) || '');

  const checkPrinterConnection = async () => {
    setCheckingPrinter(true);
    try {
      const status = await initPrinterService();
      setPrinterStatus(status);

      if (status.available) {
        const preferred = localStorage.getItem(PREFERRED_PRINTER_KEY);
        const resolved = preferred && status.printers.includes(preferred)
          ? preferred
          : (status.printerName || status.printers[0] || '');
        if (resolved) {
          setSelectedPrinter(resolved);
          localStorage.setItem(PREFERRED_PRINTER_KEY, resolved);
        }
      }
      if (status.available) {
        toast.success(`Printer connected: ${status.printerName || 'Unknown'}`);
      } else {
        toast.error('No printer detected. Make sure the Detonger driver is installed and the printer is connected.');
      }
    } catch {
      setPrinterStatus({ available: false, printers: [] });
      toast.error('Failed to detect printer');
    }
    setCheckingPrinter(false);
  };

  const handleTestPrint = async () => {
    if (!printerStatus.available || !selectedPrinter) {
      toast.error('Connect a printer first');
      return;
    }
    setTestPrinting(true);
    try {
      const result = await printLabels({
        printerName: selectedPrinter,
        labelWidth: settings.label_width || 40,
        labelHeight: settings.label_height || 30,
        labels: [{
          name: 'Test Product',
          variant: 'Test Variant',
          barcode: '1234567890',
          serial: 'SN-TEST-001',
          price: 99.99,
        }],
      });
      if (result.success) {
        toast.success('Test label printed successfully!');
      } else {
        toast.error(result.error || 'Test print failed');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Test print failed');
    }
    setTestPrinting(false);
  };

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
      // Only pick keys we manage to avoid storing sensitive data
      const managed: Partial<SystemSettings> = {};
      for (const key of Object.keys(defaultSettings) as (keyof SystemSettings)[]) {
        if (key in data) (managed as any)[key] = data[key];
      }
      const merged = { ...defaultSettings, ...managed };
      setSettings(merged);
      if (merged.primary_color) applyPrimaryColor(merged.primary_color);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const update = (key: keyof SystemSettings, value: string | number | boolean | string[]) => {
    setSettings(prev => ({ ...prev, [key]: value } as SystemSettings));
  };

  const toggleAndSave = async (key: keyof SystemSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/settings`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ [key]: value }),
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
        body: JSON.stringify({
          maintenance_mode: settings.maintenance_mode,
          maintenance_message: settings.maintenance_message,
          allow_new_registrations: settings.allow_new_registrations,
          max_upload_size: settings.max_upload_size,
          auto_approve_apps: settings.auto_approve_apps,
          site_name: settings.site_name,
          site_tagline: settings.site_tagline,
          support_email: settings.support_email,
          support_phone: settings.support_phone,
          site_address: settings.site_address,
          site_logo_url: settings.site_logo_url,
          primary_color: settings.primary_color,
          default_currency: settings.default_currency,
          facebook_url: settings.facebook_url,
          telegram_url: settings.telegram_url,
          instagram_url: settings.instagram_url,
          tiktok_url: settings.tiktok_url,
          enable_analytics: settings.enable_analytics,
          invoice_footer_text: settings.invoice_footer_text,
          payment_qr_urls: settings.payment_qr_urls,
          payment_qr_size: settings.payment_qr_size,
          label_width: settings.label_width,
          label_height: settings.label_height,
          google_maps_api_key: settings.google_maps_api_key,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save settings');
      }
      applyPrimaryColor(settings.primary_color);
      clearBrandingCache();
      clearLabelSizeCache();
      toast.success('Settings saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'icons');
      const token = localStorage.getItem('admin_api_key') || localStorage.getItem('auth_token') || '';
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      update('site_logo_url', data.url);
      toast.success('Logo uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if ((settings.payment_qr_urls || []).length >= 3) { toast.error('Maximum 3 QR images allowed'); return; }
    try {
      setUploadingQr(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'icons');
      const token = localStorage.getItem('admin_api_key') || localStorage.getItem('auth_token') || '';
      const res = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: { 'Accept': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      update('payment_qr_urls', [...(settings.payment_qr_urls || []), data.url]);
      toast.success('QR image uploaded');
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload QR image');
    } finally {
      setUploadingQr(false);
      if (qrInputRef.current) qrInputRef.current.value = '';
    }
  };

  const removeQrImage = (index: number) => {
    const updated = [...(settings.payment_qr_urls || [])];
    updated.splice(index, 1);
    update('payment_qr_urls', updated);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
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

      <Tabs defaultValue="branding" className="w-full">
        <TabsList className="w-full grid grid-cols-4 h-9">
          <TabsTrigger value="branding" className="text-xs gap-1.5"><Palette className="w-3.5 h-3.5" /> Branding</TabsTrigger>
          <TabsTrigger value="general" className="text-xs gap-1.5"><Globe className="w-3.5 h-3.5" /> General</TabsTrigger>
          <TabsTrigger value="access" className="text-xs gap-1.5"><Shield className="w-3.5 h-3.5" /> Access</TabsTrigger>
          <TabsTrigger value="system" className="text-xs gap-1.5"><Server className="w-3.5 h-3.5" /> System</TabsTrigger>
        </TabsList>

        {/* ─── Branding Tab ─── */}
        <TabsContent value="branding" className="space-y-4 mt-4">
          {/* Logo */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Logo</h3>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-4">
                {settings.site_logo_url ? (
                  <div className="relative group">
                    <img src={settings.site_logo_url} alt="Site Logo" className="w-20 h-20 object-contain rounded-lg border border-border bg-muted/20 p-1" />
                    <button
                      onClick={() => update('site_logo_url', '')}
                      className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => logoInputRef.current?.click()}
                    className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  >
                    {uploading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
                    <span className="text-[10px] text-muted-foreground">Upload</span>
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium">System Logo</p>
                  <p className="text-xs text-muted-foreground">Used in invoices, emails, and the storefront. Recommended: square PNG, min 200×200px.</p>
                  {settings.site_logo_url && (
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => logoInputRef.current?.click()} disabled={uploading}>
                      {uploading ? 'Uploading...' : 'Change Logo'}
                    </Button>
                  )}
                </div>
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </div>
          </div>

          {/* Identity */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Identity</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Business Name</Label>
                  <Input value={settings.site_name} onChange={e => update('site_name', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Tagline / Subtitle</Label>
                  <Input value={settings.site_tagline} onChange={e => update('site_tagline', e.target.value)} className="mt-1" placeholder="e.g. Software & Digital Products" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Default Currency</Label>
                  <Input value={settings.default_currency} onChange={e => update('default_currency', e.target.value)} className="mt-1" placeholder="USD" />
                </div>
                <div>
                  <Label className="text-xs flex items-center gap-1.5"><Palette className="w-3 h-3" /> Primary Color</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      type="color"
                      value={settings.primary_color}
                      onChange={e => update('primary_color', e.target.value)}
                      className="w-9 h-9 rounded-md border border-border cursor-pointer p-0.5"
                    />
                    <Input value={settings.primary_color} onChange={e => update('primary_color', e.target.value)} className="flex-1 font-mono text-sm" placeholder="#2563eb" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact & Address */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Contact & Address</h3>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Support Email</Label>
                  <Input type="email" value={settings.support_email} onChange={e => update('support_email', e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs">Support Phone</Label>
                  <Input value={settings.support_phone} onChange={e => update('support_phone', e.target.value)} className="mt-1" placeholder="+855 12 345 678" />
                </div>
              </div>
              <div>
                <Label className="text-xs flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Business Address</Label>
                <Textarea value={settings.site_address} onChange={e => update('site_address', e.target.value)} className="mt-1 min-h-[60px]" placeholder="Street, City, Country" />
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Social Links</h3>
            </div>
            <div className="p-4 space-y-3">
              <div>
                <Label className="text-xs">Facebook</Label>
                <Input value={settings.facebook_url} onChange={e => update('facebook_url', e.target.value)} className="mt-1" placeholder="https://facebook.com/..." />
              </div>
              <div>
                <Label className="text-xs">Telegram</Label>
                <Input value={settings.telegram_url} onChange={e => update('telegram_url', e.target.value)} className="mt-1" placeholder="https://t.me/..." />
              </div>
              <div>
                <Label className="text-xs">Instagram</Label>
                <Input value={settings.instagram_url} onChange={e => update('instagram_url', e.target.value)} className="mt-1" placeholder="https://instagram.com/..." />
              </div>
              <div>
                <Label className="text-xs">TikTok</Label>
                <Input value={settings.tiktok_url} onChange={e => update('tiktok_url', e.target.value)} className="mt-1" placeholder="https://tiktok.com/@..." />
              </div>
            </div>
          </div>

          {/* Invoice */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Invoice</h3>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <Label className="text-xs">Invoice Footer Text</Label>
                <Input value={settings.invoice_footer_text} onChange={e => update('invoice_footer_text', e.target.value)} className="mt-1" placeholder="Thank you for your business!" />
              </div>
              <div>
                <Label className="text-xs">Payment QR Images</Label>
                <p className="text-[11px] text-muted-foreground mb-2">Upload up to 3 QR code images for payment methods. These will appear at the bottom of printed invoices.</p>
                <div className="flex items-start gap-3 flex-wrap">
                  {(settings.payment_qr_urls || []).map((url, i) => (
                    <div key={i} className="relative group">
                      <img src={url} alt={`Payment QR ${i + 1}`} className="w-20 h-20 object-contain rounded-lg border border-border bg-muted/20 p-1" />
                      <button
                        onClick={() => removeQrImage(i)}
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {(settings.payment_qr_urls || []).length < 3 && (
                    <div
                      onClick={() => qrInputRef.current?.click()}
                      className="w-20 h-20 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                    >
                      {uploadingQr ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
                      <span className="text-[10px] text-muted-foreground">Add QR</span>
                    </div>
                  )}
                </div>
                <input ref={qrInputRef} type="file" accept="image/*" className="hidden" onChange={handleQrUpload} />
              </div>
              <div>
                <Label className="text-xs">QR Size on Invoice (px)</Label>
                <div className="flex items-center gap-3 mt-1">
                  <NumberInput value={settings.payment_qr_size} onChange={v => update('payment_qr_size', v)} min={40} max={200} step={4} />
                  <span className="text-xs text-muted-foreground">{settings.payment_qr_size}×{settings.payment_qr_size}px</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ─── General Tab ─── */}
        <TabsContent value="general" className="space-y-4 mt-4">
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
        </TabsContent>

        {/* ─── Access Tab ─── */}
        <TabsContent value="access" className="space-y-4 mt-4">
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
        </TabsContent>

        {/* ─── System Tab ─── */}
        <TabsContent value="system" className="space-y-4 mt-4">
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

          {/* Printer */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
              <Printer className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Label Printer</h3>
            </div>
            <div className="p-4 space-y-4">
              {/* Connection status */}
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                {checkingPrinter ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Detecting printer service...
                  </div>
                ) : printerStatus.available ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Printer Connected</p>
                      <p className="text-xs text-muted-foreground">
                        {printerStatus.printers.length} printer{printerStatus.printers.length !== 1 ? 's' : ''} found
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-destructive shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-destructive">Not Connected</p>
                      <p className="text-xs text-muted-foreground">Install the Detonger P1P driver and connect via USB</p>
                    </div>
                  </>
                )}
                <Button variant="outline" size="sm" className="h-8 gap-1.5 shrink-0" onClick={checkPrinterConnection} disabled={checkingPrinter}>
                  <RefreshCw className={`w-3.5 h-3.5 ${checkingPrinter ? 'animate-spin' : ''}`} />
                  {checkingPrinter ? 'Checking...' : 'Check Connection'}
                </Button>
              </div>

              {/* Printer selector */}
              {printerStatus.available && printerStatus.printers.length > 0 && (
                <div>
                  <Label className="text-xs">Select Printer</Label>
                  <select
                    value={selectedPrinter}
                    onChange={e => {
                      const next = e.target.value;
                      setSelectedPrinter(next);
                      localStorage.setItem(PREFERRED_PRINTER_KEY, next);
                    }}
                    className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {printerStatus.printers.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Label paper size */}
              {printerStatus.available && (
                <div>
                  <Label className="text-xs">Default Label Paper Size (mm)</Label>
                  <div className="flex gap-2 mt-1.5">
                    {[
                      { w: 30, h: 20, label: '30×20' },
                      { w: 40, h: 30, label: '40×30' },
                      { w: 50, h: 30, label: '50×30' },
                      { w: 50, h: 40, label: '50×40' },
                      { w: 60, h: 40, label: '60×40' },
                    ].map(opt => {
                      const active = settings.label_width === opt.w && settings.label_height === opt.h;
                      return (
                        <button
                          key={`${opt.w}x${opt.h}`}
                          type="button"
                          onClick={() => { update('label_width', opt.w); update('label_height', opt.h); }}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors cursor-pointer ${
                            active
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">This size is used globally for all label printing (serial labels, manual labels, etc.)</p>
                </div>
              )}

              {/* Test print */}
              {printerStatus.available && (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Test Print</p>
                    <p className="text-xs text-muted-foreground">Print a sample {settings.label_width}×{settings.label_height}mm label</p>
                  </div>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={handleTestPrint} disabled={testPrinting || !selectedPrinter}>
                    {testPrinting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Printer className="w-3.5 h-3.5" />}
                    {testPrinting ? 'Printing...' : 'Print Test Label'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
