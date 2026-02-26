import { useState } from "react";
import { Download, Calendar, HardDrive, ExternalLink, Package, ChevronLeft, ChevronRight, X, Shield, Cpu, Globe, User, History } from "lucide-react";
import { useLanguage, useTranslations } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { appsApi, versionsApi, type App, type AppVersion } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const getGradientFromName = (name: string): string => {
  const gradients = [
    "bg-gradient-to-br from-blue-500 to-cyan-500",
    "bg-gradient-to-br from-purple-500 to-pink-500",
    "bg-gradient-to-br from-green-500 to-emerald-600",
    "bg-gradient-to-br from-orange-500 to-red-500",
    "bg-gradient-to-br from-indigo-500 to-purple-600",
    "bg-gradient-to-br from-amber-500 to-yellow-600",
  ];
  const hash = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return gradients[hash % gradients.length];
};

// Previous Versions Dialog
const PreviousVersionsDialog = ({ 
  versions, 
  open, 
  onOpenChange,
  appName 
}: { 
  versions: AppVersion[]; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  appName: string;
}) => {
  const { t } = useLanguage();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <div className="flex items-center gap-3 mb-4">
          <History className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">{appName} - Previous Versions</h2>
        </div>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-3 pr-4">
            {versions.map((version) => {
              const isHidden = version.is_visible === false;
              return (
                <div 
                  key={version.id}
                  className={`flex items-center justify-between p-4 rounded-xl transition-colors ${
                    isHidden 
                      ? 'bg-muted/30 opacity-50 cursor-not-allowed' 
                      : 'bg-muted/50 hover:bg-muted'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${isHidden ? 'text-muted-foreground line-through' : ''}`}>v{version.version}</span>
                      {version.is_latest && !isHidden && (
                        <Badge variant="default" className="text-xs">Latest</Badge>
                      )}
                      {isHidden && (
                        <Badge variant="secondary" className="text-xs text-muted-foreground">Unavailable</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
                    </div>
                    {(version.changelog || version.changelog_km) && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t(version.changelog_km, version.changelog)}
                      </p>
                    )}
                  </div>
                  
                  {!isHidden && version.download_url && (
                    <a href={version.download_url} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

// Screenshot Gallery Component with Lightbox
const ScreenshotGallery = ({ 
  screenshots, 
  selectedIndex, 
  setSelectedIndex 
}: { 
  screenshots: { image_url: string; sort_order: number }[];
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
}) => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  
  if (!screenshots || screenshots.length === 0) return null;

  const sortedScreenshots = [...screenshots].sort((a, b) => a.sort_order - b.sort_order);

  const handlePrev = () => {
    setSelectedIndex(selectedIndex === 0 ? sortedScreenshots.length - 1 : selectedIndex - 1);
  };

  const handleNext = () => {
    setSelectedIndex(selectedIndex === sortedScreenshots.length - 1 ? 0 : selectedIndex + 1);
  };

  return (
    <>
      {/* Main Screenshot Display */}
      <div 
        className="relative aspect-video bg-muted rounded-xl overflow-hidden cursor-pointer group"
        onClick={() => setLightboxOpen(true)}
      >
        <img
          src={sortedScreenshots[selectedIndex]?.image_url}
          alt={`Screenshot ${selectedIndex + 1}`}
          className="w-full h-full object-contain"
        />
        
        {/* Navigation arrows */}
        {sortedScreenshots.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
        
        {/* Counter */}
        {sortedScreenshots.length > 1 && (
          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 rounded-md text-white text-xs">
            {selectedIndex + 1} / {sortedScreenshots.length}
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {sortedScreenshots.length > 1 && (
        <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
          {sortedScreenshots.map((screenshot, index) => (
            <button
              key={screenshot.image_url}
              onClick={() => setSelectedIndex(index)}
              className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                index === selectedIndex 
                  ? 'border-primary ring-2 ring-primary/30' 
                  : 'border-transparent hover:border-muted-foreground/50'
              }`}
            >
              <img
                src={screenshot.image_url}
                alt={`Thumbnail ${index + 1}`}
                className="w-20 h-14 object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox */}
      {lightboxOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
            className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors z-10"
          >
            <X className="w-6 h-6" />
          </button>
          
          {sortedScreenshots.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); handlePrev(); }}
              className="absolute left-4 p-2 text-white/70 hover:text-white transition-colors"
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
          )}
          
          <img
            src={sortedScreenshots[selectedIndex].image_url}
            alt={`Screenshot ${selectedIndex + 1}`}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          
          {sortedScreenshots.length > 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); handleNext(); }}
              className="absolute right-4 p-2 text-white/70 hover:text-white transition-colors"
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          )}
          
          {sortedScreenshots.length > 1 && (
            <div className="absolute bottom-4 text-white/70 text-sm">
              {selectedIndex + 1} / {sortedScreenshots.length}
            </div>
          )}
        </div>
      )}
    </>
  );
};

// Metadata Item Component
const MetadataItem = ({ 
  label, 
  value, 
  expandable 
}: { 
  label: string; 
  value: string | undefined; 
  expandable?: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  
  if (!value) return null;
  
  const isLongValue = value.length > 30;
  const displayValue = expandable && isLongValue && !expanded 
    ? value.substring(0, 30) + '...' 
    : value;
  
  return (
    <div className="space-y-1">
      <div className="text-xs text-muted-foreground uppercase tracking-wide">{label}</div>
      <div className="text-sm text-foreground flex items-center gap-1">
        {displayValue}
        {expandable && isLongValue && (
          <button 
            onClick={() => setExpanded(!expanded)}
            className="text-primary hover:text-primary/80 text-xs"
          >
            {expanded ? '▲' : '▼'}
          </button>
        )}
      </div>
    </div>
  );
};

interface AppDetailDialogProps {
  app: App | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AppDetailDialog = ({ app, open, onOpenChange }: AppDetailDialogProps) => {
  const { t } = useLanguage();
  const translations = useTranslations();
  const [selectedScreenshot, setSelectedScreenshot] = useState(0);
  const [showVersions, setShowVersions] = useState(false);
  
  // Fetch full app details including screenshots
  const { data: fullAppData, isLoading: appLoading } = useQuery({
    queryKey: ["app", app?.id],
    queryFn: () => appsApi.getById(app!.id),
    enabled: !!app?.id && open,
  });

  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: ["versions", app?.id],
    queryFn: () => versionsApi.getByAppId(app!.id),
    enabled: !!app?.id && open,
  });

  if (!app) return null;

  // Use full app data if available, otherwise fall back to passed app prop
  const appData = fullAppData || app;
  const displayName = t(appData.name_km, appData.name);
  const displayDescription = t(appData.description_km, appData.description);
  
  // Get latest version for download
  const latestVersion = versions?.find(v => v.is_latest) || versions?.[0];
  const categoryLabels: Record<string, string> = {
    programs: translations.programs,
    games: translations.games,
    extensions: 'Extensions',
    os: 'OS Versions'
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
          <ScrollArea className="max-h-[90vh]">
            <div className="p-6">
              {/* Header with App Icon and Name */}
              <div className="flex items-start gap-4 mb-6">
                {appData.icon_url ? (
                  <img
                    src={appData.icon_url}
                    alt={displayName}
                    className="w-16 h-16 rounded-2xl shadow-lg object-cover shrink-0"
                  />
                ) : (
                  <div className={`w-16 h-16 rounded-2xl ${getGradientFromName(appData.name)} flex items-center justify-center shadow-lg shrink-0`}>
                    <Package className="w-8 h-8 text-white/80" />
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-foreground mb-1">{displayName}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm text-primary hover:underline cursor-pointer">
                      {categoryLabels[appData.category] || appData.category}
                    </span>
                    {appData.developer && (
                      <>
                        <span className="text-muted-foreground">·</span>
                        <span className="text-sm text-primary hover:underline cursor-pointer">
                          {appData.developer}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Side - Screenshot */}
                <div className="lg:col-span-2">
                  {appLoading ? (
                    <Skeleton className="aspect-video w-full rounded-xl" />
                  ) : appData.screenshots && appData.screenshots.length > 0 ? (
                    <ScreenshotGallery 
                      screenshots={appData.screenshots}
                      selectedIndex={selectedScreenshot}
                      setSelectedIndex={setSelectedScreenshot}
                    />
                  ) : (
                    <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
                      <Package className="w-16 h-16 text-muted-foreground/50" />
                    </div>
                  )}
                </div>

                {/* Right Side - Metadata */}
                <div className="space-y-4">
                  {/* Metadata Grid */}
                  <div className="space-y-4 p-4 bg-muted/30 rounded-xl">
                    <MetadataItem 
                      label="Version" 
                      value={appData.latest_version || latestVersion?.version}
                    />
                    
                    <MetadataItem 
                      label="Developer" 
                      value={appData.developer}
                    />
                    
                    {latestVersion?.min_os_version && (
                      <MetadataItem 
                        label="Compatibility" 
                        value={latestVersion.min_os_version}
                      />
                    )}
                    
                    {latestVersion?.file_size && (
                      <MetadataItem 
                        label="Size" 
                        value={latestVersion.file_size}
                      />
                    )}
                    
                    {appData.website && (
                      <div className="space-y-1">
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Website</div>
                        <a
                          href={appData.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Visit
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Download Button */}
                  {latestVersion?.download_url ? (
                    <a 
                      href={latestVersion.download_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <Button 
                        className="w-full h-12 text-base font-medium gap-2 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Download className="w-5 h-5" />
                        Download for free
                        {latestVersion.file_size && (
                          <span className="text-white/80">({latestVersion.file_size})</span>
                        )}
                      </Button>
                    </a>
                  ) : (
                    <Button 
                      className="w-full h-12 text-base font-medium gap-2"
                      disabled
                    >
                      <Download className="w-5 h-5" />
                      {translations.noVersions}
                    </Button>
                  )}

                  {/* Previous Versions Button */}
                  {versions && versions.length > 1 && (
                    <Button 
                      variant="outline"
                      className="w-full h-10 gap-2"
                      onClick={() => setShowVersions(true)}
                    >
                      <History className="w-4 h-4" />
                      Previous versions
                    </Button>
                  )}

                  {/* Security Badge */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="w-4 h-4 text-green-500" />
                    <span>No threats found</span>
                  </div>
                </div>
              </div>

              {/* Description Section */}
              {displayDescription && (
                <div className="mt-8">
                  <Separator className="mb-6" />
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Description</h3>
                    <div className="w-12 h-1 bg-primary rounded-full mb-4" />
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                      {displayDescription}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Previous Versions Dialog */}
      <PreviousVersionsDialog
        versions={versions || []}
        open={showVersions}
        onOpenChange={setShowVersions}
        appName={displayName}
      />
    </>
  );
};
