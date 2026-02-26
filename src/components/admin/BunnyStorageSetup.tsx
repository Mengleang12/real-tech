import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Loader2, ServerCog, HardDrive, Globe, Shield, RefreshCw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { bunnyApi, type BunnyConfig, type BunnyTestResult } from "@/lib/api";
import { BunnyFileExplorer } from "./BunnyFileExplorer";

export const BunnyStorageSetup = () => {
  const [config, setConfig] = useState<BunnyConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<BunnyTestResult | null>(null);

  // Editable form fields
  const [zoneName, setZoneName] = useState('');
  const [storageHost, setStorageHost] = useState('');
  const [cdnHost, setCdnHost] = useState('');
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const configData = await bunnyApi.getConfig();
      setConfig(configData);
      setZoneName(configData.zone_name || '');
      setStorageHost(configData.storage_host || '');
      setCdnHost(configData.cdn_host || '');
      // Don't populate apiKey from server (it's not returned for security)
    } catch {
      setConfig(null);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const data: Record<string, string> = {
        zone_name: zoneName,
        storage_host: storageHost,
        cdn_host: cdnHost,
      };
      if (apiKey) {
        data.api_key = apiKey;
      }
      await bunnyApi.updateConfig(data);
      toast.success('Bunny Storage settings saved!');
      setApiKey(''); // Clear after save
      await loadConfig(); // Reload config
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save settings';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await bunnyApi.testConnection();
      setTestResult(result);
      if (result.success) {
        toast.success('Bunny Storage connection successful!');
      } else {
        toast.error(result.error || 'Connection failed');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Connection test failed';
      setTestResult({ success: false, error: errorMsg });
      toast.error(errorMsg);
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
            <HardDrive className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Bunny Storage & CDN</h2>
            <p className="text-sm text-muted-foreground">Manage file storage and content delivery</p>
          </div>
        </div>
        <Badge variant={config?.configured ? "default" : "destructive"} className="gap-1.5">
          {config?.configured ? (
            <><CheckCircle2 className="w-3 h-3" /> Configured</>
          ) : (
            <><XCircle className="w-3 h-3" /> Not Configured</>
          )}
        </Badge>
      </div>

      {/* Editable Settings Form */}
      <div className="border border-border rounded-xl p-5 bg-card space-y-4">
        <h3 className="font-medium">Storage Configuration</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="zone-name" className="flex items-center gap-2 text-sm">
              <ServerCog className="w-4 h-4 text-muted-foreground" />
              Storage Zone Name
            </Label>
            <Input
              id="zone-name"
              value={zoneName}
              onChange={(e) => setZoneName(e.target.value)}
              placeholder="my-storage-zone"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="storage-host" className="flex items-center gap-2 text-sm">
              <HardDrive className="w-4 h-4 text-muted-foreground" />
              Storage Hostname
            </Label>
            <Input
              id="storage-host"
              value={storageHost}
              onChange={(e) => setStorageHost(e.target.value)}
              placeholder="storage.bunnycdn.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cdn-host" className="flex items-center gap-2 text-sm">
              <Globe className="w-4 h-4 text-muted-foreground" />
              CDN Hostname
            </Label>
            <Input
              id="cdn-host"
              value={cdnHost}
              onChange={(e) => setCdnHost(e.target.value)}
              placeholder="my-zone.b-cdn.net"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="api-key" className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-muted-foreground" />
              API Key
            </Label>
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={config?.api_key_masked ? `Saved: ${config.api_key_masked}` : 'Enter your Bunny Storage API key'}
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={saveSettings} disabled={saving} className="gap-2">
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-4 h-4" /> Save Settings</>
            )}
          </Button>
        </div>
      </div>

      {/* Test Connection */}
      <div className="border border-border rounded-xl p-5 bg-card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium">Connection Test</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Verify that your Bunny Storage credentials are working correctly
            </p>
          </div>
          <Button
            onClick={testConnection}
            disabled={testing || !config?.configured}
            variant="outline"
            className="gap-2"
          >
            {testing ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Testing...</>
            ) : (
              <><RefreshCw className="w-4 h-4" /> Test Connection</>
            )}
          </Button>
        </div>

        {testResult && (
          <div className={`rounded-lg p-4 border ${
            testResult.success
              ? 'bg-green-500/5 border-green-500/20'
              : 'bg-destructive/5 border-destructive/20'
          }`}>
            <div className="flex items-start gap-3">
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <p className={`font-medium text-sm ${
                  testResult.success ? 'text-green-600 dark:text-green-400' : 'text-destructive'
                }`}>
                  {testResult.success ? 'Connection Successful!' : 'Connection Failed'}
                </p>
                {testResult.success ? (
                  <div className="text-sm text-muted-foreground space-y-0.5">
                    <p>Zone: <span className="font-medium text-foreground">{testResult.zone_name}</span></p>
                    <p>Host: <span className="font-medium text-foreground">{testResult.storage_host}</span></p>
                    <p>CDN: <span className="font-medium text-foreground">{testResult.cdn_host}</span></p>
                    <p>Files in root: <span className="font-medium text-foreground">{testResult.file_count}</span></p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{testResult.error}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>


      {/* File Explorer */}
      {config?.configured && (
        <div className="space-y-3">
          <h3 className="font-medium">File Explorer</h3>
          <BunnyFileExplorer />
        </div>
      )}
    </div>
  );
};
