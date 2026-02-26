import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useOrders, Order } from "@/hooks/useOrders";
import { useQuery } from "@tanstack/react-query";
import { versionsApi, downloadApi, AppVersion } from "@/lib/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Download, Package, ShoppingBag, ArrowLeft,
  Calendar, DollarSign, CheckCircle, Clock, XCircle,
  ChevronDown, ChevronUp, FileText, HardDrive, Cpu, Monitor,
  ExternalLink
} from "lucide-react";

const statusConfig: Record<string, { icon: typeof CheckCircle; dotClass: string; label: string; labelKm: string }> = {
  paid:    { icon: CheckCircle, dotClass: "bg-green-500",          label: "Paid",    labelKm: "បានបង់ប្រាក់" },
  pending: { icon: Clock,       dotClass: "bg-amber-400",          label: "Pending", labelKm: "រង់ចាំ" },
  failed:  { icon: XCircle,     dotClass: "bg-destructive",        label: "Failed",  labelKm: "បរាជ័យ" },
  expired: { icon: XCircle,     dotClass: "bg-muted-foreground/50",label: "Expired", labelKm: "ផុតកំណត់" },
};

interface PurchasedAppCardProps {
  order: Order;
  language: string;
}

const PurchasedAppCard = ({ order, language }: PurchasedAppCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = statusConfig[order.status] || statusConfig.pending;

  const { data: versionsData, isLoading: versionsLoading } = useQuery({
    queryKey: ['versions', order.app_id],
    queryFn: () => versionsApi.getByAppId(order.app_id),
    enabled: isExpanded,
  });

  const versions = versionsData || [];

  return (
    <div className="border border-border rounded-md bg-card overflow-hidden">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <div className="px-4 py-3 cursor-pointer hover:bg-accent/50 transition-colors">
            <div className="flex items-center gap-3">
              {/* App icon */}
              {order.app_icon_url ? (
                <img 
                  src={order.app_icon_url} 
                  alt={order.app_name} 
                  className="w-9 h-9 rounded-md border border-border flex-shrink-0 object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-9 h-9 rounded-md bg-muted border border-border flex items-center justify-center flex-shrink-0 ${order.app_icon_url ? 'hidden' : ''}`}>
                <Package className="w-4 h-4 text-muted-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{order.app_name}</span>
                  {/* Status dot + label */}
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dotClass} flex-shrink-0`} />
                    {language === 'km' ? status.labelKm : status.label}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    ${(typeof order.amount === 'string' ? parseFloat(order.amount) : order.amount).toFixed(2)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(order.paid_at || order.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <button className="text-muted-foreground hover:text-foreground transition-colors p-1 flex-shrink-0">
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="border-t border-border bg-muted/20">
            {versionsLoading ? (
              <div className="p-4 space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : versions.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <FileText className="w-6 h-6 mx-auto mb-2 opacity-40" />
                <p className="text-sm">{language === 'km' ? 'គ្មានកំណែទេ' : 'No versions available'}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {versions.map((version: AppVersion) => (
                  <VersionItem key={version.id} version={version} language={language} />
                ))}
              </div>
            )}

            {/* Footer link */}
            <div className="px-4 py-3 border-t border-border">
              <Link to={`/${order.app_id}`}>
                <button className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                  {language === 'km' ? 'មើលព័ត៌មានលម្អិត' : 'View Full Details'}
                </button>
              </Link>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

interface VersionItemProps {
  version: AppVersion;
  language: string;
}

const VersionItem = ({ version, language }: VersionItemProps) => {
  const downloadLinks = (version.download_links || []).filter(link => link.url !== null);
  const hasDownloadUrl = version.download_url !== null;
  const hasAnyDownloads = hasDownloadUrl || downloadLinks.length > 0;

  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-4 mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-medium">v{version.version}</span>
            {version.is_latest && (
              <span className="text-[10px] text-muted-foreground bg-muted border border-border px-1.5 py-0.5 rounded-sm">
                {language === 'km' ? 'ចុងក្រោយ' : 'Latest'}
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
            {version.release_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(version.release_date).toLocaleDateString()}
              </span>
            )}
            {version.file_size && (
              <span className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                {version.file_size}
              </span>
            )}
            {version.min_os_version && (
              <span className="flex items-center gap-1">
                <Monitor className="w-3 h-3" />
                {version.min_os_version}
              </span>
            )}
            {version.architecture && (
              <span className="flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                {version.architecture}
              </span>
            )}
          </div>
        </div>
      </div>

      {(version.changelog || version.changelog_km) && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2 bg-muted rounded-sm px-2 py-1.5">
          {language === 'km' && version.changelog_km ? version.changelog_km : version.changelog}
        </p>
      )}

      {hasAnyDownloads ? (
        <div className="flex flex-wrap gap-2">
          {hasDownloadUrl && (
            <Button size="sm" className="h-7 text-xs gap-1.5" onClick={async () => {
              try {
                const result = await downloadApi.getSignedUrl(version.id);
                if (result.url) window.open(result.url, '_blank');
              } catch {
                toast.error(language === 'km' ? 'មិនអាចទាញយកបានទេ។' : 'Download failed.');
              }
            }}>
              <Download className="w-3 h-3" />
              {language === 'km' ? 'ទាញយក' : 'Download'}
            </Button>
          )}
          {downloadLinks.map((link) => (
            <Button key={link.id} size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={async () => {
              try {
                const result = await downloadApi.getSignedUrl(version.id, link.id);
                if (result.url) window.open(result.url, '_blank');
              } catch {
                toast.error(language === 'km' ? 'មិនអាចទាញយកបានទេ។' : 'Download failed.');
              }
            }}>
              {link.link_type === 'page' ? <ExternalLink className="w-3 h-3" /> : <Download className="w-3 h-3" />}
              {link.title}
            </Button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">
          {language === 'km' ? 'គ្មានតំណទាញយកទេ' : 'No download links available'}
        </p>
      )}
    </div>
  );
};

const MyPurchases = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { user, signOut } = useAuth();
  const { data: orders, isLoading, error } = useOrders();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-xs">
          <ShoppingBag className="w-10 h-10 text-muted-foreground/50 mx-auto mb-4" />
          <h1 className="text-lg font-semibold mb-1">{language === 'km' ? 'សូមចូលគណនី' : 'Sign in required'}</h1>
          <p className="text-sm text-muted-foreground mb-4">
            {language === 'km' ? 'អ្នកត្រូវចូលគណនីដើម្បីមើលការទិញ' : 'You need to sign in to view your purchases'}
          </p>
          <Link to="/auth"><Button size="sm">{language === 'km' ? 'ចូលគណនី' : 'Sign In'}</Button></Link>
        </div>
      </div>
    );
  }

  const paidOrders = orders?.filter(order => order.status === 'paid') || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Notion-style top bar */}
      <header className="sticky top-0 z-40 glass px-4 sm:px-8 py-2.5">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-sm hover:bg-accent"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {language === 'km' ? 'ត្រឡប់' : 'Back'}
            </button>
            <span className="text-muted-foreground/40 text-sm">/</span>
            <span className="text-sm font-medium text-foreground">
              {language === 'km' ? 'កម្មវិធីដែលបានទិញ' : 'My Purchases'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="text-xs text-muted-foreground hidden sm:block">{user.email}</span>
            <Button variant="outline" size="sm" onClick={signOut} className="h-7 text-xs">
              {language === 'km' ? 'ចេញ' : 'Sign Out'}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-8 py-10">
        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-foreground">
            {language === 'km' ? 'កម្មវិធីដែលបានទិញ' : 'My Purchases'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {language === 'km' ? 'មើលកម្មវិធីដែលអ្នកបានទិញ និងទាញយក' : 'View and download your purchased apps'}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="border border-border rounded-md bg-card p-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="w-9 h-9 rounded-md" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <XCircle className="w-8 h-8 text-destructive mx-auto mb-3 opacity-70" />
            <h2 className="text-sm font-medium mb-3">{language === 'km' ? 'មានបញ្ហាក្នុងការផ្ទុកទិន្នន័យ' : 'Failed to load purchases'}</h2>
            <Button onClick={() => window.location.reload()} variant="outline" size="sm">
              {language === 'km' ? 'ព្យាយាមម្ដងទៀត' : 'Try Again'}
            </Button>
          </div>
        ) : paidOrders.length === 0 ? (
          <div className="text-center py-16 border border-border rounded-md bg-card">
            <Package className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
            <h2 className="text-sm font-medium mb-1">{language === 'km' ? 'គ្មានការទិញទេ' : 'No purchases yet'}</h2>
            <p className="text-xs text-muted-foreground mb-4">
              {language === 'km' ? 'អ្នកមិនទាន់បានទិញកម្មវិធីណាមួយទេ' : "You haven't purchased any apps yet"}
            </p>
            <Link to="/"><Button size="sm" variant="outline">{language === 'km' ? 'រុករកកម្មវិធី' : 'Browse Apps'}</Button></Link>
          </div>
        ) : (
          <div className="space-y-2">
            {paidOrders.map((order) => (
              <PurchasedAppCard key={order.id} order={order} language={language} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default MyPurchases;
